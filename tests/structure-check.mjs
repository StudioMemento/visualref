import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const htmlFiles=['index.html','render.html','viewport.html','timeline.html'];

for(const file of htmlFiles){
  const source=read(file);
  for(const match of source.matchAll(/(?:href|src)="(\.\/[^"?#]+)"/g)){
    const target=path.join(root,match[1].replace(/^\.\//,''));
    assert(fs.existsSync(target),`${file} resolves ${match[1]}`);
  }
  assert(source.includes('V45'),`${file} is visibly labelled V45`);
}
for(const file of ['render.html','viewport.html','timeline.html']){
  const source=read(file);
  assert(source.includes('./css/v45.css'),`${file} loads the V45 product layer`);
  assert(source.indexOf('./css/v45.css')>source.indexOf('./css/v44.css'),`${file} loads V45 after the inherited donor styles`);
}

const modules=[];
for(const directory of ['src','tests'])walk(path.join(root,directory),modules);
for(const absolute of modules){
  const source=fs.readFileSync(absolute,'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\()(["'])(\.[^"']+)\1/g)){
    const candidate=path.resolve(path.dirname(absolute),match[2]);
    assert(fs.existsSync(candidate),`${path.relative(root,absolute)} resolves ${match[2]}`);
  }
}

const pkg=JSON.parse(read('package.json'));
assert(pkg.name==='memento-visualref-v45'&&pkg.version==='45.0.0','Package identifies V45');

const shell=read('src/ui/app-shell.js');
for(const token of ['v45-shell','release-mark">V45','RENDER','VIEWPORT','TIMELINE','language-switch','workspaceSplitters'])assert(shell.includes(token),`Application shell includes ${token}`);
assert(!shell.includes('advanced-switch'),'No detached global Advanced switch remains in the V45 shell');

const defaults=read('src/core/default-state.js');
for(const token of ['SCHEMA_VERSION=45','RELEASE="V45"','name:"MEMENTO V45"','viewportEditMode:"calibrate"','renderMonitorMode:"live"','timelineLibraryOpen:false','timelineRecipesOpen:false'])assert(defaults.includes(token),`V45 state contract includes ${token}`);
assert((defaults.match(/id:"(?:gfx|v3|v2|v1|a1|a2)"/g)||[]).length===6,'Default state exposes the canonical six tracks');
assert(defaults.includes('presetId:null'),'Active project state is preset-free by default');

const render=read('src/workspaces/render-workspace.js');
for(const macro of ['subject','camera','composition','lens-focus','light','environment','motion','image','timing'])assert(render.includes(`id:"${macro}"`),`Render exposes the ${macro} macro`);
for(const token of ['v45-render-monitor','v45-macro-stack','v45-inline-precision','v45-starting-points','mvr-chip-start','mvr-chip-both','mvr-chip-end','data-option-endpoint="both"'])assert(render.includes(token)||read('src/player/player-controller.js').includes(token),`Render interaction includes ${token}`);
assert(render.includes('<details class="v45-starting-points"'),'Curated presets are demoted to optional starting points');

const viewport=read('src/workspaces/viewport-workspace.js');
for(const token of ['v45-viewport','CALIBRATE','EDIT SHOT STATE','PHYSICAL CALIBRATION','correction:referenceDimension','correction:referenceAxis','correction:unit','scene.setNodePivotCompensated','asset.stageImport','asset.commitImport'])assert(viewport.includes(token),`Viewport implements ${token}`);

const timeline=read('src/workspaces/timeline-workspace.js');
for(const token of ['v45-timeline','data-timeline-action="recipes"','data-timeline-action="library"','timeline-board-game','timeline-library-game','clip-inspector-game','TRACKS.map'])assert(timeline.includes(token),`Timeline implements ${token}`);

const renderer=read('src/engine/renderer-service.js');
for(const token of ['unitScaleToMeters','referenceDimension','referenceAxis','motion.energy','subject-presence','applyMotionDesign'])assert(renderer.includes(token),`Renderer consumes the V45 ${token} contract`);
const player=read('src/player/player-controller.js');
for(const token of ['RendererAuthority.acquire','data-render-monitor-mode="live"','data-render-monitor-mode="compare"','renderMonitorMode'])assert(player.includes(token),`Player enforces ${token}`);
assert(fs.existsSync(path.join(root,'src/v45/runtime-instrumentation.js')),'V45 runtime instrumentation exists');

const css=read('css/v45.css');
for(const token of ['.v45-render-editor','.v45-macro-stack','.mvr-chip.selected-start','.mvr-chip.shared-option','.v45-physical-calibration','.v45-timeline .timeline-body-game.library-open','.workspace-splitter:hover'])assert(css.includes(token),`V45 stylesheet owns ${token}`);

const visible=[...htmlFiles.map(read),shell,read('src/app/bootstrap.js'),read('package.json')].join('\n');
assert(!visible.includes('V44 · WORLD GIZMO'),'No visible V44 boot label remains');

console.log('\nV45 · STATIC STRUCTURE CHECK · PASS');
function walk(directory,out){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const absolute=path.join(directory,entry.name);if(entry.isDirectory())walk(absolute,out);else if(/\.(?:js|mjs)$/.test(entry.name))out.push(absolute);}}
function assert(condition,label){if(!condition)throw new Error(`FAIL · ${label}`);console.log(`PASS · ${label}`);}
