/* Local, dependency-free native contract used only by ?mock=1 acceptance tests. */
const clone=value=>value==null?value:structuredClone(value);
const uid=prefix=>`${prefix}-${Math.random().toString(36).slice(2,9)}`;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const now=()=>new Date().toISOString();

const DEFAULT_CHOICES={
  "subject-presence":"present","subject-size":"medium","subject-rotation":"0",camera:"static",view:"three-quarter",composition:"centered",lens:"50mm",focus:"all",light:"studio",environment:"limbo","motion-design":"none",atmosphere:"clean"
};
const AXES={
  "subject.positionX":0,"subject.positionY":0,"subject.positionZ":0,"subject.scale":1,"subject.rotationX":0,"subject.rotationY":0,"subject.rotationZ":0,
  "camera.distance":5.2,"camera.height":.12,"camera.targetX":0,"camera.targetY":0,"camera.fov":38,"light.key":1,"environment.depth":.45,"motion.energy":0
};
const TRACKS=[
  {id:"gfx",label:"GFX/FX",type:"fx",priority:6},{id:"v3",label:"V3",type:"video",priority:5},{id:"v2",label:"V2",type:"video",priority:4},{id:"v1",label:"V1",type:"video",priority:3},{id:"a1",label:"A1",type:"audio",priority:2},{id:"a2",label:"A2",type:"audio",priority:1}
];

function makeShot(id="shot-001"){
  return {id,name:"Silent Authority",family:"hero",presetId:null,durationFrames:72,variant:1,variantMode:"balanced",seed:43001,deltaTarget:.42,
    start:{values:{...AXES,"subject.rotationY":-12,"camera.distance":5.1},choices:{...DEFAULT_CHOICES}},
    end:{values:{...AXES,"subject.rotationY":10,"camera.distance":4.55,"light.key":1.15},choices:{...DEFAULT_CHOICES,camera:"push-in"}},
    locks:Object.fromEntries(Object.keys(AXES).map(id=>[id,false])),creativeLocks:Object.fromEntries(Object.keys(DEFAULT_CHOICES).map(id=>[id,false])),creativeExclusions:{},updatedAt:now()};
}
export function createDefaultState(){
  const shot=makeShot(),timestamp=now();return {
    schema:{name:"memento.visualref",version:45,release:"V45",migratedFrom:null},meta:{id:uid("project"),name:"MEMENTO V45",createdAt:timestamp,updatedAt:timestamp,language:"EN"},
    settings:{aspectRatio:"16:9",fps:24,resolution:"1920×1080",playbackQuality:"preview",performanceTier:"auto"},
    assets:{heroId:"hero-proxy",environmentId:"environment-proxy",hdriId:null,secondaryIds:[],audioIds:[],importSession:null,byId:{
      "hero-proxy":{id:"hero-proxy",type:"hero",kind:"builtin",name:"LAMBORGHINI · RECOVERY FIXTURE",source:"builtin",status:"ready"},
      "environment-proxy":{id:"environment-proxy",type:"environment",kind:"builtin",name:"GREY LIMBO",source:"builtin",status:"ready"}
    }},
    scene:{activeCameraId:"camera-main",activeLightRigId:"light-default",editorCamera:{position:[5.8,3.5,7.4],target:[0,0,0],fov:45,near:.02,far:1000},viewportCameraMode:"editor",showGrid:true,showHelpers:true,nodes:{
      "hero-proxy":{id:"hero-proxy",name:"Hero · Lamborghini",type:"hero",assetId:"hero-proxy",visible:true,locked:false,baseTransform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},correction:{pivot:[0,0,0],rotation:[0,0,0],scale:[1,1,1],groundOffset:0,referenceDimension:4.7,referenceAxis:"x",unit:"m",autoGround:true},transformLocks:{}},
      "environment-proxy":{id:"environment-proxy",name:"Environment · Limbo",type:"environment",assetId:"environment-proxy",visible:true,locked:false,baseTransform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},correction:{pivot:[0,0,0],rotation:[0,0,0],scale:[1,1,1],groundOffset:0},transformLocks:{}},
      "camera-main":{id:"camera-main",name:"Camera · Shot",type:"camera",visible:true},"camera-editor":{id:"camera-editor",name:"Camera · Editor",type:"editor-camera",visible:true},"light-default":{id:"light-default",name:"Light · Product Rig",type:"light",visible:true}
    },environment:{backgroundVisible:false,hdriContribution:1,intensity:1,rotation:0,blur:0},rendererSettings:{toneMapping:"ACES",exposure:1}},
    shots:{order:[shot.id],activeShotId:shot.id,byId:{[shot.id]:shot}},playback:{mode:"viewport",playing:false,frame:0,loop:true,lastTick:0},
    timeline:{durationFrames:180,playheadFrame:0,inFrame:0,outFrame:180,loop:true,snapEnabled:true,zoom:5,selectedClipId:null,selectedTrackId:"v1",sequencePresetId:"empty",markers:[],tracks:Object.fromEntries(TRACKS.map(track=>[track.id,{...track,locked:false,muted:false,visible:true}])),clips:{}},
    ui:{activeWorkspace:"viewport",advanced:false,editScope:"both",splitter:.68,workspaceSplitters:{viewport:.68,render:.66,timeline:.34},viewportTool:"select",viewportSpace:"world",viewportEditMode:"calibrate",viewportSnapEnabled:false,viewportSnap:{position:.1,rotationDeg:15,scale:.1,pivot:.1},selectedNodeId:"hero-proxy",selectedAxisId:"subject.scale",selectedCreativeAxisId:"subject-presence",selectedMacroId:"subject",renderMonitorMode:"live",projectDialogOpen:false,mobileMode:"shot",assetBusy:false,timelineMonitorMode:"player",timelineTool:"select",timelineLibraryOpen:false,timelineRecipesOpen:false}
  };
}
export function normalizeState(input){return input?.schema?.name==="memento.visualref"?input:createDefaultState();}

export class HistoryService{
  constructor(){this.undoStack=[];this.redoStack=[];}record(state,label){this.undoStack.push({state:clone(state),label});if(this.undoStack.length>80)this.undoStack.shift();this.redoStack.length=0;}undo(current){const item=this.undoStack.pop();if(!item)return null;this.redoStack.push({state:clone(current),label:item.label});return item;}redo(current){const item=this.redoStack.pop();if(!item)return null;this.undoStack.push({state:clone(current),label:item.label});return item;}
}
export class PersistenceService{
  constructor(){this.key="memento-v47r-mock";this.assets=new Map();this.memory=null;}
  async load(){try{if(globalThis.localStorage)return JSON.parse(globalThis.localStorage.getItem(this.key)||"null");return clone(this.memory);}catch{return clone(this.memory);}}
  save(state){this.memory=clone(state);try{globalThis.localStorage?.setItem(this.key,JSON.stringify(state));}catch{}}saveNow(state){this.save(state);}async getAsset(id){return this.assets.get(id)||null;}async putAsset(id,value){this.assets.set(id,value);}async deleteAsset(id){this.assets.delete(id);}
}
export class WorkspaceSync{onState(listener){this.listener=listener;}broadcast(){}close(){}}
export class ProjectStore{
  constructor({state,history,persistence,sync}){this.state=state;this.history=history;this.persistence=persistence;this.sync=sync;this.listeners=new Set();this.gesture=null;}
  get(){return this.state;}subscribe(listener){this.listeners.add(listener);listener(this.state,{type:"init"});return()=>this.listeners.delete(listener);}notify(meta){for(const listener of this.listeners)listener(this.state,meta);}touch(){this.state.meta.updatedAt=now();}
  commit(label,producer,{persist=true,broadcast=true}={}){const before=clone(this.state);producer(this.state);this.touch();if(JSON.stringify(before)===JSON.stringify(this.state))return false;this.history?.record(before,label);this.notify({type:"commit",label});if(persist)this.persistence?.save(this.state);return true;}
  transient(label,producer,{persist=false,broadcast=false}={}){producer(this.state);if(persist||broadcast)this.touch();this.notify({type:"transient",label});if(persist)this.persistence?.save(this.state);}
  beginGesture(label){if(!this.gesture)this.gesture={label,before:clone(this.state)};}updateGesture(label,producer){if(!this.gesture)this.beginGesture(label);producer(this.state);this.touch();this.notify({type:"gesture",label});}endGesture(){if(!this.gesture)return false;const value=this.gesture;this.gesture=null;this.history?.record(value.before,value.label);this.persistence?.save(this.state);this.notify({type:"gesture-end",label:value.label});return true;}cancelGesture(){if(!this.gesture)return;this.state=this.gesture.before;this.gesture=null;this.notify({type:"gesture-cancel"});}
  undo(){const result=this.history?.undo(this.state);if(!result)return false;this.state=result.state;this.touch();this.persistence?.save(this.state);this.notify({type:"undo",label:result.label});return true;}redo(){const result=this.history?.redo(this.state);if(!result)return false;this.state=result.state;this.touch();this.persistence?.save(this.state);this.notify({type:"redo",label:result.label});return true;}
  setSplitter(value,workspace){this.transient("Resize workspace",state=>{state.ui.workspaceSplitters[workspace]=clamp(value,.24,.78);},{persist:true});}
}
export class CommandBus{constructor(context){this.context=context;this.handlers=new Map();}register(type,handler){this.handlers.set(type,handler);return this;}dispatch(type,payload={}){const handler=this.handlers.get(type);if(!handler)throw new Error(`Unknown command: ${type}`);return handler(payload,this.context);}}

export function registerCommands(bus){
  const {store}=bus.context,reg=(type,handler)=>bus.register(type,handler);
  reg("history.undo",()=>store.undo());reg("history.redo",()=>store.redo());reg("gesture.begin",({label})=>store.beginGesture(label));reg("gesture.end",()=>store.endGesture());reg("gesture.cancel",()=>store.cancelGesture());
  reg("playback.toggle",()=>store.transient("Playback toggle",state=>state.playback.playing=!state.playback.playing));reg("playback.setLoop",({value})=>store.transient("Playback loop",state=>{state.playback.loop=Boolean(value);state.timeline.loop=Boolean(value);}));
  reg("playback.jumpStart",()=>store.transient("Playback start",state=>{state.playback.frame=0;if(state.ui.activeWorkspace==="timeline")state.timeline.playheadFrame=state.timeline.inFrame;}));
  reg("playback.jumpEnd",()=>store.transient("Playback end",state=>{const shot=activeShot(state);state.playback.frame=shot.durationFrames;if(state.ui.activeWorkspace==="timeline")state.timeline.playheadFrame=state.timeline.outFrame;}));
  reg("playback.seek",({frame})=>store.transient("Playback seek",state=>state.playback.frame=clamp(frame,0,activeShot(state).durationFrames)));
  reg("shot.select",({shotId})=>store.commit("Select shot",state=>{if(state.shots.byId[shotId])state.shots.activeShotId=shotId;}));
  reg("shot.new",()=>store.commit("New shot",state=>{const base=clone(activeShot(state)),id=uid("shot");base.id=id;base.name=`Shot ${state.shots.order.length+1}`;state.shots.order.push(id);state.shots.byId[id]=base;state.shots.activeShotId=id;}));
  reg("shot.duplicate",()=>store.commit("Duplicate shot",state=>{const base=clone(activeShot(state)),id=uid("shot");base.id=id;base.name=`${base.name} Copy`;state.shots.order.push(id);state.shots.byId[id]=base;state.shots.activeShotId=id;}));
  reg("shot.delete",()=>store.commit("Delete shot",state=>{if(state.shots.order.length<=1)return;const id=state.shots.activeShotId;state.shots.order=state.shots.order.filter(value=>value!==id);delete state.shots.byId[id];state.shots.activeShotId=state.shots.order[0];}));
  reg("shot.setDuration",({frames})=>store.commit("Shot duration",state=>activeShot(state).durationFrames=Math.max(1,Math.round(frames))));
  reg("shot.setDeltaTarget",({value})=>store.transient("Shot target",state=>activeShot(state).deltaTarget=clamp(value,.05,.95),{persist:true}));
  reg("shot.setAxis",({axisId,value,scope="both",gesture=false})=>{const fn=state=>{const shot=activeShot(state);if(scope!=="end")shot.start.values[axisId]=Number(value);if(scope!=="start")shot.end.values[axisId]=Number(value);};gesture?store.updateGesture(`Axis ${axisId}`,fn):store.commit(`Axis ${axisId}`,fn);});
  reg("shot.setCreativeChoice",({axisId,optionId,scope="both"})=>store.commit(`Choice ${axisId}`,state=>{const shot=activeShot(state);if(scope!=="end")shot.start.choices[axisId]=optionId;if(scope!=="start")shot.end.choices[axisId]=optionId;}));
  reg("shot.setFamily",({family})=>store.commit("Shot family",state=>activeShot(state).family=family));reg("shot.toggleCreativeLock",({axisId})=>store.commit("Creative lock",state=>{const shot=activeShot(state);shot.creativeLocks[axisId]=!shot.creativeLocks[axisId];}));
  reg("shot.resetCreativePool",()=>{});reg("shot.toggleCreativeExclusion",()=>{});reg("shot.applyPreset",({presetId})=>store.commit("Apply preset",state=>activeShot(state).presetId=presetId));reg("shot.reset",()=>store.commit("Reset shot",state=>{const id=state.shots.activeShotId;state.shots.byId[id]=makeShot(id);}));
  reg("shot.generateVariant",()=>store.commit("Legacy variation",state=>{const shot=activeShot(state);shot.variant++;shot.end.values["camera.distance"]=Math.max(.5,shot.end.values["camera.distance"]-.12);}));
  reg("shot.addToTimeline",({trackId="v1"}={})=>store.commit("Add shot to timeline",state=>{const shot=activeShot(state),linked=Object.values(state.timeline.clips).find(clip=>clip.type==="shot"&&clip.shotId===shot.id);if(linked){linked.durationFrames=shot.durationFrames;linked.alias=shot.name;state.timeline.selectedClipId=linked.id;return;}const id=uid("clip"),start=Math.max(0,...Object.values(state.timeline.clips).filter(clip=>clip.trackId===trackId).map(clip=>clip.startFrame+clip.durationFrames));state.timeline.clips[id]={id,type:"shot",trackId,shotId:shot.id,alias:shot.name,startFrame:start,durationFrames:shot.durationFrames,sourceInFrame:0,sourceOutFrame:shot.durationFrames,linked:true};state.timeline.selectedClipId=id;state.timeline.outFrame=Math.max(state.timeline.outFrame,start+shot.durationFrames);}));
  reg("ui.setScope",({scope})=>store.transient("Edit scope",state=>state.ui.editScope=scope,{persist:true}));reg("ui.setMacro",({macroId})=>store.transient("Macro",state=>state.ui.selectedMacroId=macroId));reg("ui.selectCreativeAxis",({axisId})=>store.transient("Creative axis",state=>state.ui.selectedCreativeAxisId=axisId));
  reg("ui.setViewportTool",({tool})=>store.transient("Viewport tool",state=>state.ui.viewportTool=tool,{persist:true}));reg("ui.setViewportSpace",({space})=>store.transient("Viewport space",state=>state.ui.viewportSpace=space,{persist:true}));reg("ui.setViewportSnap",({enabled})=>store.transient("Viewport snap",state=>state.ui.viewportSnapEnabled=Boolean(enabled),{persist:true}));reg("ui.setViewportEditMode",({mode})=>store.transient("Viewport mode",state=>state.ui.viewportEditMode=mode,{persist:true}));reg("ui.setViewportCameraMode",({mode})=>store.transient("Viewport camera",state=>state.scene.viewportCameraMode=mode,{persist:true}));reg("ui.selectNode",({nodeId})=>store.transient("Select node",state=>state.ui.selectedNodeId=nodeId));
  reg("ui.setTimelineTool",({tool})=>store.transient("Timeline tool",state=>state.ui.timelineTool=tool));reg("ui.setTimelineLibraryOpen",()=>store.transient("Timeline library",state=>state.ui.timelineLibraryOpen=!state.ui.timelineLibraryOpen));reg("ui.setTimelineRecipesOpen",()=>store.transient("Timeline recipes",state=>state.ui.timelineRecipesOpen=!state.ui.timelineRecipesOpen));
  reg("scene.toggleGrid",()=>store.transient("Grid",state=>state.scene.showGrid=!state.scene.showGrid,{persist:true}));reg("scene.toggleHelpers",()=>store.transient("Helpers",state=>state.scene.showHelpers=!state.scene.showHelpers,{persist:true}));reg("scene.groundNode",({nodeId,transform})=>store.commit("Ground node",state=>state.scene.nodes[nodeId].baseTransform=clone(transform)));reg("scene.resetNodeTransform",({nodeId})=>store.commit("Reset node",state=>state.scene.nodes[nodeId].baseTransform={position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}));reg("scene.setEditorCamera",({camera})=>store.transient("Editor camera",state=>state.scene.editorCamera=clone(camera),{persist:true}));
  reg("timeline.setPlayhead",({frame})=>store.transient("Timeline playhead",state=>{state.timeline.playheadFrame=clamp(frame,-10,Math.max(state.timeline.outFrame,1));state.playback.frame=state.timeline.playheadFrame;}));reg("timeline.selectClip",({clipId})=>store.transient("Select clip",state=>state.timeline.selectedClipId=clipId));reg("timeline.deleteClip",({clipId})=>store.commit("Delete clip",state=>{delete state.timeline.clips[clipId];if(state.timeline.selectedClipId===clipId)state.timeline.selectedClipId=null;}));reg("timeline.setZoom",({value})=>store.transient("Timeline zoom",state=>state.timeline.zoom=clamp(value,2,14),{persist:true}));reg("timeline.toggleSnap",()=>store.transient("Timeline snap",state=>state.timeline.snapEnabled=!state.timeline.snapEnabled,{persist:true}));reg("timeline.addMarker",()=>store.commit("Add marker",state=>state.timeline.markers.push({id:uid("marker"),frame:Math.round(state.timeline.playheadFrame)})));reg("timeline.deleteMarker",({markerId})=>store.commit("Delete marker",state=>state.timeline.markers=state.timeline.markers.filter(marker=>marker.id!==markerId)));reg("timeline.clearShots",()=>store.commit("Clear timeline",state=>{for(const [id,clip] of Object.entries(state.timeline.clips))if(clip.type==="shot")delete state.timeline.clips[id];state.timeline.selectedClipId=null;}));
  reg("timeline.applySequencePreset",({presetId})=>store.commit("Sequence preset",state=>state.timeline.sequencePresetId=presetId));reg("timeline.addFx",({effect,startFrame})=>store.commit("Add FX",state=>{const id=uid("fx");state.timeline.clips[id]={id,type:"fx",trackId:"gfx",effect,startFrame:Math.round(startFrame||0),durationFrames:12};}));reg("timeline.toggleTrack",({trackId,field})=>store.commit("Track state",state=>state.timeline.tracks[trackId][field]=!state.timeline.tracks[trackId][field]));reg("timeline.updateSelected",({field,value})=>store.commit("Update clip",state=>{const clip=state.timeline.clips[state.timeline.selectedClipId];if(clip)clip[field]=value;}));
  reg("asset.markMissing",()=>{});
}

export function activeShot(state){return state.shots.byId[state.shots.activeShotId];}
export function evaluateShot(state,shotId,frame){const shot=state.shots.byId[shotId]||activeShot(state),duration=Math.max(1,shot.durationFrames),linear=clamp(frame/duration,0,1),t=linear*linear*(3-2*linear),values={};for(const key of Object.keys(shot.start.values)){const a=Number(shot.start.values[key])||0,b=Number(shot.end.values[key])||0;values[key]=a+(b-a)*t;}return {shotId:shot.id,shotName:shot.name,frame:clamp(frame,0,duration),duration,linear,t,values,choices:{start:{...shot.start.choices},end:{...shot.end.choices}},family:shot.family,presetId:shot.presetId,variant:shot.variant,seed:shot.seed,deltaTarget:shot.deltaTarget};}
export function sequenceDuration(state){return Math.max(state.timeline.outFrame||0,1,...Object.values(state.timeline.clips).map(clip=>clip.startFrame+clip.durationFrames));}
export function evaluateSequence(state,frame){const clips=Object.values(state.timeline.clips).filter(clip=>clip.type==="shot"&&frame>=clip.startFrame&&frame<clip.startFrame+clip.durationFrames).sort((a,b)=>(state.timeline.tracks[b.trackId]?.priority||0)-(state.timeline.tracks[a.trackId]?.priority||0));if(clips[0]){const clip=clips[0],local=frame-clip.startFrame+(clip.sourceInFrame||0);return {...evaluateShot(state,clip.shotId,local),clipId:clip.id,sequenceFrame:frame,trackId:clip.trackId,effects:[]};}return {...evaluateShot(state,state.shots.activeShotId,0),shotName:"SEQUENCE GAP",sequenceFrame:frame,gap:true,effects:[]};}

let rendererSerial=0;
export class RendererService{
  constructor({canvas,onStatus,workspace="viewport"}={}){this.canvas=canvas;this.onStatus=onStatus;this.workspace=workspace;this.viewportActive=workspace==="viewport";this.__instanceId=`mock-renderer-${++rendererSerial}`;this.ready=Promise.resolve();this.ctx=canvas.getContext("2d");this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();this.onStatus?.({label:"MOCK · ONE RENDERER",mode:"fallback"});}
  resize(){const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.max(1,Math.round(rect.width*dpr));this.canvas.height=Math.max(1,Math.round(rect.height*dpr));this.ctx.setTransform(dpr,0,0,dpr,0,0);}
  setRecoveryWorkspace(value){this.workspace=value;this.viewportActive=value==="viewport";}
  render(frame,state){const ctx=this.ctx,w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;const recipe=state.recovery?.world?.recipe||"grey-limbo",palette={"grey-limbo":["#676a72","#454851"],"white-limbo":["#d4d6da","#9da0a7"],"black-limbo":["#0e0f12","#050507"],void:["#050506","#020203"]}[recipe]||["#676a72","#454851"];
    const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,palette[1]);gradient.addColorStop(.66,palette[0]);gradient.addColorStop(1,palette[0]);ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    if(recipe!=="void"){ctx.fillStyle=palette[0];ctx.beginPath();ctx.moveTo(0,h*.62);ctx.bezierCurveTo(w*.18,h*.62,w*.22,h*.73,w*.38,h*.76);ctx.lineTo(w,h*.76);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();}
    const values=frame?.values||{},scale=clamp(values["subject.scale"]??1,.45,1.65),x=w*.5+(values["subject.positionX"]||0)*w*.025,y=h*.64,carW=Math.min(w*.42,h*.78)*scale,carH=carW*.26,rot=(values["subject.rotationY"]||0)*Math.PI/180*.08;
    ctx.save();ctx.translate(x,y);ctx.scale(1,Math.cos(rot)*.98+0.02);ctx.fillStyle="rgba(8,5,7,.48)";ctx.filter=`blur(${4+(state.recovery?.world?.shadowSoftness||58)*.05}px)`;ctx.beginPath();ctx.ellipse(carW*.08,carH*.54,carW*.53,carH*.33,0,0,Math.PI*2);ctx.fill();ctx.filter="none";
    const body=ctx.createLinearGradient(-carW*.5,-carH,carW*.5,0);body.addColorStop(0,"#050506");body.addColorStop(.28,"#11131a");body.addColorStop(.52,"#272935");body.addColorStop(.72,"#07080b");body.addColorStop(1,"#020203");ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-carW*.52,0);ctx.lineTo(-carW*.36,-carH*.62);ctx.quadraticCurveTo(-carW*.06,-carH*1.05,carW*.25,-carH*.7);ctx.lineTo(carW*.48,-carH*.27);ctx.quadraticCurveTo(carW*.57,-carH*.06,carW*.45,0);ctx.closePath();ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.72)";ctx.lineWidth=Math.max(1,carW*.006);ctx.beginPath();ctx.moveTo(carW*.31,-carH*.49);ctx.lineTo(carW*.45,-carH*.29);ctx.stroke();ctx.strokeStyle="rgba(121,70,255,.55)";ctx.beginPath();ctx.moveTo(-carW*.46,carH*.03);ctx.lineTo(carW*.38,carH*.03);ctx.stroke();
    ctx.fillStyle="#060609";for(const wx of [-.31,.31]){ctx.beginPath();ctx.arc(carW*wx,0,carH*.34,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#3a3d48";ctx.lineWidth=2;ctx.stroke();}
    ctx.restore();if(this.viewportActive&&state.scene.showGrid){ctx.strokeStyle="rgba(20,20,24,.16)";ctx.lineWidth=1;for(let i=0;i<18;i++){const yy=h*.76+i*18;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke();}}
  }
  configureViewport(options={}){this.viewportActive=options.active!==false;this.viewportCallbacks=options;}
  frameNode(){this.frameCalls=(this.frameCalls||0)+1;}getGroundedTransform(nodeId,state){return clone(state.scene.nodes[nodeId].baseTransform);}
  setEditorCamera(){}captureToCanvas(frame,state,target){const ctx=target.getContext("2d");ctx.drawImage(this.canvas,0,0,target.width,target.height);}dispose(){this.resizeObserver.disconnect();}
}
export const RendererAuthority={acquire:()=>"mock-authority",release:()=>{}};

class BaseWorkspace{constructor({root,store}){this.root=root;this.store=store;}dispose(){this.unsubscribe?.();}}
export class ViewportWorkspace extends BaseWorkspace{
  constructor({root,store,commands}){super({root,store});this.commands=commands;this.build();this.unsubscribe=store.subscribe(state=>this.render(state));}
  build(){this.root.innerHTML=`<div class="vr-mock-panel"><input hidden data-file="hero" type="file" accept=".glb"><h2>WORLD / SUBJECTS</h2><div data-role="viewport-mock"></div></div>`;this.root.querySelector('[data-file="hero"]').addEventListener("change",event=>{const file=event.target.files?.[0];if(!file)return;this.store.commit("Mock import",state=>{const id=uid("hero");state.assets.byId[id]={id,type:"hero",kind:"file",source:"mock",name:file.name,status:"ready"};state.assets.heroId=id;state.scene.nodes["hero-proxy"].assetId=id;});});}
  render(state){this.root.querySelector('[data-role="viewport-mock"]').innerHTML=`<div class="vr-mock-card"><b>OUTLINER</b><span>Hero · ${escapeHtml(state.assets.byId[state.assets.heroId]?.name)}<br>Environment · ${escapeHtml(state.recovery?.world?.recipe||"Grey Limbo")}<br>Camera · Editor / Shot</span></div><div class="vr-mock-grid"><div class="vr-mock-card"><b>TRANSFORM</b><span>Position 0 · 0 · 0<br>Pivot 0 · 0 · 0</span></div><div class="vr-mock-card"><b>CALIBRATION</b><span>4.7 m · Grounded<br>World space</span></div></div>`;}
}
export class RenderWorkspace extends BaseWorkspace{
  constructor({root,store}){super({root,store});this.build();this.unsubscribe=store.subscribe(state=>this.render(state));}
  build(){this.root.innerHTML='<div class="vr-mock-panel"><h2>REFINE SHOT</h2><div data-role="render-mock"></div></div>';}
  render(state){const shot=activeShot(state);this.root.querySelector('[data-role="render-mock"]').innerHTML=`<div class="vr-mock-card"><b>${escapeHtml(shot.family.toUpperCase())} · ${escapeHtml(shot.name)}</b><span>Subject · Camera · Composition · Lens & Focus · Light · Environment · Motion</span></div><div class="vr-mock-grid"><div class="vr-mock-card"><b>START</b><span>${escapeHtml(shot.start.choices.camera)} · ${escapeHtml(shot.start.choices.lens)}</span></div><div class="vr-mock-card"><b>END</b><span>${escapeHtml(shot.end.choices.camera)} · ${escapeHtml(shot.end.choices.lens)}</span></div></div>`;}
}
export class TimelineWorkspace extends BaseWorkspace{
  constructor({root,store,commands,player}){super({root,store});this.commands=commands;this.player=player;this.build();this.unsubscribe=store.subscribe(state=>this.render(state));}
  build(){this.root.innerHTML='<div class="vr-mock-panel"><h2>TIMELINE / V1</h2><div data-role="timeline-mock"></div></div>';this.root.addEventListener("click",event=>{const id=event.target.closest("[data-clip]")?.dataset.clip;if(id)this.commands.dispatch("timeline.selectClip",{clipId:id});});}
  render(state){const clips=Object.values(state.timeline.clips).sort((a,b)=>a.startFrame-b.startFrame);this.root.querySelector('[data-role="timeline-mock"]').innerHTML=`<div class="vr-mock-card"><b>V3 · V2 · V1 · A1 · A2 · GFX</b><span>Frame-authoritative · ${state.timeline.playheadFrame.toFixed(0)}F playhead</span></div><div class="vr-mock-grid">${clips.length?clips.map(clip=>`<button class="vr-mock-card" data-clip="${clip.id}" style="color:inherit;text-align:left"><b>${escapeHtml(clip.alias||clip.type)}</b><span>${clip.startFrame}F → ${clip.startFrame+clip.durationFrames}F</span></button>`).join(""):'<div class="vr-mock-card"><b>EMPTY CURVE</b><span>Add the active shot from Render.</span></div>'}</div>`;}
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
