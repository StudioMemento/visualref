import { clamp, degToRad, easeInOutCubic, lerp } from '../engine/math.js';
import { getLightingPreset } from '../engine/lighting.js';

export const STAGE_PRESETS = {
  'dark-cyclorama': { id: 'dark-cyclorama', label: 'Dark Grey Cyclorama 360', clear: [0.010, 0.011, 0.014], floor: [0.115, 0.120, 0.132], back: [0.050, 0.054, 0.064], stageVisible: true, planeOnly: false, hdriVisible: false, importedSet: false },
  'grey-limbo': { id: 'grey-limbo', label: 'Grey Limbo', clear: [0.055, 0.058, 0.066], floor: [0.27, 0.28, 0.31], back: [0.17, 0.18, 0.21], stageVisible: true, planeOnly: false, hdriVisible: false, importedSet: false },
  'white-limbo': { id: 'white-limbo', label: 'White Limbo', clear: [0.46, 0.47, 0.50], floor: [0.76, 0.77, 0.80], back: [0.58, 0.59, 0.63], stageVisible: true, planeOnly: false, hdriVisible: false, importedSet: false },
  'black-limbo': { id: 'black-limbo', label: 'Black Limbo', clear: [0.0015, 0.0018, 0.0025], floor: [0.012, 0.014, 0.019], back: [0.004, 0.005, 0.008], stageVisible: true, planeOnly: false, hdriVisible: false, importedSet: false },
  plane: { id: 'plane', label: 'Plane', clear: [0.008, 0.009, 0.012], floor: [0.14, 0.145, 0.16], back: [0.008, 0.009, 0.012], stageVisible: true, planeOnly: true, hdriVisible: false, importedSet: false },
  void: { id: 'void', label: 'Void', clear: [0.0015, 0.0018, 0.0025], floor: [0.003, 0.003, 0.005], back: [0.0015, 0.0018, 0.0025], stageVisible: false, planeOnly: false, hdriVisible: false, importedSet: false },
  'hdri-world': { id: 'hdri-world', label: 'HDRI World', clear: [0.018, 0.020, 0.024], floor: [0.10, 0.105, 0.115], back: [0.04, 0.045, 0.052], stageVisible: false, planeOnly: false, hdriVisible: true, importedSet: false },
  'imported-set': { id: 'imported-set', label: 'Imported Set', clear: [0.010, 0.012, 0.016], floor: [0.08, 0.085, 0.10], back: [0.03, 0.035, 0.044], stageVisible: true, planeOnly: true, hdriVisible: false, importedSet: true },
};

const VIEW = {
  'hero-3q': { yaw: -34, pitch: -8, distance: 1.0, targetY: 0.02, ortho: 0 },
  front: { yaw: 0, pitch: -4, distance: 1.04, targetY: 0.02, ortho: 0 },
  'rear-3q': { yaw: 142, pitch: -7, distance: 1.04, targetY: 0.04, ortho: 0 },
  profile: { yaw: 88, pitch: -3, distance: 1.06, targetY: 0.02, ortho: 0 },
  low: { yaw: -22, pitch: 11, distance: 1.02, targetY: 0.12, ortho: 0 },
  high: { yaw: -22, pitch: -30, distance: 1.06, targetY: -0.03, ortho: 0 },
  top: { yaw: 0, pitch: -66, distance: 1.12, targetY: 0.0, ortho: 0 },
  zenith: { yaw: 0, pitch: -88, distance: 1.18, targetY: 0.0, ortho: 0 },
  detail: { yaw: -25, pitch: -4, distance: 0.73, targetY: 0.10, ortho: 0 },
  'macro-3q': { yaw: -38, pitch: -7, distance: 0.58, targetY: 0.08, ortho: 0 },
  orthographic: { yaw: 0, pitch: -2, distance: 1.40, targetY: 0.02, ortho: 1 },
};

const LENS = { '18mm': 90, '24mm': 72, '35mm': 55, '50mm': 41, '85mm': 25, '105mm-macro': 19, '200mm': 10.5, 'tilt-shift': 31 };
const SCALE = { 'very-small': 1.82, small: 1.48, medium: 1.10, large: 0.88, tight: 0.70, 'off-scale': 0.52 };
const ROTATION = {
  '0deg': { yaw: 0, pitch: 0, roll: 0 }, left15: { yaw: -15, pitch: 0, roll: 0 }, right15: { yaw: 15, pitch: 0, roll: 0 },
  left45: { yaw: -45, pitch: 0, roll: 0 }, right45: { yaw: 45, pitch: 0, roll: 0 }, '90deg': { yaw: 90, pitch: 0, roll: 0 },
  '135deg': { yaw: 135, pitch: 0, roll: 0 }, '180deg': { yaw: 180, pitch: 0, roll: 0 },
  'turntable-left': { yaw: 0, pitch: 0, roll: 0, turn: -1 }, 'turntable-right': { yaw: 0, pitch: 0, roll: 0, turn: 1 },
};
const COMPOSITION = {
  centered: [0, 0], symmetry: [0, 0.03], 'left-third': [0.19, 0.02], 'right-third': [-0.19, 0.02],
  'negative-left': [0.34, 0.02], 'negative-right': [-0.34, 0.02], 'low-frame': [0, 0.22], 'high-frame': [0, -0.18], diagonal: [-0.13, 0.12],
};
const ATMOS = {
  clean: { exposure: 0, contrast: 1, saturation: 1, warmth: 0, tint: 0, bloom: 0.06, vignette: 0.10, effect: 0 },
  warm: { exposure: 0.04, contrast: 1.03, saturation: 1.04, warmth: 0.17, tint: 0.02, bloom: 0.10, vignette: 0.12, effect: 0 },
  cool: { exposure: -0.02, contrast: 1.05, saturation: 0.94, warmth: -0.15, tint: 0.03, bloom: 0.08, vignette: 0.12, effect: 0 },
  soft: { exposure: 0.08, contrast: 0.88, saturation: 0.92, warmth: 0.05, tint: 0.01, bloom: 0.16, vignette: 0.08, effect: 0 },
  contrast: { exposure: -0.07, contrast: 1.24, saturation: 0.96, warmth: 0.02, tint: 0, bloom: 0.08, vignette: 0.22, effect: 0 },
  nocturne: { exposure: -0.24, contrast: 1.30, saturation: 0.80, warmth: -0.08, tint: 0.03, bloom: 0.18, vignette: 0.30, effect: 0 },
  bloom: { exposure: 0.02, contrast: 1.05, saturation: 1.02, warmth: 0.05, tint: 0, bloom: 0.48, vignette: 0.14, effect: 0 },
  haze: { exposure: 0.03, contrast: 0.92, saturation: 0.88, warmth: 0.02, tint: 0.02, bloom: 0.20, vignette: 0.10, effect: 1 },
  particles: { exposure: 0, contrast: 1.10, saturation: 1.0, warmth: 0.02, tint: 0, bloom: 0.22, vignette: 0.18, effect: 2 },
  'curl-flow': { exposure: -0.02, contrast: 1.12, saturation: 1.04, warmth: -0.04, tint: 0.05, bloom: 0.26, vignette: 0.20, effect: 3 },
  'spark-burst': { exposure: 0.01, contrast: 1.16, saturation: 1.08, warmth: 0.15, tint: 0, bloom: 0.34, vignette: 0.22, effect: 4 },
  'orbital-dust': { exposure: -0.03, contrast: 1.12, saturation: 0.94, warmth: 0.08, tint: 0.02, bloom: 0.24, vignette: 0.24, effect: 5 },
  'data-rain': { exposure: -0.08, contrast: 1.20, saturation: 0.86, warmth: -0.14, tint: 0.08, bloom: 0.22, vignette: 0.24, effect: 6 },
};

const value = (map, id) => map[id] || Object.values(map)[0];
const mix = (a, b, t) => lerp(a, b, t);
const mixArray = (a, b, t) => a.map((v, index) => mix(v, b[index], t));
const mixAngle = (a, b, t) => {
  const delta = ((b - a + 540) % 360) - 180;
  return a + delta * t;
};
const rotateY = ([x, y, z], radians) => {
  const c = Math.cos(radians), s = Math.sin(radians);
  return [x * c + z * s, y, -x * s + z * c];
};

function focusConfig(id, t, worldDof = {}) {
  const selected = worldDof.focusUV || [0.5, 0.5];
  const configs = {
    deep: { uv: selected, softness: 0, range: 1.0, aperture: 0 },
    shallow: { uv: selected, softness: 0.34, range: 0.18, aperture: 0.34 },
    'point-focus': { uv: selected, softness: 0.30, range: worldDof.focalRange || 0.24, aperture: worldDof.aperture || 0.28 },
    'front-plane': { uv: [0.5, 0.60], softness: 0.22, range: 0.26, aperture: 0.22 },
    'center-mass': { uv: [0.5, 0.50], softness: 0.18, range: 0.32, aperture: 0.18 },
    'hero-detail': { uv: [0.56, 0.43], softness: 0.32, range: 0.18, aperture: 0.32 },
    'rack-near-far': { uv: [0.52, mix(0.68, 0.34, t)], softness: 0.36, range: 0.18, aperture: 0.36 },
    'rack-far-near': { uv: [0.48, mix(0.34, 0.68, t)], softness: 0.36, range: 0.18, aperture: 0.36 },
    macro: { uv: [0.56, 0.44], softness: 0.62, range: 0.08, aperture: 0.62 },
    offset: { uv: [0.64, 0.46], softness: 0.32, range: 0.18, aperture: 0.32 },
  };
  return configs[id] || configs.deep;
}

function cameraMotion(id, t) {
  const smooth = easeInOutCubic(clamp(t));
  const sin = Math.sin(t * Math.PI * 2);
  const configs = {
    static: { yaw: 0, pitch: 0, distance: 1, x: 0, y: 0, fovScale: 1 },
    'micro-drift': { yaw: sin * 1.8, pitch: Math.sin(t * Math.PI) * -0.7, distance: 1 - Math.sin(t * Math.PI) * 0.018, x: Math.sin(t * Math.PI * 1.4) * 0.035, y: Math.sin(t * Math.PI) * 0.018, fovScale: 1 },
    'push-in': { yaw: 0, pitch: -1.2 * smooth, distance: mix(1.10, 0.78, smooth), x: 0, y: 0.02 * smooth, fovScale: 1 },
    'pull-out': { yaw: 0, pitch: 1.0 * smooth, distance: mix(0.82, 1.28, smooth), x: 0, y: -0.02 * smooth, fovScale: 1 },
    'orbit-left': { yaw: mix(14, -28, smooth), pitch: 0, distance: 1, x: 0, y: 0, fovScale: 1 },
    'orbit-right': { yaw: mix(-14, 28, smooth), pitch: 0, distance: 1, x: 0, y: 0, fovScale: 1 },
    'track-left': { yaw: -3 * smooth, pitch: 0, distance: 1, x: mix(0.26, -0.34, smooth), y: 0, fovScale: 1 },
    'track-right': { yaw: 3 * smooth, pitch: 0, distance: 1, x: mix(-0.26, 0.34, smooth), y: 0, fovScale: 1 },
    'crane-up': { yaw: 0, pitch: mix(2, -9, smooth), distance: 1, x: 0, y: mix(-0.18, 0.30, smooth), fovScale: 1 },
    'crane-down': { yaw: 0, pitch: mix(-10, 3, smooth), distance: 1, x: 0, y: mix(0.30, -0.18, smooth), fovScale: 1 },
    'pan-left': { yaw: mix(10, -10, smooth), pitch: 0, distance: 1, x: 0, y: 0, fovScale: 1 },
    'pan-right': { yaw: mix(-10, 10, smooth), pitch: 0, distance: 1, x: 0, y: 0, fovScale: 1 },
    'dolly-zoom': { yaw: 0, pitch: 0, distance: mix(1.30, 0.72, smooth), x: 0, y: 0, fovScale: mix(0.72, 1.52, smooth) },
    'handheld-subtle': { yaw: Math.sin(t * 19) * 0.9 + Math.sin(t * 7.1) * 0.45, pitch: Math.sin(t * 23 + 1.2) * 0.65, distance: 1 + Math.sin(t * 13) * 0.008, x: Math.sin(t * 17) * 0.012, y: Math.sin(t * 21) * 0.010, fovScale: 1 },
  };
  return configs[id] || configs.static;
}

function motionConfig(id, t) {
  const smooth = easeInOutCubic(clamp(t));
  const configs = {
    none: { mode: 0, amount: 0, count: 1, offset: [0, 0, 0], rotation: [0, 0, 0] },
    'product-float': { mode: 1, amount: 1, count: 1, offset: [0, Math.sin(t * Math.PI * 2) * 0.085, 0], rotation: [0, Math.sin(t * Math.PI * 2) * 1.4, Math.sin(t * Math.PI) * 0.7] },
    'product-turn': { mode: 2, amount: smooth, count: 1, offset: [0, 0, 0], rotation: [0, smooth * 72, 0] },
    exploded: { mode: 3, amount: smooth, count: 1, offset: [0, 0, 0], rotation: [0, 0, 0] },
    'hero-clones': { mode: 4, amount: smooth, count: 5, offset: [0, 0, 0], rotation: [0, smooth * 20, 0] },
    pattern: { mode: 5, amount: smooth, count: 9, offset: [0, 0, 0], rotation: [0, 0, 0] },
    spiral: { mode: 6, amount: smooth, count: 8, offset: [0, 0, 0], rotation: [0, smooth * 90, 0] },
    vortex: { mode: 7, amount: smooth, count: 10, offset: [0, 0, 0], rotation: [0, smooth * 120, 0] },
    kaleidoscope: { mode: 8, amount: smooth, count: 8, offset: [0, 0, 0], rotation: [0, smooth * 45, 0] },
    'multi-axis': { mode: 9, amount: smooth, count: 1, offset: [0, Math.sin(t * Math.PI) * 0.10, 0], rotation: [smooth * 16, smooth * 80, smooth * 10] },
    stack: { mode: 10, amount: smooth, count: 6, offset: [0, 0, 0], rotation: [0, smooth * 25, 0] },
    satellites: { mode: 11, amount: smooth, count: 7, offset: [0, 0, 0], rotation: [0, smooth * 50, 0] },
    wave: { mode: 12, amount: smooth, count: 7, offset: [0, 0, 0], rotation: [0, smooth * 35, 0] },
    dispersion: { mode: 13, amount: smooth, count: 9, offset: [0, 0, 0], rotation: [0, smooth * 40, 0] },
  };
  return configs[id] || configs.none;
}

function worldLightRig(world) {
  const preset = getLightingPreset(world?.lightingPresetId || 'studio-soft');
  const managed = world?.lights || {};
  const ids = ['key', 'fill', 'rim-left', 'rim-right'];
  const lights = ids.map((id, index) => {
    const source = managed[id];
    if (!source) return preset.lights[index];
    return {
      direction: source.direction || preset.lights[index]?.direction || [0, 1, 0],
      intensity: source.enabled === false ? 0 : Number(source.intensity ?? preset.lights[index]?.intensity ?? 0),
      color: source.color || preset.lights[index]?.color || [1, 1, 1],
    };
  });
  return { ...preset, lights };
}

function recipeConfig(recipe, t, world) {
  const view = value(VIEW, recipe.view);
  const camera = cameraMotion(recipe.camera, t);
  const rotation = value(ROTATION, recipe.rotation);
  const comp = value(COMPOSITION, recipe.composition);
  const focus = focusConfig(recipe.focus, t, world?.post?.dof || {});
  const lightRig = getLightingPreset(recipe.light);
  const stage = value(STAGE_PRESETS, recipe.environment);
  const atmosphere = value(ATMOS, recipe.atmosphere);
  const motion = motionConfig(recipe.motion, t);
  const baseFov = value(LENS, recipe.lens);
  const framing = value(SCALE, recipe.scale);
  const turnYaw = (rotation.turn || 0) * t * 180;
  return {
    cameraYaw: view.yaw + camera.yaw,
    cameraPitch: view.pitch + camera.pitch,
    cameraDistance: view.distance * camera.distance * framing,
    fov: baseFov * camera.fovScale,
    orthoMix: view.ortho,
    targetX: comp[0] + camera.x,
    targetY: comp[1] + view.targetY + camera.y,
    tiltShift: recipe.lens === 'tilt-shift' ? 0.16 : 0,
    modelYaw: rotation.yaw + turnYaw + motion.rotation[1],
    modelPitch: rotation.pitch + motion.rotation[0],
    modelRoll: rotation.roll + motion.rotation[2],
    modelScale: recipe.scale === 'off-scale' ? 1.06 : 1,
    modelOffset: motion.offset,
    focus,
    lightRig,
    stage,
    atmosphere,
    motion,
  };
}

function blendRigs(a, b, t, world) {
  const base = worldLightRig(world);
  const lights = a.lights.map((lightA, index) => {
    const lightB = b.lights[index] || lightA;
    const semanticDirection = mixArray(lightA.direction, lightB.direction, t);
    const semanticColor = mixArray(lightA.color, lightB.color, t);
    const semanticIntensity = mix(lightA.intensity, lightB.intensity, t);
    const baseLight = base.lights[index] || lightA;
    const direction = mixArray(baseLight.direction, semanticDirection, 0.68);
    const color = mixArray(baseLight.color, semanticColor, 0.68);
    const intensity = mix(baseLight.intensity, semanticIntensity, 0.68);
    return { direction, color, intensity };
  });
  const presetId = t < 0.5 ? a.id : b.id;
  if (presetId === 'rim-sweep') {
    const sweep = (t * 2 - 1) * Math.PI * 0.88;
    lights[2].direction = rotateY([-0.86, 0.30, -0.40], sweep);
    lights[3].direction = rotateY([0.86, 0.30, -0.40], sweep);
  }
  if (presetId === 'pulse') {
    const pulse = 0.78 + Math.pow(Math.sin(t * Math.PI * 2) * 0.5 + 0.5, 2) * 0.48;
    lights.forEach((light) => { light.intensity *= pulse; });
  }
  const master = Number(world?.lighting?.masterIntensity ?? 1);
  lights.forEach((light) => { light.intensity *= master; });
  return {
    lights,
    ambient: mix(base.ambient, mix(a.ambient, b.ambient, t), 0.68),
    rim: mix(base.rim, mix(a.rim, b.rim, t), 0.68) * (1 + Number(world?.lighting?.rimStrength || 0) * 0.35),
    warmth: mix(base.warmth, mix(a.warmth, b.warmth, t), 0.68) + Number(world?.lighting?.temperature || 0),
    specular: mix(base.specular || 1, mix(a.specular || 1, b.specular || 1, t), 0.68),
  };
}

export function evaluateShotFrame(shot, rawMix = 0, world = {}) {
  const t = easeInOutCubic(clamp(rawMix));
  const fine = shot?.fineTune || {};
  const a = recipeConfig(shot.start, t, world);
  const b = recipeConfig(shot.end, t, world);
  const light = blendRigs(a.lightRig, b.lightRig, t, world);
  const stageA = a.stage;
  const stageB = b.stage;
  const atmosphereA = a.atmosphere;
  const atmosphereB = b.atmosphere;
  const focusUV = mixArray(a.focus.uv, b.focus.uv, t);
  const post = world?.post || {};
  const semanticDof = mix(a.focus.aperture, b.focus.aperture, t);
  const dofEnabled = semanticDof > 0.01 || post.dof?.enabled;
  const motion = t < 0.5 ? a.motion : b.motion;
  const cameraSpeed = Math.max(0.05, Number(fine.cameraSpeed) || 1);
  const cameraT = clamp(Math.pow(t, 1 / cameraSpeed));
  return {
    rawMix,
    mix: t,
    time: rawMix,
    cameraYaw: degToRad(mixAngle(a.cameraYaw, b.cameraYaw, cameraT) * (Number(fine.cameraArc) || 1)),
    cameraPitch: degToRad(mixAngle(a.cameraPitch, b.cameraPitch, cameraT)),
    cameraDistance: mix(a.cameraDistance, b.cameraDistance, cameraT),
    fov: degToRad(clamp(mix(a.fov, b.fov, cameraT) + Number(fine.focalLengthOffset || 0), 7, 110)),
    orthoMix: mix(a.orthoMix, b.orthoMix, t),
    targetX: mix(a.targetX, b.targetX, cameraT) + Number(fine.framingOffsetX || 0),
    targetY: mix(a.targetY, b.targetY, cameraT) + Number(fine.framingOffsetY || 0),
    tiltShift: mix(a.tiltShift, b.tiltShift, t),
    modelYaw: degToRad(mixAngle(a.modelYaw, b.modelYaw, t) + Number(fine.heroRotationOffset || 0)),
    modelPitch: degToRad(mixAngle(a.modelPitch, b.modelPitch, t)),
    modelRoll: degToRad(mixAngle(a.modelRoll, b.modelRoll, t)),
    modelScale: mix(a.modelScale, b.modelScale, t),
    modelOffset: mixArray(a.modelOffset, b.modelOffset, t),
    motionMode: motion.mode,
    motionAmount: mix(a.motion.amount, b.motion.amount, t),
    motionCount: Math.round(mix(a.motion.count, b.motion.count, t)),
    focusUV,
    focusSoftness: mix(a.focus.softness, b.focus.softness, t),
    focalRange: Math.max(0.02, mix(a.focus.range, b.focus.range, t) + Number(fine.focusDistanceOffset || 0)),
    aperture: Math.max(0, mix(a.focus.aperture, b.focus.aperture, t) + Number(fine.apertureOffset || 0)),
    dofEnabled,
    lights: light.lights,
    ambient: light.ambient,
    rim: light.rim,
    lightWarmth: light.warmth,
    specular: light.specular,
    stagePresetId: t < 0.5 ? stageA.id : stageB.id,
    clearColor: mixArray(stageA.clear, stageB.clear, t),
    stageColor: mixArray(stageA.floor, stageB.floor, t),
    stageBackColor: mixArray(stageA.back, stageB.back, t),
    stageVisible: t < 0.5 ? stageA.stageVisible : stageB.stageVisible,
    stagePlaneOnly: t < 0.5 ? stageA.planeOnly : stageB.planeOnly,
    hdriVisible: t < 0.5 ? stageA.hdriVisible : stageB.hdriVisible,
    importedSetVisible: t < 0.5 ? stageA.importedSet : stageB.importedSet,
    exposure: Number(post.exposure ?? 1) * Math.pow(2, mix(atmosphereA.exposure, atmosphereB.exposure, t) + Number(fine.exposure || 0)),
    contrast: Number(post.contrast ?? 1) * mix(atmosphereA.contrast, atmosphereB.contrast, t),
    gradeWarmth: Number(post.warmth || 0) + mix(atmosphereA.warmth, atmosphereB.warmth, t),
    gradeTint: Number(post.tint || 0) + mix(atmosphereA.tint, atmosphereB.tint, t),
    saturation: Number(post.saturation ?? 1) * mix(atmosphereA.saturation, atmosphereB.saturation, t),
    bloom: Math.max(Number(post.bloom || 0), mix(atmosphereA.bloom, atmosphereB.bloom, t)) * (Number(fine.effectStrength) || 1),
    bloomThreshold: Number(post.bloomThreshold ?? 0.72),
    vignette: Math.max(Number(post.vignette || 0), mix(atmosphereA.vignette, atmosphereB.vignette, t)),
    grain: !!post.grain,
    grainStrength: Number(post.grainStrength || 0.035),
    atmosphereMode: t < 0.5 ? atmosphereA.effect : atmosphereB.effect,
    atmosphereStrength: Number(fine.effectStrength) || 1,
    postBypass: !!post.bypass,
    previewFx: !!post.previewFx,
  };
}
