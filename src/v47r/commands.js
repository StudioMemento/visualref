import {generateCandidateFromState,normalizeSeed} from "./delta-engine.js";

const clone=value=>value==null?value:structuredClone(value);
const now=()=>new Date().toISOString();
const validWorkspace=value=>["viewport","render","timeline"].includes(value)?value:"viewport";

export function initializeRecoveryState(state){
  if(!state||typeof state!=="object")throw new Error("A project state is required.");
  state.recovery??={};
  state.recovery.version=1;
  const inheritedRecipe=state.v47?.world?.recipe||state.recovery.world?.recipe||"grey-limbo";
  const hadRecoveryWorld=Boolean(state.recovery.world);
  const inheritedGround=hadRecoveryWorld?state.recovery.world?.ground:state.assets?.heroId==="hero-proxy";
  state.recovery.world={
    recipe:["grey-limbo","white-limbo","black-limbo","void"].includes(inheritedRecipe)?inheritedRecipe:"grey-limbo",
    ground:Boolean(inheritedGround),
    shadowSoftness:Number.isFinite(Number(state.recovery.world?.shadowSoftness))?Number(state.recovery.world.shadowSoftness):58,
    safeFrame:(state.recovery.world?.safeFrame??state.v47?.world?.autoFit)!==false,
    calibratedAt:state.recovery.world?.calibratedAt||null
  };
  state.recovery.candidates??={};
  const legacyRecords=state.v47?.generation?.byShot||{};
  for(const [shotId,legacy] of Object.entries(legacyRecords))if(!state.recovery.candidates[shotId])state.recovery.candidates[shotId]={
    review:legacy.review||"current",baseSeed:normalizeSeed(legacy.baseSeed??state.shots?.byId?.[shotId]?.seed),candidate:legacy.candidate||null,
    previous:legacy.previous||null,meta:legacy.candidateMeta||legacy.previousMeta||null,generatedAt:null,acceptedAt:null
  };
  state.recovery.session={
    ...(state.recovery.session||{}),
    lastWorkspace:validWorkspace(state.ui?.activeWorkspace||state.recovery.session?.lastWorkspace),
    migratedFromOverlay:Boolean(state.v47||state.recovery.session?.migratedFromOverlay),
    startedAt:state.recovery.session?.startedAt||now()
  };
  state.ui??={};
  state.ui.activeWorkspace=validWorkspace(state.ui.activeWorkspace||"viewport");
  state.ui.workspaceSplitters={viewport:.68,render:.66,timeline:.34,...(state.ui.workspaceSplitters||{})};
  state.meta??={};
  if(/^MEMENTO V4[34567]/.test(state.meta.name||""))state.meta.name="MEMENTO V47R";
  if(state.schema){state.schema.release="V47R";state.schema.version=45;}
  for(const shotId of state.shots?.order||[])ensureCandidateRecord(state,shotId);
  return state;
}

export function ensureCandidateRecord(state,shotId=state.shots?.activeShotId){
  state.recovery??={version:1,world:{recipe:"grey-limbo",ground:true,shadowSoftness:58,safeFrame:true},candidates:{}};
  state.recovery.candidates??={};
  const shot=state.shots?.byId?.[shotId];
  const previous=state.recovery.candidates[shotId]||{};
  state.recovery.candidates[shotId]={
    review:["current","candidate","previous"].includes(previous.review)?previous.review:"current",
    baseSeed:normalizeSeed(previous.baseSeed??shot?.seed??43001),
    candidate:previous.candidate||null,
    previous:previous.previous||null,
    meta:previous.meta||null,
    generatedAt:previous.generatedAt||null,
    acceptedAt:previous.acceptedAt||null
  };
  return state.recovery.candidates[shotId];
}

export function candidateRecord(state,shotId=state.shots?.activeShotId){
  return ensureCandidateRecord(state,shotId);
}

export function registerRecoveryCommands(bus,{store,toast=()=>{}}={}){
  if(!bus?.register||!store)throw new Error("Recovery commands require a CommandBus and ProjectStore.");

  bus.register("recovery.setWorkspace",({workspace})=>{
    const next=validWorkspace(workspace);
    store.transient("Switch workspace",state=>{
      initializeRecoveryState(state);
      state.ui.activeWorkspace=next;
      state.recovery.session.lastWorkspace=next;
      state.playback.mode=next==="timeline"?"sequence":next==="viewport"?"viewport":"shot";
      state.playback.playing=false;
    },{persist:true,broadcast:true});
    return next;
  });

  bus.register("world.setRecipe",({recipe})=>{
    if(!["grey-limbo","white-limbo","black-limbo","void"].includes(recipe))return false;
    return store.commit("World recipe",state=>{initializeRecoveryState(state);state.recovery.world.recipe=recipe;state.recovery.world.calibratedAt=now();});
  });
  bus.register("world.setSafeFrame",({value})=>store.transient("World safe frame",state=>{initializeRecoveryState(state);state.recovery.world.safeFrame=Boolean(value);},{persist:true,broadcast:true}));
  bus.register("world.setShadowSoftness",({value})=>store.transient("World shadow softness",state=>{initializeRecoveryState(state);state.recovery.world.shadowSoftness=Math.max(0,Math.min(100,Number(value)||0));},{persist:true,broadcast:true}));
  bus.register("world.markGrounded",()=>store.transient("World grounded",state=>{initializeRecoveryState(state);state.recovery.world.ground=true;state.recovery.world.calibratedAt=now();},{persist:true,broadcast:true}));
  bus.register("world.recoverVisualTruth",({nodeId="hero-proxy",transform,assetId}={})=>store.transient("Recover visual truth",state=>{
    initializeRecoveryState(state);const node=state.scene?.nodes?.[nodeId];
    if(node&&transform){const current=node.baseTransform||{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};node.baseTransform={
      position:Array.isArray(transform.position)?transform.position.slice(0,3).map(Number):[...(current.position||[0,0,0])],
      rotation:Array.isArray(transform.rotation)?transform.rotation.slice(0,3).map(Number):[...(current.rotation||[0,0,0])],
      scale:Array.isArray(transform.scale)?transform.scale.slice(0,3).map(Number):[...(current.scale||[1,1,1])]
    };}
    state.recovery.world.ground=true;state.recovery.world.calibratedAt=now();state.recovery.session.visualTruthVersion=1;state.recovery.session.visualTruthAssetId=assetId||state.assets?.heroId||null;state.recovery.session.visualTruthAt=now();
  },{persist:true,broadcast:false}));

  bus.register("candidate.setTarget",({value})=>store.transient("Target Delta",state=>{
    initializeRecoveryState(state);const shot=state.shots?.byId?.[state.shots.activeShotId];if(!shot)return;shot.deltaTarget=Math.max(.05,Math.min(.95,Number(value)>1?Number(value)/100:Number(value)||.42));
  },{persist:true,broadcast:true}));

  bus.register("candidate.setReview",({review})=>store.transient("Review candidate",state=>{
    initializeRecoveryState(state);const record=ensureCandidateRecord(state);if(review==="candidate"&&!record.candidate)return;if(review==="previous"&&!record.previous)return;record.review=["current","candidate","previous"].includes(review)?review:"current";
  },{persist:true,broadcast:false}));

  bus.register("candidate.generate",({seed,target}={})=>{
    const source=store.get(),shot=source.shots?.byId?.[source.shots.activeShotId];if(!shot)throw new Error("No active shot.");
    const record=ensureCandidateRecord(source),requestedSeed=normalizeSeed(seed??record.baseSeed??shot.seed),requestedTarget=Math.max(5,Math.min(95,Number(target) || Math.round((shot.deltaTarget??.42)*100)));
    const generated=generateCandidateFromState(source,{seed:requestedSeed,target:requestedTarget});
    store.transient("Generate candidate",state=>{
      initializeRecoveryState(state);const next=ensureCandidateRecord(state,shot.id);next.candidate=clone(generated.shot);next.review="candidate";next.baseSeed=requestedSeed;next.generatedAt=now();next.meta={
        seed:generated.resolvedSeed,requestedSeed:generated.requestedSeed,target:generated.target,profile:generated.profile,passes:generated.passes,
        score:generated.comparison.score,changedCategories:[...generated.comparison.changedCategories],lockedCategories:[...generated.comparison.lockedCategories],
        fingerprint:generated.fingerprint,distance:generated.distance
      };
    },{persist:true,broadcast:true});
    toast(`CANDIDATE · ${generated.comparison.score} Δ`);
    return generated;
  });

  bus.register("candidate.regenerate",({target}={})=>{
    const state=store.get(),record=ensureCandidateRecord(state),seed=normalizeSeed((record.meta?.seed??record.baseSeed??43001)+104729);
    return bus.dispatch("candidate.generate",{seed,target});
  });

  bus.register("candidate.discard",()=>store.transient("Discard candidate",state=>{
    initializeRecoveryState(state);const record=ensureCandidateRecord(state);record.candidate=null;record.review="current";record.meta=null;record.generatedAt=null;
  },{persist:true,broadcast:true}));

  bus.register("candidate.accept",()=>{
    const state=store.get(),shotId=state.shots?.activeShotId,record=ensureCandidateRecord(state,shotId);if(!record.candidate)return false;
    const accepted=clone(record.candidate),previous=clone(state.shots.byId[shotId]),variant=Math.max((previous.variant||1)+1,accepted.variant||1);
    accepted.id=shotId;accepted.variant=variant;accepted.name=String(previous.name||"Shot").replace(/ · [CV]\d+$/,'')+` · V${String(variant).padStart(2,"0")}`;accepted.updatedAt=now();
    store.commit("Accept candidate",draft=>{
      initializeRecoveryState(draft);draft.shots.byId[shotId]=accepted;const next=ensureCandidateRecord(draft,shotId);next.previous=previous;next.candidate=null;next.review="current";next.acceptedAt=now();next.meta={...(record.meta||{}),accepted:true};
    });
    toast("CANDIDATE ACCEPTED");
    return true;
  });

  bus.register("timeline.openSelectedInRender",()=>{
    const state=store.get(),clip=state.timeline?.clips?.[state.timeline.selectedClipId];
    store.transient("Open timeline shot",draft=>{
      initializeRecoveryState(draft);if(clip?.shotId&&draft.shots.byId[clip.shotId])draft.shots.activeShotId=clip.shotId;draft.ui.activeWorkspace="render";draft.recovery.session.lastWorkspace="render";draft.playback.mode="shot";draft.playback.playing=false;
    },{persist:true,broadcast:true});
  });
}
