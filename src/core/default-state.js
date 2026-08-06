import {uid} from "./utils.js";
import {CREATIVE_AXES,defaultCreativeChoices} from "../shots/creative-axes.js";

export const SCHEMA_NAME="memento.visualref";
export const SCHEMA_VERSION=43;
export const RELEASE="V43B.4";

export const AXES=[
  {id:"subject.positionX",group:"Subject",label:"Position X",hint:"Horizontal framing",min:-6,max:6,step:.01,unit:"",defaultStart:-.18,defaultEnd:.18},
  {id:"subject.positionY",group:"Subject",label:"Position Y",hint:"Vertical framing",min:-6,max:6,step:.01,unit:"",defaultStart:-.05,defaultEnd:.04},
  {id:"subject.positionZ",group:"Subject",label:"Position Z",hint:"Depth placement",min:-8,max:8,step:.01,unit:"",defaultStart:0,defaultEnd:0},
  {id:"subject.scale",group:"Subject",label:"Scale",hint:"Uniform hero scale",min:.05,max:8,step:.01,unit:"×",defaultStart:.92,defaultEnd:1.08},
  {id:"subject.rotationX",group:"Subject",label:"Rotation X",hint:"Pitch",min:-180,max:180,step:1,unit:"°",defaultStart:0,defaultEnd:0},
  {id:"subject.rotationY",group:"Subject",label:"Rotation Y",hint:"Presentation angle",min:-180,max:180,step:1,unit:"°",defaultStart:-22,defaultEnd:18},
  {id:"subject.rotationZ",group:"Subject",label:"Rotation Z",hint:"Roll",min:-180,max:180,step:1,unit:"°",defaultStart:0,defaultEnd:0},
  {id:"camera.distance",group:"Frame",label:"Camera distance",hint:"Dolly relationship",min:.35,max:40,step:.01,unit:"",defaultStart:5.5,defaultEnd:4.4},
  {id:"camera.height",group:"Frame",label:"Camera height",hint:"Viewpoint level",min:-10,max:10,step:.01,unit:"",defaultStart:.1,defaultEnd:.18},
  {id:"camera.targetX",group:"Frame",label:"Target X",hint:"Look-at horizontal",min:-6,max:6,step:.01,unit:"",defaultStart:0,defaultEnd:0},
  {id:"camera.targetY",group:"Frame",label:"Target Y",hint:"Look-at vertical",min:-6,max:6,step:.01,unit:"",defaultStart:0,defaultEnd:0},
  {id:"camera.fov",group:"Frame",label:"Field of view",hint:"Vertical FOV",min:8,max:100,step:.1,unit:"°",defaultStart:38,defaultEnd:38},
  {id:"light.key",group:"World",label:"Key light",hint:"Primary energy",min:.05,max:4,step:.01,unit:"",defaultStart:.72,defaultEnd:1.05},
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

export const DEFAULT_CORRECTION={pivot:[0,0,0],rotation:[0,0,0],scale:[1,1,1],groundOffset:0,autoNormalize:true,autoGround:true};
export const DEFAULT_TRANSFORM={position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};
export const DEFAULT_EDITOR_CAMERA={position:[5.8,3.5,7.4],target:[0,0,0],fov:45,near:.02,far:1000};

function defaultValues(endpoint){return Object.fromEntries(AXES.map(axis=>[axis.id,endpoint==="start"?axis.defaultStart:axis.defaultEnd]));}
function shot(id="shot-001"){
  return {id,name:"Silent Authority",family:"hero",presetId:"hero.silent-authority",durationFrames:72,variant:1,variantMode:"balanced",seed:43001,deltaTarget:.42,
    start:{values:defaultValues("start"),choices:defaultCreativeChoices("start")},end:{values:defaultValues("end"),choices:defaultCreativeChoices("end")},
    locks:Object.fromEntries(AXES.map(axis=>[axis.id,false])),
    creativeLocks:Object.fromEntries(CREATIVE_AXES.map(axis=>[axis.id,false])),
    creativeExclusions:{},updatedAt:new Date().toISOString()};
}
function node({id,name,type,assetId=null,transform=DEFAULT_TRANSFORM,correction=DEFAULT_CORRECTION,visible=true,locked=false,parentId=null}){
  return {id,name,type,assetId,parentId,visible,locked,baseTransform:structuredClone(transform),correction:structuredClone(correction),helpers:{bounds:true,pivot:false}};
}
export function createDefaultState(){
  const projectId=uid("project"),activeShot=shot(),now=new Date().toISOString();
  return {
    schema:{name:SCHEMA_NAME,version:SCHEMA_VERSION,release:RELEASE,migratedFrom:null},
    meta:{id:projectId,name:"MEMENTO V43B.4",createdAt:now,updatedAt:now,language:"EN"},
    settings:{aspectRatio:"16:9",fps:24,resolution:"1920×1080",playbackQuality:"preview",performanceTier:"auto"},
    assets:{heroId:"hero-proxy",environmentId:"environment-proxy",hdriId:null,secondaryIds:[],audioIds:[],byId:{
      "hero-proxy":{id:"hero-proxy",type:"hero",kind:"builtin",name:"CALIBRATED PROXY",status:"ready",source:"builtin",size:0},
      "environment-proxy":{id:"environment-proxy",type:"environment",kind:"builtin",name:"DARK STUDIO",status:"ready",source:"builtin",size:0}
    }},
    scene:{activeCameraId:"camera-main",activeLightRigId:"light-default",editorCamera:structuredClone(DEFAULT_EDITOR_CAMERA),viewportCameraMode:"editor",showGrid:true,showHelpers:true,nodes:{
      "hero-proxy":node({id:"hero-proxy",name:"Hero · Calibrated Proxy",type:"hero",assetId:"hero-proxy"}),
      "environment-proxy":node({id:"environment-proxy",name:"Environment · Dark Studio",type:"environment",assetId:"environment-proxy"}),
      "camera-main":node({id:"camera-main",name:"Camera · Shot",type:"camera",correction:{...DEFAULT_CORRECTION,autoNormalize:false,autoGround:false}}),
      "camera-editor":node({id:"camera-editor",name:"Camera · Editor",type:"editor-camera",correction:{...DEFAULT_CORRECTION,autoNormalize:false,autoGround:false}}),
      "light-default":node({id:"light-default",name:"Light · Default Rig",type:"light",correction:{...DEFAULT_CORRECTION,autoNormalize:false,autoGround:false}})
    },environment:{backgroundVisible:false,hdriContribution:1,intensity:1,rotation:0,blur:0},rendererSettings:{toneMapping:"ACES",exposure:1}},
    shots:{order:[activeShot.id],activeShotId:activeShot.id,byId:{[activeShot.id]:activeShot}},
    playback:{mode:"shot",playing:false,frame:0,loop:true,lastTick:0},
    timeline:{durationFrames:180,playheadFrame:0,inFrame:0,outFrame:180,loop:true,snapEnabled:true,zoom:5,selectedClipId:null,selectedTrackId:"v1",markers:[],tracks:Object.fromEntries(TRACKS.map(track=>[track.id,{...track,locked:false,muted:false,visible:true}])),clips:{}},
    glossary:{preferences:{category:"all",query:""}},
    ui:{activeWorkspace:"render",advanced:false,editScope:"both",splitter:.50,viewportTool:"translate",selectedNodeId:"hero-proxy",selectedAxisId:"subject.scale",selectedCreativeAxisId:"light",projectDialogOpen:false,mobileMode:"shot",assetBusy:false,timelineMonitorMode:"player"}
  };
}
function normalizeTransform(value){
  const out=structuredClone(DEFAULT_TRANSFORM);if(!value)return out;
  for(const key of ["position","rotation","scale"]){if(Array.isArray(value[key])&&value[key].length>=3)out[key]=value[key].slice(0,3).map((n,i)=>Number.isFinite(Number(n))?Number(n):out[key][i]);}
  return out;
}
function normalizeCorrection(value){const out=structuredClone(DEFAULT_CORRECTION);if(!value)return out;for(const key of ["pivot","rotation","scale"]){if(Array.isArray(value[key])&&value[key].length>=3)out[key]=value[key].slice(0,3).map((n,i)=>Number.isFinite(Number(n))?Number(n):out[key][i]);}out.groundOffset=Number.isFinite(Number(value.groundOffset))?Number(value.groundOffset):0;out.autoNormalize=value.autoNormalize!==false;out.autoGround=value.autoGround!==false;return out;}
export function normalizeState(input){
  if(!input||input.schema?.name!==SCHEMA_NAME||Number(input.schema?.version)!==SCHEMA_VERSION)return createDefaultState();
  const defaults=createDefaultState(),state=input;
  state.schema={...defaults.schema,...state.schema,release:RELEASE};
  state.meta={...defaults.meta,...state.meta};
  if(/^MEMENTO V43(?:A|B(?:\.1)?)/.test(state.meta.name||""))state.meta.name="MEMENTO V43B.4";
  state.settings={...defaults.settings,...state.settings};
  state.assets={...defaults.assets,...state.assets,byId:{...defaults.assets.byId,...(state.assets?.byId||{})}};
  state.assets.secondaryIds=Array.isArray(state.assets.secondaryIds)?state.assets.secondaryIds:[];
  state.scene={...defaults.scene,...state.scene,environment:{...defaults.scene.environment,...(state.scene?.environment||{})},rendererSettings:{...defaults.scene.rendererSettings,...(state.scene?.rendererSettings||{})},editorCamera:{...DEFAULT_EDITOR_CAMERA,...(state.scene?.editorCamera||{})},nodes:{...defaults.scene.nodes,...(state.scene?.nodes||{})}};
  for(const [id,n] of Object.entries(state.scene.nodes)){n.id??=id;n.baseTransform=normalizeTransform(n.baseTransform);n.correction=normalizeCorrection(n.correction);n.helpers={bounds:true,pivot:false,...(n.helpers||{})};}
  state.ui={...defaults.ui,...(state.ui||{})};state.playback={...defaults.playback,...(state.playback||{})};state.timeline={...defaults.timeline,...(state.timeline||{})};state.timeline.clips??={};state.timeline.tracks={...defaults.timeline.tracks,...(state.timeline.tracks||{})};
  state.shots??=defaults.shots;state.shots.byId??=defaults.shots.byId;state.shots.order??=Object.keys(state.shots.byId);state.shots.activeShotId??=state.shots.order[0];
  for(const shot of Object.values(state.shots.byId||{})){shot.start??={values:defaultValues("start")};shot.end??={values:defaultValues("end")};shot.start.values={...defaultValues("start"),...(shot.start.values||{})};shot.end.values={...defaultValues("end"),...(shot.end.values||{})};shot.start.choices={...defaultCreativeChoices("start"),...(shot.start.choices||{})};shot.end.choices={...defaultCreativeChoices("end"),...(shot.end.choices||{})};shot.locks={...Object.fromEntries(AXES.map(axis=>[axis.id,false])),...(shot.locks||{})};shot.creativeLocks={...Object.fromEntries(CREATIVE_AXES.map(axis=>[axis.id,false])),...(shot.creativeLocks||{})};
    for(const axis of AXES)shot.locks[axis.id]=false;
    for(const creativeAxis of CREATIVE_AXES){if(!shot.creativeLocks[creativeAxis.id])continue;for(const numericAxisId of creativeAxis.advancedAxes||[])shot.locks[numericAxisId]=true;}
    const validExclusions={};
    for(const axis of CREATIVE_AXES){for(const option of axis.options){const key=`${axis.id}:${option.id}`;if(shot.creativeExclusions?.[key])validExclusions[key]=true;}}
    shot.creativeExclusions=validExclusions;
  }
  return state;
}
