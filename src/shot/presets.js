import { defaultRecipe } from './axes.js';

const recipe = (overrides = {}) => ({ ...defaultRecipe(), ...overrides });
const family = (id, label, description, pools) => ({ id, label, description, pools });

export const FAMILIES = {
  hero: family('hero', 'Hero', 'Make the product feel inevitable.', {
    light: ['studio-soft', 'three-point', 'beauty-strip', 'side-rim', 'duo-rim', 'portal'],
    camera: ['static', 'micro-drift', 'push-in', 'pull-out', 'orbit-left', 'orbit-right'],
    lens: ['35mm', '50mm', '85mm'],
    focus: ['deep', 'shallow', 'center-mass', 'point-focus'],
    composition: ['centered', 'symmetry', 'left-third', 'right-third', 'negative-left', 'negative-right'],
    scale: ['small', 'medium', 'large', 'tight'],
    rotation: ['0deg', 'left15', 'right15', 'left45', 'right45'],
    view: ['hero-3q', 'front', 'rear-3q', 'low', 'high'],
    motion: ['none', 'product-float', 'product-turn'],
    environment: ['dark-cyclorama', 'grey-limbo', 'white-limbo', 'black-limbo', 'hdri-world'],
    atmosphere: ['clean', 'warm', 'cool', 'soft', 'contrast', 'nocturne', 'bloom'],
  }),
  reveal: family('reveal', 'Reveal', 'Build the image from darkness into clarity.', {
    light: ['backlight', 'side-rim', 'duo-rim', 'rim-sweep', 'beauty-strip', 'three-point'],
    camera: ['static', 'push-in', 'micro-drift', 'orbit-left', 'orbit-right'],
    lens: ['35mm', '50mm', '85mm', '105mm-macro'],
    focus: ['shallow', 'rack-near-far', 'rack-far-near', 'hero-detail', 'deep'],
    composition: ['centered', 'symmetry', 'left-third', 'right-third', 'diagonal'],
    scale: ['medium', 'large', 'tight'],
    rotation: ['0deg', 'left15', 'right15', 'left45', 'right45'],
    view: ['hero-3q', 'front', 'profile', 'detail', 'macro-3q'],
    motion: ['none', 'product-float', 'product-turn'],
    environment: ['dark-cyclorama', 'black-limbo', 'grey-limbo', 'void'],
    atmosphere: ['nocturne', 'contrast', 'bloom', 'haze', 'clean', 'warm'],
  }),
  detail: family('detail', 'Detail', 'Let material and craft carry the shot.', {
    light: ['beauty-strip', 'side-rim', 'top-light', 'hard-light', 'portal', 'penumbra'],
    camera: ['static', 'push-in', 'track-left', 'track-right', 'micro-drift'],
    lens: ['85mm', '105mm-macro', '200mm', '50mm'],
    focus: ['hero-detail', 'macro', 'point-focus', 'shallow', 'rack-near-far', 'rack-far-near'],
    composition: ['centered', 'left-third', 'right-third', 'diagonal', 'high-frame', 'low-frame'],
    scale: ['large', 'tight', 'off-scale'],
    rotation: ['0deg', 'left15', 'right15', 'left45', 'right45'],
    view: ['detail', 'macro-3q', 'profile', 'top', 'hero-3q'],
    motion: ['none', 'product-float', 'product-turn'],
    environment: ['dark-cyclorama', 'black-limbo', 'grey-limbo', 'void', 'white-limbo'],
    atmosphere: ['clean', 'soft', 'contrast', 'warm', 'cool', 'bloom', 'haze'],
  }),
  motion: family('motion', 'Motion', 'Direct camera and Hero movement with one readable curve.', {
    light: ['three-point', 'side-rim', 'duo-rim', 'gradient', 'rim-sweep', 'pulse'],
    camera: ['orbit-left', 'orbit-right', 'push-in', 'pull-out', 'track-left', 'track-right', 'crane-up', 'crane-down', 'dolly-zoom', 'handheld-subtle'],
    lens: ['24mm', '35mm', '50mm', '85mm'],
    focus: ['deep', 'center-mass', 'point-focus', 'shallow'],
    composition: ['centered', 'left-third', 'right-third', 'negative-left', 'negative-right', 'diagonal'],
    scale: ['small', 'medium', 'large', 'tight'],
    rotation: ['0deg', 'left15', 'right15', 'turntable-left', 'turntable-right'],
    view: ['hero-3q', 'front', 'rear-3q', 'profile', 'low', 'high'],
    motion: ['none', 'product-float', 'product-turn', 'multi-axis', 'wave'],
    environment: ['dark-cyclorama', 'grey-limbo', 'white-limbo', 'black-limbo', 'hdri-world'],
    atmosphere: ['clean', 'warm', 'cool', 'contrast', 'bloom', 'orbital-dust'],
  }),
  technical: family('technical', 'Technical', 'Inspect construction, silhouette, and proportion.', {
    light: ['studio-soft', 'three-point', 'top-light', 'hard-light', 'gradient'],
    camera: ['static', 'track-left', 'track-right', 'crane-up'],
    lens: ['35mm', '50mm', '85mm', 'tilt-shift'],
    focus: ['deep', 'center-mass', 'point-focus'],
    composition: ['centered', 'symmetry', 'left-third', 'right-third'],
    scale: ['small', 'medium', 'large', 'tight'],
    rotation: ['0deg', '90deg', '135deg', '180deg', 'turntable-left', 'turntable-right'],
    view: ['front', 'profile', 'top', 'zenith', 'orthographic', 'detail'],
    motion: ['none', 'exploded', 'product-turn'],
    environment: ['grey-limbo', 'white-limbo', 'dark-cyclorama', 'void'],
    atmosphere: ['clean', 'soft', 'contrast', 'cool'],
  }),
  graphic: family('graphic', 'Graphic', 'Turn the Hero into a controlled visual system.', {
    light: ['gradient', 'hard-light', 'backlight', 'duo-rim', 'pulse', 'portal'],
    camera: ['static', 'micro-drift', 'push-in', 'orbit-left', 'orbit-right'],
    lens: ['18mm', '24mm', '35mm', '50mm', '85mm'],
    focus: ['deep', 'shallow', 'point-focus'],
    composition: ['centered', 'symmetry', 'diagonal', 'negative-left', 'negative-right'],
    scale: ['very-small', 'small', 'medium', 'large', 'tight'],
    rotation: ['0deg', 'left45', 'right45', '90deg', 'turntable-left', 'turntable-right'],
    view: ['front', 'hero-3q', 'profile', 'top', 'orthographic'],
    motion: ['hero-clones', 'pattern', 'spiral', 'vortex', 'kaleidoscope', 'stack', 'satellites', 'wave', 'dispersion'],
    environment: ['black-limbo', 'void', 'white-limbo', 'dark-cyclorama'],
    atmosphere: ['contrast', 'bloom', 'particles', 'curl-flow', 'spark-burst', 'orbital-dust', 'data-rain', 'nocturne'],
  }),
  closing: family('closing', 'Closing', 'Resolve the curve with clarity and hold.', {
    light: ['studio-soft', 'beauty-strip', 'side-rim', 'backlight', 'portal'],
    camera: ['static', 'pull-out', 'micro-drift', 'crane-up'],
    lens: ['35mm', '50mm', '85mm'],
    focus: ['deep', 'center-mass', 'hero-detail', 'shallow'],
    composition: ['centered', 'symmetry', 'left-third', 'right-third', 'negative-left', 'negative-right'],
    scale: ['small', 'medium', 'large', 'tight'],
    rotation: ['0deg', 'left15', 'right15', 'left45', 'right45'],
    view: ['hero-3q', 'front', 'rear-3q', 'profile'],
    motion: ['none', 'product-float', 'product-turn'],
    environment: ['dark-cyclorama', 'grey-limbo', 'black-limbo', 'white-limbo', 'hdri-world'],
    atmosphere: ['clean', 'warm', 'cool', 'soft', 'contrast', 'nocturne', 'bloom'],
  }),
};

export const PRESETS = [
  {
    id: 'hero-authority', familyId: 'hero', label: 'Hero Authority', index: '01', description: 'Balanced authority with a controlled push.',
    durationFrames: 96, deltaCount: 3,
    start: recipe({ light: 'studio-soft', camera: 'static', lens: '50mm', focus: 'deep', composition: 'centered', scale: 'medium', rotation: 'left15', view: 'hero-3q', environment: 'dark-cyclorama', atmosphere: 'clean' }),
    end: recipe({ light: 'beauty-strip', camera: 'push-in', lens: '85mm', focus: 'hero-detail', composition: 'symmetry', scale: 'large', rotation: 'left15', view: 'hero-3q', environment: 'dark-cyclorama', atmosphere: 'warm' }),
  },
  {
    id: 'obsidian-monolith', familyId: 'hero', label: 'Obsidian Monolith', index: '02', description: 'Low, centered, and carved from darkness.',
    durationFrames: 108, deltaCount: 4,
    start: recipe({ light: 'backlight', camera: 'static', lens: '35mm', focus: 'deep', composition: 'centered', scale: 'small', rotation: '0deg', view: 'low', environment: 'black-limbo', atmosphere: 'nocturne' }),
    end: recipe({ light: 'duo-rim', camera: 'micro-drift', lens: '50mm', focus: 'center-mass', composition: 'symmetry', scale: 'medium', rotation: 'right15', view: 'low', environment: 'dark-cyclorama', atmosphere: 'contrast' }),
  },
  {
    id: 'light-curtain', familyId: 'reveal', label: 'Light Curtain', index: '01', description: 'A rim sweep resolves into a clean hero read.',
    durationFrames: 104, deltaCount: 5,
    start: recipe({ light: 'backlight', camera: 'static', lens: '50mm', focus: 'shallow', composition: 'centered', scale: 'medium', rotation: 'right45', view: 'hero-3q', motion: 'none', environment: 'black-limbo', atmosphere: 'nocturne' }),
    end: recipe({ light: 'rim-sweep', camera: 'push-in', lens: '85mm', focus: 'deep', composition: 'symmetry', scale: 'large', rotation: 'right15', view: 'hero-3q', motion: 'product-float', environment: 'dark-cyclorama', atmosphere: 'bloom' }),
  },
  {
    id: 'material-wake', familyId: 'reveal', label: 'Material Wake', index: '02', description: 'Macro focus leads the eye into a full reveal.',
    durationFrames: 96, deltaCount: 4,
    start: recipe({ light: 'side-rim', camera: 'static', lens: '105mm-macro', focus: 'macro', composition: 'right-third', scale: 'off-scale', rotation: 'left45', view: 'detail', environment: 'void', atmosphere: 'contrast' }),
    end: recipe({ light: 'beauty-strip', camera: 'pull-out', lens: '50mm', focus: 'deep', composition: 'centered', scale: 'medium', rotation: 'left15', view: 'hero-3q', environment: 'dark-cyclorama', atmosphere: 'clean' }),
  },
  {
    id: 'macro-trace', familyId: 'detail', label: 'Macro Trace', index: '01', description: 'A shallow track across the Hero detail.',
    durationFrames: 88, deltaCount: 4,
    start: recipe({ light: 'beauty-strip', camera: 'track-left', lens: '105mm-macro', focus: 'rack-near-far', composition: 'left-third', scale: 'off-scale', rotation: 'left15', view: 'macro-3q', environment: 'black-limbo', atmosphere: 'contrast' }),
    end: recipe({ light: 'side-rim', camera: 'track-right', lens: '105mm-macro', focus: 'rack-far-near', composition: 'right-third', scale: 'off-scale', rotation: 'right15', view: 'detail', environment: 'black-limbo', atmosphere: 'bloom' }),
  },
  {
    id: 'edge-study', familyId: 'detail', label: 'Edge Study', index: '02', description: 'Hard edge definition with compressed perspective.',
    durationFrames: 84, deltaCount: 3,
    start: recipe({ light: 'hard-light', camera: 'static', lens: '200mm', focus: 'point-focus', composition: 'diagonal', scale: 'tight', rotation: 'right45', view: 'profile', environment: 'grey-limbo', atmosphere: 'cool' }),
    end: recipe({ light: 'penumbra', camera: 'micro-drift', lens: '85mm', focus: 'hero-detail', composition: 'centered', scale: 'large', rotation: 'right15', view: 'detail', environment: 'dark-cyclorama', atmosphere: 'soft' }),
  },
  {
    id: 'orbit-ledger', familyId: 'motion', label: 'Orbit Ledger', index: '01', description: 'A disciplined orbit with stable product scale.',
    durationFrames: 120, deltaCount: 4,
    start: recipe({ light: 'three-point', camera: 'orbit-left', lens: '35mm', focus: 'deep', composition: 'centered', scale: 'medium', rotation: '0deg', view: 'front', motion: 'product-float', environment: 'dark-cyclorama', atmosphere: 'clean' }),
    end: recipe({ light: 'duo-rim', camera: 'orbit-right', lens: '50mm', focus: 'center-mass', composition: 'symmetry', scale: 'medium', rotation: 'right15', view: 'rear-3q', motion: 'product-turn', environment: 'dark-cyclorama', atmosphere: 'contrast' }),
  },
  {
    id: 'dolly-pressure', familyId: 'motion', label: 'Dolly Pressure', index: '02', description: 'Perspective pressure without losing the Hero.',
    durationFrames: 108, deltaCount: 4,
    start: recipe({ light: 'gradient', camera: 'dolly-zoom', lens: '24mm', focus: 'deep', composition: 'negative-left', scale: 'small', rotation: 'left15', view: 'low', motion: 'none', environment: 'grey-limbo', atmosphere: 'cool' }),
    end: recipe({ light: 'pulse', camera: 'push-in', lens: '85mm', focus: 'shallow', composition: 'centered', scale: 'large', rotation: 'right15', view: 'hero-3q', motion: 'multi-axis', environment: 'dark-cyclorama', atmosphere: 'bloom' }),
  },
  {
    id: 'orthographic-breakdown', familyId: 'technical', label: 'Orthographic Breakdown', index: '01', description: 'Clean construction study with precise views.',
    durationFrames: 96, deltaCount: 4,
    start: recipe({ light: 'studio-soft', camera: 'static', lens: 'tilt-shift', focus: 'deep', composition: 'centered', scale: 'medium', rotation: '0deg', view: 'orthographic', motion: 'none', environment: 'white-limbo', atmosphere: 'clean' }),
    end: recipe({ light: 'hard-light', camera: 'track-right', lens: '50mm', focus: 'point-focus', composition: 'symmetry', scale: 'large', rotation: '90deg', view: 'profile', motion: 'exploded', environment: 'grey-limbo', atmosphere: 'contrast' }),
  },
  {
    id: 'exploded-study', familyId: 'technical', label: 'Exploded Study', index: '02', description: 'A readable construction reveal with no simulation noise.',
    durationFrames: 112, deltaCount: 5,
    start: recipe({ light: 'top-light', camera: 'crane-up', lens: '35mm', focus: 'deep', composition: 'centered', scale: 'medium', rotation: '0deg', view: 'front', motion: 'none', environment: 'void', atmosphere: 'cool' }),
    end: recipe({ light: 'three-point', camera: 'static', lens: '50mm', focus: 'deep', composition: 'centered', scale: 'large', rotation: '135deg', view: 'high', motion: 'exploded', environment: 'grey-limbo', atmosphere: 'clean' }),
  },
  {
    id: 'vortex-array', familyId: 'graphic', label: 'Vortex Array', index: '01', description: 'Graphic repetition around a readable center Hero.',
    durationFrames: 120, deltaCount: 5,
    start: recipe({ light: 'gradient', camera: 'static', lens: '24mm', focus: 'deep', composition: 'centered', scale: 'small', rotation: '0deg', view: 'front', motion: 'hero-clones', environment: 'void', atmosphere: 'particles' }),
    end: recipe({ light: 'pulse', camera: 'orbit-right', lens: '35mm', focus: 'point-focus', composition: 'symmetry', scale: 'medium', rotation: 'turntable-right', view: 'hero-3q', motion: 'vortex', environment: 'black-limbo', atmosphere: 'orbital-dust' }),
  },
  {
    id: 'pattern-field', familyId: 'graphic', label: 'Pattern Field', index: '02', description: 'A clean pattern system with a cinematic closing move.',
    durationFrames: 108, deltaCount: 4,
    start: recipe({ light: 'hard-light', camera: 'micro-drift', lens: '35mm', focus: 'deep', composition: 'diagonal', scale: 'very-small', rotation: 'left45', view: 'orthographic', motion: 'pattern', environment: 'white-limbo', atmosphere: 'data-rain' }),
    end: recipe({ light: 'duo-rim', camera: 'push-in', lens: '50mm', focus: 'shallow', composition: 'centered', scale: 'large', rotation: 'right45', view: 'front', motion: 'stack', environment: 'black-limbo', atmosphere: 'bloom' }),
  },
  {
    id: 'closing-hold', familyId: 'closing', label: 'Closing Hold', index: '01', description: 'Resolve on a stable, premium final image.',
    durationFrames: 84, deltaCount: 3,
    start: recipe({ light: 'side-rim', camera: 'pull-out', lens: '35mm', focus: 'hero-detail', composition: 'right-third', scale: 'large', rotation: 'right15', view: 'hero-3q', motion: 'product-turn', environment: 'black-limbo', atmosphere: 'contrast' }),
    end: recipe({ light: 'studio-soft', camera: 'static', lens: '50mm', focus: 'deep', composition: 'centered', scale: 'medium', rotation: '0deg', view: 'front', motion: 'none', environment: 'dark-cyclorama', atmosphere: 'clean' }),
  },
  {
    id: 'silhouette-close', familyId: 'closing', label: 'Silhouette Close', index: '02', description: 'A restrained silhouette that keeps the logo read.',
    durationFrames: 88, deltaCount: 3,
    start: recipe({ light: 'portal', camera: 'micro-drift', lens: '85mm', focus: 'shallow', composition: 'negative-left', scale: 'large', rotation: 'left15', view: 'rear-3q', motion: 'product-float', environment: 'dark-cyclorama', atmosphere: 'warm' }),
    end: recipe({ light: 'backlight', camera: 'static', lens: '85mm', focus: 'center-mass', composition: 'symmetry', scale: 'tight', rotation: '0deg', view: 'front', motion: 'none', environment: 'black-limbo', atmosphere: 'nocturne' }),
  },
];

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id) || PRESETS[0];
}

export function getFamily(id) {
  return FAMILIES[id] || FAMILIES.hero;
}

export function presetsForFamily(familyId) {
  return PRESETS.filter((preset) => preset.familyId === familyId);
}
