import { AXIS_IDS } from '../shot/axes.js';
import { generateShot } from '../shot/delta-engine.js';
import { getPreset } from '../shot/presets.js';

const copy = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

export function makeShotFromPreset(presetId = 'copper-ledger', {
  id = crypto.randomUUID?.() || `shot-${Date.now()}`,
  name,
  deltaCount = 3,
  seed = 4801,
} = {}) {
  const preset = getPreset(presetId);
  const base = {
    id,
    name: name || preset.label,
    familyId: preset.familyId,
    presetId: preset.id,
    start: copy(preset.start),
    end: copy(preset.end),
    deltaCount,
    locks: Object.fromEntries(AXIS_IDS.map((axis) => [axis, false])),
    exclusions: {},
    durationFrames: 96,
    seed,
    fineTune: {},
  };
  return generateShot({ shot: base, kind: 'variant', requestedDelta: deltaCount, seed }).shot;
}

export function createDefaultProject() {
  const now = new Date().toISOString();
  const firstShot = makeShotFromPreset('copper-ledger', { id: 'shot-01', seed: 4801 });
  return {
    schemaVersion: 48,
    meta: {
      id: crypto.randomUUID?.() || `project-${Date.now()}`,
      title: 'Untitled Curve',
      createdAt: now,
      updatedAt: now,
    },
    settings: {
      fps: 24,
      aspect: '16:9',
      reducedMotion: false,
    },
    assets: {
      hero: {
        source: 'bundled',
        name: 'Memento Obsidian Fixture.glb',
        size: 0,
        sha256: null,
        status: 'pending',
        stats: null,
      },
    },
    world: {
      theme: 'grey',
      overrideTheme: false,
      visualScale: 1,
      orientationY: 0,
      grounded: true,
    },
    shots: {
      activeId: firstShot.id,
      order: [firstShot.id],
      byId: { [firstShot.id]: firstShot },
    },
    sequence: {
      activeClipId: null,
      clips: [],
    },
  };
}

export function normalizeProject(project) {
  const fallback = createDefaultProject();
  if (!project || project.schemaVersion !== 48) return fallback;
  const next = copy(project);
  next.meta = { ...fallback.meta, ...(next.meta || {}) };
  next.settings = { ...fallback.settings, ...(next.settings || {}) };
  next.assets = { ...fallback.assets, ...(next.assets || {}) };
  next.assets.hero = { ...fallback.assets.hero, ...(next.assets.hero || {}) };
  next.world = { ...fallback.world, ...(next.world || {}) };
  next.shots = next.shots || fallback.shots;
  next.shots.order = Array.isArray(next.shots.order) ? next.shots.order.filter((id) => next.shots.byId?.[id]) : [];
  next.shots.byId = next.shots.byId || {};
  if (!next.shots.order.length) {
    const first = makeShotFromPreset('copper-ledger', { id: 'shot-01', seed: 4801 });
    next.shots.order = [first.id]; next.shots.byId[first.id] = first;
  }
  if (!next.shots.byId[next.shots.activeId]) next.shots.activeId = next.shots.order[0];
  next.sequence = { ...fallback.sequence, ...(next.sequence || {}) };
  next.sequence.clips = Array.isArray(next.sequence.clips)
    ? next.sequence.clips.filter((clip) => next.shots.byId[clip.shotId]).map((clip) => ({
        id: clip.id || (crypto.randomUUID?.() || `clip-${Date.now()}-${Math.random()}`),
        shotId: clip.shotId,
        durationFrames: Math.max(12, Math.round(clip.durationFrames || next.shots.byId[clip.shotId].durationFrames || 96)),
      }))
    : [];
  return next;
}

export function activeShot(project) {
  return project.shots.byId[project.shots.activeId] || project.shots.byId[project.shots.order[0]];
}

export function sequenceDurationFrames(project) {
  return project.sequence.clips.reduce((sum, clip) => sum + Math.max(1, clip.durationFrames || 1), 0);
}
