import { makeShotFromPreset } from '../core/schema.js';
import { hasCapabilities } from '../shot/capabilities.js';

const copy = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

const shot = (name, presetId, { duration = 72, start = {}, end = {}, familyId = null } = {}) => ({ name, presetId, duration, start, end, familyId });

export const SEQUENCE_PRESETS = [
  {
    id: 'hero-authority-4', name: 'Hero Authority', eyebrow: '4 SHOTS', description: 'Establish, build light, push detail, resolve.', required: [],
    shots: [
      shot('Wide Hero Establish', 'hero-authority', { duration: 72, start: { scale: 'small', lens: '35mm', camera: 'static' }, end: { scale: 'medium', lens: '50mm', camera: 'micro-drift' } }),
      shot('Three-quarter Light Build', 'light-curtain', { duration: 76, start: { light: 'side-rim', focus: 'shallow' }, end: { light: 'beauty-strip', focus: 'deep' } }),
      shot('Controlled Push Detail', 'macro-trace', { duration: 66, start: { camera: 'push-in', lens: '85mm', view: 'detail' }, end: { camera: 'push-in', lens: '105mm-macro', view: 'macro-3q' } }),
      shot('Closing Hold', 'closing-hold', { duration: 72 }),
    ],
  },
  {
    id: 'material-reveal-4', name: 'Material Reveal', eyebrow: '4 SHOTS', description: 'Silhouette, rim sweep, macro rack, full-product reveal.', required: [],
    shots: [
      shot('Dark Silhouette', 'light-curtain', { duration: 64, start: { light: 'backlight', atmosphere: 'nocturne', environment: 'black-limbo' }, end: { light: 'backlight', atmosphere: 'nocturne', environment: 'black-limbo' } }),
      shot('Rim Sweep', 'light-curtain', { duration: 72, start: { light: 'side-rim', camera: 'static' }, end: { light: 'rim-sweep', camera: 'micro-drift' } }),
      shot('Macro Rack Focus', 'macro-trace', { duration: 72, start: { focus: 'rack-near-far' }, end: { focus: 'rack-far-near' } }),
      shot('Soft Full Reveal', 'hero-authority', { duration: 82, start: { light: 'beauty-strip', atmosphere: 'soft' }, end: { light: 'studio-soft', atmosphere: 'clean' } }),
    ],
  },
  {
    id: 'orbit-study-4', name: 'Orbit Study', eyebrow: '4 SHOTS', description: 'Front hold, left orbit, profile track, rear close.', required: [],
    shots: [
      shot('Front Hold', 'hero-authority', { duration: 56, start: { view: 'front', camera: 'static', rotation: '0deg' }, end: { view: 'front', camera: 'static', rotation: '0deg' } }),
      shot('Left Orbit', 'orbit-ledger', { duration: 78, start: { view: 'front', camera: 'orbit-left' }, end: { view: 'hero-3q', camera: 'orbit-left' } }),
      shot('Profile Track', 'orbit-ledger', { duration: 72, start: { view: 'profile', camera: 'track-left' }, end: { view: 'profile', camera: 'track-right' } }),
      shot('Rear Three-quarter Close', 'closing-hold', { duration: 66, start: { view: 'rear-3q', scale: 'large' }, end: { view: 'rear-3q', scale: 'tight' } }),
    ],
  },
  {
    id: 'light-lab-6', name: 'Light Lab', eyebrow: '6 SHOTS', description: 'Inspect the same Hero through six calibrated light rigs.', required: ['managedLighting'],
    shots: ['studio-soft', 'side-rim', 'duo-rim', 'backlight', 'top-light', 'beauty-strip'].map((lightId, index) =>
      shot(['Studio Soft', 'Side Rim', 'Duo Rim', 'Backlight', 'Top Light', 'Beauty Strip'][index], 'hero-authority', {
        duration: 54, start: { light: lightId, camera: 'static', view: 'hero-3q', atmosphere: 'clean' }, end: { light: lightId, camera: 'micro-drift', view: 'hero-3q', atmosphere: 'clean' },
      })),
  },
  {
    id: 'lens-test-6', name: 'Lens Test', eyebrow: '6 SHOTS', description: '18, 24, 35, 50, 85, and 105 macro under stable conditions.', required: [],
    shots: ['18mm', '24mm', '35mm', '50mm', '85mm', '105mm-macro'].map((lensId) =>
      shot(lensId === '105mm-macro' ? '105 mm Macro' : lensId.replace('mm', ' mm'), 'hero-authority', {
        duration: 52, start: { lens: lensId, camera: 'static', view: lensId === '105mm-macro' ? 'detail' : 'hero-3q', focus: lensId === '105mm-macro' ? 'macro' : 'deep' },
        end: { lens: lensId, camera: 'micro-drift', view: lensId === '105mm-macro' ? 'macro-3q' : 'hero-3q', focus: lensId === '105mm-macro' ? 'hero-detail' : 'deep' },
      })),
  },
  {
    id: 'shader-lookdev-reel-8', name: 'Shader / Lookdev Reel', eyebrow: '8 SHOTS', description: 'Controlled worlds, lenses, focus states, lights, and grades for material evaluation.', required: ['managedLighting', 'postFx'],
    shots: [
      shot('Dark Neutral 35', 'hero-authority', { duration: 56, start: { environment: 'dark-cyclorama', light: 'studio-soft', lens: '35mm', focus: 'deep', atmosphere: 'clean' }, end: { environment: 'dark-cyclorama', light: 'studio-soft', lens: '35mm', focus: 'deep', atmosphere: 'clean' } }),
      shot('White Beauty 50', 'hero-authority', { duration: 56, start: { environment: 'white-limbo', light: 'beauty-strip', lens: '50mm', focus: 'deep', atmosphere: 'soft' }, end: { environment: 'white-limbo', light: 'beauty-strip', lens: '50mm', focus: 'deep', atmosphere: 'soft' } }),
      shot('Black Duo Rim 85', 'obsidian-monolith', { duration: 56, start: { environment: 'black-limbo', light: 'duo-rim', lens: '85mm', focus: 'shallow', atmosphere: 'contrast' }, end: { environment: 'black-limbo', light: 'duo-rim', lens: '85mm', focus: 'shallow', atmosphere: 'contrast' } }),
      shot('Grey Hard Light', 'edge-study', { duration: 56, start: { environment: 'grey-limbo', light: 'hard-light', lens: '50mm', focus: 'point-focus', atmosphere: 'cool' }, end: { environment: 'grey-limbo', light: 'hard-light', lens: '50mm', focus: 'point-focus', atmosphere: 'cool' } }),
      shot('HDRI Reflection', 'hero-authority', { duration: 60, start: { environment: 'hdri-world', light: 'three-point', lens: '50mm', focus: 'deep', atmosphere: 'clean' }, end: { environment: 'hdri-world', light: 'portal', lens: '50mm', focus: 'deep', atmosphere: 'clean' } }),
      shot('Macro Surface', 'macro-trace', { duration: 64, start: { environment: 'dark-cyclorama', light: 'beauty-strip', lens: '105mm-macro', focus: 'macro', atmosphere: 'contrast' }, end: { environment: 'dark-cyclorama', light: 'side-rim', lens: '105mm-macro', focus: 'hero-detail', atmosphere: 'bloom' } }),
      shot('Warm Product Read', 'hero-authority', { duration: 56, start: { environment: 'dark-cyclorama', light: 'three-point', lens: '50mm', focus: 'deep', atmosphere: 'warm' }, end: { environment: 'dark-cyclorama', light: 'beauty-strip', lens: '85mm', focus: 'shallow', atmosphere: 'warm' } }),
      shot('Cool Closing Hold', 'closing-hold', { duration: 68, start: { environment: 'black-limbo', light: 'side-rim', lens: '85mm', focus: 'shallow', atmosphere: 'cool' }, end: { environment: 'dark-cyclorama', light: 'studio-soft', lens: '50mm', focus: 'deep', atmosphere: 'clean' } }),
    ],
  },
  {
    id: 'technical-breakdown-5', name: 'Technical Breakdown', eyebrow: '5 SHOTS', description: 'Orthographic, profile, exploded, detail, and closing study.', required: ['motionBasic'],
    shots: [
      shot('Orthographic Front', 'orthographic-breakdown', { duration: 56, start: { view: 'orthographic', motion: 'none' }, end: { view: 'orthographic', motion: 'none' } }),
      shot('Profile', 'orthographic-breakdown', { duration: 56, start: { view: 'profile', rotation: '90deg', motion: 'none' }, end: { view: 'profile', rotation: '90deg', motion: 'none' } }),
      shot('Exploded', 'exploded-study', { duration: 72 }),
      shot('Detail Construction', 'edge-study', { duration: 60, start: { view: 'detail', focus: 'point-focus' }, end: { view: 'macro-3q', focus: 'hero-detail' } }),
      shot('Technical Closing', 'closing-hold', { duration: 64, start: { environment: 'grey-limbo', atmosphere: 'clean' }, end: { environment: 'dark-cyclorama', atmosphere: 'clean' } }),
    ],
  },
  {
    id: 'graphic-motion-5', name: 'Graphic Motion', eyebrow: '5 SHOTS', description: 'Clone, pattern, vortex, stack, and clean closing.', required: ['motionGraphic', 'atmosphereProcedural'],
    shots: [
      shot('Hero Clones', 'vortex-array', { duration: 62, start: { motion: 'hero-clones' }, end: { motion: 'hero-clones' } }),
      shot('Pattern', 'pattern-field', { duration: 62, start: { motion: 'pattern' }, end: { motion: 'pattern' } }),
      shot('Vortex', 'vortex-array', { duration: 74, start: { motion: 'spiral' }, end: { motion: 'vortex' } }),
      shot('Stack', 'pattern-field', { duration: 68, start: { motion: 'stack' }, end: { motion: 'wave' } }),
      shot('Graphic Closing', 'closing-hold', { duration: 64, start: { motion: 'dispersion', atmosphere: 'orbital-dust' }, end: { motion: 'none', atmosphere: 'clean' } }),
    ],
  },
];

export function sequencePreset(id) { return SEQUENCE_PRESETS.find((preset) => preset.id === id) || SEQUENCE_PRESETS[0]; }
export function availableSequencePresets() { return SEQUENCE_PRESETS.filter((preset) => hasCapabilities(preset.required)); }

export function createSequencePlan(presetId) {
  const preset = sequencePreset(presetId);
  return {
    presetId: preset.id,
    name: preset.name,
    description: preset.description,
    available: hasCapabilities(preset.required),
    required: [...preset.required],
    shots: preset.shots.map((entry, index) => ({ index, name: entry.name, durationFrames: entry.duration, presetId: entry.presetId })),
    durationFrames: preset.shots.reduce((sum, entry) => sum + entry.duration, 0),
  };
}

export function buildSequencePreset(project, presetId, { replace = true, seed = 49000 } = {}) {
  const preset = sequencePreset(presetId);
  if (!hasCapabilities(preset.required)) throw new Error(`Sequence preset requires: ${preset.required.join(', ')}`);
  if (replace) {
    project.sequence.clips = [];
    project.sequence.activeClipId = null;
  }
  let cursor = replace ? 0 : project.sequence.clips.reduce((max, clip) => Math.max(max, clip.startFrame + clip.durationFrames), 0);
  const createdShots = [];
  const createdClips = [];
  preset.shots.forEach((definition, index) => {
    const id = uid('shot');
    const created = makeShotFromPreset(definition.presetId, { id, name: definition.name, seed: seed + index * 137 });
    if (definition.familyId) created.familyId = definition.familyId;
    created.start = { ...created.start, ...copy(definition.start) };
    created.end = { ...created.end, ...copy(definition.end) };
    created.durationFrames = definition.duration;
    created.deltaCount = Object.keys(created.start).filter((axis) => created.start[axis] !== created.end[axis]).length;
    project.shots.byId[id] = created;
    project.shots.order.push(id);
    const clip = {
      id: uid('clip'), shotId: id, detachedShot: null, linked: true, trackId: 'v1', startFrame: cursor,
      durationFrames: definition.duration, sourceOffsetFrames: 0, speed: 1, easing: 'ease-in-out', name: definition.name,
    };
    project.sequence.clips.push(clip);
    cursor += definition.duration;
    createdShots.push(created);
    createdClips.push(clip);
  });
  project.sequence.name = preset.name;
  project.sequence.presetId = preset.id;
  project.sequence.activeClipId = createdClips[0]?.id || null;
  project.shots.activeId = createdShots[0]?.id || project.shots.activeId;
  return { preset, shots: createdShots, clips: createdClips };
}
