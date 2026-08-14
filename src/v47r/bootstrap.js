import {RecoveryShell} from "./shell.js";
import {RecoveryPlayer} from "./player.js";
import {RecoveryPanels} from "./panels.js";
import {createRecoveryRendererClass} from "./recovery-renderer.js";
import {initializeRecoveryState,registerRecoveryCommands} from "./commands.js";

const params=new URLSearchParams(location.search),mock=params.get("mock")==="1",initialWorkspace=resolveWorkspace(params.get("workspace")||document.body.dataset.workspace||"viewport");
const root=document.getElementById("app");
const instrumentation={bootId:`v47r-${Date.now().toString(36)}`,mock,storeInstances:0,rendererInstances:0,workspaceSwitches:0,navigationEntries:performance.getEntriesByType?.("navigation")?.length||1,startedAt:performance.now()};
let shell,player,panels,store,commands,workspaces={},sync,authorityToken,visualTruthToken=0,lastHeroId=null;

boot().catch(error=>{console.error("V47R boot failed",error);document.documentElement.classList.remove("is-booting");if(shell)shell.fatal(error);else root.innerHTML=`<div class="vr-fatal"><div><b>V47R BOOT ERROR</b><p>${escapeHtml(error?.message||error)}</p><button onclick="location.reload()">RELOAD</button></div></div>`;});

async function boot(){
  const native=mock?await import("./mock-native.js"):await loadFrozenV45();
  const persistence=new native.PersistenceService(),loaded=await persistence.load(),state=initializeRecoveryState(native.normalizeState(loaded||native.createDefaultState()));
  state.ui.activeWorkspace=initialWorkspace;state.recovery.session.lastWorkspace=initialWorkspace;state.playback.mode=initialWorkspace==="timeline"?"sequence":initialWorkspace==="viewport"?"viewport":"shot";state.playback.playing=false;
  const history=new native.HistoryService(state.meta.id);sync=new native.WorkspaceSync();store=new native.ProjectStore({state,history,persistence,sync});instrumentation.storeInstances++;
  let toast=message=>console.info(message);commands=new native.CommandBus({store,history,persistence,sync,toast:message=>toast(message)});native.registerCommands(commands);registerRecoveryCommands(commands,{store,toast:message=>toast(message)});

  shell=new RecoveryShell({root,store,commands,workspace:initialWorkspace,mock});toast=message=>shell.toast(message);
  const RendererService=mock?native.RendererService:createRecoveryRendererClass(native.RendererService);
  player=new RecoveryPlayer({root:shell.playerRoot,store,commands,persistence,RendererService,evaluateShot:native.evaluateShot,evaluateSequence:native.evaluateSequence,sequenceDuration:native.sequenceDuration,workspace:initialWorkspace,toast:message=>shell.toast(message),onStatus:status=>shell.setRuntime({label:status.label,mode:status.mode}),instrumentation});
  authorityToken=native.RendererAuthority?.acquire?.("v47r:persistent-player")||null;

  const nativeRoots={viewport:shell.getWorkspaceRoot("viewport"),render:shell.getWorkspaceRoot("render"),timeline:shell.getWorkspaceRoot("timeline")};
  workspaces.viewport=new native.ViewportWorkspace({root:nativeRoots.viewport,stage:player.stage,renderer:player.renderer,persistence,store,commands,toast:message=>shell.toast(message)});
  workspaces.render=new native.RenderWorkspace({root:nativeRoots.render,store,commands,toast:message=>shell.toast(message)});
  workspaces.timeline=new native.TimelineWorkspace({root:nativeRoots.timeline,store,commands,toast:message=>shell.toast(message),persistence,player});
  panels=new RecoveryPanels({slot:shell.recoverySlot,store,commands,shell,player,nativeRoots,toast:message=>shell.toast(message)});

  let active=null,handlingPop=false;
  const coordinate=(project,meta={})=>{
    const next=resolveWorkspace(project.ui.activeWorkspace||project.recovery?.session?.lastWorkspace||"viewport"),heroId=project.assets?.heroId||"hero-proxy";
    if(next!==active){const hadActive=active!==null;active=next;if(hadActive)instrumentation.workspaceSwitches++;shell.setWorkspace(next,{initial:!hadActive});player.setWorkspace(next);panels.setWorkspace(next);if(next==="viewport")workspaces.viewport?.configureRenderer?.(project);updateRoute(next,handlingPop||meta?.type==="init"?"replace":"push");}
    if(next!=="viewport")player.renderer?.configureViewport?.({active:false,nodeId:project.ui.selectedNodeId,cameraMode:"shot"});
    if(heroId!==lastHeroId){const force=lastHeroId!==null;lastHeroId=heroId;scheduleVisualTruth(heroId,{force});}
    instrumentation.activeWorkspace=next;instrumentation.stateRevision=project.meta.updatedAt;
  };
  const coordinatorUnsubscribe=store.subscribe(coordinate);

  const popHandler=()=>{const workspace=resolveWorkspace(new URLSearchParams(location.search).get("workspace")||"viewport");if(workspace!==store.get().ui.activeWorkspace){handlingPop=true;try{store.transient("Browser workspace",draft=>{draft.ui.activeWorkspace=workspace;draft.recovery.session.lastWorkspace=workspace;draft.playback.mode=workspace==="timeline"?"sequence":workspace==="viewport"?"viewport":"shot";draft.playback.playing=false;});}finally{handlingPop=false;}}};addEventListener("popstate",popHandler);
  updateRoute(initialWorkspace,"replace");

  globalThis.__MEMENTO_V47R__={version:"47R",mock,store,commands,history,persistence,player,shell,workspaces,panels,instrumentation,getState:()=>structuredClone(store.get()),getRenderer:()=>player.renderer};
  document.body.dataset.ready="true";document.body.dataset.mementoBuild="v47r";document.documentElement.classList.remove("is-booting");shell.setRuntime({label:mock?"MOCK · ONE RUNTIME":"V45 CORE · ONE RUNTIME",mode:mock?"fallback":"ready"});
  requestAnimationFrame(()=>root.querySelector(".vr-boot")?.remove());

  addEventListener("beforeunload",()=>{visualTruthToken++;try{persistence.saveNow?.(store.get());}catch{}coordinatorUnsubscribe?.();panels?.dispose();for(const workspace of Object.values(workspaces))workspace?.dispose?.();player?.dispose();shell?.dispose();native.RendererAuthority?.release?.(authorityToken);sync?.close?.();removeEventListener("popstate",popHandler);},{once:true});
}

async function scheduleVisualTruth(assetId,{force=false}={}){
  if(!player?.renderer||!store||!commands)return;const project=store.get(),session=project.recovery?.session||{};
  if(!force&&session.visualTruthVersion===1&&session.visualTruthAssetId===assetId)return;
  const token=++visualTruthToken,renderer=player.renderer;
  try{await renderer.ready;}catch{return;}
  for(let attempt=0;attempt<300&&token===visualTruthToken;attempt++){
    const state=store.get(),asset=state.assets?.byId?.[assetId],loaded=asset?.source==="builtin"||!renderer.loadedAssets||renderer.loadedAssets.has?.(assetId)||["missing","error"].includes(asset?.status);
    if(loaded){
      workspaces.viewport?.configureRenderer?.(state);
      const transform=renderer.getGroundedTransform?.("hero-proxy",state);
      commands.dispatch("world.recoverVisualTruth",{nodeId:"hero-proxy",transform,assetId});
      renderer.frameNode?.("hero-proxy",false);
      instrumentation.visualTruthRecoveries=(instrumentation.visualTruthRecoveries||0)+1;
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,50));
  }
}

async function loadFrozenV45(){
  const base="https://cdn.jsdelivr.net/gh/StudioMemento/visualref@48ff1e50424da0a0546ade9039f00368073f56f2/src";
  const [defaults,history,persistence,sync,store,bus,commands,renderer,interpolator,renderWorkspace,viewportWorkspace,timelineWorkspace,authority]=await Promise.all([
    import(`${base}/core/default-state.js`),import(`${base}/core/history-service.js`),import(`${base}/core/persistence-service.js`),import(`${base}/core/workspace-sync.js`),import(`${base}/core/project-store.js`),import(`${base}/core/command-bus.js`),import(`${base}/core/commands.js`),import(`${base}/engine/renderer-service.js`),import(`${base}/player/shot-interpolator.js`),import(`${base}/workspaces/render-workspace.js`),import(`${base}/workspaces/viewport-workspace.js`),import(`${base}/workspaces/timeline-workspace.js`),import(`${base}/v45/renderer-authority.js`)
  ]);
  return {createDefaultState:defaults.createDefaultState,normalizeState:defaults.normalizeState,HistoryService:history.HistoryService,PersistenceService:persistence.PersistenceService,WorkspaceSync:sync.WorkspaceSync,ProjectStore:store.ProjectStore,CommandBus:bus.CommandBus,registerCommands:commands.registerCommands,RendererService:renderer.RendererService,evaluateShot:interpolator.evaluateShot,evaluateSequence:interpolator.evaluateSequence,sequenceDuration:interpolator.sequenceDuration,RenderWorkspace:renderWorkspace.RenderWorkspace,ViewportWorkspace:viewportWorkspace.ViewportWorkspace,TimelineWorkspace:timelineWorkspace.TimelineWorkspace,RendererAuthority:authority.RendererAuthority};
}
function resolveWorkspace(value){return ["viewport","render","timeline"].includes(value)?value:"viewport";}
function updateRoute(workspace,mode="push"){
  const url=new URL(location.href);url.searchParams.set("workspace",workspace);if(mock)url.searchParams.set("mock","1");const target=`${url.pathname}${url.search}${url.hash}`;if(mode==="replace")history.replaceState({workspace},"",target);else if(new URL(location.href).searchParams.get("workspace")!==workspace)history.pushState({workspace},"",target);
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
