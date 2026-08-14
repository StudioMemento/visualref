/* ============================================================================
   MEMENTO VISUALREF V46 POLISH CONTROLLER
   Additive runtime layer over the frozen V45 core.

   V46 changes product entry, presentation and control ownership without
   replacing the scene/store/history engine. The overlay is intentionally
   isolated so the V45 project remains recoverable.
   ========================================================================== */

const GUIDE_KEY="memento.visualref.v46.guide.dismissed";
const TAB_KEY="memento.visualref.v46.viewport.tab";
const PRECISION_KEY="memento.visualref.v46.precision.open";
const TIMELINE_KEY="memento.visualref.v46.timeline.onboarded";
const ROTATION_KEY_PREFIX="memento.visualref.v46.rotation.";

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
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
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
  const publicApi={...api,version:"46",polish:controller};
  globalThis.__MEMENTO_V46__=publicApi;
  document.dispatchEvent(new CustomEvent("memento:v46-ready",{detail:{workspace:api.workspace}}));
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
    this.precisionOpen=new Set(readJson(PRECISION_KEY,[]));
    const savedTab=sessionStorage.getItem(TAB_KEY);
    this.viewportTab=["scene","properties","world"].includes(savedTab)?savedTab:"scene";
  }

  init(){
    document.body.dataset.mementoBuild="v46";
    document.documentElement.dataset.mementoBuild="v46";
    this.patchRotationOwnership();
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
    document.title=document.title.replace(/V45/gi,"V46");
    document.body.dataset.mementoBuild="v46";
    document.querySelectorAll(".release-mark").forEach(node=>{if(node.textContent!=="V46")node.textContent="V46";});
    document.querySelectorAll(".project-button span").forEach(node=>{
      if(/^MEMENTO V45$/i.test(node.textContent.trim()))node.textContent="MEMENTO V46";
    });
    document.querySelectorAll(".project-button small").forEach(node=>{
      if(/project/i.test(node.textContent))node.textContent="POLISH PASS";
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
    if(this.workspace==="render")this.ensurePlayerDeltaControl();
  }

  ensurePlayerDeltaControl(){
    const settings=document.querySelector(".transport-secondary");
    if(!settings||settings.querySelector(".v46-player-delta")){
      this.syncPlayerDelta();
      return;
    }
    const field=document.createElement("label");
    field.className="transport-field v46-player-delta";
    field.innerHTML=`<span>DELTA</span><input data-v46-delta type="range" min="5" max="95" step="1"><output data-v46-delta-output>42</output>`;
    const variant=settings.querySelector(".variant-mode");
    settings.insertBefore(field,variant||settings.firstChild);
    this.syncPlayerDelta();
  }

  syncPlayerDelta(){
    const shot=activeShot(this.state);
    const slider=document.querySelector("[data-v46-delta]");
    const output=document.querySelector("[data-v46-delta-output]");
    if(!shot||!slider)return;
    const value=Math.round((shot.deltaTarget??.42)*100);
    if(document.activeElement!==slider)slider.value=String(value);
    if(output)output.textContent=String(value).padStart(2,"0");
  }

  reconcileViewport(){
    this.ensureViewportTabs();
    this.ensureViewportGuideToggle();
    this.ensureMayaHud();
    this.ensureWorldGuide();
    this.syncViewportState();
  }

  ensureViewportTabs(){
    const content=document.querySelector(".v45-viewport .viewport-content");
    if(!content)return;
    content.classList.add("v46-tabbed-editor");
    let tabs=content.querySelector(".v46-editor-tabs");
    if(!tabs){
      tabs=document.createElement("nav");
      tabs.className="v46-editor-tabs";
      tabs.setAttribute("aria-label","Viewport editor sections");
      tabs.innerHTML=`
        <button data-v46-editor-tab="scene" title="World outliner" aria-label="World outliner">${ICON.scene}<span>SCENE</span></button>
        <button data-v46-editor-tab="properties" title="Selected properties" aria-label="Selected properties">${ICON.properties}<span>PROPERTIES</span></button>
        <button data-v46-editor-tab="world" title="World and HDRI" aria-label="World and HDRI">${ICON.world}<span>WORLD</span></button>`;
      content.prepend(tabs);
    }
    content.dataset.v46Tab=this.viewportTab;
    const inspector=content.querySelector(".v45-inspector");
    if(inspector){
      [...inspector.querySelectorAll(".section")].forEach(section=>{
        const label=section.querySelector(".section-header span")?.textContent?.trim().toUpperCase()||"";
        section.classList.toggle("v46-world-section",label.includes("WORLD")||label.includes("HDRI"));
      });
    }
    tabs.querySelectorAll("[data-v46-editor-tab]").forEach(button=>{
      const active=button.dataset.v46EditorTab===this.viewportTab;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",String(active));
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
    if(!hud){
      hud=document.createElement("div");
      hud.className="v46-maya-hud";
      hud.innerHTML=`
        <nav aria-label="Viewport transform tools">
          <button data-v46-tool="select" title="Select · Q">${ICON.select}<kbd>Q</kbd></button>
          <button data-v46-tool="translate" title="Move · W">${ICON.move}<kbd>W</kbd></button>
          <button data-v46-tool="rotate" title="Rotate · E">${ICON.rotate}<kbd>E</kbd></button>
          <button data-v46-tool="scale" title="Scale · R">${ICON.scale}<kbd>R</kbd></button>
          <i></i>
          <button data-v46-viewport-action="frame" title="Frame selected · F">${ICON.frame}<kbd>F</kbd></button>
          <button data-v46-viewport-action="grid" title="Toggle grid">${ICON.grid}</button>
        </nav>
        <div class="v46-maya-readout"><span data-v46-camera-label>PERSPECTIVE</span><b data-v46-selected-label>WORLD</b><em data-v46-space-label>WORLD</em></div>`;
      stage.append(hud);
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
    if(cameraLabel)cameraLabel.textContent=state.scene.viewportCameraMode==="shot"?"SHOT CAMERA":"PERSPECTIVE";
  }

  reconcileRender(){
    this.ensureAxisOverview();
    this.decorateOptionChips();
    this.sanitizePrecisionOwnership();
    this.restorePrecisionPanels();
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
      let flags=chip.querySelector(".v46-chip-endpoints");
      if(!flags){
        flags=document.createElement("span");
        flags.className="v46-chip-endpoints";
        flags.innerHTML='<i>START</i><b>=</b><em>END</em>';
        chip.append(flags);
      }
      flags.querySelector("i")?.classList.toggle("active",chip.classList.contains("selected-start"));
      flags.querySelector("em")?.classList.toggle("active",chip.classList.contains("selected-end"));
      flags.querySelector("b")?.classList.toggle("active",chip.classList.contains("shared-option"));
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
    if(event.target.matches("[data-v46-delta]")){
      const value=Math.max(5,Math.min(95,Number(event.target.value)||42));
      const output=document.querySelector("[data-v46-delta-output]");
      if(output)output.textContent=String(value).padStart(2,"0");
      if(!this.deltaGesture){this.store.beginGesture("Set delta target");this.deltaGesture=true;}
      this.store.updateGesture("Set delta target",draft=>{const shot=activeShot(draft);if(shot)shot.deltaTarget=value/100;});
    }
  }

  onChange(event){
    if(event.target.matches("[data-v46-delta]")){this.finishDeltaGesture();return;}
    if(event.target.matches("[data-v46-timeline-variant]")){
      const mode=event.target.value;
      this.store.transient("V46 variant mode",draft=>{const shot=activeShot(draft);if(shot)shot.variantMode=mode;},{persist:true,broadcast:true});
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
      if(this.workspace!=="viewport"){location.href="./viewport.html";return;}
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
    if(action==="render")location.href="./render.html";
  }

  handleViewportAction(action){
    if(action==="frame")this.player?.renderer?.frameNode?.(this.state.ui.selectedNodeId,false);
    if(action==="grid")this.commands.dispatch("scene.toggleGrid");
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

  dispose(){
    if(this.raf)cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    clearTimeout(this.heroPollTimer);
    this.unsubscribe?.();
    this.finishDeltaGesture(true);
    if(this.unloadHandler)removeEventListener("beforeunload",this.unloadHandler);
  }

  patchRotationOwnership(){
    const handlers=this.commands?.handlers;
    if(!handlers||handlers.__v46RotationPatched)return;
    handlers.__v46RotationPatched=true;

    this.wrapCommandMutation("shot.setCreativeChoice",(draft,payload,before)=>{
      if(payload?.axisId!=="subject-rotation")restoreRotation(draft,before);
    });
    this.wrapCommandMutation("shot.setAxis",(draft,payload,before)=>{
      if(this.workspace==="render"&&payload?.axisId==="subject.rotationY"&&draft.ui?.selectedMacroId!=="subject")restoreRotation(draft,before);
    });
    ["shot.generateVariant","shot.applyPreset","shot.reset","shot.setFamily","shot.new","shot.duplicate"].forEach(type=>{
      this.wrapCommandMutation(type,draft=>enforceAllShotRotations(draft));
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
    this.store.commit("V46 normalize subject rotation",draft=>enforceAllShotRotations(draft));
    this.shell?.toast?.("V46 · SUBJECT ROTATION NOW OWNS THE FINAL ANGLE");
  }
}

function rotationSnapshot(state){
  const shot=activeShot(state);
  if(!shot)return null;
  return {shotId:shot.id,start:shot.start?.values?.["subject.rotationY"],end:shot.end?.values?.["subject.rotationY"]};
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
