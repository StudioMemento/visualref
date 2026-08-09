import {identityTransform,createShot} from './project-factory.js';

function finiteVec3(value,fallback){return Array.isArray(value)&&value.length>=3?value.slice(0,3).map((n,i)=>Number.isFinite(Number(n))?Number(n):fallback[i]):fallback.slice();}

export class V45Commands{
  constructor(store){this.store=store;}
  sceneUpsertEntity(entity){
    this.store.commit('Scene · Upsert entity',p=>{
      const prev=p.scene.entities[entity.id]||{};
      p.scene.entities[entity.id]={id:entity.id,name:entity.name||prev.name||entity.id,role:entity.role||prev.role||'prop',assetId:entity.assetId??prev.assetId??null,visible:entity.visible!==false,transform:{...identityTransform(),...(prev.transform||{}),...(entity.transform||{})}};
      const role=p.scene.entities[entity.id].role;
      if(role==='hero'){
        for(const [id,item] of Object.entries(p.scene.entities))if(id!==entity.id&&item.role==='hero')delete p.scene.entities[id];
        p.scene.heroId=entity.id;
      }
      if(role==='environment')p.scene.environmentId=entity.id;
      p.diagnostics.heroEntityCount=Object.values(p.scene.entities).filter(x=>x.role==='hero').length;
    });
  }
  sceneSetTransform({entityId,position,rotation,scale}){
    this.store.commit('Scene · Transform',p=>{const e=p.scene.entities[entityId];if(!e)throw new Error(`Unknown entity ${entityId}`);e.transform={position:finiteVec3(position,e.transform.position),rotation:finiteVec3(rotation,e.transform.rotation),scale:finiteVec3(scale,e.transform.scale)};});
  }
  shotSetMotion({shotId=this.store.get().shots.activeShotId,enabled,primitive=null,energy}){
    this.store.commit('Shot · Motion',p=>{const s=p.shots.byId[shotId];if(!s)throw new Error(`Unknown Shot ${shotId}`);s.motion.enabled=Boolean(enabled);s.motion.primitive=s.motion.enabled?primitive:null;if(Number.isFinite(Number(energy)))s.motion.energy=Math.max(0,Math.min(1,Number(energy)));s.updatedAt=new Date().toISOString();});
  }
  timelineAddLinkedShot({shotId=this.store.get().shots.activeShotId,trackId='v1',startFrame=0}){
    const id=`clip-${Math.random().toString(36).slice(2,9)}`;
    this.store.commit('Timeline · Add linked Shot',p=>{const shot=p.shots.byId[shotId];if(!shot)throw new Error(`Unknown Shot ${shotId}`);p.timeline.clips[id]={id,type:'shot',shotId,linked:true,trackId,startFrame:Math.round(startFrame),durationFrames:shot.durationFrames,sourceInFrame:0,sourceOutFrame:shot.durationFrames};});return id;
  }
  timelineMakeUnique({clipId}){
    let newShotId=null;
    this.store.commit('Timeline · Make Unique',p=>{const clip=p.timeline.clips[clipId];if(!clip||clip.type!=='shot')throw new Error(`Unknown Shot clip ${clipId}`);const source=p.shots.byId[clip.shotId];newShotId=`shot-${Math.random().toString(36).slice(2,9)}`;const copy=structuredClone(source||createShot({id:newShotId}));copy.id=newShotId;copy.name=`${source?.name||'Shot'} Copy`;copy.updatedAt=new Date().toISOString();p.shots.byId[newShotId]=copy;p.shots.order.push(newShotId);clip.shotId=newShotId;clip.linked=false;});return newShotId;
  }
  timelineRetime({clipId,points}){
    this.store.commit('Timeline · Retime',p=>{const clip=p.timeline.clips[clipId];if(!clip)throw new Error(`Unknown clip ${clipId}`);const clean=(points||[]).map(x=>({t:Number(x.t),source:Number(x.source)})).filter(x=>Number.isFinite(x.t)&&Number.isFinite(x.source)).sort((a,b)=>a.t-b.t);for(let i=1;i<clean.length;i++){if(clean[i].t<=clean[i-1].t||clean[i].source<clean[i-1].source)throw new Error('Retime curve must be monotonic');}clip.retime={points:clean};});
  }
}
