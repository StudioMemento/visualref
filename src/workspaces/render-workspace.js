import {AXIS_MAP} from "../core/default-state.js";
import {FAMILIES,presetsForFamily} from "../shots/presets.js";
import {CREATIVE_AXES,CREATIVE_AXIS_MAP,choiceLabel} from "../shots/creative-axes.js";
import {activeShot,deltaSummary} from "../player/shot-interpolator.js";

const SVG={
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  unlock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
  dice:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/></svg>',
  reset:'<svg viewBox="0 0 24 24"><path d="M4 4v6h6"/><path d="M5.5 15a7 7 0 1 0 .5-7L4 10"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  timeline:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 4v4M15 10v4M11 16v4"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6z"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>',
  close:'<svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8"/></svg>',
  chevronLeft:'<svg viewBox="0 0 16 16"><path d="M10.5 3.75 6 8l4.5 4.25"/></svg>',
  chevronRight:'<svg viewBox="0 0 16 16"><path d="M5.5 3.75 10 8l-4.5 4.25"/></svg>',
  fold:'<svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg>'
};

export const V45_RENDER_MACROS=[
  {id:"subject",label:"SUBJECT",hint:"Presence, physical read and presentation angle",axes:["subject-presence","subject-size","subject-rotation"]},
  {id:"camera",label:"CAMERA",hint:"How the camera behaves around the hero",axes:["camera","view"]},
  {id:"composition",label:"COMPOSITION",hint:"Where the hero lives inside the frame",axes:["composition"]},
  {id:"lens-focus",label:"LENS & FOCUS",hint:"Perspective, compression and attention",axes:["lens","focus"]},
  {id:"light",label:"LIGHT",hint:"Shape, separation and visual authority",axes:["light"]},
  {id:"environment",label:"ENVIRONMENT",hint:"Void, stage or spatial context",axes:["environment"]},
  {id:"motion",label:"MOTION",hint:"Off by default; enable only when the shot needs it",axes:["motion-design"]},
  {id:"image",label:"ATMOSPHERE / IMAGE",hint:"Particles, depth and image texture",axes:["atmosphere"]},
  {id:"timing",label:"TIMING",hint:"Duration and the intended Start-to-End distance",axes:[]}
];

export class RenderWorkspace{
  constructor({root,store,commands,toast}){this.root=root;this.store=store;this.commands=commands;this.toast=toast;this.gestureAxis=null;this.build();this.bind();this.unsubscribe=store.subscribe((state,meta)=>{if(meta?.label==="Playback tick"||meta?.type==="gesture")return;this.render(state);});}
  build(){
    this.root.innerHTML=`<div class="v45-render-editor v43b9-render-editor">
      <header class="v45-shot-commandbar">
        <label class="v45-shot-picker"><span>ACTIVE SHOT</span><select data-role="shot-picker"></select></label>
        <label class="v45-family-picker"><span>INTENT</span><select data-role="family-picker"></select></label>
        <div class="v45-shot-actions"><button data-shot-action="new" title="New shot">${SVG.plus}</button><button data-shot-action="duplicate" title="Duplicate shot">${SVG.copy}</button><button class="danger" data-shot-action="delete" title="Delete shot">${SVG.trash}</button></div>
        <div class="v45-scope-control"><span>EDIT</span><button data-scope="start">START</button><button data-scope="both">BOTH</button><button data-scope="end">END</button></div>
      </header>
      <section class="v45-variation-console">
        <div class="v45-variation-copy"><small>ACTIVE DIRECTION</small><b data-role="active-direction">—</b><span data-role="asset-context">HERO · WORLD</span></div>
        <label><span>VARIATION</span><select data-role="variant-mode"><option value="near">NEAR</option><option value="balanced">BALANCED</option><option value="bold">BOLD</option></select></label>
        <button class="v45-variation-action" data-command="generate">${SVG.dice}<span>NEW VARIATION</span></button>
        <button class="v45-reset-action" data-command="reset" title="Reset shot">${SVG.reset}</button>
        <div class="v45-delta-readout"><span>DELTA</span><b data-role="delta-score">00</b><em data-role="delta-risk">STABLE</em><i><u data-role="delta-meter"></u></i></div>
      </section>
      <div class="v45-macro-stack" data-role="macro-stack"></div>
      <details class="v45-starting-points"><summary><span>CURATED STARTING POINTS</span><b data-role="preset-count">00</b>${SVG.fold}</summary><div class="v45-preset-rail" data-role="presets"></div></details>
      <footer class="v45-render-dock"><div><small data-role="dock-family">HERO</small><b data-role="dock-shot">—</b><span data-role="dock-delta">0 CHANGES</span></div><button data-dock-play>${SVG.play}<span>PLAY SHOT</span></button><button class="primary" data-add-timeline>${SVG.timeline}<span data-role="add-label">ADD TO TIMELINE</span></button></footer>
    </div>`;
  }
  bind(){
    this.root.addEventListener("click",event=>{
      const shotAction=event.target.closest("[data-shot-action]")?.dataset.shotAction;if(shotAction){this.commands.dispatch(`shot.${shotAction}`);return;}
      const scope=event.target.closest("[data-scope]")?.dataset.scope;if(scope){this.commands.dispatch("ui.setScope",{scope});return;}
      const command=event.target.closest("[data-command]")?.dataset.command;if(command==="generate"){const mode=this.root.querySelector('[data-role="variant-mode"]').value;this.commands.dispatch("shot.generateVariant",{mode});this.toast?.(`${mode.toUpperCase()} VARIATION GENERATED`);return;}if(command==="reset"){this.commands.dispatch("shot.reset");return;}
      const macroId=event.target.closest("[data-macro]")?.dataset.macro;if(macroId){this.commands.dispatch("ui.setMacro",{macroId});return;}
      const axisSelect=event.target.closest("[data-creative-axis-select]")?.dataset.creativeAxisSelect;if(axisSelect){this.commands.dispatch("ui.selectCreativeAxis",{axisId:axisSelect});return;}
      const lock=event.target.closest("[data-creative-lock]")?.dataset.creativeLock;if(lock){this.commands.dispatch("shot.toggleCreativeLock",{axisId:lock});return;}
      const resetPool=event.target.closest("[data-reset-pool]")?.dataset.resetPool;if(resetPool){this.commands.dispatch("shot.resetCreativePool",{axisId:resetPool});return;}
      const exclude=event.target.closest("[data-exclude-option]");if(exclude){this.commands.dispatch("shot.toggleCreativeExclusion",{axisId:exclude.dataset.axisId,optionId:exclude.dataset.excludeOption});return;}
      const endpoint=event.target.closest("[data-option-endpoint]");if(endpoint){this.commands.dispatch("shot.setCreativeChoice",{axisId:endpoint.dataset.axisId,optionId:endpoint.dataset.optionId,scope:endpoint.dataset.optionEndpoint});return;}
      const presetId=event.target.closest("[data-preset]")?.dataset.preset;if(presetId){this.commands.dispatch("shot.applyPreset",{presetId});this.toast?.("STARTING POINT APPLIED");return;}
      if(event.target.closest("[data-dock-play]")){this.commands.dispatch("playback.toggle");return;}
      if(event.target.closest("[data-add-timeline]")){this.commands.dispatch("shot.addToTimeline",{trackId:"v1"});return;}
    });
    this.root.addEventListener("change",event=>{
      if(event.target.matches('[data-role="shot-picker"]'))this.commands.dispatch("shot.select",{shotId:event.target.value});
      if(event.target.matches('[data-role="family-picker"]'))this.commands.dispatch("shot.setFamily",{family:event.target.value});
      if(event.target.matches('[data-role="variant-mode"]'))this.store.transient("Variant mode",state=>activeShot(state).variantMode=event.target.value,{persist:true,broadcast:true});
    });
    this.root.addEventListener("input",event=>{
      if(event.target.matches("[data-axis-input]")){const axisId=event.target.dataset.axisInput;if(this.gestureAxis!==axisId){this.gestureAxis=axisId;this.commands.dispatch("gesture.begin",{label:`Precision ${axisId}`});}this.commands.dispatch("shot.setAxis",{axisId,value:Number(event.target.value),gesture:true});return;}
      if(event.target.matches("[data-shot-duration]")){this.commands.dispatch("shot.setDuration",{frames:Number(event.target.value)});return;}
      if(event.target.matches("[data-delta-target]")){this.commands.dispatch("shot.setDeltaTarget",{value:Number(event.target.value)/100});return;}
    });
    const endGesture=event=>{if(event.target.matches("[data-axis-input]")&&this.gestureAxis){this.commands.dispatch("gesture.end");this.gestureAxis=null;}};this.root.addEventListener("pointerup",endGesture);this.root.addEventListener("pointercancel",event=>{if(event.target.matches("[data-axis-input]")&&this.gestureAxis){this.commands.dispatch("gesture.cancel");this.gestureAxis=null;}});
  }
  render(state){
    const shot=activeShot(state),delta=deltaSummary(state),macro=V45_RENDER_MACROS.find(item=>item.id===state.ui.selectedMacroId)||V45_RENDER_MACROS[0],familyPresets=presetsForFamily(shot.family),linked=Object.values(state.timeline.clips).some(clip=>clip.type==="shot"&&clip.shotId===shot.id);
    const shotPicker=this.root.querySelector('[data-role="shot-picker"]');shotPicker.innerHTML=state.shots.order.map((id,index)=>`<option value="${id}" ${id===shot.id?"selected":""}>${String(index+1).padStart(2,"0")} · ${escapeHtml(state.shots.byId[id]?.name||"SHOT")}</option>`).join("");
    const familyPicker=this.root.querySelector('[data-role="family-picker"]');familyPicker.innerHTML=FAMILIES.map(family=>`<option value="${family.id}" ${family.id===shot.family?"selected":""}>${family.label}</option>`).join("");
    this.root.querySelector('[data-role="variant-mode"]').value=shot.variantMode||"balanced";
    this.root.querySelectorAll("[data-scope]").forEach(button=>{const active=button.dataset.scope===state.ui.editScope;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});
    this.root.querySelector('[data-role="active-direction"]').textContent=shot.name;this.root.querySelector('[data-role="asset-context"]').textContent=`${state.assets.byId[state.assets.heroId]?.name||"HERO"} · ${state.assets.byId[state.assets.environmentId]?.name||"WORLD"}`;
    this.root.querySelector('[data-role="delta-score"]').textContent=String(delta.count).padStart(2,"0");this.root.querySelector('[data-role="delta-risk"]').textContent=delta.risk.toUpperCase();this.root.querySelector('[data-role="delta-meter"]').style.width=`${Math.max(2,Math.round(delta.score*100))}%`;
    this.root.querySelector('[data-role="macro-stack"]').innerHTML=V45_RENDER_MACROS.map(item=>macroMarkup(item,shot,state,item.id===macro.id)).join("");
    this.root.querySelector('[data-role="presets"]').innerHTML=familyPresets.map((preset,index)=>`<button class="v45-preset-chip ${preset.id===shot.presetId?"active":""}" data-preset="${preset.id}"><i>${String(index+1).padStart(2,"0")}</i><span><b>${escapeHtml(preset.title)}</b><small>${preset.duration}F · ${escapeHtml(preset.description)}</small></span></button>`).join("");
    this.root.querySelector('[data-role="preset-count"]').textContent=String(familyPresets.length).padStart(2,"0");
    this.root.querySelector('[data-role="dock-family"]').textContent=shot.family.toUpperCase();this.root.querySelector('[data-role="dock-shot"]').textContent=shot.name;this.root.querySelector('[data-role="dock-delta"]').textContent=`${delta.count} CHANGES · ${Math.round(delta.score*100)}%`;this.root.querySelector('[data-role="add-label"]').textContent=linked?"UPDATE LINKED SHOT":"ADD TO TIMELINE";
  }
  dispose(){this.unsubscribe?.();}
}

function macroMarkup(macro,shot,state,open){
  const summaries=macro.axes.map(id=>{const start=shot.start.choices?.[id],end=shot.end.choices?.[id];return start===end?choiceLabel(id,start):`${choiceLabel(id,start)} → ${choiceLabel(id,end)}`;});
  const summary=macro.id==="timing"?`${shot.durationFrames}F · ${Math.round((shot.deltaTarget??.42)*100)}% DELTA`:summaries.filter(Boolean).slice(0,2).join(" · ")||"READY";
  return `<section class="v45-macro ${open?"open":""}" data-macro-section="${macro.id}"><button class="v45-macro-head" data-macro="${macro.id}" type="button" aria-expanded="${open}"><span><small>${escapeHtml(macro.hint)}</small><b>${escapeHtml(macro.label)}</b></span><em>${escapeHtml(summary)}</em>${SVG.fold}</button>${open?`<div class="v45-macro-body">${macro.id==="timing"?timingMarkup(shot):macro.axes.map(id=>creativeAxisBlock(CREATIVE_AXIS_MAP.get(id),shot,state.ui.editScope,state.ui.selectedCreativeAxisId)).join("")}${precisionMarkup(macro,shot,state.ui.editScope)}</div>`:""}</section>`;
}
function creativeAxisBlock(axis,shot,scope,selectedAxisId){if(!axis)return"";const locked=Boolean(shot.creativeLocks?.[axis.id]),excludedCount=axis.options.filter(option=>shot.creativeExclusions?.[`${axis.id}:${option.id}`]).length,start=shot.start.choices?.[axis.id],end=shot.end.choices?.[axis.id],summary=start===end?choiceLabel(axis.id,start):`${choiceLabel(axis.id,start)} → ${choiceLabel(axis.id,end)}`;return `<section class="v45-axis-block ${selectedAxisId===axis.id?"selected-axis":""} ${locked?"locked-axis":""}"><header class="v45-axis-title"><button data-creative-axis-select="${axis.id}"><span>${escapeHtml(axis.label)}</span><b>${escapeHtml(summary)}</b></button><button class="v45-axis-lock" data-creative-lock="${axis.id}" title="${locked?"Unlock":"Lock"} generation">${locked?SVG.lock:SVG.unlock}</button>${excludedCount?`<button class="v45-pool-reset" data-reset-pool="${axis.id}" title="Restore generation pool">${SVG.reset}</button>`:""}</header><div class="v43b9-axis-rail v45-chip-rail">${axis.options.map(option=>optionChip(axis,option,shot,scope)).join("")}</div></section>`;}
function optionChip(axis,option,shot,scope){const start=shot.start.choices?.[axis.id]===option.id,end=shot.end.choices?.[axis.id]===option.id,excluded=Boolean(shot.creativeExclusions?.[`${axis.id}:${option.id}`]),classes=["mvr-chip",option.label.length>12?"long-label":"",start?"selected-start":"",end?"selected-end":"",start&&end?"shared-option":"",excluded?"excluded-option":""].filter(Boolean).join(" "),label=escapeHtml(option.label);return `<article class="${classes}" data-axis-id="${axis.id}" data-option-id="${option.id}" data-edit-scope="${scope}"><div class="mvr-chip-label"><b>${label}</b></div><div class="mvr-chip-hitareas" role="group" aria-label="Assign ${label} to Start, Both or End"><button class="mvr-chip-zone mvr-chip-start" data-option-endpoint="start" data-axis-id="${axis.id}" data-option-id="${option.id}" aria-label="Set ${label} as Start" aria-pressed="${start&&!end}">${SVG.chevronLeft}</button><button class="mvr-chip-zone mvr-chip-both" data-option-endpoint="both" data-axis-id="${axis.id}" data-option-id="${option.id}" aria-label="Set ${label} as both Start and End" aria-pressed="${start&&end}"></button><button class="mvr-chip-zone mvr-chip-end" data-option-endpoint="end" data-axis-id="${axis.id}" data-option-id="${option.id}" aria-label="Set ${label} as End" aria-pressed="${end&&!start}">${SVG.chevronRight}</button></div><button class="mvr-chip-pool ${excluded?"include-action":""}" data-exclude-option="${option.id}" data-axis-id="${axis.id}" aria-label="${excluded?"Return":"Remove"} ${label} ${excluded?"to":"from"} generation pool">${excluded?SVG.plus:SVG.close}</button></article>`;}
function precisionMarkup(macro,shot,scope){const numericIds=[...new Set(macro.axes.flatMap(id=>CREATIVE_AXIS_MAP.get(id)?.advancedAxes||[]))],axes=numericIds.map(id=>AXIS_MAP.get(id)).filter(Boolean);if(!axes.length||macro.id==="timing")return"";return `<details class="v45-inline-precision"><summary>PRECISION <span>${axes.length} CONTROLS</span></summary><div class="v45-precision-grid">${axes.map(axis=>{const start=shot.start.values[axis.id],end=shot.end.values[axis.id],value=scope==="end"?end:scope==="start"?start:(start+end)/2;return `<label><span><b>${escapeHtml(axis.label)}</b><small>${escapeHtml(axis.hint)}</small></span><input data-axis-input="${axis.id}" type="range" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${value}"><output><i>${format(start,axis)}</i><b>${Math.abs(start-end)<.0001?"=":"→"}</b><em>${format(end,axis)}</em></output></label>`;}).join("")}</div></details>`;}
function timingMarkup(shot){const target=Math.round((shot.deltaTarget??.42)*100);return `<div class="v45-timing-grid"><label><span>DURATION</span><input data-shot-duration type="range" min="12" max="480" step="1" value="${shot.durationFrames}"><output>${shot.durationFrames}F</output></label><label><span>DELTA TARGET</span><input data-delta-target type="range" min="5" max="95" step="1" value="${target}"><output>${target}%</output></label><article><span>MOTION DEFAULT</span><b>${shot.start.choices?.["motion-design"]==="none"&&shot.end.choices?.["motion-design"]==="none"?"OFF":"ACTIVE"}</b><small>Energy appears only inside Motion precision.</small></article></div>`;}
function format(value,axis){const decimals=axis.step<.1?2:axis.step<1?1:0;return `${Number(value).toFixed(decimals)}${axis.unit||""}`;}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
