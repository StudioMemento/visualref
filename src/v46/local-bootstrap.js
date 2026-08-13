/* ============================================================================
   MEMENTO VISUALREF V46A · LOCAL SINGLE RUNTIME WORKFLOW
   One Project / One Store / One Player / One WebGL Renderer.
   Viewport and Render switch in-place. Timeline remains on the same runtime too,
   but receives no workflow redesign in this pass.
   ========================================================================== */

import {createDefaultState,normalizeState} from "../core/default-state.js";
import {HistoryService} from "../core/history-service.js";
import {PersistenceService} from "../core/persistence-service.js";
import {WorkspaceSync} from "../core/workspace-sync.js";
import {ProjectStore} from "../core/project-store.js";
import {CommandBus} from "../core/command-bus.js";
import {registerCommands} from "../core/commands.js";
import {AppShell} from "../ui/app-shell.js";
import {PlayerController} from "../player/player-controller.js";
import {RenderWorkspace} from "../workspaces/render-workspace.js";
import {ViewportWorkspace} from "../workspaces/viewport-workspace.js";
import {TimelineWorkspace} from "../workspaces/timeline-workspace.js";
import {createRuntimeInstrumentation} from "../v45/runtime-instrumentation.js";
import {installV46Polish} from "./polish-controller.js";

const root=document.getElementById("app");
const VALID_WORKSPACES=new Set(["viewport","render","timeline"]);
const workspaceFromPath=()=>{
  const file=(location.pathname.split("/").pop()||"").toLowerCase();
  if(file.startsWith("render"))return "render";
  if(file.startsWith("timeline"))return "timeline";
  return VALID_WORKSPACES.has(document.body.dataset.workspace)?document.body.dataset.workspace:"viewport";
};

let shell=null;
let player=null;
let workspaceController=null;
let sync=null;
let instrumentation=null;
let polish=null;
let runtimeApi=null;
let currentWorkspace=workspaceFromPath();
let disposed=false;

boot().catch(error=>fatal(error));

async function boot(){
  const persistence=new PersistenceService();
  const loaded=await persistence.load();
  const state=normalizeState(loaded||createDefaultState());
  state.ui.activeWorkspace=currentWorkspace;
  state.playback.mode=modeFor(currentWorkspace);
  state.playback.playing=false;

  const history=new HistoryService(state.meta.id);
  sync=new WorkspaceSync();
  const store=new ProjectStore({state,history,persistence,sync});
  instrumentation=createRuntimeInstrumentation({store});
  let toast=message=>console.info(message);
  const commands=new CommandBus({store,history,persistence,sync,toast:message=>toast(message)});
  registerCommands(commands);

  shell=new AppShell({root,workspace:currentWorkspace,store,commands,history});
  toast=message=>shell.toast(message);

  // IMPORTANT: create the one renderer in Viewport-capable mode first so the
  // TransformControls / pivot / orbit stack exists for the entire session.
  // We then switch the renderer between Viewport and Shot camera modes without
  // destroying the WebGL context or re-reading the GLB from IndexedDB.
  player=new PlayerController({root:shell.playerRoot,store,commands,workspace:"viewport",toast,persistence});
  await player.renderer.ready;

  runtimeApi={
    workspace:currentWorkspace,store,commands,history,persistence,player,shell,instrumentation,
    version:"46A",schema:state.schema,switchWorkspace,diagnostics:()=>({
      workspace:currentWorkspace,
      rendererMode:player?.renderer?.mode||"unknown",
      rendererOwner:player?.rendererAuthorityToken||null,
      loadedAssets:player?.renderer?.loadedAssets?.size||0,
      liveHero:store.get().assets.heroId,
      singleRuntime:true
    })
  };

  globalThis.__MEMENTO_V45__=globalThis.__MEMENTO_V44__=globalThis.__MEMENTO_V43C__=globalThis.__MEMENTO_V43B__=runtimeApi;
  globalThis.__MEMENTO_V46_INSTALLED__=false;
  polish=installV46Polish(runtimeApi)?.polish||globalThis.__MEMENTO_V46__?.polish||null;

  installRouteInterception();
  switchWorkspace(currentWorkspace,{replace:true,initial:true});

  document.body.dataset.mementoBuild="v46a";
  document.documentElement.dataset.mementoBuild="v46a";
  requestAnimationFrame(()=>{
    document.documentElement.classList.remove("is-booting","v46-preboot");
    document.body.dataset.ready="true";
  });

  addEventListener("beforeunload",disposeRuntime,{once:true});
}

function modeFor(workspace){return workspace==="timeline"?"sequence":workspace==="viewport"?"viewport":"shot";}

function createWorkspaceController(workspace){
  if(workspace==="viewport")return new ViewportWorkspace({root:shell.panelRoot,stage:player.stage,renderer:player.renderer,persistence:runtimeApi.persistence,store:runtimeApi.store,commands:runtimeApi.commands,toast:message=>shell.toast(message)});
  if(workspace==="render")return new RenderWorkspace({root:shell.panelRoot,store:runtimeApi.store,commands:runtimeApi.commands,toast:message=>shell.toast(message)});
  return new TimelineWorkspace({root:shell.panelRoot,store:runtimeApi.store,commands:runtimeApi.commands,toast:message=>shell.toast(message),persistence:runtimeApi.persistence,player});
}

function switchWorkspace(next,{replace=false,initial=false}={}){
  if(!VALID_WORKSPACES.has(next))return;
  if(!initial&&next===currentWorkspace&&workspaceController)return;

  workspaceController?.dispose?.();
  workspaceController=null;
  shell.panelRoot.replaceChildren();

  currentWorkspace=next;
  runtimeApi.workspace=next;
  if(globalThis.__MEMENTO_V46__)globalThis.__MEMENTO_V46__.workspace=next;
  if(polish)polish.workspace=next;
  shell.workspace=next;
  player.workspace=next;
  // Renderer was constructed in Viewport-capable mode. From this point only
  // the camera / interaction mode changes; its scene and mounted assets survive.
  if(player.renderer)player.renderer.workspace=next;
  document.body.dataset.workspace=next;

  if(next!=="viewport")player.renderer?.configureViewport?.({active:false});

  runtimeApi.store.transient("Workspace route",draft=>{
    draft.ui.activeWorkspace=next;
    draft.playback.mode=modeFor(next);
    draft.playback.playing=false;
  },{persist:false,broadcast:false});

  workspaceController=createWorkspaceController(next);
  updateNavigation(next);
  const playerWorkspaceLabel=player.root?.querySelector?.(".workspace-label");if(playerWorkspaceLabel)playerWorkspaceLabel.textContent=next.toUpperCase();
  player.renderUI?.();
  player.updateAllGates?.();
  polish?.schedule?.();

  if(!initial){
    const target=`./${next}.html${location.search}${location.hash}`;
    if(replace)history.replaceState({workspace:next},"",target);else history.pushState({workspace:next},"",target);
  }else if(replace){
    history.replaceState({workspace:next},"",`./${next}.html${location.search}${location.hash}`);
  }
  document.dispatchEvent(new CustomEvent("memento:workspace-change",{detail:{workspace:next,singleRuntime:true}}));
}

function updateNavigation(workspace){
  document.querySelectorAll("[data-nav-workspace]").forEach(link=>{
    const id=link.dataset.navWorkspace;
    const active=id===workspace;
    link.classList.toggle("active",active);
    link.setAttribute("aria-current",active?"page":"false");
  });
  const title={viewport:"Viewport",render:"Render",timeline:"Timeline"}[workspace];
  document.title=`MEMENTO VisualRef · ${title} · V46A`;
}

function installRouteInterception(){
  document.addEventListener("click",event=>{
    const link=event.target.closest?.("[data-nav-workspace],a[href$='viewport.html'],a[href$='render.html'],a[href$='timeline.html']");
    if(!link)return;
    const explicit=link.dataset.navWorkspace;
    const href=(link.getAttribute("href")||"").toLowerCase();
    const next=explicit||(href.includes("render.html")?"render":href.includes("timeline.html")?"timeline":href.includes("viewport.html")?"viewport":null);
    if(!next||!VALID_WORKSPACES.has(next))return;
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==="_blank")return;
    event.preventDefault();
    event.stopImmediatePropagation();
    switchWorkspace(next);
  },true);
  addEventListener("popstate",()=>switchWorkspace(workspaceFromPath(),{replace:true}));
}

function disposeRuntime(){
  if(disposed)return;disposed=true;
  try{runtimeApi?.persistence?.saveNow?.(runtimeApi.store.get());}catch{}
  try{workspaceController?.dispose?.();}catch{}
  try{polish?.dispose?.();}catch{}
  try{player?.dispose?.();}catch{}
  try{shell?.dispose?.();}catch{}
  try{instrumentation?.dispose?.();}catch{}
  try{sync?.close?.();}catch{}
}

function fatal(error){
  console.error("V46A bootstrap failed",error);
  document.documentElement.classList.remove("is-booting","v46-preboot");
  if(root)root.innerHTML=`<main class="v46-fatal"><div><b>V46A BOOT ERROR</b><p>${escapeHtml(String(error?.message||error))}</p><button onclick="location.reload()">RELOAD</button></div></main>`;
}
function escapeHtml(value){return String(value).replace(/[&<>\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));}
