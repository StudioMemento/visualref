#!/usr/bin/env python3
"""Run the V47A DOM/controller acceptance fixture without network access."""
from __future__ import annotations
import asyncio,json,re,shutil
from pathlib import Path
try:
    from playwright.async_api import async_playwright
except ImportError as exc:
    raise SystemExit("Python Playwright is required: pip install playwright") from exc

ROOT=Path(__file__).resolve().parents[1]
FIXTURE=ROOT/"tests/browser-mock/index.html"


def module_body(path:Path)->str:
    return path.read_text(encoding="utf-8")


def build_fixture()->str:
    fixture=FIXTURE.read_text(encoding="utf-8")
    css=(ROOT/"css/v46.css").read_text(encoding="utf-8")+"\n"+(ROOT/"css/v47.css").read_text(encoding="utf-8")
    v46=module_body(ROOT/"src/v46/polish-controller.js").replace("export function installV46Polish","function installV46Polish")
    v46="(function(){\n"+v46+"\nglobalThis.installV46Polish=installV46Polish;\n})();"
    delta=module_body(ROOT/"src/v47/delta-engine.js")
    delta=re.sub(r"\bexport\s+(?=(?:const|function)\b)","",delta)
    delta="(function(){\n"+delta+"\nglobalThis.__V47Delta={compareShots,evaluateShotSnapshot,generateCandidate,normalizeSeed,CREATIVE_CATEGORY};\n})();"
    foundation=module_body(ROOT/"src/v47/foundation-controller.js")
    foundation=re.sub(r'import \{compareShots,evaluateShotSnapshot,generateCandidate,normalizeSeed,CREATIVE_CATEGORY\} from \"\./delta-engine\.js\";','const {compareShots,evaluateShotSnapshot,generateCandidate,normalizeSeed,CREATIVE_CATEGORY}=globalThis.__V47Delta;',foundation,count=1)
    foundation=foundation.replace("export function installV47Foundation","function installV47Foundation")
    foundation="(function(){\n"+foundation+"\nglobalThis.installV47Foundation=installV47Foundation;\n})();"
    match=re.search(r'<script type="module">(.*)</script>',fixture,re.S)
    if not match: raise RuntimeError("Browser fixture module was not found")
    mock=re.sub(r'^\s*import .*?;\s*','',match.group(1),count=2,flags=re.M)
    html=re.sub(r"<link[^>]+>","",fixture)
    html=re.sub(r'<script type="module">.*</script>',"",html,flags=re.S)
    html=html.replace("</head>",f"<style>{css}</style></head>")
    return html.replace("</body>",f"<script>{v46}</script><script>{delta}</script><script>{foundation}</script><script>{mock}</script></body>")

STORAGE_POLYFILL="""
(() => { const make=()=>{const data=new Map();return {getItem:key=>data.has(String(key))?data.get(String(key)):null,setItem:(key,value)=>data.set(String(key),String(value)),removeItem:key=>data.delete(String(key)),clear:()=>data.clear(),key:index=>[...data.keys()][index]??null,get length(){return data.size;}}};Object.defineProperty(window,"localStorage",{value:make(),configurable:true});Object.defineProperty(window,"sessionStorage",{value:make(),configurable:true});})();
"""

async def run()->int:
    base=build_fixture();chromium=shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    cases=[];errors=[]
    async with async_playwright() as playwright:
        kwargs={"headless":True,"args":["--no-sandbox"]}
        if chromium: kwargs["executable_path"]=chromium
        browser=await playwright.chromium.launch(**kwargs)
        for workspace in ("viewport","render","timeline"):
            for custom in (0,1):
                page=await browser.new_page(viewport={"width":1440,"height":900})
                page.on("console",lambda message,w=workspace,c=custom: errors.append((w,c,"console",message.type,message.text)) if message.type=="error" else None)
                page.on("pageerror",lambda error,w=workspace,c=custom: errors.append((w,c,"pageerror",str(error))))
                await page.evaluate(STORAGE_POLYFILL)
                html=base.replace('const params=new URLSearchParams(location.search),workspace=params.get("workspace")||"render",custom=params.get("custom")==="1";',f'const workspace="{workspace}",custom={str(bool(custom)).lower()};')
                await page.set_content(html,wait_until="load")
                await page.wait_for_function("document.body.dataset.testStatus",timeout=15_000)
                status=await page.get_attribute("body","data-test-status")
                results=json.loads(await page.locator("#results").inner_text())
                cases.append({"workspace":workspace,"customHero":bool(custom),"status":status,"results":results})
                await page.close()
        await browser.close()
    print(json.dumps({"cases":cases,"errors":errors},indent=2))
    if errors or any(case["status"]!="PASS" for case in cases): return 1
    print("\nV47A browser mock: 6/6 PASS")
    return 0

if __name__=="__main__":
    try: raise SystemExit(asyncio.run(run()))
    except KeyboardInterrupt: raise SystemExit(130)
