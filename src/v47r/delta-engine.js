/* ============================================================================
   MEMENTO VISUALREF V47R · PURE DELTA ENGINE
   Deterministic. Lock-aware. No Store substitution. No Renderer patching.
   ========================================================================== */

export const AXIS_RANGES={
  "subject.positionX":[-6,6],"subject.positionY":[-6,6],"subject.positionZ":[-8,8],
  "subject.scale":[.05,8],"subject.rotationX":[-180,180],"subject.rotationY":[-180,180],"subject.rotationZ":[-180,180],
  "camera.distance":[.35,40],"camera.height":[-10,10],"camera.targetX":[-6,6],"camera.targetY":[-6,6],"camera.fov":[8,100],
  "light.key":[.05,4],"environment.depth":[0,1],"motion.energy":[0,1]
};

export const CREATIVE_CATEGORY={
  "subject-presence":"SUBJECT","subject-size":"SUBJECT","subject-rotation":"SUBJECT",
  camera:"CAMERA",view:"CAMERA",composition:"COMPOSITION",lens:"LENS / FOCUS",focus:"LENS / FOCUS",
  light:"LIGHT",environment:"ENVIRONMENT","motion-design":"MOTION",atmosphere:"IMAGE"
};

export const NUMERIC_CATEGORY={
  "subject.positionX":"COMPOSITION","subject.positionY":"COMPOSITION","subject.positionZ":"SUBJECT",
  "subject.scale":"SUBJECT","subject.rotationX":"SUBJECT","subject.rotationY":"SUBJECT","subject.rotationZ":"SUBJECT",
  "camera.distance":"CAMERA","camera.height":"CAMERA","camera.targetX":"COMPOSITION","camera.targetY":"COMPOSITION","camera.fov":"LENS / FOCUS",
  "light.key":"LIGHT","environment.depth":"ENVIRONMENT","motion.energy":"MOTION"
};

const POOLS={
  "subject-presence":["present","hidden"],
  "subject-size":["very-small","small","medium","large","overscale"],
  "subject-rotation":["0","45","90","135","180","in-rotation"],
  camera:["static","micro-drift","push-in","orbit","crane","gimbal","dolly-zoom","pan","handheld"],
  view:["centered","three-quarter","form-detail","offset","low","top","profile","orthogonal","macro-three-quarter","zenithal"],
  composition:["centered","thirds","negative","off-scale","low","peak"],
  lens:["18mm","35mm","50mm","85mm","200mm","macro","tilt-shift"],
  focus:["all","shallow","rack","macro","foreground"],
  light:["rim-side","duo-rim","top","bottom","backlight","radiant","three-point","studio","spotlight","penumbra","hard-light","rim-sweep","beauty-strip","portal","pulse"],
  environment:["void","plane","limbo"],
  "motion-design":["none","hero-clones","pattern","spiral","vortex","kaleidoscope","multiaxis","exploded","stack","satellite","wave","dispersion"],
  atmosphere:["clean","particles","curl-flow","spark-burst","orbital-dust","data-rain"]
};

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const copy=value=>typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
const activeShot=state=>state?.shots?.byId?.[state?.shots?.activeShotId]||null;
const seeded=seed=>{let value=(Number(seed)>>>0)||1;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};};
const hashString=value=>{let hash=2166136261;for(const char of String(value??"")){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;};

export function normalizeSeed(value,fallback=43001){
  const number=Math.abs(Math.round(Number(value)));
  return Number.isFinite(number)&&number>0?number%2147483647:fallback;
}

export function candidateProfile(target){
  const value=clamp(target,5,95);
  return value<28?"near":value>68?"bold":"balanced";
}

export function evaluateShotSnapshot(shot,frame=0){
  if(!shot)return null;
  const duration=Math.max(1,Number(shot.durationFrames)||72),linear=clamp(frame/duration,0,1),t=linear*linear*(3-2*linear),values={};
  const keys=new Set([...Object.keys(shot.start?.values||{}),...Object.keys(shot.end?.values||{})]);
  for(const key of keys){
    const start=Number(shot.start?.values?.[key])||0,end=Number(shot.end?.values?.[key])||0;
    values[key]=start+(end-start)*t;
  }
  return {shotId:shot.id,shotName:shot.name,frame:clamp(frame,0,duration),duration,linear,t,values,
    choices:{start:{...(shot.start?.choices||{})},end:{...(shot.end?.choices||{})}},family:shot.family,presetId:shot.presetId,
    variant:shot.variant,seed:shot.seed,deltaTarget:shot.deltaTarget??.42};
}

export function collectLockedCategories(shot){
  const categories=new Set();
  for(const [axisId,locked] of Object.entries(shot?.creativeLocks||{}))if(locked)categories.add(CREATIVE_CATEGORY[axisId]||"SHOT");
  for(const [axisId,locked] of Object.entries(shot?.locks||{}))if(locked)categories.add(NUMERIC_CATEGORY[axisId]||"PRECISION");
  return [...categories];
}

export function compareShots(current,candidate){
  if(!current||!candidate)return {score:0,changedCategories:[],lockedCategories:[],changes:[],numericChanges:[],creativeChanges:[]};
  const numericChanges=[],creativeChanges=[],categoryWeights=new Map();
  let numericAccumulator=0,numericSlots=0,creativeAccumulator=0,creativeSlots=0;
  const numericKeys=new Set([
    ...Object.keys(current.start?.values||{}),...Object.keys(current.end?.values||{}),
    ...Object.keys(candidate.start?.values||{}),...Object.keys(candidate.end?.values||{})
  ]);
  for(const axisId of numericKeys){
    const range=AXIS_RANGES[axisId]||[-1,1],span=Math.max(.000001,range[1]-range[0]);
    for(const side of ["start","end"]){
      const before=Number(current[side]?.values?.[axisId])||0,after=Number(candidate[side]?.values?.[axisId])||0;
      const distance=Math.abs(after-before)/span;numericSlots++;numericAccumulator+=Math.min(1,distance*6);
      if(distance>.00005){
        const category=NUMERIC_CATEGORY[axisId]||"PRECISION";
        numericChanges.push({type:"numeric",axisId,side,before,after,distance,category});
        categoryWeights.set(category,(categoryWeights.get(category)||0)+distance);
      }
    }
  }
  const creativeKeys=new Set([
    ...Object.keys(current.start?.choices||{}),...Object.keys(current.end?.choices||{}),
    ...Object.keys(candidate.start?.choices||{}),...Object.keys(candidate.end?.choices||{})
  ]);
  for(const axisId of creativeKeys){
    for(const side of ["start","end"]){
      creativeSlots++;
      const before=current[side]?.choices?.[axisId],after=candidate[side]?.choices?.[axisId];
      if(before!==after){
        creativeAccumulator++;
        const category=CREATIVE_CATEGORY[axisId]||"SHOT";
        creativeChanges.push({type:"creative",axisId,side,before,after,distance:1,category});
        categoryWeights.set(category,(categoryWeights.get(category)||0)+1);
      }
    }
  }
  const creativeRatio=creativeAccumulator/Math.max(1,creativeSlots),numericRatio=numericAccumulator/Math.max(1,numericSlots);
  const score=Math.round(clamp((creativeRatio*.82+numericRatio*.18)*100,0,100));
  const changedCategories=[...categoryWeights.entries()].sort((a,b)=>b[1]-a[1]).map(([category])=>category);
  return {score,changedCategories,lockedCategories:collectLockedCategories(current),changes:[...creativeChanges,...numericChanges],numericChanges,creativeChanges};
}

export function generationFingerprint(state,seed,target){
  return hashString(JSON.stringify({shot:activeShot(state),seed:normalizeSeed(seed),target:Math.round(target)})).toString(36);
}

export function generateCandidateFromState(sourceState,{seed,target,attempts=32}={}){
  const sourceShot=activeShot(sourceState);
  if(!sourceState||!sourceShot)throw new Error("No active shot is available for candidate generation.");
  const targetPercent=clamp(target??(sourceShot.deltaTarget??.42)*100,5,95),baseSeed=normalizeSeed(seed??sourceShot.seed),profile=candidateProfile(targetPercent);
  const profileOrder=profile==="near"?["near","balanced"]:profile==="bold"?["bold","balanced"]:["balanced","near","bold"];
  const maxDepth=profile==="near"?2:profile==="bold"?8:5;
  let best=null;

  for(let index=0;index<attempts;index++){
    const mode=profileOrder[index%profileOrder.length],depth=1+(Math.floor(index/profileOrder.length)%maxDepth),state=copy(sourceState),shot=activeShot(state);
    const resolvedSeed=normalizeSeed(baseSeed+index*104729+depth*7919);
    shot.seed=resolvedSeed;shot.deltaTarget=targetPercent/100;
    for(let pass=0;pass<depth;pass++)mutateCandidate(shot,mode,pass,resolvedSeed);
    enforceRules(sourceShot,shot);
    steerTowardTarget(sourceShot,shot,targetPercent,resolvedSeed);
    enforceRules(sourceShot,shot);
    const comparison=compareShots(sourceShot,shot),distance=Math.abs(comparison.score-targetPercent),penalty=comparison.score===0?35:comparison.score>targetPercent+22?(comparison.score-targetPercent-22)*.45:0;
    const candidate={shot:copy(shot),comparison,resolvedSeed,requestedSeed:baseSeed,target:targetPercent,profile:mode,passes:depth,
      fingerprint:generationFingerprint(sourceState,baseSeed,targetPercent),distance:distance+penalty};
    if(!best||candidate.distance<best.distance||(candidate.distance===best.distance&&distance<Math.abs(best.comparison.score-targetPercent)))best=candidate;
    if(distance<=2)break;
  }
  if(!best)throw new Error("Candidate generation failed.");
  best.shot.deltaTarget=targetPercent/100;best.shot.variantMode=best.profile;best.shot.seed=best.resolvedSeed;
  best.shot.name=`${String(sourceShot.name||"Shot").replace(/ · [CV]\d+$/,'')} · C${String((sourceShot.variant||1)+1).padStart(2,"0")}`;
  best.shot.updatedAt=sourceShot.updatedAt||null;
  return best;
}

function mutateCandidate(shot,mode,pass,seed){
  const rng=seeded(normalizeSeed(seed)+(shot.variant||1)*7919+pass*97),factor=mode==="near"?.18:mode==="bold"?.76:.44;
  shot.start??={values:{},choices:{}};shot.end??={values:{},choices:{}};
  for(const side of targetSides(mode,rng)){
    const creative=Object.keys(shot[side]?.choices||{}).filter(axis=>!shot.creativeLocks?.[axis]);
    for(const axisId of creative){
      if(rng()>factor)continue;
      const current=shot[side].choices[axisId],options=(POOLS[axisId]||[current]).filter(option=>option!==current&&!shot.creativeExclusions?.[`${axisId}:${option}`]);
      if(options.length){const option=options[Math.floor(rng()*options.length)];shot[side].choices[axisId]=option;applyChoicePatch(shot,axisId,option,side);}
    }
  }
  for(const [axisId,[min,max]] of Object.entries(AXIS_RANGES)){
    if(shot.locks?.[axisId]||rng()>factor*.62)continue;
    const side=mode==="bold"&&rng()>.55?"start":"end",span=max-min,amount=(rng()-.5)*span*(mode==="bold"?.12:mode==="near"?.018:.052);
    shot[side].values[axisId]=clamp((Number(shot[side].values[axisId])||0)+amount,min,max);
  }
  shot.variant=(shot.variant||1)+1;shot.variantMode=mode;
}

function targetSides(mode,rng){return mode==="bold"&&rng()>.45?["end","start"]:["end"];}

function applyChoicePatch(shot,axisId,optionId,side){
  const rotation={"0":0,"45":45,"90":90,"135":135,"180":180,"in-rotation":side==="start"?-72:72};
  const scale={"very-small":.45,small:.68,medium:1,large:1.25,overscale:1.6};
  const depth={void:.2,plane:.4,limbo:.62};
  const focal={"18mm":88,"35mm":54,"50mm":38,"85mm":24,"200mm":11,macro:20,"tilt-shift":28};
  if(axisId==="subject-rotation"&&rotation[optionId]!=null)shot[side].values["subject.rotationY"]=rotation[optionId];
  if(axisId==="subject-size"&&scale[optionId]!=null)shot[side].values["subject.scale"]=scale[optionId];
  if(axisId==="environment"&&depth[optionId]!=null)shot[side].values["environment.depth"]=depth[optionId];
  if(axisId==="lens"&&focal[optionId]!=null)shot[side].values["camera.fov"]=focal[optionId];
  if(axisId==="motion-design"&&optionId!=="none")shot[side].values["motion.energy"]=Math.max(.18,Number(shot[side].values["motion.energy"])||0);
}

function steerTowardTarget(source,candidate,target,seed){
  const rng=seeded(seed^0x9e3779b9),actions=[];
  for(const axisId of Object.keys(POOLS)){actions.push({axisId,side:"end"});if(target>58)actions.push({axisId,side:"start"});}
  for(let i=actions.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[actions[i],actions[j]]=[actions[j],actions[i]];}
  let comparison=compareShots(source,candidate),guard=0;
  while(comparison.score<target-2&&guard<actions.length*2){
    const {axisId,side}=actions[guard%actions.length];guard++;if(source.creativeLocks?.[axisId])continue;
    const current=source[side]?.choices?.[axisId],pool=(POOLS[axisId]||[]).filter(option=>option!==current&&!source.creativeExclusions?.[`${axisId}:${option}`]);
    if(!pool.length)continue;
    const before=copy(candidate),option=pool[Math.floor(rng()*pool.length)];candidate[side].choices[axisId]=option;applyChoicePatch(candidate,axisId,option,side);enforceRules(source,candidate);
    const next=compareShots(source,candidate);
    if(Math.abs(next.score-target)>Math.abs(comparison.score-target)&&next.score>target+4)Object.assign(candidate,before);else comparison=next;
  }
  if(comparison.score>target+4){
    const changes=[...comparison.creativeChanges].sort(()=>rng()-.5);
    for(const change of changes){
      const before=copy(candidate),original=source[change.side]?.choices?.[change.axisId];candidate[change.side].choices[change.axisId]=original;applyChoicePatch(candidate,change.axisId,original,change.side);enforceRules(source,candidate);
      const next=compareShots(source,candidate);if(Math.abs(next.score-target)<=Math.abs(comparison.score-target))comparison=next;else Object.assign(candidate,before);if(Math.abs(comparison.score-target)<=2)break;
    }
  }
}

function enforceRules(current,candidate){
  candidate.start??={values:{},choices:{}};candidate.end??={values:{},choices:{}};
  for(const side of ["start","end"]){candidate[side].values??={};candidate[side].choices??={};}
  for(const [axisId,locked] of Object.entries(current.creativeLocks||{}))if(locked){candidate.start.choices[axisId]=current.start?.choices?.[axisId];candidate.end.choices[axisId]=current.end?.choices?.[axisId];}
  for(const [axisId,locked] of Object.entries(current.locks||{}))if(locked){candidate.start.values[axisId]=current.start?.values?.[axisId];candidate.end.values[axisId]=current.end?.values?.[axisId];}
  for(const side of ["start","end"])for(const [axisId,optionId] of Object.entries(candidate[side].choices||{}))if(current.creativeExclusions?.[`${axisId}:${optionId}`])candidate[side].choices[axisId]=current[side]?.choices?.[axisId];
}
