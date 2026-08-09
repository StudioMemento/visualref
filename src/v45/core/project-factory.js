import {V45_SCHEMA_NAME,V45_SCHEMA_VERSION,V45_RELEASE} from './schema.js';

const clone = value => structuredClone(value);
const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`;

export const identityTransform = () => ({position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]});

export function createShot({id=uid('shot'),name='Untitled Shot'}={}){
  return {
    id,
    name,
    durationFrames:72,
    start:{camera:{},subject:{},light:{},environment:{}},
    end:{camera:{},subject:{},light:{},environment:{}},
    motion:{enabled:false,primitive:null,energy:.5,seed:0},
    subject:{visible:true,groundMode:'grounded'},
    updatedAt:now()
  };
}

export function createV45Project({id=uid('project'),name='MEMENTO V45A'}={}){
  const shot=createShot({id:'shot-001',name:'Shot 001'});
  return {
    schema:{name:V45_SCHEMA_NAME,version:V45_SCHEMA_VERSION,release:V45_RELEASE,migratedFrom:null},
    meta:{id,name,createdAt:now(),updatedAt:now()},
    settings:{aspectRatio:'16:9',fps:24,resolution:'1920×1080'},
    scene:{
      heroId:null,
      environmentId:null,
      entities:{},
      activeCameraId:null,
      editorCamera:{position:[5.8,3.5,7.4],target:[0,0,0],fov:45},
      environment:{hdriId:null,backgroundVisible:false,lightingIntensity:1,rotation:0,blur:0}
    },
    assets:{byId:{}},
    shots:{order:[shot.id],activeShotId:shot.id,byId:{[shot.id]:shot}},
    timeline:{durationFrames:180,playheadFrame:0,tracks:{},clips:{},markers:[]},
    playback:{mode:'shot',playing:false,frame:0,loop:true},
    compatibility:{sourceSchema:null,sourceRelease:null,quarantinedPresets:[],legacyBackup:null},
    diagnostics:{rendererOwners:0,heroEntityCount:0,assetTransactions:[]}
  };
}

export function cloneProject(project){return clone(project);}
