#!/usr/bin/env python3
"""Exercise the real V46A bootstrap workspace-switch code with local mock services."""
from __future__ import annotations
import asyncio, json, re, shutil
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
BOOT=ROOT/'src/v46/bootstrap.js'

def script_source():
    src=BOOT.read_text(encoding='utf-8')
    src=re.sub(r'^\s*import\s+.*?;\s*$', '', src, flags=re.M)
    mocks=r'''
const __counts={players:0,workspaces:{viewport:0,render:0,timeline:0},disposed:0,pushes:[]};
history.pushState=(state,title,url)=>__counts.pushes.push({kind:'push',url:String(url)});
history.replaceState=(state,title,url)=>__counts.pushes.push({kind:'replace',url:String(url)});
const baseState={schema:45,meta:{id:'mock',name:'Mock',language:'EN'},ui:{activeWorkspace:'viewport'},playback:{mode:'viewport',playing:false},assets:{heroId:'hero-real'},scene:{nodes:{}},shots:{},timeline:{}};
function createDefaultState(){return structuredClone(baseState)}
function normalizeState(value){return structuredClone(value||baseState)}
class PersistenceService{async load(){return structuredClone(baseState)} async saveNow(){} async clear(){} }
class HistoryService{constructor(id){this.id=id} clear(){} }
class WorkspaceSync{close(){} }
class ProjectStore{constructor({state}){this.state=state;this.listeners=new Set()} get(){return this.state} subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)} transient(label,mutator){mutator(this.state);for(const fn of this.listeners)fn(this.state,{type:'transient',label})} replace(label,next){this.state=next} }
class CommandBus{constructor(context){this.context=context;this.handlers=new Map()} dispatch(type,payload){return this.handlers.get(type)?.(payload)} register(type,fn){this.handlers.set(type,fn)} }
function registerCommands(bus){bus.register('noop',()=>{})}
class AppShell{constructor({root,workspace}){this.root=root;this.workspace=workspace;root.innerHTML=`<header><nav><a data-nav-workspace="viewport" href="./viewport.html">VIEWPORT</a><a data-nav-workspace="render" href="./render.html">RENDER</a><a data-nav-workspace="timeline" href="./timeline.html">TIMELINE</a></nav></header><main><section id="player"><span class="workspace-label"></span></section><section id="panel"></section></main>`;this.playerRoot=root.querySelector('#player');this.panelRoot=root.querySelector('#panel')} toast(){} dispose(){} }
class PlayerController{constructor({root,workspace}){__counts.players++;this.root=root;this.workspace=workspace;this.stage={};this.renderer={workspace,mode:'ready',ready:Promise.resolve(),loadedAssets:new Map([['hero-real',{root:{identity:'hero'}}]]),configureViewport(){},};this.rendererAuthorityToken='one-renderer'} renderUI(){} updateAllGates(){} dispose(){__counts.disposed++} }
class MockWorkspace{constructor(kind,{root}){this.kind=kind;__counts.workspaces[kind]++;const el=document.createElement('div');el.dataset.workspaceController=kind;root.append(el)} dispose(){__counts.disposed++} }
class ViewportWorkspace extends MockWorkspace{constructor(args){super('viewport',args)}}
class RenderWorkspace extends MockWorkspace{constructor(args){super('render',args)}}
class TimelineWorkspace extends MockWorkspace{constructor(args){super('timeline',args)}}
function createRuntimeInstrumentation(){return {dispose(){}}}
function installV46Polish(api){const polish={workspace:api.workspace,schedule(){},dispose(){}};globalThis.__MEMENTO_V46__={...api,version:'46A',polish};return globalThis.__MEMENTO_V46__}
'''
    return mocks+'\n'+src

async def main():
    chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
    async with async_playwright() as p:
        kwargs={'headless':True,'args':['--no-sandbox']}
        if chromium: kwargs['executable_path']=chromium
        browser=await p.chromium.launch(**kwargs)
        page=await browser.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        html=f'<!doctype html><html><body data-workspace="viewport"><div id="app"></div><script>{script_source()}</script></body></html>'
        await page.set_content(html,wait_until='load')
        await page.wait_for_function('globalThis.__MEMENTO_V45__ && document.body.dataset.ready === "true"')
        await page.evaluate('''() => {window.__firstPlayer=__MEMENTO_V45__.player;window.__firstRenderer=__MEMENTO_V45__.player.renderer;window.__firstLoaded=__MEMENTO_V45__.player.renderer.loadedAssets;}''')
        await page.locator('[data-nav-workspace="render"]').click()
        await page.wait_for_function('document.body.dataset.workspace === "render"')
        render=await page.evaluate('''() => ({playerSame:__firstPlayer===__MEMENTO_V45__.player,rendererSame:__firstRenderer===__MEMENTO_V45__.player.renderer,loadedSame:__firstLoaded===__MEMENTO_V45__.player.renderer.loadedAssets,heroSame:__firstLoaded.get('hero-real')===__MEMENTO_V45__.player.renderer.loadedAssets.get('hero-real'),counts:structuredClone(__counts),panel:document.querySelector('[data-workspace-controller]')?.dataset.workspaceController,label:document.querySelector('.workspace-label')?.textContent})''')
        await page.locator('[data-nav-workspace="viewport"]').click()
        await page.wait_for_function('document.body.dataset.workspace === "viewport"')
        back=await page.evaluate('''() => ({playerSame:__firstPlayer===__MEMENTO_V45__.player,rendererSame:__firstRenderer===__MEMENTO_V45__.player.renderer,loadedSame:__firstLoaded===__MEMENTO_V45__.player.renderer.loadedAssets,counts:structuredClone(__counts),panel:document.querySelector('[data-workspace-controller]')?.dataset.workspaceController,label:document.querySelector('.workspace-label')?.textContent})''')
        result={'render':render,'back':back,'errors':errors}
        print(json.dumps(result,indent=2))
        ok=not errors and render['playerSame'] and render['rendererSame'] and render['loadedSame'] and render['heroSame'] and back['playerSame'] and back['rendererSame'] and back['loadedSame'] and render['counts']['players']==1 and back['counts']['players']==1 and render['panel']=='render' and back['panel']=='viewport' and render['label']=='RENDER' and back['label']=='VIEWPORT'
        await browser.close()
        if not ok:return 1
        print('\nV46A single-runtime bootstrap mock: PASS')
        return 0

if __name__=='__main__':
    raise SystemExit(asyncio.run(main()))
