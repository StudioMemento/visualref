import assert from "node:assert/strict";
import {compareShots,generateCandidate} from "../../src/v47/delta-engine.js";

const pools={
  "subject-presence":["present","hidden"],"subject-size":["very-small","small","medium","large","overscale"],"subject-rotation":["0","45","90","135","180","in-rotation"],
  camera:["static","micro-drift","push-in","orbit","crane","gimbal","pan"],view:["centered","three-quarter","form-detail","offset","low","top","profile"],
  composition:["centered","thirds","negative","off-scale","low","peak"],lens:["18mm","35mm","50mm","85mm","200mm","macro"],focus:["all","shallow","rack","macro","foreground"],
  light:["rim-side","duo-rim","top","bottom","backlight","studio","spotlight","hard-light"],environment:["void","plane","limbo"],
  "motion-design":["none","hero-clones","pattern","spiral","vortex","multiaxis","exploded"],atmosphere:["clean","particles","curl-flow","spark-burst","orbital-dust","data-rain"]
};
const axisRanges={"subject.positionX":[-6,6],"subject.positionY":[-6,6],"subject.positionZ":[-8,8],"subject.scale":[.05,8],"subject.rotationX":[-180,180],"subject.rotationY":[-180,180],"subject.rotationZ":[-180,180],"camera.distance":[.35,40],"camera.height":[-10,10],"camera.targetX":[-6,6],"camera.targetY":[-6,6],"camera.fov":[8,100],"light.key":[.05,4],"environment.depth":[0,1],"motion.energy":[0,1]};
const advanced={"subject-size":["subject.scale"],"subject-rotation":["subject.rotationY"],camera:["camera.distance","camera.height","subject.positionX"],view:["camera.height","subject.rotationY","subject.scale"],composition:["subject.positionX","subject.positionY"],lens:["camera.distance"],light:["light.key"],environment:["environment.depth"],"motion-design":["motion.energy","subject.positionX","subject.positionY","subject.rotationY","environment.depth"],atmosphere:["environment.depth","light.key"]};
const makeShot=()=>({id:"shot-001",name:"Silent Authority",durationFrames:72,variant:1,variantMode:"balanced",seed:43001,deltaTarget:.42,
  start:{choices:Object.fromEntries(Object.entries(pools).map(([id,options])=>[id,options[0]])),values:Object.fromEntries(Object.keys(axisRanges).map(id=>[id,0]))},
  end:{choices:Object.fromEntries(Object.entries(pools).map(([id,options])=>[id,options[Math.min(1,options.length-1)]])),values:Object.fromEntries(Object.entries(axisRanges).map(([id,[min,max]])=>[id,min+(max-min)*.08]))},
  creativeLocks:Object.fromEntries(Object.keys(pools).map(id=>[id,false])),locks:Object.fromEntries(Object.keys(axisRanges).map(id=>[id,false])),creativeExclusions:{}});
const makeState=()=>{const shot=makeShot();return {shots:{activeShotId:shot.id,order:[shot.id],byId:{[shot.id]:shot}},ui:{},playback:{frame:0}};};
const seeded=seed=>{let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};};

function apiFor(state){
  const store={state,get(){return this.state},commit(_label,fn){fn(this.state);return true},transient(_label,fn){fn(this.state);return true},updateGesture(_label,fn){fn(this.state);return true},beginGesture(){},endGesture(){},cancelGesture(){}};
  const handlers=new Map();handlers.set("shot.generateVariant",({mode})=>store.commit("variant",draft=>{
    const shot=draft.shots.byId[draft.shots.activeShotId],rng=seeded(shot.seed+shot.variant*7919+(mode==="bold"?97:mode==="near"?13:41)),chance=(mode==="near"?.18:mode==="bold"?.72:.42)*(.6+shot.deltaTarget);
    for(const [axisId,options] of Object.entries(pools)){
      if(shot.creativeLocks[axisId]||rng()>chance)continue;const current=shot.end.choices[axisId],allowed=options.filter(option=>option!==current&&!shot.creativeExclusions[`${axisId}:${option}`]);if(allowed.length)shot.end.choices[axisId]=allowed[Math.floor(rng()*allowed.length)];
    }
    for(const [axisId,[min,max]] of Object.entries(axisRanges)){if(shot.locks[axisId]||rng()>chance*.58)continue;shot.end.values[axisId]=Math.max(min,Math.min(max,shot.end.values[axisId]+(rng()-.5)*(max-min)*(mode==="bold"?.15:mode==="near"?.025:.065)));}
    shot.variant++;shot.variantMode=mode;
  }));
  return {store,commands:{handlers}};
}

const state=makeState(),before=structuredClone(state),api=apiFor(state);
const a=generateCandidate(api,{seed:777,target:40}),b=generateCandidate(api,{seed:777,target:40});
assert.deepEqual(state,before,"candidate generation must not mutate the current project");
assert.deepEqual(a.shot,b.shot,"same state, target and seed must reproduce the same candidate");
assert.equal(a.comparison.score,b.comparison.score);

const low=generateCandidate(api,{seed:900,target:10});
const mid=generateCandidate(api,{seed:900,target:45});
const high=generateCandidate(api,{seed:900,target:82});
assert.ok(low.comparison.score<=mid.comparison.score+6,`low ${low.comparison.score} should not exceed mid ${mid.comparison.score}`);
assert.ok(mid.comparison.score<=high.comparison.score+8,`mid ${mid.comparison.score} should not exceed high ${high.comparison.score}`);
assert.ok(high.comparison.score>low.comparison.score,`high ${high.comparison.score} must exceed low ${low.comparison.score}`);

const lockedState=makeState(),lockedShot=lockedState.shots.byId[lockedState.shots.activeShotId];lockedShot.creativeLocks.camera=true;for(const id of advanced.camera)lockedShot.locks[id]=true;lockedShot.creativeExclusions["light:spotlight"]=true;
const lockedBefore=structuredClone(lockedShot),lockedCandidate=generateCandidate(apiFor(lockedState),{seed:144,target:80}).shot;
assert.equal(lockedCandidate.start.choices.camera,lockedBefore.start.choices.camera);assert.equal(lockedCandidate.end.choices.camera,lockedBefore.end.choices.camera);
for(const id of advanced.camera){assert.equal(lockedCandidate.start.values[id],lockedBefore.start.values[id]);assert.equal(lockedCandidate.end.values[id],lockedBefore.end.values[id]);}
assert.notEqual(lockedCandidate.start.choices.light,"spotlight");assert.notEqual(lockedCandidate.end.choices.light,"spotlight");

const diff=compareShots(before.shots.byId["shot-001"],high.shot);assert.equal(diff.score,high.comparison.score);assert.ok(diff.changedCategories.length>0);
console.log(JSON.stringify({low:low.comparison.score,mid:mid.comparison.score,high:high.comparison.score,deterministic:true,locked:true},null,2));
