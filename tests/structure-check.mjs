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
  assert(source.includes('V44'),`${file} is visibly labelled V44`);
}
for(const file of ['render.html','viewport.html','timeline.html'])assert(read(file).includes('./css/v44.css'),`${file} loads V44 styles`);
const renderHtml=read('render.html');
assert(renderHtml.includes('./css/v44-render-editor.css'),'Render loads the V43B.9 acceptance stylesheet');
assert(renderHtml.indexOf('./css/v44-render-editor.css')>renderHtml.indexOf('./css/v44.css'),'Render acceptance stylesheet loads after V44 base styles');


const moduleFiles=[];
for(const directory of ['src','tests'])walk(path.join(root,directory),moduleFiles);
for(const absolute of moduleFiles){
  const source=fs.readFileSync(absolute,'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\()(["'])(\.[^"']+)\1/g)){
    const specifier=match[2],candidate=path.resolve(path.dirname(absolute),specifier);
    assert(fs.existsSync(candidate),`${path.relative(root,absolute)} resolves ${specifier}`);
  }
}


const renderWorkspace=read('src/workspaces/render-workspace.js');
for(const token of ['v43b9-axis-matrix','CREATIVE_AXES.map(axis=>creativeAxisRow','mvr-axis-tile','mvr-axis-label','mvr-axis-lock','["mvr-chip"','mvr-chip-label','mvr-chip-start','mvr-chip-both','mvr-chip-end','data-option-endpoint="both"','shared-option','excluded-option'])assert(renderWorkspace.includes(token),`Render restores approved V43B.9 token ${token}`);
for(const removed of ['data-role="axis-groups"','data-role="axis-tiles"','data-role="active-axis-panel"','function axisTile(','function activeAxisPanel('])assert(!renderWorkspace.includes(removed),`Render removes interim drill-down token ${removed}`);
const renderStyles=read('css/v44-render-editor.css');
for(const token of ['grid-template-columns:30% 40% 30%','mvr-axis-label small','mvr-axis-label svg{display:none!important}','linear-gradient(90deg,rgba(89,215,223,.28)','inset 0 2px 0 rgba(255,255,255,.96)','linear-gradient(270deg,rgba(255,121,80,.29)','mvr-chip-pool','mvr-axis-lock'])assert(renderStyles.includes(token),`Render acceptance styling includes ${token}`);
assert(renderStyles.includes('shared-option::before{opacity:0;background:none}'),'Both state remains neutral except for white top/bottom rules');
const v44Styles=read('css/v44.css');
assert(!v44Styles.includes('.active-axis-panel .mvr-chip'),'Obsolete active-axis chip patch was removed');

const viewport=read('src/workspaces/viewport-workspace.js');
for(const token of ['toolButton("select"','toolButton("translate"','toolButton("rotate"','toolButton("scale"','toolButton("pivot"','data-space-toggle','asset.stageImport','asset.validateStagedImport','asset.commitImport','scene.setNodePivotCompensated','CALIBRATE','this.importQueue=this.importQueue.then(run,run)'])assert(viewport.includes(token),`Viewport implements ${token}`);

const renderer=read('src/engine/renderer-service.js');
for(const token of ['project.add(shot)','shot.add(pivot)','pivot.add(correction)','correction.add(auto)','auto.add(content)','new this.TransformControls','setSpace(mode==="scale"?"local":this.viewportSpace)','stageAsset({','mountStagedAsset({','discardStagedAsset(','resolvePivotValue(','getPivotPreset(','getGroundedTransform(','raycastNode(event)','if(this.viewportSpace==="local")group.getWorldQuaternion(this.pivotHandle.quaternion)'])assert(renderer.includes(token),`Renderer implements ${token}`);
assert(renderer.indexOf('content.add(staged.root)')<renderer.indexOf('return {nodeId:resolvedNodeId'),'Staged GLB is finite-validated before transaction return');

const commands=read('src/core/commands.js');
for(const token of ['asset.stageImport','asset.validateStagedImport','asset.failImport','asset.commitImport','ui.setViewportSpace','ui.setViewportEditMode','ui.setViewportSnap','scene.setNodePivotCompensated','scene.setTransformChannelLock'])assert(commands.includes(token),`Command bus exposes ${token}`);

const defaults=read('src/core/default-state.js');
assert(defaults.includes('SCHEMA_VERSION=44')&&defaults.includes('RELEASE="V44"'),'State schema and release are V44');
assert(defaults.includes('viewportTool:"select"')&&defaults.includes('viewportSpace:"world"'),'Select/World defaults are explicit');
assert(defaults.includes('transformLocks:structuredClone(DEFAULT_TRANSFORM_LOCKS)'),'Every scene node receives transform channel locks');

const visible=[...htmlFiles.map(read),read('src/ui/app-shell.js'),read('src/app/bootstrap.js'),read('package.json')].join('\n');
assert(!visible.includes('V43C-R1 CORE REBUILD'),'Visible runtime labels no longer identify the product as V43C-R1');

console.log('\nV44 · STATIC STRUCTURE CHECK · PASS');
function walk(directory,out){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const absolute=path.join(directory,entry.name);if(entry.isDirectory())walk(absolute,out);else if(/\.(?:js|mjs)$/.test(entry.name))out.push(absolute);}}
function assert(condition,label){if(!condition)throw new Error(`FAIL · ${label}`);console.log(`PASS · ${label}`);}
