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
for(const file of ['render.html','viewport.html','timeline.html'])assert(read(file).includes('./css/v44.css'),`${file} loads V44 styles last`);


const moduleFiles=[];
for(const directory of ['src','tests'])walk(path.join(root,directory),moduleFiles);
for(const absolute of moduleFiles){
  const source=fs.readFileSync(absolute,'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\()(["'])(\.[^"']+)\1/g)){
    const specifier=match[2],candidate=path.resolve(path.dirname(absolute),specifier);
    assert(fs.existsSync(candidate),`${path.relative(root,absolute)} resolves ${specifier}`);
  }
}

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
