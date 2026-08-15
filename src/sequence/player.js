import { clamp } from '../engine/math.js';
import { activeShot, sequenceDurationFrames } from '../core/schema.js';
import { locateSequenceFrame } from './timeline-model.js';

export class PlayerClock {
  constructor({ getProject, onFrame, onState = () => {} }) {
    this.getProject = getProject;
    this.onFrame = onFrame;
    this.onState = onState;
    this.mode = 'shot';
    this.playing = false;
    this.loop = true;
    this.positionFrame = 0;
    this.lastTime = 0;
    this.raf = 0;
    this.playbackStartPerf = 0;
    this.playbackStartFrame = 0;
    this.driftFrames = 0;
    this.emitFrame();
  }

  setMode(mode, { preservePosition = false } = {}) {
    const next = mode === 'sequence' ? 'sequence' : 'shot';
    if (next === this.mode) return;
    const wasPlaying = this.playing;
    this.pause();
    this.mode = next;
    if (!preservePosition) this.positionFrame = 0;
    this.emitFrame();
    this.emitState();
    if (wasPlaying) this.play();
  }

  setLoop(loop) { this.loop = !!loop; this.emitState(); }
  toggleLoop() { this.setLoop(!this.loop); }

  loopBounds() {
    const project = this.getProject();
    if (this.mode === 'sequence' && project.sequence.loopRange) {
      const start = Math.max(0, Number(project.sequence.loopRange.start) || 0);
      const end = Math.max(start + 1, Number(project.sequence.loopRange.end) || this.totalFrames());
      return [start, Math.min(this.totalFrames(), end)];
    }
    return [0, this.totalFrames()];
  }

  totalFrames() {
    const project = this.getProject();
    if (this.mode === 'sequence') return Math.max(1, sequenceDurationFrames(project));
    return Math.max(1, activeShot(project)?.durationFrames || 96);
  }

  play() {
    if (this.playing) return;
    if (this.mode === 'sequence' && !this.getProject().sequence.clips.length) return;
    const [loopStart, loopEnd] = this.loopBounds();
    if (this.positionFrame >= loopEnd - 0.001 || this.positionFrame < loopStart) this.positionFrame = loopStart;
    this.playing = true;
    this.lastTime = performance.now();
    this.playbackStartPerf = this.lastTime;
    this.playbackStartFrame = this.positionFrame;
    this.emitState();
    this.raf = requestAnimationFrame((time) => this.tick(time));
  }

  pause() {
    if (!this.playing && !this.raf) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.emitState();
  }

  toggle() { if (this.playing) this.pause(); else this.play(); }

  tick(time) {
    if (!this.playing) return;
    const project = this.getProject();
    const fps = Math.max(1, project.settings.fps || 24);
    this.lastTime = time;
    const [loopStart, loopEnd] = this.loopBounds();
    const loopLength = Math.max(1, loopEnd - loopStart);
    const authoritative = this.playbackStartFrame + Math.max(0, (time - this.playbackStartPerf) / 1000) * fps;

    if (authoritative >= loopEnd) {
      if (this.loop) this.positionFrame = loopStart + ((authoritative - loopStart) % loopLength);
      else {
        this.positionFrame = Math.max(loopStart, loopEnd - 1);
        this.driftFrames = 0;
        this.pause();
        this.emitFrame();
        return;
      }
    } else {
      this.positionFrame = Math.max(loopStart, authoritative);
    }

    // The playhead is derived from one absolute clock, so slow render frames skip
    // forward instead of accumulating timeline drift.
    this.driftFrames = 0;
    this.emitFrame();
    this.emitState();
    this.raf = requestAnimationFrame((next) => this.tick(next));
  }

  reanchorPlaybackClock() {
    if (!this.playing) return;
    const now = performance.now();
    this.lastTime = now;
    this.playbackStartPerf = now;
    this.playbackStartFrame = this.positionFrame;
    this.driftFrames = 0;
  }

  seekNormalized(value) {
    const [start, end] = this.loopBounds();
    this.positionFrame = start + clamp(value) * Math.max(0, end - start - 1);
    this.reanchorPlaybackClock();
    this.emitFrame();
    this.emitState();
  }

  seekFrame(value) {
    this.positionFrame = clamp(value, 0, Math.max(0, this.totalFrames() - 1));
    this.reanchorPlaybackClock();
    this.emitFrame(); this.emitState();
  }

  goStart() { this.seekFrame(this.loopBounds()[0]); }
  goEnd() { this.seekFrame(Math.max(this.loopBounds()[0], this.loopBounds()[1] - 1)); }

  refresh() {
    const total = this.totalFrames();
    this.positionFrame = clamp(this.positionFrame, 0, Math.max(0, total - 1));
    this.reanchorPlaybackClock();
    this.emitFrame(); this.emitState();
  }

  currentPayload() {
    const project = this.getProject();
    const totalFrames = this.totalFrames();
    if (this.mode === 'sequence' && project.sequence.clips.length) {
      const located = locateSequenceFrame(project, this.positionFrame);
      if (located?.shot) return { mode: this.mode, ...located, frame: this.positionFrame, totalFrames, index: project.sequence.clips.findIndex((clip) => clip.id === located.clip.id) };
    }
    const shot = activeShot(project);
    const mix = totalFrames <= 1 ? 1 : clamp(this.positionFrame / (totalFrames - 1));
    return { mode: 'shot', shot, mix, frame: this.positionFrame, totalFrames, clip: null, index: -1, gap: false };
  }

  emitFrame() {
    const payload = this.currentPayload();
    if (payload.shot) this.onFrame(payload);
  }

  emitState() {
    const totalFrames = this.totalFrames();
    this.onState({
      mode: this.mode,
      playing: this.playing,
      loop: this.loop,
      frame: this.positionFrame,
      totalFrames,
      normalized: totalFrames <= 1 ? 0 : clamp(this.positionFrame / (totalFrames - 1)),
      driftFrames: this.driftFrames,
    });
  }

  dispose() { this.pause(); }
}
