import { clamp } from '../engine/math.js';
import { activeShot, sequenceDurationFrames } from '../core/schema.js';

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
    this.emitFrame();
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.pause();
    this.mode = mode === 'sequence' ? 'sequence' : 'shot';
    this.positionFrame = 0;
    this.emitFrame();
    this.emitState();
  }

  setLoop(loop) { this.loop = !!loop; this.emitState(); }
  toggleLoop() { this.setLoop(!this.loop); }

  totalFrames() {
    const project = this.getProject();
    if (this.mode === 'sequence') return Math.max(1, sequenceDurationFrames(project));
    return Math.max(1, activeShot(project)?.durationFrames || 96);
  }

  play() {
    if (this.playing) return;
    if (this.mode === 'sequence' && !this.getProject().sequence.clips.length) return;
    const total = this.totalFrames();
    if (this.positionFrame >= total - 1) this.positionFrame = 0;
    this.playing = true;
    this.lastTime = performance.now();
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
    const elapsed = Math.min(0.12, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    this.positionFrame += elapsed * fps;
    const total = this.totalFrames();
    if (this.positionFrame >= total) {
      if (this.loop) this.positionFrame %= total;
      else { this.positionFrame = Math.max(0, total - 1); this.pause(); this.emitFrame(); return; }
    }
    this.emitFrame();
    this.emitState();
    this.raf = requestAnimationFrame((next) => this.tick(next));
  }

  seekNormalized(value) {
    this.positionFrame = clamp(value) * Math.max(0, this.totalFrames() - 1);
    this.emitFrame();
    this.emitState();
  }

  seekFrame(value) {
    this.positionFrame = clamp(value, 0, Math.max(0, this.totalFrames() - 1));
    this.emitFrame(); this.emitState();
  }

  goStart() { this.seekFrame(0); }
  goEnd() { this.seekFrame(Math.max(0, this.totalFrames() - 1)); }

  refresh() {
    const total = this.totalFrames();
    this.positionFrame = clamp(this.positionFrame, 0, Math.max(0, total - 1));
    this.emitFrame(); this.emitState();
  }

  locateSequenceFrame(project, frame) {
    let cursor = 0;
    for (let index = 0; index < project.sequence.clips.length; index += 1) {
      const clip = project.sequence.clips[index];
      const duration = Math.max(1, clip.durationFrames || 1);
      if (frame < cursor + duration || index === project.sequence.clips.length - 1) {
        const local = Math.max(0, frame - cursor);
        const mix = duration <= 1 ? 1 : clamp(local / (duration - 1));
        return { clip, index, shot: project.shots.byId[clip.shotId], mix, localFrame: local, clipStart: cursor };
      }
      cursor += duration;
    }
    return null;
  }

  currentPayload() {
    const project = this.getProject();
    const totalFrames = this.totalFrames();
    if (this.mode === 'sequence' && project.sequence.clips.length) {
      const located = this.locateSequenceFrame(project, this.positionFrame);
      return { mode: this.mode, ...located, frame: this.positionFrame, totalFrames };
    }
    const shot = activeShot(project);
    const mix = totalFrames <= 1 ? 1 : clamp(this.positionFrame / (totalFrames - 1));
    return { mode: 'shot', shot, mix, frame: this.positionFrame, totalFrames, clip: null, index: -1 };
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
    });
  }

  dispose() { this.pause(); }
}
