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

const workspace=document.body.dataset.workspace||"render";
const root=document.getElementById("app");
let shell,player,workspaceController,sync,instrumentation;

boot().catch(error=>{
  console.error("V45 bootstrap failed",error);
  document.documentElement.classList.remove("is-booting");
  root.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;background:#060606;color:#ededed;font-family:Inter,system-ui;padding:24px;text-align:center"><div><h1 style="font-size:18px;letter-spacing:.12em">VISUALREF BOOT ERROR</h1><p style="color:#8b8b90;line-height:1.6">${String(error?.message||error)}</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 16px;background:#17100e;border:1px solid #ff7950;color:#ff7950">RELOAD</button></div></main>`;
});

async function boot(){
  const persistence=new PersistenceService();
  const loaded=await persistence.load();
  const state=normalizeState(loaded||createDefaultState());
  state.ui.activeWorkspace=workspace;state.playback.mode=workspace==="timeline"?"sequence":workspace==="viewport"?"viewport":"shot";state.playback.playing=false;
  const history=new HistoryService(state.meta.id),workspaceSync=new WorkspaceSync();sync=workspaceSync;
  const store=new ProjectStore({state,history,persistence,sync:workspaceSync});
  instrumentation=createRuntimeInstrumentation({store});
  let toast=(message)=>console.info(message);
  const bus=new CommandBus({store,history,persistence,sync:workspaceSync,toast:message=>toast(message)});registerCommands(bus);
  shell=new AppShell({root,workspace,store,commands:bus,history});toast=message=>shell.toast(message);
  player=new PlayerController({root:shell.playerRoot,store,commands:bus,workspace,toast,persistence});
  if(workspace==="render")workspaceController=new RenderWorkspace({root:shell.panelRoot,store,commands:bus,toast});
  else if(workspace==="viewport")workspaceController=new ViewportWorkspace({root:shell.panelRoot,stage:player.stage,renderer:player.renderer,persistence,store,commands:bus,toast});
  else workspaceController=new TimelineWorkspace({root:shell.panelRoot,store,commands:bus,toast,persistence,player});
  store.transient("Boot workspace",draft=>{draft.ui.activeWorkspace=workspace;draft.playback.mode=workspace==="timeline"?"sequence":workspace==="viewport"?"viewport":"shot";},{persist:true,broadcast:true});
  globalThis.__MEMENTO_V45__={workspace,store,commands:bus,history,persistence,player,shell,instrumentation,version:"45",schema:state.schema};
  globalThis.__MEMENTO_V44__=globalThis.__MEMENTO_V43C__=globalThis.__MEMENTO_V43B__=globalThis.__MEMENTO_V45__;
  document.body.dataset.mementoBuild="v45";
  requestAnimationFrame(()=>{document.documentElement.classList.remove("is-booting");document.body.dataset.ready="true";});
  addEventListener("beforeunload",()=>{persistence.saveNow(store.get());workspaceController?.dispose();player?.dispose();shell?.dispose();instrumentation?.dispose();sync?.close();},{once:true});
}
