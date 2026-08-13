import {evaluateShot} from "https://cdn.jsdelivr.net/gh/StudioMemento/visualref@48ff1e50424da0a0546ade9039f00368073f56f2/src/player/shot-interpolator.js";

/* ============================================================================
   MEMENTO VISUALREF V46A WORKFLOW CONTROLLER
   Additive runtime layer over the frozen V45 core.

   V46A changes product entry, presentation and control ownership without
   replacing the scene/store/history engine. The overlay is intentionally
   isolated so the V45 project remains recoverable.
   ========================================================================== */

const GUIDE_KEY="memento.visualref.v46.guide.dismissed";
const TAB_KEY="memento.visualref.v46.viewport.tab";
const PRECISION_KEY="memento.visualref.v46.precision.open";
const TIMELINE_KEY="memento.visualref.v46.timeline.onboarded";
const ROTATION_KEY_PREFIX="memento.visualref.v46a.subject.";
const GROUND_KEY_PREFIX="memento.visualref.v46a.ground.";
const RENDER_MONITOR_KEY="memento.visualref.v46a.render.monitor";

const ROTATION_BY_CHOICE={
  "0":{start:0,end:0},
  "45":{start:45,end:45},
  "90":{start:90,end:90},
  "135":{start:135,end:135},
  "180":{start:180,end:180},
  "in-rotation":{start:-72,end:72}
};

const AXES=[
  ["subject-presence","SUBJECT","subject"],
  ["subject-size","SIZE","subject"],
  ["subject-rotation","ROTATION","subject"],
  ["camera","CAMERA","camera"],
  ["view","VIEW","camera"],
  ["composition","COMPOSITION","composition"],
  ["lens","LENS","lens-focus"],
  ["focus","FOCUS","lens-focus"],
  ["light","LIGHT","light"],
  ["environment","ENVIRONMENT","environment"],
  ["motion-design","MOTION","motion"],
  ["atmosphere","ATMOSPHERE","image"]
];

const CATEGORY_GLYPH={
  subject:"◇",camera:"◉",composition:"▦","lens-focus":"◎",light:"✦",environment:"⌂",motion:"∿",image:"⁙",timing:"◷"
};

const ICON={
  select:'<svg viewBox="0 0 24 24"><path d="m5 3 13 9-6 1 3 6-3 2-3-6-4 4z"/></svg>',
  move:'<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M22 12l-3-3m3 3-3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3"/></svg>',
  rotate:'<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2 5.3M20 4v7h-7"/></svg>',
  scale:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M4 4l6 6M20 4l-6 6M20 20l-6-6M4 20l6-6"/></svg>',
  frame:'<svg viewBox="0 0 24 24"><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><path d="M8 3v18M16 3v18M3 8h18M3 16h18"/></svg>',
  scene:'<svg viewBox="0 0 24 24"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
  properties:'<svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/></svg>',
  world:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9M12 3c-3 3-4 6-4 9s1 6 4 9"/></svg>',
  guide:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/><path d="m16 16 4 4"/></svg>',
  shot:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m9 9 6 3-6 3z"/></svg>',
  audio:'<svg viewBox="0 0 24 24"><path d="M9 18V5l10-2v13M9 8l10-2"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>',
  dice:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  pivot:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7"/></svg>',
  snap:'<svg viewBox="0 0 24 24"><path d="M6 3v10a6 6 0 0 0 12 0V3M6 8h5M13 8h5"/></svg>',
  ground:'<svg viewBox="0 0 24 24"><path d="M3 19h18M12 3v12M8 11l4 4 4-4"/></svg>',
  reset:'<svg viewBox="0 0 24 24"><path d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12 2L20 14M4 10l2.5-3a7 7 0 0 1 12 2"/></svg>'
};

const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const assetIsCustom=id=>Boolean(id&&!String(id).endsWith("proxy"));
const pretty=value=>String(value??"—").replace(/[-_]/g," ").replace(/\b\w/g,letter=>letter.toUpperCase());
const activeShot=state=>state?.shots?.byId?.[state?.shots?.activeShotId]||null;
const cssEscape=value=>globalThis.CSS?.escape?globalThis.CSS.escape(String(value)):String(value).replace(/[^a-zA-Z0-9_-]/g,char=>`\\${char}`);

export function installV46Polish(api){
  if(!api||globalThis.__MEMENTO_V46_INSTALLED__)return globalThis.__MEMENTO_V46__;
  globalThis.__MEMENTO_V46_INSTALLED__=true;
  const controller=new V46Polish(api);
  controller.init();
  const publicApi={...api,version:"46A",polish:controller};
  globalThis.__MEMENTO_V46__=publicApi;
  document.dispatchEvent(new CustomEvent("memento:v46a-ready",{detail:{workspace:api.workspace}}));
  return publicApi;
}

class V46Polish{
  constructor(api){
    this.api=api;
    this.workspace=api.workspace;
    this.store=api.store;
    this.commands=api.commands;
    this.player=api.player;
    this.shell=api.shell;
    this.state=this.store.get();
    this.raf=0;
    this.guideForced=false;
    this.timelineOpened=false;
    this.axisOverviewKey="";
    this.deltaGesture=false;
    this.renderMonitor=sessionStorage.getItem(RENDER_MONITOR_KEY)||"live";
    this.endpointTimer=0;
    this.endpointSignature="";
    this.lastGroundAsset=null;
    this.rendererPatched=false;
    this.precisionOpen=new Set(readJson(PRECISION_KEY,[]));
    const savedTab=sessionStorage.getItem(TAB_KEY);
    this.viewportTab=["scene","properties","world"].includes(savedTab)?savedTab:"scene";
  }

  init(){
    document.body.dataset.mementoBuild="v46a";
    document.documentElement.dataset.mementoBuild="v46a";
    this.patchRotationOwnership();
    this.patchRendererFraming();
    this.migrateRotationOwnership();
    this.bind();
    this.observerTarget=document.getElementById("app")||document.body;
    this.observer=new MutationObserver(()=>this.schedule());
    this.observeMutations();
    this.unsubscribe=this.store.subscribe(state=>{this.state=state;this.schedule();});
    this.unloadHandler=()=>this.dispose();
    addEventListener("beforeunload",this.unloadHandler,{once:true});
    this.schedule();
  }

  bind(){
    document.addEventListener("click",event=>this.onClick(event),true);
    document.addEventListener("input",event=>this.onInput(event),true);
    document.addEventListener("change",event=>this.onChange(event),true);
    document.addEventListener("toggle",event=>this.onToggle(event),true);
    document.addEventListener("pointerup",()=>this.finishDeltaGesture(),true);
    document.addEventListener("pointercancel",()=>this.finishDeltaGesture(true),true);
    document.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){const input=document.querySelector(this.workspace==="viewport"?"[data-v46a-property-search]":this.workspace==="render"?"[data-v46a-render-search]":"");if(input){event.preventDefault();input.focus();input.select?.();}}},true);
  }

  observeMutations(){
    if(this.observer&&this.observerTarget)this.observer.observe(this.observerTarget,{childList:true,subtree:true});
  }

  schedule(){
    if(this.raf)return;
    this.raf=requestAnimationFrame(()=>{
      this.raf=0;
      this.observer?.disconnect();
      try{this.reconcile();}finally{this.observeMutations();}
    });
  }

  reconcile(){
    this.state=this.store.get();
    this.brandV46();
    this.reorderNavigation();
    this.syncHeroReadiness();
    document.documentElement.classList.remove("v46-preboot");
    this.polishSharedPlayer();
    if(this.workspace==="viewport")this.reconcileViewport();
    if(this.workspace==="render")this.reconcileRender();
    if(this.workspace==="timeline")this.reconcileTimeline();
  }

  brandV46(){
    document.title=document.title.replace(/V45|V46(?!A)/gi,"V46A");
    document.body.dataset.mementoBuild="v46a";
    document.querySelectorAll(".release-mark").forEach(node=>{if(node.textContent!=="V46A")node.textContent="V46A";});
    document.querySelectorAll(".project-button span").forEach(node=>{
      if(/^MEMENTO V45$/i.test(node.textContent.trim()))node.textContent="MEMENTO V46A";
    });
    document.querySelectorAll(".project-button small").forEach(node=>{
      if(/project/i.test(node.textContent))node.textContent="WORKFLOW BUILD";
    });
  }

  reorderNavigation(){
    const desired=["viewport","render","timeline"];
    document.querySelectorAll(".mode-zone,.mobile-nav").forEach(nav=>{
      const links=[...nav.querySelectorAll("a")];
      const ordered=desired.map(name=>links.find(item=>(item.getAttribute("href")||"").includes(`${name}.html`))).filter(Boolean);
      const current=links.filter(link=>ordered.includes(link));
      if(current.every((link,index)=>link===ordered[index]))return;
      ordered.forEach(link=>nav.append(link));
    });
  }

  syncHeroReadiness(){
    const heroId=this.state?.assets?.heroId;
    const heroConfigured=assetIsCustom(heroId);
    const renderer=this.player?.renderer;
    const rendererMode=String(renderer?.mode||this.player?.rendererStatus?.mode||"booting").toLowerCase();
    const heroMounted=heroConfigured&&Boolean(renderer?.loadedAssets?.has?.(heroId)||renderer?.assetObjects?.has?.(heroId));
    const importing=this.state?.assets?.importSession;
    const importFailed=Boolean(importing&&importing.type==="hero"&&["error","failed"].includes(String(importing.status||"").toLowerCase()));
    const heroImporting=Boolean(importing&&importing.type==="hero"&&!importFailed);
    const rendererFailed=["error","fallback"].includes(rendererMode);
    const heroVisible=heroConfigured&&heroMounted&&!rendererFailed;

    document.body.classList.toggle("v46-awaiting-hero",!heroVisible);
    document.body.classList.toggle("v46-hero-configured",heroConfigured);
    document.body.classList.toggle("v46-hero-ready",heroVisible);
    document.body.classList.toggle("v46-importing-hero",heroImporting||heroConfigured&&!heroMounted&&!rendererFailed);
    document.body.classList.toggle("v46-hero-import-error",importFailed||heroConfigured&&rendererFailed);

    const stageNote=document.querySelector('[data-role="stage-note"]');
    if(stageNote){
      const hero=this.state?.assets?.byId?.[heroId];
      stageNote.textContent=heroVisible?(hero?.name||"CUSTOM HERO"):importFailed?"HERO IMPORT FAILED":rendererFailed?"3D PREVIEW UNAVAILABLE":heroConfigured?"LOADING CUSTOM HERO":heroImporting?"IMPORTING CUSTOM HERO":"CUSTOM HERO REQUIRED";
    }
    this.ensureAssetEmptyState({heroConfigured,heroVisible,heroMounted,heroImporting,importFailed,rendererFailed,rendererMode,importing});

    clearTimeout(this.heroPollTimer);
    clearTimeout(this.endpointTimer);
    if(heroConfigured&&!heroVisible&&!rendererFailed&&!importFailed)this.heroPollTimer=setTimeout(()=>this.schedule(),90);
  }

  ensureAssetEmptyState({heroConfigured,heroVisible,heroImporting,importFailed,rendererFailed,rendererMode,importing}){
    const stage=document.querySelector('[data-role="stage"]');
    if(!stage)return;
    let empty=stage.querySelector(".v46-asset-empty");
    if(!empty){
      empty=document.createElement("div");
      empty.className="v46-asset-empty";
      empty.innerHTML=`<div class="v46-empty-mark">${ICON.scene}</div><span data-role="v46-empty-kicker">WORLD NOT BUILT</span><b data-role="v46-empty-title">Import your custom hero</b><p data-role="v46-empty-copy">The temporary proxy is intentionally hidden. Build with your real product from the first frame.</p><div><button data-v46-guide-action="open">OPEN GUIDE</button><a href="./viewport.html">GO TO VIEWPORT</a></div>`;
      stage.append(empty);
    }
    const kicker=empty.querySelector('[data-role="v46-empty-kicker"]');
    const title=empty.querySelector('[data-role="v46-empty-title"]');
    const copy=empty.querySelector('[data-role="v46-empty-copy"]');
    const hero=this.state?.assets?.byId?.[this.state?.assets?.heroId];

    if(importFailed){
      kicker.textContent="IMPORT FAILED";
      title.textContent="The hero could not be loaded";
      copy.textContent=importing?.message||"Review the GLB, return to Viewport and try the import again.";
    }else if(rendererFailed){
      kicker.textContent=rendererMode==="fallback"?"RENDERER FALLBACK":"RENDERER ERROR";
      title.textContent="The custom hero preview is unavailable";
      copy.textContent="The proxy remains hidden. Open Viewport diagnostics or reload after WebGL is available.";
    }else if(heroConfigured&&!heroVisible){
      kicker.textContent="LOADING CUSTOM HERO";
      title.textContent=hero?.name||"Restoring your saved product";
      copy.textContent="The canvas stays hidden until the real GLB is mounted and ready to direct.";
    }else if(heroImporting){
      kicker.textContent=(importing?.status||"IMPORTING").toUpperCase();
      title.textContent=importing?.name||"Loading custom hero";
      copy.textContent=importing?.message||"Validating geometry, materials and physical scale…";
    }else{
      kicker.textContent=this.workspace==="viewport"?"STEP 01 · HERO":"WORLD NOT READY";
      title.textContent=this.workspace==="viewport"?"Import your custom hero":"Create the world in Viewport first";
      copy.textContent=this.workspace==="viewport"?"The temporary proxy is hidden so every decision starts from the real asset.":"Viewport owns hero, environment and scale. Render and Timeline use that same world.";
    }
    empty.hidden=heroVisible;
  }

  polishSharedPlayer(){
    document.querySelectorAll(".player-shell").forEach(shell=>shell.classList.add("v46-player"));
    document.querySelectorAll(".transport-button").forEach(button=>button.setAttribute("aria-label",button.title||button.textContent.trim()));
    if(this.workspace==="render"){this.ensurePlayerDeltaControl();this.ensureRenderMonitor();this.syncRenderMonitor();}
    else this.setRendererWorkspace(this.workspace);
  }

  ensurePlayerDeltaControl(){
    const settings=document.querySelector(".transport-secondary");
    if(!settings||settings.querySelector(".v46-player-delta")){
      this.syncPlayerDelta();
      return;
    }
    const field=document.createElement("label");
    field.className="transport-field v46-player-delta";
    field.innerHTML=`<span>DELTA</span><input data-v46-delta type="range" min="5" max="95" step="1" aria-label="Generation delta"><input data-v46-delta-number type="number" min="5" max="95" step="1" inputmode="numeric" aria-label="Generation delta value"><output data-v46-delta-output>42</output>`;
    const variant=settings.querySelector(".variant-mode");
    settings.insertBefore(field,variant||settings.firstChild);
    this.syncPlayerDelta();
  }

  syncPlayerDelta(){
    const shot=activeShot(this.state);
    const slider=document.querySelector("[data-v46-delta]");
    const number=document.querySelector("[data-v46-delta-number]");
    const output=document.querySelector("[data-v46-delta-output]");
    if(!shot||!slider)return;
    const value=Math.round((shot.deltaTarget??.42)*100);
    if(document.activeElement!==slider)slider.value=String(value);
    if(number&&document.activeElement!==number)number.value=String(value);
    if(output)output.textContent=`${String(value).padStart(2,"0")} Δ`;
    document.querySelectorAll('[data-role="variant-mode"]').forEach(select=>{select.value="balanced";select.setAttribute("aria-hidden","true");});
  }

  reconcileViewport(){
    this.ensureViewportEditorLayout();
    this.ensureMayaHud();
    this.ensureWorldGuide();
    this.ensureOriginAxes();
    this.autoGroundAndZeroPivot();
    this.syncViewportState();
  }

  ensureViewportEditorLayout(){
    const content=document.querySelector(".v45-viewport .viewport-content");
    if(!content)return;
    content.classList.remove("v46-tabbed-editor");
    content.classList.add("v46a-viewport-editor");
    content.removeAttribute("data-v46-tab");
    content.querySelector(".v46-editor-tabs")?.remove();
    const outliner=content.querySelector(".v45-outliner"),inspector=content.querySelector(".v45-inspector");
    if(outliner){
      outliner.classList.add("v46a-outliner");
      const header=outliner.querySelector(":scope > header");
      if(header&&!header.querySelector(".v46a-outliner-title")){const title=document.createElement("b");title.className="v46a-outliner-title";title.textContent="OUTLINER";header.prepend(title);}
    }
    if(inspector){
      inspector.classList.add("v46a-property-panel");
      let search=inspector.querySelector(".v46a-property-search");
      if(!search){
        search=document.createElement("label");search.className="v46a-property-search";
        search.innerHTML=`${ICON.properties}<input type="search" data-v46a-property-search placeholder="Search properties…" autocomplete="off" spellcheck="false"><kbd>⌘K</kbd>`;
        inspector.prepend(search);
      }
      this.filterViewportProperties(search.querySelector("input")?.value||"");
    }
  }

  filterViewportProperties(query){
    const needle=String(query||"").trim().toLowerCase();
    document.querySelectorAll(".v46a-property-panel .section,.v46a-property-panel details").forEach(section=>{
      const text=(section.textContent||"").toLowerCase();section.hidden=Boolean(needle&&!text.includes(needle));
    });
  }

  ensureViewportGuideToggle(){
    const toolbar=document.querySelector(".v45-gizmo-toolbar");
    if(!toolbar||toolbar.querySelector("[data-v46-guide-toggle]"))return;
    const button=document.createElement("button");
    button.className="v44-tool-chip compact v46-guide-toggle";
    button.dataset.v46GuideToggle="";
    button.innerHTML=`${ICON.guide}<span>GUIDE</span>`;
    const spacer=toolbar.querySelector(".viewport-toolbar-spacer");
    toolbar.insertBefore(button,spacer||toolbar.lastChild);
  }

  ensureMayaHud(){
    const stage=document.querySelector('[data-role="stage"]');
    if(!stage)return;
    let hud=stage.querySelector(".v46-maya-hud");
    if(!hud){hud=document.createElement("div");hud.className="v46-maya-hud";stage.append(hud);}
    const signature="v46a-full-dock";
    if(hud.dataset.signature!==signature){
      hud.dataset.signature=signature;
      hud.innerHTML=`
        <nav class="v46a-viewport-dock" aria-label="Viewport player dock">
          <button data-v46-tool="select" title="Select · Q">${ICON.select}<span>SELECT</span><kbd>Q</kbd></button>
          <button data-v46-tool="translate" title="Move · W">${ICON.move}<span>MOVE</span><kbd>W</kbd></button>
          <button data-v46-tool="rotate" title="Rotate · E">${ICON.rotate}<span>ROTATE</span><kbd>E</kbd></button>
          <button data-v46-tool="scale" title="Scale · R">${ICON.scale}<span>SCALE</span><kbd>R</kbd></button>
          <button data-v46-tool="pivot" title="Pivot · P">${ICON.pivot}<span>PIVOT</span><kbd>P</kbd></button>
          <i></i>
          <button data-v46-viewport-action="local" title="World / Local · X">${ICON.world}<span data-v46a-local-label>LOCAL</span></button>
          <button data-v46-viewport-action="snap" title="Snap · S">${ICON.snap}<span>SNAP</span></button>
          <button data-v46-viewport-action="frame" title="Frame selected · F">${ICON.frame}<span>FRAME</span><kbd>F</kbd></button>
          <button data-v46-viewport-action="ground" title="Ground · G">${ICON.ground}<span>GROUND</span></button>
          <button data-v46-viewport-action="reset" title="Reset transform">${ICON.reset}<span>RESET</span></button>
          <button data-v46-guide-toggle title="Guided setup">${ICON.guide}<span>GUIDE</span></button>
        </nav>
        <div class="v46-maya-readout"><span data-v46-camera-label>PERSPECTIVE</span><b data-v46-selected-label>WORLD</b><em data-v46-space-label>WORLD</em></div>`;
    }
  }

  ensureWorldGuide(){
    const stage=document.querySelector('[data-role="stage"]');
    if(!stage)return;
    let guide=stage.querySelector(".v46-world-guide");
    if(!guide){
      guide=document.createElement("section");
      guide.className="v46-world-guide";
      guide.innerHTML=`
        <header><div><small>OPTIONAL GUIDED SETUP</small><b>BUILD YOUR WORLD</b></div><button data-v46-guide-action="dismiss" aria-label="Close guide">×</button></header>
        <p>Four clear steps. Follow them in order or close this panel and work freely.</p>
        <div class="v46-guide-steps">
          <button data-v46-guide-action="hero"><i>01</i><span><b>IMPORT HERO</b><small>Use the real custom GLB from the beginning.</small></span><em data-v46-step="hero">START</em></button>
          <button data-v46-guide-action="environment"><i>02</i><span><b>CREATE THE WORLD</b><small>Add a GLB environment or an HDRI.</small></span><em data-v46-step="world">NEXT</em></button>
          <button data-v46-guide-action="calibrate"><i>03</i><span><b>CALIBRATE</b><small>Set scale, ground, pivot and orientation.</small></span><em data-v46-step="calibrate">CHECK</em></button>
          <button data-v46-guide-action="render"><i>04</i><span><b>CREATE SHOTS</b><small>Continue into Render with the same world.</small></span><em data-v46-step="render">OPEN</em></button>
        </div>
        <footer><button data-v46-guide-action="dismiss">WORK FREELY</button><a href="./render.html">CONTINUE TO RENDER →</a></footer>`;
      stage.append(guide);
    }
  }

  syncViewportState(){
    const state=this.state;
    const heroReady=assetIsCustom(state.assets.heroId);
    const worldReady=assetIsCustom(state.assets.environmentId)||assetIsCustom(state.assets.hdriId);
    const heroNode=state.scene?.nodes?.["hero-proxy"];
    const calibrated=Boolean(heroNode?.correction?.referenceDimension>0||heroNode?.correction?.autoNormalize!==false&&heroReady);
    const dismissed=localStorage.getItem(GUIDE_KEY)==="1";
    const guide=document.querySelector(".v46-world-guide");
    if(guide){
      const setupComplete=heroReady&&worldReady&&calibrated;
      guide.hidden=!(this.guideForced||(!dismissed&&!setupComplete));
      setStep(guide,"hero",heroReady,"READY","START");
      setStep(guide,"world",worldReady,"READY",heroReady?"NEXT":"WAIT");
      setStep(guide,"calibrate",calibrated,"READY",heroReady?"CHECK":"WAIT");
      setStep(guide,"render",heroReady,"OPEN","WAIT");
    }
    document.querySelectorAll("[data-v46-tool]").forEach(button=>button.classList.toggle("active",button.dataset.v46Tool===state.ui.viewportTool));
    const selected=state.scene?.nodes?.[state.ui.selectedNodeId];
    const selectedLabel=document.querySelector("[data-v46-selected-label]");
    const spaceLabel=document.querySelector("[data-v46-space-label]");
    const cameraLabel=document.querySelector("[data-v46-camera-label]");
    if(selectedLabel)selectedLabel.textContent=(selected?.name||"WORLD").replace(/CALIBRATED PROXY/i,"HERO SLOT");
    if(spaceLabel)spaceLabel.textContent=(state.ui.viewportSpace||"world").toUpperCase();
    const localLabel=document.querySelector("[data-v46a-local-label]");if(localLabel)localLabel.textContent="LOCAL";
    document.querySelector('[data-v46-viewport-action="local"]')?.classList.toggle("active",state.ui.viewportSpace==="local");
    document.querySelector('[data-v46-viewport-action="snap"]')?.classList.toggle("active",Boolean(state.ui.viewportSnapEnabled));
    if(cameraLabel)cameraLabel.textContent=state.scene.viewportCameraMode==="shot"?"SHOT CAMERA":"PERSPECTIVE";
  }

  reconcileRender(){
    this.removeAxisOverview();
    this.ensureRenderPropertyNav();
    this.decorateOptionChips();
    this.sanitizePrecisionOwnership();
    this.sanitizeSubjectTransformPrecision();
    this.restorePrecisionPanels();
    this.ensureRenderMonitor();
    this.syncRenderMonitor();
  }

  removeAxisOverview(){document.querySelector(".v46-axis-overview")?.remove();}

  ensureRenderPropertyNav(){
    const editor=document.querySelector(".v45-render-editor");if(!editor)return;
    let nav=editor.querySelector(".v46a-render-property-nav");
    if(!nav){
      nav=document.createElement("section");nav.className="v46a-render-property-nav";
      nav.innerHTML=`<div class="v46a-scope-sticky"><span>EDIT STATE</span><button data-scope="start">START</button><button data-scope="both">BOTH</button><button data-scope="end">END</button></div><label class="v46a-render-search">${ICON.properties}<input data-v46a-render-search type="search" placeholder="Search shot properties…" autocomplete="off"><kbd>⌘K</kbd></label><nav data-v46a-category-nav></nav>`;
      const variation=editor.querySelector(".v45-variation-console");(variation||editor.firstElementChild)?.after(nav);
    }
    const labels=[...editor.querySelectorAll("[data-macro-section]")].map(section=>({id:section.dataset.macroSection,label:section.querySelector(".v45-macro-head b")?.textContent||section.dataset.macroSection}));
    const host=nav.querySelector("[data-v46a-category-nav]");
    if(host&&host.childElementCount!==labels.length)host.innerHTML=labels.map(item=>`<button data-v46a-macro-jump="${item.id}"><i>${CATEGORY_GLYPH[item.id]||"·"}</i><span>${escapeHtml(item.label)}</span></button>`).join("");
    const query=nav.querySelector("[data-v46a-render-search]")?.value||"";this.filterRenderProperties(query);
    nav.querySelectorAll("[data-scope]").forEach(button=>button.classList.toggle("active",button.dataset.scope===this.state.ui.editScope));
  }

  filterRenderProperties(query){
    const needle=String(query||"").trim().toLowerCase();
    document.querySelectorAll(".v45-render-editor [data-macro-section]").forEach(section=>{const text=(section.textContent||"").toLowerCase();section.hidden=Boolean(needle&&!text.includes(needle));});
  }

  sanitizeSubjectTransformPrecision(){
    const blocked=["subject.positionX","subject.positionY","subject.positionZ","subject.rotationX","subject.rotationZ","subject.scale"];
    for(const axis of blocked)document.querySelectorAll(`[data-axis-input="${axis}"]`).forEach(input=>{const label=input.closest("label");const grid=label?.closest(".v45-precision-grid");label?.remove();if(grid&&!grid.querySelector("[data-axis-input]"))grid.closest(".v45-inline-precision")?.remove();});
  }

  ensureAxisOverview(){
    const editor=document.querySelector(".v45-render-editor");
    const variation=editor?.querySelector(".v45-variation-console");
    if(!editor||!variation)return;
    let overview=editor.querySelector(".v46-axis-overview");
    if(!overview){
      overview=document.createElement("section");
      overview.className="v46-axis-overview";
      overview.innerHTML='<header><span>VISIBLE SHOT STATE</span><small>START <i></i> END</small></header><div data-v46-axis-rail></div>';
      variation.after(overview);
    }
    const shot=activeShot(this.state);
    if(!shot)return;
    const key=AXES.map(([axis])=>`${axis}:${shot.start.choices?.[axis]}:${shot.end.choices?.[axis]}`).join("|")+`|${shot.durationFrames}|${shot.deltaTarget}`;
    const rail=overview.querySelector("[data-v46-axis-rail]");
    if(key===this.axisOverviewKey&&rail?.childElementCount)return;
    this.axisOverviewKey=key;
    rail.innerHTML=AXES.map(([axis,label,macro])=>{
      const start=shot.start.choices?.[axis];
      const end=shot.end.choices?.[axis];
      return `<button data-v46-axis-open="${axis}" data-v46-macro="${macro}" title="Open ${label}"><span>${label}</span><i>S</i><b>${escapeHtml(pretty(start))}</b><em>E</em><strong>${escapeHtml(pretty(end))}</strong></button>`;
    }).join("")+`<button data-v46-axis-open="timing" data-v46-macro="timing" title="Open timing"><span>TIMING</span><i>F</i><b>${shot.durationFrames}</b><em>Δ</em><strong>${Math.round((shot.deltaTarget??.42)*100)}%</strong></button>`;
  }

  decorateOptionChips(){
    document.querySelectorAll(".mvr-chip").forEach(chip=>{
      chip.querySelector(".v46-chip-endpoints")?.remove();
      const start=chip.querySelector(".mvr-chip-start"),both=chip.querySelector(".mvr-chip-both"),end=chip.querySelector(".mvr-chip-end");
      if(start)start.dataset.endpointLabel="START";if(both)both.dataset.endpointLabel="BOTH";if(end)end.dataset.endpointLabel="END";
    });
  }

  sanitizePrecisionOwnership(){
    document.querySelectorAll('[data-macro-section]:not([data-macro-section="subject"]) [data-axis-input="subject.rotationY"]').forEach(input=>{
      const label=input.closest("label");
      if(!label)return;
      const grid=label.closest(".v45-precision-grid");
      label.remove();
      if(grid&&!grid.querySelector('[data-axis-input]'))grid.closest(".v45-inline-precision")?.remove();
    });
  }

  restorePrecisionPanels(){
    document.querySelectorAll(".v45-inline-precision").forEach(details=>{
      const key=details.closest("[data-macro-section]")?.dataset.macroSection||"precision";
      if(this.precisionOpen.has(key)&&!details.open)details.open=true;
    });
  }

  reconcileTimeline(){
    this.ensureTimelineCreateBar();
    this.ensureTimelineEmptyState();
    this.openTimelineLibraryOnce();
    this.syncTimelineCreateBar();
  }

  ensureTimelineCreateBar(){
    const timeline=document.querySelector(".v45-timeline");
    const toolbar=timeline?.querySelector(".timeline-game-toolbar");
    if(!timeline||!toolbar||timeline.querySelector(".v46-timeline-createbar"))return;
    const bar=document.createElement("section");
    bar.className="v46-timeline-createbar";
    bar.innerHTML=`
      <div class="v46-create-copy"><small>CREATE</small><b>SEQUENCE</b></div>
      <label><span>VIDEO TRACK</span><select data-v46-timeline-track><option value="v1">V1</option><option value="v2">V2</option><option value="v3">V3</option></select></label>
      <button class="primary" data-v46-timeline-action="add">${ICON.plus}<span><b>ADD ACTIVE SHOT</b><small>CREATE OR UPDATE CLIP</small></span></button>
      <label><span>VARIANT</span><select data-v46-timeline-variant><option value="near">NEAR</option><option value="balanced" selected>BALANCED</option><option value="bold">BOLD</option></select></label>
      <button data-v46-timeline-action="variant">${ICON.dice}<span><b>NEW VARIANT</b><small>KEEP EDITING BEFORE ADD</small></span></button>
      <button data-v46-timeline-action="audio">${ICON.audio}<span><b>IMPORT AUDIO</b><small>WAVEFORM + PLAYBACK</small></span></button>
      <button class="compact" data-v46-timeline-action="library" title="Show sequence library">${ICON.scene}</button>`;
    toolbar.after(bar);
  }

  ensureTimelineEmptyState(){
    const board=document.querySelector(".timeline-board-game");
    if(!board)return;
    let empty=board.querySelector(".v46-timeline-empty");
    if(!empty){
      empty=document.createElement("div");
      empty.className="v46-timeline-empty";
      empty.innerHTML=`${ICON.shot}<small>EMPTY SEQUENCE</small><b>Add the active shot or generate a new variant.</b><div><button data-v46-timeline-action="add">ADD ACTIVE SHOT</button><button data-v46-timeline-action="audio">IMPORT AUDIO</button></div>`;
      board.append(empty);
    }
    empty.hidden=Object.keys(this.state.timeline?.clips||{}).length>0;
  }

  openTimelineLibraryOnce(){
    if(this.timelineOpened||sessionStorage.getItem(TIMELINE_KEY)==="1")return;
    this.timelineOpened=true;
    sessionStorage.setItem(TIMELINE_KEY,"1");
    if(Object.keys(this.state.timeline?.clips||{}).length===0&&!this.state.ui.timelineLibraryOpen){
      this.commands.dispatch("ui.setTimelineLibraryOpen",{open:true});
    }
  }

  syncTimelineCreateBar(){
    const shot=activeShot(this.state);
    const variant=document.querySelector("[data-v46-timeline-variant]");
    if(variant&&document.activeElement!==variant)variant.value=shot?.variantMode||"balanced";
  }

  onClick(event){
    const monitor=event.target.closest("[data-v46a-render-monitor]")?.dataset.v46aRenderMonitor;if(monitor){event.preventDefault();event.stopPropagation();this.setRenderMonitor(monitor);return;}
    const jump=event.target.closest("[data-v46a-macro-jump]")?.dataset.v46aMacroJump;if(jump){event.preventDefault();event.stopPropagation();this.commands.dispatch("ui.setMacro",{macroId:jump});requestAnimationFrame(()=>document.querySelector(`[data-macro-section="${cssEscape(jump)}"]`)?.scrollIntoView({block:"start",behavior:"smooth"}));return;}
    const guideAction=event.target.closest("[data-v46-guide-action]")?.dataset.v46GuideAction;
    if(guideAction){
      event.preventDefault();event.stopPropagation();this.handleGuideAction(guideAction);return;
    }
    if(event.target.closest("[data-v46-guide-toggle]")){
      event.preventDefault();event.stopPropagation();this.guideForced=true;localStorage.removeItem(GUIDE_KEY);this.schedule();return;
    }
    const tab=event.target.closest("[data-v46-editor-tab]")?.dataset.v46EditorTab;
    if(tab){event.preventDefault();event.stopPropagation();this.viewportTab=tab;sessionStorage.setItem(TAB_KEY,tab);this.schedule();return;}
    const tool=event.target.closest("[data-v46-tool]")?.dataset.v46Tool;
    if(tool){event.preventDefault();event.stopPropagation();this.commands.dispatch("ui.setViewportTool",{tool});return;}
    const viewportAction=event.target.closest("[data-v46-viewport-action]")?.dataset.v46ViewportAction;
    if(viewportAction){event.preventDefault();event.stopPropagation();this.handleViewportAction(viewportAction);return;}
    const axisButton=event.target.closest("[data-v46-axis-open]");
    if(axisButton){
      event.preventDefault();event.stopPropagation();
      const axisId=axisButton.dataset.v46AxisOpen,macroId=axisButton.dataset.v46Macro;
      this.commands.dispatch("ui.setMacro",{macroId});
      if(axisId!=="timing")this.commands.dispatch("ui.selectCreativeAxis",{axisId});
      requestAnimationFrame(()=>document.querySelector(`[data-macro-section="${cssEscape(macroId)}"]`)?.scrollIntoView({block:"nearest",behavior:"smooth"}));
      return;
    }
    const timelineAction=event.target.closest("[data-v46-timeline-action]")?.dataset.v46TimelineAction;
    if(timelineAction){event.preventDefault();event.stopPropagation();this.handleTimelineAction(timelineAction);}
  }

  onInput(event){
    if(event.target.matches("[data-v46a-property-search]")){this.filterViewportProperties(event.target.value);return;}
    if(event.target.matches("[data-v46a-render-search]")){this.filterRenderProperties(event.target.value);return;}
    if(event.target.matches("[data-v46-delta],[data-v46-delta-number]")){
      const value=Math.max(5,Math.min(95,Number(event.target.value)||42));
      const slider=document.querySelector("[data-v46-delta]"),number=document.querySelector("[data-v46-delta-number]"),output=document.querySelector("[data-v46-delta-output]");
      if(slider&&event.target!==slider)slider.value=String(value);if(number&&event.target!==number)number.value=String(value);if(output)output.textContent=`${String(value).padStart(2,"0")} Δ`;
      if(!this.deltaGesture){this.store.beginGesture("Set delta target");this.deltaGesture=true;}
      this.store.updateGesture("Set delta target",draft=>{const shot=activeShot(draft);if(shot){shot.deltaTarget=value/100;shot.variantMode="balanced";}});
    }
  }

  onChange(event){
    if(event.target.matches("[data-v46-delta],[data-v46-delta-number]")){this.finishDeltaGesture();return;}
    if(event.target.matches("[data-v46-timeline-variant]")){
      const mode=event.target.value;
      this.store.transient("V46A variant mode",draft=>{const shot=activeShot(draft);if(shot)shot.variantMode=mode;},{persist:true,broadcast:true});
    }
  }

  finishDeltaGesture(cancel=false){
    if(!this.deltaGesture)return;
    this.deltaGesture=false;
    if(cancel)this.store.cancelGesture();else this.store.endGesture();
  }

  onToggle(event){
    const details=event.target.closest?.(".v45-inline-precision");
    if(!details)return;
    const key=details.closest("[data-macro-section]")?.dataset.macroSection||"precision";
    if(details.open)this.precisionOpen.add(key);else this.precisionOpen.delete(key);
    sessionStorage.setItem(PRECISION_KEY,JSON.stringify([...this.precisionOpen]));
  }

  handleGuideAction(action){
    if(action==="dismiss"){
      this.guideForced=false;localStorage.setItem(GUIDE_KEY,"1");this.schedule();return;
    }
    if(action==="open"){
      if(this.workspace!=="viewport"){this.api.switchWorkspace?.("viewport");return;}
      this.guideForced=true;localStorage.removeItem(GUIDE_KEY);this.schedule();return;
    }
    if(action==="hero"||action==="environment"){
      this.viewportTab="scene";sessionStorage.setItem(TAB_KEY,"scene");this.schedule();
      const type=action==="hero"?"hero":"environment";
      requestAnimationFrame(()=>document.querySelector(`[data-import="${type}"]`)?.click());return;
    }
    if(action==="calibrate"){
      this.viewportTab="properties";sessionStorage.setItem(TAB_KEY,"properties");
      this.commands.dispatch("ui.selectNode",{nodeId:"hero-proxy"});
      this.commands.dispatch("ui.setViewportTool",{tool:"scale"});
      this.schedule();return;
    }
    if(action==="render")this.api.switchWorkspace?.("render");
  }

  handleViewportAction(action){
    const state=this.store.get(),nodeId=state.ui.selectedNodeId,node=state.scene?.nodes?.[nodeId];
    if(action==="frame")this.player?.renderer?.frameNode?.(nodeId,false);
    if(action==="local")this.commands.dispatch("ui.setViewportSpace",{space:state.ui.viewportSpace==="local"?"world":"local"});
    if(action==="snap")this.commands.dispatch("ui.setViewportSnap",{enabled:!state.ui.viewportSnapEnabled});
    if(action==="ground"&&["hero","environment","prop"].includes(node?.type)){const transform=this.player?.renderer?.getGroundedTransform?.(nodeId,state);if(transform)this.commands.dispatch("scene.groundNode",{nodeId,transform});}
    if(action==="reset"&&node){
      if(node.type==="hero"){const pivot=this.player?.renderer?.resolvePivotValue?.(nodeId,[0,0,0],state);if(pivot)this.commands.dispatch("scene.setNodePivotCompensated",{nodeId,...pivot});}
      this.commands.dispatch("scene.resetNodeTransform",{nodeId});
      requestAnimationFrame(()=>{const next=this.store.get(),transform=this.player?.renderer?.getGroundedTransform?.(nodeId,next);if(transform)this.commands.dispatch("scene.groundNode",{nodeId,transform});});
    }
  }

  handleTimelineAction(action){
    if(action==="add"){
      const trackId=document.querySelector("[data-v46-timeline-track]")?.value||"v1";
      this.commands.dispatch("shot.addToTimeline",{trackId});
      this.shell?.toast?.(`SHOT ADDED TO ${trackId.toUpperCase()}`);
      return;
    }
    if(action==="variant"){
      const mode=document.querySelector("[data-v46-timeline-variant]")?.value||"balanced";
      this.commands.dispatch("shot.duplicate");
      this.commands.dispatch("shot.generateVariant",{mode});
      this.shell?.toast?.(`NEW ${mode.toUpperCase()} VARIANT READY · ADD WHEN APPROVED`);
      return;
    }
    if(action==="audio"){
      document.querySelector('[data-role="audio-upload"]')?.click();return;
    }
    if(action==="library")this.commands.dispatch("ui.setTimelineLibraryOpen",{open:true});
  }

  ensureRenderMonitor(){
    if(this.workspace!=="render")return;
    const visuals=document.querySelector(".player-visuals"),stage=visuals?.querySelector('[data-role="stage"]');
    if(!visuals||!stage)return;
    let nav=visuals.querySelector(".v46a-render-monitor");
    if(!nav){
      nav=document.createElement("nav");nav.className="v46a-render-monitor";nav.setAttribute("aria-label","Render player view");
      nav.innerHTML=`<button data-v46a-render-monitor="live">LIVE</button><button data-v46a-render-monitor="endpoints">LIVE + START / END</button><button data-v46a-render-monitor="viewport">VIEWPORT</button>`;
      visuals.prepend(nav);
    }
    let strip=visuals.querySelector(".v46a-endpoint-strip");
    if(!strip){
      strip=document.createElement("div");strip.className="v46a-endpoint-strip";strip.innerHTML=`<figure><canvas data-v46a-endpoint="start"></canvas><figcaption><span>START</span><b>FRAME 000</b></figcaption></figure><figure><canvas data-v46a-endpoint="end"></canvas><figcaption><span>END</span><b data-v46a-end-frame>FRAME 072</b></figcaption></figure>`;
      stage.before(strip);
    }
  }

  setRenderMonitor(mode){
    if(!["live","endpoints","viewport"].includes(mode))mode="live";
    if(mode!==this.renderMonitor&&mode==="endpoints")this.endpointSignature="";
    this.renderMonitor=mode;sessionStorage.setItem(RENDER_MONITOR_KEY,mode);this.syncRenderMonitor();
  }

  setRendererWorkspace(workspace){
    const renderer=this.player?.renderer;if(!renderer)return;
    if(workspace==="render"&&this.renderMonitor==="viewport"){
      renderer.workspace="viewport";
      const state=this.store.get(),node=state.scene?.nodes?.[state.ui.selectedNodeId];renderer.setEditorCamera?.(state.scene.editorCamera);
      renderer.configureViewport?.({active:true,nodeId:state.ui.selectedNodeId,tool:"select",space:state.ui.viewportSpace,editMode:"calibrate",snapEnabled:false,nodeLocked:node?.locked,transformLocks:node?.transformLocks,cameraMode:"editor",onCameraChange:camera=>this.commands.dispatch("scene.setEditorCamera",{camera}),onCameraEnd:()=>{},onSelectNode:nodeId=>this.commands.dispatch("ui.selectNode",{nodeId})});
      return;
    }
    renderer.workspace=workspace;
    if(workspace!=="viewport")renderer.configureViewport?.({active:false});
  }

  syncRenderMonitor(){
    if(this.workspace!=="render")return;
    this.ensureRenderMonitor();
    const mode=["live","endpoints","viewport"].includes(this.renderMonitor)?this.renderMonitor:"live";
    document.body.dataset.v46aRenderMonitor=mode;
    document.querySelectorAll("[data-v46a-render-monitor]").forEach(button=>button.classList.toggle("active",button.dataset.v46aRenderMonitor===mode));
    const strip=document.querySelector(".v46a-endpoint-strip");if(strip)strip.hidden=mode!=="endpoints";
    this.setRendererWorkspace("render");
    if(mode==="endpoints")this.scheduleEndpointStills();
    const shot=activeShot(this.state),endLabel=document.querySelector("[data-v46a-end-frame]");if(shot&&endLabel)endLabel.textContent=`FRAME ${String(shot.durationFrames).padStart(3,"0")}`;
  }

  scheduleEndpointStills(){
    const state=this.store.get(),shot=activeShot(state);if(!shot)return;
    const signature=[shot.id,shot.updatedAt||"",shot.durationFrames,state.assets?.heroId,state.settings?.aspectRatio,state.settings?.fps].join("|");
    if(signature===this.endpointSignature)return;this.endpointSignature=signature;
    clearTimeout(this.endpointTimer);this.endpointTimer=setTimeout(()=>this.renderEndpointStills(),110);
  }

  async renderEndpointStills(){
    if(this.workspace!=="render"||this.renderMonitor!=="endpoints")return;
    const renderer=this.player?.renderer,shot=activeShot(this.store.get());if(!renderer||!shot)return;
    const startCanvas=document.querySelector('[data-v46a-endpoint="start"]'),endCanvas=document.querySelector('[data-v46a-endpoint="end"]');if(!startCanvas||!endCanvas)return;
    const state=this.store.get();
    const before=renderer.workspace;
    try{
      renderer.workspace="render";
      await renderer.captureToCanvas?.(evaluateShot(state,shot.id,0),state,startCanvas,0);
      await renderer.captureToCanvas?.(evaluateShot(state,shot.id,shot.durationFrames),state,endCanvas,shot.durationFrames/state.settings.fps);
    }catch(error){console.warn("V46A endpoint still capture unavailable",error);}
    finally{renderer.workspace=before;}
  }

  patchRendererFraming(){
    const renderer=this.player?.renderer;if(!renderer||renderer.__v46aFramingPatched)return;
    renderer.__v46aFramingPatched=true;this.rendererPatched=true;
    if(typeof renderer.applyState==="function"){
      const originalApplyState=renderer.applyState.bind(renderer);
      renderer.applyState=(frame,state,wallTime=0,options={})=>{
        const stable=stabilizedFrame(frame);
        const camera=originalApplyState(stable,state,wallTime,options);
        if(camera&&renderer.shotCamera&&camera===renderer.shotCamera)this.applyCreativeCameraFraming(renderer,stable,camera);
        return camera;
      };
    }
    if(typeof renderer.render==="function"){const originalRender=renderer.render.bind(renderer);renderer.render=(frame,state,wallTime=0)=>originalRender(stabilizedFrame(frame),state,wallTime);}
    if(typeof renderer.captureToCanvas==="function"){const originalCapture=renderer.captureToCanvas.bind(renderer);renderer.captureToCanvas=(frame,state,targetCanvas,wallTime=0)=>originalCapture(stabilizedFrame(frame),state,targetCanvas,wallTime);}
  }

  applyCreativeCameraFraming(renderer,frame,camera){
    const T=renderer.T,hero=renderer.nodeGroups?.get?.("hero-proxy");if(!T||!hero||!camera)return;
    hero.updateMatrixWorld?.(true);const box=new T.Box3().setFromObject(hero,true);if(box.isEmpty())return;
    const sphere=box.getBoundingSphere(new T.Sphere()),radius=Math.max(.001,sphere.radius),t=Math.max(0,Math.min(1,Number(frame.t??frame.linear??0)));
    const startChoices=frame.choices?.start||{},endChoices=frame.choices?.end||{};
    const compA=endpointFraming(COMPOSITION_CAMERA,startChoices.composition,"start"),compB=endpointFraming(COMPOSITION_CAMERA,endChoices.composition,"end"),comp=mixPair(compA,compB,t);
    const target=sphere.center.clone();target.x+=(Number(frame.values["camera.targetX"])||0)*radius+(comp.x||0)*radius;target.y+=(Number(frame.values["camera.targetY"])||0)*radius+(comp.y||0)*radius;
    const rel=camera.position.clone().sub(target);let distance=Math.max(.01,rel.length());
    const sizeA=endpointScalar(SIZE_CAMERA,startChoices["subject-size"],"start",1),sizeB=endpointScalar(SIZE_CAMERA,endChoices["subject-size"],"end",1),sizeFactor=lerp(sizeA,sizeB,t);distance*=sizeFactor;
    const currentAz=Math.atan2(rel.x,rel.z),horizontal=Math.max(.001,Math.hypot(rel.x,rel.z)),currentEl=Math.atan2(rel.y,horizontal);
    const viewA=endpointFraming(VIEW_CAMERA,startChoices.view,"start"),viewB=endpointFraming(VIEW_CAMERA,endChoices.view,"end"),view=mixPair(viewA,viewB,t),az=currentAz+(view.az||0),el=Math.max(-1.35,Math.min(1.35,currentEl+(view.el||0)));
    const h=Math.cos(el)*distance;camera.position.set(target.x+Math.sin(az)*h,target.y+Math.sin(el)*distance,target.z+Math.cos(az)*h);camera.up.set(0,1,0);camera.lookAt(target);camera.updateMatrixWorld?.(true);
  }

  ensureOriginAxes(){
    const renderer=this.player?.renderer,T=renderer?.T;if(!renderer?.scene||!T)return;
    if(!renderer.v46aOriginAxes){const axes=new T.AxesHelper(.75);axes.name="V46A_ZERO_PIVOT_XYZ";axes.renderOrder=998;axes.material?.forEach?.(m=>{m.depthTest=false;m.transparent=true;m.opacity=.72;});renderer.scene.add(axes);renderer.v46aOriginAxes=axes;}
    renderer.v46aOriginAxes.visible=this.workspace==="viewport"&&this.state.scene.showHelpers!==false;
  }

  autoGroundAndZeroPivot(){
    if(this.workspace!=="viewport")return;
    const state=this.store.get(),assetId=state.assets?.heroId,renderer=this.player?.renderer;if(!assetIsCustom(assetId)||!renderer||!renderer.loadedAssets?.has?.(assetId))return;
    const projectId=state.meta?.id||"project",key=`${GROUND_KEY_PREFIX}${projectId}.${assetId}`;if(localStorage.getItem(key)==="1")return;
    const pivot=renderer.resolvePivotValue?.("hero-proxy",[0,0,0],state);if(!pivot)return;
    this.commands.dispatch("scene.setNodePivotCompensated",{nodeId:"hero-proxy",...pivot});
    this.store.commit("V46A show zero pivot",draft=>{const node=draft.scene?.nodes?.["hero-proxy"];if(node){node.helpers??={};node.helpers.pivot=true;}});
    requestAnimationFrame(()=>{const next=this.store.get(),transform=renderer.getGroundedTransform?.("hero-proxy",next);if(!transform)return;this.commands.dispatch("scene.groundNode",{nodeId:"hero-proxy",transform});renderer.frameNode?.("hero-proxy",false);localStorage.setItem(key,"1");});
  }

  dispose(){
    if(this.raf)cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    clearTimeout(this.heroPollTimer);
    clearTimeout(this.endpointTimer);
    this.unsubscribe?.();
    this.finishDeltaGesture(true);
    if(this.unloadHandler)removeEventListener("beforeunload",this.unloadHandler);
  }

  patchRotationOwnership(){
    const handlers=this.commands?.handlers;
    if(!handlers||handlers.__v46RotationPatched)return;
    handlers.__v46RotationPatched=true;

    this.wrapCommandMutation("shot.setCreativeChoice",(draft,payload,before)=>{
      restoreStableSubject(draft,before,{allowYaw:payload?.axisId==="subject-rotation"});
      if(payload?.axisId!=="subject-rotation")restoreRotation(draft,before);
      enforceShotRotationForActive(draft);
    });
    this.wrapCommandMutation("shot.setAxis",(draft,payload,before)=>{
      if(String(payload?.axisId||"").startsWith("subject.")&&payload?.axisId!=="subject.rotationY")restoreStableSubject(draft,before,{allowYaw:true});
      if(payload?.axisId==="subject.rotationY"&&draft.ui?.selectedMacroId!=="subject")restoreRotation(draft,before);
    });
    ["shot.generateVariant","shot.applyPreset","shot.reset","shot.setFamily","shot.new","shot.duplicate"].forEach(type=>{
      this.wrapCommandMutation(type,draft=>{enforceStableSubjects(draft);enforceAllShotRotations(draft);});
    });
  }

  wrapCommandMutation(type,afterMutate){
    const handler=this.commands.handlers.get(type);
    if(!handler||handler.__v46Wrapped)return;
    const store=this.store;
    const wrapped=(payload,context)=>{
      const before=rotationSnapshot(store.get());
      const originalCommit=store.commit;
      const originalTransient=store.transient;
      const originalUpdateGesture=store.updateGesture;
      const wrapMethod=original=>(label,mutator,options)=>original.call(store,label,draft=>{mutator(draft);afterMutate(draft,payload,before);},options);
      store.commit=wrapMethod(originalCommit);
      store.transient=wrapMethod(originalTransient);
      store.updateGesture=wrapMethod(originalUpdateGesture);
      try{return handler(payload,context);}finally{store.commit=originalCommit;store.transient=originalTransient;store.updateGesture=originalUpdateGesture;}
    };
    wrapped.__v46Wrapped=true;
    this.commands.handlers.set(type,wrapped);
  }

  migrateRotationOwnership(){
    const projectId=this.state?.meta?.id||"project";
    const key=ROTATION_KEY_PREFIX+projectId;
    if(localStorage.getItem(key)==="1")return;
    localStorage.setItem(key,"1");
    this.store.commit("V46A normalize grounded subject",draft=>{enforceStableSubjects(draft);enforceAllShotRotations(draft);Object.values(draft.shots?.byId||{}).forEach(shot=>shot.variantMode="balanced");});
    this.shell?.toast?.("V46A · SUBJECT GROUNDED · CAMERA OWNS FRAMING");
  }
}

function rotationSnapshot(state){
  const shot=activeShot(state);
  if(!shot)return null;
  const keys=["subject.positionX","subject.positionY","subject.positionZ","subject.scale","subject.rotationX","subject.rotationY","subject.rotationZ"];
  return {shotId:shot.id,start:shot.start?.values?.["subject.rotationY"],end:shot.end?.values?.["subject.rotationY"],startValues:Object.fromEntries(keys.map(key=>[key,shot.start?.values?.[key]])),endValues:Object.fromEntries(keys.map(key=>[key,shot.end?.values?.[key]]))};
}

function restoreRotation(state,snapshot){
  if(!snapshot)return;
  const shot=state.shots?.byId?.[snapshot.shotId];
  if(!shot)return;
  shot.start.values["subject.rotationY"]=snapshot.start;
  shot.end.values["subject.rotationY"]=snapshot.end;
}

function enforceAllShotRotations(state){
  Object.values(state.shots?.byId||{}).forEach(shot=>{
    const startChoice=shot.start?.choices?.["subject-rotation"];
    const endChoice=shot.end?.choices?.["subject-rotation"];
    const start=ROTATION_BY_CHOICE[startChoice];
    const end=ROTATION_BY_CHOICE[endChoice];
    if(start&&shot.start?.values)shot.start.values["subject.rotationY"]=start.start;
    if(end&&shot.end?.values)shot.end.values["subject.rotationY"]=end.end;
  });
}

const STABLE_SUBJECT_KEYS=["subject.positionX","subject.positionY","subject.positionZ","subject.scale","subject.rotationX","subject.rotationZ"];
const VIEW_CAMERA={
  centered:{start:{az:0,el:0},end:{az:0,el:0}},
  "three-quarter":{start:{az:-.58,el:.03},end:{az:.48,el:.03}},
  "form-detail":{start:{az:-.30,el:.02},end:{az:.20,el:.02}},
  offset:{start:{az:-.12,el:0},end:{az:.12,el:0}},
  low:{start:{az:0,el:-.24},end:{az:0,el:-.15}},
  top:{start:{az:0,el:.62},end:{az:0,el:.48}},
  profile:{start:{az:Math.PI/2,el:0},end:{az:Math.PI/2,el:0}},
  orthogonal:{start:{az:0,el:0},end:{az:0,el:0}},
  "macro-three-quarter":{start:{az:-.46,el:.06},end:{az:.36,el:.06}},
  zenithal:{start:{az:0,el:1.05},end:{az:.08,el:.92}}
};
const SIZE_CAMERA={
  "very-small":{start:1.58,end:1.48},small:{start:1.30,end:1.22},medium:{start:1.05,end:.96},large:{start:.83,end:.77},overscale:{start:.68,end:.61}
};
const COMPOSITION_CAMERA={
  centered:{start:{x:0,y:0},end:{x:0,y:0}},
  thirds:{start:{x:.38,y:0},end:{x:-.38,y:0}},
  negative:{start:{x:-.52,y:0},end:{x:-.32,y:0}},
  "off-scale":{start:{x:.58,y:-.18},end:{x:-.34,y:.14}},
  low:{start:{x:0,y:.26},end:{x:0,y:.12}},
  peak:{start:{x:0,y:-.30},end:{x:0,y:-.12}}
};
function stabilizedFrame(frame){if(!frame?.values)return frame;const stable={...frame,values:{...frame.values}};stabilizeFrameValues(stable.values);return stable;}
function stabilizeFrameValues(values){if(!values)return;values["subject.positionX"]=0;values["subject.positionY"]=0;values["subject.positionZ"]=0;values["subject.scale"]=1;values["subject.rotationX"]=0;values["subject.rotationZ"]=0;}
function stabilizeShot(shot){if(!shot)return;for(const endpoint of ["start","end"]){const values=shot[endpoint]?.values;if(!values)continue;values["subject.positionX"]=0;values["subject.positionY"]=0;values["subject.positionZ"]=0;values["subject.scale"]=1;values["subject.rotationX"]=0;values["subject.rotationZ"]=0;}}
function enforceStableSubjects(state){Object.values(state.shots?.byId||{}).forEach(stabilizeShot);}
function restoreStableSubject(state,snapshot,{allowYaw=false}={}){const shot=state.shots?.byId?.[snapshot?.shotId]||activeShot(state);stabilizeShot(shot);if(!allowYaw&&snapshot&&shot){shot.start.values["subject.rotationY"]=snapshot.start;shot.end.values["subject.rotationY"]=snapshot.end;}}
function enforceShotRotationForActive(state){const shot=activeShot(state);if(!shot)return;const a=ROTATION_BY_CHOICE[shot.start?.choices?.["subject-rotation"]],b=ROTATION_BY_CHOICE[shot.end?.choices?.["subject-rotation"]];if(a)shot.start.values["subject.rotationY"]=a.start;if(b)shot.end.values["subject.rotationY"]=b.end;}
function endpointFraming(map,choice,endpoint){return map?.[choice]?.[endpoint]||{};}
function endpointScalar(map,choice,endpoint,fallback=1){const value=map?.[choice]?.[endpoint];return Number.isFinite(Number(value))?Number(value):fallback;}
function lerp(a,b,t){return Number(a)+(Number(b)-Number(a))*t;}
function mixPair(a={},b={},t=0){const keys=new Set([...Object.keys(a),...Object.keys(b)]),out={};for(const key of keys)out[key]=lerp(Number(a[key]||0),Number(b[key]||0),t);return out;}

function setStep(root,key,done,doneLabel,pendingLabel){
  const label=root.querySelector(`[data-v46-step="${key}"]`);
  const button=label?.closest("button");
  if(!label||!button)return;
  label.textContent=done?doneLabel:pendingLabel;
  button.classList.toggle("done",done);
}

function readJson(key,fallback){
  try{return JSON.parse(sessionStorage.getItem(key)||"")||fallback;}catch{return fallback;}
}
