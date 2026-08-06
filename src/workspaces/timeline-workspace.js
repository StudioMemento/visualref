import {TRACKS} from "../core/default-state.js";
import {activeShot,sequenceDuration} from "../player/shot-interpolator.js";
import {clamp,formatTimecode} from "../core/utils.js";

const PRE_ROLL=10;

export class TimelineWorkspace{
  constructor({root,store,commands,toast}){this.root=root;this.store=store;this.commands=commands;this.toast=toast;this.drag=null;this.latestState=store.get();this.build();this.bind();this.unsubscribe=store.subscribe((state,meta)=>{this.latestState=state;if(meta?.label==="Playback tick"){this.renderTransportState(state);return;}if(!this.drag)this.render(state,meta);else this.renderTransportState(state);});}
  build(){
    this.root.innerHTML=`<div class="timeline-layout"><header class="timeline-toolbar"><span class="timeline-title">SEQUENCE TIMELINE</span><span class="timecode" data-role="timeline-timecode">00:00:00:00</span><button data-timeline-action="snap">SNAP</button><button data-timeline-action="fit">FIT</button><button data-timeline-action="add">ADD SHOT</button><span class="spacer"></span><label>ZOOM <input data-role="timeline-zoom" type="range" min="2" max="12" step=".5" value="5"></label></header><div class="timeline-library"><button class="library-shot primary" data-library-add><b data-role="library-shot-name">ACTIVE SHOT</b><small>+ V1</small></button><button class="library-shot" disabled><b>GFX / FX</b><small>PHASE 4</small></button><button class="library-shot" disabled><b>AUDIO MEDIA</b><small>PHASE 4</small></button></div><div class="timeline-scroll" data-role="timeline-scroll"><div class="timeline-inner" data-role="timeline-inner"><div class="timeline-ruler" data-role="timeline-ruler"></div><div class="timeline-tracks" data-role="timeline-tracks"></div><div class="timeline-playhead" data-role="timeline-playhead"></div></div></div><section class="clip-inspector" data-role="clip-inspector"></section></div>`;
  }
  bind(){
    this.root.addEventListener('click',event=>{
      const action=event.target.closest('[data-timeline-action]')?.dataset.timelineAction;
      if(action==='snap')this.commands.dispatch('timeline.toggleSnap');
      if(action==='fit')this.fitTimeline();
      if(action==='add'||event.target.closest('[data-library-add]'))this.commands.dispatch('shot.addToTimeline',{trackId:'v1'});
      const clipId=event.target.closest('[data-clip]')?.dataset.clip;if(clipId&&!event.target.closest('[data-clip-handle]'))this.commands.dispatch('timeline.selectClip',{clipId});
      if(event.target.closest('[data-delete-selected]')){const id=this.store.get().timeline.selectedClipId;if(id)this.commands.dispatch('timeline.deleteClip',{clipId:id});}
    });
    this.root.querySelector('[data-role="timeline-zoom"]').addEventListener('input',event=>this.commands.dispatch('timeline.setZoom',{value:Number(event.target.value)}));
    this.root.querySelector('[data-role="timeline-ruler"]').addEventListener('pointerdown',event=>this.seekFromPointer(event));
    this.root.querySelector('[data-role="timeline-tracks"]').addEventListener('pointerdown',event=>this.beginClipDrag(event));
    this.root.addEventListener('change',event=>{
      const field=event.target.dataset.clipField;if(field)this.commands.dispatch('timeline.updateSelected',{field,value:event.target.value});
    });
  }
  fitTimeline(){
    const scroll=this.root.querySelector('[data-role="timeline-scroll"]'),available=Math.max(240,scroll.clientWidth-74),frames=sequenceDuration(this.store.get())+PRE_ROLL*2,value=clamp(available/frames,2,12);this.commands.dispatch('timeline.setZoom',{value});
  }
  seekFromPointer(event){const state=this.store.get(),ruler=event.currentTarget,rect=ruler.getBoundingClientRect(),frame=(event.clientX-rect.left)/state.timeline.zoom-PRE_ROLL;this.commands.dispatch('timeline.setPlayhead',{frame});}
  beginClipDrag(event){
    const clipEl=event.target.closest('[data-clip]');if(!clipEl)return;const clipId=clipEl.dataset.clip,clip=this.store.get().timeline.clips[clipId];if(!clip)return;event.preventDefault();clipEl.setPointerCapture(event.pointerId);const handle=event.target.closest('[data-clip-handle]')?.dataset.clipHandle||null;this.drag={pointerId:event.pointerId,clipId,element:clipEl,handle,startX:event.clientX,startFrame:clip.startFrame,startDuration:clip.durationFrames,trackId:clip.trackId,ppf:this.store.get().timeline.zoom};this.commands.dispatch('timeline.selectClip',{clipId});this.commands.dispatch('gesture.begin',{label:handle?'Trim timeline clip':'Move timeline clip'});
    const move=e=>this.moveClipDrag(e),up=e=>this.endClipDrag(e,move,up),cancel=e=>this.cancelClipDrag(e,move,up);clipEl.addEventListener('pointermove',move);clipEl.addEventListener('pointerup',up);clipEl.addEventListener('pointercancel',cancel);
  }
  moveClipDrag(event){
    if(!this.drag||event.pointerId!==this.drag.pointerId)return;const deltaFrames=(event.clientX-this.drag.startX)/this.drag.ppf,state=this.store.get();
    if(this.drag.handle==='right'){
      const duration=Math.max(1,Math.round(this.drag.startDuration+deltaFrames));this.commands.dispatch('timeline.trimClip',{clipId:this.drag.clipId,durationFrames:duration,gesture:true});this.drag.element.style.width=`${Math.max(8,duration*this.drag.ppf)}px`;
    }else{
      let start=Math.max(-PRE_ROLL,Math.round(this.drag.startFrame+deltaFrames));const lane=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-track-lane]'),trackId=lane?.dataset.trackLane&&state.timeline.tracks[lane.dataset.trackLane]?.type==='video'?lane.dataset.trackLane:this.drag.trackId;this.commands.dispatch('timeline.moveClip',{clipId:this.drag.clipId,startFrame:start,trackId,gesture:true});this.drag.element.style.left=`${(start+PRE_ROLL)*this.drag.ppf}px`;
      if(trackId!==this.drag.trackId){lane?.appendChild(this.drag.element);this.drag.trackId=trackId;}
    }
  }
  endClipDrag(event,move,up){if(!this.drag||event.pointerId!==this.drag.pointerId)return;const el=this.drag.element;el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);this.drag=null;this.commands.dispatch('gesture.end');this.render(this.store.get());}
  cancelClipDrag(event,move,up){if(!this.drag||event.pointerId!==this.drag.pointerId)return;const el=this.drag.element;el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);this.drag=null;this.commands.dispatch('gesture.cancel');this.render(this.store.get());}
  render(state){
    const ppf=state.timeline.zoom,total=Math.max(sequenceDuration(state),state.timeline.durationFrames),inner=this.root.querySelector('[data-role="timeline-inner"]');inner.style.setProperty('--timeline-ppf',`${ppf}px`);inner.style.setProperty('--grid-size',`${ppf*12}px`);const scroll=this.root.querySelector('[data-role="timeline-scroll"]');inner.style.minWidth=`${Math.max(scroll.clientWidth,(total+PRE_ROLL*2)*ppf+74)}px`;
    this.root.querySelector('[data-role="timeline-zoom"]').value=String(ppf);this.root.querySelector('[data-timeline-action="snap"]').classList.toggle('active',state.timeline.snapEnabled);this.root.querySelector('[data-role="library-shot-name"]').textContent=activeShot(state).name;
    this.renderRuler(state,total);this.renderTracks(state,ppf);this.renderInspector(state);this.renderTransportState(state);
  }
  renderTransportState(state){this.root.querySelector('[data-role="timeline-timecode"]').textContent=formatTimecode(state.timeline.playheadFrame,state.settings.fps);const playhead=this.root.querySelector('[data-role="timeline-playhead"]');if(playhead)playhead.style.left=`calc(var(--track-label-w) + ${(state.timeline.playheadFrame+PRE_ROLL)*state.timeline.zoom}px)`;}
  renderRuler(state,total){
    const ruler=this.root.querySelector('[data-role="timeline-ruler"]'),step=Math.max(1,Math.round(state.settings.fps/2)),ticks=[];for(let frame=-PRE_ROLL;frame<=total+PRE_ROLL;frame+=step){const major=frame%state.settings.fps===0;ticks.push(`<i class="ruler-tick ${major?'major':''}" style="left:${(frame+PRE_ROLL)*state.timeline.zoom}px">${major?`<span>${formatTimecode(Math.max(0,frame),state.settings.fps).slice(3,8)}</span>`:''}</i>`);}ruler.innerHTML=ticks.join('');
  }
  renderTracks(state,ppf){
    const host=this.root.querySelector('[data-role="timeline-tracks"]');host.innerHTML=TRACKS.map(track=>{const clips=Object.values(state.timeline.clips).filter(clip=>clip.trackId===track.id).sort((a,b)=>a.startFrame-b.startFrame).map(clip=>clipMarkup(clip,ppf,state.timeline.selectedClipId===clip.id)).join('');return `<section class="timeline-track track-${track.type}" data-track-id="${track.id}"><header class="track-label">${track.label}</header><div class="track-lane" data-track-lane="${track.id}">${clips}</div></section>`;}).join('');
  }
  renderInspector(state){
    const host=this.root.querySelector('[data-role="clip-inspector"]'),clip=state.timeline.clips[state.timeline.selectedClipId];if(!clip){host.innerHTML='<div class="empty-state">Select a linked Shot clip to inspect its sequence geometry.</div>';return;}
    host.innerHTML=`<article><span>SELECTED CLIP</span><b>${escapeHtml(clip.alias)}</b></article><label><span>NAME</span><input data-clip-field="alias" value="${escapeHtml(clip.alias)}"></label><label><span>START FRAME</span><input data-clip-field="startFrame" type="number" min="-${PRE_ROLL}" value="${clip.startFrame}"></label><label><span>DURATION</span><input data-clip-field="durationFrames" type="number" min="1" value="${clip.durationFrames}"></label><label><span>TRACK</span><select data-clip-field="trackId">${TRACKS.filter(track=>track.type==='video').map(track=>`<option value="${track.id}" ${track.id===clip.trackId?'selected':''}>${track.label}</option>`).join('')}</select></label><button data-delete-selected>DELETE CLIP</button>`;
  }
  dispose(){this.unsubscribe?.();}
}
function clipMarkup(clip,ppf,selected){return `<article class="timeline-clip ${selected?'selected':''}" data-clip="${clip.id}" style="left:${(clip.startFrame+PRE_ROLL)*ppf}px;width:${Math.max(8,clip.durationFrames*ppf)}px"><b>${escapeHtml(clip.alias)}</b><small>${clip.durationFrames}F · ${clip.linked?'LINKED':'UNIQUE'}</small><i class="clip-handle right" data-clip-handle="right"></i></article>`;}
function escapeHtml(value){return String(value).replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]||char));}
