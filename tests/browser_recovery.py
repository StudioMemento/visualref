from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'acceptance';OUT.mkdir(parents=True,exist_ok=True)

def clean_module(path: Path) -> str:
    source=path.read_text()
    source=re.sub(r'^\s*import\s+.*?;\s*$', '', source, flags=re.M)
    source=re.sub(r'\bexport\s+(?=(?:const|let|var|function|class)\b)', '', source)
    source=re.sub(r'^\s*export\s*\{[^}]*\};?\s*$', '', source, flags=re.M)
    return source

def wrap(name,path,exports,params='',args=''):
    body=clean_module(ROOT/path)
    if params:
        return f"const {name}=(({params})=>{{\n{body}\nreturn {{{','.join(exports)}}};\n}})({args});\n"
    return f"const {name}=(()=>{{\n{body}\nreturn {{{','.join(exports)}}};\n}})();\n"

def browser_bundle():
    chunks=[]
    chunks.append(wrap('Delta','src/v47r/delta-engine.js',[
        'AXIS_RANGES','CREATIVE_CATEGORY','NUMERIC_CATEGORY','normalizeSeed','candidateProfile','evaluateShotSnapshot','collectLockedCategories','compareShots','generationFingerprint','generateCandidateFromState']))
    chunks.append(wrap('Commands','src/v47r/commands.js',['initializeRecoveryState','ensureCandidateRecord','candidateRecord','registerRecoveryCommands'],'{generateCandidateFromState,normalizeSeed}','Delta'))
    chunks.append(wrap('Shell','src/v47r/shell.js',['RecoveryShell']))
    chunks.append(wrap('Player','src/v47r/player.js',['RecoveryPlayer'],'{candidateRecord},{evaluateShotSnapshot}','Commands,Delta'))
    chunks.append(wrap('Panels','src/v47r/panels.js',['RecoveryPanels'],'{candidateRecord}','Commands'))
    chunks.append(wrap('Mock','src/v47r/mock-native.js',[
        'createDefaultState','normalizeState','HistoryService','PersistenceService','WorkspaceSync','ProjectStore','CommandBus','registerCommands','activeShot','evaluateShot','sequenceDuration','evaluateSequence','RendererService','RendererAuthority','ViewportWorkspace','RenderWorkspace','TimelineWorkspace']))
    chunks.append(r'''
(async()=>{
  const instrumentation={bootId:'browser-acceptance',mock:true,storeInstances:0,rendererInstances:0,workspaceSwitches:0,navigationEntries:performance.getEntriesByType('navigation').length,startedAt:performance.now()};
  const persistence=new Mock.PersistenceService(),state=Commands.initializeRecoveryState(Mock.createDefaultState());
  state.ui.activeWorkspace='viewport';state.playback.mode='viewport';state.playback.playing=false;
  const historyService=new Mock.HistoryService(state.meta.id),sync=new Mock.WorkspaceSync(),store=new Mock.ProjectStore({state,history:historyService,persistence,sync});instrumentation.storeInstances++;
  let shell=null;let toast=message=>console.info(message);const commands=new Mock.CommandBus({store,history:historyService,persistence,sync,toast:message=>toast(message)});Mock.registerCommands(commands);Commands.registerRecoveryCommands(commands,{store,toast:message=>toast(message)});
  shell=new Shell.RecoveryShell({root:document.getElementById('app'),store,commands,workspace:'viewport',mock:true});toast=message=>shell.toast(message);
  const player=new Player.RecoveryPlayer({root:shell.playerRoot,store,commands,persistence,RendererService:Mock.RendererService,evaluateShot:Mock.evaluateShot,evaluateSequence:Mock.evaluateSequence,sequenceDuration:Mock.sequenceDuration,workspace:'viewport',toast:message=>shell.toast(message),onStatus:status=>shell.setRuntime(status),instrumentation});
  const nativeRoots={viewport:shell.getWorkspaceRoot('viewport'),render:shell.getWorkspaceRoot('render'),timeline:shell.getWorkspaceRoot('timeline')};
  const workspaces={viewport:new Mock.ViewportWorkspace({root:nativeRoots.viewport,stage:player.stage,renderer:player.renderer,persistence,store,commands,toast}),render:new Mock.RenderWorkspace({root:nativeRoots.render,store,commands,toast}),timeline:new Mock.TimelineWorkspace({root:nativeRoots.timeline,store,commands,toast,persistence,player})};
  const panels=new Panels.RecoveryPanels({slot:shell.recoverySlot,store,commands,shell,player,nativeRoots,toast});
  let active='viewport';store.subscribe(project=>{const next=project.ui.activeWorkspace||'viewport';if(next!==active){active=next;instrumentation.workspaceSwitches++;}shell.setWorkspace(next,{initial:true});player.setWorkspace(next);panels.setWorkspace(next);instrumentation.activeWorkspace=next;instrumentation.stateRevision=project.meta.updatedAt;});
  window.__MEMENTO_V47R__={version:'47R',mock:true,store,commands,history:historyService,persistence,player,shell,workspaces,panels,instrumentation,getState:()=>structuredClone(store.get()),getRenderer:()=>player.renderer};
  document.body.dataset.ready='true';document.body.dataset.workspace='viewport';document.body.dataset.mementoBuild='v47r';document.documentElement.classList.remove('is-booting');
})();
''')
    return '\n'.join(chunks)

def wait_ready(page):
    page.wait_for_selector('body[data-ready="true"]',timeout=20000)
    page.wait_for_function("() => Boolean(window.__MEMENTO_V47R__?.store)")

def state(page): return page.evaluate("() => window.__MEMENTO_V47R__.getState()")

def main():
    css=(ROOT/'css'/'v47r.css').read_text()
    html=f'''<!doctype html><html class="is-booting"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}</style></head><body data-memento-build="v47r" data-workspace="viewport"><div id="app"></div></body></html>'''
    bundle=browser_bundle()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1)
        page=context.new_page();page_errors=[]
        page.on('pageerror',lambda error: page_errors.append(str(error)))
        page.set_content(html,wait_until='domcontentloaded');page.add_script_tag(content=bundle);wait_ready(page)
        boot=page.evaluate("() => ({renderer:__MEMENTO_V47R__.instrumentation.rendererId,renderers:__MEMENTO_V47R__.instrumentation.rendererInstances,stores:__MEMENTO_V47R__.instrumentation.storeInstances,timeOrigin:performance.timeOrigin})")
        assert boot['renderers']==1 and boot['stores']==1,boot
        assert page.locator('body').get_attribute('data-workspace')=='viewport'
        page.screenshot(path=str(OUT/'v47r-viewport-1920x1080.png'),full_page=True)

        page.locator('[data-workspace-nav="render"]').click();page.wait_for_function("() => document.body.dataset.workspace === 'render'")
        page.locator('[data-delta-target]').evaluate("el => { el.value='55'; el.dispatchEvent(new Event('input',{bubbles:true})); }")
        before=state(page)['shots'];page.locator('[data-recovery-action="generate"]').click();page.wait_for_function("() => Boolean(__MEMENTO_V47R__.getState().recovery.candidates[__MEMENTO_V47R__.getState().shots.activeShotId].candidate)")
        generated=state(page);assert generated['shots']==before,'generation mutated Current before acceptance'
        assert page.locator('[data-role="review-badge"]').inner_text()=='CANDIDATE'
        page.screenshot(path=str(OUT/'v47r-render-candidate-1920x1080.png'),full_page=True)
        page.locator('[data-recovery-action="accept"]').click();page.wait_for_function("() => __MEMENTO_V47R__.getState().recovery.candidates[__MEMENTO_V47R__.getState().shots.activeShotId].candidate === null")
        accepted=state(page);assert accepted['shots']!=before,'accept did not change Current'
        record=accepted['recovery']['candidates'][accepted['shots']['activeShotId']];assert record['previous'] is not None
        page.locator('[data-recovery-action="add-shot"]').click();page.wait_for_function("() => Object.keys(__MEMENTO_V47R__.getState().timeline.clips).length >= 1")

        page.locator('[data-workspace-nav="timeline"]').click();page.wait_for_function("() => document.body.dataset.workspace === 'timeline'")
        timeline=state(page);assert len(timeline['timeline']['clips'])>=1
        runtime=page.evaluate("() => ({renderer:__MEMENTO_V47R__.instrumentation.rendererId,renderers:__MEMENTO_V47R__.instrumentation.rendererInstances,stores:__MEMENTO_V47R__.instrumentation.storeInstances,timeOrigin:performance.timeOrigin,switches:__MEMENTO_V47R__.instrumentation.workspaceSwitches})")
        assert runtime['renderer']==boot['renderer'] and runtime['renderers']==1 and runtime['stores']==1 and runtime['timeOrigin']==boot['timeOrigin'],runtime
        page.screenshot(path=str(OUT/'v47r-timeline-1920x1080.png'),full_page=True)

        page.locator('[data-workspace-nav="render"]').click();page.wait_for_function("() => document.body.dataset.workspace === 'render'")
        page.set_viewport_size({'width':5120,'height':1440});page.wait_for_timeout(250)
        editor_width=page.locator('.vr-editor-column').bounding_box()['width'];assert editor_width<=735,editor_width
        page.screenshot(path=str(OUT/'v47r-render-5120x1440.png'),full_page=True)

        page.set_viewport_size({'width':390,'height':844});page.locator('[data-workspace-nav="viewport"]').click();page.wait_for_function("() => document.body.dataset.workspace === 'viewport'");page.wait_for_timeout(200)
        page.screenshot(path=str(OUT/'v47r-viewport-390x844.png'),full_page=True)
        assert page.locator('.vr-player-column').bounding_box()['height']>180
        assert not page_errors,page_errors
        print(json.dumps({'browser':'passed','rendererInstances':runtime['renderers'],'workspaceSwitches':runtime['switches'],'ultrawideEditorWidth':round(editor_width,1),'screenshots':5},indent=2))
        browser.close()

if __name__=='__main__': main()
