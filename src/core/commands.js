import {AXIS_MAP,AXES,TRACKS,createDefaultState,DEFAULT_CORRECTION,DEFAULT_TRANSFORM} from "./default-state.js";
import {PRESET_MAP} from "../shots/presets.js";
import {CREATIVE_AXIS_MAP,CREATIVE_AXES,defaultCreativeChoices,optionFor} from "../shots/creative-axes.js";
import {clamp,deepClone,seeded,uid} from "./utils.js";

function activeShot(state){return state.shots.byId[state.shots.activeShotId];}
function applyAxisMutable(state,axisId,value,scope=state.ui.editScope){
  const axis=AXIS_MAP.get(axisId);if(!axis)return;
  const numeric=clamp(Number(value),axis.min,axis.max),shot=activeShot(state);
  if(scope==="start"||scope==="both")shot.start.values[axisId]=numeric;
  if(scope==="end"||scope==="both")shot.end.values[axisId]=numeric;
  shot.updatedAt=new Date().toISOString();state.ui.selectedAxisId=axisId;
}
function applyCreativeChoiceMutable(state,axisId,optionId,scope=state.ui.editScope){
  const axis=CREATIVE_AXIS_MAP.get(axisId),option=optionFor(axisId,optionId);if(!axis||!option)return;
  const shot=activeShot(state);shot.start.choices??=defaultCreativeChoices("start");shot.end.choices??=defaultCreativeChoices("end");
  const applyEndpoint=(endpoint,patch)=>{shot[endpoint].choices[axisId]=optionId;for(const [numericAxisId,value] of Object.entries(patch||{}))applyAxisMutable(state,numericAxisId,value,endpoint);};
  if(scope==="start"||scope==="both")applyEndpoint("start",option.start);
  if(scope==="end"||scope==="both")applyEndpoint("end",option.end);
  shot.updatedAt=new Date().toISOString();state.ui.selectedCreativeAxisId=axisId;
}
function clipEnd(clip){return clip.startFrame+clip.durationFrames;}
function timelineDuration(state){return Math.max(state.timeline.outFrame,...Object.values(state.timeline.clips).map(clipEnd),1);}

export function registerCommands(bus){
  const {store,history,persistence,sync,toast}=bus.context;
  bus.register("history.undo",()=>store.undo());
  bus.register("history.redo",()=>store.redo());
  bus.register("gesture.begin",({label})=>store.beginGesture(label));
  bus.register("gesture.end",()=>store.endGesture());
  bus.register("gesture.cancel",()=>store.cancelGesture());
  bus.register("ui.setScope",({scope})=>store.transient("Edit scope",state=>state.ui.editScope=scope,{persist:true,broadcast:true}));
  bus.register("ui.toggleAdvanced",({value})=>store.transient("Advanced mode",state=>state.ui.advanced=Boolean(value),{persist:true,broadcast:true}));
  bus.register("ui.setViewportTool",({tool})=>store.transient("Viewport tool",state=>state.ui.viewportTool=tool,{persist:true,broadcast:false}));
  bus.register("ui.setViewportCameraMode",({mode})=>store.transient("Viewport camera mode",state=>state.scene.viewportCameraMode=mode==="shot"?"shot":"editor",{persist:true,broadcast:false}));
  bus.register("ui.setTimelineMonitorMode",({mode})=>store.transient("Timeline monitor mode",state=>state.ui.timelineMonitorMode=mode==="viewport"?"viewport":"player",{persist:true,broadcast:false}));
  bus.register("ui.setAssetBusy",({value})=>store.transient("Asset busy",state=>state.ui.assetBusy=Boolean(value),{persist:false,broadcast:false}));
  bus.register("ui.selectNode",({nodeId})=>store.transient("Select node",state=>state.ui.selectedNodeId=nodeId,{persist:true,broadcast:false}));
  bus.register("ui.selectCreativeAxis",({axisId})=>store.transient("Select creative axis",state=>state.ui.selectedCreativeAxisId=axisId,{persist:true,broadcast:false}));
  bus.register("ui.openProject",({open=true})=>store.transient("Project dialog",state=>state.ui.projectDialogOpen=open));
  bus.register("project.rename",({name})=>store.commit("Rename project",state=>state.meta.name=(name||"Untitled Project").trim()||"Untitled Project"));
  bus.register("project.reset",async()=>{
    await persistence.clear({assets:true});const next=createDefaultState();history.clear();store.replace("Reset project",next,{history:false,persist:true,broadcast:true});toast?.("PROJECT RESET · V43B.1");
  });

  bus.register("asset.register",({asset,node})=>store.commit(`Register ${asset.type} asset`,state=>{
    state.assets.byId[asset.id]=asset;
    if(asset.type==="hero"){
      const old=state.assets.heroId;state.assets.heroId=asset.id;state.scene.nodes["hero-proxy"]={...state.scene.nodes["hero-proxy"],assetId:asset.id,name:`Hero · ${asset.name}`};
      if(old&&old!=="hero-proxy"&&old!==asset.id)delete state.assets.byId[old];
      state.ui.selectedNodeId="hero-proxy";
    }else if(asset.type==="environment"){
      const old=state.assets.environmentId;state.assets.environmentId=asset.id;state.scene.nodes["environment-proxy"]={...state.scene.nodes["environment-proxy"],assetId:asset.id,name:`Environment · ${asset.name}`};
      if(old&&old!=="environment-proxy"&&old!==asset.id)delete state.assets.byId[old];
      state.ui.selectedNodeId="environment-proxy";
    }else if(asset.type==="hdri"){
      const old=state.assets.hdriId;state.assets.hdriId=asset.id;if(old&&old!==asset.id)delete state.assets.byId[old];
    }else if(asset.type==="prop"){
      state.assets.secondaryIds=[...new Set([...(state.assets.secondaryIds||[]),asset.id])];
      state.scene.nodes[node.id]=node;state.ui.selectedNodeId=node.id;
    }
  }));
  bus.register("asset.remove",({assetId,nodeId})=>store.commit("Remove scene asset",state=>{
    const asset=state.assets.byId[assetId];if(!asset)return;
    if(asset.type==="hero"){state.assets.heroId="hero-proxy";state.scene.nodes["hero-proxy"]={...createDefaultState().scene.nodes["hero-proxy"]};state.ui.selectedNodeId="hero-proxy";}
    else if(asset.type==="environment"){state.assets.environmentId="environment-proxy";state.scene.nodes["environment-proxy"]={...createDefaultState().scene.nodes["environment-proxy"]};state.ui.selectedNodeId="environment-proxy";}
    else if(asset.type==="hdri"){state.assets.hdriId=null;state.scene.environment.backgroundVisible=false;}
    else if(asset.type==="prop"){state.assets.secondaryIds=(state.assets.secondaryIds||[]).filter(id=>id!==assetId);if(nodeId)delete state.scene.nodes[nodeId];if(state.ui.selectedNodeId===nodeId)state.ui.selectedNodeId="hero-proxy";}
    delete state.assets.byId[assetId];
  }));
  bus.register("scene.setNodeTransform",({nodeId,transform,gesture=false})=>{
    const mutate=state=>{const node=state.scene.nodes[nodeId];if(!node)return;node.baseTransform={position:[...transform.position],rotation:[...transform.rotation],scale:[...transform.scale]};};
    return gesture?store.updateGesture("Transform scene node",mutate):store.commit("Transform scene node",mutate);
  });
  bus.register("scene.setNodeCorrection",({nodeId,field,value,gesture=false})=>{
    const mutate=state=>{const node=state.scene.nodes[nodeId];if(!node)return;node.correction??=structuredClone(DEFAULT_CORRECTION);if(["pivot","rotation","scale"].includes(field))node.correction[field]=value.slice(0,3).map(Number);else node.correction[field]=value;};
    return gesture?store.updateGesture("Correct scene node",mutate):store.commit("Correct scene node",mutate);
  });
  bus.register("scene.resetNodeCorrection",({nodeId})=>store.commit("Reset node correction",state=>{const node=state.scene.nodes[nodeId];if(node)node.correction=structuredClone(DEFAULT_CORRECTION);}));
  bus.register("scene.setNodeVisible",({nodeId,value})=>store.commit("Toggle node visibility",state=>{const node=state.scene.nodes[nodeId];if(node)node.visible=Boolean(value);}));
  bus.register("scene.setEnvironment",({field,value})=>store.commit("Environment setting",state=>state.scene.environment[field]=value));
  bus.register("scene.setRenderer",({field,value})=>store.commit("Renderer setting",state=>state.scene.rendererSettings[field]=value));
  bus.register("scene.setEditorCamera",({camera})=>store.transient("Editor camera",state=>state.scene.editorCamera={...state.scene.editorCamera,...camera},{persist:true,broadcast:false}));
  bus.register("scene.toggleGrid",()=>store.transient("Viewport grid",state=>state.scene.showGrid=!state.scene.showGrid,{persist:true,broadcast:false}));
  bus.register("scene.toggleHelpers",()=>store.transient("Viewport helpers",state=>state.scene.showHelpers=!state.scene.showHelpers,{persist:true,broadcast:false}));

  bus.register("shot.setAxis",({axisId,value,scope,gesture=false})=>{
    const mutate=state=>applyAxisMutable(state,axisId,value,scope);
    return gesture?store.updateGesture(`Edit ${AXIS_MAP.get(axisId)?.label||axisId}`,mutate):store.commit(`Edit ${AXIS_MAP.get(axisId)?.label||axisId}`,mutate);
  });
  bus.register("shot.setCreativeChoice",({axisId,optionId,scope})=>store.commit(`Creative axis · ${axisId}`,state=>applyCreativeChoiceMutable(state,axisId,optionId,scope)));
  bus.register("shot.toggleCreativeLock",({axisId})=>store.commit(`Lock creative axis · ${axisId}`,state=>{
    const shot=activeShot(state),axis=CREATIVE_AXIS_MAP.get(axisId);if(!axis)return;shot.creativeLocks??={};const next=!shot.creativeLocks[axisId];shot.creativeLocks[axisId]=next;for(const numericAxisId of axis.advancedAxes||[])shot.locks[numericAxisId]=next;state.ui.selectedCreativeAxisId=axisId;
  }));
  bus.register("shot.setDuration",({frames})=>store.commit("Edit shot duration",state=>{
    const shot=activeShot(state);shot.durationFrames=clamp(Math.round(Number(frames)||72),12,480);state.playback.frame=Math.min(state.playback.frame,shot.durationFrames);
  }));
  bus.register("shot.setFamily",({family})=>store.commit("Select shot family",state=>{activeShot(state).family=family;activeShot(state).presetId=null;}));
  bus.register("shot.applyPreset",({presetId})=>{
    const preset=PRESET_MAP.get(presetId);if(!preset)return false;
    return store.commit(`Preset · ${preset.title}`,state=>{
      const shot=activeShot(state);shot.name=preset.title;shot.family=preset.family;shot.presetId=preset.id;shot.durationFrames=preset.duration;
      for(const axis of AXES){if(shot.locks[axis.id])continue;if(preset.start[axis.id]!=null)shot.start.values[axis.id]=clamp(preset.start[axis.id],axis.min,axis.max);if(preset.end[axis.id]!=null)shot.end.values[axis.id]=clamp(preset.end[axis.id],axis.min,axis.max);}
      shot.updatedAt=new Date().toISOString();state.playback.frame=0;state.playback.playing=true;state.playback.lastTick=performance.now();
    });
  });
  bus.register("shot.generateVariant",({mode="balanced"})=>store.commit(`Generate ${mode} variant`,state=>{
    const shot=activeShot(state),amount=mode==="near"?.07:mode==="bold"?.24:.14,rng=seeded(shot.seed+shot.variant*7919+(mode==="bold"?97:mode==="near"?13:41));
    for(const axis of AXES){if(shot.locks[axis.id])continue;const range=axis.max-axis.min;const affect=rng()>.32;if(!affect)continue;const endDelta=(rng()-.5)*2*range*amount;shot.end.values[axis.id]=clamp(shot.end.values[axis.id]+endDelta,axis.min,axis.max);if(mode==="bold"&&rng()>.55)shot.start.values[axis.id]=clamp(shot.start.values[axis.id]+(rng()-.5)*range*.08,axis.min,axis.max);}
    shot.variant+=1;shot.variantMode=mode;shot.presetId=null;shot.name=`${shot.name.replace(/ · V\d+$/,'')} · V${String(shot.variant).padStart(2,'0')}`;shot.updatedAt=new Date().toISOString();state.playback.frame=0;state.playback.playing=true;state.playback.lastTick=performance.now();
  }));
  bus.register("shot.reset",()=>store.commit("Reset active shot",state=>{
    const shot=activeShot(state);for(const axis of AXES){shot.start.values[axis.id]=axis.defaultStart;shot.end.values[axis.id]=axis.defaultEnd;shot.locks[axis.id]=false;}shot.start.choices=defaultCreativeChoices("start");shot.end.choices=defaultCreativeChoices("end");shot.creativeLocks=Object.fromEntries(CREATIVE_AXES.map(axis=>[axis.id,false]));shot.name="Silent Authority";shot.family="hero";shot.presetId="hero.silent-authority";shot.durationFrames=72;shot.variant=1;shot.updatedAt=new Date().toISOString();state.playback.frame=0;state.playback.playing=false;
  }));
  bus.register("shot.addToTimeline",({trackId="v1"}={})=>store.commit("Add shot to timeline",state=>{
    const shot=activeShot(state),clips=Object.values(state.timeline.clips).filter(clip=>clip.trackId===trackId),startFrame=clips.reduce((max,clip)=>Math.max(max,clipEnd(clip)),0),id=uid("clip");
    state.timeline.clips[id]={id,trackId,type:"shot",shotId:shot.id,linked:true,alias:shot.name,startFrame,durationFrames:shot.durationFrames,sourceInFrame:0,sourceOutFrame:shot.durationFrames};state.timeline.selectedClipId=id;state.timeline.selectedTrackId=trackId;state.timeline.playheadFrame=startFrame;state.timeline.outFrame=Math.max(state.timeline.outFrame,clipEnd(state.timeline.clips[id]));state.timeline.durationFrames=timelineDuration(state);toast?.("SHOT ADDED TO TIMELINE");
  }));
  bus.register("playback.toggle",()=>store.transient("Toggle playback",state=>{state.playback.playing=!state.playback.playing;state.playback.lastTick=performance.now();}));
  bus.register("playback.setLoop",({value})=>store.transient("Loop",state=>{state.playback.loop=Boolean(value);state.timeline.loop=Boolean(value);},{persist:true,broadcast:true}));
  bus.register("playback.seek",({frame})=>store.transient("Seek",state=>{
    const max=state.ui.activeWorkspace==="timeline"?timelineDuration(state):activeShot(state).durationFrames;const safe=clamp(Math.round(Number(frame)||0),0,max);state.playback.playing=false;state.playback.frame=safe;if(state.ui.activeWorkspace==="timeline")state.timeline.playheadFrame=safe;
  },{persist:true,broadcast:false}));
  bus.register("playback.jumpStart",()=>bus.dispatch("playback.seek",{frame:0}));
  bus.register("playback.jumpEnd",()=>{const state=store.get(),max=state.ui.activeWorkspace==="timeline"?timelineDuration(state):activeShot(state).durationFrames;return bus.dispatch("playback.seek",{frame:max});});
  bus.register("timeline.selectClip",({clipId})=>store.transient("Select clip",state=>{state.timeline.selectedClipId=clipId;const clip=state.timeline.clips[clipId];if(clip){state.timeline.selectedTrackId=clip.trackId;state.timeline.playheadFrame=clip.startFrame;state.playback.frame=clip.startFrame;}},{persist:true,broadcast:false}));
  bus.register("timeline.setPlayhead",({frame})=>store.transient("Timeline playhead",state=>{const safe=clamp(Math.round(frame),0,timelineDuration(state));state.timeline.playheadFrame=safe;state.playback.frame=safe;state.playback.playing=false;},{persist:true,broadcast:false}));
  bus.register("timeline.moveClip",({clipId,startFrame,trackId,gesture=false})=>{
    const mutate=state=>{const clip=state.timeline.clips[clipId];if(!clip)return;clip.startFrame=Math.max(-10,Math.round(startFrame));if(trackId&&state.timeline.tracks[trackId]?.type==="video")clip.trackId=trackId;state.timeline.outFrame=Math.max(state.timeline.outFrame,clipEnd(clip));state.timeline.durationFrames=timelineDuration(state);};
    return gesture?store.updateGesture("Move timeline clip",mutate):store.commit("Move timeline clip",mutate);
  });
  bus.register("timeline.trimClip",({clipId,durationFrames,gesture=false})=>{
    const mutate=state=>{const clip=state.timeline.clips[clipId];if(!clip)return;clip.durationFrames=Math.max(1,Math.round(durationFrames));clip.sourceOutFrame=clip.sourceInFrame+clip.durationFrames;state.timeline.outFrame=Math.max(state.timeline.outFrame,clipEnd(clip));state.timeline.durationFrames=timelineDuration(state);};
    return gesture?store.updateGesture("Trim timeline clip",mutate):store.commit("Trim timeline clip",mutate);
  });
  bus.register("timeline.deleteClip",({clipId})=>store.commit("Delete timeline clip",state=>{delete state.timeline.clips[clipId];state.timeline.selectedClipId=null;state.timeline.durationFrames=timelineDuration(state);}));
  bus.register("timeline.toggleSnap",()=>store.transient("Timeline snap",state=>state.timeline.snapEnabled=!state.timeline.snapEnabled,{persist:true,broadcast:true}));
  bus.register("timeline.setZoom",({value})=>store.transient("Timeline zoom",state=>state.timeline.zoom=clamp(Number(value),2,12),{persist:true,broadcast:false}));
  bus.register("timeline.updateSelected",({field,value})=>store.commit("Edit selected clip",state=>{const clip=state.timeline.clips[state.timeline.selectedClipId];if(!clip)return;if(field==="alias")clip.alias=String(value||"Shot");if(field==="startFrame")clip.startFrame=Math.max(-10,Math.round(Number(value)||0));if(field==="durationFrames")clip.durationFrames=Math.max(1,Math.round(Number(value)||1));if(field==="trackId"&&state.timeline.tracks[value])clip.trackId=value;state.timeline.durationFrames=timelineDuration(state);}));
  return bus;
}
