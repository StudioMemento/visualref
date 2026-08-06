import {AXIS_MAP} from "../core/default-state.js";
import {FAMILIES,presetsForFamily} from "../shots/presets.js";
import {CREATIVE_AXES,choiceLabel} from "../shots/creative-axes.js";
import {activeShot,deltaSummary} from "../player/shot-interpolator.js";

const ICON={
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  unlock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.8"/></svg>',
  close:'<svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8"/></svg>',
  plus:'<svg viewBox="0 0 12 12"><path d="M6 1.5v9M1.5 6h9"/></svg>',
  start:'<svg viewBox="0 0 16 16"><path d="M10.25 4.25 6.25 8l4 3.75"/></svg>',
  end:'<svg viewBox="0 0 16 16"><path d="M5.75 4.25 9.75 8l-4 3.75"/></svg>',
  both:'<span class="both-state-mark" aria-hidden="true"></span>'
};

export class RenderWorkspace{
  constructor({root,store,commands,toast}){
    this.root=root;this.store=store;this.commands=commands;this.toast=toast;
    this.build();this.bind();
    this.unsubscribe=store.subscribe((state,meta)=>{if(meta?.label==="Playback tick")return;this.render(state);});
  }
  build(){
    this.root.innerHTML=`<div class="render-editor">
      <div class="render-editor-scroll">
        <header class="render-editor-head">
          <div class="shot-identity"><small>SHOT CREATION</small><b data-role="active-shot">—</b><span>V36C AXIS GRAMMAR · LOCK + POOL AWARE</span></div>
          <div class="shot-assets"><article><span>HERO</span><b data-role="hero-name">CALIBRATED PROXY</b></article><article><span>WORLD</span><b data-role="environment-name">DARK STUDIO</b></article><em data-role="shot-status">UNLINKED</em></div>
        </header>
        <section class="creation-rails">
          <div class="compact-rail-row"><header><span>SHOT FAMILY</span><b>01</b></header><div class="family-rail compact" data-role="families">${FAMILIES.map(f=>`<button class="family-button" data-family="${f.id}"><b>${f.label}</b><small>${f.description}</small></button>`).join("")}</div></div>
          <div class="compact-rail-row"><header><span>PRESETS</span><b data-role="preset-count">00</b></header><div class="preset-grid compact" data-role="presets"></div></div>
          <div class="creation-command-bar">
            <div class="generation-buttons"><button data-command="near">NEAR</button><button class="primary" data-command="balanced">BALANCED</button><button data-command="bold">BOLD</button><button data-command="reset">RESET</button></div>
            <div class="scope-control"><span>EDIT SCOPE</span><div class="scope-row editor-scope"><button data-scope="start">START</button><button data-scope="both">BOTH</button><button data-scope="end">END</button></div></div>
            <div class="delta-readout"><span>CONTROLLED DELTA</span><b data-role="delta-score">00</b><em data-role="delta-risk">STABLE</em></div>
          </div>
        </section>
        <div class="creative-axis-matrix" data-role="creative-axis-matrix">${CREATIVE_AXES.map(axis=>creativeAxisMarkup(axis)).join("")}</div>
      </div>
      <footer class="editor-delta-dock">
        <div class="delta-track"><i data-role="delta-meter"></i><b></b></div>
        <div class="delta-dock-actions scope-four"><button data-dock-scope="start"><span>▣</span> START</button><button data-dock-scope="both">BOTH</button><button data-dock-play>▷ PLAY</button><button data-dock-scope="end">END <span>▣</span></button></div>
      </footer>
    </div>`;
  }
  bind(){
    this.root.addEventListener("click",event=>{
      const family=event.target.closest("[data-family]")?.dataset.family;
      if(family){this.commands.dispatch("shot.setFamily",{family});return;}
      const presetId=event.target.closest("[data-preset]")?.dataset.preset;
      if(presetId){this.commands.dispatch("shot.applyPreset",{presetId});this.toast?.(`PRESET APPLIED · ${presetId.toUpperCase()}`);return;}
      const scope=event.target.closest("[data-scope]")?.dataset.scope||event.target.closest("[data-dock-scope]")?.dataset.dockScope;
      if(scope){this.commands.dispatch("ui.setScope",{scope});return;}
      const command=event.target.closest("[data-command]")?.dataset.command;
      if(["near","balanced","bold"].includes(command)){this.commands.dispatch("shot.generateVariant",{mode:command});return;}
      if(command==="reset"){this.commands.dispatch("shot.reset");return;}
      if(event.target.closest("[data-dock-play]")){this.commands.dispatch("playback.toggle");return;}

      const endpoint=event.target.closest("[data-creative-endpoint]");
      if(endpoint){this.commands.dispatch("shot.setCreativeChoice",{axisId:endpoint.dataset.creativeAxis,optionId:endpoint.dataset.creativeOption,scope:endpoint.dataset.creativeEndpoint});return;}
      const exclusion=event.target.closest("[data-creative-exclusion]");
      if(exclusion){this.commands.dispatch("shot.toggleCreativeExclusion",{axisId:exclusion.dataset.creativeAxis,optionId:exclusion.dataset.creativeOption});return;}
      const poolReset=event.target.closest("[data-creative-pool-reset]");
      if(poolReset){this.commands.dispatch("shot.resetCreativePool",{axisId:poolReset.dataset.creativePoolReset});return;}
      const lock=event.target.closest("[data-creative-lock]");
      if(lock){this.commands.dispatch("shot.toggleCreativeLock",{axisId:lock.dataset.creativeLock});return;}
      const option=event.target.closest("[data-creative-option]");
      if(option){this.commands.dispatch("shot.setCreativeChoice",{axisId:option.dataset.creativeAxis,optionId:option.dataset.creativeOption});return;}
      const axisSelect=event.target.closest("[data-creative-axis-select]");
      if(axisSelect){this.commands.dispatch("ui.selectCreativeAxis",{axisId:axisSelect.dataset.creativeAxisSelect});return;}
      const row=event.target.closest("[data-creative-axis-row]");
      if(row)this.commands.dispatch("ui.selectCreativeAxis",{axisId:row.dataset.creativeAxisRow});
    });
    this.root.querySelectorAll("[data-axis-input]").forEach(input=>{
      const axisId=input.dataset.axisInput;
      input.addEventListener("pointerdown",()=>this.commands.dispatch("gesture.begin",{label:`Advanced ${axisId}`}));
      input.addEventListener("input",event=>this.commands.dispatch("shot.setAxis",{axisId,value:Number(event.target.value),gesture:true}));
      input.addEventListener("change",()=>this.commands.dispatch("gesture.end"));
      input.addEventListener("pointerup",()=>this.commands.dispatch("gesture.end"));
      input.addEventListener("pointercancel",()=>this.commands.dispatch("gesture.cancel"));
    });
  }
  render(state){
    const shot=activeShot(state),delta=deltaSummary(state),familyPresets=presetsForFamily(shot.family);
    shot.creativeExclusions??={};shot.creativeLocks??={};
    this.root.querySelector('[data-role="active-shot"]').textContent=shot.name;
    this.root.querySelector('[data-role="hero-name"]').textContent=state.assets.byId[state.assets.heroId]?.name||"HERO";
    this.root.querySelector('[data-role="environment-name"]').textContent=state.assets.byId[state.assets.environmentId]?.name||"ENVIRONMENT";
    this.root.querySelectorAll("[data-family]").forEach(button=>button.classList.toggle("active",button.dataset.family===shot.family));
    const presetHost=this.root.querySelector('[data-role="presets"]');
    presetHost.innerHTML=familyPresets.map(preset=>`<button class="preset-card compact ${shot.presetId===preset.id?"active":""}" data-preset="${preset.id}"><b>${preset.title}</b><small>${preset.duration}F</small></button>`).join("");
    this.root.querySelector('[data-role="preset-count"]').textContent=String(familyPresets.length).padStart(2,"0");
    this.root.querySelectorAll("[data-scope],[data-dock-scope]").forEach(button=>{
      const active=(button.dataset.scope||button.dataset.dockScope)===state.ui.editScope;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
    });
    const risk=delta.score<.26?"STABLE":delta.score<.56?"ACTIVE":"AGGRESSIVE";
    this.root.querySelector('[data-role="delta-score"]').textContent=String(delta.count).padStart(2,"0");
    this.root.querySelector('[data-role="delta-risk"]').textContent=risk;
    this.root.querySelector('[data-role="delta-meter"]').style.width=`${Math.max(2,Math.round(delta.score*100))}%`;
    this.root.querySelector('[data-role="shot-status"]').textContent=Object.values(state.timeline.clips).some(clip=>clip.shotId===shot.id)?"TIMELINE LINKED":"SHOT UNLINKED";
    this.root.classList.toggle("advanced-visible",Boolean(state.ui.advanced));

    for(const axis of CREATIVE_AXES){
      const row=this.root.querySelector(`[data-creative-axis-row="${axis.id}"]`),startChoice=shot.start.choices[axis.id],endChoice=shot.end.choices[axis.id],locked=Boolean(shot.creativeLocks[axis.id]),selected=state.ui.selectedCreativeAxisId===axis.id;
      const allowed=axis.options.filter(option=>!shot.creativeExclusions[`${axis.id}:${option.id}`]);
      row.classList.toggle("selected-axis",selected);row.classList.toggle("locked-axis",locked);row.classList.toggle("empty-pool",allowed.length===0);
      const lockButton=row.querySelector("[data-creative-lock]");lockButton.innerHTML=locked?ICON.lock:ICON.unlock;lockButton.setAttribute("aria-pressed",String(locked));lockButton.title=locked?"Unlock category for generation":"Lock category for generation";
      row.querySelector('[data-role="axis-lock-state"]').textContent=locked?"LOCKED":"GEN ACTIVE";
      row.querySelector('[data-role="axis-pool-count"]').textContent=`POOL ${allowed.length}/${axis.options.length}`;
      row.querySelector('[data-creative-pool-reset]').disabled=allowed.length===axis.options.length;
      const current=row.querySelector('[data-role="axis-current"]');
      current.innerHTML=startChoice===endChoice?`<span>${choiceLabel(axis.id,startChoice)}</span>`:`<i>${choiceLabel(axis.id,startChoice)}</i><b>→</b><em>${choiceLabel(axis.id,endChoice)}</em>`;
      row.querySelectorAll("[data-creative-option-shell]").forEach(shell=>{
        const optionId=shell.dataset.creativeOption,start=optionId===startChoice,end=optionId===endChoice,excluded=Boolean(shot.creativeExclusions[`${axis.id}:${optionId}`]);
        shell.classList.toggle("selected-start",start);shell.classList.toggle("selected-end",end);shell.classList.toggle("shared-option",start&&end);shell.classList.toggle("excluded-option",excluded);
        const main=shell.querySelector("[data-creative-option]");main.setAttribute("aria-pressed",String(start||end));main.setAttribute("aria-label",`${choiceLabel(axis.id,optionId)} · apply to ${state.ui.editScope.toUpperCase()}`);
        const startButton=shell.querySelector('[data-creative-endpoint="start"]'),bothButton=shell.querySelector('[data-creative-endpoint="both"]'),endButton=shell.querySelector('[data-creative-endpoint="end"]');
        startButton.setAttribute("aria-pressed",String(start&&!end));
        bothButton.setAttribute("aria-pressed",String(start&&end));
        endButton.setAttribute("aria-pressed",String(end&&!start));
        const poolButton=shell.querySelector("[data-creative-exclusion]");poolButton.innerHTML=excluded?ICON.plus:ICON.close;poolButton.classList.toggle("include-action",excluded);poolButton.setAttribute("aria-pressed",String(excluded));poolButton.title=excluded?"Include in generation pool":"Exclude from generation pool";
      });
      const advanced=row.querySelector(".axis-advanced");advanced?.classList.toggle("active",selected&&state.ui.advanced);
      for(const axisId of axis.advancedAxes||[]){
        const numeric=AXIS_MAP.get(axisId),control=row.querySelector(`[data-axis-control="${axisId}"]`);if(!numeric||!control)continue;
        const input=control.querySelector("input"),output=control.querySelector("output"),start=shot.start.values[axisId],end=shot.end.values[axisId],mixed=state.ui.editScope==="both"&&Math.abs(start-end)>.0001,value=state.ui.editScope==="start"?start:state.ui.editScope==="end"?end:(start+end)/2;
        control.classList.toggle("mixed",mixed);if(document.activeElement!==input)input.value=String(value);output.textContent=mixed?`${formatValue(start,numeric)} → ${formatValue(end,numeric)}`:formatValue(value,numeric);
      }
    }
    const play=this.root.querySelector("[data-dock-play]");play.textContent=state.playback.playing?"Ⅱ PAUSE":"▷ PLAY";play.classList.toggle("active",state.playback.playing);
  }
  dispose(){this.unsubscribe?.();}
}

function creativeAxisMarkup(axis){
  return `<section class="creative-axis-row" data-creative-axis-row="${axis.id}">
    <header class="creative-axis-head"><span>${axis.label}</span><div class="creative-axis-meta"><button data-creative-pool-reset="${axis.id}" title="Restore the complete generation pool"><small data-role="axis-pool-count">POOL ${axis.options.length}/${axis.options.length}</small></button><div data-role="axis-current">—</div></div></header>
    <div class="creative-option-rail">
      <div class="creative-axis-tile">
        <button class="creative-axis-main" data-creative-axis-select="${axis.id}" type="button"><i>${axis.icon}</i><b>${axis.label}</b><small data-role="axis-lock-state">GEN ACTIVE</small></button>
        <button class="creative-axis-lock" data-creative-lock="${axis.id}" type="button" aria-label="Lock ${axis.label} for generation">${ICON.unlock}</button>
      </div>
      ${axis.options.map(option=>creativeOptionMarkup(axis,option)).join("")}
    </div>
    <div class="axis-advanced">${axis.advancedAxes.length?axis.advancedAxes.map(axisId=>advancedAxisMarkup(AXIS_MAP.get(axisId))).join(""):'<p>This creative axis has no numerical override in the current renderer.</p>'}</div>
  </section>`;
}
function creativeOptionMarkup(axis,option){
  return `<div class="creative-option-shell" data-creative-option-shell data-creative-axis="${axis.id}" data-creative-option="${option.id}">
    <div class="creative-option-main" aria-hidden="true"><b>${option.label}</b></div>
    <div class="creative-endpoint-zones">
      <button data-creative-endpoint="start" data-creative-axis="${axis.id}" data-creative-option="${option.id}" type="button" aria-label="Set ${option.label} as Start"><span class="zone-icon">${ICON.start}</span></button>
      <button data-creative-endpoint="both" data-creative-axis="${axis.id}" data-creative-option="${option.id}" type="button" aria-label="Set ${option.label} as both Start and End"><span class="zone-icon both-state-mark"></span></button>
      <button data-creative-endpoint="end" data-creative-axis="${axis.id}" data-creative-option="${option.id}" type="button" aria-label="Set ${option.label} as End"><span class="zone-icon">${ICON.end}</span></button>
    </div>
    <button class="creative-pool-toggle" data-creative-exclusion data-creative-axis="${axis.id}" data-creative-option="${option.id}" type="button" aria-label="Exclude ${option.label} from generation pool">${ICON.close}</button>
  </div>`;
}
function advancedAxisMarkup(axis){if(!axis)return"";return `<label class="advanced-axis-control" data-axis-control="${axis.id}"><span><b>${axis.label}</b><small>${axis.hint}</small></span><input data-axis-input="${axis.id}" type="range" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${axis.defaultStart}"><output>—</output></label>`;}
function formatValue(value,axis){const decimals=axis.step<.1?2:axis.step<1?1:0;return `${Number(value).toFixed(decimals)}${axis.unit||""}`;}
