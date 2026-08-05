import {AXIS_MAP} from "../core/default-state.js";
import {FAMILIES,presetsForFamily} from "../shots/presets.js";
import {CREATIVE_AXES,choiceLabel} from "../shots/creative-axes.js";
import {activeShot,deltaSummary} from "../player/shot-interpolator.js";

export class RenderWorkspace{
  constructor({root,store,commands,toast}){this.root=root;this.store=store;this.commands=commands;this.toast=toast;this.build();this.bind();this.unsubscribe=store.subscribe((state,meta)=>{if(meta?.label==="Playback tick")return;this.render(state);});}
  build(){
    this.root.innerHTML=`<div class="render-editor">
      <div class="render-editor-scroll">
        <header class="render-editor-head">
          <div class="shot-identity"><small>SHOT CREATION</small><b data-role="active-shot">—</b><span>V36C AXIS GRAMMAR · SHARED STATE</span></div>
          <div class="shot-assets"><article><span>HERO</span><b data-role="hero-name">CALIBRATED PROXY</b></article><article><span>WORLD</span><b data-role="environment-name">DARK STUDIO</b></article><em data-role="shot-status">UNLINKED</em></div>
        </header>
        <section class="creation-rails">
          <div class="compact-rail-row"><header><span>SHOT FAMILY</span><b>01</b></header><div class="family-rail compact" data-role="families">${FAMILIES.map(f=>`<button class="family-button" data-family="${f.id}"><b>${f.label}</b><small>${f.description}</small></button>`).join("")}</div></div>
          <div class="compact-rail-row"><header><span>PRESETS</span><b data-role="preset-count">00</b></header><div class="preset-grid compact" data-role="presets"></div></div>
          <div class="creation-command-bar">
            <div class="generation-buttons"><button data-command="near">NEAR</button><button class="primary" data-command="balanced">BALANCED</button><button data-command="bold">BOLD</button><button data-command="reset">RESET</button></div>
            <div class="scope-row editor-scope"><button data-scope="start">START</button><button data-scope="both">BOTH</button><button data-scope="end">END</button></div>
            <div class="delta-readout"><span>CONTROLLED DELTA</span><b data-role="delta-score">00</b><em data-role="delta-risk">STABLE</em></div>
          </div>
        </section>
        <div class="creative-axis-matrix" data-role="creative-axis-matrix">${CREATIVE_AXES.map(axis=>creativeAxisMarkup(axis)).join("")}</div>
      </div>
      <footer class="editor-delta-dock">
        <div class="delta-track"><i data-role="delta-meter"></i><b></b></div>
        <div class="delta-dock-actions"><button data-dock-scope="start"><span>▣</span> START</button><button data-dock-play>▷ PLAY</button><button data-dock-scope="end">END <span>▣</span></button></div>
      </footer>
    </div>`;
  }
  bind(){
    this.root.addEventListener("click",event=>{
      const family=event.target.closest("[data-family]")?.dataset.family;if(family)this.commands.dispatch("shot.setFamily",{family});
      const presetId=event.target.closest("[data-preset]")?.dataset.preset;if(presetId){this.commands.dispatch("shot.applyPreset",{presetId});this.toast?.(`PRESET APPLIED · ${presetId.toUpperCase()}`);}
      const scope=event.target.closest("[data-scope]")?.dataset.scope||event.target.closest("[data-dock-scope]")?.dataset.dockScope;if(scope)this.commands.dispatch("ui.setScope",{scope});
      const command=event.target.closest("[data-command]")?.dataset.command;
      if(["near","balanced","bold"].includes(command))this.commands.dispatch("shot.generateVariant",{mode:command});
      if(command==="reset")this.commands.dispatch("shot.reset");
      if(event.target.closest("[data-dock-play]"))this.commands.dispatch("playback.toggle");
      const option=event.target.closest("[data-creative-option]");if(option)this.commands.dispatch("shot.setCreativeChoice",{axisId:option.dataset.creativeAxis,optionId:option.dataset.creativeOption});
      const lock=event.target.closest("[data-creative-lock]");if(lock)this.commands.dispatch("shot.toggleCreativeLock",{axisId:lock.dataset.creativeLock});
      const row=event.target.closest("[data-creative-axis-row]");if(row&&!option&&!lock)this.commands.dispatch("ui.selectCreativeAxis",{axisId:row.dataset.creativeAxisRow});
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
    this.root.querySelector('[data-role="active-shot"]').textContent=shot.name;
    this.root.querySelector('[data-role="hero-name"]').textContent=state.assets.byId[state.assets.heroId]?.name||"HERO";
    this.root.querySelector('[data-role="environment-name"]').textContent=state.assets.byId[state.assets.environmentId]?.name||"ENVIRONMENT";
    this.root.querySelectorAll("[data-family]").forEach(button=>button.classList.toggle("active",button.dataset.family===shot.family));
    const presetHost=this.root.querySelector('[data-role="presets"]');presetHost.innerHTML=familyPresets.map(preset=>`<button class="preset-card compact ${shot.presetId===preset.id?"active":""}" data-preset="${preset.id}"><b>${preset.title}</b><small>${preset.duration}F</small></button>`).join("");
    this.root.querySelector('[data-role="preset-count"]').textContent=String(familyPresets.length).padStart(2,"0");
    this.root.querySelectorAll("[data-scope],[data-dock-scope]").forEach(button=>button.classList.toggle("active",(button.dataset.scope||button.dataset.dockScope)===state.ui.editScope));
    const risk=delta.score<.26?"STABLE":delta.score<.56?"ACTIVE":"AGGRESSIVE";this.root.querySelector('[data-role="delta-score"]').textContent=String(delta.count).padStart(2,"0");this.root.querySelector('[data-role="delta-risk"]').textContent=risk;this.root.querySelector('[data-role="delta-meter"]').style.width=`${Math.max(2,Math.round(delta.score*100))}%`;
    this.root.querySelector('[data-role="shot-status"]').textContent=Object.values(state.timeline.clips).some(clip=>clip.shotId===shot.id)?"TIMELINE LINKED":"SHOT UNLINKED";
    this.root.classList.toggle("advanced-visible",Boolean(state.ui.advanced));
    for(const axis of CREATIVE_AXES){
      const row=this.root.querySelector(`[data-creative-axis-row="${axis.id}"]`),startChoice=shot.start.choices[axis.id],endChoice=shot.end.choices[axis.id],locked=Boolean(shot.creativeLocks?.[axis.id]),selected=state.ui.selectedCreativeAxisId===axis.id;
      row.classList.toggle("selected-axis",selected);row.classList.toggle("locked-axis",locked);row.querySelector('[data-role="creative-lock-state"]').textContent=locked?"▣":"▢";
      const current=row.querySelector('[data-role="axis-current"]');current.innerHTML=startChoice===endChoice?`<span>${choiceLabel(axis.id,startChoice)}</span>`:`<i>${choiceLabel(axis.id,startChoice)}</i><b>→</b><em>${choiceLabel(axis.id,endChoice)}</em>`;
      row.querySelectorAll("[data-creative-option]").forEach(button=>{const optionId=button.dataset.creativeOption;button.classList.toggle("selected-start",optionId===startChoice);button.classList.toggle("selected-end",optionId===endChoice);button.setAttribute("aria-pressed",String(optionId===startChoice||optionId===endChoice));});
      const advanced=row.querySelector(".axis-advanced");advanced?.classList.toggle("active",selected&&state.ui.advanced);
      for(const axisId of axis.advancedAxes||[]){const numeric=AXIS_MAP.get(axisId),control=row.querySelector(`[data-axis-control="${axisId}"]`);if(!numeric||!control)continue;const input=control.querySelector("input"),output=control.querySelector("output"),start=shot.start.values[axisId],end=shot.end.values[axisId],mixed=state.ui.editScope==="both"&&Math.abs(start-end)>.0001,value=state.ui.editScope==="start"?start:state.ui.editScope==="end"?end:(start+end)/2;control.classList.toggle("mixed",mixed);if(document.activeElement!==input)input.value=String(value);output.textContent=mixed?`${formatValue(start,numeric)} → ${formatValue(end,numeric)}`:formatValue(value,numeric);}
    }
    const play=this.root.querySelector("[data-dock-play]");play.textContent=state.playback.playing?"Ⅱ PAUSE":"▷ PLAY";play.classList.toggle("active",state.playback.playing);
  }
  dispose(){this.unsubscribe?.();}
}

function creativeAxisMarkup(axis){
  return `<section class="creative-axis-row" data-creative-axis-row="${axis.id}">
    <header class="creative-axis-head"><span>${axis.label}</span><div data-role="axis-current">—</div></header>
    <div class="creative-option-rail">
      <button class="creative-axis-tile" data-creative-lock="${axis.id}" title="Lock axis for generation"><i>${axis.icon}</i><span data-role="creative-lock-state">▢</span></button>
      ${axis.options.map(option=>`<button class="creative-option" data-creative-axis="${axis.id}" data-creative-option="${option.id}"><b>${option.label}</b><span class="endpoint-marks"><i></i><em></em></span></button>`).join("")}
    </div>
    <div class="axis-advanced">${axis.advancedAxes.length?axis.advancedAxes.map(axisId=>advancedAxisMarkup(AXIS_MAP.get(axisId))).join(""):'<p>This creative axis has no numerical override in the foundation renderer.</p>'}</div>
  </section>`;
}
function advancedAxisMarkup(axis){if(!axis)return"";return `<label class="advanced-axis-control" data-axis-control="${axis.id}"><span><b>${axis.label}</b><small>${axis.hint}</small></span><input data-axis-input="${axis.id}" type="range" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${axis.defaultStart}"><output>—</output></label>`;}
function formatValue(value,axis){const decimals=axis.step<.1?2:axis.step<1?1:0;return `${Number(value).toFixed(decimals)}${axis.unit||""}`;}
