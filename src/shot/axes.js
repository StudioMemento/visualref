export const AXIS_IDS = [
  'light',
  'camera',
  'lens',
  'focus',
  'composition',
  'scale',
  'rotation',
  'view',
  'motion',
  'environment',
  'atmosphere',
];

const option = (id, label, hint = '', capability = null) => [id, label, { hint, capability }];

export const AXES = {
  light: {
    index: '01', label: 'Light', short: 'LIGHT', description: 'Lighting recipe and time-aware behavior.',
    options: [
      option('studio-soft', 'Studio Soft', 'Large soft source with readable fill.'),
      option('three-point', 'Three Point', 'Balanced key, fill and rim.'),
      option('beauty-strip', 'Beauty Strip', 'Long highlight designed for product surfaces.'),
      option('side-rim', 'Side Rim', 'Strong edge separation from one side.'),
      option('duo-rim', 'Duo Rim', 'Two controlled opposing rims.'),
      option('top-light', 'Top Light', 'Graphic overhead source.'),
      option('bottom-accent', 'Bottom Accent', 'Subtle upward edge accent.'),
      option('backlight', 'Backlight', 'Silhouette-first back source.'),
      option('gradient', 'Gradient', 'Soft directional gradient across the Hero.'),
      option('spotlight', 'Spotlight', 'Focused key with deep falloff.'),
      option('penumbra', 'Penumbra', 'Soft-edged dramatic source.'),
      option('hard-light', 'Hard Light', 'Small source and crisp contrast.'),
      option('portal', 'Portal', 'Broad frontal portal reflection.'),
      option('rim-sweep', 'Rim Sweep', 'Clock-driven edge sweep.'),
      option('pulse', 'Pulse', 'Deterministic intensity pulse.'),
    ],
  },
  camera: {
    index: '02', label: 'Camera', short: 'CAM', description: 'Camera movement behavior.',
    options: [
      option('static', 'Static', 'Locked camera.'),
      option('micro-drift', 'Micro Drift', 'Very small cinematic drift.'),
      option('push-in', 'Push In', 'Controlled dolly toward the Hero.'),
      option('pull-out', 'Pull Out', 'Controlled dolly away from the Hero.'),
      option('orbit-left', 'Orbit Left', 'Arc around the Hero to camera left.'),
      option('orbit-right', 'Orbit Right', 'Arc around the Hero to camera right.'),
      option('track-left', 'Track Left', 'Lateral move to the left.'),
      option('track-right', 'Track Right', 'Lateral move to the right.'),
      option('crane-up', 'Crane Up', 'Lift the camera during the shot.'),
      option('crane-down', 'Crane Down', 'Lower the camera during the shot.'),
      option('pan-left', 'Pan Left', 'Pan across the Hero without dolly.'),
      option('pan-right', 'Pan Right', 'Pan across the Hero without dolly.'),
      option('dolly-zoom', 'Dolly Zoom', 'Opposing distance and focal change.'),
      option('handheld-subtle', 'Handheld Subtle', 'Restrained deterministic hand-held motion.'),
    ],
  },
  lens: {
    index: '03', label: 'Lens', short: 'LENS', description: 'Focal character and projection.',
    options: [
      option('18mm', '18 mm', 'Ultra-wide spatial perspective.'),
      option('24mm', '24 mm', 'Wide cinematic lens.'),
      option('35mm', '35 mm', 'Natural wide product lens.'),
      option('50mm', '50 mm', 'Neutral perspective.'),
      option('85mm', '85 mm', 'Compressed portrait character.'),
      option('105mm-macro', '105 mm Macro', 'Macro compression and detail.'),
      option('200mm', '200 mm', 'Long-lens compression.'),
      option('tilt-shift', 'Tilt-Shift', 'Flattened architectural projection.'),
    ],
  },
  focus: {
    index: '04', label: 'Focus', short: 'FOCUS', description: 'Focus target and depth behavior.',
    options: [
      option('deep', 'Full / Deep', 'Whole product remains readable.'),
      option('shallow', 'Shallow', 'Thin focal range around the target.'),
      option('point-focus', 'Point Focus', 'Use the selected surface focus point.'),
      option('front-plane', 'Front Plane', 'Prioritize the front face.'),
      option('center-mass', 'Center Mass', 'Focus around the Hero center.'),
      option('hero-detail', 'Hero Detail', 'Focus on a high-value detail area.'),
      option('rack-near-far', 'Rack Near→Far', 'Animate focus from near to far.'),
      option('rack-far-near', 'Rack Far→Near', 'Animate focus from far to near.'),
      option('macro', 'Macro', 'Very shallow macro focus.'),
      option('offset', 'Offset', 'Focus slightly away from center.'),
    ],
  },
  composition: {
    index: '05', label: 'Composition', short: 'COMP', description: 'Hero placement inside frame.',
    options: [
      option('centered', 'Centered'),
      option('symmetry', 'Symmetry'),
      option('left-third', 'Left Third'),
      option('right-third', 'Right Third'),
      option('negative-left', 'Negative Left'),
      option('negative-right', 'Negative Right'),
      option('low-frame', 'Low Frame'),
      option('high-frame', 'High Frame'),
      option('diagonal', 'Diagonal'),
    ],
  },
  scale: {
    index: '06', label: 'Scale', short: 'SCALE', description: 'Hero occupancy in frame.',
    options: [
      option('very-small', 'Very Small'),
      option('small', 'Small'),
      option('medium', 'Medium'),
      option('large', 'Large'),
      option('tight', 'Tight'),
      option('off-scale', 'Macro / Off Scale'),
    ],
  },
  rotation: {
    index: '07', label: 'Rotation', short: 'ROT', description: 'Hero attitude and turntable behavior.',
    options: [
      option('0deg', '0°'),
      option('left15', 'Left 15°'),
      option('right15', 'Right 15°'),
      option('left45', 'Left 45°'),
      option('right45', 'Right 45°'),
      option('90deg', '90°'),
      option('135deg', '135°'),
      option('180deg', '180°'),
      option('turntable-left', 'Turntable Left'),
      option('turntable-right', 'Turntable Right'),
    ],
  },
  view: {
    index: '08', label: 'View', short: 'VIEW', description: 'Camera angle and viewpoint.',
    options: [
      option('hero-3q', 'Hero ¾'),
      option('front', 'Front'),
      option('rear-3q', 'Rear ¾'),
      option('profile', 'Profile'),
      option('low', 'Low'),
      option('high', 'High'),
      option('top', 'Top'),
      option('zenith', 'Zenith'),
      option('detail', 'Detail'),
      option('macro-3q', 'Macro ¾'),
      option('orthographic', 'Orthographic'),
    ],
  },
  motion: {
    index: '09', label: 'Motion', short: 'MOTION', description: 'Hero, clone, and graphic motion design.',
    options: [
      option('none', 'None'),
      option('product-float', 'Product Float'),
      option('product-turn', 'Product Turn'),
      option('exploded', 'Exploded'),
      option('hero-clones', 'Hero + Clones'),
      option('pattern', 'Pattern'),
      option('spiral', 'Spiral'),
      option('vortex', 'Vortex'),
      option('kaleidoscope', 'Kaleidoscope'),
      option('multi-axis', 'Multi-axis'),
      option('stack', 'Stack'),
      option('satellites', 'Satellites'),
      option('wave', 'Wave'),
      option('dispersion', 'Dispersion'),
    ],
  },
  environment: {
    index: '10', label: 'Environment', short: 'WORLD', description: 'Stage and visible background.',
    options: [
      option('dark-cyclorama', 'Dark Grey Cyclorama 360'),
      option('grey-limbo', 'Grey Limbo'),
      option('white-limbo', 'White Limbo'),
      option('black-limbo', 'Black Limbo'),
      option('plane', 'Plane'),
      option('void', 'Void'),
      option('hdri-world', 'HDRI World'),
      option('imported-set', 'Imported Set'),
    ],
  },
  atmosphere: {
    index: '11', label: 'Atmosphere', short: 'ATMOS', description: 'Grade, bloom, haze, and final image mood.',
    options: [
      option('clean', 'Clean'),
      option('warm', 'Warm'),
      option('cool', 'Cool'),
      option('soft', 'Soft'),
      option('contrast', 'Contrast'),
      option('nocturne', 'Nocturne'),
      option('bloom', 'Bloom'),
      option('haze', 'Haze'),
      option('particles', 'Particles'),
      option('curl-flow', 'Curl Flow'),
      option('spark-burst', 'Spark Burst'),
      option('orbital-dust', 'Orbital Dust'),
      option('data-rain', 'Data Rain'),
    ],
  },
};

export function axisOptions(axisId) {
  return AXES[axisId]?.options || [];
}

export function optionLabel(axisId, optionId) {
  return axisOptions(axisId).find(([id]) => id === optionId)?.[1] || optionId || '—';
}

export function optionMeta(axisId, optionId) {
  return axisOptions(axisId).find(([id]) => id === optionId)?.[2] || {};
}

export function defaultRecipe() {
  return {
    light: 'studio-soft',
    camera: 'static',
    lens: '50mm',
    focus: 'deep',
    composition: 'centered',
    scale: 'medium',
    rotation: '0deg',
    view: 'hero-3q',
    motion: 'none',
    environment: 'dark-cyclorama',
    atmosphere: 'clean',
  };
}
