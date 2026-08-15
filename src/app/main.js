import { VisualRenderer } from '../engine/renderer.js';
import { decodeGLB, fetchArrayBufferWithProgress } from '../engine/glb-loader.js';
import { ProjectStore, restoreProject } from '../core/project-store.js';
import { clearHeroAsset, loadHeroAsset, saveHeroAsset, sha256Hex } from '../core/asset-store.js';
import {
  activeShot,
  createDefaultProject,
  makeShotFromPreset,
  normalizeProject,
  sequenceDurationFrames,
} from '../core/schema.js';
import { AXES, AXIS_IDS, optionLabel } from '../shot/axes.js';
import { changedAxes, deltaCapability, generateShot, assignAxisValue, toggleAxisLock, toggleExclusion } from '../shot/delta-engine.js';
import { evaluateShotFrame } from '../shot/evaluator.js';
import { FAMILIES, getFamily, getPreset, presetsForFamily } from '../shot/presets.js';
import { PlayerClock } from '../sequence/player.js';
import { icon } from '../ui/icons.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));
const uid = (prefix) => `${prefix}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const formatTime = (frames, fps = 24) => {
  const seconds = Math.max(0, frames) / Math.max(1, fps);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${remainder.toFixed(2).padStart(5, '0')}`;
};

const app = $('#app');
const canvas = $('#heroCanvas');
const contextPanel = $('#contextPanel');
const axisDeck = $('#axisDeck');
const axisEditor = $('#axisEditor');
const assetOverlay = $('#assetOverlay');
const heroFileInput = $('#heroFileInput');
const toastEl = $('#toast');

const restored = normalizeProject(restoreProject(createDefaultProject));
const store = new ProjectStore(restored);
const ui = {
  mode: 'shot',
  worldStep: 'hero',
  selectedAxis: 'camera',
  axisEditorOpen: false,
  assetState: { state: 'idle', progress: 0, label: 'Preparing Player', message: '', code: null },
  bootDone: false,
  decodeCount: 0,
  lastGeneration: null,
  currentPayload: null,
  playerState: { playing: false, loop: true, normalized: 0, frame: 0, totalFrames: 1 },
  toastTimer: 0,
};

const renderer = new VisualRenderer(canvas, {
  onContextState: ({ state, message }) => {
    if (state === 'lost') setAssetState({ state: 'error', message, code: 'CONTEXT_LOST' });
    else { toast(message); renderAssetOverlay(); }
  },
});

const player = new PlayerClock({
  getProject: () => store.getState(),
  onFrame: (payload) => {
    ui.currentPayload = payload;
    const project = store.getState();
    renderer.setFrame(evaluateShotFrame(payload.shot, payload.mix, project.world));
    syncPlayerReadout(payload);
  },
  onState: (state) => { ui.playerState = state; syncTransport(); },
});

function currentProject() { return store.getState(); }
function currentShot() { return activeShot(currentProject()); }

function setAssetState(patch) {
  ui.assetState = { ...ui.assetState, ...patch };
  renderAssetOverlay();
  renderAssetStatus();
}

function toast(message, tone = 'default') {
  clearTimeout(ui.toastTimer);
  toastEl.textContent = message;
  toastEl.dataset.tone = tone;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('is-visible'));
  ui.toastTimer = setTimeout(() => {
    toastEl.classList.remove('is-visible');
    setTimeout(() => { toastEl.hidden = true; }, 240);
  }, 2600);
}

function renderAssetOverlay() {
  const state = ui.assetState;
  const visible = state.state !== 'ready';
  assetOverlay.hidden = !visible;
  if (!visible) { assetOverlay.innerHTML = ''; return; }
  const loading = state.state === 'loading' || state.state === 'idle';
  const progress = clamp(state.progress || 0, 0, 1);
  const heading = loading ? (state.state === 'idle' ? 'Opening the vault' : 'Mounting your Hero')
    : state.state === 'missing' ? 'Hero needs relinking'
      : 'The Player stopped safely';
  const detail = loading ? state.label : state.message || 'Choose another GLB to continue.';
  assetOverlay.innerHTML = `
    <div class="asset-overlay-card ${loading ? 'is-loading' : 'is-state'}">
      <span class="eyebrow">${loading ? 'REAL ASSET PATH' : 'PLAYER STATE'}</span>
      <h2>${escapeHTML(heading)}</h2>
      <p>${escapeHTML(detail)}</p>
      ${loading ? `
        <div class="load-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress * 100)}">
          <span style="width:${Math.max(2, progress * 100)}%"></span>
        </div>
        <div class="load-percent"><span>${Math.round(progress * 100)}%</span><span>${escapeHTML(state.code || 'GLB')}</span></div>
      ` : `
        <button class="button button-primary" type="button" data-action="open-import">${icon('upload')}<span>${state.state === 'missing' ? 'Relink Hero' : 'Choose another GLB'}</span></button>
      `}
    </div>`;
}

function renderAssetStatus() {
  const status = $('#assetStatus');
  const project = currentProject();
  const manifest = project.assets.hero;
  const ready = ui.assetState.state === 'ready';
  status.className = `asset-status ${ready ? 'is-ready' : 'is-busy'}`;
  status.innerHTML = `<span class="status-dot"></span><span>${ready ? escapeHTML(manifest.name) : escapeHTML(ui.assetState.label || 'Hero')}</span>`;
  status.title = ready ? `${manifest.name} · ${manifest.stats?.triangles?.toLocaleString?.() || '—'} triangles` : ui.assetState.label;
}

function syncPlayerReadout(payload = ui.currentPayload) {
  if (!payload?.shot) return;
  const family = getFamily(payload.shot.familyId);
  const preset = getPreset(payload.shot.presetId);
  const modeLabel = $('#playerModeLabel');
  const title = $('#playerShotTitle');
  const frame = $('#playerFrameReadout');
  if (modeLabel) modeLabel.textContent = payload.mode === 'sequence' ? `SEQUENCE · ${String((payload.index || 0) + 1).padStart(2, '0')}` : family.label.toUpperCase();
  if (title) title.textContent = preset.label;
  if (frame) {
    const fps = currentProject().settings.fps || 24;
    frame.textContent = `${Math.floor(payload.frame).toString().padStart(4, '0')} / ${Math.max(0, Math.floor(payload.totalFrames - 1)).toString().padStart(4, '0')} · ${formatTime(payload.frame, fps)}`;
  }
  if (payload.mode === 'sequence') {
    document.querySelectorAll('.clip-card').forEach((card) => {
      card.classList.toggle('is-playing', card.dataset.clipId === payload.clip?.id);
    });
  }
}

function syncTransport() {
  const state = ui.playerState;
  const playButton = $('#transportPlay');
  const loopButton = $('#transportLoop');
  const scrub = $('#transportScrub');
  if (playButton) {
    playButton.innerHTML = state.playing ? icon('pause') : icon('play');
    playButton.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
    playButton.title = state.playing ? 'Pause' : 'Play';
    playButton.classList.toggle('is-playing', state.playing);
  }
  if (loopButton) {
    loopButton.classList.toggle('is-active', state.loop);
    loopButton.setAttribute('aria-pressed', String(state.loop));
  }
  if (scrub && document.activeElement !== scrub) scrub.value = String(Math.round((state.normalized || 0) * 1000));
  const progress = $('#transportProgress');
  if (progress) progress.style.setProperty('--progress', `${(state.normalized || 0) * 100}%`);
  const sequenceButton = document.querySelector('[data-action="sequence-play"]');
  if (sequenceButton) {
    const isSequencePlaying = state.mode === 'sequence' && state.playing;
    sequenceButton.innerHTML = `${isSequencePlaying ? icon('pause') : icon('play')}<span>${isSequencePlaying ? 'Pause complete curve' : 'Play complete curve'}</span>`;
  }
}

function renderHeader() {
  $$('.mode-button').forEach((button) => {
    const active = button.dataset.mode === ui.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $('#undoButton').disabled = !store.canUndo();
  $('#redoButton').disabled = !store.canRedo();
  $('#workspaceMode').textContent = ui.mode.toUpperCase();
}

function renderWorldPanel() {
  const project = currentProject();
  const manifest = project.assets.hero;
  const steps = [
    ['hero', '01', 'Hero'], ['ground', '02', 'Ground'], ['scale', '03', 'Scale'], ['orient', '04', 'Orient'], ['world', '05', 'World'],
  ];
  let content = '';
  if (ui.worldStep === 'hero') {
    const stats = manifest.stats;
    content = `
      <section class="control-section">
        <div class="hero-asset-card">
          <div class="asset-monogram">VR</div>
          <div class="asset-copy">
            <span class="micro-label">${manifest.source === 'indexeddb' ? 'IMPORTED HERO' : 'BUNDLED STARTER'}</span>
            <strong>${escapeHTML(manifest.name)}</strong>
            <span>${stats ? `${stats.meshes} meshes · ${stats.triangles.toLocaleString()} tris · ${stats.materials} materials` : 'Real glTF 2.0 asset'}</span>
          </div>
          <span class="asset-ready-mark">${icon('check')}</span>
        </div>
        <button class="button button-primary button-wide" type="button" data-action="open-import">${icon('upload')}<span>Replace model / Import your GLB</span></button>
        <p class="control-note">The replacement is decoded and validated before the current Hero leaves the Player.</p>
      </section>`;
  } else if (ui.worldStep === 'ground') {
    content = `
      <section class="control-section">
        <div class="ledger-stat"><span>WORLD ZERO</span><strong>Y = 0</strong><small>Hero base is calculated from real mounted bounds.</small></div>
        <div class="world-proof-grid">
          <div><span>Grounding</span><strong>Locked</strong></div>
          <div><span>Contact</span><strong>Live</strong></div>
          <div><span>Camera fit</span><strong>Bounds</strong></div>
        </div>
        <button class="button button-ghost button-wide" type="button" data-action="reset-orbit">${icon('fit')}<span>Frame grounded Hero</span></button>
      </section>`;
  } else if (ui.worldStep === 'scale') {
    content = `
      <section class="control-section">
        <div class="section-row"><div><span class="micro-label">VISUAL REFERENCE SIZE</span><h3>${Math.round(project.world.visualScale * 100)}%</h3></div><span class="pill-value">NORMALIZATION ≠ CALIBRATION</span></div>
        <label class="range-field">
          <span>Hero scale</span>
          <input type="range" min="0.65" max="1.35" step="0.01" value="${project.world.visualScale}" data-input="world-scale" aria-label="Hero visual scale">
          <div class="range-labels"><span>65</span><span>100</span><span>135</span></div>
        </label>
        <button class="text-action" type="button" data-action="world-scale-reset">Reset visual scale</button>
      </section>`;
  } else if (ui.worldStep === 'orient') {
    const values = [[0, 'Front'], [90, 'Right'], [180, 'Rear'], [-90, 'Left']];
    content = `
      <section class="control-section">
        <span class="micro-label">DEFINE THE HERO FRONT</span>
        <div class="orientation-grid">
          ${values.map(([value, label]) => `<button type="button" class="orientation-card ${project.world.orientationY === value ? 'is-active' : ''}" data-action="world-orient" data-value="${value}"><span>${value}°</span><strong>${label}</strong></button>`).join('')}
        </div>
        <p class="control-note">Orientation calibrates the Hero once. Shot rotation remains a separate creative axis.</p>
      </section>`;
  } else {
    const themes = [['grey', 'Grey', '#777a88'], ['white', 'White', '#e2e3e9'], ['black', 'Black', '#08080a'], ['void', 'Void', '#040406']];
    content = `
      <section class="control-section">
        <div class="toggle-row">
          <div><span class="micro-label">WORLD OWNERSHIP</span><strong>${project.world.overrideTheme ? 'World setup controls every shot' : 'Environment axis controls each shot'}</strong></div>
          <button type="button" class="switch ${project.world.overrideTheme ? 'is-on' : ''}" data-action="world-override" aria-pressed="${project.world.overrideTheme}"><span></span></button>
        </div>
        <div class="world-theme-grid">
          ${themes.map(([value, label, color]) => `<button type="button" class="world-theme ${project.world.theme === value ? 'is-active' : ''}" data-action="world-theme" data-value="${value}"><span class="theme-swatch" style="--swatch:${color}"></span><strong>${label}</strong><small>${value === 'void' ? 'No stage' : 'Cyclorama'}</small></button>`).join('')}
        </div>
      </section>`;
  }
  return `
    <div class="panel-heading">
      <span class="eyebrow copper">WORLD SETUP</span>
      <h1>Give the Hero<br>a world.</h1>
      <p>Calibrate once. Direct the image from SHOT.</p>
    </div>
    <div class="step-rail" role="tablist" aria-label="World setup steps">
      ${steps.map(([id, number, label]) => `<button type="button" class="step-chip ${ui.worldStep === id ? 'is-active' : ''}" data-action="world-step" data-value="${id}"><span>${number}</span>${label}</button>`).join('')}
    </div>
    ${content}`;
}

function renderPresetCards(shot) {
  return presetsForFamily(shot.familyId).map((preset, index) => {
    const active = preset.id === shot.presetId;
    return `<button type="button" class="preset-card ${active ? 'is-active' : ''}" data-action="preset" data-value="${preset.id}">
      <span class="preset-index">0${index + 1}</span>
      <span class="preset-visual preset-visual-${index % 4}"><i></i><i></i></span>
      <strong>${escapeHTML(preset.label)}</strong>
      <small>${escapeHTML(preset.note)}</small>
    </button>`;
  }).join('');
}

function renderShotPanel() {
  const project = currentProject();
  const shot = currentShot();
  const family = getFamily(shot.familyId);
  const preset = getPreset(shot.presetId);
  const changed = changedAxes(shot);
  const capability = deltaCapability(shot);
  const risk = changed.length >= 9 ? 'WILD' : changed.length >= 6 ? 'EXPRESSIVE' : 'STABLE';
  const inSequence = project.sequence.clips.filter((clip) => clip.shotId === shot.id).length;
  return `
    <div class="panel-heading shot-heading">
      <div class="heading-kicker"><span class="eyebrow copper">ACTIVE SHOT</span><span class="shot-number">${String(project.shots.order.indexOf(shot.id) + 1).padStart(2, '0')} / ${String(project.shots.order.length).padStart(2, '0')}</span></div>
      <h1>${escapeHTML(family.label)}<br><em>${escapeHTML(preset.label)}</em></h1>
      <p>${escapeHTML(family.description)}</p>
    </div>
    <section class="control-section compact">
      <div class="family-tabs" role="tablist" aria-label="Shot family">
        ${Object.values(FAMILIES).map((item) => `<button type="button" class="family-tab ${item.id === shot.familyId ? 'is-active' : ''}" data-action="family" data-value="${item.id}">${item.label}</button>`).join('')}
      </div>
      <div class="preset-rail">${renderPresetCards(shot)}</div>
    </section>
    <section class="delta-instrument">
      <div class="delta-topline">
        <div><span class="eyebrow">SEMANTIC DELTA</span><small>${changed.length} axes differ now · ${risk}</small></div>
        <div class="delta-stepper">
          <button type="button" data-action="delta-step" data-value="-1" aria-label="Reduce Delta">${icon('minus')}</button>
          <strong id="deltaNumber">${shot.deltaCount}</strong>
          <button type="button" data-action="delta-step" data-value="1" aria-label="Increase Delta">${icon('plus')}</button>
        </div>
      </div>
      <label class="delta-range" style="--delta:${shot.deltaCount}">
        <input id="deltaRange" type="range" min="${capability.minimum}" max="${capability.maximum}" step="1" value="${shot.deltaCount}" data-input="delta" aria-label="Delta axes">
        <span class="delta-line"></span>
      </label>
      <div class="delta-ledger">
        ${AXIS_IDS.map((axis, index) => `<i class="${changed.includes(axis) ? 'is-changed' : ''} ${shot.locks[axis] ? 'is-locked' : ''}" title="${AXES[axis].label}" style="--i:${index}"></i>`).join('')}
      </div>
      <div class="delta-meta"><span>MIN ${capability.minimum}</span><span>REQUEST ${shot.deltaCount}</span><span>MAX ${capability.maximum}</span></div>
    </section>
    <div class="primary-actions">
      <button type="button" class="button button-ghost" data-action="generate" data-kind="random">${icon('random')}<span>Random</span></button>
      <button type="button" class="button button-primary" data-action="generate" data-kind="variant">${icon('variant')}<span>Variant</span></button>
    </div>
    <button type="button" class="button button-copper button-wide" data-action="add-sequence">${icon('plus')}<span>${inSequence ? `Add another linked clip · ${inSequence}` : 'Add to Sequence'}</span></button>
    <div class="inline-footer-actions">
      <button type="button" class="text-action" data-action="new-shot">+ New shot</button>
      <span>${project.sequence.clips.length} clips in curve</span>
    </div>`;
}

function renderSequencePanel() {
  const project = currentProject();
  const fps = project.settings.fps || 24;
  const duration = sequenceDurationFrames(project);
  const clips = project.sequence.clips;
  return `
    <div class="panel-heading">
      <span class="eyebrow copper">SEQUENCE</span>
      <h1>Direct<br>the curve.</h1>
      <p>Shot cards first. The advanced track editor arrives after this loop is proven.</p>
    </div>
    <section class="sequence-summary">
      <div class="sequence-stat"><strong>${String(clips.length).padStart(2, '0')}</strong><span>SHOTS</span></div>
      <div class="sequence-stat"><strong>${formatTime(duration, fps)}</strong><span>DURATION</span></div>
      <div class="sequence-stat"><strong>${fps}</strong><span>FPS</span></div>
    </section>
    <button type="button" class="button button-primary button-wide" data-action="sequence-play">${ui.playerState.playing && ui.playerState.mode === 'sequence' ? icon('pause') : icon('play')}<span>${ui.playerState.playing && ui.playerState.mode === 'sequence' ? 'Pause complete curve' : 'Play complete curve'}</span></button>
    <section class="control-section sequence-list-section">
      <div class="section-label-row"><span class="micro-label">CINEMATIC STRIP</span><button class="text-action" type="button" data-action="add-sequence">+ Add active shot</button></div>
      <div class="sequence-strip" id="sequenceStrip">
        ${clips.length ? clips.map((clip, index) => {
          const shot = project.shots.byId[clip.shotId];
          const preset = getPreset(shot.presetId);
          const family = getFamily(shot.familyId);
          return `<article class="clip-card ${ui.currentPayload?.clip?.id === clip.id && ui.playerState.mode === 'sequence' ? 'is-playing' : ''}" data-clip-id="${clip.id}">
            <button class="clip-main" type="button" data-action="clip-edit" data-value="${clip.id}">
              <span class="clip-number">${String(index + 1).padStart(2, '0')}</span>
              <span class="clip-thumbnail"><i></i></span>
              <span class="clip-copy"><small>${family.label.toUpperCase()}</small><strong>${escapeHTML(preset.label)}</strong><em>${clip.durationFrames}f · ${formatTime(clip.durationFrames, fps)}</em></span>
            </button>
            <div class="clip-actions">
              <button type="button" data-action="clip-move" data-value="${clip.id}" data-direction="-1" aria-label="Move clip left">${icon('chevronLeft')}</button>
              <button type="button" data-action="clip-move" data-value="${clip.id}" data-direction="1" aria-label="Move clip right">${icon('chevronRight')}</button>
              <button type="button" data-action="clip-delete" data-value="${clip.id}" aria-label="Delete clip">${icon('trash')}</button>
            </div>
          </article>`;
        }).join('') : `<div class="empty-sequence"><span class="empty-orbit"></span><strong>Your curve is empty.</strong><p>Return to SHOT and add the first cinematic decision.</p><button type="button" class="button button-ghost" data-action="mode" data-mode="shot">Open SHOT</button></div>`}
      </div>
    </section>`;
}

function renderContextPanel() {
  contextPanel.dataset.mode = ui.mode;
  contextPanel.innerHTML = ui.mode === 'world' ? renderWorldPanel() : ui.mode === 'sequence' ? renderSequencePanel() : renderShotPanel();
}

function renderAxisDeck() {
  const shot = currentShot();
  const changed = changedAxes(shot);
  axisDeck.hidden = ui.mode !== 'shot';
  if (axisDeck.hidden) return;
  axisDeck.innerHTML = `
    <div class="axis-deck-heading"><span><b>11</b> SEMANTIC AXES</span><small>Tap one axis. Choose Start, Both or End.</small></div>
    <div class="axis-rail" role="list" aria-label="Semantic shot axes">
      ${AXIS_IDS.map((axis, index) => {
        const definition = AXES[axis];
        const delta = changed.includes(axis);
        return `<button type="button" role="listitem" class="axis-chip ${delta ? 'is-delta' : 'is-shared'} ${shot.locks[axis] ? 'is-locked' : ''} ${ui.selectedAxis === axis && ui.axisEditorOpen ? 'is-selected' : ''}" data-action="axis-open" data-axis="${axis}">
          <span class="axis-number">${String(index + 1).padStart(2, '0')}</span>
          <strong>${definition.label}</strong>
          <span class="axis-values"><i>${escapeHTML(optionLabel(axis, shot.start[axis]))}</i><b>→</b><em>${escapeHTML(optionLabel(axis, shot.end[axis]))}</em></span>
          <span class="axis-lock-mark">${shot.locks[axis] ? icon('lock') : ''}</span>
        </button>`;
      }).join('')}
    </div>`;
}

function renderAxisEditor() {
  const shot = currentShot();
  const axis = ui.selectedAxis;
  if (!ui.axisEditorOpen || ui.mode !== 'shot' || !AXES[axis]) {
    axisEditor.hidden = true; axisEditor.innerHTML = ''; document.body.classList.remove('axis-sheet-open'); return;
  }
  const definition = AXES[axis];
  axisEditor.hidden = false;
  document.body.classList.add('axis-sheet-open');
  axisEditor.innerHTML = `
    <div class="axis-editor-shell">
      <div class="axis-editor-head">
        <div><span class="eyebrow copper">${definition.short} · ${AXIS_IDS.indexOf(axis) + 1}/11</span><h2>${definition.label}</h2><p>${definition.description}</p></div>
        <div class="axis-editor-actions">
          <button type="button" class="lock-button ${shot.locks[axis] ? 'is-active' : ''}" data-action="axis-lock" data-axis="${axis}">${shot.locks[axis] ? icon('lock') : icon('unlock')}<span>${shot.locks[axis] ? 'Locked' : 'Lock axis'}</span></button>
          <button type="button" class="icon-button" data-action="axis-close" aria-label="Close axis editor">${icon('close')}</button>
        </div>
      </div>
      <div class="option-rail">
        ${definition.options.map(([value, label]) => {
          const start = shot.start[axis] === value;
          const end = shot.end[axis] === value;
          const both = start && end;
          const excluded = !!shot.exclusions[`${axis}:${value}`];
          return `<article class="option-card ${both ? 'is-both' : ''} ${start && !end ? 'is-start' : ''} ${end && !start ? 'is-end' : ''} ${excluded ? 'is-excluded' : ''}">
            <div class="option-card-top"><strong>${escapeHTML(label)}</strong><button type="button" class="exclude-button" data-action="axis-exclude" data-axis="${axis}" data-value="${value}" aria-pressed="${excluded}" title="${excluded ? 'Return to Random pool' : 'Exclude from Random pool'}">×</button></div>
            <div class="assignment-row" role="group" aria-label="Assign ${escapeHTML(label)}">
              <button type="button" class="assignment start ${start ? 'is-active' : ''}" data-action="axis-assign" data-axis="${axis}" data-value="${value}" data-side="start"><span>S</span>Start</button>
              <button type="button" class="assignment both ${both ? 'is-active' : ''}" data-action="axis-assign" data-axis="${axis}" data-value="${value}" data-side="both"><span>•</span>Both</button>
              <button type="button" class="assignment end ${end ? 'is-active' : ''}" data-action="axis-assign" data-axis="${axis}" data-value="${value}" data-side="end"><span>E</span>End</button>
            </div>
          </article>`;
        }).join('')}
      </div>
    </div>`;
}

function renderTransportMode() {
  const transport = $('#playerTransport');
  transport.classList.toggle('is-world', ui.mode === 'world');
  $('#transportContext').textContent = ui.mode === 'sequence' ? 'CURVE' : ui.mode === 'world' ? 'ORBIT' : 'SHOT';
}

function renderAll() {
  app.dataset.mode = ui.mode;
  renderHeader();
  renderContextPanel();
  renderAxisDeck();
  renderAxisEditor();
  renderAssetStatus();
  renderTransportMode();
  syncTransport();
  syncPlayerReadout();
}

function setMode(mode) {
  if (!['world', 'shot', 'sequence'].includes(mode)) return;
  ui.mode = mode;
  if (mode !== 'shot') { ui.axisEditorOpen = false; }
  player.setMode(mode === 'sequence' ? 'sequence' : 'shot');
  if (mode === 'world') player.pause();
  renderAll();
}

function commitActiveShot(label, producer, options) {
  store.commit(label, (project) => {
    const shot = project.shots.byId[project.shots.activeId];
    producer(shot, project);
  }, options);
}

function setDelta(value) {
  const shot = currentShot();
  const capability = deltaCapability(shot);
  const resolved = Math.round(clamp(value, capability.minimum, capability.maximum));
  commitActiveShot('Set Delta', (draft) => { draft.deltaCount = resolved; });
}

function generate(kind) {
  const shot = currentShot();
  const result = generateShot({ shot, kind, requestedDelta: shot.deltaCount, seed: shot.seed });
  store.commit(kind === 'random' ? 'Random shot' : 'Variant shot', (project) => {
    project.shots.byId[shot.id] = result.shot;
  });
  ui.lastGeneration = result.report;
  player.goStart();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) player.play();
  const labels = result.report.changedAxes.map((axis) => AXES[axis].label).join(' · ');
  toast(`${kind === 'random' ? 'Random' : 'Variant'} · Δ${result.report.resolved} · ${labels || 'No axes changed'}`, 'copper');
}

function setFamily(familyId) {
  const presets = presetsForFamily(familyId);
  if (!presets.length) return;
  const current = currentShot();
  const fresh = makeShotFromPreset(presets[0].id, { id: current.id, name: presets[0].label, deltaCount: current.deltaCount, seed: current.seed + 17 });
  fresh.durationFrames = current.durationFrames;
  store.commit('Change shot family', (project) => { project.shots.byId[current.id] = fresh; });
  player.goStart();
}

function setPreset(presetId) {
  const current = currentShot();
  const fresh = makeShotFromPreset(presetId, { id: current.id, name: getPreset(presetId).label, deltaCount: current.deltaCount, seed: current.seed + 23 });
  fresh.durationFrames = current.durationFrames;
  store.commit('Choose shot preset', (project) => { project.shots.byId[current.id] = fresh; });
  player.goStart();
}

function addActiveShotToSequence() {
  const shot = currentShot();
  const clip = { id: uid('clip'), shotId: shot.id, durationFrames: shot.durationFrames || 96 };
  store.commit('Add shot to sequence', (project) => {
    project.sequence.clips.push(clip);
    project.sequence.activeClipId = clip.id;
  });
  toast(`${getPreset(shot.presetId).label} added to the curve.`, 'copper');
}

function createNewShot() {
  const current = currentShot();
  const fresh = makeShotFromPreset(current.presetId, { id: uid('shot'), name: `Shot ${currentProject().shots.order.length + 1}`, deltaCount: current.deltaCount, seed: current.seed + 101 });
  store.commit('Create new shot', (project) => {
    project.shots.byId[fresh.id] = fresh;
    project.shots.order.push(fresh.id);
    project.shots.activeId = fresh.id;
  });
  player.goStart();
  toast('New shot ready. Choose a direction.');
}

function editClip(clipId) {
  const project = currentProject();
  const clip = project.sequence.clips.find((item) => item.id === clipId);
  if (!clip) return;
  store.commit('Open linked shot', (draft) => {
    draft.shots.activeId = clip.shotId;
    draft.sequence.activeClipId = clipId;
  }, { history: false });
  setMode('shot');
}

function moveClip(clipId, direction) {
  store.commit('Move sequence clip', (project) => {
    const index = project.sequence.clips.findIndex((clip) => clip.id === clipId);
    const target = index + Number(direction);
    if (index < 0 || target < 0 || target >= project.sequence.clips.length) return;
    const [clip] = project.sequence.clips.splice(index, 1);
    project.sequence.clips.splice(target, 0, clip);
  });
  if (ui.mode === 'sequence') player.refresh();
}

function deleteClip(clipId) {
  store.commit('Delete sequence clip', (project) => {
    project.sequence.clips = project.sequence.clips.filter((clip) => clip.id !== clipId);
    if (project.sequence.activeClipId === clipId) project.sequence.activeClipId = null;
  });
  player.refresh();
}

function readFileWithProgress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      const ratio = event.lengthComputable ? event.loaded / event.total : 0;
      setAssetState({ state: 'loading', progress: ratio * 0.44, label: `Reading ${file.name}`, code: 'VALIDATING' });
    };
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('The GLB could not be read.'));
    reader.onabort = () => reject(new Error('The import was cancelled.'));
    reader.readAsArrayBuffer(file);
  });
}

async function decodeAndMount(buffer, name, { progressBase = 0.44, progressSpan = 0.46, countMount = true } = {}) {
  ui.decodeCount += 1;
  const decoded = await decodeGLB(buffer, {
    name,
    onProgress: ({ progress, label }) => setAssetState({
      state: 'loading', progress: progressBase + progress * progressSpan, label, code: 'DECODING',
    }),
  });
  setAssetState({ state: 'loading', progress: 0.93, label: 'Mounting real materials', code: 'MOUNTING' });
  if (countMount) await renderer.setAsset(decoded); else renderer.uploadAsset(decoded, false);
  return decoded;
}

async function loadBundledHero() {
  setAssetState({ state: 'loading', progress: 0.02, label: 'Opening bundled starter Hero', code: 'FETCHING' });
  const buffer = await fetchArrayBufferWithProgress('/assets/memento-obsidian-fixture.glb', ({ ratio, loaded }) => {
    setAssetState({ state: 'loading', progress: 0.03 + (ratio || Math.min(0.9, loaded / 180000)) * 0.38, label: 'Loading real GLB bytes', code: 'FETCHING' });
  });
  const decoded = await decodeAndMount(buffer, 'Memento Obsidian Fixture.glb', { progressBase: 0.42, progressSpan: 0.48 });
  const hash = await sha256Hex(buffer);
  store.commit('Mount bundled Hero', (project) => {
    project.assets.hero = {
      source: 'bundled', name: decoded.name, size: buffer.byteLength, sha256: hash,
      status: 'ready', stats: decoded.stats,
    };
  }, { history: false });
  setAssetState({ state: 'ready', progress: 1, label: 'Hero ready', code: 'READY' });
}

async function restoreIndexedHero() {
  setAssetState({ state: 'loading', progress: 0.04, label: 'Restoring saved Hero', code: 'RESTORE' });
  const record = await loadHeroAsset();
  if (!record?.blob) {
    setAssetState({ state: 'missing', progress: 0, label: 'Relink required', message: 'The project remembers this Hero, but its binary data is missing from this browser.', code: 'RELINK_REQUIRED' });
    return;
  }
  const buffer = await record.blob.arrayBuffer();
  const name = record.metadata?.name || currentProject().assets.hero.name || 'Restored Hero.glb';
  const decoded = await decodeAndMount(buffer, name, { progressBase: 0.18, progressSpan: 0.72 });
  store.commit('Restore Hero', (project) => {
    project.assets.hero = {
      ...project.assets.hero,
      source: 'indexeddb', name, size: record.blob.size, status: 'ready', stats: decoded.stats,
      sha256: record.metadata?.sha256 || project.assets.hero.sha256 || null,
    };
  }, { history: false });
  setAssetState({ state: 'ready', progress: 1, label: 'Hero restored', code: 'READY' });
}

async function importHero(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.glb')) {
    toast('Choose a binary glTF file ending in .glb.', 'error'); return;
  }
  const previousAsset = renderer.asset;
  try {
    setAssetState({ state: 'loading', progress: 0.01, label: `Validating ${file.name}`, code: 'VALIDATING' });
    const buffer = await readFileWithProgress(file);
    const decoded = await decodeAndMount(buffer, file.name, { progressBase: 0.44, progressSpan: 0.45 });
    const hash = await sha256Hex(buffer);
    setAssetState({ state: 'loading', progress: 0.97, label: 'Saving Hero and metadata atomically', code: 'PERSISTING' });
    try {
      await saveHeroAsset(file, { name: file.name, size: file.size, type: file.type, sha256: hash, stats: decoded.stats });
    } catch (error) {
      if (previousAsset) renderer.uploadAsset(previousAsset, false);
      throw error;
    }
    store.commit('Replace Hero', (project) => {
      project.assets.hero = {
        source: 'indexeddb', name: file.name, size: file.size, sha256: hash,
        status: 'ready', stats: decoded.stats,
      };
    });
    renderer.resetOrbit();
    setAssetState({ state: 'ready', progress: 1, label: 'Hero ready', code: 'READY' });
    toast(`${file.name} mounted and saved.`, 'copper');
  } catch (error) {
    console.error(error);
    setAssetState({ state: 'error', progress: 0, label: 'Import stopped', message: error.message || 'The GLB could not be mounted.', code: error.code || 'IMPORT_ERROR' });
  } finally {
    heroFileInput.value = '';
  }
}

async function bootHero() {
  try {
    if (currentProject().assets.hero.source === 'indexeddb') await restoreIndexedHero();
    else await loadBundledHero();
  } catch (error) {
    console.error(error);
    setAssetState({ state: 'error', progress: 0, label: 'Player could not mount the Hero', message: error.message, code: error.code || 'BOOT_ERROR' });
  } finally {
    ui.bootDone = true;
    renderAll();
  }
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'mode') setMode(target.dataset.mode);
  else if (action === 'undo') { if (store.undo()) player.refresh(); }
  else if (action === 'redo') { if (store.redo()) player.refresh(); }
  else if (action === 'transport-play') player.toggle();
  else if (action === 'transport-loop') player.toggleLoop();
  else if (action === 'transport-start') player.goStart();
  else if (action === 'transport-end') player.goEnd();
  else if (action === 'fullscreen') {
    const card = $('#playerCard');
    if (document.fullscreenElement) document.exitFullscreen?.(); else card.requestFullscreen?.();
  }
  else if (action === 'reset-orbit') renderer.resetOrbit();
  else if (action === 'open-import') heroFileInput.click();
  else if (action === 'world-step') { ui.worldStep = target.dataset.value; renderContextPanel(); }
  else if (action === 'world-theme') {
    store.commit('Choose world', (project) => { project.world.theme = target.dataset.value; project.world.overrideTheme = true; });
  }
  else if (action === 'world-override') {
    store.commit('Toggle world ownership', (project) => { project.world.overrideTheme = !project.world.overrideTheme; });
  }
  else if (action === 'world-orient') {
    store.commit('Orient Hero', (project) => { project.world.orientationY = Number(target.dataset.value); });
  }
  else if (action === 'world-scale-reset') store.commit('Reset Hero scale', (project) => { project.world.visualScale = 1; });
  else if (action === 'family') setFamily(target.dataset.value);
  else if (action === 'preset') setPreset(target.dataset.value);
  else if (action === 'delta-step') setDelta(currentShot().deltaCount + Number(target.dataset.value));
  else if (action === 'generate') generate(target.dataset.kind || 'variant');
  else if (action === 'add-sequence') addActiveShotToSequence();
  else if (action === 'new-shot') createNewShot();
  else if (action === 'axis-open') {
    ui.selectedAxis = target.dataset.axis; ui.axisEditorOpen = true; renderAxisDeck(); renderAxisEditor();
  }
  else if (action === 'axis-close') { ui.axisEditorOpen = false; renderAxisDeck(); renderAxisEditor(); }
  else if (action === 'axis-lock') {
    const axis = target.dataset.axis;
    const next = toggleAxisLock(currentShot(), axis);
    store.commit('Toggle axis lock', (project) => { project.shots.byId[next.id] = next; });
  }
  else if (action === 'axis-assign') {
    const next = assignAxisValue(currentShot(), target.dataset.axis, target.dataset.value, target.dataset.side);
    store.commit(`Assign ${target.dataset.axis}`, (project) => { project.shots.byId[next.id] = next; });
    player.refresh();
  }
  else if (action === 'axis-exclude') {
    const next = toggleExclusion(currentShot(), target.dataset.axis, target.dataset.value);
    store.commit('Toggle option exclusion', (project) => { project.shots.byId[next.id] = next; });
  }
  else if (action === 'sequence-play') { if (ui.mode !== 'sequence') setMode('sequence'); player.toggle(); }
  else if (action === 'clip-edit') editClip(target.dataset.value);
  else if (action === 'clip-move') moveClip(target.dataset.value, target.dataset.direction);
  else if (action === 'clip-delete') deleteClip(target.dataset.value);
}

document.addEventListener('click', handleClick);
document.addEventListener('input', (event) => {
  const input = event.target;
  if (input.id === 'transportScrub') player.seekNormalized(Number(input.value) / 1000);
  if (input.dataset.input === 'delta') {
    const number = $('#deltaNumber'); if (number) number.textContent = input.value;
  }
  if (input.dataset.input === 'world-scale') {
    const heading = contextPanel.querySelector('.section-row h3'); if (heading) heading.textContent = `${Math.round(Number(input.value) * 100)}%`;
  }
});
document.addEventListener('change', (event) => {
  const input = event.target;
  if (input.dataset.input === 'delta') setDelta(input.value);
  if (input.dataset.input === 'world-scale') {
    store.commit('Calibrate Hero scale', (project) => { project.world.visualScale = Number(input.value); });
  }
});
heroFileInput.addEventListener('change', () => importHero(heroFileInput.files?.[0]));

document.addEventListener('keydown', (event) => {
  const typing = event.target.closest('input,textarea,select,[contenteditable="true"]');
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault(); if (event.shiftKey) store.redo(); else store.undo(); player.refresh(); return;
  }
  if (typing) return;
  if (event.code === 'Space') { event.preventDefault(); player.toggle(); }
  else if (event.key.toLowerCase() === 'f') { event.preventDefault(); $('#playerCard').requestFullscreen?.(); }
  else if (event.key === 'Escape' && ui.axisEditorOpen) { ui.axisEditorOpen = false; renderAxisDeck(); renderAxisEditor(); }
});

store.subscribe(() => {
  renderAll();
  player.refresh();
});

const debugAPI = {
  getState: () => ({
    ready: ui.bootDone,
    mode: ui.mode,
    assetState: { ...ui.assetState },
    decodeCount: ui.decodeCount,
    renderer: renderer.getDebugState(),
    player: { ...ui.playerState },
    changedAxes: changedAxes(currentShot()),
    deltaCount: currentShot().deltaCount,
    shotId: currentShot().id,
    sequenceClips: currentProject().sequence.clips.length,
    project: currentProject(),
  }),
  setDelta,
  variant: () => generate('variant'),
  random: () => generate('random'),
  setMode,
  clearSavedHero: clearHeroAsset,
  importHero,
};
window.__VISUALREF_DEBUG__ = debugAPI;

renderAll();
bootHero();
