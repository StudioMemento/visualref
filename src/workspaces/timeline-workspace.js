import {TRACKS} from "../core/default-state.js";
import {SEQUENCE_PRESETS} from "../shots/sequence-presets.js";
import {activeShot,sequenceDuration} from "../player/shot-interpolator.js";
import {clamp,formatTimecode,uid} from "../core/utils.js";

const PRE_ROLL=10;
const TRACK_HEAD=76;
const TOOL_ICONS={
  select:'<svg viewBox="0 0 24 24"><path d="m5 3 13 9-6 2-3 6z"/></svg>',
  blade:'<svg viewBox="0 0 24 24"><path d="m4 19 7-7M14 9l6-6M9 4l11 11M4 9l11 11"/></svg>',
  slip:'<svg viewBox="0 0 24 24"><path d="M4 8h16M4 16h16M8 4 4 8l4 4M16 12l4 4-4 4"/></svg>',
  marker:'<svg viewBox="0 0 24 24"><path d="M6 3h12v13l-6 5-6-5z"/></svg>',
  fit:'<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
  export:'<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M4 19h16"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  mute:'<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  audio:'<svg viewBox="0 0 24 24"><path d="M9 18V5l10-2v13M9 8l10-2"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>',
  fx:'<svg viewBox="0 0 24 24"><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
  shot:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m9 9 6 3-6 3z"/></svg>'
};
const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const clipEnd=clip=>clip.startFrame+clip.durationFrames;
const trackCompatible=(state,trackId,clip)=>state.timeline.tracks[trackId]?.type===(clip.type==="shot"?"video":clip.type);

export class TimelineWorkspace{
  constructor({root,store,commands,toast,persistence,player}){
    this.root=root;this.store=store;this.commands=commands;this.toast=toast;this.persistence=persistence;this.player=player;
    this.drag=null;this.latestState=store.get();this.audioBusy=false;this.build();this.bind();
    this.unsubscribe=store.subscribe((state,meta)=>{this.latestState=state;if(meta?.label==="Playback tick"){this.renderTransportState(state);return;}if(meta?.type==="gesture"||this.drag){this.renderTransportState(state);return;}this.render(state,meta);});
    this.render(this.latestState);
  }
  build(){
    this.root.innerHTML=`
      <div class="timeline-rebuild">
        <header class="timeline-game-toolbar">
          <div class="timeline-tool-group" role="group" aria-label="Timeline tools">
            ${["select","blade","slip"].map(tool=>`<button class="timeline-icon-button" data-tool="${tool}" title="${tool.toUpperCase()}">${TOOL_ICONS[tool]}<span>${tool}</span></button>`).join("")}
          </div>
          <div class="timeline-time-cluster"><span>PLAYHEAD</span><b data-role="timeline-timecode">00:00:00:00</b></div>
          <button class="timeline-icon-button" data-timeline-action="snap" title="Snap"><span class="snap-dot"></span><span>SNAP</span></button>
          <button class="timeline-icon-button" data-timeline-action="marker" title="Add marker">${TOOL_ICONS.marker}<span>MARK</span></button>
          <button class="timeline-icon-button" data-timeline-action="fit" title="Fit timeline">${TOOL_ICONS.fit}<span>FIT</span></button>
          <button class="timeline-icon-button playblast" data-timeline-action="playblast" title="Export playblast">${TOOL_ICONS.export}<span>PLAYBLAST</span></button>
          <label class="timeline-zoom-control"><span>ZOOM</span><input data-role="timeline-zoom" type="range" min="2" max="14" step=".5" value="5"></label>
        </header>
        <section class="sequence-preset-strip" data-role="sequence-presets" aria-label="Sequence presets"></section>
        <div class="timeline-body-game">
          <aside class="timeline-library-game">
            <div class="timeline-library-title"><span>BUILD</span><b>SEQUENCE</b></div>
            <button class="timeline-library-action primary" data-library-add>${TOOL_ICONS.shot}<span><b data-role="library-shot-name">ACTIVE SHOT</b><small>ADD / UPDATE V1</small></span></button>
            <div class="timeline-library-label">FX</div>
            <div class="timeline-fx-grid">
              <button data-fx="flash">FLASH</button><button data-fx="vignette">VIGNETTE</button><button data-fx="title">TITLE</button><button data-fx="grain">GRAIN</button>
            </div>
            <div class="timeline-library-label">AUDIO</div>
            <label class="timeline-library-action audio-upload" data-role="audio-upload-label">${TOOL_ICONS.audio}<span><b>IMPORT AUDIO</b><small>WAVEFORM + PLAYBACK</small></span><input data-role="audio-upload" type="file" accept="audio/*" hidden></label>
            <div class="timeline-library-tip"><b>GAME CONTROLS</b><span>Drag clips · trim both edges · B blade · S slip · M marker</span></div>
          </aside>
          <section class="timeline-board-game">
            <div class="timeline-scroll" data-role="timeline-scroll">
              <div class="timeline-inner" data-role="timeline-inner">
                <div class="timeline-ruler" data-role="timeline-ruler"></div>
                <div class="timeline-tracks" data-role="timeline-tracks"></div>
                <div class="timeline-playhead" data-role="timeline-playhead"></div>
              </div>
            </div>
          </section>
        </div>
        <section class="clip-inspector-game" data-role="clip-inspector"></section>
      </div>`;
  }
  bind(){
    this.root.addEventListener("click",event=>this.handleClick(event));
    this.root.addEventListener("change",event=>this.handleChange(event));
    this.root.querySelector('[data-role="timeline-zoom"]').addEventListener("input",event=>this.commands.dispatch("timeline.setZoom",{value:Number(event.target.value)}));
    this.root.querySelector('[data-role="timeline-ruler"]').addEventListener("pointerdown",event=>this.seekFromPointer(event));
    this.root.querySelector('[data-role="timeline-tracks"]').addEventListener("pointerdown",event=>this.beginClipInteraction(event));
    this.root.querySelector('[data-role="audio-upload"]').addEventListener("change",event=>this.importAudio(event.target.files?.[0]));
    addEventListener("keydown",this.keyHandler=event=>{
      if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||""))return;
      const key=event.key.toLowerCase();
      if(key==="v")this.commands.dispatch("ui.setTimelineTool",{tool:"select"});
      if(key==="b")this.commands.dispatch("ui.setTimelineTool",{tool:"blade"});
      if(key==="s")this.commands.dispatch("ui.setTimelineTool",{tool:"slip"});
      if(key==="m")this.commands.dispatch("timeline.addMarker",{});
      if((key==="delete"||key==="backspace")&&this.latestState.timeline.selectedClipId){event.preventDefault();this.commands.dispatch("timeline.deleteClip",{clipId:this.latestState.timeline.selectedClipId});}
    });
  }
  handleClick(event){
    const tool=event.target.closest("[data-tool]")?.dataset.tool;if(tool){this.commands.dispatch("ui.setTimelineTool",{tool});return;}
    const action=event.target.closest("[data-timeline-action]")?.dataset.timelineAction;
    if(action==="snap")this.commands.dispatch("timeline.toggleSnap");
    if(action==="fit")this.fitTimeline();
    if(action==="marker")this.commands.dispatch("timeline.addMarker",{});
    if(action==="playblast")this.exportPlayblast();
    if(event.target.closest("[data-library-add]"))this.commands.dispatch("shot.addToTimeline",{trackId:"v1"});
    const fx=event.target.closest("[data-fx]")?.dataset.fx;if(fx)this.commands.dispatch("timeline.addFx",{effect:fx,startFrame:this.latestState.timeline.playheadFrame});
    const presetId=event.target.closest("[data-sequence-preset]")?.dataset.sequencePreset;if(presetId)this.commands.dispatch("timeline.applySequencePreset",{presetId});
    if(event.target.closest("[data-clear-sequence]"))this.commands.dispatch("timeline.clearShots");
    const markerId=event.target.closest("[data-delete-marker]")?.dataset.deleteMarker;if(markerId){event.stopPropagation();this.commands.dispatch("timeline.deleteMarker",{markerId});return;}
    const trackButton=event.target.closest("[data-track-action]");if(trackButton){const [trackId,field]=trackButton.dataset.trackAction.split(":");this.commands.dispatch("timeline.toggleTrack",{trackId,field});return;}
    const clipEl=event.target.closest("[data-clip]");if(clipEl&&!event.target.closest("button,input,select,[data-clip-handle]"))this.commands.dispatch("timeline.selectClip",{clipId:clipEl.dataset.clip});
    if(event.target.closest("[data-delete-selected]")){const id=this.latestState.timeline.selectedClipId;if(id)this.commands.dispatch("timeline.deleteClip",{clipId:id});}
    if(event.target.closest("[data-make-unique]")){const id=this.latestState.timeline.selectedClipId;if(id)this.commands.dispatch("timeline.makeUnique",{clipId:id});}
  }
  handleChange(event){
    const field=event.target.dataset.clipField;if(field)this.commands.dispatch("timeline.updateSelected",{field,value:event.target.value});
  }
  async exportPlayblast(){
    const button=this.root.querySelector('[data-timeline-action="playblast"]');button?.classList.add("busy");
    try{if(!this.player?.exportPlayblast)throw new Error("Playblast recorder unavailable");await this.player.exportPlayblast();this.toast?.("PLAYBLAST EXPORTED");}
    catch(error){console.error(error);this.toast?.(`PLAYBLAST · ${error.message||"FAILED"}`);}
    finally{button?.classList.remove("busy");}
  }
  fitTimeline(){
    const scroll=this.root.querySelector('[data-role="timeline-scroll"]'),available=Math.max(240,scroll.clientWidth-76),frames=this.timelineEnd(this.latestState)+PRE_ROLL*2,value=clamp(available/Math.max(1,frames),2,14);this.commands.dispatch("timeline.setZoom",{value});
  }
  timelineEnd(state){return Math.max(48,state.timeline.outFrame||0,sequenceDuration(state),...Object.values(state.timeline.clips).map(clipEnd));}
  seekFromPointer(event){
    if(event.target.closest("[data-delete-marker]"))return;const state=this.latestState,ruler=event.currentTarget,rect=ruler.getBoundingClientRect(),frame=(event.clientX-rect.left)/state.timeline.zoom-PRE_ROLL;this.commands.dispatch("timeline.setPlayhead",{frame});
  }
  beginClipInteraction(event){
    if(event.button!==0||event.target.closest("button,input,select"))return;
    const clipEl=event.target.closest("[data-clip]");if(!clipEl)return;const state=this.latestState,clipId=clipEl.dataset.clip,clip=state.timeline.clips[clipId],track=state.timeline.tracks[clip?.trackId];if(!clip||track?.locked)return;
    event.preventDefault();this.commands.dispatch("timeline.selectClip",{clipId});
    const rect=clipEl.getBoundingClientRect(),frameAtPointer=clip.startFrame+((event.clientX-rect.left)/state.timeline.zoom),tool=state.ui.timelineTool||"select";
    if(tool==="blade"){
      const cut=clamp(Math.round(frameAtPointer),clip.startFrame+1,clipEnd(clip)-1);if(cut>clip.startFrame&&cut<clipEnd(clip))this.commands.dispatch("timeline.splitClip",{clipId,frame:cut});return;
    }
    const handle=event.target.closest("[data-clip-handle]")?.dataset.clipHandle||null,mode=handle?`trim-${handle}`:tool==="slip"&&clip.type==="shot"?"slip":"move";
    clipEl.setPointerCapture(event.pointerId);
    this.drag={pointerId:event.pointerId,clipId,element:clipEl,mode,startX:event.clientX,startFrame:clip.startFrame,startDuration:clip.durationFrames,startSourceIn:clip.sourceInFrame||0,trackId:clip.trackId,ppf:state.timeline.zoom};
    this.commands.dispatch("gesture.begin",{label:mode==="move"?"Move timeline clip":mode==="slip"?"Slip timeline clip":"Trim timeline clip"});
    const move=e=>this.moveClipInteraction(e),up=e=>this.endClipInteraction(e,move,up),cancel=e=>this.cancelClipInteraction(e,move,up);clipEl.addEventListener("pointermove",move);clipEl.addEventListener("pointerup",up);clipEl.addEventListener("pointercancel",cancel);
  }
  moveClipInteraction(event){
    const drag=this.drag;if(!drag||event.pointerId!==drag.pointerId)return;const delta=Math.round((event.clientX-drag.startX)/drag.ppf),state=this.store.get(),clip=state.timeline.clips[drag.clipId];if(!clip)return;
    if(drag.mode==="trim-left"){
      const minDelta=Math.max(-drag.startSourceIn,-10-drag.startFrame),safeDelta=clamp(delta,minDelta,drag.startDuration-1),start=drag.startFrame+safeDelta,duration=drag.startDuration-safeDelta,sourceIn=drag.startSourceIn+safeDelta;
      this.commands.dispatch("timeline.trimClipSide",{clipId:drag.clipId,side:"left",startFrame:start,durationFrames:duration,sourceInFrame:sourceIn,gesture:true});drag.element.style.left=`${(start+PRE_ROLL)*drag.ppf}px`;drag.element.style.width=`${Math.max(3,duration*drag.ppf)}px`;
    }else if(drag.mode==="trim-right"){
      const maxDuration=this.maxSourceDuration(state,clip),duration=clamp(drag.startDuration+delta,1,maxDuration);this.commands.dispatch("timeline.trimClipSide",{clipId:drag.clipId,side:"right",durationFrames:duration,gesture:true});drag.element.style.width=`${Math.max(3,duration*drag.ppf)}px`;
    }else if(drag.mode==="slip"){
      const shot=state.shots.byId[clip.shotId],max=Math.max(0,(shot?.durationFrames||drag.startDuration)-drag.startDuration),sourceIn=clamp(drag.startSourceIn+delta,0,max);this.commands.dispatch("timeline.slipClip",{clipId:drag.clipId,sourceInFrame:sourceIn,gesture:true});
    }else{
      const start=Math.max(-PRE_ROLL,drag.startFrame+delta),lane=document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-track-lane]"),candidate=lane?.dataset.trackLane,trackId=candidate&&trackCompatible(state,candidate,clip)?candidate:drag.trackId;
      this.commands.dispatch("timeline.moveClip",{clipId:drag.clipId,startFrame:start,trackId,gesture:true});drag.element.style.left=`${(start+PRE_ROLL)*drag.ppf}px`;if(trackId!==drag.trackId){lane?.appendChild(drag.element);drag.trackId=trackId;}
    }
  }
  maxSourceDuration(state,clip){
    if(clip.type==="shot")return Math.max(1,(state.shots.byId[clip.shotId]?.durationFrames||clip.durationFrames)-(clip.sourceInFrame||0));
    if(clip.type==="audio")return Math.max(1,(state.assets.byId[clip.assetId]?.meta?.durationFrames||clip.durationFrames)-(clip.sourceInFrame||0));
    return 480;
  }
  endClipInteraction(event,move,up){if(!this.drag||event.pointerId!==this.drag.pointerId)return;const el=this.drag.element;el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",up);this.drag=null;this.commands.dispatch("gesture.end");this.render(this.store.get());}
  cancelClipInteraction(event,move,up){if(!this.drag||event.pointerId!==this.drag.pointerId)return;const el=this.drag.element;el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",up);this.drag=null;this.commands.dispatch("gesture.cancel");this.render(this.store.get());}
  async importAudio(file){
    if(!file||this.audioBusy)return;this.audioBusy=true;const label=this.root.querySelector('[data-role="audio-upload-label"]');label?.classList.add("busy");
    try{
      const meta=await this.readAudioMeta(file),id=uid("audio"),fps=this.latestState.settings.fps,durationFrames=Math.max(1,Math.round(meta.duration*fps));
      await this.persistence.putAsset({id,blob:file,name:file.name,type:file.type||"audio/mpeg",kind:"audio",meta:{duration:meta.duration,durationFrames,waveform:meta.waveform}});
      this.commands.dispatch("asset.register",{asset:{id,type:"audio",kind:"uploaded",name:file.name,status:"ready",source:"indexeddb",size:file.size,meta:{duration:meta.duration,durationFrames,waveform:meta.waveform}}});
      const selectedTrack=this.latestState.timeline.selectedTrackId,trackId=this.latestState.timeline.tracks[selectedTrack]?.type==="audio"?selectedTrack:"a1";
      this.commands.dispatch("timeline.addAudio",{assetId:id,trackId,durationFrames,startFrame:Math.max(0,this.latestState.timeline.playheadFrame)});this.toast?.("AUDIO ADDED · WAVEFORM READY");
    }catch(error){console.error(error);this.toast?.(`AUDIO IMPORT · ${error.message||"FAILED"}`);}
    finally{this.audioBusy=false;label?.classList.remove("busy");const input=this.root.querySelector('[data-role="audio-upload"]');if(input)input.value="";}
  }
  async readAudioMeta(file){
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return {duration:4,waveform:[]};
    const context=new Context();try{const buffer=await context.decodeAudioData(await file.arrayBuffer()),data=buffer.getChannelData(0),count=120,step=Math.max(1,Math.floor(data.length/count)),waveform=[];for(let i=0;i<count;i++){let peak=0,start=i*step,end=Math.min(data.length,start+step);for(let j=start;j<end;j++)peak=Math.max(peak,Math.abs(data[j]));waveform.push(Number(peak.toFixed(3)));}return {duration:buffer.duration,waveform};}finally{context.close().catch(()=>{});}
  }
  render(state){
    const ppf=state.timeline.zoom,end=this.timelineEnd(state),totalWidth=Math.max(520,(end+PRE_ROLL*2)*ppf),inner=this.root.querySelector('[data-role="timeline-inner"]');inner.style.width=`${totalWidth+TRACK_HEAD}px`;
    this.root.querySelector('[data-role="timeline-zoom"]').value=String(ppf);this.renderPresets(state);this.renderRuler(state,end,ppf);this.renderTracks(state,ppf,totalWidth);this.renderInspector(state);this.renderTransportState(state);
    this.root.querySelector('[data-role="library-shot-name"]').textContent=activeShot(state).name;
    this.root.querySelectorAll("[data-tool]").forEach(button=>button.classList.toggle("active",button.dataset.tool===(state.ui.timelineTool||"select")));
    this.root.querySelector('[data-timeline-action="snap"]')?.classList.toggle("active",state.timeline.snapEnabled);
  }
  renderPresets(state){
    this.root.querySelector('[data-role="sequence-presets"]').innerHTML=`<div class="sequence-preset-caption"><span>READY-MADE</span><b>SEQUENCE RECIPES</b></div><div class="sequence-preset-rail">${SEQUENCE_PRESETS.filter(p=>p.id!=="empty").map((preset,index)=>`<button class="sequence-preset-chip ${state.timeline.sequencePresetId===preset.id?"active":""}" data-sequence-preset="${preset.id}"><i>${String(index+1).padStart(2,"0")}</i><span><b>${esc(preset.label)}</b><small>${esc(preset.description)}</small></span></button>`).join("")}<button class="sequence-preset-chip clear" data-clear-sequence>${TOOL_ICONS.plus}<span><b>EMPTY</b><small>CLEAR SHOT TRACKS</small></span></button></div>`;
  }
  renderRuler(state,end,ppf){
    const fps=state.settings.fps,ruler=this.root.querySelector('[data-role="timeline-ruler"]'),step=ppf>=8?Math.max(1,Math.round(fps/2)):ppf>=4?fps:fps*2,parts=[];
    for(let frame=-PRE_ROLL;frame<=end+PRE_ROLL;frame+=step){const left=(frame+PRE_ROLL)*ppf,major=frame===0||frame%fps===0;parts.push(`<i class="timeline-tick ${major?"major":""} ${frame===0?"zero":""}" style="left:${left}px"><span>${frame<0?`-${Math.abs(frame)}f`:formatTimecode(frame,fps).slice(3)}</span></i>`);}
    for(const marker of state.timeline.markers||[]){parts.push(`<button class="timeline-marker" style="left:${(marker.frame+PRE_ROLL)*ppf}px" title="${esc(marker.label)} · ${marker.frame}f"><span>${esc(marker.label)}</span><i data-delete-marker="${marker.id}">×</i></button>`);}
    parts.push(`<div class="timeline-inout-range" style="left:${(state.timeline.inFrame+PRE_ROLL)*ppf}px;width:${Math.max(1,(state.timeline.outFrame-state.timeline.inFrame)*ppf)}px"></div>`);ruler.innerHTML=parts.join("");
  }
  renderTracks(state,ppf,totalWidth){
    const tracks=this.root.querySelector('[data-role="timeline-tracks"]');tracks.innerHTML=TRACKS.map(base=>{const track=state.timeline.tracks[base.id],clips=Object.values(state.timeline.clips).filter(clip=>clip.trackId===base.id).sort((a,b)=>a.startFrame-b.startFrame);return `<div class="timeline-track-row type-${base.type} ${track.locked?"locked":""} ${track.muted?"muted":""} ${track.visible===false?"hidden":""}" data-track="${base.id}"><header class="timeline-track-head"><b>${base.label}</b><span>${base.type.toUpperCase()}</span><div class="track-mini-tools"><button class="${track.locked?"active":""}" data-track-action="${base.id}:locked" title="Lock">${TOOL_ICONS.lock}</button><button class="${track.muted?"active":""}" data-track-action="${base.id}:muted" title="Mute">${TOOL_ICONS.mute}</button><button class="${track.visible!==false?"active":""}" data-track-action="${base.id}:visible" title="Visibility">${TOOL_ICONS.eye}</button></div></header><div class="timeline-track-lane" data-track-lane="${base.id}" style="width:${totalWidth}px">${clips.map(clip=>this.clipMarkup(state,clip,ppf)).join("")}</div></div>`;}).join("");
  }
  clipMarkup(state,clip,ppf){
    const selected=state.timeline.selectedClipId===clip.id,left=(clip.startFrame+PRE_ROLL)*ppf,width=Math.max(3,clip.durationFrames*ppf),narrow=width<48,track=state.timeline.tracks[clip.trackId],kind=clip.type;
    let visual="";if(kind==="audio")visual=this.waveformMarkup(state.assets.byId[clip.assetId]?.meta?.waveform||[]);else if(kind==="fx")visual=`<div class="fx-clip-icon">${TOOL_ICONS.fx}</div>`;else visual=`<div class="shot-clip-icon">${TOOL_ICONS.shot}</div>`;
    return `<article class="timeline-clip type-${kind} ${selected?"selected":""} ${narrow?"narrow":""}" data-clip="${clip.id}" style="left:${left}px;width:${width}px;--clip-width:${width}px" aria-label="${esc(clip.alias)}">
      <i class="clip-trim left" data-clip-handle="left"></i><i class="clip-trim right" data-clip-handle="right"></i>${visual}
      <div class="clip-copy"><b>${esc(clip.alias)}</b><small>${clip.linked?"LINKED · ":""}${clip.durationFrames}F</small></div>${selected&&!track.locked?'<span class="clip-selected-glow"></span>':""}
    </article>`;
  }
  waveformMarkup(values){if(!values.length)return '<div class="audio-wave empty"></div>';const bars=values.slice(0,80).map((value,index)=>`<i style="height:${Math.max(8,value*94)}%;left:${index/(Math.min(80,values.length)-1||1)*100}%"></i>`).join("");return `<div class="audio-wave">${bars}</div>`;}
  renderInspector(state){
    const host=this.root.querySelector('[data-role="clip-inspector"]'),clip=state.timeline.clips[state.timeline.selectedClipId];if(!clip){host.innerHTML='<div class="inspector-empty"><b>SELECT A CLIP</b><span>Every object exposes only the controls that matter.</span></div>';return;}
    const compatible=TRACKS.filter(track=>track.type===(clip.type==="shot"?"video":clip.type));
    host.innerHTML=`<div class="clip-inspector-head"><span>${clip.type.toUpperCase()} CLIP</span><b>${esc(clip.alias)}</b><small>${clip.linked?"LINKED MASTER":"INDEPENDENT"}</small></div>
      <div class="clip-inspector-fields">
        <label><span>NAME</span><input data-clip-field="alias" value="${esc(clip.alias)}"></label>
        <label><span>TRACK</span><select data-clip-field="trackId">${compatible.map(track=>`<option value="${track.id}" ${clip.trackId===track.id?"selected":""}>${track.label}</option>`).join("")}</select></label>
        <label><span>START</span><input type="number" data-clip-field="startFrame" value="${clip.startFrame}"></label>
        <label><span>DURATION</span><input type="number" min="1" data-clip-field="durationFrames" value="${clip.durationFrames}"></label>
        ${clip.type==="shot"?`<label><span>SOURCE IN</span><input type="number" min="0" data-clip-field="sourceInFrame" value="${clip.sourceInFrame||0}"></label>`:""}
        ${clip.type==="audio"?`<label><span>VOLUME</span><input type="range" min="0" max="1" step=".01" data-clip-field="volume" value="${clip.volume??1}"></label>`:""}
      </div>
      <div class="clip-inspector-actions">${clip.type==="shot"&&clip.linked?'<button data-make-unique>MAKE UNIQUE</button>':""}<button class="danger" data-delete-selected>DELETE CLIP</button></div>`;
  }
  renderTransportState(state){
    const frame=state.timeline.playheadFrame,ppf=state.timeline.zoom;this.root.querySelector('[data-role="timeline-timecode"]').textContent=frame<0?`-${formatTimecode(Math.abs(frame),state.settings.fps)}`:formatTimecode(frame,state.settings.fps);const playhead=this.root.querySelector('[data-role="timeline-playhead"]');playhead.style.left=`${TRACK_HEAD+(frame+PRE_ROLL)*ppf}px`;
  }
  dispose(){this.unsubscribe?.();removeEventListener("keydown",this.keyHandler);}
}
