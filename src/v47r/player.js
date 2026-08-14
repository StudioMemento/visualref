import {candidateRecord} from "./commands.js";
import {evaluateShotSnapshot} from "./delta-engine.js";

const ICON={
  loop:'<svg viewBox="0 0 24 24"><path d="M20 8a8 8 0 0 0-14-3L3 8M4 16a8 8 0 0 0 14 3l3-3M3 3v5h5M21 21v-5h-5"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg>',pause:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  start:'<svg viewBox="0 0 24 24"><path d="M6 5v14M18 6l-8 6 8 6z"/></svg>',end:'<svg viewBox="0 0 24 24"><path d="M18 5v14M6 6l8 6-8 6z"/></svg>',
  select:'<svg viewBox="0 0 24 24"><path d="m5 3 13 9-6 1 3 6-3 2-3-6-4 4z"/></svg>',move:'<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M22 12l-3-3m3 3-3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3"/></svg>',
  rotate:'<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2 5.3M20 4v7h-7"/></svg>',scale:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M4 4l6 6M20 4l-6 6M20 20l-6-6M4 20l6-6"/></svg>',
  pivot:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7"/></svg>',world:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9M12 3c-3 3-4 6-4 9s1 6 4 9"/></svg>',
  snap:'<svg viewBox="0 0 24 24"><path d="M6 3v10a6 6 0 0 0 12 0V3M6 8h5M13 8h5"/></svg>',frame:'<svg viewBox="0 0 24 24"><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/></svg>',
  ground:'<svg viewBox="0 0 24 24"><path d="M3 19h18M12 3v12M8 11l4 4 4-4"/></svg>',reset:'<svg viewBox="0 0 24 24"><path d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12 2L20 14M4 10l2.5-3a7 7 0 0 1 12 2"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><path d="M8 3v18M16 3v18M3 8h18M3 16h18"/></svg>',helpers:'<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="4"/></svg>',
  dice:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/></svg>',
  add:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',open:'<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6H5V6h6"/></svg>',
  prev:'<svg viewBox="0 0 24 24"><path d="M7 5v14M18 6l-8 6 8 6z"/></svg>',next:'<svg viewBox="0 0 24 24"><path d="M17 5v14M6 6l8 6-8 6z"/></svg>'
};
const activeShot=state=>state.shots?.byId?.[state.shots.activeShotId];
const aspectValue=value=>{const [a,b]=String(value||"16:9").split(":").map(Number);return a>0&&b>0?a/b:16/9;};
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

export class RecoveryPlayer{
  constructor({root,store,commands,persistence,RendererService,evaluateShot,evaluateSequence,sequenceDuration,workspace="viewport",toast=()=>{},onStatus=()=>{},instrumentation={}}){
    this.root=root;this.store=store;this.commands=commands;this.persistence=persistence;this.evaluateShot=evaluateShot;this.evaluateSequence=evaluateSequence;this.sequenceDuration=sequenceDuration;this.workspace=workspace;this.toast=toast;this.onStatus=onStatus;this.instrumentation=instrumentation;this.state=store.get();this.lastTick=performance.now();this.feedbackTimer=null;this.exporting=false;
    this.build();this.bind();
    this.renderer=new RendererService({canvas:this.canvas,persistence,workspace,onStatus:status=>{this.rendererStatus=status;this.onStatus(status);this.renderUI();},onAssetProblem:issue=>{try{commands.dispatch("asset.markMissing",issue);}catch{}}});
    this.instrumentation.rendererInstances=(this.instrumentation.rendererInstances||0)+1;this.instrumentation.rendererId=this.renderer.__instanceId||`renderer-${this.instrumentation.rendererInstances}`;
    this.unsubscribe=store.subscribe((state,meta)=>{this.state=state;this.renderUI(meta);this.updateGate();});
    this.resizeObserver=new ResizeObserver(()=>this.updateGate());this.resizeObserver.observe(this.stage);
    this.setWorkspace(workspace);this.raf=requestAnimationFrame(time=>this.tick(time));
  }
  build(){
    this.root.innerHTML=`<section class="vr-player-shell">
      <header class="vr-player-status"><div><span class="workspace" data-role="workspace">VIEWPORT</span><b data-role="status">BOOTING</b></div><div class="center"><b data-role="shot-name">—</b><span data-role="mode">WORLD</span></div><div class="right"><b class="timecode" data-role="timecode">00:00:00:00</b><span data-role="format">16:9 · 24 FPS</span></div></header>
      <div class="vr-stage" data-role="stage" tabindex="0"><canvas data-role="canvas"></canvas><div class="vr-output-gate" data-role="gate"></div><div class="vr-stage-badge"><span data-role="world-badge">GREY LIMBO</span><span data-role="review-badge" hidden></span></div><div class="vr-center-feedback" data-role="feedback">▶</div></div>
      <footer class="vr-player-dock" data-role="dock"></footer>
    </section>`;
    this.canvas=this.root.querySelector('[data-role="canvas"]');this.stage=this.root.querySelector('[data-role="stage"]');this.gate=this.root.querySelector('[data-role="gate"]');this.dock=this.root.querySelector('[data-role="dock"]');this.scrub=null;
  }
  bind(){
    this.root.addEventListener("click",event=>{const action=event.target.closest("[data-player-action]")?.dataset.playerAction;if(action)this.handleAction(action,event);});
    this.root.addEventListener("input",event=>{if(event.target.matches('[data-role="player-scrub"]'))this.seek(Number(event.target.value));});
    this.stage.addEventListener("click",event=>{if(this.workspace==="viewport"||event.target.closest("button,input,select"))return;this.commands.dispatch("playback.toggle");this.showFeedback(this.state.playback.playing?"Ⅱ":"▶");});
  }
  setWorkspace(workspace){
    this.workspace=workspace;this.renderer?.setRecoveryWorkspace?.(workspace);if(this.renderer&&!this.renderer.setRecoveryWorkspace){this.renderer.workspace=workspace;this.renderer.viewportActive=workspace==="viewport";}
    if(workspace!=="viewport")this.renderer?.configureViewport?.({active:false,nodeId:this.state.ui?.selectedNodeId,cameraMode:"shot"});
    this.renderDock();this.renderUI();
  }
  handleAction(action){
    const state=this.store.get();
    if(action==="loop")this.commands.dispatch("playback.setLoop",{value:!state.playback.loop});
    else if(action==="play")this.commands.dispatch("playback.toggle");
    else if(action==="start")this.commands.dispatch("playback.jumpStart");
    else if(action==="end")this.commands.dispatch("playback.jumpEnd");
    else if(action==="candidate")this.commands.dispatch("candidate.generate",{});
    else if(action==="add")this.commands.dispatch("shot.addToTimeline",{trackId:"v1"});
    else if(action==="open-render")this.commands.dispatch("timeline.openSelectedInRender");
    else if(action==="prev-clip")this.jumpClip(-1);
    else if(action==="next-clip")this.jumpClip(1);
    else if(action==="tool-select")this.commands.dispatch("ui.setViewportTool",{tool:"select"});
    else if(action==="tool-move")this.commands.dispatch("ui.setViewportTool",{tool:"translate"});
    else if(action==="tool-rotate")this.commands.dispatch("ui.setViewportTool",{tool:"rotate"});
    else if(action==="tool-scale")this.commands.dispatch("ui.setViewportTool",{tool:"scale"});
    else if(action==="tool-pivot")this.commands.dispatch("ui.setViewportTool",{tool:"pivot"});
    else if(action==="space")this.commands.dispatch("ui.setViewportSpace",{space:state.ui.viewportSpace==="local"?"world":"local"});
    else if(action==="snap")this.commands.dispatch("ui.setViewportSnap",{enabled:!state.ui.viewportSnapEnabled});
    else if(action==="frame")this.renderer?.frameNode?.(state.ui.selectedNodeId,false);
    else if(action==="ground")this.groundSelected();
    else if(action==="reset")this.commands.dispatch("scene.resetNodeTransform",{nodeId:state.ui.selectedNodeId});
    else if(action==="grid")this.commands.dispatch("scene.toggleGrid");
    else if(action==="helpers")this.commands.dispatch("scene.toggleHelpers");
  }
  groundSelected(){
    const state=this.store.get(),nodeId=state.ui.selectedNodeId,transform=this.renderer?.getGroundedTransform?.(nodeId,state);if(transform){this.commands.dispatch("scene.groundNode",{nodeId,transform});this.commands.dispatch("world.markGrounded");this.toast("HERO GROUNDED");}
  }
  seek(frame){if(this.workspace==="timeline")this.commands.dispatch("timeline.setPlayhead",{frame});else this.commands.dispatch("playback.seek",{frame});}
  jumpClip(direction){
    const state=this.store.get(),clips=Object.values(state.timeline.clips||{}).filter(clip=>clip.type==="shot").sort((a,b)=>a.startFrame-b.startFrame);if(!clips.length)return;const frame=state.timeline.playheadFrame,index=clips.findIndex(clip=>frame>=clip.startFrame&&frame<clip.startFrame+clip.durationFrames),next=clips[Math.max(0,Math.min(clips.length-1,(index<0?0:index)+direction))];if(next){this.commands.dispatch("timeline.selectClip",{clipId:next.id});this.commands.dispatch("timeline.setPlayhead",{frame:next.startFrame});}
  }
  renderDock(){
    if(this.workspace==="viewport")this.dock.innerHTML=`<div class="vr-dock-group">${tool("tool-select","SELECT",ICON.select)}${tool("tool-move","MOVE",ICON.move)}${tool("tool-rotate","ROTATE",ICON.rotate)}${tool("tool-scale","SCALE",ICON.scale)}${tool("tool-pivot","PIVOT",ICON.pivot)}</div><div class="vr-dock-group">${tool("space","WORLD",ICON.world)}${tool("snap","SNAP",ICON.snap)}</div><div class="vr-dock-group">${tool("frame","FRAME",ICON.frame)}${tool("ground","GROUND",ICON.ground)}${tool("reset","RESET",ICON.reset)}${tool("grid","GRID",ICON.grid)}${tool("helpers","GUIDES",ICON.helpers)}</div>`;
    else if(this.workspace==="render")this.dock.innerHTML=`<div class="vr-dock-group">${tool("loop","LOOP",ICON.loop)}${tool("play","PLAY",ICON.play,"primary")}${tool("start","START",ICON.start)}${tool("end","END",ICON.end)}</div>${scrubMarkup()}<div class="vr-dock-spacer"></div><div class="vr-dock-group">${tool("candidate","GENERATE",ICON.dice,"primary")}${tool("add","ADD TO TIMELINE",ICON.add)}</div>`;
    else this.dock.innerHTML=`<div class="vr-dock-group">${tool("prev-clip","PREVIOUS",ICON.prev)}${tool("play","PLAY",ICON.play,"primary")}${tool("next-clip","NEXT",ICON.next)}${tool("loop","LOOP",ICON.loop)}</div>${scrubMarkup()}<div class="vr-dock-spacer"></div><div class="vr-dock-group">${tool("add","ADD SHOT",ICON.add)}${tool("open-render","OPEN IN RENDER",ICON.open)}</div>`;
    this.scrub=this.root.querySelector('[data-role="player-scrub"]');
  }
  renderUI(meta){
    const state=this.state,shot=activeShot(state),isTimeline=this.workspace==="timeline",duration=isTimeline?this.sequenceDuration(state):Math.max(1,shot?.durationFrames||72),frame=isTimeline?state.timeline.playheadFrame:state.playback.frame,record=shot?candidateRecord(state,shot.id):null;
    this.root.querySelector('[data-role="workspace"]').textContent=this.workspace.toUpperCase();this.root.querySelector('[data-role="status"]').textContent=this.rendererStatus?.label||"ONE RENDERER";
    this.root.querySelector('[data-role="shot-name"]').textContent=isTimeline?(state.timeline.selectedClipId?state.timeline.clips[state.timeline.selectedClipId]?.alias||"SEQUENCE":"SEQUENCE"):(shot?.name||"NO SHOT");
    const mode=this.workspace==="viewport"?"BUILD WORLD":this.workspace==="timeline"?"SEQUENCE":(record?.review||"current").toUpperCase();this.root.querySelector('[data-role="mode"]').textContent=mode;
    this.root.querySelector('[data-role="timecode"]').textContent=formatTimecode(Math.max(0,frame),state.settings.fps);this.root.querySelector('[data-role="format"]').textContent=`${state.settings.aspectRatio} · ${state.settings.fps} FPS`;
    const recipe=state.recovery?.world?.recipe||"grey-limbo";this.root.querySelector('[data-role="world-badge"]').textContent=recipe.replace(/-/g," ").toUpperCase();const review=this.root.querySelector('[data-role="review-badge"]');review.hidden=this.workspace!=="render"||record?.review==="current";review.textContent=record?.review?.toUpperCase()||"";review.className=`${record?.review==="candidate"?"candidate":""}`;
    if(this.scrub){this.scrub.max=String(Math.max(1,Math.round(duration)));this.scrub.value=String(Math.max(0,Math.min(duration,frame)));this.root.querySelector('[data-role="player-frame"]').textContent=String(Math.round(frame)).padStart(3,"0");}
    this.root.querySelectorAll('[data-player-action="play"]').forEach(button=>{button.classList.toggle("active",state.playback.playing);button.innerHTML=`${state.playback.playing?ICON.pause:ICON.play}<span>${state.playback.playing?"PAUSE":"PLAY"}</span>`;});
    this.root.querySelectorAll('[data-player-action="loop"]').forEach(button=>button.classList.toggle("active",Boolean(state.playback.loop)));
    if(this.workspace==="viewport"){
      const activeTool={select:"tool-select",translate:"tool-move",rotate:"tool-rotate",scale:"tool-scale",pivot:"tool-pivot"}[state.ui.viewportTool];this.root.querySelectorAll("[data-player-action^='tool-']").forEach(button=>button.classList.toggle("active",button.dataset.playerAction===activeTool));
      const space=this.root.querySelector('[data-player-action="space"]');if(space){space.classList.toggle("active",state.ui.viewportSpace==="local");space.querySelector("span").textContent=(state.ui.viewportSpace||"world").toUpperCase();}
      this.root.querySelector('[data-player-action="snap"]')?.classList.toggle("active",Boolean(state.ui.viewportSnapEnabled));this.root.querySelector('[data-player-action="grid"]')?.classList.toggle("active",state.scene.showGrid!==false);this.root.querySelector('[data-player-action="helpers"]')?.classList.toggle("active",state.scene.showHelpers!==false);
    }
  }
  displayFrame(state,frame){
    if(this.workspace==="timeline")return this.evaluateSequence(state,frame);
    const shot=activeShot(state);if(!shot)return null;
    if(this.workspace==="render"){
      const record=candidateRecord(state,shot.id),review=record.review||"current";
      if(review==="candidate"&&record.candidate)return evaluateShotSnapshot(record.candidate,frame);
      if(review==="previous"&&record.previous)return evaluateShotSnapshot(record.previous,frame);
    }
    return this.evaluateShot(state,shot.id,frame);
  }
  tick(now){
    const state=this.store.get(),fps=Math.max(1,Number(state.settings.fps)||24),timeline=this.workspace==="timeline",start=timeline?state.timeline.inFrame:0,end=timeline?Math.max(start+1,state.timeline.outFrame||this.sequenceDuration(state)):Math.max(1,activeShot(state)?.durationFrames||72);
    if(state.playback.playing){const dt=Math.min(.1,(now-this.lastTick)/1000),current=timeline?state.timeline.playheadFrame:state.playback.frame;let next=current+dt*fps,playing=true;if(next>=end){if(state.playback.loop)next=start;else{next=end;playing=false;}}this.store.transient("Playback tick",draft=>{draft.playback.frame=next;draft.playback.playing=playing;if(timeline)draft.timeline.playheadFrame=next;});}
    this.lastTick=now;const current=this.store.get(),frame=timeline?current.timeline.playheadFrame:current.playback.frame,evaluated=this.displayFrame(current,frame);if(evaluated)this.renderer?.render?.(evaluated,current,now/1000);this.raf=requestAnimationFrame(time=>this.tick(time));
  }
  updateGate(){
    const rect=this.stage.getBoundingClientRect();if(!rect.width||!rect.height)return;const ratio=aspectValue(this.state.settings?.aspectRatio),fill=.90;let width=rect.width*fill,height=width/ratio;if(height>rect.height*fill){height=rect.height*fill;width=height*ratio;}this.gate.style.width=`${Math.round(width)}px`;this.gate.style.height=`${Math.round(height)}px`;this.gate.style.left=`${Math.round((rect.width-width)/2)}px`;this.gate.style.top=`${Math.round((rect.height-height)/2)}px`;
  }
  showFeedback(symbol){const element=this.root.querySelector('[data-role="feedback"]');element.textContent=symbol;element.classList.add("on");clearTimeout(this.feedbackTimer);this.feedbackTimer=setTimeout(()=>element.classList.remove("on"),220);}
  async exportPlayblast(){
    if(this.exporting)throw new Error("Recorder already active");if(!this.canvas.captureStream||!globalThis.MediaRecorder)throw new Error("Browser recording is unavailable");this.exporting=true;const state=this.store.get(),fps=state.settings.fps,start=state.timeline.inFrame,end=Math.max(start+1,state.timeline.outFrame||this.sequenceDuration(state)),before={frame:state.timeline.playheadFrame,playing:state.playback.playing,loop:state.playback.loop};
    try{const stream=this.canvas.captureStream(fps),type=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(value=>MediaRecorder.isTypeSupported(value))||"",recorder=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:8_000_000}:undefined),chunks=[];recorder.ondataavailable=event=>event.data?.size&&chunks.push(event.data);const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=event=>reject(event.error||new Error("Recorder failed"));});this.store.transient("Playblast start",draft=>{draft.timeline.playheadFrame=start;draft.playback.frame=start;draft.playback.loop=false;draft.playback.playing=true;});recorder.start(200);await new Promise(resolve=>{const watch=()=>{const value=this.store.get();if(!value.playback.playing||value.timeline.playheadFrame>=end-.5)resolve();else requestAnimationFrame(watch);};watch();});recorder.stop();await stopped;const blob=new Blob(chunks,{type:recorder.mimeType||"video/webm"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="memento-v47r-playblast.webm";a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);}
    finally{this.store.transient("Playblast restore",draft=>{draft.timeline.playheadFrame=before.frame;draft.playback.frame=before.frame;draft.playback.playing=before.playing;draft.playback.loop=before.loop;});this.exporting=false;}
  }
  dispose(){cancelAnimationFrame(this.raf);this.unsubscribe?.();this.resizeObserver?.disconnect();clearTimeout(this.feedbackTimer);this.renderer?.dispose?.();}
}
function tool(action,label,icon,extra=""){return `<button type="button" class="vr-dock-button ${extra}" data-player-action="${action}" title="${label}">${icon}<span>${label}</span></button>`;}
function scrubMarkup(){return `<label class="vr-scrub"><input data-role="player-scrub" type="range" min="0" max="72" step="1" value="0"><output data-role="player-frame">000</output></label>`;}
function formatTimecode(frame,fps=24){const total=Math.max(0,Math.round(frame)),f=total%fps,seconds=Math.floor(total/fps),s=seconds%60,m=Math.floor(seconds/60)%60,h=Math.floor(seconds/3600);return [h,m,s,f].map(value=>String(value).padStart(2,"0")).join(":");}
