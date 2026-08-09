import assert from 'node:assert/strict';
import {createV45Project} from '../src/v45/core/project-factory.js';
import {assertProject} from '../src/v45/core/invariants.js';
import {V45ProjectStore} from '../src/v45/core/store.js';
import {V45Commands} from '../src/v45/core/commands.js';
import {RendererAuthority} from '../src/v45/runtime/renderer-authority.js';

const p=createV45Project();assert.equal(p.schema.version,45);assert.equal(p.shots.byId[p.shots.activeShotId].motion.enabled,false);assertProject(p);
const store=new V45ProjectStore(p),cmd=new V45Commands(store);
cmd.sceneUpsertEntity({id:'hero-a',role:'hero'});cmd.sceneUpsertEntity({id:'hero-b',role:'hero'});assert.equal(Object.values(store.get().scene.entities).filter(x=>x.role==='hero').length,1);assert.equal(store.get().scene.heroId,'hero-b');
const beforeEntities=Object.keys(store.get().scene.entities).length;const clipId=cmd.timelineAddLinkedShot({});assert.equal(Object.keys(store.get().scene.entities).length,beforeEntities);const sourceShot=store.get().timeline.clips[clipId].shotId;const unique=cmd.timelineMakeUnique({clipId});assert.notEqual(unique,sourceShot);assert.equal(Object.keys(store.get().scene.entities).length,beforeEntities);
cmd.timelineRetime({clipId,points:[{t:0,source:0},{t:.5,source:.25},{t:1,source:1}]});assert.throws(()=>cmd.timelineRetime({clipId,points:[{t:0,source:0},{t:1,source:.5},{t:.5,source:1}]}));
let disposed=0;const authority=new RendererAuthority();const a=authority.acquire('player',()=>({dispose(){disposed++;}}));assert.equal(authority.acquire('player',()=>({})),a);assert.throws(()=>authority.acquire('panel',()=>({})));assert.equal(authority.snapshot().rendererCount,1);authority.release('player');assert.equal(disposed,1);assert.equal(authority.snapshot().rendererCount,0);
console.log('V45 CORE CONTRACT SMOKE · PASS');
