import { clamp, degToRad, easeInOutCubic, lerp } from '../engine/math.js';

const CAMERA = {
  'hero-3q': { yaw: -34, pitch: -8, distance: 1.0, targetY: 0.02 },
  front: { yaw: 0, pitch: -4, distance: 1.05, targetY: 0.02 },
  'rear-3q': { yaw: 142, pitch: -7, distance: 1.04, targetY: 0.04 },
  side: { yaw: 88, pitch: -3, distance: 1.06, targetY: 0.02 },
  low: { yaw: -22, pitch: 10, distance: 1.02, targetY: 0.12 },
  top: { yaw: 0, pitch: -72, distance: 1.10, targetY: 0 },
  detail: { yaw: -25, pitch: -4, distance: 0.76, targetY: 0.10 },
};
const LENS = { wide24: 72, cinema35: 55, natural50: 41, portrait85: 25, macro105: 19 };
const SCALE = { wide: 1.48, balanced: 1.10, tight: 0.86, macro: 0.61 };
const ROTATION = {
  neutral: { yaw: 0, roll: 0 }, left15: { yaw: -15, roll: 0 }, right15: { yaw: 15, roll: 0 },
  left35: { yaw: -35, roll: 0 }, right35: { yaw: 35, roll: 0 },
  'tilt-left': { yaw: -10, roll: -7 }, 'tilt-right': { yaw: 10, roll: 7 },
};
const COMPOSITION = {
  center: [0, 0], 'thirds-left': [0.18, 0.02], 'thirds-right': [-0.18, 0.02],
  symmetry: [0, 0.03], 'negative-left': [0.33, 0.02], 'negative-right': [-0.33, 0.02], diagonal: [-0.12, 0.12],
};
const FOCUS = {
  full: { targetY: 0.02, softness: 0.0 }, front: { targetY: 0.02, softness: 0.12 },
  center: { targetY: 0.08, softness: 0.07 }, label: { targetY: 0.05, softness: 0.18 },
  shallow: { targetY: 0.04, softness: 0.32 }, deep: { targetY: 0, softness: 0 },
};
const MOTION = {
  still: { yaw: 0, pitch: 0, distance: 1, x: 0, y: 0 },
  'orbit-left': { yaw: -22, pitch: 0, distance: 1, x: 0, y: 0 },
  'orbit-right': { yaw: 22, pitch: 0, distance: 1, x: 0, y: 0 },
  push: { yaw: 0, pitch: -1, distance: 0.78, x: 0, y: 0.02 },
  pull: { yaw: 0, pitch: 1, distance: 1.28, x: 0, y: -0.02 },
  rise: { yaw: 0, pitch: -6, distance: 0.96, x: 0, y: 0.30 },
  'slide-left': { yaw: -4, pitch: 0, distance: 1, x: -0.30, y: 0 },
  'slide-right': { yaw: 4, pitch: 0, distance: 1, x: 0.30, y: 0 },
};
const VIEW = {
  perspective: { yaw: 0, pitch: 0, distance: 1, ortho: 0 },
  profile: { yaw: 42, pitch: 0, distance: 1.04, ortho: 0 },
  top: { yaw: 0, pitch: -52, distance: 1.10, ortho: 0 },
  orthographic: { yaw: 0, pitch: 0, distance: 1.42, ortho: 1 },
  detail: { yaw: 0, pitch: -2, distance: 0.73, ortho: 0 },
};
const LIGHT = {
  softbox: { dir: [-0.55, 0.72, 0.43], intensity: 1.15, ambient: 0.30, rim: 0.34, warmth: 0.10 },
  rim: { dir: [0.62, 0.52, -0.58], intensity: 1.00, ambient: 0.18, rim: 0.92, warmth: 0.18 },
  split: { dir: [-0.92, 0.28, 0.20], intensity: 1.22, ambient: 0.14, rim: 0.55, warmth: -0.02 },
  top: { dir: [0.05, 0.98, 0.12], intensity: 1.30, ambient: 0.18, rim: 0.40, warmth: 0.06 },
  silhouette: { dir: [0, 0.36, -0.94], intensity: 0.78, ambient: 0.05, rim: 1.10, warmth: -0.06 },
  daylight: { dir: [-0.42, 0.80, 0.52], intensity: 1.32, ambient: 0.42, rim: 0.26, warmth: -0.05 },
  flat: { dir: [-0.20, 0.70, 0.66], intensity: 0.92, ambient: 0.55, rim: 0.14, warmth: 0 },
};
const WORLD = {
  grey: { key: 'grey', clear: [0.020, 0.021, 0.025], stage: [0.18, 0.185, 0.20], stageBack: [0.095, 0.10, 0.115] },
  white: { key: 'white', clear: [0.54, 0.55, 0.58], stage: [0.74, 0.75, 0.78], stageBack: [0.58, 0.59, 0.62] },
  black: { key: 'black', clear: [0.004, 0.004, 0.006], stage: [0.022, 0.024, 0.030], stageBack: [0.008, 0.009, 0.013] },
  void: { key: 'void', clear: [0.004, 0.004, 0.006], stage: [0.006, 0.006, 0.009], stageBack: [0.004, 0.004, 0.006] },
};
const ATMOS = {
  clean: { exposure: 1.0, contrast: 1.0, warmth: 0, saturation: 1.0 },
  warm: { exposure: 1.04, contrast: 1.03, warmth: 0.16, saturation: 1.04 },
  cool: { exposure: 0.98, contrast: 1.04, warmth: -0.14, saturation: 0.94 },
  contrast: { exposure: 0.93, contrast: 1.22, warmth: 0.03, saturation: 0.96 },
  soft: { exposure: 1.08, contrast: 0.88, warmth: 0.06, saturation: 0.92 },
  nocturne: { exposure: 0.78, contrast: 1.28, warmth: -0.08, saturation: 0.82 },
};

const value = (map, id) => map[id] || Object.values(map)[0];
const mix = (a, b, t) => lerp(a, b, t);
const mixArray = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const mixAngle = (a, b, t) => {
  let delta = ((b - a + 540) % 360) - 180;
  return a + delta * t;
};

function recipeConfig(recipe) {
  const camera = value(CAMERA, recipe.camera);
  const view = value(VIEW, recipe.view);
  const motion = value(MOTION, recipe.motion);
  const rotation = value(ROTATION, recipe.rotation);
  const comp = value(COMPOSITION, recipe.composition);
  const focus = value(FOCUS, recipe.focus);
  const light = value(LIGHT, recipe.light);
  const world = value(WORLD, recipe.environment);
  const atmosphere = value(ATMOS, recipe.atmosphere);
  const lens = value(LENS, recipe.lens);
  const framing = value(SCALE, recipe.scale);
  return {
    cameraYaw: camera.yaw + view.yaw + motion.yaw,
    cameraPitch: camera.pitch + view.pitch + motion.pitch,
    cameraDistance: camera.distance * view.distance * motion.distance * framing,
    fov: view.ortho ? 14 : lens,
    orthoMix: view.ortho,
    targetX: comp[0] + motion.x,
    targetY: comp[1] + camera.targetY + focus.targetY + motion.y,
    modelYaw: rotation.yaw,
    modelRoll: rotation.roll,
    modelScale: recipe.scale === 'macro' ? 1.06 : 1,
    focusSoftness: focus.softness,
    lightDir: light.dir,
    lightIntensity: light.intensity,
    ambient: light.ambient,
    rim: light.rim,
    lightWarmth: light.warmth,
    world,
    exposure: atmosphere.exposure,
    contrast: atmosphere.contrast,
    gradeWarmth: atmosphere.warmth,
    saturation: atmosphere.saturation,
  };
}

export function evaluateShotFrame(shot, rawMix = 0, worldState = {}) {
  const t = easeInOutCubic(clamp(rawMix));
  const a = recipeConfig(shot.start);
  const b = recipeConfig(shot.end);
  const stageA = worldState.overrideTheme ? value(WORLD, worldState.theme) : a.world;
  const stageB = worldState.overrideTheme ? value(WORLD, worldState.theme) : b.world;
  return {
    mix: t,
    cameraYaw: degToRad(mixAngle(a.cameraYaw, b.cameraYaw, t)),
    cameraPitch: degToRad(mixAngle(a.cameraPitch, b.cameraPitch, t)),
    cameraDistance: mix(a.cameraDistance, b.cameraDistance, t),
    fov: degToRad(mix(a.fov, b.fov, t)),
    orthoMix: mix(a.orthoMix, b.orthoMix, t),
    targetX: mix(a.targetX, b.targetX, t),
    targetY: mix(a.targetY, b.targetY, t),
    modelYaw: degToRad(mixAngle(a.modelYaw, b.modelYaw, t) + (worldState.orientationY || 0)),
    modelRoll: degToRad(mixAngle(a.modelRoll, b.modelRoll, t)),
    modelScale: mix(a.modelScale, b.modelScale, t) * (worldState.visualScale || 1),
    focusSoftness: mix(a.focusSoftness, b.focusSoftness, t),
    lightDir: mixArray(a.lightDir, b.lightDir, t),
    lightIntensity: mix(a.lightIntensity, b.lightIntensity, t),
    ambient: mix(a.ambient, b.ambient, t),
    rim: mix(a.rim, b.rim, t),
    lightWarmth: mix(a.lightWarmth, b.lightWarmth, t),
    clearColor: mixArray(stageA.clear, stageB.clear, t),
    stageColor: mixArray(stageA.stage, stageB.stage, t),
    stageBackColor: mixArray(stageA.stageBack, stageB.stageBack, t),
    stageVisible: (worldState.overrideTheme ? worldState.theme : (t < .5 ? a.world.key : b.world.key)) !== 'void',
    exposure: mix(a.exposure, b.exposure, t),
    contrast: mix(a.contrast, b.contrast, t),
    gradeWarmth: mix(a.gradeWarmth, b.gradeWarmth, t),
    saturation: mix(a.saturation, b.saturation, t),
  };
}
