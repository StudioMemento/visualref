import {AXES} from "../core/default-state.js";
import {FAMILIES,presetsForFamily} from "../shots/presets.js";
import {activeShot,deltaSummary} from "../player/shot-interpolator.js";

export class RenderWorkspace{
  constructor({root,store,commands,toast}){this.root=root;this.store=store;this.commands=commands;this.toast=toast;this.build();this.bind();this.unsubscribe=store.subscribe((state,meta)=>{if(meta?.label==="Playback tick")return;this.render(state);});}
  build(){
    const groups=["Frame","Subject","World"];
    this.root.innerHTML=`<div class="panel-scroll"><header class="panel-head"><div><small>SHOT CREATION</small><b data-role="active-shot">—</b><em>V36C grammar · normalized state</em></div><span class="badge" data-role="shot-status">LINKED</span></header>
      <div class="asset-summary"><article><span>HERO</span><b data-role="hero-name">CALIBRATED PROXY</b><small>REAL THREE.JS</small></article><article><span>ENVIRONMENT</span><b data-role="environment-name">DARK STUDIO</b><small>READY</small></article></div>
      <section class="section"><header class="section-header"><span>SHOT FAMILY</span><b>01</b></header><div class="section-body"><div class="family-rail" data-role="families">${FAMILIES.map(f=>`<button class="family-button" data-family="${f.id}"><b>${f.label}</b><small>${f.description}</small></button>`).join('')}</div></div></section>
      <section class="section"><header class="section-header"><span>FAMILY PRESETS</span><b data-role="preset-count">0</b></header><div class="section-body"><div class="preset-grid" data-role="presets"></div></div></section>
      <section class="section"><header class="section-header"><span>GENERATE / RESET</span><b>DETERMINISTIC</b></header><div class="section-body"><div class="command-row"><button data-command="near">NEAR</button><button class="primary" data-command="balanced">BALANCED</button><button data-command="bold">BOLD</button><button data-command="reset">RESET SHOT</button><button data-command="play">PLAY SHOT</button><button data-command="add">ADD TO TIMELINE</button></div></div></section>
      <section class="section"><header class="section-header"><span>EDIT SCOPE</span><b>START · BOTH · END</b></header><div class="section-body"><div class="scope-row"><button data-scope="start">START</button><button data-scope="both">BOTH</button><button data-scope="end">END</button></div></div></section>
      <section class="delta-summary"><div class="delta-top"><span>CONTROLLED DELTA</span><b data-role="delta-score">00</b><em data-role="delta-risk">STABLE</em></div><div class="delta-chips" data-role="delta-chips"></div></section>
      <div class="axis-groups">${groups.map(group=>`<section class="axis-group"><header>${group.toUpperCase()}</header><div class="axis-list">${AXES.filter(axis=>axis.group===group).map(axis=>axisMarkup(axis)).join('')}</div></section>`).join('')}</div>
      <div class="final-action"><button data-final-action>ADD / UPDATE SHOT</button></div>
    </div>`;
  }
  bind(){
    this.root.addEventListener('click',event=>{
      const family=event.target.closest('[data-family]')?.dataset.family;if(family)this.commands.dispatch('shot.setFamily',{family});
      const presetId=event.target.closest('[data-preset]')?.dataset.preset;if(presetId){this.commands.dispatch('shot.applyPreset',{presetId});this.toast?.('PRESET APPLIED · '+presetId.toUpperCase());}
      const scope=event.target.closest('[data-scope]')?.dataset.scope;if(scope)this.commands.dispatch('ui.setScope',{scope});
      const command=event.target.closest('[data-command]')?.dataset.command;
      if(command==='near'||command==='balanced'||command==='bold')this.commands.dispatch('shot.generateVariant',{mode:command});
      if(command==='reset')this.commands.dispatch('shot.reset');
      if(command==='play')this.commands.dispatch('playback.toggle');
      if(command==='add'||event.target.closest('[data-final-action]'))this.commands.dispatch('shot.addToTimeline',{trackId:'v1'});
    });
    this.root.querySelectorAll('[data-axis-input]').forEach(input=>{
      const axisId=input.dataset.axisInput;
      input.addEventListener('pointerdown',()=>this.commands.dispatch('gesture.begin',{label:`Edit ${axisId}`}));
      input.addEventListener('input',event=>this.commands.dispatch('shot.setAxis',{axisId,value:Number(event.target.value),gesture:true}));
      input.addEventListener('change',()=>this.commands.dispatch('gesture.end'));
      input.addEventListener('pointerup',()=>this.commands.dispatch('gesture.end'));
      input.addEventListener('pointercancel',()=>this.commands.dispatch('gesture.cancel'));
    });
  }
  render(state){
    const shot=activeShot(state),delta=deltaSummary(state),familyPresets=presetsForFamily(shot.family);
    this.root.querySelector('[data-role="active-shot"]').textContent=shot.name;
    this.root.querySelector('[data-role="hero-name"]').textContent=state.assets.byId[state.assets.heroId]?.name||'HERO';
    this.root.querySelector('[data-role="environment-name"]').textContent=state.assets.byId[state.assets.environmentId]?.name||'ENVIRONMENT';
    this.root.querySelectorAll('[data-family]').forEach(button=>button.classList.toggle('active',button.dataset.family===shot.family));
    const presetHost=this.root.querySelector('[data-role="presets"]');presetHost.innerHTML=familyPresets.map(preset=>`<button class="preset-card ${shot.presetId===preset.id?'active':''}" data-preset="${preset.id}"><span class="preset-thumb"></span><b>${preset.title}</b><small>${preset.duration}F · ${preset.description}</small></button>`).join('');
    this.root.querySelector('[data-role="preset-count"]').textContent=String(familyPresets.length).padStart(2,'0');
    this.root.querySelectorAll('[data-scope]').forEach(button=>button.classList.toggle('active',button.dataset.scope===state.ui.editScope));
    const risk=delta.score<.26?'STABLE':delta.score<.56?'ACTIVE':'AGGRESSIVE';this.root.querySelector('[data-role="delta-score"]').textContent=String(delta.count).padStart(2,'0');this.root.querySelector('[data-role="delta-risk"]').textContent=risk;
    this.root.querySelector('[data-role="delta-chips"]').innerHTML=AXES.map(axis=>{const changed=Math.abs(shot.start.values[axis.id]-shot.end.values[axis.id])>.0001;return `<span class="delta-chip ${changed?'changed':''}">${axis.label.toUpperCase()}${changed?' · Δ':''}</span>`}).join('');
    for(const axis of AXES){
      const control=this.root.querySelector(`[data-axis-control="${axis.id}"]`),input=control.querySelector('input'),output=control.querySelector('output'),start=shot.start.values[axis.id],end=shot.end.values[axis.id],mixed=Math.abs(start-end)>.0001&&state.ui.editScope==='both';let display=state.ui.editScope==='start'?start:state.ui.editScope==='end'?end:(start+end)/2;
      control.classList.toggle('mixed',mixed);if(document.activeElement!==input)input.value=String(display);output.textContent=mixed?`${formatValue(start,axis)} → ${formatValue(end,axis)}`:formatValue(display,axis);
    }
    this.root.querySelector('[data-role="shot-status"]').textContent=Object.values(state.timeline.clips).some(clip=>clip.shotId===shot.id)?'LINKED TO TIMELINE':'UNLINKED';
  }
  dispose(){this.unsubscribe?.();}
}
function axisMarkup(axis){return `<label class="axis-control" data-axis-control="${axis.id}"><span class="axis-label"><b>${axis.label}</b><small>${axis.hint}</small></span><input data-axis-input="${axis.id}" type="range" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${axis.defaultStart}"><output>—</output></label>`;}
function formatValue(value,axis){const decimals=axis.step<.1?2:axis.step<1?1:0;return `${Number(value).toFixed(decimals)}${axis.unit||''}`;}
