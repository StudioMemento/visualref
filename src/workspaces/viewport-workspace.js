import {AXIS_MAP} from "../core/default-state.js";
import {activeShot} from "../player/shot-interpolator.js";
import {clamp} from "../core/utils.js";

const TRANSFORM_AXES=["subject.positionX","subject.positionY","subject.scale","subject.rotationY"];

export class ViewportWorkspace{
  constructor({root,stage,store,commands,toast}){this.root=root;this.stage=stage;this.store=store;this.commands=commands;this.toast=toast;this.drag=null;this.build();this.bind();this.unsubscribe=store.subscribe((state,meta)=>{if(meta?.label==="Playback tick")return;this.render(state);});}
  build(){
    const nodes=[['hero-proxy','◆','HERO'],['environment-proxy','▦','ENVIRONMENT'],['camera-main','◉','CAMERA'],['light-default','✦','LIGHT RIG']];
    this.root.innerHTML=`<div class="viewport-layout"><nav class="viewport-toolbar"><button class="viewport-tool" data-tool="translate">TRANSLATE</button><button class="viewport-tool" data-tool="rotate">ROTATE</button><button class="viewport-tool" data-tool="scale">SCALE</button><button class="viewport-tool" data-tool="orbit">ORBIT VIEW</button></nav><div class="viewport-content"><aside class="outliner"><header>SCENE OUTLINER</header>${nodes.map(([id,icon,label])=>`<button class="scene-node" data-node="${id}"><i>${icon}</i><span>${label}</span><small>●</small></button>`).join('')}</aside><section class="viewport-inspector"><header>DIRECT SCENE CONTROL</header><section class="section"><header class="section-header"><span>ENDPOINT SCOPE</span><b>SHOT LINKED</b></header><div class="section-body"><div class="scope-row"><button data-scope="start">START</button><button data-scope="both">BOTH</button><button data-scope="end">END</button></div></div></section><section class="section"><header class="section-header"><span>SELECTED NODE</span><b data-role="selected-node-label">HERO</b></header><div class="section-body"><p class="transform-note">Drag directly inside the Player with the active tool. Viewport edits the same Start/End Shot state used by Render.</p><div class="axis-list">${TRANSFORM_AXES.map(axisId=>axisMarkup(AXIS_MAP.get(axisId))).join('')}</div></div></section><section class="section"><header class="section-header"><span>FOUNDATION STATUS</span><b>REAL THREE.JS</b></header><div class="section-body"><div class="asset-summary" style="padding:0"><article><span>HERO SOURCE</span><b>CALIBRATED PROXY</b><small>GLB SLOT NEXT</small></article><article><span>ENVIRONMENT</span><b>DARK STUDIO</b><small>HDRI SLOT NEXT</small></article></div></div></section></section></div></div>`;
  }
  bind(){
    this.root.addEventListener('click',event=>{
      const tool=event.target.closest('[data-tool]')?.dataset.tool;if(tool)this.commands.dispatch('ui.setViewportTool',{tool});
      const nodeId=event.target.closest('[data-node]')?.dataset.node;if(nodeId)this.commands.dispatch('ui.selectNode',{nodeId});
      const scope=event.target.closest('[data-scope]')?.dataset.scope;if(scope)this.commands.dispatch('ui.setScope',{scope});
    });
    this.root.querySelectorAll('[data-axis-input]').forEach(input=>{
      const axisId=input.dataset.axisInput;input.addEventListener('pointerdown',()=>this.commands.dispatch('gesture.begin',{label:`Viewport ${axisId}`}));input.addEventListener('input',event=>this.commands.dispatch('shot.setAxis',{axisId,value:Number(event.target.value),gesture:true}));input.addEventListener('pointerup',()=>this.commands.dispatch('gesture.end'));input.addEventListener('change',()=>this.commands.dispatch('gesture.end'));input.addEventListener('pointercancel',()=>this.commands.dispatch('gesture.cancel'));
    });
    this.stage.addEventListener('pointerdown',event=>this.beginStageDrag(event));
    this.stage.addEventListener('pointermove',event=>this.moveStageDrag(event));
    this.stage.addEventListener('pointerup',event=>this.endStageDrag(event));
    this.stage.addEventListener('pointercancel',event=>this.cancelStageDrag(event));
  }
  endpointValue(state,axisId){const shot=activeShot(state),scope=state.ui.editScope,start=shot.start.values[axisId],end=shot.end.values[axisId];return scope==='start'?start:scope==='end'?end:(start+end)/2;}
  beginStageDrag(event){
    if(event.button!==0)return;const state=this.store.get(),tool=state.ui.viewportTool;this.stage.setPointerCapture(event.pointerId);this.drag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,tool,values:Object.fromEntries(['subject.positionX','subject.positionY','subject.scale','subject.rotationY','camera.distance','camera.height'].map(id=>[id,this.endpointValue(state,id)]))};this.commands.dispatch('gesture.begin',{label:`Viewport ${tool}`});
  }
  moveStageDrag(event){
    if(!this.drag||event.pointerId!==this.drag.pointerId)return;const dx=event.clientX-this.drag.x,dy=event.clientY-this.drag.y,tool=this.drag.tool;
    if(tool==='translate'){
      this.commands.dispatch('shot.setAxis',{axisId:'subject.positionX',value:this.drag.values['subject.positionX']+dx/260,gesture:true});
      this.commands.dispatch('shot.setAxis',{axisId:'subject.positionY',value:this.drag.values['subject.positionY']-dy/260,gesture:true});
    }else if(tool==='rotate')this.commands.dispatch('shot.setAxis',{axisId:'subject.rotationY',value:this.drag.values['subject.rotationY']+dx*.55,gesture:true});
    else if(tool==='scale')this.commands.dispatch('shot.setAxis',{axisId:'subject.scale',value:this.drag.values['subject.scale']-dy/260,gesture:true});
    else if(tool==='orbit'){
      this.commands.dispatch('shot.setAxis',{axisId:'camera.distance',value:this.drag.values['camera.distance']+dy/140,gesture:true});
      this.commands.dispatch('shot.setAxis',{axisId:'camera.height',value:this.drag.values['camera.height']+dx/420,gesture:true});
    }
  }
  endStageDrag(event){if(!this.drag||event.pointerId!==this.drag.pointerId)return;this.drag=null;this.commands.dispatch('gesture.end');}
  cancelStageDrag(event){if(!this.drag||event.pointerId!==this.drag.pointerId)return;this.drag=null;this.commands.dispatch('gesture.cancel');}
  render(state){
    this.root.querySelectorAll('[data-tool]').forEach(button=>button.classList.toggle('active',button.dataset.tool===state.ui.viewportTool));this.root.querySelectorAll('[data-node]').forEach(button=>button.classList.toggle('active',button.dataset.node===state.ui.selectedNodeId));this.root.querySelectorAll('[data-scope]').forEach(button=>button.classList.toggle('active',button.dataset.scope===state.ui.editScope));
    this.root.querySelector('[data-role="selected-node-label"]').textContent=state.scene.nodes[state.ui.selectedNodeId]?.name?.toUpperCase()||'SCENE NODE';const shot=activeShot(state);
    for(const axisId of TRANSFORM_AXES){const axis=AXIS_MAP.get(axisId),control=this.root.querySelector(`[data-axis-control="${axisId}"]`),input=control.querySelector('input'),output=control.querySelector('output'),start=shot.start.values[axisId],end=shot.end.values[axisId],mixed=state.ui.editScope==='both'&&Math.abs(start-end)>.0001,value=state.ui.editScope==='start'?start:state.ui.editScope==='end'?end:(start+end)/2;control.classList.toggle('mixed',mixed);if(document.activeElement!==input)input.value=String(value);output.textContent=mixed?`${fmt(start,axis)} → ${fmt(end,axis)}`:fmt(value,axis);}
  }
  dispose(){this.unsubscribe?.();}
}
function axisMarkup(axis){return `<label class="axis-control" data-axis-control="${axis.id}"><span class="axis-label"><b>${axis.label}</b><small>${axis.hint}</small></span><input data-axis-input="${axis.id}" type="range" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${axis.defaultStart}"><output>—</output></label>`;}
function fmt(value,axis){return `${Number(value).toFixed(axis.step<.1?2:0)}${axis.unit||''}`;}
