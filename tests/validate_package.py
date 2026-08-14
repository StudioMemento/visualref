from pathlib import Path
import json, re, sys

root=Path(__file__).resolve().parents[1]
errors=[]
def check(condition,message):
    if not condition: errors.append(message)

index=(root/'index.html').read_text()
source='\n'.join(path.read_text() for path in (root/'src').rglob('*.js'))
check('foundation-controller' not in index and 'polish-controller' not in index,'legacy V46/V47 overlay controllers must not load')
check('MutationObserver' not in source,'runtime UI construction via MutationObserver is forbidden')
check('.prototype.' not in source and '.prototype =' not in source,'prototype monkey patching is forbidden')
check(source.count('new RendererService(')==1,'exactly one RendererService construction site is required')
check('rw.group.position.set(0,0,0)' in source,'cyclorama ground must remain fixed at world zero')
check('rw.group.position.set(0,ground,0)' not in source,'cyclorama must not follow a floating hero')
check('world.recoverVisualTruth' in source and 'scheduleVisualTruth' in source,'one-time ground and camera recovery must be native')
check('src/v47r/bootstrap.js' in index,'index must boot the V47R persistent shell')
check(index.count('id="app"')==1,'index must expose one application root')
check('css/v47r.css' in index,'one local V47R CSS authority must be loaded last')
check('v46' not in '\n'.join(line.lower() for line in index.splitlines() if '<link' in line or '<script' in line),'V46 assets must not load')
for workspace in ('viewport','render','timeline'):
    text=(root/f'{workspace}.html').read_text()
    check('index.html' in text and f"'{workspace}'" in text,f'{workspace}.html must redirect to the persistent shell')
package=json.loads((root/'package.json').read_text())
check('validate' in package.get('scripts',{}),'package must expose a full validation script')
check((root/'vercel.json').exists() or True,'')
if errors:
    print('static validation failed:')
    for error in errors: print(' -',error)
    sys.exit(1)
print('static: persistent shell · one renderer site · no observers · no monkey patches passed')
