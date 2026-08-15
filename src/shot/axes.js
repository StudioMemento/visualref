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

export const AXES = {
  light: {
    label: 'Light', short: 'LIGHT', description: 'Shape, direction and contrast.',
    options: [
      ['softbox', 'Softbox'], ['rim', 'Rim'], ['split', 'Split'], ['top', 'Top'],
      ['silhouette', 'Silhouette'], ['daylight', 'Daylight'], ['flat', 'Studio flat'],
    ],
  },
  camera: {
    label: 'Camera', short: 'CAM', description: 'Where the camera stands.',
    options: [
      ['hero-3q', 'Hero ¾'], ['front', 'Front'], ['rear-3q', 'Rear ¾'], ['side', 'Side'],
      ['low', 'Low'], ['top', 'Top'], ['detail', 'Detail'],
    ],
  },
  lens: {
    label: 'Lens', short: 'LENS', description: 'Perspective and compression.',
    options: [
      ['wide24', '24 mm'], ['cinema35', '35 mm'], ['natural50', '50 mm'],
      ['portrait85', '85 mm'], ['macro105', '105 mm'],
    ],
  },
  focus: {
    label: 'Focus', short: 'FOCUS', description: 'What reads first.',
    options: [
      ['full', 'Full product'], ['front', 'Front plane'], ['center', 'Center mass'],
      ['label', 'Hero detail'], ['shallow', 'Shallow'], ['deep', 'Deep'],
    ],
  },
  composition: {
    label: 'Composition', short: 'COMP', description: 'Placement inside frame.',
    options: [
      ['center', 'Centered'], ['thirds-left', 'Left third'], ['thirds-right', 'Right third'],
      ['symmetry', 'Symmetry'], ['negative-left', 'Negative left'],
      ['negative-right', 'Negative right'], ['diagonal', 'Diagonal'],
    ],
  },
  scale: {
    label: 'Scale', short: 'SCALE', description: 'How much frame the Hero owns.',
    options: [['wide', 'Wide'], ['balanced', 'Balanced'], ['tight', 'Tight'], ['macro', 'Macro']],
  },
  rotation: {
    label: 'Rotation', short: 'ROT', description: 'Hero attitude around world zero.',
    options: [
      ['neutral', 'Neutral'], ['left15', 'Left 15°'], ['right15', 'Right 15°'],
      ['left35', 'Left 35°'], ['right35', 'Right 35°'],
      ['tilt-left', 'Tilt left'], ['tilt-right', 'Tilt right'],
    ],
  },
  view: {
    label: 'View', short: 'VIEW', description: 'Optical reading of the product.',
    options: [
      ['perspective', 'Perspective'], ['profile', 'Profile'], ['top', 'Top view'],
      ['orthographic', 'Orthographic'], ['detail', 'Detail view'],
    ],
  },
  motion: {
    label: 'Motion', short: 'MOVE', description: 'The movement intention.',
    options: [
      ['still', 'Still'], ['orbit-left', 'Orbit left'], ['orbit-right', 'Orbit right'],
      ['push', 'Push in'], ['pull', 'Pull out'], ['rise', 'Rise'],
      ['slide-left', 'Slide left'], ['slide-right', 'Slide right'],
    ],
  },
  environment: {
    label: 'Environment', short: 'WORLD', description: 'The stage around the Hero.',
    options: [['grey', 'Grey limbo'], ['white', 'White limbo'], ['black', 'Black limbo'], ['void', 'Void']],
  },
  atmosphere: {
    label: 'Atmosphere', short: 'ATMOS', description: 'The final image temperature.',
    options: [
      ['clean', 'Clean'], ['warm', 'Warm'], ['cool', 'Cool'],
      ['contrast', 'Contrast'], ['soft', 'Soft'], ['nocturne', 'Nocturne'],
    ],
  },
};

export function axisOptions(axisId) {
  return AXES[axisId]?.options || [];
}

export function optionLabel(axisId, optionId) {
  return axisOptions(axisId).find(([id]) => id === optionId)?.[1] || optionId || '—';
}

export function defaultRecipe() {
  return {
    light: 'softbox', camera: 'hero-3q', lens: 'natural50', focus: 'full',
    composition: 'center', scale: 'balanced', rotation: 'neutral', view: 'perspective',
    motion: 'still', environment: 'grey', atmosphere: 'clean',
  };
}
