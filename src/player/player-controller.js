import {RendererService} from "../engine/renderer-service.js";
import {activeShot,deltaSummary,evaluateSequence,evaluateShot,sequenceDuration} from "./shot-interpolator.js";
import {aspectNumber,clamp,formatTimecode} from "../core/utils.js";

const workspaceLabel=value=>value.toUpperCase();

export class PlayerController{
  constructor({root,store,commands,workspace,toast}){
    this.root=root;this.store=store;this.commands=commands;this.workspace=workspace;this.toast=toast;this.state=store.get();this.lastTick=performance.now();this.feedbackTimer=null;this.build();this.bind();
    this.renderer=new RendererService({canvas:this.canvas,onStatus:status=>{this.rendererStatus=status;this.renderStatus();}});
    this.unsubscribe=store.subscribe((state,meta)=>{this.state=state;this.renderUI(meta);});
    this.raf=requestAnimationFrame(time=>this.tick(time));
  }
  build(){
    this.root.innerHTML=`
      <section class="player-shell" aria-label="Shared VisualRef Player">
        <header class="player-statusbar">
          <div class="player-status-left"><span class="workspace-label">${workspaceLabel(this.workspace)}</span><i>·</i><b class="renderer-badge fallback" data-role="renderer-status">BOOTING</b></div>
          <div class="player-status-center"><b data-role="shot-name">—</b><span data-role="playback-mode">SHOT</span></div>
          <div class="player-status-right"><b data-role="timecode">00:00:00:00</b><span data-role="format">16:9 · 24 FPS</span></div>
        </header>
        <div class="stage-wrap" data-role="stage" tabindex="0" aria-label="3D player surface">
          <div class="stage-placeholder"></div>
          <canvas data-role="canvas"></canvas>
          <div class="output-gate" data-role="gate"></div>
          <div class="stage-overlay"><span class="stage-chip" data-role="stage-mode">SHOT PLAYER</span><span class="stage-chip" data-role="stage-note">CALIBRATED PROXY</span></div>
          <div class="center-feedback" data-role="feedback">▶</div>
        </div>
        <div class="transport-primary">
          <button class="transport-button" data-action="loop" title="Loop">↻</button>
          <button class="transport-button play" data-action="play" title="Play/Pause">▶</button>
          <button class="transport-button start" data-action="start">START</button>
          <button class="transport-button end" data-action="end">END</button>
          <div class="scrub-control">
            <label>SHOT SCRUB</label>
            <input data-role="scrub" type="range" min="0" max="72" value="0" step="1">
            <output data-role="frame">000</output>
            <output class="delta-output" data-role="delta">00 Δ</output>
          </div>
        </div>
        <div class="transport-secondary">
          <label class="transport-field"><span>SECONDS</span><input data-role="seconds" type="number" min=".5" max="20" step=".1"></label>
          <label class="transport-field"><span>FPS</span><select data-role="fps"><option>24</option><option>25</option><option>30</option><option>60</option></select></label>
          <label class="transport-field"><span>ASPECT</span><select data-role="aspect"><option>16:9</option><option>2.39:1</option><option>4:3</option><option>1:1</option><option>9:16</option></select></label>
          <label class="transport-field variant-mode"><span>VARIANT</span><select data-role="variant-mode"><option value="near">NEAR</option><option value="balanced">BALANCED</option><option value="bold">BOLD</option></select></label>
          <button class="transport-button text accent" data-action="generate">GENERATE</button>
          <button class="transport-button text" data-role="variant-count" title="Variant number">V01</button>
          <div class="transport-spacer"></div>
          <button class="transport-button text add" data-action="add-timeline">ADD TO TIMELINE</button>
        </div>
      </section>`;
    this.canvas=this.root.querySelector('[data-role="canvas"]');this.stage=this.root.querySelector('[data-role="stage"]');this.gate=this.root.querySelector('[data-role="gate"]');this.scrub=this.root.querySelector('[data-role="scrub"]');
  }
  bind(){
    this.root.addEventListener("click",event=>{
      const action=event.target.closest("[data-action]")?.dataset.action;if(!action)return;
      if(action==="loop")this.commands.dispatch("playback.setLoop",{value:!this.state.playback.loop});
      if(action==="play")this.commands.dispatch("playback.toggle");
      if(action==="start")this.commands.dispatch("playback.jumpStart");
      if(action==="end")this.commands.dispatch("playback.jumpEnd");
      if(action==="generate"){const mode=this.root.querySelector('[data-role="variant-mode"]').value;this.commands.dispatch("shot.generateVariant",{mode});this.toast?.(`${mode.toUpperCase()} VARIANT GENERATED`);}
      if(action==="add-timeline")this.commands.dispatch("shot.addToTimeline",{trackId:"v1"});
    });
    this.scrub.addEventListener("input",event=>this.commands.dispatch("playback.seek",{frame:Number(event.target.value)}));
    this.root.querySelector('[data-role="seconds"]').addEventListener("change",event=>{const fps=this.state.settings.fps,frames=Math.max(12,Math.round(Number(event.target.value)*fps));this.commands.dispatch("shot.setDuration",{frames});});
    this.root.querySelector('[data-role="fps"]').addEventListener("change",event=>this.store.commit("Project FPS",state=>{state.settings.fps=Number(event.target.value);const shot=activeShot(state);state.playback.frame=Math.min(state.playback.frame,shot.durationFrames);}));
    this.root.querySelector('[data-role="aspect"]').addEventListener("change",event=>this.store.commit("Project aspect ratio",state=>state.settings.aspectRatio=event.target.value));
    this.root.querySelector('[data-role="variant-mode"]').addEventListener("change",event=>this.store.transient("Variant mode",state=>activeShot(state).variantMode=event.target.value,{persist:true,broadcast:true}));
    let pointerDown=null;
    this.stage.addEventListener("pointerdown",event=>{pointerDown={x:event.clientX,y:event.clientY,time:performance.now()};});
    this.stage.addEventListener("pointerup",event=>{
      if(!pointerDown)return;const moved=Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y),elapsed=performance.now()-pointerDown.time;pointerDown=null;
      if(moved<7&&elapsed<450&&this.workspace!=="viewport"){this.commands.dispatch("playback.toggle");this.showFeedback(this.state.playback.playing?"Ⅱ":"▶");}
    });
    addEventListener("keydown",event=>{
      if(event.code==="Space"&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")){event.preventDefault();this.commands.dispatch("playback.toggle");}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z"){event.preventDefault();event.shiftKey?this.commands.dispatch("history.redo"):this.commands.dispatch("history.undo");}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y"){event.preventDefault();this.commands.dispatch("history.redo");}
    });
  }
  showFeedback(symbol){const el=this.root.querySelector('[data-role="feedback"]');el.textContent=symbol;el.classList.add("on");clearTimeout(this.feedbackTimer);this.feedbackTimer=setTimeout(()=>el.classList.remove("on"),220);}
  renderStatus(){
    const el=this.root.querySelector('[data-role="renderer-status"]');if(!el)return;const status=this.rendererStatus||{label:"BOOTING",mode:"fallback"};el.textContent=status.label;el.className=`renderer-badge ${status.mode}`;
  }
  renderUI(){
    const state=this.state,shot=activeShot(state),isTimeline=this.workspace==="timeline",duration=isTimeline?sequenceDuration(state):shot.durationFrames,frame=isTimeline?state.timeline.playheadFrame:state.playback.frame,delta=deltaSummary(state);
    this.root.querySelector('[data-role="shot-name"]').textContent=isTimeline?(state.timeline.selectedClipId?state.timeline.clips[state.timeline.selectedClipId]?.alias||"SEQUENCE":"SEQUENCE"):shot.name;
    this.root.querySelector('[data-role="playback-mode"]').textContent=isTimeline?"SEQUENCE":this.workspace==="viewport"?"VIEWPORT":"SHOT";
    this.root.querySelector('[data-role="timecode"]').textContent=formatTimecode(frame,state.settings.fps);
    this.root.querySelector('[data-role="format"]').textContent=`${state.settings.aspectRatio} · ${state.settings.fps} FPS`;
    this.root.querySelector('[data-role="stage-mode"]').textContent=isTimeline?"SEQUENCE PLAYER":this.workspace==="viewport"?"DIRECT VIEWPORT":"SHOT PLAYER";
    this.root.querySelector('[data-role="stage-note"]').textContent=state.assets.byId[state.assets.heroId]?.name||"CALIBRATED PROXY";
    this.scrub.max=String(duration);this.scrub.value=String(clamp(frame,0,duration));this.root.querySelector('[data-role="frame"]').textContent=String(Math.round(frame)).padStart(3,"0");this.root.querySelector('[data-role="delta"]').textContent=`${String(delta.count).padStart(2,"0")} Δ`;
    const loop=this.root.querySelector('[data-action="loop"]');loop.classList.toggle("active",state.playback.loop);
    const play=this.root.querySelector('[data-action="play"]');play.textContent=state.playback.playing?"Ⅱ":"▶";play.classList.toggle("active",state.playback.playing);
    const seconds=this.root.querySelector('[data-role="seconds"]');if(document.activeElement!==seconds)seconds.value=(shot.durationFrames/state.settings.fps).toFixed(1);
    this.root.querySelector('[data-role="fps"]').value=String(state.settings.fps);this.root.querySelector('[data-role="aspect"]').value=state.settings.aspectRatio;this.root.querySelector('[data-role="variant-mode"]').value=shot.variantMode||"balanced";this.root.querySelector('[data-role="variant-count"]').textContent=`V${String(shot.variant).padStart(2,"0")}`;
    const add=this.root.querySelector('[data-action="add-timeline"]');add.textContent=isTimeline?"ADD ACTIVE SHOT":"ADD TO TIMELINE";
    this.updateGate(state.settings.aspectRatio);this.renderStatus();
  }
  updateGate(aspect){
    const ratio=aspectNumber(aspect),rect=this.stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const stageRatio=rect.width/rect.height;let width,height;if(stageRatio>ratio){height=rect.height*.9;width=height*ratio;}else{width=rect.width*.92;height=width/ratio;}this.gate.style.width=`${width}px`;this.gate.style.height=`${height}px`;this.gate.style.aspectRatio="auto";
  }
  tick(now){
    const state=this.store.get(),fps=state.settings.fps,isTimeline=this.workspace==="timeline",duration=isTimeline?sequenceDuration(state):activeShot(state).durationFrames;
    if(state.playback.playing){const dt=Math.min(.1,(now-this.lastTick)/1000),advance=dt*fps;let next=(isTimeline?state.timeline.playheadFrame:state.playback.frame)+advance;if(next>=duration){if(state.playback.loop)next=0;else{next=duration;state.playback.playing=false;}}
      this.store.transient("Playback tick",draft=>{draft.playback.frame=next;if(isTimeline)draft.timeline.playheadFrame=next;});
    }
    this.lastTick=now;const current=this.store.get(),frame=isTimeline?current.timeline.playheadFrame:current.playback.frame,evaluated=isTimeline?evaluateSequence(current,frame):evaluateShot(current,current.shots.activeShotId,frame);this.renderer?.render(evaluated,current,now/1000);this.raf=requestAnimationFrame(time=>this.tick(time));
  }
  dispose(){cancelAnimationFrame(this.raf);this.unsubscribe?.();this.renderer?.dispose();}
}
