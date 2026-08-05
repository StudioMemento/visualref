import {uid} from "./utils.js";

export const SCHEMA_NAME="memento.visualref";
export const SCHEMA_VERSION=43;

export const AXES=[
  {id:"subject.positionX",group:"Subject",label:"Position X",hint:"Horizontal framing",min:-1.4,max:1.4,step:.01,unit:"",defaultStart:-.18,defaultEnd:.18},
  {id:"subject.positionY",group:"Subject",label:"Position Y",hint:"Vertical framing",min:-.8,max:.8,step:.01,unit:"",defaultStart:-.05,defaultEnd:.04},
  {id:"subject.scale",group:"Subject",label:"Scale",hint:"Hero coverage",min:.35,max:1.85,step:.01,unit:"×",defaultStart:.92,defaultEnd:1.08},
  {id:"subject.rotationY",group:"Subject",label:"Rotation Y",hint:"Presentation angle",min:-180,max:180,step:1,unit:"°",defaultStart:-22,defaultEnd:18},
  {id:"camera.distance",group:"Frame",label:"Camera distance",hint:"Dolly relationship",min:2.8,max:9,step:.01,unit:"",defaultStart:5.5,defaultEnd:4.4},
  {id:"camera.height",group:"Frame",label:"Camera height",hint:"Viewpoint level",min:-1.4,max:1.8,step:.01,unit:"",defaultStart:.1,defaultEnd:.18},
  {id:"light.key",group:"World",label:"Key light",hint:"Primary energy",min:.15,max:2.2,step:.01,unit:"",defaultStart:.72,defaultEnd:1.05},
  {id:"environment.depth",group:"World",label:"Environment depth",hint:"Atmosphere and separation",min:0,max:1,step:.01,unit:"",defaultStart:.26,defaultEnd:.48}
];
export const AXIS_MAP=new Map(AXES.map(axis=>[axis.id,axis]));

export const TRACKS=[
  {id:"gfx",label:"GFX/FX",type:"fx",priority:6},
  {id:"v3",label:"V3",type:"video",priority:5},
  {id:"v2",label:"V2",type:"video",priority:4},
  {id:"v1",label:"V1",type:"video",priority:3},
  {id:"a1",label:"A1",type:"audio",priority:2},
  {id:"a2",label:"A2",type:"audio",priority:1}
];

function defaultValues(endpoint){
  return Object.fromEntries(AXES.map(axis=>[axis.id,endpoint==="start"?axis.defaultStart:axis.defaultEnd]));
}
function shot(id="shot-001"){
  return {
    id,
    name:"Silent Authority",
    family:"hero",
    presetId:"hero.silent-authority",
    durationFrames:72,
    variant:1,
    variantMode:"balanced",
    seed:43001,
    deltaTarget:.42,
    start:{values:defaultValues("start")},
    end:{values:defaultValues("end")},
    locks:Object.fromEntries(AXES.map(axis=>[axis.id,false])),
    updatedAt:new Date().toISOString()
  };
}
export function createDefaultState(){
  const projectId=uid("project");
  const activeShot=shot();
  const now=new Date().toISOString();
  return {
    schema:{name:SCHEMA_NAME,version:SCHEMA_VERSION,migratedFrom:null},
    meta:{id:projectId,name:"MEMENTO V43A",createdAt:now,updatedAt:now,language:"EN"},
    settings:{aspectRatio:"16:9",fps:24,resolution:"1920×1080",playbackQuality:"preview",performanceTier:"auto"},
    assets:{heroId:"hero-proxy",environmentId:"environment-proxy",hdriId:null,secondaryIds:[],audioIds:[],byId:{
      "hero-proxy":{id:"hero-proxy",type:"hero",name:"CALIBRATED PROXY",status:"ready",source:"builtin"},
      "environment-proxy":{id:"environment-proxy",type:"environment",name:"DARK STUDIO",status:"ready",source:"builtin"}
    }},
    scene:{activeCameraId:"camera-main",activeLightRigId:"light-default",nodes:{
      "hero-proxy":{id:"hero-proxy",name:"Hero · Calibrated Proxy",type:"hero",visible:true,locked:false,baseTransform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}},
      "environment-proxy":{id:"environment-proxy",name:"Environment · Dark Studio",type:"environment",visible:true,locked:false,baseTransform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}},
      "camera-main":{id:"camera-main",name:"Camera · Main",type:"camera",visible:true,locked:false},
      "light-default":{id:"light-default",name:"Light · Default Rig",type:"light",visible:true,locked:false}
    },environment:{backgroundVisible:true,hdriContribution:0},rendererSettings:{toneMapping:"ACES",exposure:1}},
    shots:{order:[activeShot.id],activeShotId:activeShot.id,byId:{[activeShot.id]:activeShot}},
    playback:{mode:"shot",playing:false,frame:0,loop:true,lastTick:0},
    timeline:{durationFrames:180,playheadFrame:0,inFrame:0,outFrame:180,loop:true,snapEnabled:true,zoom:5,selectedClipId:null,selectedTrackId:"v1",markers:[],tracks:Object.fromEntries(TRACKS.map(track=>[track.id,{...track,locked:false,muted:false,visible:true}])),clips:{}},
    glossary:{preferences:{category:"all",query:""}},
    ui:{activeWorkspace:"render",advanced:false,editScope:"both",splitter:.60,viewportTool:"translate",selectedNodeId:"hero-proxy",selectedAxisId:"subject.scale",projectDialogOpen:false,mobileMode:"shot"}
  };
}
export function normalizeState(input){
  if(!input||input.schema?.name!==SCHEMA_NAME||Number(input.schema?.version)!==SCHEMA_VERSION)return createDefaultState();
  const state=input;
  state.ui??={};state.ui.activeWorkspace??="render";state.ui.editScope??="both";state.ui.splitter??=.60;state.ui.viewportTool??="translate";state.ui.selectedNodeId??="hero-proxy";
  state.playback??={mode:"shot",playing:false,frame:0,loop:true,lastTick:0};
  state.timeline??=createDefaultState().timeline;
  state.timeline.clips??={};state.timeline.tracks??=createDefaultState().timeline.tracks;
  return state;
}
