import {AXIS_MAP} from "../core/default-state.js";
import {FAMILIES,presetsForFamily} from "../shots/presets.js";
import {CREATIVE_AXES,CREATIVE_AXIS_MAP,choiceLabel} from "../shots/creative-axes.js";
import {activeShot,deltaSummary} from "../player/shot-interpolator.js";

const GROUPS=[
  {id:"frame",label:"FRAME",axes:["camera","lens","focus","composition","view"],icon:"frame"},
  {id:"subject",label:"SUBJECT",axes:["subject-size","subject-rotation","motion-design"],icon:"subject"},
  {id:"world",label:"WORLD",axes:["light","environment","atmosphere"],icon:"world"}
];
const FAMILY_ICON={hero:"hero",reveal:"reveal",motion:"motion",detail:"detail",tech:"tech",graphic:"graphic",closing:"closing"};
const SVG={
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  unlock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
  dice:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/></svg>',
  reset:'<svg viewBox="0 0 24 24"><path d="M4 4v6h6"/><path d="M5.5 15a7 7 0 1 0 .5-7L4 10"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  timeline:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 4v4M15 10v4M11 16v4"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6z"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>'
};

export class RenderWorkspace{
  constructor({root,store,commands,toast}){this.root=root;this.store=store;this.commands=commands;this.toast=toast;this.gestureAxis=null;this.build();this.bind();this.unsubscribe=store.subscribe((state,meta)=>{if(meta?.label==="Playback tick"||meta?.type==="gesture")return;this.render(state);});}
  build(){
    this.root.innerHTML=`<div class="render-editor rebuild-editor">
      <header class="rebuild-shotbar">
        <label class="shot-picker"><span>ACTIVE SHOT</span><select data-role="shot-picker"></select></label>
        <div class="shotbar-actions"><button data-shot-action="new" title="New shot">${SVG.plus}<span>NEW</span></button><button data-shot-action="duplicate" title="Duplicate shot">${SVG.copy}<span>DUPLICATE</span></button><button data-shot-action="delete" class="danger" title="Delete shot">${SVG.trash}</button></div>
        <div class="asset-mini"><article><span>HERO</span><b data-role="hero-name">PROXY</b></article><article><span>WORLD</span><b data-role="environment-name">STUDIO</b></article><em data-role="shot-status">UNLINKED</em></div>
      </header>
      <div class="rebuild-scroll">
        <section class="game-section family-section"><header><div><small>STEP 01</small><b>CHOOSE THE SHOT ROLE</b></div><span>ONE TAP CHANGES THE CREATIVE INTENT</span></header><div class="game-chip-rail family-game-rail" data-role="families"></div></section>
        <section class="game-section preset-section"><header><div><small>STEP 02</small><b>PICK A CINEMATIC MOVE</b></div><span data-role="preset-count">00 PRESETS</span></header><div class="game-chip-rail preset-game-rail" data-role="presets"></div></section>
        <section class="game-command-console">
          <div class="generate-console"><div class="console-label"><small>STEP 03</small><b>GENERATE</b></div><div class="mode-segment"><button data-command="near">NEAR</button><button class="active" data-command="balanced">BALANCED</button><button data-command="bold">BOLD</button></div><button class="big-action" data-command="generate">${SVG.dice}<span>NEW VARIANT</span></button><button class="icon-action" data-command="reset" title="Reset">${SVG.reset}</button></div>
          <div class="scope-console"><span>EDIT</span><div class="scope-segment"><button data-scope="start">START</button><button data-scope="both">BOTH</button><button data-scope="end">END</button></div></div>
          <label class="delta-target"><span>DELTA TARGET <b data-role="delta-target-value">42%</b></span><input data-role="delta-target" type="range" min="5" max="95" step="1"></label>
          <div class="delta-console"><span>LIVE DELTA</span><b data-role="delta-score">00</b><em data-role="delta-risk">STABLE</em><i><u data-role="delta-meter"></u></i></div>
        </section>
        <section class="game-section axis-section"><header><div><small>STEP 04</small><b>BUILD THE SHOT</b></div><span>SELECT A CATEGORY, THEN A CHIP</span></header><div class="axis-group-rail" data-role="axis-groups"></div><div class="axis-tile-grid" data-role="axis-tiles"></div></section>
        <section class="active-axis-panel" data-role="active-axis-panel"></section>
        <section class="advanced-context-panel" data-role="advanced-panel"></section>
      </div>
      <footer class="rebuild-action-dock"><div class="dock-summary"><small data-role="dock-family">HERO</small><b data-role="dock-shot">—</b><span data-role="dock-delta">0 CHANGES</span></div><button data-dock-play>${SVG.play}<span>PLAY SHOT</span></button><button class="primary" data-add-timeline>${SVG.timeline}<span data-role="add-label">ADD TO TIMELINE</span></button></footer>
    </div>`;
  }
  bind(){
    this.root.addEventListener("click",event=>{
      const shotAction=event.target.closest("[data-shot-action]")?.dataset.shotAction;if(shotAction){this.commands.dispatch(`shot.${shotAction}`);return;}
      const family=event.target.closest("[data-family]")?.dataset.family;if(family){this.commands.dispatch("shot.setFamily",{family});return;}
      const presetId=event.target.closest("[data-preset]")?.dataset.preset;if(presetId){this.commands.dispatch("shot.applyPreset",{presetId});this.toast?.("PRESET APPLIED");return;}
      const scope=event.target.closest("[data-scope]")?.dataset.scope;if(scope){this.commands.dispatch("ui.setScope",{scope});return;}
      const command=event.target.closest("[data-command]")?.dataset.command;
      if(["near","balanced","bold"].includes(command)){this.root.querySelectorAll("[data-command=near],[data-command=balanced],[data-command=bold]").forEach(button=>button.classList.toggle("active",button.dataset.command===command));this.variantMode=command;return;}
      if(command==="generate"){this.commands.dispatch("shot.generateVariant",{mode:this.variantMode||"balanced"});return;}
      if(command==="reset"){this.commands.dispatch("shot.reset");return;}
      const group=event.target.closest("[data-axis-group]")?.dataset.axisGroup;if(group){this.activeGroup=group;this.render(this.store.get());return;}
      const axisSelect=event.target.closest("[data-creative-axis-select]")?.dataset.creativeAxisSelect;if(axisSelect){this.commands.dispatch("ui.selectCreativeAxis",{axisId:axisSelect});return;}
      const lock=event.target.closest("[data-creative-lock]")?.dataset.creativeLock;if(lock){this.commands.dispatch("shot.toggleCreativeLock",{axisId:lock});return;}
      const resetPool=event.target.closest("[data-reset-pool]")?.dataset.resetPool;if(resetPool){this.commands.dispatch("shot.resetCreativePool",{axisId:resetPool});return;}
      const exclude=event.target.closest("[data-exclude-option]");if(exclude){this.commands.dispatch("shot.toggleCreativeExclusion",{axisId:exclude.dataset.axisId,optionId:exclude.dataset.excludeOption});return;}
      const endpoint=event.target.closest("[data-option-endpoint]");if(endpoint){this.commands.dispatch("shot.setCreativeChoice",{axisId:endpoint.dataset.axisId,optionId:endpoint.dataset.optionId,scope:endpoint.dataset.optionEndpoint});return;}
      const option=event.target.closest("[data-creative-option]");if(option){this.commands.dispatch("shot.setCreativeChoice",{axisId:option.dataset.axisId,optionId:option.dataset.creativeOption});return;}
      if(event.target.closest("[data-dock-play]")){this.commands.dispatch("playback.toggle");return;}
      if(event.target.closest("[data-add-timeline]")){this.commands.dispatch("shot.addToTimeline",{trackId:"v1"});return;}
    });
    this.root.addEventListener("change",event=>{if(event.target.matches('[data-role="shot-picker"]'))this.commands.dispatch("shot.select",{shotId:event.target.value});});
    this.root.addEventListener("input",event=>{
      if(event.target.matches('[data-role="delta-target"]')){this.commands.dispatch("shot.setDeltaTarget",{value:Number(event.target.value)/100});return;}
      if(event.target.matches("[data-axis-input]")){const axisId=event.target.dataset.axisInput;if(this.gestureAxis!==axisId){this.gestureAxis=axisId;this.commands.dispatch("gesture.begin",{label:`Advanced ${axisId}`});}this.commands.dispatch("shot.setAxis",{axisId,value:Number(event.target.value),gesture:true});}
    });
    this.root.addEventListener("pointerup",event=>{if(event.target.matches("[data-axis-input]")&&this.gestureAxis){this.commands.dispatch("gesture.end");this.gestureAxis=null;}});
    this.root.addEventListener("pointercancel",event=>{if(event.target.matches("[data-axis-input]")&&this.gestureAxis){this.commands.dispatch("gesture.cancel");this.gestureAxis=null;}});
  }
  render(state){
    const shot=activeShot(state),delta=deltaSummary(state),familyPresets=presetsForFamily(shot.family),activeAxis=CREATIVE_AXIS_MAP.get(state.ui.selectedCreativeAxisId)||CREATIVE_AXES[0];
    this.variantMode=shot.variantMode||this.variantMode||"balanced";this.activeGroup=this.activeGroup||GROUPS.find(group=>group.axes.includes(activeAxis.id))?.id||"frame";
    const shotPicker=this.root.querySelector('[data-role="shot-picker"]');shotPicker.innerHTML=state.shots.order.map((id,index)=>`<option value="${id}" ${id===shot.id?"selected":""}>${String(index+1).padStart(2,"0")} · ${escapeHtml(state.shots.byId[id]?.name||"SHOT")}</option>`).join("");
    this.root.querySelector('[data-role="hero-name"]').textContent=state.assets.byId[state.assets.heroId]?.name||"HERO";this.root.querySelector('[data-role="environment-name"]').textContent=state.assets.byId[state.assets.environmentId]?.name||"WORLD";
    const linked=Object.values(state.timeline.clips).some(clip=>clip.type==="shot"&&clip.shotId===shot.id);this.root.querySelector('[data-role="shot-status"]').textContent=linked?"TIMELINE LINKED":"READY TO ADD";
    this.root.querySelector('[data-role="families"]').innerHTML=FAMILIES.map(f=>`<button class="game-family ${f.id===shot.family?"active":""}" data-family="${f.id}"><i>${familySvg(FAMILY_ICON[f.id])}</i><span><b>${f.label}</b><small>${f.description}</small></span></button>`).join("");
    this.root.querySelector('[data-role="presets"]').innerHTML=familyPresets.map((preset,index)=>`<button class="game-preset ${preset.id===shot.presetId?"active":""}" data-preset="${preset.id}"><i>${String(index+1).padStart(2,"0")}</i><span><b>${preset.title}</b><small>${preset.duration}F · ${preset.description}</small></span><em>PLAY</em></button>`).join("");
    this.root.querySelector('[data-role="preset-count"]').textContent=`${String(familyPresets.length).padStart(2,"0")} PRESETS`;
    this.root.querySelectorAll("[data-scope]").forEach(button=>{const active=button.dataset.scope===state.ui.editScope;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});
    this.root.querySelectorAll("[data-command=near],[data-command=balanced],[data-command=bold]").forEach(button=>button.classList.toggle("active",button.dataset.command===this.variantMode));
    this.root.querySelector('[data-role="delta-score"]').textContent=String(delta.count).padStart(2,"0");this.root.querySelector('[data-role="delta-risk"]').textContent=delta.risk.toUpperCase();this.root.querySelector('[data-role="delta-meter"]').style.width=`${Math.max(2,Math.round(delta.score*100))}%`;
    const target=Math.round((shot.deltaTarget??.42)*100),targetInput=this.root.querySelector('[data-role="delta-target"]');if(document.activeElement!==targetInput)targetInput.value=String(target);this.root.querySelector('[data-role="delta-target-value"]').textContent=`${target}%`;
    this.root.querySelector('[data-role="axis-groups"]').innerHTML=GROUPS.map(group=>`<button class="axis-group-chip ${group.id===this.activeGroup?"active":""}" data-axis-group="${group.id}"><i>${familySvg(group.icon)}</i><span>${group.label}</span><b>${group.axes.length}</b></button>`).join("");
    const visibleAxes=GROUPS.find(group=>group.id===this.activeGroup)?.axes||GROUPS[0].axes;
    this.root.querySelector('[data-role="axis-tiles"]').innerHTML=visibleAxes.map(id=>axisTile(CREATIVE_AXIS_MAP.get(id),shot,state.ui.selectedCreativeAxisId)).join("");
    this.root.querySelector('[data-role="active-axis-panel"]').innerHTML=activeAxisPanel(activeAxis,shot,state.ui.editScope);
    const advancedHost=this.root.querySelector('[data-role="advanced-panel"]');advancedHost.hidden=!state.ui.advanced;advancedHost.innerHTML=state.ui.advanced?advancedPanel(activeAxis,shot,state.ui.editScope):"";
    this.root.querySelector('[data-role="dock-family"]').textContent=shot.family.toUpperCase();this.root.querySelector('[data-role="dock-shot"]').textContent=shot.name;this.root.querySelector('[data-role="dock-delta"]').textContent=`${delta.count} CHANGES · ${Math.round(delta.score*100)}%`;
    this.root.querySelector('[data-role="add-label"]').textContent=linked?"UPDATE LINKED SHOT":"ADD TO TIMELINE";
  }
  dispose(){this.unsubscribe?.();}
}

function axisTile(axis,shot,selectedId){
  const start=shot.start.choices?.[axis.id],end=shot.end.choices?.[axis.id],mixed=start!==end,locked=Boolean(shot.creativeLocks?.[axis.id]);
  return `<button class="axis-game-tile ${selectedId===axis.id?"active":""} ${mixed?"mixed":""}" data-creative-axis-select="${axis.id}"><i>${axisSvg(axis.id)}</i><span><small>${axis.label}</small><b>${mixed?`${choiceLabel(axis.id,start)} → ${choiceLabel(axis.id,end)}`:choiceLabel(axis.id,start)}</b></span><em>${locked?SVG.lock:mixed?"Δ":"="}</em></button>`;
}
function activeAxisPanel(axis,shot,scope){
  const locked=Boolean(shot.creativeLocks?.[axis.id]),excluded=shot.creativeExclusions||{},allowed=axis.options.filter(option=>!excluded[`${axis.id}:${option.id}`]);
  return `<header class="active-axis-head"><div><i>${axisSvg(axis.id)}</i><span><small>ACTIVE CONTROL</small><b>${axis.label}</b><em>${axis.options.length} OPTIONS · ${allowed.length} IN GENERATION POOL</em></span></div><button class="axis-lock-button ${locked?"active":""}" data-creative-lock="${axis.id}">${locked?SVG.lock:SVG.unlock}<span>${locked?"LOCKED":"LOCK AXIS"}</span></button><button class="pool-reset" data-reset-pool="${axis.id}" ${allowed.length===axis.options.length?"disabled":""}>RESET POOL</button></header><div class="option-game-grid">${axis.options.map(option=>optionChip(axis,option,shot,scope)).join("")}</div>`;
}
function optionChip(axis,option,shot,scope){
  const start=shot.start.choices?.[axis.id]===option.id,end=shot.end.choices?.[axis.id]===option.id,excluded=Boolean(shot.creativeExclusions?.[`${axis.id}:${option.id}`]),active=scope==="start"?start:scope==="end"?end:start&&end;
  return `<article class="option-game-chip ${active?"active":""} ${start?"has-start":""} ${end?"has-end":""} ${excluded?"excluded":""}"><button class="option-main" data-creative-option="${option.id}" data-axis-id="${axis.id}"><i>${axisSvg(axis.id)}</i><span><b>${option.label}</b><small>${option.description||"Apply to the active edit scope"}</small></span></button><div class="endpoint-picks"><button class="start" data-option-endpoint="start" data-axis-id="${axis.id}" data-option-id="${option.id}" aria-pressed="${start}">S</button><button class="end" data-option-endpoint="end" data-axis-id="${axis.id}" data-option-id="${option.id}" aria-pressed="${end}">E</button></div><button class="exclude" data-exclude-option="${option.id}" data-axis-id="${axis.id}" title="${excluded?"Return to generation pool":"Remove from generation pool"}">${excluded?"+":"×"}</button></article>`;
}
function advancedPanel(axis,shot,scope){
  const axes=(axis.advancedAxes||[]).map(id=>AXIS_MAP.get(id)).filter(Boolean);if(!axes.length)return `<header><small>ADVANCED · ${axis.label}</small><b>NO NUMERIC OVERRIDES</b></header><p>This creative control is intentionally preset-driven.</p>`;
  return `<header><div><small>ADVANCED · CONTEXTUAL</small><b>${axis.label} PROPERTIES</b></div><span>EDITING ${scope.toUpperCase()}</span></header><div class="advanced-control-grid">${axes.map(item=>{const start=shot.start.values[item.id],end=shot.end.values[item.id],value=scope==="end"?end:scope==="start"?start:(start+end)/2;return `<label class="advanced-game-control"><span><b>${item.label}</b><small>${item.hint}</small></span><div><input data-axis-input="${item.id}" type="range" min="${item.min}" max="${item.max}" step="${item.step}" value="${value}"><output><i>${format(start,item)}</i><b>${start===end?"=":"→"}</b><em>${format(end,item)}</em></output></div></label>`;}).join("")}</div>`;
}
function format(value,axis){const decimals=axis.step<.1?2:axis.step<1?1:0;return `${Number(value).toFixed(decimals)}${axis.unit||""}`;}
function familySvg(type){const shapes={hero:'<path d="M12 3 20 8v8l-8 5-8-5V8z"/><path d="m4 8 8 5 8-5"/>',reveal:'<path d="M4 18 18 4M7 4h11v11"/><path d="M4 10v10h10"/>',motion:'<path d="M4 12h12"/><path d="m12 7 5 5-5 5"/><path d="M4 6h5M4 18h5"/>',detail:'<circle cx="10" cy="10" r="5"/><path d="m14 14 6 6M10 7v6M7 10h6"/>',tech:'<path d="M4 7h16M4 12h16M4 17h16"/><path d="M8 4v6M15 9v6M11 14v6"/>',graphic:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 17h6"/>',closing:'<path d="M5 5h14v14H5z"/><path d="m9 9 6 6M15 9l-6 6"/>',frame:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',subject:'<circle cx="12" cy="9" r="4"/><path d="M5 21c1-5 3.5-7 7-7s6 2 7 7"/>',world:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9M12 3c-3 3-4 6-4 9s1 6 4 9"/>'};return `<svg viewBox="0 0 24 24">${shapes[type]||shapes.hero}</svg>`;}
function axisSvg(id){const map={light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',camera:'<path d="M4 7h11v10H4z"/><path d="m15 10 5-3v10l-5-3z"/>',lens:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',focus:'<path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/><circle cx="12" cy="12" r="2"/>',composition:'<rect x="4" y="4" width="16" height="16"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>','subject-size':'<rect x="6" y="6" width="12" height="12"/><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>','subject-rotation':'<path d="M18 8a7 7 0 1 0 1 7"/><path d="M18 3v5h-5"/>',view:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>','motion-design':'<path d="M3 12c3-6 6 6 9 0s6 6 9 0"/>',environment:'<path d="m3 18 6-7 4 4 3-3 5 6"/><path d="M3 20h18"/>',atmosphere:'<circle cx="7" cy="8" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="18" cy="14" r="1"/><circle cx="9" cy="17" r="1"/>',world:'<circle cx="12" cy="12" r="9"/>'};return `<svg viewBox="0 0 24 24">${map[id]||map.world}</svg>`;}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
