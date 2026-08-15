import { clipShot, compactSequenceClips, nextClipStart, sequenceDurationFrames } from '../core/schema.js';

const copy = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function addShotClip(project, shotId, { durationFrames, trackId = 'v1', startFrame, compact = false } = {}) {
  const shot = project.shots.byId[shotId];
  if (!shot) return null;
  const clip = {
    id: uid('clip'),
    shotId,
    detachedShot: null,
    linked: true,
    trackId,
    startFrame: Number.isFinite(startFrame) ? Math.max(0, Math.round(startFrame)) : nextClipStart(project),
    durationFrames: Math.max(1, Math.round(durationFrames || shot.durationFrames || 96)),
    sourceOffsetFrames: 0,
    speed: 1,
    easing: 'ease-in-out',
    name: shot.name,
  };
  project.sequence.clips.push(clip);
  project.sequence.activeClipId = clip.id;
  if (compact) compactSequenceClips(project);
  return clip;
}

export function removeClip(project, clipId, { compact = false } = {}) {
  const index = project.sequence.clips.findIndex((clip) => clip.id === clipId);
  if (index < 0) return false;
  project.sequence.clips.splice(index, 1);
  if (project.sequence.activeClipId === clipId) project.sequence.activeClipId = project.sequence.clips[Math.min(index, project.sequence.clips.length - 1)]?.id || null;
  if (compact) compactSequenceClips(project);
  return true;
}

export function moveClip(project, clipId, startFrame, { snap = true, threshold = 4 } = {}) {
  const clip = project.sequence.clips.find((item) => item.id === clipId);
  if (!clip) return null;
  let frame = Math.max(0, Math.round(startFrame));
  if (snap) frame = snapFrame(project, frame, { excludeClipId: clipId, threshold });
  clip.startFrame = frame;
  return clip;
}

export function reorderSimple(project, clipId, direction) {
  const sorted = [...project.sequence.clips].sort((a, b) => a.startFrame - b.startFrame || a.id.localeCompare(b.id));
  const index = sorted.findIndex((clip) => clip.id === clipId);
  const moveLeft = direction === 'left' || Number(direction) < 0;
  const target = moveLeft ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sorted.length) return false;
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  project.sequence.clips = sorted;
  compactSequenceClips(project);
  return true;
}

export function trimClip(project, clipId, edge, frame) {
  const clip = project.sequence.clips.find((item) => item.id === clipId);
  if (!clip) return null;
  const originalEnd = clip.startFrame + clip.durationFrames;
  if (edge === 'left') {
    const nextStart = clamp(Math.round(frame), 0, originalEnd - 1);
    const delta = nextStart - clip.startFrame;
    clip.startFrame = nextStart;
    clip.durationFrames = Math.max(1, clip.durationFrames - delta);
    clip.sourceOffsetFrames = Math.max(0, clip.sourceOffsetFrames + delta * clip.speed);
  } else {
    const nextEnd = Math.max(clip.startFrame + 1, Math.round(frame));
    clip.durationFrames = Math.max(1, nextEnd - clip.startFrame);
  }
  return clip;
}

export function bladeClip(project, clipId, frame) {
  const clip = project.sequence.clips.find((item) => item.id === clipId);
  if (!clip) return null;
  const cut = Math.round(frame);
  const start = clip.startFrame;
  const end = start + clip.durationFrames;
  if (cut <= start || cut >= end) return null;
  const leftDuration = cut - start;
  const rightDuration = end - cut;
  const right = {
    ...copy(clip),
    id: uid('clip'),
    startFrame: cut,
    durationFrames: rightDuration,
    sourceOffsetFrames: clip.sourceOffsetFrames + leftDuration * clip.speed,
    name: `${clip.name} B`,
  };
  clip.durationFrames = leftDuration;
  clip.name = clip.name.replace(/\s+[AB]$/, '') + ' A';
  project.sequence.clips.push(right);
  project.sequence.activeClipId = right.id;
  return right;
}

export function slipClip(project, clipId, deltaFrames) {
  const clip = project.sequence.clips.find((item) => item.id === clipId);
  if (!clip) return null;
  const shot = clipShot(project, clip);
  const sourceDuration = Math.max(1, shot?.durationFrames || clip.durationFrames);
  const maximum = Math.max(0, sourceDuration - Math.ceil(clip.durationFrames * clip.speed));
  clip.sourceOffsetFrames = clamp(Math.round(clip.sourceOffsetFrames + deltaFrames), 0, maximum);
  return clip;
}

export function detachClip(project, clipId) {
  const clip = project.sequence.clips.find((item) => item.id === clipId);
  if (!clip || clip.linked === false) return clip;
  const shot = project.shots.byId[clip.shotId];
  if (!shot) return null;
  clip.detachedShot = copy(shot);
  clip.detachedShot.id = `${shot.id}-detached-${clip.id}`;
  clip.linked = false;
  return clip;
}

export function relinkClip(project, clipId, shotId = null) {
  const clip = project.sequence.clips.find((item) => item.id === clipId);
  if (!clip) return null;
  const targetId = shotId || clip.shotId;
  if (!project.shots.byId[targetId]) return null;
  clip.shotId = targetId;
  clip.detachedShot = null;
  clip.linked = true;
  clip.name = project.shots.byId[targetId].name;
  return clip;
}

export function duplicateClip(project, clipId) {
  const clip = project.sequence.clips.find((item) => item.id === clipId);
  if (!clip) return null;
  const duplicate = { ...copy(clip), id: uid('clip'), startFrame: clip.startFrame + clip.durationFrames, name: `${clip.name} Copy` };
  project.sequence.clips.push(duplicate);
  project.sequence.activeClipId = duplicate.id;
  return duplicate;
}

export function addMarker(project, frame, label = 'Marker') {
  const marker = { id: uid('marker'), frame: Math.max(0, Math.round(frame)), label };
  project.sequence.markers.push(marker);
  project.sequence.markers.sort((a, b) => a.frame - b.frame);
  return marker;
}

export function removeMarker(project, markerId) {
  const index = project.sequence.markers.findIndex((marker) => marker.id === markerId);
  if (index < 0) return false;
  project.sequence.markers.splice(index, 1);
  return true;
}

export function snapFrame(project, frame, { excludeClipId = null, threshold = 4 } = {}) {
  const candidates = [0, ...project.sequence.markers.map((marker) => marker.frame)];
  for (const clip of project.sequence.clips) {
    if (clip.id === excludeClipId) continue;
    candidates.push(clip.startFrame, clip.startFrame + clip.durationFrames);
  }
  let best = frame;
  let distance = threshold + 1;
  for (const candidate of candidates) {
    const current = Math.abs(candidate - frame);
    if (current < distance && current <= threshold) { best = candidate; distance = current; }
  }
  return best;
}

export function locateSequenceFrame(project, frame) {
  const ordered = [...project.sequence.clips]
    .filter((clip) => clip.trackId?.startsWith('v'))
    .sort((a, b) => a.startFrame - b.startFrame || a.trackId.localeCompare(b.trackId));
  const active = ordered.filter((clip) => frame >= clip.startFrame && frame < clip.startFrame + clip.durationFrames)
    .sort((a, b) => Number(b.trackId.slice(1)) - Number(a.trackId.slice(1)))[0];
  if (active) {
    const shot = clipShot(project, active);
    const localTimelineFrame = Math.max(0, frame - active.startFrame);
    const sourceFrame = active.sourceOffsetFrames + localTimelineFrame * active.speed;
    const sourceDuration = Math.max(1, shot?.durationFrames || active.durationFrames);
    const mix = sourceDuration <= 1 ? 1 : clamp(sourceFrame / (sourceDuration - 1), 0, 1);
    return { clip: active, shot, mix, localFrame: localTimelineFrame, sourceFrame, clipStart: active.startFrame, gap: false };
  }
  if (!ordered.length) return null;
  const previous = [...ordered].reverse().find((clip) => clip.startFrame + clip.durationFrames <= frame);
  const next = ordered.find((clip) => clip.startFrame > frame);
  const hold = previous || next || ordered[0];
  const shot = clipShot(project, hold);
  const mix = previous ? 1 : 0;
  return { clip: hold, shot, mix, localFrame: 0, sourceFrame: mix ? (shot?.durationFrames || 1) - 1 : 0, clipStart: hold.startFrame, gap: true };
}

export function timelineSummary(project) {
  return {
    durationFrames: sequenceDurationFrames(project),
    clips: project.sequence.clips.length,
    markers: project.sequence.markers.length,
    tracks: project.sequence.tracks.length,
  };
}
