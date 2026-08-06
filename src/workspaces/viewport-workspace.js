import {AXIS_MAP,DEFAULT_CORRECTION,DEFAULT_TRANSFORM} from "../core/default-state.js";
import {activeShot} from "../player/shot-interpolator.js";
import {uid,clamp} from "../core/utils.js";

const HERO_AXES=["subject.positionX","subject.positionY","subject.positionZ","subject.rotationX","subject.rotationY","subject.rotationZ","subject.scale"];
const deg=value=>Number(value||0)*180/Math.PI;
const rad=value=>Number(value||0)*Math.PI/180;
const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

export class ViewportWorkspace{
  constructor({root,stage,renderer,persistence,store,commands,toast}){this.root=root;this.stage=stage;this.renderer=renderer;this.persistence=persistence;this.store=store;this.commands=commands;this.toast=toast;this.transformGesture=false;this.build();this.bind();this.unsubscribe=store.subscribe((state,meta)=>{if(meta?.label==="Playback tick")return;this.render(state,{preserveInspector:meta?.type==="gesture"});});}
  build(){
    this.root.innerHTML=`<div class="viewport-layout v43b-viewport">
      <nav class="viewport-toolbar">
        <button class="viewport-tool" data-tool="translate">TRANSLATE</button><button class="viewport-tool" data-tool="rotate">ROTATE</button><button class="viewport-tool" data-tool="scale">SCALE</button><button class="viewport-tool" data-camera-mode="editor">EDITOR CAMERA</button><button class="viewport-tool" data-camera-mode="shot">SHOT CAMERA</button>
        <span class="viewport-toolbar-spacer"></span><button class="viewport-icon-tool" data-viewport-action="frame-selected" title="Frame selected">▣</button><button class="viewport-icon-tool" data-viewport-action="frame-all" title="Frame all">⊞</button><button class="viewport-icon-tool" data-viewport-action="grid" title="Grid">#</button><button class="viewport-icon-tool" data-viewport-action="helpers" title="Helpers">◇</button>
      </nav>
      <div class="viewport-content">
        <aside class="outliner"><header><span>SCENE OUTLINER</span><button class="outliner-add" data-import="hero">+ HERO</button><button class="outliner-add" data-import="environment">+ ENV</button><button class="outliner-add" data-import="prop">+ PROP</button><button class="outliner-add" data-import="hdri">+ HDRI</button></header><div data-role="outliner-list"></div></aside>
        <section class="viewport-inspector"><header>CONTEXT INSPECTOR</header><div data-role="inspector"></div></section>
      </div>
      <input hidden data-file="hero" type="file" accept=".glb,model/gltf-binary"><input hidden data-file="environment" type="file" accept=".glb,model/gltf-binary"><input hidden data-file="prop" type="file" multiple accept=".glb,model/gltf-binary"><input hidden data-file="hdri" type="file" accept=".hdr,image/vnd.radiance">
    </div>`;
  }
  bind(){
    this.root.addEventListener("click",event=>{
      const tool=event.target.closest("[data-tool]")?.dataset.tool;if(tool)this.commands.dispatch("ui.setViewportTool",{tool});
      const cameraMode=event.target.closest("[data-camera-mode]")?.dataset.cameraMode;if(cameraMode)this.commands.dispatch("ui.setViewportCameraMode",{mode:cameraMode});
      const nodeId=event.target.closest("[data-node]")?.dataset.node;if(nodeId)this.commands.dispatch("ui.selectNode",{nodeId});
      const scope=event.target.closest("[data-scope]")?.dataset.scope;if(scope)this.commands.dispatch("ui.setScope",{scope});
      const importKind=event.target.closest("[data-import]")?.dataset.import;if(importKind)this.root.querySelector(`[data-file="${importKind}"]`)?.click();
      const action=event.target.closest("[data-viewport-action]")?.dataset.viewportAction;if(action)this.handleViewportAction(action);
      const remove=event.target.closest("[data-remove-asset]");if(remove)this.removeAsset(remove.dataset.removeAsset,remove.dataset.nodeId);
      const reset=event.target.closest("[data-reset-correction]");if(reset)this.commands.dispatch("scene.resetNodeCorrection",{nodeId:reset.dataset.resetCorrection});
    });
    this.root.querySelectorAll("[data-file]").forEach(input=>input.addEventListener("change",event=>this.importFiles(event.target.dataset.file,[...event.target.files]).finally(()=>event.target.value="")));
    this.root.addEventListener("pointerdown",event=>{const input=event.target.closest("input[data-control]");if(input)this.commands.dispatch("gesture.begin",{label:`Viewport ${input.dataset.control}`});});
    this.root.addEventListener("input",event=>{const input=event.target.closest("input[data-control]");if(input)this.handleControl(input,true);});
    this.root.addEventListener("change",event=>{const input=event.target.closest("input[data-control],select[data-control]");if(input)this.handleControl(input,false);const toggle=event.target.closest("input[data-toggle]");if(toggle)this.handleToggle(toggle);this.commands.dispatch("gesture.end");});
    this.root.addEventListener("pointerup",()=>this.commands.dispatch("gesture.end"));this.root.addEventListener("pointercancel",()=>this.commands.dispatch("gesture.cancel"));
    this.stage.addEventListener("dragover",event=>{event.preventDefault();this.stage.classList.add("drop-ready");});
    this.stage.addEventListener("dragleave",()=>this.stage.classList.remove("drop-ready"));
    this.stage.addEventListener("drop",event=>{event.preventDefault();this.stage.classList.remove("drop-ready");const files=[...(event.dataTransfer?.files||[])];if(!files.length)return;const hdr=files.filter(file=>file.name.toLowerCase().endsWith(".hdr")),glb=files.filter(file=>file.name.toLowerCase().endsWith(".glb"));if(hdr.length)this.importFiles("hdri",hdr.slice(0,1));if(glb.length){const heroIsProxy=this.store.get().assets.heroId==="hero-proxy";this.importFiles(heroIsProxy?"hero":"prop",heroIsProxy?glb.slice(0,1):glb);}});
    this.renderer.ready.then(()=>this.configureRenderer(this.store.get()));
  }
  handleViewportAction(action){
    if(action==="frame-selected")this.renderer.frameNode(this.store.get().ui.selectedNodeId,false);
    if(action==="frame-all")this.renderer.frameNode(null,true);
    if(action==="grid")this.commands.dispatch("scene.toggleGrid");
    if(action==="helpers")this.commands.dispatch("scene.toggleHelpers");
  }
  async importFiles(kind,files){
    if(!files.length)return;this.commands.dispatch("ui.setAssetBusy",{value:true});
    try{
      for(const file of files){
        if(kind!=="hdri"&&!file.name.toLowerCase().endsWith(".glb"))throw new Error("V43B.4 accepts self-contained .glb files");
        const state=this.store.get(),oldId=kind==="hero"?state.assets.heroId:kind==="environment"?state.assets.environmentId:kind==="hdri"?state.assets.hdriId:null,id=uid(kind),nodeId=kind==="prop"?`prop-${id}`:kind==="hero"?"hero-proxy":kind==="environment"?"environment-proxy":null;
        await this.persistence.putAsset({id,blob:file,name:file.name,type:file.type,kind,meta:{lastModified:file.lastModified}});
        const asset={id,type:kind,kind:"uploaded",name:file.name,status:"ready",source:"indexeddb",size:file.size,mime:file.type||"application/octet-stream",nodeId,updatedAt:new Date().toISOString()};
        const node=nodeId&&kind==="prop"?{id:nodeId,name:`Prop · ${file.name}`,type:"prop",assetId:id,visible:true,locked:false,baseTransform:structuredClone(DEFAULT_TRANSFORM),correction:structuredClone(DEFAULT_CORRECTION),helpers:{bounds:true,pivot:false}}:null;
        this.commands.dispatch("asset.register",{asset,node});if(oldId&&!oldId.endsWith("proxy")&&oldId!==id)await this.persistence.deleteAsset(oldId);this.toast?.(`${kind.toUpperCase()} READY · ${file.name}`);
      }
    }catch(error){console.error(error);this.toast?.(`IMPORT ERROR · ${error.message}`);}finally{this.commands.dispatch("ui.setAssetBusy",{value:false});}
  }
  async removeAsset(assetId,nodeId){if(!assetId||assetId.endsWith("proxy"))return;await this.persistence.deleteAsset(assetId);this.commands.dispatch("asset.remove",{assetId,nodeId});this.toast?.("ASSET REMOVED");}
  handleToggle(input){const state=this.store.get(),nodeId=state.ui.selectedNodeId;if(input.dataset.toggle==="visible")this.commands.dispatch("scene.setNodeVisible",{nodeId,value:input.checked});if(input.dataset.toggle==="autoNormalize")this.commands.dispatch("scene.setNodeCorrection",{nodeId,field:"autoNormalize",value:input.checked});if(input.dataset.toggle==="autoGround")this.commands.dispatch("scene.setNodeCorrection",{nodeId,field:"autoGround",value:input.checked});if(input.dataset.toggle==="hdriBackground")this.commands.dispatch("scene.setEnvironment",{field:"backgroundVisible",value:input.checked});}
  handleControl(input,gesture){
    const state=this.store.get(),nodeId=state.ui.selectedNodeId,node=state.scene.nodes[nodeId],key=input.dataset.control,value=Number(input.value);if(!node)return;
    if(key.startsWith("shot:")){this.commands.dispatch("shot.setAxis",{axisId:key.slice(5),value,gesture});return;}
    if(key.startsWith("base:")){const [_,part,indexText]=key.split(":"),index=Number(indexText),transform=structuredClone(node.baseTransform);transform[part][index]=part==="rotation"?rad(value):value;this.commands.dispatch("scene.setNodeTransform",{nodeId,transform,gesture});return;}
    if(key.startsWith("correction:")){const [_,part,indexText]=key.split(":"),index=Number(indexText),correction=structuredClone(node.correction);if(indexText!=null){correction[part][index]=part==="rotation"?rad(value):value;this.commands.dispatch("scene.setNodeCorrection",{nodeId,field:part,value:correction[part],gesture});}else this.commands.dispatch("scene.setNodeCorrection",{nodeId,field:part,value,gesture});return;}
    if(key.startsWith("environment:"))this.commands.dispatch("scene.setEnvironment",{field:key.slice(12),value});if(key.startsWith("renderer:"))this.commands.dispatch("scene.setRenderer",{field:key.slice(9),value});
  }
  configureRenderer(state){
    this.renderer.setEditorCamera(state.scene.editorCamera);this.renderer.configureViewport({nodeId:state.ui.selectedNodeId,tool:state.ui.viewportTool,cameraMode:state.scene.viewportCameraMode,
      onTransformStart:()=>{this.transformGesture=true;this.commands.dispatch("gesture.begin",{label:"Transform gizmo"});},
      onTransformChange:transform=>this.onGizmoTransform(transform),onTransformEnd:()=>{if(this.transformGesture)this.commands.dispatch("gesture.end");this.transformGesture=false;},
      onCameraChange:camera=>this.commands.dispatch("scene.setEditorCamera",{camera}),onCameraEnd:()=>{} });
  }
  onGizmoTransform({nodeId,position,rotation,scale}){
    const state=this.store.get(),node=state.scene.nodes[nodeId];if(!node)return;
    if(node.type==="hero"){
      const base=node.baseTransform||DEFAULT_TRANSFORM,uniform=(scale[0]+scale[1]+scale[2])/3/Math.max(.0001,(base.scale[0]+base.scale[1]+base.scale[2])/3);
      const values={"subject.positionX":position[0]-base.position[0],"subject.positionY":position[1]-base.position[1],"subject.positionZ":position[2]-base.position[2],"subject.rotationX":deg(rotation[0]-base.rotation[0]),"subject.rotationY":deg(rotation[1]-base.rotation[1]),"subject.rotationZ":deg(rotation[2]-base.rotation[2]),"subject.scale":uniform};
      for(const [axisId,value] of Object.entries(values))this.commands.dispatch("shot.setAxis",{axisId,value,gesture:true});
    }else this.commands.dispatch("scene.setNodeTransform",{nodeId,transform:{position,rotation,scale},gesture:true});
  }
  render(state,{preserveInspector=false}={}){
    const selected=state.scene.nodes[state.ui.selectedNodeId]||state.scene.nodes["hero-proxy"];this.renderOutliner(state);if(!preserveInspector)this.renderInspector(state,selected);this.root.querySelectorAll("[data-tool]").forEach(button=>button.classList.toggle("active",button.dataset.tool===state.ui.viewportTool));this.root.querySelectorAll("[data-camera-mode]").forEach(button=>button.classList.toggle("active",button.dataset.cameraMode===state.scene.viewportCameraMode));this.root.querySelector('[data-viewport-action="grid"]')?.classList.toggle("active",state.scene.showGrid!==false);this.root.querySelector('[data-viewport-action="helpers"]')?.classList.toggle("active",state.scene.showHelpers!==false);if(!preserveInspector)this.configureRenderer(state);
  }
  renderOutliner(state){
    const order=["hero-proxy","environment-proxy",...(state.assets.secondaryIds||[]).map(id=>state.assets.byId[id]?.nodeId).filter(Boolean),"camera-main","camera-editor","light-default"],icons={hero:"◆",environment:"▦",prop:"◇",camera:"◉","editor-camera":"◎",light:"✦"};
    this.root.querySelector('[data-role="outliner-list"]').innerHTML=order.map(id=>{const node=state.scene.nodes[id];if(!node)return"";const asset=node.assetId&&state.assets.byId[node.assetId],status=asset?.source==="indexeddb"?"LOCAL":asset?.source==="builtin"?"BUILTIN":"SCENE";return `<button class="scene-node ${state.ui.selectedNodeId===id?"active":""}" data-node="${id}"><i>${icons[node.type]||"◇"}</i><span><b>${esc(node.name)}</b><small>${status}${node.visible===false?" · HIDDEN":""}</small></span><em>${node.locked?"LOCK":"●"}</em></button>`;}).join("");
  }
  renderInspector(state,node){
    const shot=activeShot(state),asset=node.assetId?state.assets.byId[node.assetId]:null,hero=node.type==="hero",editable=["hero","environment","prop"].includes(node.type),scope=`<section class="section"><header class="section-header"><span>ENDPOINT SCOPE</span><b>SHOT LINKED</b></header><div class="section-body"><div class="scope-row"><button data-scope="start" class="${state.ui.editScope==="start"?"active":""}">START</button><button data-scope="both" class="${state.ui.editScope==="both"?"active":""}">BOTH</button><button data-scope="end" class="${state.ui.editScope==="end"?"active":""}">END</button></div></div></section>`;
    let html=`${hero?scope:""}<section class="section"><header class="section-header"><span>SELECTED NODE</span><b>${esc(node.type.toUpperCase())}</b></header><div class="section-body"><div class="node-identity"><b>${esc(node.name)}</b><small>${asset?`${formatBytes(asset.size)} · ${esc(asset.source)}`:"SCENE SERVICE"}</small></div>${editable?`<div class="viewport-toggle-row"><label><input data-toggle="visible" type="checkbox" ${node.visible!==false?"checked":""}>VISIBLE</label><button data-viewport-action="frame-selected">FRAME</button>${asset&&asset.source==="indexeddb"?`<button class="danger" data-remove-asset="${asset.id}" data-node-id="${node.id}">REMOVE</button>`:""}</div>`:""}</div></section>`;
    if(hero)html+=`<section class="section"><header class="section-header"><span>SHOT TRANSFORM</span><b>START / END</b></header><div class="section-body"><div class="axis-list compact">${HERO_AXES.map(id=>shotAxis(id,state,shot)).join("")}</div></div></section>`;
    else if(editable)html+=`<section class="section"><header class="section-header"><span>NODE TRANSFORM</span><b>SCENE BASE</b></header><div class="section-body">${transformControls(node.baseTransform,"base")}</div></section>`;
    if(editable)html+=`<section class="section correction-section"><header class="section-header"><span>IMPORT CORRECTION</span><b>NON-DESTRUCTIVE</b></header><div class="section-body"><div class="viewport-toggle-row"><label><input data-toggle="autoNormalize" type="checkbox" ${node.correction?.autoNormalize!==false?"checked":""}>AUTO NORMALIZE</label><label><input data-toggle="autoGround" type="checkbox" ${node.correction?.autoGround!==false?"checked":""}>AUTO GROUND</label><button data-reset-correction="${node.id}">RESET</button></div>${correctionControls(node.correction)}</div></section>`;
    html+=`<section class="section"><header class="section-header"><span>WORLD / HDRI</span><b>${state.assets.hdriId?esc(state.assets.byId[state.assets.hdriId]?.name):"STUDIO FALLBACK"}</b></header><div class="section-body"><div class="viewport-toggle-row"><label><input data-toggle="hdriBackground" type="checkbox" ${state.scene.environment.backgroundVisible?"checked":""}>SHOW HDRI BG</label></div>${simpleControl("environment:intensity","ENV INTENSITY",state.scene.environment.intensity,0,3,.01)}${simpleControl("environment:rotation","HDRI ROTATION",state.scene.environment.rotation,-180,180,1)}${simpleControl("environment:blur","BG BLUR",state.scene.environment.blur,0,1,.01)}${simpleControl("renderer:exposure","EXPOSURE",state.scene.rendererSettings.exposure,.1,3,.01)}</div></section>`;
    this.root.querySelector('[data-role="inspector"]').innerHTML=html;
  }
  dispose(){this.unsubscribe?.();}
}
function shotAxis(axisId,state,shot){const axis=AXIS_MAP.get(axisId),start=shot.start.values[axisId],end=shot.end.values[axisId],scope=state.ui.editScope,value=scope==="start"?start:scope==="end"?end:(start+end)/2,mixed=scope==="both"&&Math.abs(start-end)>.0001;return `<label class="axis-control ${mixed?"mixed":""}"><span class="axis-label"><b>${axis.label}</b><small>${axis.hint}</small></span><input data-control="shot:${axisId}" type="range" min="${axis.min}" max="${axis.max}" step="${axis.step}" value="${value}"><output>${mixed?`${fmt(start,axis)} → ${fmt(end,axis)}`:fmt(value,axis)}</output></label>`;}
function transformControls(transform,prefix){return `<div class="vector-grid">${["position","rotation","scale"].map(part=>`<fieldset><legend>${part.toUpperCase()}</legend>${[0,1,2].map((index)=>simpleControl(`${prefix}:${part}:${index}`,"XYZ"[index],part==="rotation"?deg(transform[part][index]):transform[part][index],part==="scale"?.01:part==="rotation"?-180:-30,part==="scale"?20:part==="rotation"?180:30,part==="rotation"?1:.01)).join("")}</fieldset>`).join("")}</div>`;}
function correctionControls(correction={}){const c={...DEFAULT_CORRECTION,...correction};return `<div class="vector-grid">${["pivot","rotation","scale"].map(part=>`<fieldset><legend>${part.toUpperCase()}</legend>${[0,1,2].map(index=>simpleControl(`correction:${part}:${index}`,"XYZ"[index],part==="rotation"?deg(c[part][index]):c[part][index],part==="scale"?.01:part==="rotation"?-180:-20,part==="scale"?20:part==="rotation"?180:20,part==="rotation"?1:.01)).join("")}</fieldset>`).join("")}</div>${simpleControl("correction:groundOffset","GROUND OFFSET",c.groundOffset,-10,10,.01)}`;}
function simpleControl(key,label,value,min,max,step){return `<label class="mini-control"><span>${label}</span><input data-control="${key}" type="number" value="${Number(value).toFixed(step<.1?2:0)}" min="${min}" max="${max}" step="${step}"></label>`;}
function fmt(value,axis){return `${Number(value).toFixed(axis.step<.1?2:0)}${axis.unit||""}`;}
function formatBytes(size=0){if(!size)return"BUILTIN";if(size<1024*1024)return`${Math.round(size/1024)} KB`;return`${(size/1024/1024).toFixed(1)} MB`;}
