import { AXIS_IDS, axisOptions } from './axes.js';
import { getFamily, getPreset, presetsForFamily } from './presets.js';

const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

export function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(array, random) { return array[Math.floor(random() * array.length)] ?? array[0]; }
function shuffled(array, random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function changedAxes(shot) {
  return AXIS_IDS.filter((axis) => shot.start?.[axis] !== shot.end?.[axis]);
}

export function lockedMinimum(shot) {
  return AXIS_IDS.filter((axis) => shot.locks?.[axis] && shot.start?.[axis] !== shot.end?.[axis]).length;
}

function isExcluded(shot, axis, value) { return !!shot.exclusions?.[`${axis}:${value}`]; }

export function allowedOptions(shot, familyId, axis) {
  const family = getFamily(familyId);
  const pool = family.pools?.[axis] || axisOptions(axis).map(([id]) => id);
  return pool.filter((value) => !isExcluded(shot, axis, value));
}

export function deltaCapability(shot, familyId = shot.familyId) {
  const mandatory = AXIS_IDS.filter((axis) => shot.locks?.[axis] && shot.start?.[axis] !== shot.end?.[axis]);
  const mutable = AXIS_IDS.filter((axis) => {
    if (shot.locks?.[axis]) return false;
    const options = allowedOptions(shot, familyId, axis);
    return options.length > 1;
  });
  return {
    minimum: mandatory.length,
    maximum: Math.min(AXIS_IDS.length, mandatory.length + mutable.length),
    mandatory,
    mutable,
  };
}

function safeStartValue(shot, familyId, axis, preferred, random) {
  const options = allowedOptions(shot, familyId, axis);
  if (preferred && options.includes(preferred)) return preferred;
  if (options.length) return pick(options, random);
  return preferred ?? shot.start?.[axis] ?? shot.end?.[axis];
}

function differentValue(shot, familyId, axis, startValue, random) {
  const options = allowedOptions(shot, familyId, axis).filter((value) => value !== startValue);
  return options.length ? pick(options, random) : startValue;
}

export function generateShot({ shot, kind = 'variant', requestedDelta = shot.deltaCount, seed = shot.seed }) {
  const random = mulberry32(seed >>> 0);
  const current = clone(shot);
  let candidate = clone(shot);
  let preset = getPreset(shot.presetId);

  if (kind === 'random') {
    const familyPresets = presetsForFamily(shot.familyId);
    const alternatives = familyPresets.filter((item) => item.id !== shot.presetId);
    preset = pick(alternatives.length ? alternatives : familyPresets, random);
    candidate.presetId = preset.id;
    candidate.start = clone(preset.start);
    candidate.end = clone(preset.end);
    for (const axis of AXIS_IDS) {
      if (current.locks?.[axis]) {
        candidate.start[axis] = current.start[axis];
        candidate.end[axis] = current.end[axis];
      } else {
        candidate.start[axis] = safeStartValue(candidate, candidate.familyId, axis, candidate.start[axis], random);
      }
    }
  } else {
    candidate.start = clone(current.start);
    candidate.end = clone(current.end);
  }

  const capability = deltaCapability(candidate, candidate.familyId);
  const target = Math.max(capability.minimum, Math.min(capability.maximum, Math.round(Number(requestedDelta) || 0)));
  const selected = new Set(capability.mandatory);
  const needed = target - selected.size;
  for (const axis of shuffled(capability.mutable, random).slice(0, needed)) selected.add(axis);

  for (const axis of AXIS_IDS) {
    if (candidate.locks?.[axis]) continue;
    const start = safeStartValue(candidate, candidate.familyId, axis, candidate.start[axis], random);
    candidate.start[axis] = start;
    candidate.end[axis] = selected.has(axis) ? differentValue(candidate, candidate.familyId, axis, start, random) : start;
  }

  candidate.deltaCount = target;
  candidate.seed = (seed + 1) >>> 0;
  const actualAxes = changedAxes(candidate);
  const risk = actualAxes.length >= 9 ? 'wild' : actualAxes.length >= 6 ? 'expressive' : 'stable';
  return {
    shot: candidate,
    report: {
      kind,
      seed: seed >>> 0,
      requested: Math.round(Number(requestedDelta) || 0),
      resolved: actualAxes.length,
      changedAxes: actualAxes,
      minimum: capability.minimum,
      maximum: capability.maximum,
      risk,
      presetId: candidate.presetId,
    },
  };
}

export function assignAxisValue(shot, axis, value, side = 'both') {
  const candidate = clone(shot);
  if (side === 'start' || side === 'both') candidate.start[axis] = value;
  if (side === 'end' || side === 'both') candidate.end[axis] = value;
  candidate.deltaCount = changedAxes(candidate).length;
  return candidate;
}

export function toggleAxisLock(shot, axis) {
  const candidate = clone(shot);
  candidate.locks[axis] = !candidate.locks[axis];
  return candidate;
}

export function toggleExclusion(shot, axis, value) {
  const candidate = clone(shot);
  const key = `${axis}:${value}`;
  const excluding = !candidate.exclusions[key];
  if (excluding) {
    const familyPool = getFamily(candidate.familyId).pools?.[axis]
      || axisOptions(axis).map(([id]) => id);
    const remaining = familyPool
      .filter((id) => id !== value && !candidate.exclusions[`${axis}:${id}`]);
    // The axis may be frozen, but its random pool may never become empty.
    if (!remaining.length) return candidate;
  }
  candidate.exclusions[key] = excluding;
  return candidate;
}
