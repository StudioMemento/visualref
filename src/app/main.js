import { VisualRenderer } from '../engine/renderer.js';
import { decodeGLB, fetchArrayBufferWithProgress } from '../engine/glb-loader.js';
import { decodeHDRI } from '../engine/hdri-loader.js';
import { LIGHTING_PRESET_ORDER, getLightingPreset, applyLightingPresetToWorld } from '../engine/lighting.js';
import { ProjectStore, restoreProject, clearProjectPersistence } from '../core/project-store.js';
import { loadWorkspacePreferences, saveWorkspacePreferences, clearWorkspacePreferences } from '../core/workspace-preferences.js';
import { saveAssetBinary, loadAssetBinary, deleteAssetBinary, clearAllAssetBinaries, sha256Hex } from '../core/asset-store.js';
import {
  activeShot,
  selectedNode,
  clipShot,
  createDefaultProject,
  makeSceneNode,
  makeTransform,
  makePivot,
  makeShotFromPreset,
  normalizeProject,
  sequenceDurationFrames,
  nextClipStart,
} from '../core/schema.js';
import { AXES, AXIS_IDS, axisOptions, optionLabel } from '../shot/axes.js';
import { changedAxes, deltaCapability, generateShot, assignAxisValue, toggleAxisLock, toggleExclusion } from '../shot/delta-engine.js';
import { evaluateShotFrame, STAGE_PRESETS } from '../shot/evaluator.js';
import { FAMILIES, PRESETS, getFamily, getPreset, presetsForFamily } from '../shot/presets.js';
import { CAPABILITIES } from '../shot/capabilities.js';
import { PlayerClock } from '../sequence/player.js';
import {
  addShotClip,
  removeClip,
  moveClip,
  reorderSimple,
  trimClip,
  bladeClip,
  slipClip,
  detachClip,
  relinkClip,
  duplicateClip,
  addMarker,
  removeMarker,
  timelineSummary,
} from '../sequence/timeline-model.js';
import { availableSequencePresets, createSequencePlan, buildSequencePreset } from '../sequence/presets.js';
import { pivotPositionPreservingGeometry, groundNodeTransform, snapValue } from '../scene/transforms.js';
import { icon } from '../ui/icons.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const copy = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));
const formatNumber = (value, digits = 2) => Number(value || 0).toFixed(digits).replace(/\.00$/, '');
const formatTime = (frames, fps = 24) => {
  const seconds = Math.max(0, Number(frames) || 0) / Math.max(1, fps);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${(seconds - minutes * 60).toFixed(2).padStart(5, '0')}`;
};
const humanBytes = (bytes = 0) => {
  if (!bytes) return 'Bundled';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
const plainBounds = (bounds) => bounds ? { min: [...bounds.min], max: [...bounds.max] } : null;
const axisSides = ['start', 'both', 'end'];

const app = $('#app');
const workspaceEl = $('#workspace');
const canvas = $('#heroCanvas');
const leftPanel = $('#leftPanel');
const lowerWorkspace = $('#lowerWorkspace');
const inspectorPanel = $('#inspectorPanel');
const viewportDock = $('#viewportDock');
const assetOverlay = $('#assetOverlay');
const toastEl = $('#toast');
const heroFileInput = $('#heroFileInput');
const assetFileInput = $('#assetFileInput');
const backgroundFileInput = $('#backgroundFileInput');
const hdriFileInput = $('#hdriFileInput');
const splitDivider = $('#splitDivider');
const preferencesSheet = $('#preferencesSheet');
const mobileSheet = $('#mobileSheet');

const restored = normalizeProject(restoreProject(createDefaultProject));
const store = new ProjectStore(restored);
const preferences = loadWorkspacePreferences();
const ui = {
  mode: 'shot',
  displayByMode: {
    world: 'viewport',
    shot: preferences.displayMode === 'split' ? 'split' : 'render',
    sequence: preferences.displayMode === 'split' ? 'split' : 'render',
  },
  shotSubview: preferences.shotSubview || 'director',
  sequenceView: preferences.sequenceView || 'simple',
  selectedWorldTab: preferences.selectedWorldTab || 'transform',
  selectedAxis: 'light',
  selectedFamilyId: activeShot(restored)?.familyId || 'hero',
  selectedSequencePresetId: 'hero-authority-4',
  sequencePlan: null,
  playerState: { mode: 'shot', playing: false, loop: true, frame: 0, totalFrames: 1, normalized: 0, driftFrames: 0 },
  currentPayload: null,
  currentFrame: null,
  assetState: { state: 'busy', progress: 0, label: 'Opening Hero', message: '', code: null },
  mountedAssetIds: new Set(),
  mountedHDRIIds: new Set(),
  decodeCount: 0,
  bootComplete: false,
  toastTimer: 0,
  splitDrag: null,
  timelineDrag: null,
  inputPreview: null,
  mobileSheet: null,
  preferencesOpen: false,
};

const workspacePreferences = {
  ...preferences,
  displayMode: ui.displayByMode[ui.mode],
};

function persistWorkspacePreferences() {
  workspacePreferences.displayMode = currentDisplayMode();
  workspacePreferences.shotSubview = ui.shotSubview;
  workspacePreferences.sequenceView = ui.sequenceView;
  workspacePreferences.selectedWorldTab = ui.selectedWorldTab;
  saveWorkspacePreferences(workspacePreferences);
}

function currentDisplayMode() { return ui.displayByMode[ui.mode] || (ui.mode === 'world' ? 'viewport' : 'render'); }
function project() { return store.getState(); }
function shot() { return activeShot(project()); }
function sceneNode() { return selectedNode(project()); }
function activeClip() { return project().sequence.clips.find((clip) => clip.id === project().sequence.activeClipId) || null; }
function activeClipShot() { return clipShot(project(), activeClip()); }

function workspaceState() {
  return {
    displayMode: currentDisplayMode(),
    splitRatio: workspacePreferences.splitRatio,
    splitSwapped: workspacePreferences.splitSwapped,
    editorCamera: workspacePreferences.editorCamera,
    viewportTool: workspacePreferences.viewportTool,
    transformSpace: workspacePreferences.transformSpace,
    snapEnabled: workspacePreferences.snapEnabled,
    viewportShading: workspacePreferences.viewportShading,
    guides: workspacePreferences.guides,
  };
}

function toast(message, tone = 'neutral') {
  clearTimeout(ui.toastTimer);
  toastEl.hidden = false;
  toastEl.dataset.tone = tone;
  toastEl.textContent = message;
  requestAnimationFrame(() => toastEl.classList.add('is-visible'));
  ui.toastTimer = setTimeout(() => {
    toastEl.classList.remove('is-visible');
    setTimeout(() => { toastEl.hidden = true; }, 180);
  }, 2600);
}

function setAssetState(next) {
  ui.assetState = { ...ui.assetState, ...next };
  renderAssetState();
}

function renderAssetState() {
  const state = ui.assetState;
  const status = $('#playerAssetStatus');
  const projectStatus = $('#projectStatusText');
  const projectButton = $('#projectStatusButton');
  if (status) {
    status.className = `player-asset-status is-${state.state}`;
    status.innerHTML = `<span class="status-dot"></span><span>${escapeHTML(state.label || state.message || 'Ready')}</span>`;
  }
  if (projectStatus) projectStatus.textContent = state.label || (state.state === 'ready' ? 'Project ready' : 'Opening Hero');
  if (projectButton) projectButton.classList.toggle('has-error', state.state === 'error');
  if (!assetOverlay) return;
  if (state.state === 'ready' || (state.state === 'idle' && ui.bootComplete)) {
    assetOverlay.innerHTML = '';
    assetOverlay.className = 'asset-overlay';
    return;
  }
  assetOverlay.className = `asset-overlay is-visible is-${state.state}`;
  if (state.state === 'busy') {
    const progress = Math.round(clamp(state.progress, 0, 1) * 100);
    assetOverlay.innerHTML = `
      <div class="overlay-card loading-card">
        <span class="eyebrow copper">REAL ASSET PIPELINE</span>
        <strong>${escapeHTML(state.label || 'Loading scene')}</strong>
        <div class="loading-meter"><span style="width:${progress}%"></span></div>
        <small>${progress}% · ${escapeHTML(state.message || 'Validating before mount')}</small>
      </div>`;
  } else if (state.state === 'error') {
    assetOverlay.innerHTML = `
      <div class="overlay-card error-card">
        <span class="eyebrow danger">${escapeHTML(state.code || 'ASSET ERROR')}</span>
        <strong>${escapeHTML(state.message || 'The asset could not be opened.')}</strong>
        <div class="overlay-actions">
          <button class="button button-primary" type="button" data-action="import-hero">Relink / Replace Hero</button>
          <button class="button button-ghost" type="button" data-action="retry-assets">Retry</button>
        </div>
      </div>`;
  }
}

const renderer = new VisualRenderer(canvas, {
  onContextState: ({ state, message }) => {
    if (state === 'lost') setAssetState({ state: 'error', label: 'Context lost', message, code: 'CONTEXT_LOST' });
    else toast(message, 'warning');
  },
  onEditorCameraChange: (camera) => {
    workspacePreferences.editorCamera = { ...workspacePreferences.editorCamera, ...camera };
    saveWorkspacePreferences(workspacePreferences);
    renderer.setWorkspace(workspaceState());
  },
  onSelect: (nodeId) => {
    if (!project().scene.byId[nodeId]) return;
    store.commit('Select scene object', (draft) => { draft.scene.selectedNodeId = nodeId; }, { history: false });
  },
  onFocusPoint: (uv) => {
    store.commit('Set focus point', (draft) => {
      draft.world.post.dof.enabled = true;
      draft.world.post.dof.focusUV = [...uv];
    });
    toast('Focus point set on the Render surface.', 'success');
  },
  onTransformGesture: ({ phase, tool, dx, dy, nodeId }) => handleTransformGesture({ phase, tool, dx, dy, nodeId }),
});

const player = new PlayerClock({
  getProject: () => store.getState(),
  onFrame: (payload) => {
    ui.currentPayload = payload;
    const current = project();
    const evaluated = evaluateShotFrame(payload.shot, payload.mix, current.world);
    ui.currentFrame = evaluated;
    renderer.setProjectState({ project: current, frame: evaluated, workspace: workspaceState() });
    updateFrameUI(payload);
  },
  onState: (state) => {
    ui.playerState = state;
    syncTransport();
  },
});

function updateFrameUI(payload) {
  const fps = project().settings.fps || 24;
  const readout = $('#playerFrameReadout');
  if (readout) readout.textContent = `${String(Math.round(payload.frame)).padStart(4, '0')} / ${String(Math.max(0, payload.totalFrames - 1)).padStart(4, '0')} · ${formatTime(payload.frame, fps)}`;
  const title = $('#playerShotTitle');
  if (title) title.textContent = payload.shot?.name || 'Cinematic Workspace';
  if (payload.mode === 'sequence') {
    $$('.sequence-clip, .timeline-clip').forEach((element) => element.classList.toggle('is-playing', element.dataset.clipId === payload.clip?.id));
  }
  updateFocusHelper();
}

function updateFocusHelper() {
  const helper = $('#focusHelper');
  if (!helper) return;
  const dof = project().world.post.dof;
  const visible = !!dof.enabled && (currentDisplayMode() === 'viewport' || currentDisplayMode() === 'split');
  helper.hidden = !visible;
  helper.style.setProperty('--focus-x', `${clamp(dof.focusUV?.[0] ?? 0.5) * 100}%`);
  helper.style.setProperty('--focus-y', `${(1 - clamp(dof.focusUV?.[1] ?? 0.5)) * 100}%`);
}

function syncTransport() {
  const state = ui.playerState;
  const playButton = $('#transportPlay');
  const loopButton = $('#transportLoop');
  const scrub = $('#transportScrub');
  if (playButton) {
    playButton.innerHTML = state.playing ? icon('pause') : icon('play');
    playButton.classList.toggle('is-playing', state.playing);
    playButton.title = state.playing ? 'Pause' : 'Play';
  }
  if (loopButton) {
    loopButton.classList.toggle('is-active', state.loop);
    loopButton.setAttribute('aria-pressed', String(state.loop));
  }
  if (scrub && document.activeElement !== scrub) scrub.value = String(Math.round((state.normalized || 0) * 1000));
  const shell = $('#transportProgress');
  if (shell) shell.style.setProperty('--progress', `${(state.normalized || 0) * 100}%`);
}

function handleTransformGesture({ phase, tool, dx, dy, nodeId }) {
  const node = project().scene.byId[nodeId];
  if (!node || node.locked) return;
  if (phase === 'preview') {
    if (!store.activePreview) store.beginPreview(`${tool[0].toUpperCase()}${tool.slice(1)} ${node.name}`);
    store.preview((draft) => {
      const target = draft.scene.byId[nodeId];
      if (!target) return;
      const snap = workspacePreferences.snapEnabled;
      if (tool === 'move') {
        const step = workspacePreferences.snapTranslate || 0.25;
        target.transform.position[0] += dx * 0.012;
        target.transform.position[1] -= dy * 0.012;
        if (snap) {
          target.transform.position[0] = snapValue(target.transform.position[0], step);
          target.transform.position[1] = snapValue(target.transform.position[1], step);
        }
      } else if (tool === 'rotate') {
        target.transform.rotation[1] += dx * 0.45;
        target.transform.rotation[0] += dy * 0.35;
        if (snap) {
          const step = workspacePreferences.snapRotate || 15;
          target.transform.rotation[1] = snapValue(target.transform.rotation[1], step);
          target.transform.rotation[0] = snapValue(target.transform.rotation[0], step);
        }
      } else if (tool === 'scale') {
        const multiplier = Math.exp((dx - dy) * 0.006);
        target.transform.scale = target.transform.scale.map((value) => clamp(value * multiplier, 0.01, 100));
        if (snap) target.transform.scale = target.transform.scale.map((value) => snapValue(value, workspacePreferences.snapScale || 0.1));
      } else if (tool === 'pivot') {
        const nextPivot = [...target.pivot.position];
        nextPivot[0] += dx * 0.01;
        nextPivot[1] -= dy * 0.01;
        if (snap) {
          nextPivot[0] = snapValue(nextPivot[0], workspacePreferences.snapTranslate || 0.25);
          nextPivot[1] = snapValue(nextPivot[1], workspacePreferences.snapTranslate || 0.25);
        }
        target.transform.position = pivotPositionPreservingGeometry(target, nextPivot);
        target.pivot.position = nextPivot;
      }
    });
  } else if (phase === 'commit') {
    store.commitPreview(`${tool[0].toUpperCase()}${tool.slice(1)} ${node.name}`);
  }
}

function assetProgress(prefix, phase) {
  const ratio = clamp(phase.ratio ?? phase.progress ?? 0);
  setAssetState({ state: 'busy', progress: ratio, label: prefix, message: phase.label || 'Reading binary data' });
}

async function decodeAssetBuffer(buffer, name, statusLabel) {
  ui.decodeCount += 1;
  return decodeGLB(buffer, {
    name,
    onProgress: (phase) => assetProgress(statusLabel, phase),
  });
}

async function mountAssetRecord(record, { countMount = true } = {}) {
  if (!record) return false;
  let buffer;
  if (record.source === 'bundled' && record.sourcePath) {
    buffer = await fetchArrayBufferWithProgress(record.sourcePath, ({ ratio, loaded, total }) => {
      setAssetState({ state: 'busy', progress: ratio, label: `Loading ${record.name}`, message: total ? `${humanBytes(loaded)} / ${humanBytes(total)}` : humanBytes(loaded) });
    });
  } else {
    const stored = await loadAssetBinary(record.id);
    if (!stored?.blob) throw Object.assign(new Error(`${record.name} is missing from local storage. Relink the asset to continue.`), { code: 'RELINK_REQUIRED' });
    buffer = await stored.blob.arrayBuffer();
  }
  const decoded = await decodeAssetBuffer(buffer, record.name, `Decoding ${record.name}`);
  renderer.uploadAsset(record.id, decoded, { role: record.role || 'asset', countMount });
  ui.mountedAssetIds.add(record.id);
  store.commit(`Restore ${record.name}`, (draft) => {
    const target = draft.assets.byId[record.id];
    if (!target) return;
    target.status = 'ready';
    target.stats = decoded.stats;
    target.bounds = plainBounds(decoded.bounds);
    const mounted = renderer.getAssetRecord(record.id);
    target.normalization = mounted ? {
      scale: mounted.normalizationScale,
      size: [...mounted.normalizedSize],
      radius: mounted.normalizedRadius,
    } : null;
  }, { history: false });
  return true;
}

async function mountHDRIRecord(record, { countMount = true } = {}) {
  const stored = await loadAssetBinary(record.id);
  if (!stored?.blob) throw Object.assign(new Error(`${record.name} is missing from local storage. Relink the HDRI to continue.`), { code: 'RELINK_REQUIRED' });
  setAssetState({ state: 'busy', progress: 0.25, label: `Loading ${record.name}`, message: 'Decoding Radiance environment' });
  const decoded = decodeHDRI(await stored.blob.arrayBuffer(), { name: record.name });
  renderer.setHDRI(record.id, decoded, { countMount });
  ui.mountedHDRIIds.add(record.id);
  store.commit(`Restore ${record.name}`, (draft) => {
    if (draft.assets.byId[record.id]) {
      draft.assets.byId[record.id].status = 'ready';
      draft.assets.byId[record.id].stats = { width: decoded.width, height: decoded.height, format: decoded.format, averageLuminance: decoded.averageLuminance };
    }
  }, { history: false });
}

async function bootSceneAssets() {
  setAssetState({ state: 'busy', progress: 0.02, label: 'Opening V49 workspace', message: 'Restoring the real scene graph' });
  const current = project();
  const records = Object.values(current.assets.byId).filter((record) => record.role !== 'hdri');
  let heroReady = false;
  const failures = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    try {
      await mountAssetRecord(record, { countMount: true });
      if (record.id === current.assets.heroAssetId) heroReady = true;
    } catch (error) {
      failures.push({ record, error });
      store.commit(`Mark ${record.name} for relink`, (draft) => {
        if (draft.assets.byId[record.id]) draft.assets.byId[record.id].status = 'relink';
      }, { history: false });
    }
  }
  const hdriId = project().world.hdriAssetId;
  if (hdriId && project().assets.byId[hdriId]) {
    try { await mountHDRIRecord(project().assets.byId[hdriId], { countMount: true }); }
    catch (error) {
      failures.push({ record: project().assets.byId[hdriId], error });
      store.commit('Use safe HDRI fallback', (draft) => {
        draft.assets.byId[hdriId].status = 'relink';
        draft.world.hdri.visible = false;
        if (draft.world.stagePresetId === 'hdri-world') draft.world.stagePresetId = 'dark-cyclorama';
      }, { history: false });
    }
  }
  ui.bootComplete = true;
  if (!heroReady) {
    const heroRecord = project().assets.byId[project().assets.heroAssetId];
    const failure = failures.find((entry) => entry.record?.id === heroRecord?.id);
    setAssetState({ state: 'error', progress: 0, label: 'Hero needs relink', message: failure?.error?.message || 'The Hero could not be restored.', code: failure?.error?.code || 'HERO_MISSING' });
  } else {
    setAssetState({ state: 'ready', progress: 1, label: failures.length ? 'Scene ready · relink available' : 'Scene ready', message: '' });
    renderer.resetEditorCamera();
  }
  renderAll();
}

async function importGLB(file, role) {
  if (!file) return;
  const current = project();
  const isHero = role === 'hero';
  const label = isHero ? 'Validating replacement Hero' : `Importing ${role}`;
  setAssetState({ state: 'busy', progress: 0, label, message: file.name });
  let newId = uid(`asset-${role}`);
  try {
    const buffer = await file.arrayBuffer();
    const decoded = await decodeAssetBuffer(buffer, file.name, label);
    renderer.uploadAsset(newId, decoded, { role, countMount: true });
    await saveAssetBinary(newId, file, { name: file.name, role, size: file.size, type: file.type });
    const digest = await sha256Hex(buffer);
    const mounted = renderer.getAssetRecord(newId);
    const record = {
      id: newId,
      name: file.name,
      role,
      source: 'indexeddb',
      sourcePath: null,
      size: file.size,
      sha256: digest,
      status: 'ready',
      stats: decoded.stats,
      bounds: plainBounds(decoded.bounds),
      normalization: mounted ? { scale: mounted.normalizationScale, size: [...mounted.normalizedSize], radius: mounted.normalizedRadius } : null,
      mime: file.type || 'model/gltf-binary',
      createdAt: new Date().toISOString(),
    };
    const oldHeroId = current.assets.heroAssetId;
    let nodeId;
    store.commit(isHero ? 'Replace Hero' : `Import ${role}`, (draft) => {
      draft.assets.byId[newId] = record;
      if (isHero) {
        draft.assets.heroAssetId = newId;
        const heroNode = Object.values(draft.scene.byId).find((node) => node.role === 'hero') || draft.scene.byId[draft.scene.order[0]];
        heroNode.assetId = newId;
        heroNode.name = 'Hero';
        heroNode.visible = true;
        nodeId = heroNode.id;
        if (oldHeroId && oldHeroId !== newId) delete draft.assets.byId[oldHeroId];
      } else {
        const node = makeSceneNode({
          id: uid('node'),
          name: file.name.replace(/\.glb$/i, ''),
          role,
          assetId: newId,
          transform: makeTransform(),
          pivot: makePivot(),
        });
        draft.scene.byId[node.id] = node;
        draft.scene.order.push(node.id);
        draft.scene.selectedNodeId = node.id;
        nodeId = node.id;
        if (role === 'background') draft.world.importedSetNodeId = node.id;
      }
    });
    ui.mountedAssetIds.add(newId);
    if (isHero && oldHeroId && oldHeroId !== newId) {
      renderer.removeAsset(oldHeroId);
      ui.mountedAssetIds.delete(oldHeroId);
      if (current.assets.byId[oldHeroId]?.source === 'indexeddb') await deleteAssetBinary(oldHeroId).catch(() => {});
    }
    setAssetState({ state: 'ready', progress: 1, label: 'Scene ready', message: '' });
    renderer.frameNode(nodeId);
    toast(isHero ? 'Hero replaced after validation.' : `${record.name} added to the scene.`, 'success');
  } catch (error) {
    renderer.removeAsset(newId);
    await deleteAssetBinary(newId).catch(() => {});
    setAssetState({ state: 'error', progress: 0, label: isHero ? 'Current Hero preserved' : 'Import failed', message: error.message, code: error.code || 'IMPORT_FAILED' });
    toast(`${file.name} was not mounted: ${error.message}`, 'error');
  } finally {
    heroFileInput.value = '';
    assetFileInput.value = '';
    backgroundFileInput.value = '';
  }
}

async function importHDRI(file) {
  if (!file) return;
  const id = uid('asset-hdri');
  setAssetState({ state: 'busy', progress: 0.1, label: 'Validating HDRI', message: file.name });
  try {
    const buffer = await file.arrayBuffer();
    const decoded = decodeHDRI(buffer, { name: file.name });
    renderer.setHDRI(id, decoded, { countMount: true });
    await saveAssetBinary(id, file, { name: file.name, role: 'hdri', size: file.size, type: file.type });
    const digest = await sha256Hex(buffer);
    const oldId = project().world.hdriAssetId;
    store.commit('Import HDRI', (draft) => {
      draft.assets.byId[id] = {
        id, name: file.name, role: 'hdri', source: 'indexeddb', sourcePath: null, size: file.size,
        sha256: digest, status: 'ready', mime: file.type || 'image/vnd.radiance', createdAt: new Date().toISOString(),
        stats: { width: decoded.width, height: decoded.height, format: decoded.format, averageLuminance: decoded.averageLuminance },
        bounds: null, normalization: null,
      };
      draft.world.hdriAssetId = id;
      draft.world.hdri.visible = true;
      draft.world.lighting.hdriContribution = Math.max(0.35, draft.world.lighting.hdriContribution || 0);
      if (oldId && oldId !== id) delete draft.assets.byId[oldId];
    });
    ui.mountedHDRIIds.add(id);
    if (oldId && oldId !== id) {
      renderer.removeHDRI(oldId);
      ui.mountedHDRIIds.delete(oldId);
      await deleteAssetBinary(oldId).catch(() => {});
    }
    setAssetState({ state: 'ready', progress: 1, label: 'Scene ready', message: '' });
    toast('HDRI lighting is live while the cyclorama can remain visible.', 'success');
  } catch (error) {
    renderer.removeHDRI(id);
    await deleteAssetBinary(id).catch(() => {});
    setAssetState({ state: 'error', progress: 0, label: 'HDRI not mounted', message: error.message, code: error.code || 'HDRI_FAILED' });
  } finally {
    hdriFileInput.value = '';
  }
}

function renderAll() {
  const current = project();
  app.dataset.mode = ui.mode;
  app.dataset.display = currentDisplayMode();
  app.dataset.shotView = ui.shotSubview;
  app.dataset.sequenceView = ui.sequenceView;
  app.classList.toggle('left-collapsed', workspacePreferences.leftPanelCollapsed);
  app.classList.toggle('inspector-collapsed', workspacePreferences.inspectorCollapsed);
  renderHeader();
  renderPlayerChrome();
  renderViewportDock();
  renderLeftPanel();
  renderLowerWorkspace();
  renderInspector();
  renderMobileSheet();
  renderPreferences();
  renderAssetState();
  player.refresh();
  renderer.setWorkspace(workspaceState());
}

function renderHeader() {
  $$('.mode-button').forEach((button) => {
    const active = button.dataset.mode === ui.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('.display-button').forEach((button) => {
    const active = button.dataset.display === currentDisplayMode();
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#undoButton').disabled = !store.canUndo();
  $('#redoButton').disabled = !store.canRedo();
  const mobileUndo = $('#mobileUndoButton');
  const mobileRedo = $('#mobileRedoButton');
  if (mobileUndo) mobileUndo.disabled = !store.canUndo();
  if (mobileRedo) mobileRedo.disabled = !store.canRedo();
  const splitButton = $('[data-display="split"]');
  if (splitButton) splitButton.disabled = matchMedia('(max-width: 899px) and (orientation: portrait)').matches;
}

function renderPlayerChrome() {
  const payloadShot = ui.currentPayload?.shot || shot();
  $('#playerContextLabel').textContent = `${ui.mode.toUpperCase()} · ${currentDisplayMode().toUpperCase()}`;
  $('#playerShotTitle').textContent = payloadShot?.name || 'Cinematic Workspace';
  $('#transportContext').textContent = ui.mode === 'sequence' ? 'SEQ' : ui.mode.toUpperCase();
  const display = currentDisplayMode();
  const labels = $('#viewLabels');
  const swapped = workspacePreferences.splitSwapped;
  if (display === 'split') {
    labels.innerHTML = `<span class="view-label view-label-left">${swapped ? 'VIEWPORT' : 'RENDER'}</span><span class="view-label view-label-right">${swapped ? 'RENDER' : 'VIEWPORT'}</span>`;
    splitDivider.hidden = false;
    splitDivider.style.left = `${workspacePreferences.splitRatio * 100}%`;
  } else {
    labels.innerHTML = `<span class="view-label view-label-single">${display.toUpperCase()}</span>`;
    splitDivider.hidden = true;
  }
  const hint = $('#playerHint');
  if (hint) {
    hint.textContent = display === 'render'
      ? 'CLICK TO SET FOCUS · SCRUB START TO END'
      : display === 'viewport'
        ? 'DRAG TO ORBIT · SCROLL TO DOLLY · DOUBLE CLICK TO FRAME'
        : 'EDIT IN VIEWPORT · WATCH FINAL RENDER LIVE';
  }
  const guides = $('#playerGuides');
  guides.className = `player-guides ${workspacePreferences.guides && display !== 'render' ? 'is-visible' : ''}`;
  guides.innerHTML = '<i class="guide-v one"></i><i class="guide-v two"></i><i class="guide-h one"></i><i class="guide-h two"></i><i class="guide-center"></i>';
  updateFocusHelper();
}

function toolButton(id, label, glyph, active = false, extra = '') {
  return `<button class="dock-tool ${active ? 'is-active' : ''}" type="button" data-action="viewport-tool" data-tool="${id}" title="${escapeHTML(label)}" ${extra}><span>${glyph}</span><small>${escapeHTML(label)}</small></button>`;
}

function renderViewportDock() {
  const display = currentDisplayMode();
  const visible = display === 'viewport' || display === 'split';
  viewportDock.hidden = !visible;
  if (!visible) { viewportDock.innerHTML = ''; return; }
  const currentTool = workspacePreferences.viewportTool;
  viewportDock.innerHTML = `
    <div class="dock-cluster">
      ${toolButton('select', 'Select', '↖', currentTool === 'select')}
      ${toolButton('move', 'Move', '✣', currentTool === 'move')}
      ${toolButton('rotate', 'Rotate', '↻', currentTool === 'rotate')}
      ${toolButton('scale', 'Scale', '⤢', currentTool === 'scale')}
      ${toolButton('pivot', 'Pivot', '⊹', currentTool === 'pivot')}
    </div>
    <span class="dock-separator"></span>
    <button class="dock-tool ${workspacePreferences.transformSpace === 'local' ? 'is-active' : ''}" type="button" data-action="transform-space" title="Local / World transform space"><span>${workspacePreferences.transformSpace === 'local' ? 'L' : 'W'}</span><small>${workspacePreferences.transformSpace}</small></button>
    <button class="dock-tool ${workspacePreferences.snapEnabled ? 'is-active' : ''}" type="button" data-action="snap-toggle" title="Snap"><span>⌁</span><small>Snap</small></button>
    <span class="dock-separator"></span>
    <button class="dock-tool" type="button" data-action="frame-selected" title="Frame selected"><span>⌗</span><small>Frame</small></button>
    <button class="dock-tool" type="button" data-action="ground-selected" title="Ground selected"><span>⊥</span><small>Ground</small></button>
    <button class="dock-tool" type="button" data-action="reset-transform" title="Reset transform"><span>↺</span><small>Reset</small></button>
    <button class="dock-tool ${workspacePreferences.guides ? 'is-active' : ''}" type="button" data-action="guides-toggle" title="Guides"><span>▦</span><small>Guides</small></button>
  `;
}

function panelHeader(eyebrow, title, actions = '') {
  return `<header class="panel-header"><div><span class="eyebrow copper">${escapeHTML(eyebrow)}</span><h2>${escapeHTML(title)}</h2></div>${actions}</header>`;
}

function renderLeftPanel() {
  leftPanel.hidden = workspacePreferences.leftPanelCollapsed;
  if (ui.mode === 'world') renderWorldLeft();
  else if (ui.mode === 'shot') renderShotLeft();
  else renderSequenceLeft();
}

function roleGlyph(role) {
  return ({ hero: 'H', background: 'B', asset: 'A', light: 'L', camera: 'C' })[role] || '•';
}

function renderWorldLeft() {
  const current = project();
  const nodes = current.scene.order.map((id) => current.scene.byId[id]).filter(Boolean);
  const heroRecord = current.assets.byId[current.assets.heroAssetId];
  leftPanel.innerHTML = `
    ${panelHeader('WORLD', 'Scene', `<button class="panel-collapse" type="button" data-action="collapse-left" aria-label="Collapse scene panel">‹</button>`)}
    <div class="panel-scroll">
      <section class="panel-section section-tight">
        <div class="section-title-row"><span>OUTLINER</span><small>${nodes.length} NODES</small></div>
        <div class="outliner-list">
          ${nodes.map((node) => `
            <div class="outliner-row ${current.scene.selectedNodeId === node.id ? 'is-selected' : ''}" data-node-id="${node.id}">
              <button type="button" class="outliner-select" data-action="select-node" data-node-id="${node.id}"><span class="role-glyph">${roleGlyph(node.role)}</span><span><strong>${escapeHTML(node.name)}</strong><small>${escapeHTML(node.role)}</small></span></button>
              <button class="mini-icon ${node.visible ? 'is-on' : ''}" type="button" data-action="toggle-node-visible" data-node-id="${node.id}" title="Show / hide">${node.visible ? '◉' : '○'}</button>
              <button class="mini-icon ${node.locked ? 'is-on' : ''}" type="button" data-action="toggle-node-lock" data-node-id="${node.id}" title="Lock / unlock">${node.locked ? '▣' : '□'}</button>
            </div>`).join('')}
        </div>
      </section>
      <section class="panel-section">
        <div class="section-title-row"><span>ASSET LIBRARY</span><small>ROLE-AWARE</small></div>
        <div class="asset-summary">
          <span class="asset-thumbnail">VR</span>
          <div><strong>${escapeHTML(heroRecord?.name || 'Hero')}</strong><small>${heroRecord?.stats ? `${heroRecord.stats.meshes} meshes · ${heroRecord.stats.triangles.toLocaleString()} tris` : heroRecord?.status || 'Loading'}</small></div>
        </div>
        <div class="button-stack">
          <button class="button button-primary" type="button" data-action="import-hero">${icon('upload')}<span>Replace Hero / Import GLB</span></button>
          <button class="button button-ghost" type="button" data-action="import-asset">${icon('plus')}<span>Add supporting asset</span></button>
          <button class="button button-ghost" type="button" data-action="import-background">${icon('plus')}<span>Add background / set</span></button>
          <button class="button button-ghost" type="button" data-action="import-hdri">${icon('plus')}<span>Load HDRI</span></button>
        </div>
      </section>
      <section class="panel-section compact-proof">
        <span>ONE LIVING SCENE</span>
        <dl><div><dt>Hero mounts</dt><dd>${renderer.getDebugState().heroMountCount}</dd></div><div><dt>GPU assets</dt><dd>${renderer.getDebugState().assetCount}</dd></div><div><dt>Canvas</dt><dd>1</dd></div></dl>
      </section>
    </div>`;
}

function renderShotLeft() {
  const current = project();
  const active = shot();
  leftPanel.innerHTML = `
    ${panelHeader('SHOT', ui.shotSubview === 'director' ? 'Direction' : 'Semantic Matrix', `<button class="panel-collapse" type="button" data-action="collapse-left" aria-label="Collapse panel">‹</button>`)}
    <div class="panel-scroll">
      <div class="segmented-control full">
        <button type="button" data-action="shot-subview" data-view="director" class="${ui.shotSubview === 'director' ? 'is-active' : ''}">Director</button>
        <button type="button" data-action="shot-subview" data-view="matrix" class="${ui.shotSubview === 'matrix' ? 'is-active' : ''}">Matrix</button>
      </div>
      <section class="panel-section section-tight">
        <div class="section-title-row"><span>SHOT LIST</span><button type="button" class="micro-action" data-action="new-shot">+ NEW</button></div>
        <div class="shot-list">
          ${current.shots.order.map((id, index) => {
            const item = current.shots.byId[id];
            return `<button type="button" class="shot-row ${id === current.shots.activeId ? 'is-active' : ''}" data-action="select-shot" data-shot-id="${id}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHTML(item.name)}</strong><small>Δ ${item.deltaCount}</small></button>`;
          }).join('')}
        </div>
      </section>
      <section class="panel-section">
        <div class="section-title-row"><span>FAMILIES</span><small>PRESET-FIRST</small></div>
        <div class="family-rail">
          ${Object.values(FAMILIES).map((family) => `<button type="button" class="family-button ${active.familyId === family.id ? 'is-active' : ''}" data-action="family" data-family-id="${family.id}"><span>${family.eyebrow || family.id.toUpperCase()}</span><strong>${escapeHTML(family.label)}</strong></button>`).join('')}
        </div>
      </section>
      <section class="panel-section compact-proof">
        <span>ACTIVE RECIPE</span>
        <dl><div><dt>Changed axes</dt><dd>${changedAxes(active).length}</dd></div><div><dt>Locked</dt><dd>${Object.values(active.locks).filter(Boolean).length}</dd></div><div><dt>Seed</dt><dd>${active.seed}</dd></div></dl>
      </section>
    </div>`;
}

function renderSequenceLeft() {
  const presets = availableSequencePresets();
  const plan = ui.sequencePlan || createSequencePlan(ui.selectedSequencePresetId);
  leftPanel.innerHTML = `
    ${panelHeader('SEQUENCE', 'Preset Library', `<button class="panel-collapse" type="button" data-action="collapse-left" aria-label="Collapse preset library">‹</button>`)}
    <div class="panel-scroll">
      <section class="panel-section section-tight">
        <div class="section-title-row"><span>CINEMATIC COMBINATIONS</span><small>${presets.length} READY</small></div>
        <div class="sequence-preset-list">
          ${presets.map((preset) => `<button type="button" class="sequence-preset-card ${plan.presetId === preset.id ? 'is-active' : ''}" data-action="sequence-preset" data-preset-id="${preset.id}"><span>${escapeHTML(preset.eyebrow)}</span><strong>${escapeHTML(preset.name)}</strong><small>${escapeHTML(preset.description)}</small></button>`).join('')}
        </div>
      </section>
      <section class="panel-section ghost-plan">
        <span class="eyebrow copper">GHOST PLAN</span>
        <h3>${escapeHTML(plan.name)}</h3>
        <p>${escapeHTML(plan.description)}</p>
        <ol>${plan.shots.map((item) => `<li><span>${String(item.index + 1).padStart(2, '0')}</span><strong>${escapeHTML(item.name)}</strong><small>${item.durationFrames}f</small></li>`).join('')}</ol>
        <button class="button button-primary button-wide" type="button" data-action="build-sequence">Build Sequence</button>
      </section>
    </div>`;
}

function renderLowerWorkspace() {
  if (ui.mode === 'world') renderWorldLower();
  else if (ui.mode === 'shot') renderShotLower();
  else renderSequenceLower();
}

function renderWorldLower() {
  const current = project();
  const node = sceneNode();
  lowerWorkspace.innerHTML = `
    <div class="world-status-strip">
      <div><span>STAGE</span><strong>${escapeHTML(STAGE_PRESETS[current.world.stagePresetId]?.label || current.world.stagePresetId)}</strong></div>
      <div><span>SELECTION</span><strong>${escapeHTML(node?.name || 'None')}</strong></div>
      <div><span>LIGHT</span><strong>${escapeHTML(getLightingPreset(current.world.lightingPresetId).label)}</strong></div>
      <div><span>HDRI</span><strong>${current.world.hdriAssetId ? (current.world.hdri.visible ? 'Lighting + reflections' : 'Reflections only') : 'Not loaded'}</strong></div>
      <div><span>POST</span><strong>${current.world.post.bypass ? 'Bypassed' : current.world.post.dof.enabled ? 'DOF active' : 'Grade active'}</strong></div>
    </div>`;
}

function renderShotLower() {
  const active = shot();
  if (ui.shotSubview === 'matrix') {
    lowerWorkspace.innerHTML = `<div class="matrix-status"><span>ALL 11 AXES ARE LIVE</span><strong>${changedAxes(active).length} semantic changes · ${Object.values(active.locks).filter(Boolean).length} locks</strong><small>Every visible chip maps to a deterministic evaluator.</small></div>`;
    return;
  }
  lowerWorkspace.innerHTML = `
    <div class="axis-summary-rail">
      ${AXIS_IDS.map((axis) => {
        const changed = active.start[axis] !== active.end[axis];
        return `<button type="button" class="axis-summary ${changed ? 'is-changed' : ''} ${active.locks[axis] ? 'is-locked' : ''}" data-action="open-axis" data-axis="${axis}">
          <span>${AXES[axis].index}</span><strong>${AXES[axis].short}</strong><small>${escapeHTML(optionLabel(axis, active.start[axis]))}${changed ? ` → ${escapeHTML(optionLabel(axis, active.end[axis]))}` : ''}</small>${active.locks[axis] ? '<b>LOCK</b>' : ''}
        </button>`;
      }).join('')}
    </div>`;
}

function renderSequenceLower() {
  const current = project();
  const duration = Math.max(1, sequenceDurationFrames(current));
  const summary = timelineSummary(current);
  if (ui.sequenceView === 'simple') {
    lowerWorkspace.innerHTML = `
      <div class="sequence-toolbar">
        <div class="segmented-control">
          <button type="button" data-action="sequence-view" data-view="simple" class="is-active">Simple</button>
          <button type="button" data-action="sequence-view" data-view="timeline">Timeline</button>
        </div>
        <div class="sequence-facts"><span>${summary.clips} clips</span><span>${summary.durationFrames} frames</span><span>${formatTime(summary.durationFrames, current.settings.fps)}</span></div>
        <button class="button button-ghost button-small" type="button" data-action="add-marker">+ Marker</button>
      </div>
      <div class="simple-sequence-strip" data-simple-strip>
        ${[...current.sequence.clips].sort((a, b) => a.startFrame - b.startFrame).map((clip, index) => {
          const clipSource = clipShot(current, clip);
          return `<article class="sequence-clip ${clip.id === current.sequence.activeClipId ? 'is-selected' : ''}" data-clip-id="${clip.id}">
            <button class="clip-main" type="button" data-action="select-clip" data-clip-id="${clip.id}">
              <span class="clip-number">${String(index + 1).padStart(2, '0')}</span>
              <span class="clip-copy"><strong>${escapeHTML(clip.name)}</strong><small>${escapeHTML(getFamily(clipSource?.familyId).label)} · ${clip.durationFrames}f · ${clip.linked === false ? 'Detached' : 'Linked'}</small></span>
              <span class="clip-delta">Δ ${clipSource?.deltaCount ?? 0}</span>
            </button>
            <div class="clip-actions">
              <button type="button" data-action="reorder-clip" data-direction="-1" data-clip-id="${clip.id}" ${index === 0 ? 'disabled' : ''}>‹</button>
              <button type="button" data-action="reorder-clip" data-direction="1" data-clip-id="${clip.id}" ${index === current.sequence.clips.length - 1 ? 'disabled' : ''}>›</button>
            </div>
          </article>`;
        }).join('') || `<div class="empty-workspace"><span class="eyebrow copper">NO CLIPS YET</span><h3>Build a cinematic curve.</h3><p>Select a preset in the Library, preview its ghost plan, then build it as linked Shots and clips.</p></div>`}
        <button class="add-shot-tile" type="button" data-action="add-active-shot-to-sequence">${icon('plus')}<span>Add active Shot</span></button>
      </div>`;
    return;
  }

  const zoom = current.sequence.zoom || 1;
  const pxPerFrame = Math.max(0.7, Math.min(4.2, (lowerWorkspace.clientWidth || 900) / Math.max(220, duration) * zoom));
  const width = Math.max(lowerWorkspace.clientWidth || 900, duration * pxPerFrame + 160);
  const trackRows = current.sequence.tracks;
  lowerWorkspace.innerHTML = `
    <div class="sequence-toolbar timeline-toolbar">
      <div class="segmented-control">
        <button type="button" data-action="sequence-view" data-view="simple">Simple</button>
        <button type="button" data-action="sequence-view" data-view="timeline" class="is-active">Timeline</button>
      </div>
      <div class="timeline-tools" role="group" aria-label="Timeline tools">
        ${['select', 'blade', 'slip'].map((tool) => `<button type="button" data-action="timeline-tool" data-tool="${tool}" class="${workspacePreferences.timelineTool === tool ? 'is-active' : ''}">${tool === 'select' ? '↖' : tool === 'blade' ? '✂' : '↔'}<span>${tool}</span></button>`).join('')}
        <button type="button" data-action="snap-toggle" class="${workspacePreferences.snapEnabled ? 'is-active' : ''}">⌁<span>snap</span></button>
        <button type="button" data-action="add-marker">◆<span>marker</span></button>
      </div>
      <label class="zoom-control"><span>ZOOM</span><input type="range" min="0.25" max="4" step="0.05" value="${zoom}" data-input="timeline-zoom"></label>
    </div>
    <div class="timeline-shell" data-timeline-shell data-px-per-frame="${pxPerFrame}" data-duration="${duration}">
      <div class="track-labels">
        ${trackRows.map((track) => `<div class="track-label"><strong>${escapeHTML(track.label)}</strong><span><button type="button" data-action="track-visible" data-track-id="${track.id}">${track.visible ? '◉' : '○'}</button><button type="button" data-action="track-lock" data-track-id="${track.id}">${track.locked ? '▣' : '□'}</button></span></div>`).join('')}
      </div>
      <div class="timeline-scroll" data-timeline-scroll>
        <div class="timeline-canvas" style="width:${width}px" data-timeline-canvas>
          <div class="timeline-ruler" data-action="timeline-seek">
            ${Array.from({ length: Math.ceil(duration / 24) + 1 }, (_, index) => `<i style="left:${index * 24 * pxPerFrame}px"><span>${index}s</span></i>`).join('')}
          </div>
          ${current.sequence.markers.map((marker) => `<button type="button" class="timeline-marker" style="left:${marker.frame * pxPerFrame}px" data-action="remove-marker" data-marker-id="${marker.id}" title="${escapeHTML(marker.label)} · ${marker.frame}f">◆</button>`).join('')}
          <div class="timeline-playhead" style="left:${ui.playerState.frame * pxPerFrame}px"><span></span></div>
          ${trackRows.map((track, rowIndex) => `<div class="timeline-track ${track.visible ? '' : 'is-hidden'} ${track.locked ? 'is-locked' : ''}" style="top:${32 + rowIndex * 46}px" data-track-id="${track.id}" data-action="timeline-seek"></div>`).join('')}
          ${current.sequence.clips.map((clip) => {
            const rowIndex = Math.max(0, trackRows.findIndex((track) => track.id === clip.trackId));
            const source = clipShot(current, clip);
            return `<article class="timeline-clip ${clip.id === current.sequence.activeClipId ? 'is-selected' : ''}" data-clip-id="${clip.id}" style="left:${clip.startFrame * pxPerFrame}px;top:${35 + rowIndex * 46}px;width:${Math.max(30, clip.durationFrames * pxPerFrame)}px">
              <button class="trim-handle left" type="button" data-timeline-handle="left" data-clip-id="${clip.id}" aria-label="Trim clip start"></button>
              <button class="timeline-clip-main" type="button" data-action="timeline-clip" data-clip-id="${clip.id}"><strong>${escapeHTML(clip.name)}</strong><small>${clip.durationFrames}f · Δ ${source?.deltaCount ?? 0}</small></button>
              <button class="trim-handle right" type="button" data-timeline-handle="right" data-clip-id="${clip.id}" aria-label="Trim clip end"></button>
            </article>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function renderInspector() {
  inspectorPanel.hidden = workspacePreferences.inspectorCollapsed;
  if (ui.mode === 'world') renderWorldInspector();
  else if (ui.mode === 'shot') renderShotInspector();
  else renderSequenceInspector();
}

function worldTab(id, label) {
  return `<button type="button" class="${ui.selectedWorldTab === id ? 'is-active' : ''}" data-action="world-tab" data-tab="${id}">${label}</button>`;
}

function vectorField(label, key, values, step = 0.01) {
  return `<div class="vector-field"><span>${escapeHTML(label)}</span><div>${['X', 'Y', 'Z'].map((axis, index) => `<label><b>${axis}</b><input type="number" step="${step}" value="${formatNumber(values[index], 3)}" data-vector="${key}" data-index="${index}"></label>`).join('')}</div></div>`;
}

function rangeField(label, key, value, min, max, step, suffix = '') {
  const normalized = (Number(value) - min) / Math.max(0.0001, max - min);
  return `<label class="inspector-range"><span><b>${escapeHTML(label)}</b><output>${formatNumber(value, step < 0.1 ? 2 : 1)}${suffix}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${key}" style="--value:${clamp(normalized) * 100}%"></label>`;
}

function toggleRow(label, description, key, checked) {
  return `<div class="toggle-row"><div><strong>${escapeHTML(label)}</strong><small>${escapeHTML(description)}</small></div><button type="button" class="switch ${checked ? 'is-on' : ''}" data-action="toggle-setting" data-setting="${key}" aria-pressed="${checked}"><span></span></button></div>`;
}

function renderWorldInspector() {
  const current = project();
  const node = sceneNode();
  const record = node?.assetId ? current.assets.byId[node.assetId] : null;
  let content = '';
  if (ui.selectedWorldTab === 'transform') {
    content = node ? `
      <section class="inspector-section object-identity">
        <span class="role-glyph large">${roleGlyph(node.role)}</span><div><span class="eyebrow copper">${escapeHTML(node.role)}</span><h3>${escapeHTML(node.name)}</h3><small>${record?.stats ? `${record.stats.meshes} meshes · ${record.stats.triangles.toLocaleString()} tris` : record?.status || 'Scene node'}</small></div>
      </section>
      <section class="inspector-section">
        <div class="section-title-row"><span>TRANSFORM</span><small>${workspacePreferences.transformSpace.toUpperCase()}</small></div>
        ${vectorField('Position', 'position', node.transform.position, 0.01)}
        ${vectorField('Rotation', 'rotation', node.transform.rotation, 1)}
        ${vectorField('Scale', 'scale', node.transform.scale, 0.01)}
        <div class="inline-actions"><button type="button" data-action="ground-selected">Ground</button><button type="button" data-action="frame-selected">Frame</button><button type="button" data-action="reset-transform">Reset all</button></div>
      </section>
      <section class="inspector-section">
        <div class="section-title-row"><span>PIVOT</span><small>PRESERVES GEOMETRY</small></div>
        ${vectorField('Pivot', 'pivot', node.pivot.position, 0.01)}
        <button class="button button-ghost button-wide" type="button" data-action="reset-pivot">Reset pivot</button>
      </section>
      <section class="inspector-section danger-zone">
        ${node.role === 'hero' ? '<small>The Hero cannot be removed. Replace it after validation instead.</small>' : `<button class="text-action danger" type="button" data-action="remove-node" data-node-id="${node.id}">Remove ${escapeHTML(node.name)}</button>`}
      </section>` : `<div class="empty-inspector"><h3>Select an object</h3><p>Choose a Hero, background, or asset in the Viewport or Outliner.</p></div>`;
  } else if (ui.selectedWorldTab === 'world') {
    content = `
      <section class="inspector-section">
        <div class="section-title-row"><span>BACKGROUND / STAGE</span><small>Y = 0</small></div>
        <div class="preset-grid stage-grid">
          ${Object.values(STAGE_PRESETS).map((stage) => `<button type="button" class="preset-tile ${current.world.stagePresetId === stage.id ? 'is-active' : ''}" data-action="stage-preset" data-preset-id="${stage.id}"><span class="stage-swatch stage-${stage.id}"></span><strong>${escapeHTML(stage.label)}</strong></button>`).join('')}
        </div>
        ${rangeField('Stage size', 'world.stageScale', current.world.stageScale, 0.5, 3, 0.05, '×')}
      </section>
      <section class="inspector-section">
        <div class="section-title-row"><span>HDRI</span><small>${current.world.hdriAssetId ? 'LOADED' : 'OPTIONAL'}</small></div>
        ${current.world.hdriAssetId ? `
          <div class="asset-summary compact"><span class="asset-thumbnail">HDR</span><div><strong>${escapeHTML(current.assets.byId[current.world.hdriAssetId]?.name || 'Environment')}</strong><small>${current.assets.byId[current.world.hdriAssetId]?.stats ? `${current.assets.byId[current.world.hdriAssetId].stats.width}×${current.assets.byId[current.world.hdriAssetId].stats.height}` : 'Radiance map'}</small></div></div>
          ${toggleRow('Visible background', 'Keep cyclorama visible while HDRI lights the Hero.', 'world.hdri.visible', current.world.hdri.visible)}
          ${rangeField('Intensity', 'world.hdri.intensity', current.world.hdri.intensity, 0, 2, 0.01)}
          ${rangeField('Reflections', 'world.hdri.reflectionIntensity', current.world.hdri.reflectionIntensity, 0, 2, 0.01)}
          ${rangeField('Rotation', 'world.hdri.rotationY', current.world.hdri.rotationY, -180, 180, 1, '°')}
          ${rangeField('Blur', 'world.hdri.blur', current.world.hdri.blur, 0, 1, 0.01)}
        ` : '<p class="inspector-copy">Load a Radiance .hdr to add PBR environment reflections. The Dark Grey Cyclorama remains the safe fallback.</p>'}
        <button class="button button-ghost button-wide" type="button" data-action="import-hdri">${current.world.hdriAssetId ? 'Replace HDRI' : 'Load HDRI'}</button>
      </section>`;
  } else if (ui.selectedWorldTab === 'lighting') {
    content = `
      <section class="inspector-section">
        <div class="section-title-row"><span>CURATED RIGS</span><small>MANAGED IDS</small></div>
        <div class="lighting-list">
          ${LIGHTING_PRESET_ORDER.map((id) => `<button type="button" class="lighting-preset ${current.world.lightingPresetId === id ? 'is-active' : ''}" data-action="lighting-preset" data-preset-id="${id}"><span class="light-diagram"><i></i><i></i><i></i></span><strong>${escapeHTML(getLightingPreset(id).label)}</strong></button>`).join('')}
        </div>
      </section>
      <section class="inspector-section">
        ${rangeField('Master intensity', 'world.lighting.masterIntensity', current.world.lighting.masterIntensity, 0, 2, 0.01)}
        ${rangeField('Temperature', 'world.lighting.temperature', current.world.lighting.temperature, -1, 1, 0.01)}
        ${rangeField('Tint', 'world.lighting.tint', current.world.lighting.tint, -1, 1, 0.01)}
        ${rangeField('Contrast ratio', 'world.lighting.contrastRatio', current.world.lighting.contrastRatio, 0, 1, 0.01)}
        ${rangeField('Rim strength', 'world.lighting.rimStrength', current.world.lighting.rimStrength, 0, 2, 0.01)}
        ${rangeField('Shadow softness', 'world.lighting.shadowSoftness', current.world.lighting.shadowSoftness, 0, 1, 0.01)}
        ${rangeField('HDRI contribution', 'world.lighting.hdriContribution', current.world.lighting.hdriContribution, 0, 1.5, 0.01)}
        ${toggleRow('Contact shadows', 'Calibrated floor contact for the active stage.', 'world.lighting.shadows', current.world.lighting.shadows)}
      </section>
      <section class="inspector-section managed-lights">
        <div class="section-title-row"><span>MANAGED LIGHTS</span><small>FUTURE-READY IDS</small></div>
        ${Object.values(current.world.lights).map((light) => `<div class="managed-light-row"><span class="status-dot ${light.enabled ? 'is-live' : ''}"></span><strong>${escapeHTML(light.id)}</strong><small>${light.enabled ? formatNumber(light.intensity, 2) : 'off'}</small></div>`).join('')}
      </section>`;
  } else {
    const post = current.world.post;
    content = `
      <section class="inspector-section">
        ${toggleRow('Effect bypass', 'Show the clean Render pipeline without DOF, bloom, grain, or procedural atmosphere.', 'world.post.bypass', post.bypass)}
        ${toggleRow('Preview FX in Viewport', 'Render the post stack while inspecting the scene.', 'world.post.previewFx', post.previewFx)}
        ${rangeField('Exposure', 'world.post.exposure', post.exposure, 0.25, 2.5, 0.01)}
        ${rangeField('Contrast', 'world.post.contrast', post.contrast, 0.5, 1.8, 0.01)}
        ${rangeField('Saturation', 'world.post.saturation', post.saturation, 0, 1.8, 0.01)}
        ${rangeField('Warmth', 'world.post.warmth', post.warmth, -1, 1, 0.01)}
        ${rangeField('Tint', 'world.post.tint', post.tint, -1, 1, 0.01)}
        ${rangeField('Bloom', 'world.post.bloom', post.bloom, 0, 1, 0.01)}
        ${rangeField('Vignette', 'world.post.vignette', post.vignette, 0, 0.8, 0.01)}
        ${toggleRow('Film grain', 'Subtle deterministic finishing texture.', 'world.post.grain', post.grain)}
      </section>
      <section class="inspector-section dof-section">
        <div class="section-title-row"><span>DEPTH OF FIELD / BOKEH</span><small>CLICK RENDER TO FOCUS</small></div>
        ${toggleRow('Depth of field', 'Use semantic Focus or the picked surface point.', 'world.post.dof.enabled', post.dof.enabled)}
        ${rangeField('Focus distance', 'world.post.dof.focusDistance', post.dof.focusDistance, 0, 1, 0.001)}
        ${rangeField('Aperture / blur', 'world.post.dof.aperture', post.dof.aperture, 0, 1, 0.005)}
        ${rangeField('Focal range', 'world.post.dof.focalRange', post.dof.focalRange, 0.01, 1, 0.005)}
        ${rangeField('Bokeh strength', 'world.post.dof.bokehStrength', post.dof.bokehStrength, 0, 1, 0.01)}
        <button class="button button-ghost button-wide" type="button" data-action="center-focus">Focus center</button>
      </section>`;
  }

  inspectorPanel.innerHTML = `
    ${panelHeader('WORLD INSPECTOR', node?.name || 'Scene', `<button class="panel-collapse right" type="button" data-action="collapse-inspector" aria-label="Collapse Inspector">›</button>`)}
    <div class="inspector-tabs">${worldTab('transform', 'Transform')}${worldTab('world', 'World')}${worldTab('lighting', 'Light')}${worldTab('post', 'Post')}</div>
    <div class="panel-scroll inspector-scroll">${content}</div>`;
}

function renderShotInspector() {
  if (ui.shotSubview === 'matrix') renderMatrixInspector();
  else renderDirectorInspector();
}

function renderDirectorInspector() {
  const active = shot();
  const capability = deltaCapability(active, active.familyId);
  const family = getFamily(active.familyId);
  const presets = presetsForFamily(active.familyId);
  const changed = changedAxes(active);
  inspectorPanel.innerHTML = `
    ${panelHeader('SHOT DIRECTOR', active.name, `<button class="panel-collapse right" type="button" data-action="collapse-inspector">›</button>`)}
    <div class="panel-scroll inspector-scroll">
      <section class="inspector-section director-hero">
        <span class="eyebrow copper">${escapeHTML(family.label)} FAMILY</span>
        <h3>${escapeHTML(active.name)}</h3>
        <p>${escapeHTML(getPreset(active.presetId).description || family.description || 'A semantic cinematic recipe evaluated against the mounted Hero.')}</p>
      </section>
      <section class="inspector-section">
        <div class="section-title-row"><span>VISUAL PRESETS</span><small>${presets.length} RECIPES</small></div>
        <div class="director-preset-grid">
          ${presets.map((preset) => `<button type="button" class="director-preset ${active.presetId === preset.id ? 'is-active' : ''}" data-action="shot-preset" data-preset-id="${preset.id}"><span>${escapeHTML(preset.eyebrow || preset.familyId.toUpperCase())}</span><strong>${escapeHTML(preset.label)}</strong><small>Δ ${preset.deltaCount}</small></button>`).join('')}
        </div>
      </section>
      <section class="inspector-section delta-section">
        <div class="delta-heading"><div><span class="eyebrow copper">SEMANTIC DELTA</span><h3>${active.deltaCount}</h3></div><div><strong>${changed.length} / 11</strong><small>${active.deltaCount >= 9 ? 'WILD' : active.deltaCount >= 6 ? 'EXPRESSIVE' : 'CONTROLLED'}</small></div></div>
        <input class="delta-range" type="range" min="0" max="11" step="1" value="${active.deltaCount}" data-input="delta" style="--value:${active.deltaCount / 11 * 100}%" aria-label="Semantic Delta count">
        <div class="delta-ticks">${Array.from({ length: 12 }, (_, index) => `<span class="${index === active.deltaCount ? 'is-active' : ''}">${index}</span>`).join('')}</div>
        <p class="control-note">Achievable range with current locks and exclusions: ${capability.minimum}–${capability.maximum}.</p>
        <div class="generation-actions">
          <button class="button button-ghost" type="button" data-action="generate" data-kind="random">${icon('random')}<span>Random</span></button>
          <button class="button button-primary" type="button" data-action="generate" data-kind="variant">${icon('variant')}<span>Variant</span></button>
        </div>
      </section>
      <section class="inspector-section">
        <div class="section-title-row"><span>ACTIVE CHANGES</span><button class="micro-action" type="button" data-action="shot-subview" data-view="matrix">OPEN MATRIX</button></div>
        <div class="change-ledger">
          ${AXIS_IDS.map((axis) => {
            const isChanged = active.start[axis] !== active.end[axis];
            return `<button type="button" class="change-row ${isChanged ? 'is-changed' : ''}" data-action="open-axis" data-axis="${axis}"><span>${AXES[axis].index}</span><strong>${AXES[axis].label}</strong><small>${escapeHTML(optionLabel(axis, active.start[axis]))}${isChanged ? ` → ${escapeHTML(optionLabel(axis, active.end[axis]))}` : ''}</small><b>${active.locks[axis] ? 'LOCK' : isChanged ? 'Δ' : '—'}</b></button>`;
          }).join('')}
        </div>
      </section>
      <section class="inspector-section sticky-action-zone">
        <button class="button button-primary button-wide" type="button" data-action="add-active-shot-to-sequence">${icon('plus')}<span>Add Shot to Sequence</span></button>
      </section>
    </div>`;
}

function matrixCategory(axisId) {
  const active = shot();
  const axis = AXES[axisId];
  return `<section class="matrix-category" data-axis-category="${axisId}">
    <header>
      <span class="axis-index">${axis.index}</span>
      <div><strong>${escapeHTML(axis.label)}</strong><small>${escapeHTML(axis.description)}</small></div>
      <button type="button" class="lock-button ${active.locks[axisId] ? 'is-active' : ''}" data-action="axis-lock" data-axis="${axisId}" title="Lock axis">${active.locks[axisId] ? icon('lock') : icon('unlock')}</button>
    </header>
    <div class="matrix-current">
      <span class="start-value"><b>START</b>${escapeHTML(optionLabel(axisId, active.start[axisId]))}</span>
      <span class="end-value"><b>END</b>${escapeHTML(optionLabel(axisId, active.end[axisId]))}</span>
    </div>
    <div class="matrix-options">
      ${axisOptions(axisId).map(([value, label, meta]) => {
        const start = active.start[axisId] === value;
        const end = active.end[axisId] === value;
        const excluded = !!active.exclusions[`${axisId}:${value}`];
        return `<div class="matrix-option ${start ? 'is-start' : ''} ${end ? 'is-end' : ''} ${start && end ? 'is-both' : ''} ${excluded ? 'is-excluded' : ''}" title="${escapeHTML(meta?.hint || label)}">
          <span class="option-label">${escapeHTML(label)}</span>
          <span class="side-actions">
            ${axisSides.map((side) => `<button type="button" class="side-${side}" data-action="axis-assign" data-axis="${axisId}" data-value="${value}" data-side="${side}" aria-label="Assign ${label} to ${side}">${side === 'start' ? 'S' : side === 'end' ? 'E' : 'B'}</button>`).join('')}
            <button type="button" class="exclude-option" data-action="axis-exclude" data-axis="${axisId}" data-value="${value}" aria-label="${excluded ? 'Restore' : 'Exclude'} ${label}">${excluded ? '+' : '−'}</button>
          </span>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

function renderMatrixInspector() {
  const active = shot();
  inspectorPanel.innerHTML = `
    ${panelHeader('FULL SEMANTIC MATRIX', active.name, `<div class="matrix-head-actions"><button type="button" class="micro-action" data-action="shot-subview" data-view="director">DIRECTOR</button><button class="panel-collapse right" type="button" data-action="collapse-inspector">›</button></div>`)}
    <div class="matrix-toolbar">
      <div class="matrix-delta-control">
        <span>Δ ${active.deltaCount}</span>
        <input class="delta-range" type="range" min="0" max="11" step="1" value="${active.deltaCount}" data-input="delta" style="--value:${active.deltaCount / 11 * 100}%" aria-label="Semantic Delta count">
        <small>${changedAxes(active).length} CHANGED · ${Object.values(active.locks).filter(Boolean).length} LOCKED</small>
      </div>
      <button class="button button-ghost button-small" type="button" data-action="generate" data-kind="random">Random</button>
      <button class="button button-primary button-small" type="button" data-action="generate" data-kind="variant">Variant</button>
    </div>
    <div class="panel-scroll matrix-scroll">
      <div class="semantic-matrix">
        <div class="matrix-column">${['light', 'camera', 'lens', 'focus', 'composition', 'scale'].map(matrixCategory).join('')}</div>
        <div class="matrix-column">${['rotation', 'view', 'motion', 'environment', 'atmosphere'].map(matrixCategory).join('')}</div>
      </div>
    </div>`;
}

function renderSequenceInspector() {
  const current = project();
  const clip = activeClip();
  const source = activeClipShot();
  const summary = timelineSummary(current);
  let content;
  if (!clip) {
    content = `
      <section class="inspector-section sequence-overview">
        <span class="eyebrow copper">SEQUENCE</span><h3>${escapeHTML(current.sequence.name)}</h3>
        <dl><div><dt>Total duration</dt><dd>${summary.durationFrames}f · ${formatTime(summary.durationFrames, current.settings.fps)}</dd></div><div><dt>FPS</dt><dd>${current.settings.fps}</dd></div><div><dt>Aspect</dt><dd>${escapeHTML(current.settings.aspect)}</dd></div><div><dt>Preview</dt><dd>${escapeHTML(current.settings.previewQuality)}</dd></div></dl>
      </section>
      <section class="inspector-section"><p class="inspector-copy">Select a clip to edit its duration, source, speed, easing, and Shot relationship.</p></section>`;
  } else {
    content = `
      <section class="inspector-section clip-identity">
        <span class="clip-number large">${String(current.sequence.clips.indexOf(clip) + 1).padStart(2, '0')}</span>
        <div><span class="eyebrow copper">${clip.linked === false ? 'DETACHED CLIP' : 'LINKED SHOT CLIP'}</span><h3>${escapeHTML(clip.name)}</h3><small>${escapeHTML(getFamily(source?.familyId).label)} · Δ ${source?.deltaCount ?? 0}</small></div>
      </section>
      <section class="inspector-section">
        <label class="text-field"><span>Clip name</span><input type="text" value="${escapeHTML(clip.name)}" data-text="clip.name"></label>
        <div class="number-grid two">
          <label><span>Start frame</span><input type="number" min="0" step="1" value="${clip.startFrame}" data-number="clip.startFrame"></label>
          <label><span>Duration</span><input type="number" min="1" step="1" value="${clip.durationFrames}" data-number="clip.durationFrames"></label>
          <label><span>Source in</span><input type="number" min="0" step="1" value="${clip.sourceOffsetFrames}" data-number="clip.sourceOffsetFrames"></label>
          <label><span>Speed</span><input type="number" min="0.05" max="8" step="0.05" value="${clip.speed}" data-number="clip.speed"></label>
        </div>
        <label class="select-field"><span>Easing</span><select data-select="clip.easing">${['linear', 'ease-in', 'ease-out', 'ease-in-out'].map((value) => `<option value="${value}" ${clip.easing === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      </section>
      <section class="inspector-section">
        <div class="section-title-row"><span>SOURCE SHOT</span><small>${clip.linked === false ? 'INDEPENDENT' : 'LIVE LINK'}</small></div>
        <div class="source-shot-card"><strong>${escapeHTML(source?.name || 'Missing Shot')}</strong><small>${escapeHTML(optionLabel('view', source?.start?.view))} → ${escapeHTML(optionLabel('view', source?.end?.view))}</small></div>
        <button class="button button-primary button-wide" type="button" data-action="open-clip-shot" data-clip-id="${clip.id}">Open in Shot</button>
        <div class="inline-actions">
          <button type="button" data-action="${clip.linked === false ? 'relink-clip' : 'detach-clip'}" data-clip-id="${clip.id}">${clip.linked === false ? 'Relink' : 'Detach'}</button>
          <button type="button" data-action="duplicate-clip" data-clip-id="${clip.id}">Duplicate</button>
          <button type="button" class="danger" data-action="delete-clip" data-clip-id="${clip.id}">Delete</button>
        </div>
      </section>
      <section class="inspector-section clip-preview-ledger">
        <div><span>Start</span><strong>${escapeHTML(optionLabel('light', source?.start?.light))}</strong><small>${escapeHTML(optionLabel('lens', source?.start?.lens))} · ${escapeHTML(optionLabel('focus', source?.start?.focus))}</small></div>
        <div><span>End</span><strong>${escapeHTML(optionLabel('light', source?.end?.light))}</strong><small>${escapeHTML(optionLabel('lens', source?.end?.lens))} · ${escapeHTML(optionLabel('focus', source?.end?.focus))}</small></div>
      </section>`;
  }
  inspectorPanel.innerHTML = `
    ${panelHeader('SEQUENCE INSPECTOR', clip?.name || current.sequence.name, `<button class="panel-collapse right" type="button" data-action="collapse-inspector">›</button>`)}
    <div class="panel-scroll inspector-scroll">${content}</div>`;
}


function compactWorkspace() {
  return matchMedia('(max-width: 899px)').matches;
}

function mobileSheetLabel(kind) {
  if (kind === 'left') {
    if (ui.mode === 'world') return 'Scene & Library';
    if (ui.mode === 'shot') return ui.shotSubview === 'matrix' ? 'Shot Library' : 'Direction';
    return 'Sequence Library';
  }
  if (ui.mode === 'world') return 'World Inspector';
  if (ui.mode === 'shot') return ui.shotSubview === 'matrix' ? 'Semantic Matrix' : 'Shot Inspector';
  return 'Sequence Inspector';
}

function renderMobileSheet() {
  if (!compactWorkspace() || !ui.mobileSheet) {
    mobileSheet.hidden = true;
    mobileSheet.innerHTML = '';
    return;
  }
  const source = ui.mobileSheet === 'left' ? leftPanel : inspectorPanel;
  mobileSheet.hidden = false;
  mobileSheet.dataset.kind = ui.mobileSheet;
  mobileSheet.innerHTML = `
    <button class="mobile-sheet-backdrop" type="button" data-action="close-mobile-sheet" aria-label="Close controls"></button>
    <article class="mobile-sheet-card" role="dialog" aria-modal="true" aria-label="${escapeHTML(mobileSheetLabel(ui.mobileSheet))}">
      <header class="mobile-sheet-header">
        <div><span class="eyebrow copper">${ui.mode.toUpperCase()}</span><h2>${escapeHTML(mobileSheetLabel(ui.mobileSheet))}</h2></div>
        <div class="mobile-sheet-history">
          <button type="button" data-action="undo" aria-label="Undo" ${store.canUndo() ? '' : 'disabled'}>↶</button>
          <button type="button" data-action="redo" aria-label="Redo" ${store.canRedo() ? '' : 'disabled'}>↷</button>
          <button type="button" data-action="close-mobile-sheet" aria-label="Close">×</button>
        </div>
      </header>
      <div class="mobile-sheet-body">${source.innerHTML}</div>
    </article>`;
}

function renderPreferences() {
  preferencesSheet.hidden = !ui.preferencesOpen;
  if (!ui.preferencesOpen) { preferencesSheet.innerHTML = ''; return; }
  const debug = renderer.getDebugState();
  preferencesSheet.innerHTML = `
    <div class="preferences-backdrop" data-action="close-preferences"></div>
    <div class="preferences-card">
      <header><div><span class="eyebrow copper">WORKSPACE</span><h2>Preferences & diagnostics</h2></div><button type="button" data-action="close-preferences">×</button></header>
      <section>
        <div class="section-title-row"><span>LAYOUT</span><small>USER PREFERENCE · NOT PROJECT DATA</small></div>
        ${toggleRow('Left panel', 'Outliner, family rail, or preset library.', 'workspace.leftPanel', !workspacePreferences.leftPanelCollapsed)}
        ${toggleRow('Inspector', 'Contextual scene, Shot, or clip properties.', 'workspace.inspector', !workspacePreferences.inspectorCollapsed)}
        ${toggleRow('Viewport guides', 'Thirds, center, and safe composition guides.', 'workspace.guides', workspacePreferences.guides)}
        <label class="select-field"><span>Viewport shading</span><select data-select="workspace.viewportShading"><option value="shaded" ${workspacePreferences.viewportShading === 'shaded' ? 'selected' : ''}>Shaded</option><option value="unlit" ${workspacePreferences.viewportShading === 'unlit' ? 'selected' : ''}>Unlit</option></select></label>
        <label class="select-field"><span>Preview quality</span><select data-select="settings.previewQuality">${['performance', 'balanced', 'quality'].map((value) => `<option value="${value}" ${project().settings.previewQuality === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      </section>
      <section class="runtime-diagnostics">
        <div class="section-title-row"><span>LIVE ARCHITECTURE</span><small>PRODUCTION RENDERER</small></div>
        <dl>
          <div><dt>Canvas / context</dt><dd>1 / ${debug.contextCount}</dd></div>
          <div><dt>Renderer</dt><dd>1</dd></div>
          <div><dt>Hero decode count</dt><dd>${ui.decodeCount}</dd></div>
          <div><dt>Hero mount count</dt><dd>${debug.heroMountCount}</dd></div>
          <div><dt>Scene assets</dt><dd>${debug.assetCount}</dd></div>
          <div><dt>GPU resources</dt><dd>${debug.gpuResourceCount}</dd></div>
          <div><dt>Scissor regions</dt><dd>${debug.scissorRegions.length}</dd></div>
          <div><dt>Frame time</dt><dd>${debug.frameTimeMs} ms</dd></div>
          <div><dt>Clock drift</dt><dd>${formatNumber(ui.playerState.driftFrames, 3)} f</dd></div>
        </dl>
      </section>
      <section class="capability-grid">
        ${Object.entries(CAPABILITIES).map(([id, enabled]) => `<span class="${enabled ? 'is-ready' : 'is-future'}"><b>${enabled ? '✓' : '—'}</b>${escapeHTML(id)}</span>`).join('')}
      </section>
      <footer>
        <button class="button button-ghost" type="button" data-action="reset-workspace">Reset workspace layout</button>
        <button class="text-action danger" type="button" data-action="reset-project">Reset project and local assets</button>
      </footer>
    </div>`;
}

function setPath(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) cursor = cursor[parts[index]];
  cursor[parts.at(-1)] = value;
}

function numberForInput(input) {
  const numeric = Number(input.value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function switchMode(mode, { preserveDisplay = false } = {}) {
  if (!['world', 'shot', 'sequence'].includes(mode)) return;
  ui.mode = mode;
  ui.mobileSheet = null;
  if (!preserveDisplay && mode === 'world' && ui.displayByMode.world === 'render') ui.displayByMode.world = 'viewport';
  player.setMode(mode === 'sequence' ? 'sequence' : 'shot', { preservePosition: false });
  persistWorkspacePreferences();
  renderAll();
}

function setDisplayMode(mode) {
  if (!['render', 'viewport', 'split'].includes(mode)) return;
  if (mode === 'split' && matchMedia('(max-width: 899px) and (orientation: portrait)').matches) {
    toast('Split is available in landscape on compact workspaces.', 'warning');
    return;
  }
  ui.displayByMode[ui.mode] = mode;
  workspacePreferences.displayMode = mode;
  persistWorkspacePreferences();
  renderAll();
}

function selectShot(shotId) {
  if (!project().shots.byId[shotId]) return;
  store.commit('Select Shot', (draft) => { draft.shots.activeId = shotId; }, { history: false });
  ui.selectedFamilyId = project().shots.byId[shotId].familyId;
  player.setMode('shot');
  player.goStart();
}

function applyPreset(presetId) {
  const current = shot();
  const replacement = makeShotFromPreset(presetId, { id: current.id, name: getPreset(presetId).label, seed: current.seed });
  replacement.locks = { ...current.locks };
  replacement.exclusions = { ...current.exclusions };
  store.commit(`Apply ${replacement.name} preset`, (draft) => { draft.shots.byId[current.id] = replacement; });
  ui.selectedFamilyId = replacement.familyId;
  player.goStart();
}

function generate(kind) {
  const active = shot();
  const result = generateShot({ shot: active, kind, requestedDelta: active.deltaCount, seed: active.seed });
  store.commit(`${kind === 'random' ? 'Random' : 'Variant'} generation`, (draft) => { draft.shots.byId[active.id] = result.shot; });
  toast(`${kind === 'random' ? 'Random' : 'Variant'} · ${result.report.resolved} semantic changes · ${result.report.risk}`, 'success');
}

function addActiveShotToSequence() {
  const active = shot();
  store.commit('Add Shot to Sequence', (draft) => {
    addShotClip(draft, active.id, { startFrame: nextClipStart(draft), durationFrames: active.durationFrames, compact: false });
  });
  toast(`${active.name} linked to the sequence.`, 'success');
}

function handleAction(button, event) {
  const action = button.dataset.action;
  if (!action) return;
  if (action === 'mode') return switchMode(button.dataset.mode);
  if (action === 'display') return setDisplayMode(button.dataset.display);
  if (action === 'undo') { if (store.undo()) player.refresh(); return; }
  if (action === 'redo') { if (store.redo()) player.refresh(); return; }
  if (action === 'preferences') { ui.preferencesOpen = true; renderPreferences(); return; }
  if (action === 'mobile-library') { ui.mobileSheet = ui.mobileSheet === 'left' ? null : 'left'; renderMobileSheet(); return; }
  if (action === 'mobile-inspector') { ui.mobileSheet = ui.mobileSheet === 'inspector' ? null : 'inspector'; renderMobileSheet(); return; }
  if (action === 'close-mobile-sheet') { ui.mobileSheet = null; renderMobileSheet(); return; }
  if (action === 'close-preferences') { ui.preferencesOpen = false; renderPreferences(); return; }
  if (action === 'collapse-left') { workspacePreferences.leftPanelCollapsed = true; persistWorkspacePreferences(); return renderAll(); }
  if (action === 'collapse-inspector') { workspacePreferences.inspectorCollapsed = true; persistWorkspacePreferences(); return renderAll(); }
  if (action === 'transport-loop') { player.toggleLoop(); return; }
  if (action === 'transport-start') { player.goStart(); return; }
  if (action === 'transport-end') { player.goEnd(); return; }
  if (action === 'transport-play') { player.toggle(); return; }
  if (action === 'fullscreen') {
    const card = $('#playerCard');
    if (document.fullscreenElement) document.exitFullscreen(); else card?.requestFullscreen?.();
    return;
  }
  if (action === 'frame-selected') { const node = sceneNode(); if (node) renderer.frameNode(node.id); return; }
  if (action === 'viewport-tool') {
    workspacePreferences.viewportTool = button.dataset.tool;
    persistWorkspacePreferences(); renderViewportDock(); renderer.setWorkspace(workspaceState()); return;
  }
  if (action === 'transform-space') {
    workspacePreferences.transformSpace = workspacePreferences.transformSpace === 'world' ? 'local' : 'world';
    persistWorkspacePreferences(); renderAll(); return;
  }
  if (action === 'snap-toggle') {
    workspacePreferences.snapEnabled = !workspacePreferences.snapEnabled;
    persistWorkspacePreferences(); renderViewportDock(); if (ui.mode === 'sequence') renderSequenceLower(); return;
  }
  if (action === 'guides-toggle') {
    workspacePreferences.guides = !workspacePreferences.guides;
    persistWorkspacePreferences(); renderPlayerChrome(); renderViewportDock(); renderer.setWorkspace(workspaceState()); return;
  }
  if (action === 'select-node') {
    const id = button.dataset.nodeId;
    store.commit('Select scene object', (draft) => { draft.scene.selectedNodeId = id; }, { history: false }); return;
  }
  if (action === 'toggle-node-visible') {
    const id = button.dataset.nodeId;
    store.commit('Toggle object visibility', (draft) => { draft.scene.byId[id].visible = !draft.scene.byId[id].visible; }); return;
  }
  if (action === 'toggle-node-lock') {
    const id = button.dataset.nodeId;
    store.commit('Toggle object lock', (draft) => { draft.scene.byId[id].locked = !draft.scene.byId[id].locked; }); return;
  }
  if (action === 'import-hero') { heroFileInput.click(); return; }
  if (action === 'import-asset') { assetFileInput.click(); return; }
  if (action === 'import-background') { backgroundFileInput.click(); return; }
  if (action === 'import-hdri') { hdriFileInput.click(); return; }
  if (action === 'retry-assets') { return bootSceneAssets(); }
  if (action === 'world-tab') { ui.selectedWorldTab = button.dataset.tab; persistWorkspacePreferences(); renderAll(); return; }
  if (action === 'stage-preset') {
    const id = button.dataset.presetId;
    store.commit(`Choose ${STAGE_PRESETS[id]?.label || id}`, (draft) => {
      draft.world.stagePresetId = id;
      const currentShot = draft.shots.byId[draft.shots.activeId];
      currentShot.start.environment = id;
      currentShot.end.environment = id;
      currentShot.deltaCount = changedAxes(currentShot).length;
    }); return;
  }
  if (action === 'lighting-preset') {
    const id = button.dataset.presetId;
    store.commit(`Choose ${getLightingPreset(id).label}`, (draft) => applyLightingPresetToWorld(draft.world, id)); return;
  }
  if (action === 'toggle-setting') { return handleToggleSetting(button.dataset.setting); }
  if (action === 'center-focus') {
    store.commit('Focus center', (draft) => { draft.world.post.dof.enabled = true; draft.world.post.dof.focusUV = [0.5, 0.5]; }); return;
  }
  if (action === 'ground-selected') {
    const node = sceneNode(); if (!node) return;
    const bounds = renderer.getAssetLocalBounds(node.assetId); if (!bounds) return;
    store.commit(`Ground ${node.name}`, (draft) => { draft.scene.byId[node.id].transform.position = groundNodeTransform(draft.scene.byId[node.id], bounds); }); return;
  }
  if (action === 'reset-transform') {
    const node = sceneNode(); if (!node) return;
    store.commit(`Reset ${node.name} transform`, (draft) => { draft.scene.byId[node.id].transform = makeTransform(); }); return;
  }
  if (action === 'reset-pivot') {
    const node = sceneNode(); if (!node) return;
    store.commit(`Reset ${node.name} pivot`, (draft) => {
      const target = draft.scene.byId[node.id];
      target.transform.position = pivotPositionPreservingGeometry(target, [0, 0, 0]);
      target.pivot = makePivot();
    }); return;
  }
  if (action === 'remove-node') { return removeSceneNode(button.dataset.nodeId); }
  if (action === 'shot-subview') {
    ui.shotSubview = button.dataset.view;
    workspacePreferences.shotSubview = ui.shotSubview;
    if (compactWorkspace() && ui.shotSubview === 'matrix') ui.mobileSheet = 'inspector';
    persistWorkspacePreferences(); renderAll(); return;
  }
  if (action === 'select-shot') { return selectShot(button.dataset.shotId); }
  if (action === 'family') {
    const familyId = button.dataset.familyId;
    const preset = presetsForFamily(familyId)[0];
    if (preset) applyPreset(preset.id);
    return;
  }
  if (action === 'shot-preset') { applyPreset(button.dataset.presetId); return; }
  if (action === 'generate') { generate(button.dataset.kind); return; }
  if (action === 'new-shot') {
    const active = shot();
    const id = uid('shot');
    const created = makeShotFromPreset(active.presetId, { id, name: `${active.name} Study`, seed: active.seed + 97 });
    store.commit('Create Shot', (draft) => { draft.shots.byId[id] = created; draft.shots.order.push(id); draft.shots.activeId = id; }); return;
  }
  if (action === 'open-axis') {
    ui.selectedAxis = button.dataset.axis;
    ui.shotSubview = 'matrix';
    workspacePreferences.shotSubview = 'matrix';
    if (compactWorkspace()) ui.mobileSheet = 'inspector';
    persistWorkspacePreferences(); renderAll();
    requestAnimationFrame(() => document.querySelector(`[data-axis-category="${ui.selectedAxis}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })); return;
  }
  if (action === 'axis-lock') {
    const axis = button.dataset.axis; const active = shot();
    store.commit(`Toggle ${AXES[axis].label} lock`, (draft) => { draft.shots.byId[active.id] = toggleAxisLock(draft.shots.byId[active.id], axis); }); return;
  }
  if (action === 'axis-assign') {
    const { axis, value, side } = button.dataset; const active = shot();
    store.commit(`Assign ${AXES[axis].label} ${side}`, (draft) => { draft.shots.byId[active.id] = assignAxisValue(draft.shots.byId[active.id], axis, value, side); });
    player.refresh(); return;
  }
  if (action === 'axis-exclude') {
    const { axis, value } = button.dataset; const active = shot();
    store.commit(`Toggle ${AXES[axis].label} exclusion`, (draft) => { draft.shots.byId[active.id] = toggleExclusion(draft.shots.byId[active.id], axis, value); }); return;
  }
  if (action === 'add-active-shot-to-sequence') { addActiveShotToSequence(); return; }
  if (action === 'sequence-preset') {
    ui.selectedSequencePresetId = button.dataset.presetId;
    ui.sequencePlan = createSequencePlan(ui.selectedSequencePresetId);
    renderAll(); return;
  }
  if (action === 'build-sequence') {
    const plan = ui.sequencePlan || createSequencePlan(ui.selectedSequencePresetId);
    store.commit(`Build ${plan.name}`, (draft) => buildSequencePreset(draft, plan.presetId, { replace: true, seed: 49000 }));
    player.setMode('sequence'); player.goStart();
    toast(`${plan.name} built as linked Shots and clips.`, 'success'); return;
  }
  if (action === 'sequence-view') {
    ui.sequenceView = button.dataset.view;
    workspacePreferences.sequenceView = ui.sequenceView;
    persistWorkspacePreferences(); renderAll(); return;
  }
  if (action === 'select-clip') {
    const id = button.dataset.clipId;
    store.commit('Select clip', (draft) => { draft.sequence.activeClipId = id; }, { history: false });
    const clip = project().sequence.clips.find((item) => item.id === id);
    if (clip) player.seekFrame(clip.startFrame);
    if (compactWorkspace()) { ui.mobileSheet = 'inspector'; renderMobileSheet(); }
    return;
  }
  if (action === 'reorder-clip') {
    const id = button.dataset.clipId, direction = Number(button.dataset.direction);
    store.commit('Reorder clip', (draft) => reorderSimple(draft, id, direction)); return;
  }
  if (action === 'timeline-tool') {
    workspacePreferences.timelineTool = button.dataset.tool;
    persistWorkspacePreferences(); renderSequenceLower(); return;
  }
  if (action === 'timeline-clip') {
    const id = button.dataset.clipId;
    if (workspacePreferences.timelineTool === 'blade') {
      const target = project().sequence.clips.find((clip) => clip.id === id);
      const frame = Math.round(ui.playerState.frame);
      if (target && frame > target.startFrame && frame < target.startFrame + target.durationFrames) store.commit('Blade clip', (draft) => bladeClip(draft, id, frame));
      else toast('Place the playhead inside the clip before blading.', 'warning');
    } else {
      store.commit('Select clip', (draft) => { draft.sequence.activeClipId = id; }, { history: false });
    }
    return;
  }
  if (action === 'add-marker') { store.commit('Add marker', (draft) => addMarker(draft, Math.round(ui.playerState.frame), `Marker ${draft.sequence.markers.length + 1}`)); return; }
  if (action === 'remove-marker') { store.commit('Remove marker', (draft) => removeMarker(draft, button.dataset.markerId)); return; }
  if (action === 'track-visible') {
    const id = button.dataset.trackId; store.commit('Toggle track visibility', (draft) => { const track = draft.sequence.tracks.find((item) => item.id === id); track.visible = !track.visible; }); return;
  }
  if (action === 'track-lock') {
    const id = button.dataset.trackId; store.commit('Toggle track lock', (draft) => { const track = draft.sequence.tracks.find((item) => item.id === id); track.locked = !track.locked; }); return;
  }
  if (action === 'open-clip-shot') {
    const clip = project().sequence.clips.find((item) => item.id === button.dataset.clipId);
    if (!clip) return;
    if (clip.linked === false) { toast('Relink the detached clip to edit its source in SHOT.', 'warning'); return; }
    store.commit('Open linked Shot', (draft) => { draft.shots.activeId = clip.shotId; }, { history: false });
    switchMode('shot'); return;
  }
  if (action === 'detach-clip') { store.commit('Detach clip', (draft) => detachClip(draft, button.dataset.clipId)); return; }
  if (action === 'relink-clip') { store.commit('Relink clip', (draft) => relinkClip(draft, button.dataset.clipId)); return; }
  if (action === 'duplicate-clip') { store.commit('Duplicate clip', (draft) => duplicateClip(draft, button.dataset.clipId)); return; }
  if (action === 'delete-clip') { store.commit('Delete clip', (draft) => removeClip(draft, button.dataset.clipId)); return; }
  if (action === 'reset-workspace') {
    clearWorkspacePreferences();
    Object.assign(workspacePreferences, loadWorkspacePreferences());
    ui.displayByMode = { world: 'viewport', shot: 'render', sequence: 'render' };
    ui.preferencesOpen = false; renderAll(); return;
  }
  if (action === 'reset-project') { return resetProject(); }
}

function handleToggleSetting(path) {
  if (path === 'workspace.leftPanel') {
    workspacePreferences.leftPanelCollapsed = !workspacePreferences.leftPanelCollapsed;
    persistWorkspacePreferences(); return renderAll();
  }
  if (path === 'workspace.inspector') {
    workspacePreferences.inspectorCollapsed = !workspacePreferences.inspectorCollapsed;
    persistWorkspacePreferences(); return renderAll();
  }
  if (path === 'workspace.guides') {
    workspacePreferences.guides = !workspacePreferences.guides;
    persistWorkspacePreferences(); return renderAll();
  }
  store.commit(`Toggle ${path}`, (draft) => {
    const parts = path.split('.'); let target = draft;
    for (let index = 0; index < parts.length - 1; index += 1) target = target[parts[index]];
    target[parts.at(-1)] = !target[parts.at(-1)];
  });
}

async function removeSceneNode(nodeId) {
  const node = project().scene.byId[nodeId];
  if (!node || node.role === 'hero') return;
  const assetId = node.assetId;
  const record = project().assets.byId[assetId];
  store.commit(`Remove ${node.name}`, (draft) => {
    delete draft.scene.byId[nodeId];
    draft.scene.order = draft.scene.order.filter((id) => id !== nodeId);
    delete draft.assets.byId[assetId];
    if (draft.world.importedSetNodeId === nodeId) draft.world.importedSetNodeId = null;
    draft.scene.selectedNodeId = draft.scene.order[0] || null;
  });
  renderer.removeAsset(assetId);
  ui.mountedAssetIds.delete(assetId);
  if (record?.source === 'indexeddb') await deleteAssetBinary(assetId).catch(() => {});
}

async function resetProject() {
  if (!confirm('Reset the V49 project, workspace layout, and locally imported assets?')) return;
  player.pause();
  clearProjectPersistence({ includeLegacy: true });
  clearWorkspacePreferences();
  await clearAllAssetBinaries().catch(() => {});
  renderer.clearAssets();
  for (const id of [...ui.mountedHDRIIds]) renderer.removeHDRI(id);
  ui.mountedAssetIds.clear(); ui.mountedHDRIIds.clear();
  store.replace(createDefaultProject(), { label: 'Reset project', history: false, persist: true });
  Object.assign(workspacePreferences, loadWorkspacePreferences());
  ui.mode = 'shot'; ui.shotSubview = 'director'; ui.sequenceView = 'simple'; ui.displayByMode = { world: 'viewport', shot: 'render', sequence: 'render' };
  ui.preferencesOpen = false;
  await bootSceneAssets();
}

function handleRangeInput(input, commit = false) {
  const key = input.dataset.range || input.dataset.input;
  if (!key) return;
  if (key === 'delta') {
    const active = shot();
    if (!store.activePreview) store.beginPreview('Set semantic Delta');
    store.preview((draft) => { draft.shots.byId[active.id].deltaCount = Math.round(numberForInput(input)); });
    if (commit) store.commitPreview('Set semantic Delta');
    $$('.delta-heading h3').forEach((heading) => { heading.textContent = input.value; });
    return;
  }
  if (key === 'timeline-zoom') {
    store.commit('Set timeline zoom', (draft) => { draft.sequence.zoom = numberForInput(input); }, { history: false });
    return;
  }
  if (!store.activePreview) store.beginPreview(`Adjust ${key}`);
  store.preview((draft) => setPath(draft, key, numberForInput(input)));
  const output = input.closest('label')?.querySelector('output'); if (output) output.textContent = formatNumber(input.value, Number(input.step) < 0.1 ? 2 : 1);
  const min = Number(input.min) || 0, max = Number(input.max) || 1;
  input.style.setProperty('--value', `${clamp((numberForInput(input) - min) / Math.max(0.0001, max - min)) * 100}%`);
  if (commit) store.commitPreview(`Adjust ${key}`);
}

function handleVectorChange(input) {
  const node = sceneNode(); if (!node) return;
  const key = input.dataset.vector, index = Number(input.dataset.index), value = numberForInput(input);
  store.commit(`Edit ${node.name} ${key}`, (draft) => {
    const target = draft.scene.byId[node.id];
    if (key === 'pivot') {
      const pivot = [...target.pivot.position]; pivot[index] = value;
      target.transform.position = pivotPositionPreservingGeometry(target, pivot);
      target.pivot.position = pivot;
    } else {
      target.transform[key][index] = key === 'scale' ? Math.max(0.001, value) : value;
    }
  });
}

function handleNumberChange(input) {
  const key = input.dataset.number;
  const clip = activeClip(); if (!key || !clip) return;
  const value = numberForInput(input);
  store.commit(`Edit ${key}`, (draft) => {
    const target = draft.sequence.clips.find((item) => item.id === clip.id); if (!target) return;
    const property = key.split('.')[1];
    if (property === 'durationFrames') target[property] = Math.max(1, Math.round(value));
    else if (property === 'startFrame' || property === 'sourceOffsetFrames') target[property] = Math.max(0, Math.round(value));
    else if (property === 'speed') target[property] = clamp(value, 0.05, 8);
  });
}

function handleTextChange(input) {
  const key = input.dataset.text;
  const clip = activeClip(); if (!key || !clip) return;
  store.commit('Rename clip', (draft) => {
    const target = draft.sequence.clips.find((item) => item.id === clip.id);
    if (target) target.name = input.value.trim() || target.name;
  });
}

function handleSelectChange(select) {
  const key = select.dataset.select;
  if (key === 'workspace.viewportShading') {
    workspacePreferences.viewportShading = select.value; persistWorkspacePreferences(); renderer.setWorkspace(workspaceState()); return;
  }
  if (key === 'settings.previewQuality') {
    store.commit('Set preview quality', (draft) => { draft.settings.previewQuality = select.value; }); return;
  }
  if (key === 'clip.easing') {
    const clip = activeClip(); if (!clip) return;
    store.commit('Set clip easing', (draft) => { const target = draft.sequence.clips.find((item) => item.id === clip.id); if (target) target.easing = select.value; });
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'timeline-seek') {
    const shell = button.closest('[data-timeline-shell]');
    const canvasEl = shell?.querySelector('[data-timeline-canvas]');
    const scroll = shell?.querySelector('[data-timeline-scroll]');
    if (canvasEl && !event.target.closest('.timeline-clip, .timeline-marker')) {
      const px = Number(shell.dataset.pxPerFrame) || 1;
      const rect = canvasEl.getBoundingClientRect();
      player.seekFrame(Math.max(0, Math.round((event.clientX - rect.left + (scroll?.scrollLeft || 0)) / px)));
    }
    return;
  }
  handleAction(button, event);
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (input.matches('[data-range], [data-input]')) handleRangeInput(input, false);
  if (input.id === 'transportScrub') player.seekNormalized(Number(input.value) / 1000);
});

document.addEventListener('change', (event) => {
  const input = event.target;
  if (input.matches('[data-range], [data-input]')) handleRangeInput(input, true);
  else if (input.matches('[data-vector]')) handleVectorChange(input);
  else if (input.matches('[data-number]')) handleNumberChange(input);
  else if (input.matches('[data-text]')) handleTextChange(input);
  else if (input.matches('[data-select]')) handleSelectChange(input);
});

heroFileInput.addEventListener('change', () => importGLB(heroFileInput.files?.[0], 'hero'));
assetFileInput.addEventListener('change', () => importGLB(assetFileInput.files?.[0], 'asset'));
backgroundFileInput.addEventListener('change', () => importGLB(backgroundFileInput.files?.[0], 'background'));
hdriFileInput.addEventListener('change', () => importHDRI(hdriFileInput.files?.[0]));

splitDivider.addEventListener('pointerdown', (event) => {
  if (currentDisplayMode() !== 'split') return;
  ui.splitDrag = { pointerId: event.pointerId };
  splitDivider.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});
splitDivider.addEventListener('pointermove', (event) => {
  if (!ui.splitDrag) return;
  const rect = $('#playerCard').getBoundingClientRect();
  workspacePreferences.splitRatio = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0.35, 0.65);
  splitDivider.style.left = `${workspacePreferences.splitRatio * 100}%`;
  renderer.setWorkspace(workspaceState());
});
const finishSplit = (event) => {
  if (!ui.splitDrag) return;
  ui.splitDrag = null;
  splitDivider.releasePointerCapture?.(event.pointerId);
  persistWorkspacePreferences(); renderPlayerChrome();
};
splitDivider.addEventListener('pointerup', finishSplit);
splitDivider.addEventListener('pointercancel', finishSplit);
splitDivider.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  workspacePreferences.splitRatio = clamp(workspacePreferences.splitRatio + (event.key === 'ArrowRight' ? 0.02 : -0.02), 0.35, 0.65);
  persistWorkspacePreferences(); renderPlayerChrome(); renderer.setWorkspace(workspaceState());
});

function beginTimelineDrag(event, element, type) {
  const clipId = element.dataset.clipId;
  const clip = project().sequence.clips.find((item) => item.id === clipId);
  const shell = element.closest('[data-timeline-shell]');
  if (!clip || !shell) return;
  const track = project().sequence.tracks.find((item) => item.id === clip.trackId);
  if (track?.locked) return;
  ui.timelineDrag = {
    pointerId: event.pointerId,
    clipId,
    type,
    startX: event.clientX,
    startFrame: clip.startFrame,
    duration: clip.durationFrames,
    sourceOffset: clip.sourceOffsetFrames,
    pxPerFrame: Number(shell.dataset.pxPerFrame) || 1,
    moved: false,
  };
  element.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

document.addEventListener('pointerdown', (event) => {
  const handle = event.target.closest('[data-timeline-handle]');
  if (handle) return beginTimelineDrag(event, handle, handle.dataset.timelineHandle);
  const main = event.target.closest('.timeline-clip-main');
  if (!main || workspacePreferences.timelineTool === 'blade') return;
  beginTimelineDrag(event, main, workspacePreferences.timelineTool === 'slip' ? 'slip' : 'move');
});

document.addEventListener('pointermove', (event) => {
  const drag = ui.timelineDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const deltaFrames = Math.round((event.clientX - drag.startX) / drag.pxPerFrame);
  if (Math.abs(deltaFrames) === 0) return;
  if (!drag.moved) {
    drag.moved = true;
    store.beginPreview(drag.type === 'move' ? 'Move clip' : drag.type === 'slip' ? 'Slip clip' : `Trim clip ${drag.type}`);
  }
  store.preview((draft) => {
    if (drag.type === 'move') moveClip(draft, drag.clipId, drag.startFrame + deltaFrames, { snap: workspacePreferences.snapEnabled });
    else if (drag.type === 'left') trimClip(draft, drag.clipId, 'left', drag.startFrame + deltaFrames);
    else if (drag.type === 'right') trimClip(draft, drag.clipId, 'right', drag.startFrame + drag.duration + deltaFrames);
    else if (drag.type === 'slip') {
      const target = draft.sequence.clips.find((item) => item.id === drag.clipId);
      if (target) { target.sourceOffsetFrames = drag.sourceOffset; slipClip(draft, drag.clipId, deltaFrames); }
    }
  });
});

function finishTimelineDrag(event) {
  const drag = ui.timelineDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  ui.timelineDrag = null;
  if (drag.moved) store.commitPreview(drag.type === 'move' ? 'Move clip' : drag.type === 'slip' ? 'Slip clip' : 'Trim clip');
}
document.addEventListener('pointerup', finishTimelineDrag);
document.addEventListener('pointercancel', finishTimelineDrag);

document.addEventListener('keydown', (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) store.redo(); else store.undo();
    return;
  }
  if (event.code === 'Space' && !event.target.matches('input, textarea, select, button')) { event.preventDefault(); player.toggle(); }
  if (event.key.toLowerCase() === 'f' && !event.target.matches('input, textarea, select')) { const node = sceneNode(); if (node) renderer.frameNode(node.id); }
  if (event.key === 'Escape') {
    if (ui.preferencesOpen) { ui.preferencesOpen = false; renderPreferences(); }
    if (ui.mobileSheet) { ui.mobileSheet = null; renderMobileSheet(); }
    if (store.activePreview) store.cancelPreview();
  }
});

window.addEventListener('resize', () => {
  if (!compactWorkspace() && ui.mobileSheet) { ui.mobileSheet = null; renderMobileSheet(); }
  if (currentDisplayMode() === 'split' && matchMedia('(max-width: 899px) and (orientation: portrait)').matches) setDisplayMode(ui.mode === 'world' ? 'viewport' : 'render');
  else renderer.invalidate();
});

store.subscribe((_state, meta) => {
  player.refresh();
  if (!meta.preview) renderAll();
});

window.__VISUALREF_DEBUG__ = {
  version: 49,
  getProject: () => copy(project()),
  getWorkspace: () => copy(workspaceState()),
  getRenderer: () => renderer.getDebugState(),
  getPlayer: () => ({ ...ui.playerState, payload: ui.currentPayload ? { mode: ui.currentPayload.mode, mix: ui.currentPayload.mix, clipId: ui.currentPayload.clip?.id || null } : null }),
  getRuntime: () => ({ decodeCount: ui.decodeCount, bootComplete: ui.bootComplete, mountedAssetIds: [...ui.mountedAssetIds], mountedHDRIIds: [...ui.mountedHDRIIds] }),
  getInteraction: () => ({ timelineDrag: ui.timelineDrag ? { ...ui.timelineDrag } : null, activePreview: store.activePreview?.label || null, undoDepth: store.undoStack.length }),
  setMode: switchMode,
  setDisplayMode,
  buildSequence: (presetId) => store.commit(`Build ${presetId}`, (draft) => buildSequencePreset(draft, presetId, { replace: true })),
  seekFrame: (frame) => player.seekFrame(frame),
  play: () => player.play(),
  pause: () => player.pause(),
  openMobileSheet: (kind) => { ui.mobileSheet = ['left', 'inspector'].includes(kind) ? kind : null; renderMobileSheet(); },
  resetEditorCamera: () => renderer.resetEditorCamera(),
};

renderAll();
bootSceneAssets().catch((error) => {
  ui.bootComplete = true;
  setAssetState({ state: 'error', label: 'Scene could not open', message: error.message, code: error.code || 'BOOT_FAILED' });
  console.error(error);
});
