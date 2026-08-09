import {createV45Project} from '../core/project-factory.js';
import {assertProject} from '../core/invariants.js';

const clone=v=>structuredClone(v);
const presetKeys=['presetId','sequencePresetId','family','variantMode','creativeLocks','creativeExclusions'];

function transformFromV44(node){return clone(node?.baseTransform||{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]});}

export function adaptV44ToV45(v44,{keepBackup=true}={}){
  if(v44?.schema?.version!==44)throw new TypeError('V45A adapter accepts schema 44 only');
  const out=createV45Project({id:v44.meta?.id,name:v44.meta?.name||'Migrated V44 Project'});
  out.schema.migratedFrom=44;out.meta={...out.meta,...clone(v44.meta||{})};out.settings={...out.settings,...clone(v44.settings||{})};
  out.assets={byId:clone(v44.assets?.byId||{})};
  out.scene.editorCamera=clone(v44.scene?.editorCamera||out.scene.editorCamera);out.scene.environment={...out.scene.environment,hdriId:v44.assets?.hdriId||null,backgroundVisible:Boolean(v44.scene?.environment?.backgroundVisible),lightingIntensity:Number(v44.scene?.environment?.intensity??1),rotation:Number(v44.scene?.environment?.rotation??0),blur:Number(v44.scene?.environment?.blur??0)};
  for(const [id,node] of Object.entries(v44.scene?.nodes||{})){
    if(!['hero','environment','prop'].includes(node.type))continue;
    out.scene.entities[id]={id,name:node.name||id,role:node.type,assetId:node.assetId||null,visible:node.visible!==false,locked:Boolean(node.locked),transform:transformFromV44(node),calibration:{correction:clone(node.correction||{})}};
    if(node.type==='hero')out.scene.heroId=id;if(node.type==='environment')out.scene.environmentId=id;
  }
  out.shots={order:clone(v44.shots?.order||[]),activeShotId:v44.shots?.activeShotId||null,byId:{}};
  const quarantine=[];
  for(const [id,legacy] of Object.entries(v44.shots?.byId||{})){
    for(const key of presetKeys)if(legacy[key]!=null)quarantine.push({scope:'shot',id,key,value:clone(legacy[key])});
    out.shots.byId[id]={id,name:legacy.name||id,durationFrames:Number(legacy.durationFrames||72),start:{legacyValues:clone(legacy.start?.values||{}),legacyChoices:clone(legacy.start?.choices||{})},end:{legacyValues:clone(legacy.end?.values||{}),legacyChoices:clone(legacy.end?.choices||{})},motion:{enabled:false,primitive:null,energy:.5,seed:Number(legacy.seed||0)},subject:{visible:true,groundMode:'grounded'},updatedAt:legacy.updatedAt||new Date().toISOString()};
  }
  out.timeline={durationFrames:Number(v44.timeline?.durationFrames||180),playheadFrame:Number(v44.timeline?.playheadFrame||0),tracks:clone(v44.timeline?.tracks||{}),clips:{},markers:clone(v44.timeline?.markers||[])};
  for(const [id,clip] of Object.entries(v44.timeline?.clips||{})){
    out.timeline.clips[id]={id,type:clip.type||'shot',trackId:clip.trackId,startFrame:Number(clip.startFrame||0),durationFrames:Number(clip.durationFrames||1),sourceInFrame:Number(clip.sourceInFrame||0),sourceOutFrame:Number(clip.sourceOutFrame||clip.durationFrames||1),...(clip.type==='shot'||clip.shotId?{shotId:clip.shotId,linked:clip.linked!==false}:{}),...(clip.type==='audio'?{assetId:clip.assetId||null,volume:Number(clip.volume??1)}:{})};
  }
  out.playback={...out.playback,...clone(v44.playback||{})};
  out.compatibility={sourceSchema:44,sourceRelease:v44.schema?.release||'V44',quarantinedPresets:quarantine,legacyBackup:keepBackup?clone(v44):null};
  out.diagnostics.heroEntityCount=Object.values(out.scene.entities).filter(x=>x.role==='hero').length;
  assertProject(out);return out;
}

export function createReadOnlyV45View(v44Store){
  return Object.freeze({
    get:()=>adaptV44ToV45(v44Store.get(),{keepBackup:false}),
    subscribe:listener=>v44Store.subscribe((state,meta)=>listener(adaptV44ToV45(state,{keepBackup:false}),meta))
  });
}
