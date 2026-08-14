/* ============================================================================
   MEMENTO VISUALREF V47A · DELTA + LIMBO FOUNDATION
   The V45 renderer/store remain authoritative. This controller introduces:
   - candidate-based generation with explicit target and actual Delta;
   - persistent Current / Previous / Candidate review;
   - a procedural Grey / White / Black cyclorama shared by all workspaces;
   - a V36C-inspired, image-first control hierarchy.
   ========================================================================== */

import {compareShots,evaluateShotSnapshot,generateCandidate,normalizeSeed,CREATIVE_CATEGORY} from "./delta-engine.js";

const VERSION="47A";
const WORLD_RECIPES={
  "grey-limbo":{label:"GREY",color:0x5f6065,background:0x34353a,roughness:.88,metalness:.015,exposure:1.02,key:1.02,rim:1,fill:.82,ambient:.82},
  "white-limbo":{label:"WHITE",color:0xd5d5d1,background:0xb8b8b5,roughness:.92,metalness:0,exposure:.78,key:.74,rim:.72,fill:.62,ambient:.58},
  "black-limbo":{label:"BLACK",color:0x070708,background:0x020203,roughness:.82,metalness:.04,exposure:1.16,key:1.14,rim:1.28,fill:.5,ambient:.34},
  void:{label:"VOID",color:0x020203,background:0x020203,roughness:1,metalness:0,exposure:1,key:1,rim:1,fill:1,ambient:1}
};
const GROUPS=[
  {id:"subject",label:"SUBJECT",macro:"subject",axes:["subject-presence","subject-size","subject-rotation"]},
  {id:"camera",label:"CAMERA",macro:"camera",axes:["camera"]},
  {id:"composition",label:"COMPOSITION",macro:"composition",axes:["view","composition"]},
  {id:"lens",label:"LENS & FOCUS",macro:"lens-focus",axes:["lens","focus"]},
  {id:"light",label:"LIGHT",macro:"light",axes:["light"]},
  {id:"environment",label:"ENVIRONMENT",macro:"environment",axes:["environment"]},
  {id:"motion",label:"MOTION",macro:"motion",axes:["motion-design"]},
  {id:"image",label:"IMAGE",macro:"image",axes:["atmosphere"]},
  {id:"timing",label:"TIMING",macro:"timing",axes:[]}
];
const ADVANCED_AXES={
  "subject-presence":[],"subject-size":["subject.scale"],"subject-rotation":["subject.rotationY"],
  camera:["camera.distance","camera.height","subject.positionX"],view:["camera.height","subject.rotationY","subject.scale"],
  composition:["subject.positionX","subject.positionY"],lens:["camera.distance"],focus:[],light:["light.key"],
  environment:["environment.depth"],"motion-design":["motion.energy","subject.positionX","subject.positionY","subject.rotationY","environment.depth"],
  atmosphere:["environment.depth","light.key"]
};
const ICON={
  select:'<svg viewBox="0 0 24 24"><path d="m5 3 13 9-6 1 3 6-3 2-3-6-4 4z"/></svg>',
  move:'<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M22 12l-3-3m3 3-3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3"/></svg>',
  rotate:'<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2 5.3M20 4v7h-7"/></svg>',
  scale:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M4 4l6 6M20 4l-6 6M20 20l-6-6M4 20l6-6"/></svg>',
  pivot:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7"/></svg>',
  frame:'<svg viewBox="0 0 24 24"><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/></svg>',
  ground:'<svg viewBox="0 0 24 24"><path d="M3 19h18M12 3v12M8 11l4 4 4-4"/></svg>',
  reset:'<svg viewBox="0 0 24 24"><path d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12 2L20 14M4 10l2.5-3a7 7 0 0 1 12 2"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><path d="M8 3v18M16 3v18M3 8h18M3 16h18"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  unlock:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2"/></svg>',
  dice:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>',
  guide:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>'
};

const copy=value=>typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
const activeShot=state=>state?.shots?.byId?.[state?.shots?.activeShotId]||null;
const esc=value=>String(value??"—").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const pretty=value=>String(value??"—").replace(/[-_]/g," ").replace(/\b\w/g,letter=>letter.toUpperCase());
const customEnvironment=state=>Boolean(state?.assets?.environmentId&&state.assets.environmentId!=="environment-proxy");

export function installV47Foundation(api){
  if(!api||globalThis.__MEMENTO_V47_INSTALLED__)return globalThis.__MEMENTO_V47__;
  globalThis.__MEMENTO_V47_INSTALLED__=true;
  const controller=new V47Foundation(api);controller.init();
  const publicApi={...api,version:VERSION,foundation:controller};
  globalThis.__MEMENTO_V47__=publicApi;
  document.dispatchEvent(new CustomEvent("memento:v47-ready",{detail:{workspace:api.workspace,version:VERSION}}));
  return publicApi;
}

class V47Foundation{
  constructor(api){
    this.api=api;this.workspace=api.workspace;this.store=api.store;this.commands=api.commands;this.player=api.player;this.shell=api.shell;
    this.state=this.store.get();this.raf=0;this.targetGesture=false;this.renderPatched=false;this.worldPatched=false;this.matrixKey="";this.consoleKey="";
  }
  init(){
    if(this.api?.polish)this.api.polish.brandV46=()=>{};
    this.migrateFoundationState();this.bind();this.patchRendererWhenReady();
    this.observerTarget=document.getElementById("app")||document.body;this.observer=new MutationObserver(()=>this.schedule());this.observe();
    this.unsubscribe=this.store.subscribe(()=>this.schedule());this.unloadHandler=()=>this.dispose();addEventListener("beforeunload",this.unloadHandler,{once:true});this.schedule();
  }
  migrateFoundationState(){
    this.store.transient("V47A foundation state",draft=>{
      const legacyRecipe={"limbo-grey":"grey-limbo","limbo-white":"white-limbo","limbo-black":"black-limbo",void:"void"}[draft.scene?.worldRecipe];
      draft.v47??={};draft.v47.version=VERSION;draft.v47.world={recipe:legacyRecipe||"grey-limbo",ground:true,shadowSoftness:58,autoFit:true,...(draft.v47.world||{})};
      draft.v47.generation??={byShot:{}};draft.v47.generation.byShot??={};draft.scene??={};
      const ownsProceduralWorld=!customEnvironment(draft);if(ownsProceduralWorld)draft.scene.showHelpers=false;
      for(const shotId of draft.shots?.order||[]){
        const shot=draft.shots.byId[shotId];draft.v47.generation.byShot[shotId]=normalizeGenerationRecord(draft.v47.generation.byShot[shotId],shot);
        if(!shot||!ownsProceduralWorld)continue;
        shot.start??={};shot.end??={};shot.start.choices??={};shot.end.choices??={};shot.creativeLocks??={};shot.locks??={};
        const environmentChoice=draft.v47.world.recipe==="void"?"void":"limbo";
        shot.start.choices.environment=environmentChoice;shot.end.choices.environment=environmentChoice;
        shot.creativeLocks.environment=true;shot.locks["environment.depth"]=true;
      }
    },{persist:true,broadcast:true});
  }
  bind(){
    document.addEventListener("click",this.clickHandler=event=>this.onClick(event),true);
    document.addEventListener("input",this.inputHandler=event=>this.onInput(event),true);
    document.addEventListener("change",this.changeHandler=event=>this.onChange(event),true);
    document.addEventListener("pointerup",this.pointerHandler=()=>this.finishTargetGesture(),true);
    document.addEventListener("pointercancel",this.cancelHandler=()=>this.finishTargetGesture(true),true);
  }
  observe(){this.observer?.observe(this.observerTarget,{childList:true,subtree:true});}
  schedule(){if(this.raf)return;this.raf=requestAnimationFrame(()=>{this.raf=0;this.observer?.disconnect();try{this.reconcile();}finally{this.observe();}});}
  reconcile(){
    this.state=this.store.get();this.ensureRecords();this.brand();document.documentElement.classList.remove("v47-preboot");
    if(this.workspace==="render")this.reconcileRender();
    if(this.workspace==="viewport")this.reconcileViewport();
    if(this.workspace==="timeline")this.reconcileTimeline();
  }
  ensureRecords(){
    const state=this.state,shot=activeShot(state);if(!shot)return;
    if(state.v47?.generation?.byShot?.[shot.id])return;
    this.store.transient("V47A shot generation state",draft=>{draft.v47??={version:VERSION,world:{recipe:"grey-limbo",ground:true,shadowSoftness:58,autoFit:true},generation:{byShot:{}}};draft.v47.generation??={byShot:{}};draft.v47.generation.byShot??={};draft.v47.generation.byShot[shot.id]=normalizeGenerationRecord(null,shot);},{persist:true,broadcast:true});
  }
  brand(){
    document.title=document.title.replace(/V4[56](?:A)?/gi,VERSION);document.body.dataset.mementoBuild="v47a";document.documentElement.dataset.mementoBuild="v47a";
    document.querySelectorAll(".release-mark").forEach(node=>node.textContent=VERSION);
    document.querySelectorAll(".project-button span").forEach(node=>{if(/^MEMENTO V4[56]/i.test(node.textContent.trim()))node.textContent=`MEMENTO ${VERSION}`;});
    document.querySelectorAll(".project-button small").forEach(node=>{if(/project|polish/i.test(node.textContent))node.textContent="DELTA · LIMBO";});
  }

  /* ---------------- Render / Delta ---------------- */
  reconcileRender(){this.ensureDeltaConsole();this.ensurePlayerDelta();this.ensureShotMatrix();this.syncDeltaUI();}
  ensureDeltaConsole(){
    const editor=document.querySelector(".v45-render-editor");if(!editor)return;
    let console=editor.querySelector(".v47-delta-console");
    if(!console){
      console=document.createElement("section");console.className="v47-delta-console";
      console.innerHTML=`
        <header><div><small>VARIANT INSTRUMENT</small><b>DELTA</b></div><span data-v47-candidate-status>CURRENT SHOT</span></header>
        <div class="v47-delta-main">
          <label class="v47-target-control"><span>TARGET Δ</span><input data-v47-target type="range" min="5" max="95" step="1"><output data-v47-target-output>42</output></label>
          <button class="v47-generate" data-v47-action="generate">${ICON.dice}<span>GENERATE CANDIDATE</span></button>
        </div>
        <nav class="v47-review-tabs" aria-label="Variant review"><button data-v47-review="current">CURRENT</button><button data-v47-review="previous">PREVIOUS</button><button data-v47-review="candidate">CANDIDATE</button></nav>
        <div class="v47-delta-readout">
          <div><span>TARGET</span><b data-v47-metric="target">42</b></div><div><span>ACTUAL</span><b data-v47-metric="actual">—</b></div>
          <div><span>SEED</span><label><input data-v47-seed type="number" min="1" step="1"><b data-v47-metric="seed">43001</b></label></div>
          <div><span>PROFILE</span><b data-v47-metric="profile">BALANCED</b></div>
        </div>
        <div class="v47-change-report"><span>CHANGED</span><div data-v47-changes><i>Generate a candidate to inspect the delta.</i></div></div>
        <div class="v47-candidate-actions"><button data-v47-action="accept">ACCEPT</button><button data-v47-action="regenerate">REGENERATE</button><button data-v47-action="discard">DISCARD</button></div>`;
      editor.prepend(console);
    }
  }
  ensurePlayerDelta(){
    const settings=document.querySelector(".transport-secondary");if(!settings)return;
    settings.querySelector(".v46-player-delta")?.setAttribute("hidden","");settings.querySelector(".variant-mode")?.setAttribute("hidden","");settings.querySelector('[data-action="generate"]')?.setAttribute("hidden","");
    let instrument=settings.querySelector(".v47-player-instrument");
    if(!instrument){
      instrument=document.createElement("div");instrument.className="v47-player-instrument";
      instrument.innerHTML=`<label><span>DELTA</span><input data-v47-target type="range" min="5" max="95" step="1"><output data-v47-target-output>42</output></label><button data-v47-action="generate">${ICON.dice}<span>CANDIDATE</span></button>`;
      settings.prepend(instrument);
    }
  }
  ensureShotMatrix(){
    const editor=document.querySelector(".v45-render-editor"),anchor=editor?.querySelector(".v47-delta-console");if(!editor||!anchor)return;
    let matrix=editor.querySelector(".v47-shot-matrix");
    if(!matrix){matrix=document.createElement("section");matrix.className="v47-shot-matrix";matrix.innerHTML='<header><span>SHOT STATE</span><small>START → END</small></header><div data-v47-matrix></div>';anchor.after(matrix);}
    editor.querySelector(".v46-axis-overview")?.setAttribute("hidden","");
    const shot=activeShot(this.state);if(!shot)return;
    const key=JSON.stringify({s:shot.start?.choices,e:shot.end?.choices,l:shot.creativeLocks,d:shot.durationFrames,t:shot.deltaTarget});if(key===this.matrixKey)return;this.matrixKey=key;
    matrix.querySelector("[data-v47-matrix]").innerHTML=GROUPS.map(group=>{
      const start=group.id==="timing"?`${shot.durationFrames} FRAMES`:group.axes.map(axis=>pretty(shot.start?.choices?.[axis])).join(" · ");
      const end=group.id==="timing"?`${Math.round((shot.deltaTarget??.42)*100)} Δ`:group.axes.map(axis=>pretty(shot.end?.choices?.[axis])).join(" · ");
      const locked=group.axes.length&&group.axes.every(axis=>shot.creativeLocks?.[axis]);
      return `<article data-v47-matrix-row="${group.id}"><button class="v47-matrix-open" data-v47-open-macro="${group.macro}" data-v47-open-axis="${group.axes[0]||"timing"}"><span>${group.label}</span><b>${esc(start)}</b><i>→</i><strong>${esc(end)}</strong></button>${group.axes.length?`<button class="v47-matrix-lock ${locked?"locked":""}" data-v47-lock-group="${group.id}" aria-pressed="${locked}" title="${locked?"Unlock":"Lock"} ${group.label}">${locked?ICON.lock:ICON.unlock}</button>`:""}</article>`;
    }).join("");
  }
  syncDeltaUI(){
    const state=this.state,shot=activeShot(state);if(!shot)return;const record=recordFor(state,shot.id),target=Math.round((shot.deltaTarget??.42)*100),review=record.review||"current";
    document.querySelectorAll("[data-v47-target]").forEach(input=>{if(document.activeElement!==input)input.value=String(target);});
    document.querySelectorAll("[data-v47-target-output]").forEach(output=>output.textContent=String(target).padStart(2,"0"));
    document.querySelectorAll("[data-v47-review]").forEach(button=>{const available=button.dataset.v47Review==="current"||Boolean(record[button.dataset.v47Review]);button.disabled=!available;button.classList.toggle("active",button.dataset.v47Review===review);button.setAttribute("aria-pressed",String(button.dataset.v47Review===review));});
    const selectedMeta=review==="candidate"?record.candidateMeta:review==="previous"?record.previousMeta:null,hasCandidate=Boolean(record.candidate);
    setText('[data-v47-metric="target"]',selectedMeta?.target??target);setText('[data-v47-metric="actual"]',selectedMeta?String(selectedMeta.actual).padStart(2,"0"):"—");
    setText('[data-v47-metric="seed"]',selectedMeta?.resolvedSeed??record.baseSeed??shot.seed);setText('[data-v47-metric="profile"]',(selectedMeta?.profile||profileForTarget(target)).toUpperCase());
    const seedInput=document.querySelector("[data-v47-seed]");if(seedInput&&document.activeElement!==seedInput)seedInput.value=String(record.baseSeed??shot.seed??43001);
    const status=document.querySelector("[data-v47-candidate-status]");if(status)status.textContent=review==="candidate"?"REVIEWING CANDIDATE":review==="previous"?"REVIEWING PREVIOUS":"CURRENT SHOT";
    const changes=document.querySelector("[data-v47-changes]");if(changes){const items=selectedMeta?.changedCategories||[];changes.innerHTML=items.length?items.map(item=>`<b>${esc(item)}</b>`).join(""):'<i>Generate a candidate to inspect the delta.</i>';}
    document.querySelectorAll(".v47-candidate-actions button").forEach(button=>button.disabled=!hasCandidate);
    document.body.dataset.v47ReviewState=review;
    const stageMode=document.querySelector('[data-role="stage-mode"]');if(stageMode&&(this.workspace==="render"||this.workspace==="timeline"))stageMode.textContent=review==="candidate"?"CANDIDATE":review==="previous"?"PREVIOUS":"CURRENT";
  }
  generate({regenerate=false}={}){
    const state=this.store.get(),shot=activeShot(state);if(!shot)return;const record=recordFor(state,shot.id),target=Math.round((shot.deltaTarget??.42)*100),seed=normalizeSeed((record.baseSeed??shot.seed??43001)+(regenerate?1:0));
    let result;try{result=generateCandidate(this.api,{seed,target});}catch(error){console.error(error);this.shell?.toast?.("CANDIDATE GENERATION FAILED");return;}
    this.store.transient("V47A candidate",draft=>{const active=activeShot(draft),entry=ensureRecord(draft,active.id);if(entry.candidate){entry.previous=entry.candidate;entry.previousMeta=entry.candidateMeta;}entry.candidate=copy(result.shot);entry.candidateMeta={target:result.target,actual:result.comparison.score,requestedSeed:seed,resolvedSeed:result.resolvedSeed,profile:result.profile,passes:result.passes,changedCategories:result.comparison.changedCategories,lockedCategories:result.comparison.lockedCategories,fingerprint:result.fingerprint,createdAt:new Date().toISOString()};entry.baseSeed=seed;entry.review="candidate";},{persist:true,broadcast:true});
    this.shell?.toast?.(`CANDIDATE · TARGET ${target} · ACTUAL ${result.comparison.score}`);
  }
  acceptCandidate(){
    const state=this.store.get(),shot=activeShot(state),record=shot&&recordFor(state,shot.id);if(!shot||!record?.candidate)return;
    this.store.commit("Accept V47 candidate",draft=>{const current=activeShot(draft),entry=ensureRecord(draft,current.id),accepted=copy(entry.candidate);entry.previous=copy(current);entry.previousMeta={target:Math.round((current.deltaTarget??.42)*100),actual:0,resolvedSeed:current.seed,profile:current.variantMode||"balanced",changedCategories:[],acceptedSource:true,createdAt:new Date().toISOString()};accepted.id=current.id;accepted.variant=Math.max((current.variant||1)+1,accepted.variant||1);accepted.name=String(accepted.name||current.name).replace(/ · C(\d+)$/," · V$1");accepted.updatedAt=new Date().toISOString();draft.shots.byId[current.id]=accepted;entry.candidate=null;entry.candidateMeta=null;entry.review="current";entry.baseSeed=accepted.seed||entry.baseSeed;draft.playback.frame=0;draft.playback.playing=true;draft.playback.lastTick=performance.now();});
    this.shell?.toast?.("CANDIDATE ACCEPTED · ONE UNDO STEP");
  }
  discardCandidate(){
    const shot=activeShot(this.store.get());if(!shot)return;this.store.transient("Discard V47 candidate",draft=>{const entry=ensureRecord(draft,shot.id);entry.candidate=null;entry.candidateMeta=null;entry.review="current";},{persist:true,broadcast:true});this.shell?.toast?.("CANDIDATE DISCARDED");
  }
  setReview(review){const shot=activeShot(this.store.get());if(!shot)return;this.store.transient("Review V47 state",draft=>{const entry=ensureRecord(draft,shot.id);if(review==="current"||entry[review])entry.review=review;},{persist:true,broadcast:true});}
  toggleGroupLock(groupId){
    const group=GROUPS.find(item=>item.id===groupId),shot=activeShot(this.store.get());if(!group||!shot||!group.axes.length)return;const lock=!group.axes.every(axis=>shot.creativeLocks?.[axis]);
    this.store.commit(`${lock?"Lock":"Unlock"} ${group.label}`,draft=>{const current=activeShot(draft);current.creativeLocks??={};current.locks??={};for(const axis of group.axes)current.creativeLocks[axis]=lock;for(const key of Object.keys(current.locks))current.locks[key]=false;for(const [axisId,enabled] of Object.entries(current.creativeLocks))if(enabled)for(const numeric of ADVANCED_AXES[axisId]||[])current.locks[numeric]=true;current.updatedAt=new Date().toISOString();});
  }

  /* ---------------- Viewport / World ---------------- */
  reconcileViewport(){this.ensureWorldPanel();this.upgradeViewportDock();this.ensurePropertySearch();this.syncWorldUI();}
  ensureWorldPanel(){
    const inspector=document.querySelector(".v45-viewport .v45-inspector,[data-workspace='viewport'] .v45-inspector");if(!inspector)return;
    let panel=inspector.querySelector(".v47-world-panel");
    if(!panel){panel=document.createElement("section");panel.className="section v46-world-section v47-world-panel";panel.innerHTML=`
      <header class="section-header"><span>WORLD RECIPE</span><small data-v47-world-status>PROCEDURAL STAGE</small></header>
      <div class="v47-world-presets"><button data-v47-world="grey-limbo">GREY</button><button data-v47-world="white-limbo">WHITE</button><button data-v47-world="black-limbo">BLACK</button><button data-v47-world="void">VOID</button></div>
      <div class="v47-world-controls"><label><span>GROUND CONTACT</span><input data-v47-ground type="checkbox"></label><label><span>SHADOW SOFTNESS</span><input data-v47-shadow type="range" min="0" max="100" step="1"><output data-v47-shadow-output>58</output></label></div>
      <p>A seamless procedural cyclorama shared by Viewport, Render and Timeline. HDRI light remains independent from background visibility.</p>`;inspector.prepend(panel);}
  }
  upgradeViewportDock(){
    const hud=document.querySelector(".v46-maya-hud");if(!hud||hud.dataset.v47Upgraded)return;hud.dataset.v47Upgraded="true";
    hud.innerHTML=`<nav aria-label="Viewport player dock">
      <button data-v46-tool="select" title="Select · Q">${ICON.select}<span>SELECT</span></button><button data-v46-tool="translate" title="Move · W">${ICON.move}<span>MOVE</span></button><button data-v46-tool="rotate" title="Rotate · E">${ICON.rotate}<span>ROTATE</span></button><button data-v46-tool="scale" title="Scale · R">${ICON.scale}<span>SCALE</span></button><button data-v46-tool="pivot" title="Pivot · P">${ICON.pivot}<span>PIVOT</span></button><i></i>
      <button data-v47-viewport="space" title="World / Local">${ICON.grid}<span data-v47-space>WORLD</span></button><button data-v47-viewport="snap" title="Snap">${ICON.ground}<span>SNAP</span></button><button data-v46-viewport-action="frame" title="Frame · F">${ICON.frame}<span>FRAME</span></button><button data-v47-viewport="ground" title="Ground · G">${ICON.ground}<span>GROUND</span></button><button data-v47-viewport="reset" title="Reset">${ICON.reset}<span>RESET</span></button><button data-v47-viewport="helpers" title="Helpers">${ICON.grid}<span>HELPERS</span></button><button data-v46-guide-toggle title="Guide">${ICON.guide}<span>GUIDE</span></button>
    </nav><div class="v46-maya-readout"><span data-v46-camera-label>PERSPECTIVE</span><b data-v46-selected-label>WORLD</b><em data-v46-space-label>WORLD</em></div>`;
  }
  ensurePropertySearch(){
    const inspector=document.querySelector(".v45-viewport .v45-inspector");if(!inspector||inspector.querySelector(".v47-property-search"))return;
    const search=document.createElement("label");search.className="v47-property-search";search.innerHTML='<span>⌕</span><input type="search" data-v47-property-search placeholder="Search properties…" autocomplete="off">';
    const header=inspector.querySelector(":scope>header");header?.after(search);
  }
  syncWorldUI(){
    const world=this.state.v47?.world||{},isCustom=customEnvironment(this.state);document.querySelectorAll("[data-v47-world]").forEach(button=>{button.classList.toggle("active",button.dataset.v47World===world.recipe);button.disabled=isCustom;});
    const ground=document.querySelector("[data-v47-ground]");if(ground)ground.checked=world.ground!==false;const shadow=document.querySelector("[data-v47-shadow]");if(shadow&&document.activeElement!==shadow)shadow.value=String(world.shadowSoftness??58);setText("[data-v47-shadow-output]",world.shadowSoftness??58);
    setText("[data-v47-world-status]",isCustom?"CUSTOM ENVIRONMENT ACTIVE":WORLD_RECIPES[world.recipe]?.label+" LIMBO");
    const space=document.querySelector("[data-v47-space]");if(space)space.textContent=(this.state.ui?.viewportSpace||"world").toUpperCase();
    document.querySelectorAll('[data-v47-viewport="snap"]').forEach(button=>button.classList.toggle("active",Boolean(this.state.ui?.viewportSnapEnabled)));
    document.querySelectorAll('[data-v47-viewport="helpers"]').forEach(button=>button.classList.toggle("active",this.state.scene?.showHelpers!==false));
  }
  setWorldRecipe(recipe){
    if(!WORLD_RECIPES[recipe]||customEnvironment(this.store.get()))return;
    this.store.commit(`World recipe · ${WORLD_RECIPES[recipe].label}`,draft=>{
      draft.v47.world.recipe=recipe;const environmentChoice=recipe==="void"?"void":"limbo";
      for(const shot of Object.values(draft.shots?.byId||{})){
        shot.start??={};shot.end??={};shot.start.choices??={};shot.end.choices??={};shot.creativeLocks??={};shot.locks??={};
        shot.start.choices.environment=environmentChoice;shot.end.choices.environment=environmentChoice;
        shot.creativeLocks.environment=true;shot.locks["environment.depth"]=true;
      }
    });
  }
  handleViewportAction(action){
    const state=this.store.get(),nodeId=state.ui?.selectedNodeId;
    if(action==="space")this.commands.dispatch("ui.setViewportSpace",{space:state.ui.viewportSpace==="local"?"world":"local"});
    if(action==="snap")this.commands.dispatch("ui.setViewportSnap",{enabled:!state.ui.viewportSnapEnabled});
    if(action==="helpers")this.commands.dispatch("scene.toggleHelpers");
    if(action==="ground"){const transform=this.player?.renderer?.getGroundedTransform?.(nodeId,state);if(transform)this.commands.dispatch("scene.groundNode",{nodeId,transform});}
    if(action==="reset")this.commands.dispatch("scene.resetNodeTransform",{nodeId});
  }
  filterProperties(query){const inspector=document.querySelector(".v45-viewport .v45-inspector");if(!inspector)return;const term=String(query||"").trim().toLowerCase();inspector.querySelectorAll(":scope>.section,[data-role='inspector']>.section").forEach(section=>{if(section.classList.contains("v47-world-panel")){section.hidden=false;return;}section.hidden=Boolean(term&&!section.textContent.toLowerCase().includes(term));});}

  /* ---------------- Timeline ---------------- */
  reconcileTimeline(){
    const bar=document.querySelector(".v46-timeline-createbar");if(!bar)return;
    this.ensureTimelineInstrument(bar);this.syncDeltaUI();
    const shot=activeShot(this.state),record=shot&&recordFor(this.state,shot.id),badge=bar.querySelector(".v47-timeline-delta");
    if(badge)badge.textContent=record?.candidate?`CANDIDATE ${record.candidateMeta?.actual??0} Δ READY`:`TARGET ${Math.round((shot?.deltaTarget??.42)*100)} Δ`;
    bar.classList.toggle("v47-has-candidate",Boolean(record?.candidate));
  }
  ensureTimelineInstrument(bar){
    const legacyProfile=bar.querySelector("[data-v46-timeline-variant]")?.closest("label");if(legacyProfile)legacyProfile.hidden=true;
    const variant=bar.querySelector('[data-v46-timeline-action="variant"],[data-v47-action="generate"]');
    if(variant){variant.removeAttribute("data-v46-timeline-action");variant.dataset.v47Action="generate";const title=variant.querySelector("b"),copyNode=variant.querySelector("small");if(title)title.textContent="GENERATE CANDIDATE";if(copyNode)copyNode.textContent="CURRENT SHOT STAYS SAFE";}
    const add=bar.querySelector('[data-v46-timeline-action="add"]');if(add){const title=add.querySelector("b"),copyNode=add.querySelector("small");if(title)title.textContent="ADD CURRENT SHOT";if(copyNode)copyNode.textContent="ACCEPT CANDIDATE FIRST";}
    if(bar.querySelector(".v47-timeline-instrument"))return;
    const instrument=document.createElement("section");instrument.className="v47-timeline-instrument";
    instrument.innerHTML=`<label><span>TARGET Δ</span><input data-v47-target type="range" min="5" max="95" step="1"><output data-v47-target-output>42</output></label><span class="v47-timeline-delta">TARGET 42 Δ</span><nav class="v47-review-tabs v47-timeline-review" aria-label="Timeline candidate review"><button data-v47-review="current">CURRENT</button><button data-v47-review="candidate">CANDIDATE</button></nav><div class="v47-candidate-actions v47-timeline-review-actions"><button data-v47-action="accept">ACCEPT</button><button data-v47-action="discard">DISCARD</button></div>`;
    const audio=bar.querySelector('[data-v46-timeline-action="audio"]');if(audio)audio.before(instrument);else bar.append(instrument);
  }

  /* ---------------- Events ---------------- */
  onClick(event){
    const action=event.target.closest("[data-v47-action]")?.dataset.v47Action;
    if(action){event.preventDefault();event.stopPropagation();if(action==="generate")this.generate();if(action==="regenerate")this.generate({regenerate:true});if(action==="accept")this.acceptCandidate();if(action==="discard")this.discardCandidate();return;}
    const review=event.target.closest("[data-v47-review]")?.dataset.v47Review;if(review){event.preventDefault();event.stopPropagation();this.setReview(review);return;}
    const recipe=event.target.closest("[data-v47-world]")?.dataset.v47World;if(recipe){event.preventDefault();event.stopPropagation();this.setWorldRecipe(recipe);return;}
    const lock=event.target.closest("[data-v47-lock-group]")?.dataset.v47LockGroup;if(lock){event.preventDefault();event.stopPropagation();this.toggleGroupLock(lock);return;}
    const macro=event.target.closest("[data-v47-open-macro]");if(macro){event.preventDefault();event.stopPropagation();this.commands.dispatch("ui.setMacro",{macroId:macro.dataset.v47OpenMacro});if(macro.dataset.v47OpenAxis!=="timing")this.commands.dispatch("ui.selectCreativeAxis",{axisId:macro.dataset.v47OpenAxis});document.querySelector(`[data-macro-section="${macro.dataset.v47OpenMacro}"]`)?.scrollIntoView({block:"nearest",behavior:"smooth"});return;}
    const viewport=event.target.closest("[data-v47-viewport]")?.dataset.v47Viewport;if(viewport){event.preventDefault();event.stopPropagation();this.handleViewportAction(viewport);}
  }
  onInput(event){
    if(event.target.matches("[data-v47-target]")){const value=Math.max(5,Math.min(95,Number(event.target.value)||42));document.querySelectorAll("[data-v47-target-output]").forEach(output=>output.textContent=String(value).padStart(2,"0"));if(!this.targetGesture){this.store.beginGesture("Set target Delta");this.targetGesture=true;}this.store.updateGesture("Set target Delta",draft=>{const shot=activeShot(draft);if(shot)shot.deltaTarget=value/100;});return;}
    if(event.target.matches("[data-v47-shadow]")){const value=Math.max(0,Math.min(100,Number(event.target.value)||0));setText("[data-v47-shadow-output]",value);this.store.transient("Shadow softness",draft=>draft.v47.world.shadowSoftness=value,{persist:true,broadcast:true});return;}
    if(event.target.matches("[data-v47-property-search]"))this.filterProperties(event.target.value);
  }
  onChange(event){
    if(event.target.matches("[data-v47-target]")){this.finishTargetGesture();return;}
    if(event.target.matches("[data-v47-seed]")){const value=normalizeSeed(event.target.value);const shot=activeShot(this.store.get());if(shot)this.store.transient("Candidate seed",draft=>ensureRecord(draft,shot.id).baseSeed=value,{persist:true,broadcast:true});return;}
    if(event.target.matches("[data-v47-ground]")){const checked=event.target.checked;this.store.commit("Ground contact",draft=>draft.v47.world.ground=checked);}
  }
  finishTargetGesture(cancel=false){if(!this.targetGesture)return;this.targetGesture=false;if(cancel)this.store.cancelGesture();else this.store.endGesture();}

  /* ---------------- Renderer integration ---------------- */
  patchRendererWhenReady(){
    const renderer=this.player?.renderer;if(!renderer)return;Promise.resolve(renderer.ready).catch(()=>{}).finally(()=>{this.patchRenderer(renderer);this.schedule();});
  }
  patchRenderer(renderer){if(!renderer||renderer.__v47Patched)return;renderer.__v47Patched=true;this.installCyclorama(renderer);this.patchWorld(renderer);if(this.workspace==="render"||this.workspace==="timeline")this.patchCandidatePreview(renderer);}
  installCyclorama(renderer){
    const T=renderer.T;if(!T||!renderer.scene)return;
    const groundY=Number(renderer.floor?.position?.y);const y=Number.isFinite(groundY)?groundY:-1.05;
    try{
      const width=84,frontZ=34,curveZ=-9,radius=13,wallHeight=38,segments=36,profile=[new T.Vector2(frontZ,0),new T.Vector2(curveZ,0)];
      for(let i=1;i<=segments;i++){const angle=(i/segments)*Math.PI*.5;profile.push(new T.Vector2(curveZ-radius*Math.sin(angle),radius-radius*Math.cos(angle)));}profile.push(new T.Vector2(curveZ-radius,wallHeight));
      const positions=[],indices=[];for(const point of profile)positions.push(-width/2,point.y,point.x,width/2,point.y,point.x);for(let i=0;i<profile.length-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,d,a,d,c);}
      const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const material=new T.MeshPhysicalMaterial({color:WORLD_RECIPES["grey-limbo"].color,roughness:.88,metalness:.015,side:T.FrontSide});
      const mesh=new T.Mesh(geometry,material);mesh.name="V47_PROCEDURAL_CYCLORAMA";mesh.position.y=y;mesh.receiveShadow=true;mesh.visible=false;mesh.renderOrder=-2;renderer.scene.add(mesh);renderer.v47Cyclorama=mesh;
      renderer.v47ContactShadow=createContactShadow(renderer,y);
    }catch(error){console.warn("V47 cyclorama unavailable",error);}
  }
  patchWorld(renderer){
    if(typeof renderer.applyState!=="function"||renderer.__v47WorldPatched)return;renderer.__v47WorldPatched=true;const original=renderer.applyState;
    renderer.applyState=function(frame,state,wallTime,options){const camera=original.call(this,frame,state,wallTime,options);applyWorldRecipe(this,state);return camera;};
  }
  patchCandidatePreview(renderer){
    if(renderer.__v47CandidatePatched)return;renderer.__v47CandidatePatched=true;
    if(typeof renderer.render==="function"){const original=renderer.render;renderer.render=function(frame,state,wallTime){const replacement=reviewFrame(state,frame);return original.call(this,replacement||frame,state,wallTime);};}
    if(typeof renderer.captureToCanvas==="function"){const original=renderer.captureToCanvas;renderer.captureToCanvas=function(frame,state,targetCanvas,wallTime){const replacement=reviewFrame(state,frame);return original.call(this,replacement||frame,state,targetCanvas,wallTime);};}
  }
  dispose(){
    if(this.raf)cancelAnimationFrame(this.raf);this.observer?.disconnect();this.unsubscribe?.();this.finishTargetGesture(true);
    document.removeEventListener("click",this.clickHandler,true);document.removeEventListener("input",this.inputHandler,true);document.removeEventListener("change",this.changeHandler,true);document.removeEventListener("pointerup",this.pointerHandler,true);document.removeEventListener("pointercancel",this.cancelHandler,true);
    if(this.unloadHandler)removeEventListener("beforeunload",this.unloadHandler);
  }
}

function normalizeGenerationRecord(record,shot){return {review:"current",baseSeed:normalizeSeed(shot?.seed??43001),candidate:null,candidateMeta:null,previous:null,previousMeta:null,...(record||{})};}
function ensureRecord(state,shotId){state.v47??={version:VERSION,world:{recipe:"grey-limbo",ground:true,shadowSoftness:58,autoFit:true},generation:{byShot:{}}};state.v47.generation??={byShot:{}};state.v47.generation.byShot??={};const shot=state.shots?.byId?.[shotId];return state.v47.generation.byShot[shotId]??=(normalizeGenerationRecord(null,shot));}
function recordFor(state,shotId){return state?.v47?.generation?.byShot?.[shotId]||normalizeGenerationRecord(null,state?.shots?.byId?.[shotId]);}
function setText(selector,value){document.querySelectorAll(selector).forEach(node=>node.textContent=String(value));}
function profileForTarget(target){return target<28?"near":target>68?"bold":"balanced";}
function reviewFrame(state,frame){const shot=activeShot(state);if(!shot)return null;const record=recordFor(state,shot.id),snapshot=record.review==="candidate"?record.candidate:record.review==="previous"?record.previous:null;if(!snapshot)return null;return evaluateShotSnapshot(snapshot,Number(frame?.frame)||0);}

function createContactShadow(renderer,groundY){
  const T=renderer.T;try{const canvas=document.createElement("canvas");canvas.width=canvas.height=256;const ctx=canvas.getContext("2d"),gradient=ctx.createRadialGradient(128,128,3,128,128,124);gradient.addColorStop(0,"rgba(0,0,0,.72)");gradient.addColorStop(.38,"rgba(0,0,0,.34)");gradient.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);const texture=new T.CanvasTexture(canvas),material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:.48,toneMapped:false}),mesh=new T.Mesh(new T.PlaneGeometry(1,1),material);mesh.name="V47_CONTACT_SHADOW";mesh.rotation.x=-Math.PI/2;mesh.position.y=groundY+.004;mesh.renderOrder=4;mesh.visible=false;renderer.scene.add(mesh);return mesh;}catch(error){console.warn("V47 contact shadow unavailable",error);return null;}
}
function applyWorldRecipe(renderer,state){
  const world=state?.v47?.world||{recipe:"grey-limbo",ground:true,shadowSoftness:58},recipe=WORLD_RECIPES[world.recipe]||WORLD_RECIPES["grey-limbo"],builtin=!customEnvironment(state),show=builtin&&world.recipe!=="void",T=renderer.T;
  if(renderer.floor)renderer.floor.visible=false;if(renderer.cove)renderer.cove.visible=false;if(renderer.v47Cyclorama){renderer.v47Cyclorama.visible=show;renderer.v47Cyclorama.material.color.setHex(recipe.color);renderer.v47Cyclorama.material.roughness=recipe.roughness;renderer.v47Cyclorama.material.metalness=recipe.metalness;renderer.v47Cyclorama.material.needsUpdate=true;}
  if(renderer.v47ContactShadow){renderer.v47ContactShadow.visible=show&&world.ground!==false;const softness=Math.max(0,Math.min(1,(world.shadowSoftness??58)/100));renderer.v47ContactShadow.material.opacity=.58-softness*.26;const bounds=renderer.heroGroup&&T?new T.Box3().setFromObject(renderer.heroGroup.creative||renderer.heroGroup):null,size=bounds?.getSize(new T.Vector3()),center=bounds?.getCenter(new T.Vector3());if(size&&center){renderer.v47ContactShadow.position.x=center.x;renderer.v47ContactShadow.position.z=center.z;renderer.v47ContactShadow.scale.set(Math.max(.4,size.x*(1.18+softness*1.45)),Math.max(.4,size.z*(1.18+softness*1.45)),1);}}
  if(!builtin)return;
  const hdriBackground=Boolean(renderer.hdriTexture&&state.scene?.environment?.backgroundVisible);if(!hdriBackground&&T)renderer.scene.background=new T.Color(recipe.background);if(renderer.scene.fog?.color)renderer.scene.fog.color.setHex(recipe.background);if(renderer.motes)renderer.motes.visible=false;
  if(renderer.renderer)renderer.renderer.toneMappingExposure*=recipe.exposure;if(renderer.key)renderer.key.intensity*=recipe.key;if(renderer.rim)renderer.rim.intensity*=recipe.rim;if(renderer.fill)renderer.fill.intensity*=recipe.fill;if(renderer.ambient)renderer.ambient.intensity*=recipe.ambient;
}
