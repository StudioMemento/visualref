import {candidateRecord} from "./commands.js";

const ICON={
  import:'<svg viewBox="0 0 24 24"><path d="M12 16V4M8 8l4-4 4 4M4 16v3h16v-3"/></svg>',
  ground:'<svg viewBox="0 0 24 24"><path d="M3 19h18M12 3v12M8 11l4 4 4-4"/></svg>',
  frame:'<svg viewBox="0 0 24 24"><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/></svg>',
  dice:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  add:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  open:'<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6H5V6h6"/></svg>',
  export:'<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M4 19h16"/></svg>'
};
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const activeShot=state=>state.shots?.byId?.[state.shots.activeShotId];

export class RecoveryPanels{
  constructor({slot,store,commands,shell,player,nativeRoots,toast=()=>{}}){
    this.slot=slot;this.store=store;this.commands=commands;this.shell=shell;this.player=player;this.nativeRoots=nativeRoots;this.toast=toast;this.workspace=store.get().ui.activeWorkspace||"viewport";this.bind();this.unsubscribe=store.subscribe((state,meta)=>{if(meta?.label==="Playback tick"||meta?.type==="gesture")return;this.workspace=state.ui.activeWorkspace||this.workspace;this.render(state);});this.render(store.get());
  }
  bind(){
    this.slot.addEventListener("click",event=>this.handleClick(event));
    this.slot.addEventListener("input",event=>this.handleInput(event));
    this.slot.addEventListener("change",event=>this.handleChange(event));
  }
  setWorkspace(workspace){this.workspace=workspace;this.render(this.store.get());}
  handleClick(event){
    const action=event.target.closest("[data-recovery-action]")?.dataset.recoveryAction;if(action){this.runAction(action,event.target.closest("[data-recovery-action]"));return;}
    const recipe=event.target.closest("[data-recipe]")?.dataset.recipe;if(recipe)this.commands.dispatch("world.setRecipe",{recipe});
    const review=event.target.closest("[data-review]")?.dataset.review;if(review)this.commands.dispatch("candidate.setReview",{review});
  }
  handleInput(event){
    if(event.target.matches('[data-delta-target]'))this.commands.dispatch("candidate.setTarget",{value:Number(event.target.value)});
    if(event.target.matches('[data-shadow-softness]'))this.commands.dispatch("world.setShadowSoftness",{value:Number(event.target.value)});
  }
  handleChange(event){if(event.target.matches('[data-safe-frame]'))this.commands.dispatch("world.setSafeFrame",{value:event.target.checked});}
  runAction(action,button){
    const state=this.store.get();
    if(action==="import-hero"){
      const input=this.nativeRoots.viewport?.querySelector('[data-file="hero"]')||this.nativeRoots.viewport?.querySelector('input[type="file"]');if(input)input.click();else this.toast("OPEN VIEWPORT IMPORT");
    }else if(action==="ground")this.player.groundSelected();
    else if(action==="frame")this.player.renderer?.frameNode?.(state.ui.selectedNodeId,false);
    else if(action==="scale"){this.commands.dispatch("ui.setViewportEditMode",{mode:"calibrate"});this.commands.dispatch("ui.setViewportTool",{tool:"scale"});}
    else if(action==="orient"){this.commands.dispatch("ui.setViewportEditMode",{mode:"calibrate"});this.commands.dispatch("ui.setViewportTool",{tool:"rotate"});}
    else if(action==="generate"){
      const seed=Number(this.slot.querySelector('[data-candidate-seed]')?.value)||undefined;this.commands.dispatch("candidate.generate",{seed});
    }else if(action==="regenerate")this.commands.dispatch("candidate.regenerate",{});
    else if(action==="accept")this.commands.dispatch("candidate.accept");
    else if(action==="discard")this.commands.dispatch("candidate.discard");
    else if(action==="add-shot")this.commands.dispatch("shot.addToTimeline",{trackId:"v1"});
    else if(action==="open-render")this.commands.dispatch("timeline.openSelectedInRender");
    else if(action==="playblast")this.player.exportPlayblast().then(()=>this.toast("PLAYBLAST EXPORTED")).catch(error=>this.toast(`PLAYBLAST · ${error.message}`));
    else if(action==="viewport")this.commands.dispatch("recovery.setWorkspace",{workspace:"viewport"});
    else if(action==="render")this.commands.dispatch("recovery.setWorkspace",{workspace:"render"});
  }
  render(state){
    if(this.workspace==="viewport")this.slot.innerHTML=this.worldMarkup(state);
    else if(this.workspace==="render")this.slot.innerHTML=this.candidateMarkup(state);
    else this.slot.innerHTML=this.timelineMarkup(state);
  }
  worldMarkup(state){
    const hero=state.assets?.byId?.[state.assets.heroId],node=state.scene?.nodes?.["hero-proxy"],imported=state.assets.heroId!=="hero-proxy",world=state.recovery?.world||{},steps=[
      ["01","IMPORT",imported],["02","GROUND",world.ground!==false],["03","SCALE",Boolean(node?.correction?.referenceDimension)||imported],["04","ORIENT",imported],["05","WORLD",Boolean(world.recipe)]
    ];
    return `<section class="vr-recovery-panel" aria-label="World recovery">
      <div class="vr-panel-head"><span>WORLD RECIPE</span><b>${escapeHtml(hero?.name||"CALIBRATED HERO")}</b><em>${String(world.recipe||"grey-limbo").replace(/-/g," ").toUpperCase()}</em></div>
      <div class="vr-step-rail">${steps.map(([number,label,complete],index)=>`<button class="vr-step ${complete?"complete":""} ${!complete&&steps.slice(0,index).every(item=>item[2])?"active":""}" type="button" data-recovery-action="${["import-hero","ground","scale","orient","frame"][index]}"><i>${complete?"✓":number}</i><b>${label}</b></button>`).join("")}</div>
      <div class="vr-recipe-rail">${["grey-limbo","white-limbo","black-limbo","void"].map(recipe=>`<button class="vr-recipe ${world.recipe===recipe?"active":""}" data-recipe="${recipe}" type="button"><i></i><b>${recipe.replace(/-/g," ").toUpperCase()}</b></button>`).join("")}</div>
      <div class="vr-inline-actions"><button class="vr-compact-action primary" data-recovery-action="import-hero">${ICON.import}IMPORT / REPLACE HERO</button><button class="vr-compact-action" data-recovery-action="ground">${ICON.ground}GROUND</button><button class="vr-compact-action" data-recovery-action="frame">${ICON.frame}FRAME HERO</button></div>
      <details class="vr-advanced"><summary>CALIBRATION SAFETY</summary><div class="vr-advanced-body"><label class="vr-check"><input data-safe-frame type="checkbox" ${world.safeFrame!==false?"checked":""}> Camera safety frame</label><label class="vr-field"><span>CONTACT SOFTNESS · ${Math.round(world.shadowSoftness??58)}%</span><input data-shadow-softness type="range" min="0" max="100" value="${Math.round(world.shadowSoftness??58)}"></label></div></details>
    </section>`;
  }
  candidateMarkup(state){
    const shot=activeShot(state),record=shot?candidateRecord(state,shot.id):null,target=Math.round((shot?.deltaTarget??.42)*100),meta=record?.meta||{},hasCandidate=Boolean(record?.candidate),hasPrevious=Boolean(record?.previous),categories=meta.changedCategories||[];
    return `<section class="vr-recovery-panel" aria-label="Candidate Delta">
      <div class="vr-panel-head"><span>DELTA GRAMMAR</span><b>${escapeHtml(shot?.name||"NO SHOT")}</b><em>CURRENT SAFE</em></div>
      <div class="vr-candidate-top"><label class="vr-delta-control"><span class="vr-delta-label"><span>TARGET Δ</span><b>${String(target).padStart(2,"0")}</b><small>/ 95</small></span><input data-delta-target type="range" min="5" max="95" step="1" value="${target}"></label><button class="vr-compact-action primary" data-recovery-action="generate">${ICON.dice}GENERATE</button></div>
      <div class="vr-review-tabs"><button data-review="current" class="${record?.review==="current"?"active":""}">CURRENT</button><button data-review="candidate" class="${record?.review==="candidate"?"active":""}" ${hasCandidate?"":"disabled"}>CANDIDATE</button><button data-review="previous" class="${record?.review==="previous"?"active":""}" ${hasPrevious?"":"disabled"}>PREVIOUS</button></div>
      <div class="vr-candidate-status"><div class="vr-metric"><span>TARGET</span><b>${target} Δ</b></div><div class="vr-metric accent"><span>MEASURED</span><b>${hasCandidate?`${meta.score??0} Δ`:"—"}</b></div><div class="vr-metric"><span>PROFILE</span><b>${hasCandidate?String(meta.profile||"balanced").toUpperCase():"READY"}</b></div></div>
      <div class="vr-category-chips">${categories.length?categories.map(category=>`<span class="vr-category-chip changed">${escapeHtml(category)}</span>`).join(""):'<span class="vr-category-chip">NO CANDIDATE YET</span>'}</div>
      <div class="vr-inline-actions"><button class="vr-compact-action primary" data-recovery-action="accept" ${hasCandidate?"":"disabled"}>${ICON.check}ACCEPT</button><button class="vr-compact-action" data-recovery-action="regenerate" ${hasCandidate?"":"disabled"}>${ICON.dice}REGENERATE</button><button class="vr-compact-action danger" data-recovery-action="discard" ${hasCandidate?"":"disabled"}>${ICON.close}DISCARD</button><button class="vr-compact-action" data-recovery-action="add-shot">${ICON.add}ADD / UPDATE TIMELINE</button></div>
      <details class="vr-advanced"><summary>GENERATION REPORT</summary><div class="vr-advanced-body"><label class="vr-field"><span>BASE SEED</span><input data-candidate-seed type="number" min="1" step="1" value="${record?.baseSeed||shot?.seed||43001}"></label><div class="vr-field"><span>FINGERPRINT</span><input type="text" readonly value="${escapeHtml(meta.fingerprint||"—")}"></div><div class="vr-field"><span>LOCKED CATEGORIES</span><input type="text" readonly value="${escapeHtml((meta.lockedCategories||[]).join(", ")||"NONE")}"></div><div class="vr-field"><span>PASSES</span><input type="text" readonly value="${escapeHtml(meta.passes??"—")}"></div></div></details>
    </section>`;
  }
  timelineMarkup(state){
    const clips=Object.values(state.timeline?.clips||{}).filter(clip=>clip.type==="shot").sort((a,b)=>a.startFrame-b.startFrame),cards=Array.from({length:4},(_,index)=>clips[index]||null),duration=Math.max(1,state.timeline?.outFrame||0,...clips.map(clip=>clip.startFrame+clip.durationFrames)),selected=state.timeline?.clips?.[state.timeline.selectedClipId];
    return `<section class="vr-recovery-panel" aria-label="Sequence curve">
      <div class="vr-panel-head"><span>SEQUENCE CURVE</span><b>${clips.length} SHOTS · ${duration} FRAMES</b><em>${selected?.alias?escapeHtml(selected.alias):"V1 READY"}</em></div>
      <div class="vr-curve-summary">${cards.map((clip,index)=>clip?`<div class="vr-curve-shot"><span>0${index+1} · ${clip.durationFrames}F</span><b>${escapeHtml(clip.alias||state.shots.byId[clip.shotId]?.name||"SHOT")}</b></div>`:`<div class="vr-curve-shot empty"><span>0${index+1} · EMPTY</span><b>ADD SHOT</b></div>`).join("")}</div>
      <div class="vr-inline-actions"><button class="vr-compact-action primary" data-recovery-action="add-shot">${ICON.add}ADD / UPDATE ACTIVE SHOT</button><button class="vr-compact-action" data-recovery-action="open-render" ${selected?.shotId?"":"disabled"}>${ICON.open}OPEN SELECTED IN RENDER</button><button class="vr-compact-action" data-recovery-action="playblast">${ICON.export}PLAYBLAST</button></div>
    </section>`;
  }
  dispose(){this.unsubscribe?.();}
}
