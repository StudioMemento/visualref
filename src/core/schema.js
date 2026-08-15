import { AXIS_IDS, defaultRecipe } from '../shot/axes.js';
import { generateShot } from '../shot/delta-engine.js';
import { getPreset } from '../shot/presets.js';

const copy = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
const makeId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const nowISO = () => new Date().toISOString();

export function makeTransform(overrides = {}) {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    ...copy(overrides),
  };
}

export function makePivot(overrides = {}) {
  return { position: [0, 0, 0], ...copy(overrides) };
}

export function makeSceneNode({
  id = makeId('node'),
  name = 'Scene Node',
  role = 'asset',
  assetId = null,
  parentId = null,
  visible = true,
  locked = false,
  transform = makeTransform(),
  pivot = makePivot(),
} = {}) {
  return { id, name, role, assetId, parentId, visible, locked, transform, pivot };
}

export function createManagedLights() {
  return {
    key: { id: 'key', enabled: true, intensity: 1.0, color: [1.0, 0.96, 0.92], direction: [-0.55, 0.72, 0.43] },
    fill: { id: 'fill', enabled: true, intensity: 0.30, color: [0.88, 0.94, 1.0], direction: [0.70, 0.32, 0.54] },
    'rim-left': { id: 'rim-left', enabled: true, intensity: 0.42, color: [0.82, 0.90, 1.0], direction: [-0.75, 0.42, -0.50] },
    'rim-right': { id: 'rim-right', enabled: false, intensity: 0.0, color: [1.0, 0.76, 0.58], direction: [0.75, 0.40, -0.50] },
    top: { id: 'top', enabled: false, intensity: 0.0, color: [1.0, 0.96, 0.90], direction: [0.03, 0.99, 0.10] },
    bottom: { id: 'bottom', enabled: false, intensity: 0.0, color: [0.75, 0.84, 1.0], direction: [0.02, -0.88, 0.42] },
    portal: { id: 'portal', enabled: false, intensity: 0.0, color: [1.0, 0.92, 0.82], direction: [0.0, 0.32, 0.95] },
    practical: { id: 'practical', enabled: false, intensity: 0.0, color: [1.0, 0.58, 0.30], direction: [0.42, 0.62, -0.66] },
  };
}

export function createDefaultWorld() {
  return {
    stagePresetId: 'dark-cyclorama',
    stageScale: 1,
    importedSetNodeId: null,
    hdriAssetId: null,
    hdri: {
      visible: false,
      intensity: 0.55,
      reflectionIntensity: 0.58,
      rotationY: 0,
      blur: 0.12,
      exposureContribution: 0.25,
    },
    lightingPresetId: 'studio-soft',
    lighting: {
      masterIntensity: 1,
      temperature: 0,
      tint: 0,
      contrastRatio: 0.42,
      keyDirection: 0,
      rimStrength: 0.38,
      shadowSoftness: 0.72,
      shadows: true,
      hdriContribution: 0.45,
    },
    lights: createManagedLights(),
    post: {
      bypass: false,
      exposure: 1,
      contrast: 1,
      saturation: 1,
      warmth: 0,
      tint: 0,
      bloom: 0.10,
      bloomThreshold: 0.72,
      vignette: 0.12,
      grain: false,
      grainStrength: 0.035,
      previewFx: false,
      dof: {
        enabled: false,
        focusUV: [0.5, 0.5],
        focusDistance: 0.5,
        aperture: 0.18,
        focalRange: 0.24,
        bokehStrength: 0.30,
      },
    },
  };
}

export function makeShotFromPreset(presetId = 'hero-authority', {
  id = makeId('shot'),
  name,
  deltaCount,
  seed = 4901,
} = {}) {
  const preset = getPreset(presetId);
  const base = {
    id,
    name: name || preset.label,
    familyId: preset.familyId,
    presetId: preset.id,
    start: copy(preset.start),
    end: copy(preset.end),
    deltaCount: Number.isFinite(deltaCount) ? deltaCount : (preset.deltaCount ?? 3),
    locks: Object.fromEntries(AXIS_IDS.map((axis) => [axis, false])),
    exclusions: {},
    durationFrames: preset.durationFrames || 96,
    seed,
    fineTune: {
      focalLengthOffset: 0,
      apertureOffset: 0,
      focusDistanceOffset: 0,
      cameraSpeed: 1,
      cameraArc: 1,
      framingOffsetX: 0,
      framingOffsetY: 0,
      heroRotationOffset: 0,
      lightIntensity: 1,
      exposure: 0,
      effectStrength: 1,
    },
  };
  return generateShot({ shot: base, kind: 'variant', requestedDelta: base.deltaCount, seed }).shot;
}

function bundledHeroRecord() {
  return {
    id: 'asset-hero-bundled',
    name: 'Memento Obsidian Fixture.glb',
    role: 'hero',
    source: 'bundled',
    sourcePath: '/assets/memento-obsidian-fixture.glb',
    size: 0,
    sha256: null,
    status: 'pending',
    stats: null,
    bounds: null,
    normalization: null,
    mime: 'model/gltf-binary',
    createdAt: nowISO(),
  };
}

export function createDefaultProject() {
  const now = nowISO();
  const heroAsset = bundledHeroRecord();
  const heroNode = makeSceneNode({
    id: 'node-hero', name: 'Hero', role: 'hero', assetId: heroAsset.id,
    transform: makeTransform(), pivot: makePivot(),
  });
  const firstShot = makeShotFromPreset('hero-authority', { id: 'shot-01', seed: 4901 });
  return {
    schemaVersion: 49,
    meta: {
      id: makeId('project'),
      title: 'Untitled Cinematic Workspace',
      createdAt: now,
      updatedAt: now,
    },
    settings: {
      fps: 24,
      aspect: '16:9',
      reducedMotion: false,
      previewQuality: 'balanced',
    },
    assets: {
      heroAssetId: heroAsset.id,
      byId: { [heroAsset.id]: heroAsset },
    },
    scene: {
      selectedNodeId: heroNode.id,
      order: [heroNode.id],
      byId: { [heroNode.id]: heroNode },
    },
    world: createDefaultWorld(),
    shots: {
      activeId: firstShot.id,
      order: [firstShot.id],
      byId: { [firstShot.id]: firstShot },
    },
    sequence: {
      name: 'Untitled Sequence',
      presetId: null,
      view: 'simple',
      activeClipId: null,
      clips: [],
      tracks: [
        { id: 'gfx', kind: 'gfx', label: 'GFX / FX', visible: true, locked: false, muted: false },
        { id: 'v3', kind: 'video', label: 'V3', visible: true, locked: false, muted: false },
        { id: 'v2', kind: 'video', label: 'V2', visible: true, locked: false, muted: false },
        { id: 'v1', kind: 'video', label: 'V1', visible: true, locked: false, muted: false },
        { id: 'a2', kind: 'audio', label: 'A2', visible: true, locked: false, muted: false },
        { id: 'a1', kind: 'audio', label: 'A1', visible: true, locked: false, muted: false },
      ],
      markers: [],
      zoom: 1,
      loopRange: null,
    },
  };
}

const V48_VIEWPOINT_MAP = {
  'hero-3q': 'hero-3q', front: 'front', 'rear-3q': 'rear-3q', side: 'profile', low: 'low', top: 'top', detail: 'detail',
};
const V48_CAMERA_MOVE_MAP = {
  still: 'static', 'orbit-left': 'orbit-left', 'orbit-right': 'orbit-right', push: 'push-in', pull: 'pull-out', rise: 'crane-up',
  'slide-left': 'track-left', 'slide-right': 'track-right',
};
const V48_LENS_MAP = { wide24: '24mm', cinema35: '35mm', natural50: '50mm', portrait85: '85mm', macro105: '105mm-macro' };
const V48_FOCUS_MAP = { full: 'deep', front: 'front-plane', center: 'center-mass', label: 'hero-detail', shallow: 'shallow', deep: 'deep' };
const V48_COMP_MAP = { center: 'centered', 'thirds-left': 'left-third', 'thirds-right': 'right-third', symmetry: 'symmetry', 'negative-left': 'negative-left', 'negative-right': 'negative-right', diagonal: 'diagonal' };
const V48_SCALE_MAP = { wide: 'small', balanced: 'medium', tight: 'large', macro: 'off-scale' };
const V48_ROT_MAP = { neutral: '0deg', left15: 'left15', right15: 'right15', left35: 'left45', right35: 'right45', 'tilt-left': 'left15', 'tilt-right': 'right15' };
const V48_ENV_MAP = { grey: 'grey-limbo', white: 'white-limbo', black: 'black-limbo', void: 'void' };
const V48_ATMOS_MAP = { clean: 'clean', warm: 'warm', cool: 'cool', contrast: 'contrast', soft: 'soft', nocturne: 'nocturne' };

function migrateV48Recipe(recipe = {}) {
  const opticalView = recipe.view;
  let view = V48_VIEWPOINT_MAP[recipe.camera] || 'hero-3q';
  if (opticalView === 'orthographic') view = 'orthographic';
  else if (opticalView === 'profile') view = 'profile';
  else if (opticalView === 'top') view = 'top';
  else if (opticalView === 'detail') view = 'detail';
  return {
    light: ({ softbox: 'studio-soft', rim: 'side-rim', split: 'gradient', top: 'top-light', silhouette: 'backlight', daylight: 'three-point', flat: 'studio-soft' })[recipe.light] || 'studio-soft',
    camera: V48_CAMERA_MOVE_MAP[recipe.motion] || 'static',
    lens: V48_LENS_MAP[recipe.lens] || '50mm',
    focus: V48_FOCUS_MAP[recipe.focus] || 'deep',
    composition: V48_COMP_MAP[recipe.composition] || 'centered',
    scale: V48_SCALE_MAP[recipe.scale] || 'medium',
    rotation: V48_ROT_MAP[recipe.rotation] || '0deg',
    view,
    motion: 'none',
    environment: V48_ENV_MAP[recipe.environment] || 'dark-cyclorama',
    atmosphere: V48_ATMOS_MAP[recipe.atmosphere] || 'clean',
  };
}

export function migrateV48ToV49(project48) {
  const next = createDefaultProject();
  if (!project48 || project48.schemaVersion !== 48) return next;
  next.meta = { ...next.meta, ...(project48.meta || {}), updatedAt: nowISO() };
  next.settings = { ...next.settings, ...(project48.settings || {}) };
  const oldHero = project48.assets?.hero || {};
  const hero = next.assets.byId[next.assets.heroAssetId];
  Object.assign(hero, {
    name: oldHero.name || hero.name,
    source: oldHero.source || hero.source,
    size: oldHero.size || 0,
    sha256: oldHero.sha256 || null,
    status: oldHero.status || 'pending',
    stats: oldHero.stats || null,
  });
  const heroNode = next.scene.byId['node-hero'];
  heroNode.transform.scale = [project48.world?.visualScale || 1, project48.world?.visualScale || 1, project48.world?.visualScale || 1];
  heroNode.transform.rotation[1] = project48.world?.orientationY || 0;
  next.world.stagePresetId = project48.world?.theme ? (V48_ENV_MAP[project48.world.theme] || 'dark-cyclorama') : 'dark-cyclorama';

  next.shots.byId = {};
  next.shots.order = [];
  for (const oldId of project48.shots?.order || []) {
    const oldShot = project48.shots?.byId?.[oldId];
    if (!oldShot) continue;
    const shot = makeShotFromPreset('hero-authority', { id: oldShot.id, name: oldShot.name, deltaCount: oldShot.deltaCount, seed: oldShot.seed || 4901 });
    shot.familyId = ['hero', 'detail', 'motion'].includes(oldShot.familyId) ? oldShot.familyId : 'hero';
    shot.presetId = getPreset(shot.presetId).id;
    shot.start = migrateV48Recipe(oldShot.start);
    shot.end = migrateV48Recipe(oldShot.end);
    shot.deltaCount = AXIS_IDS.filter((axis) => shot.start[axis] !== shot.end[axis]).length;
    shot.locks = { ...shot.locks, ...(oldShot.locks || {}) };
    shot.exclusions = {};
    shot.durationFrames = Math.max(12, Math.round(oldShot.durationFrames || 96));
    shot.seed = oldShot.seed || 4901;
    next.shots.byId[shot.id] = shot;
    next.shots.order.push(shot.id);
  }
  if (!next.shots.order.length) {
    const first = makeShotFromPreset('hero-authority', { id: 'shot-01', seed: 4901 });
    next.shots.byId[first.id] = first;
    next.shots.order.push(first.id);
  }
  next.shots.activeId = next.shots.byId[project48.shots?.activeId] ? project48.shots.activeId : next.shots.order[0];

  let cursor = 0;
  next.sequence.clips = (project48.sequence?.clips || []).filter((clip) => next.shots.byId[clip.shotId]).map((clip) => {
    const durationFrames = Math.max(12, Math.round(clip.durationFrames || next.shots.byId[clip.shotId].durationFrames || 96));
    const migrated = {
      id: clip.id || makeId('clip'), shotId: clip.shotId, linked: true, trackId: 'v1', startFrame: cursor,
      durationFrames, sourceOffsetFrames: 0, speed: 1, easing: 'ease-in-out', name: next.shots.byId[clip.shotId].name,
    };
    cursor += durationFrames;
    return migrated;
  });
  next.sequence.activeClipId = next.sequence.clips.find((clip) => clip.id === project48.sequence?.activeClipId)?.id || next.sequence.clips[0]?.id || null;
  return next;
}

function normalizeTransform(value) {
  const fallback = makeTransform();
  const next = { ...fallback, ...(value || {}) };
  for (const key of ['position', 'rotation', 'scale']) {
    const source = Array.isArray(next[key]) ? next[key] : fallback[key];
    next[key] = [0, 1, 2].map((index) => Number.isFinite(Number(source[index])) ? Number(source[index]) : fallback[key][index]);
  }
  next.scale = next.scale.map((value) => Math.max(0.001, value));
  return next;
}

function normalizeShot(shot, fallbackShot) {
  const next = { ...copy(fallbackShot), ...(copy(shot) || {}) };
  next.start = { ...defaultRecipe(), ...(next.start || {}) };
  next.end = { ...defaultRecipe(), ...(next.end || {}) };
  next.locks = { ...fallbackShot.locks, ...(next.locks || {}) };
  next.exclusions = { ...(next.exclusions || {}) };
  next.durationFrames = Math.max(12, Math.round(next.durationFrames || fallbackShot.durationFrames));
  const requestedDelta = Number(next.deltaCount);
  next.deltaCount = Number.isFinite(requestedDelta)
    ? Math.max(0, Math.min(AXIS_IDS.length, Math.round(requestedDelta)))
    : AXIS_IDS.filter((axis) => next.start[axis] !== next.end[axis]).length;
  next.fineTune = { ...fallbackShot.fineTune, ...(next.fineTune || {}) };
  return next;
}

export function normalizeProject(project) {
  if (project?.schemaVersion === 48) return normalizeProject(migrateV48ToV49(project));
  const fallback = createDefaultProject();
  if (!project || project.schemaVersion !== 49) return fallback;
  const next = copy(project);
  next.meta = { ...fallback.meta, ...(next.meta || {}) };
  next.settings = { ...fallback.settings, ...(next.settings || {}) };
  const suppliedAssets = next.assets || {};
  const suppliedById = suppliedAssets.byId && typeof suppliedAssets.byId === 'object' ? suppliedAssets.byId : null;
  next.assets = { ...fallback.assets, ...suppliedAssets };
  next.assets.byId = suppliedById ? { ...suppliedById } : { ...fallback.assets.byId };
  if (!next.assets.byId[next.assets.heroAssetId]) {
    const existingHero = Object.values(next.assets.byId).find((record) => record?.role === 'hero');
    if (existingHero) next.assets.heroAssetId = existingHero.id;
    else {
      const fallbackHero = copy(fallback.assets.byId[fallback.assets.heroAssetId]);
      next.assets.byId[fallbackHero.id] = fallbackHero;
      next.assets.heroAssetId = fallbackHero.id;
    }
  }

  next.scene = { ...fallback.scene, ...(next.scene || {}) };
  next.scene.byId = { ...(next.scene.byId || {}) };
  next.scene.order = Array.isArray(next.scene.order) ? next.scene.order.filter((id) => next.scene.byId[id]) : [];
  for (const node of Object.values(next.scene.byId)) {
    node.transform = normalizeTransform(node.transform);
    node.pivot = { position: [0, 0, 0], ...(node.pivot || {}) };
    node.pivot.position = [0, 1, 2].map((index) => Number(node.pivot.position?.[index]) || 0);
    node.visible = node.visible !== false;
    node.locked = !!node.locked;
  }
  if (!next.scene.order.length) {
    next.scene = fallback.scene;
  }
  if (!next.scene.byId[next.scene.selectedNodeId]) next.scene.selectedNodeId = next.scene.order[0] || null;

  next.world = { ...fallback.world, ...(next.world || {}) };
  next.world.hdri = { ...fallback.world.hdri, ...(next.world.hdri || {}) };
  next.world.lighting = { ...fallback.world.lighting, ...(next.world.lighting || {}) };
  next.world.lights = { ...fallback.world.lights, ...(next.world.lights || {}) };
  next.world.post = { ...fallback.world.post, ...(next.world.post || {}) };
  next.world.post.dof = { ...fallback.world.post.dof, ...(next.world.post.dof || {}) };

  next.shots = next.shots || fallback.shots;
  next.shots.byId = next.shots.byId || {};
  next.shots.order = Array.isArray(next.shots.order) ? next.shots.order.filter((id) => next.shots.byId[id]) : [];
  for (const id of next.shots.order) {
    next.shots.byId[id] = normalizeShot(next.shots.byId[id], makeShotFromPreset(next.shots.byId[id].presetId || 'hero-authority', { id }));
  }
  if (!next.shots.order.length) {
    const first = makeShotFromPreset('hero-authority', { id: 'shot-01', seed: 4901 });
    next.shots.order = [first.id];
    next.shots.byId = { [first.id]: first };
  }
  if (!next.shots.byId[next.shots.activeId]) next.shots.activeId = next.shots.order[0];

  next.sequence = { ...fallback.sequence, ...(next.sequence || {}) };
  next.sequence.tracks = Array.isArray(next.sequence.tracks) && next.sequence.tracks.length ? next.sequence.tracks : fallback.sequence.tracks;
  next.sequence.markers = Array.isArray(next.sequence.markers) ? next.sequence.markers.map((marker) => ({ id: marker.id || makeId('marker'), frame: Math.max(0, Math.round(marker.frame || 0)), label: marker.label || 'Marker' })) : [];
  next.sequence.clips = Array.isArray(next.sequence.clips) ? next.sequence.clips.filter((clip) => next.shots.byId[clip.shotId] || clip.detachedShot).map((clip, index) => ({
    id: clip.id || makeId('clip'),
    shotId: clip.shotId || null,
    detachedShot: clip.detachedShot ? normalizeShot(clip.detachedShot, makeShotFromPreset(clip.detachedShot.presetId || 'hero-authority')) : null,
    linked: clip.linked !== false,
    trackId: clip.trackId || 'v1',
    startFrame: Math.max(0, Math.round(Number.isFinite(clip.startFrame) ? clip.startFrame : index * 96)),
    durationFrames: Math.max(1, Math.round(clip.durationFrames || 96)),
    sourceOffsetFrames: Math.max(0, Math.round(clip.sourceOffsetFrames || 0)),
    speed: Math.max(0.05, Number(clip.speed) || 1),
    easing: clip.easing || 'ease-in-out',
    name: clip.name || next.shots.byId[clip.shotId]?.name || clip.detachedShot?.name || `Clip ${index + 1}`,
  })) : [];
  if (!next.sequence.clips.some((clip) => clip.id === next.sequence.activeClipId)) next.sequence.activeClipId = next.sequence.clips[0]?.id || null;
  next.sequence.zoom = Math.max(0.25, Math.min(6, Number(next.sequence.zoom) || 1));
  return next;
}

export function activeShot(project) {
  return project.shots.byId[project.shots.activeId] || project.shots.byId[project.shots.order[0]];
}

export function selectedNode(project) {
  return project.scene.byId[project.scene.selectedNodeId] || null;
}

export function clipShot(project, clip) {
  if (!clip) return null;
  return clip.linked !== false ? project.shots.byId[clip.shotId] : (clip.detachedShot || project.shots.byId[clip.shotId]);
}

export function sequenceDurationFrames(project) {
  return project.sequence.clips.reduce((maximum, clip) => Math.max(maximum, (clip.startFrame || 0) + Math.max(1, clip.durationFrames || 1)), 0);
}

export function compactSequenceClips(project) {
  let cursor = 0;
  for (const clip of [...project.sequence.clips].sort((a, b) => a.startFrame - b.startFrame)) {
    clip.startFrame = cursor;
    cursor += Math.max(1, clip.durationFrames || 1);
  }
}

export function nextClipStart(project) {
  return sequenceDurationFrames(project);
}
