const light = (direction, intensity, color = [1, 1, 1]) => ({ direction, intensity, color });
const rig = (id, label, { lights, ambient = 0.22, rim = 0.35, warmth = 0, specular = 1 } = {}) => ({ id, label, lights, ambient, rim, warmth, specular });

export const LIGHTING_PRESETS = {
  'studio-soft': rig('studio-soft', 'Studio Soft', {
    lights: [
      light([-0.55, 0.72, 0.43], 1.05, [1.00, 0.96, 0.92]),
      light([0.72, 0.34, 0.52], 0.30, [0.86, 0.93, 1.00]),
      light([-0.75, 0.38, -0.55], 0.34, [0.82, 0.90, 1.00]),
      light([0.72, 0.40, -0.54], 0.10, [1.00, 0.76, 0.58]),
    ], ambient: 0.28, rim: 0.28, warmth: 0.04,
  }),
  'three-point': rig('three-point', 'Three Point', {
    lights: [
      light([-0.62, 0.68, 0.38], 1.16, [1.00, 0.92, 0.84]),
      light([0.66, 0.30, 0.56], 0.36, [0.78, 0.88, 1.00]),
      light([0.25, 0.48, -0.84], 0.55, [0.88, 0.94, 1.00]),
      light([-0.28, 0.42, -0.86], 0.15, [1.00, 0.73, 0.52]),
    ], ambient: 0.18, rim: 0.42, warmth: 0.08,
  }),
  'beauty-strip': rig('beauty-strip', 'Beauty Strip', {
    lights: [
      light([-0.88, 0.42, 0.22], 1.20, [1.00, 0.95, 0.90]),
      light([0.78, 0.32, 0.48], 0.22, [0.84, 0.91, 1.00]),
      light([0.68, 0.36, -0.64], 0.46, [1.00, 0.74, 0.50]),
      light([-0.68, 0.40, -0.62], 0.20, [0.76, 0.88, 1.00]),
    ], ambient: 0.17, rim: 0.58, warmth: 0.10, specular: 1.18,
  }),
  'side-rim': rig('side-rim', 'Side Rim', {
    lights: [
      light([-0.90, 0.32, -0.30], 1.18, [0.84, 0.91, 1.00]),
      light([0.52, 0.40, 0.75], 0.18, [1.00, 0.88, 0.76]),
      light([-0.96, 0.18, 0.18], 0.62, [0.75, 0.88, 1.00]),
      light([0.68, 0.32, -0.65], 0.08, [1.00, 0.66, 0.40]),
    ], ambient: 0.10, rim: 0.86, warmth: -0.02,
  }),
  'duo-rim': rig('duo-rim', 'Duo Rim', {
    lights: [
      light([-0.38, 0.60, 0.70], 0.58, [1.00, 0.94, 0.88]),
      light([0.40, 0.52, 0.76], 0.22, [0.86, 0.92, 1.00]),
      light([-0.82, 0.36, -0.44], 0.70, [0.72, 0.86, 1.00]),
      light([0.82, 0.34, -0.45], 0.70, [1.00, 0.66, 0.40]),
    ], ambient: 0.10, rim: 0.92, warmth: 0.02,
  }),
  'top-light': rig('top-light', 'Top Light', {
    lights: [
      light([0.04, 0.99, 0.10], 1.28, [1.00, 0.95, 0.88]),
      light([0.48, 0.32, 0.81], 0.18, [0.82, 0.91, 1.00]),
      light([-0.58, 0.35, -0.74], 0.32, [0.78, 0.90, 1.00]),
      light([0.68, 0.28, -0.68], 0.14, [1.00, 0.72, 0.46]),
    ], ambient: 0.15, rim: 0.38,
  }),
  'bottom-accent': rig('bottom-accent', 'Bottom Accent', {
    lights: [
      light([-0.45, 0.62, 0.64], 0.78, [1.00, 0.94, 0.88]),
      light([0.48, 0.32, 0.80], 0.18, [0.82, 0.90, 1.00]),
      light([0.02, -0.86, 0.50], 0.72, [0.60, 0.78, 1.00]),
      light([0.72, 0.26, -0.64], 0.18, [1.00, 0.62, 0.34]),
    ], ambient: 0.12, rim: 0.55, warmth: -0.03,
  }),
  backlight: rig('backlight', 'Backlight / Silhouette', {
    lights: [
      light([0.0, 0.34, -0.94], 1.16, [0.80, 0.90, 1.00]),
      light([0.20, 0.62, 0.76], 0.10, [1.00, 0.88, 0.75]),
      light([-0.74, 0.28, -0.60], 0.42, [0.70, 0.86, 1.00]),
      light([0.74, 0.28, -0.60], 0.42, [1.00, 0.62, 0.38]),
    ], ambient: 0.035, rim: 1.10, warmth: -0.04,
  }),
  gradient: rig('gradient', 'Gradient', {
    lights: [
      light([-0.98, 0.18, 0.08], 1.14, [1.00, 0.78, 0.56]),
      light([0.96, 0.20, 0.16], 0.58, [0.58, 0.78, 1.00]),
      light([-0.60, 0.34, -0.72], 0.30, [0.70, 0.84, 1.00]),
      light([0.68, 0.30, -0.66], 0.18, [1.00, 0.60, 0.34]),
    ], ambient: 0.12, rim: 0.52, warmth: 0.04,
  }),
  spotlight: rig('spotlight', 'Spotlight', {
    lights: [
      light([-0.46, 0.82, 0.34], 1.42, [1.00, 0.92, 0.82]),
      light([0.60, 0.24, 0.76], 0.10, [0.78, 0.90, 1.00]),
      light([-0.65, 0.22, -0.72], 0.20, [0.72, 0.86, 1.00]),
      light([0.68, 0.22, -0.68], 0.08, [1.00, 0.60, 0.34]),
    ], ambient: 0.05, rim: 0.32, warmth: 0.10, specular: 1.12,
  }),
  penumbra: rig('penumbra', 'Penumbra', {
    lights: [
      light([-0.72, 0.60, 0.34], 0.94, [1.00, 0.92, 0.84]),
      light([0.72, 0.30, 0.62], 0.16, [0.78, 0.90, 1.00]),
      light([-0.60, 0.38, -0.70], 0.35, [0.72, 0.86, 1.00]),
      light([0.62, 0.36, -0.70], 0.16, [1.00, 0.64, 0.38]),
    ], ambient: 0.13, rim: 0.46, warmth: 0.05,
  }),
  'hard-light': rig('hard-light', 'Hard Light', {
    lights: [
      light([-0.74, 0.58, 0.34], 1.40, [1.00, 0.90, 0.78]),
      light([0.68, 0.26, 0.68], 0.08, [0.72, 0.86, 1.00]),
      light([-0.72, 0.25, -0.64], 0.28, [0.70, 0.84, 1.00]),
      light([0.72, 0.24, -0.65], 0.12, [1.00, 0.58, 0.30]),
    ], ambient: 0.04, rim: 0.44, warmth: 0.08, specular: 1.25,
  }),
  portal: rig('portal', 'Portal', {
    lights: [
      light([0.0, 0.28, 0.96], 1.18, [1.00, 0.94, 0.88]),
      light([0.74, 0.42, 0.52], 0.24, [0.82, 0.91, 1.00]),
      light([-0.72, 0.38, -0.58], 0.42, [0.76, 0.88, 1.00]),
      light([0.72, 0.38, -0.58], 0.30, [1.00, 0.70, 0.46]),
    ], ambient: 0.22, rim: 0.52, warmth: 0.06, specular: 1.28,
  }),
  'rim-sweep': rig('rim-sweep', 'Rim Sweep', {
    lights: [
      light([-0.55, 0.62, 0.54], 0.56, [1.00, 0.92, 0.84]),
      light([0.62, 0.32, 0.70], 0.14, [0.80, 0.90, 1.00]),
      light([-0.88, 0.30, -0.36], 0.92, [0.66, 0.84, 1.00]),
      light([0.88, 0.28, -0.38], 0.30, [1.00, 0.62, 0.34]),
    ], ambient: 0.08, rim: 1.0, warmth: 0.0,
  }),
  pulse: rig('pulse', 'Pulse', {
    lights: [
      light([-0.48, 0.70, 0.52], 1.0, [1.00, 0.90, 0.80]),
      light([0.66, 0.34, 0.66], 0.24, [0.76, 0.88, 1.00]),
      light([-0.72, 0.30, -0.62], 0.52, [0.68, 0.84, 1.00]),
      light([0.72, 0.30, -0.62], 0.34, [1.00, 0.60, 0.34]),
    ], ambient: 0.12, rim: 0.62, warmth: 0.04,
  }),
};

export const LIGHTING_PRESET_ORDER = [
  'studio-soft', 'three-point', 'beauty-strip', 'side-rim', 'duo-rim', 'top-light', 'bottom-accent',
  'backlight', 'gradient', 'spotlight', 'penumbra', 'hard-light', 'portal', 'rim-sweep', 'pulse',
];

export function getLightingPreset(id) { return LIGHTING_PRESETS[id] || LIGHTING_PRESETS['studio-soft']; }

export function applyLightingPresetToWorld(world, presetId) {
  const preset = getLightingPreset(presetId);
  world.lightingPresetId = preset.id;
  const ids = ['key', 'fill', 'rim-left', 'rim-right'];
  ids.forEach((id, index) => {
    const source = preset.lights[index] || { direction: [0, 1, 0], intensity: 0, color: [1, 1, 1] };
    world.lights[id] = {
      ...(world.lights[id] || { id }),
      id,
      enabled: source.intensity > 0.001,
      intensity: source.intensity,
      direction: [...source.direction],
      color: [...source.color],
    };
  });
  for (const id of ['top', 'bottom', 'portal', 'practical']) {
    if (world.lights[id]) { world.lights[id].enabled = false; world.lights[id].intensity = 0; }
  }
}
