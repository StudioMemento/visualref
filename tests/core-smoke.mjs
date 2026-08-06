class StorageMock{constructor(){this.map=new Map()}getItem(key){return this.map.get(key)??null}setItem(key,value){this.map.set(key,String(value))}removeItem(key){this.map.delete(key)}}
globalThis.sessionStorage=new StorageMock();globalThis.localStorage=new StorageMock();globalThis.performance={now:()=>Date.now()};

const {createDefaultState,normalizeState}=await import('../src/core/default-state.js');
const {HistoryService}=await import('../src/core/history-service.js');
const {ProjectStore}=await import('../src/core/project-store.js');
const {CommandBus}=await import('../src/core/command-bus.js');
const {registerCommands}=await import('../src/core/commands.js');
const {evaluateShot,evaluateSequence,deltaSummary}=await import('../src/player/shot-interpolator.js');

const state=createDefaultState(),history=new HistoryService(state.meta.id),persistence={save(){},clear(){},clearAssets(){}},sync={onState(){},broadcast(){}};
const store=new ProjectStore({state,history,persistence,sync}),commands=new CommandBus({store,history,persistence,sync,toast(){}});registerCommands(commands);
const shot=()=>store.get().shots.byId[store.get().shots.activeShotId];

assert(shot().start.choices.light==='studio'&&shot().end.choices.light==='studio','Creative defaults are normalized');
commands.dispatch('ui.setScope',{scope:'both'});commands.dispatch('shot.setCreativeChoice',{axisId:'camera',optionId:'push-in'});
assert(shot().start.choices.camera==='push-in'&&shot().end.choices.camera==='push-in','Creative choice writes both endpoints');
assert(shot().start.values['camera.distance']===6.2&&shot().end.values['camera.distance']===4.1,'Creative choice applies endpoint patches');
commands.dispatch('ui.setScope',{scope:'start'});commands.dispatch('shot.setCreativeChoice',{axisId:'subject-rotation',optionId:'45'});
assert(shot().start.choices['subject-rotation']==='45','Creative Start scope writes Start choice');
assert(shot().end.choices['subject-rotation']!=='45','Creative Start scope preserves End choice');
commands.dispatch('shot.toggleCreativeLock',{axisId:'subject-size'});
assert(shot().creativeLocks['subject-size']===true&&shot().locks['subject.scale']===true,'Creative lock protects linked numeric axes');
commands.dispatch('shot.toggleCreativeLock',{axisId:'camera'});commands.dispatch('shot.toggleCreativeLock',{axisId:'lens'});commands.dispatch('shot.toggleCreativeLock',{axisId:'lens'});
assert(shot().creativeLocks.camera===true&&shot().creativeLocks.lens===false&&shot().locks['camera.distance']===true,'Overlapping category locks cannot accidentally unlock a shared numeric axis');
commands.dispatch('shot.toggleCreativeLock',{axisId:'camera'});
commands.dispatch('shot.toggleCreativeExclusion',{axisId:'lens',optionId:'18mm'});
assert(shot().creativeExclusions['lens:18mm']===true,'Per-option exclusion is stored in the generation pool');
commands.dispatch('ui.setScope',{scope:'both'});commands.dispatch('shot.setCreativeChoice',{axisId:'lens',optionId:'18mm'});
assert(shot().start.choices.lens==='18mm'&&shot().end.choices.lens==='18mm','Excluded options remain available for explicit manual choice');

commands.dispatch('ui.setScope',{scope:'start'});commands.dispatch('shot.setAxis',{axisId:'subject.scale',value:1.2});
assert(shot().start.values['subject.scale']===1.2,'Start scope writes Start');assert(shot().end.values['subject.scale']!==1.2,'Start scope does not write End');
commands.dispatch('ui.setScope',{scope:'end'});commands.dispatch('shot.setAxis',{axisId:'subject.rotationY',value:64});assert(shot().end.values['subject.rotationY']===64,'End scope writes End');
commands.dispatch('shot.addToTimeline',{trackId:'v1'});const clip=Object.values(store.get().timeline.clips)[0];assert(Boolean(clip?.linked),'Timeline clip is linked');
commands.dispatch('shot.generateVariant',{mode:'near'});assert(clip.shotId===shot().id,'Shot link survives generation');
assert(Boolean(evaluateShot(store.get(),shot().id,0)),'Shot evaluates at Start');assert(Boolean(evaluateShot(store.get(),shot().id,shot().durationFrames)),'Shot evaluates at End');assert(Boolean(evaluateSequence(store.get(),clip.startFrame+4)),'Sequence evaluates linked clip');assert(deltaSummary(store.get()).count>0,'Delta is computed');
const generatedName=shot().name;commands.dispatch('history.undo');assert(shot().name!==generatedName,'Undo restores previous Shot');commands.dispatch('history.redo');assert(shot().name===generatedName,'Redo restores generated Shot');

assert('subject.positionZ' in shot().start.values&&'subject.rotationX' in shot().end.values,'V43B.2 3D transform axes are present');
const migrated=normalizeState(structuredClone(store.get()));assert(migrated.schema.release==='V43B.2','Earlier state normalizes into V43B.2 release');
commands.dispatch('asset.register',{asset:{id:'hero-test',type:'hero',name:'test.glb',source:'indexeddb',status:'ready',size:100},node:null});
assert(store.get().assets.heroId==='hero-test'&&store.get().scene.nodes['hero-proxy'].assetId==='hero-test','Hero asset registration updates shared scene');
const propNode={id:'prop-test',name:'Prop · test.glb',type:'prop',assetId:'prop-asset',visible:true,locked:false,baseTransform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},correction:{pivot:[0,0,0],rotation:[0,0,0],scale:[1,1,1],groundOffset:0,autoNormalize:true,autoGround:true},helpers:{bounds:true,pivot:false}};
commands.dispatch('asset.register',{asset:{id:'prop-asset',type:'prop',name:'prop.glb',source:'indexeddb',status:'ready',size:50,nodeId:'prop-test'},node:propNode});
assert(store.get().assets.secondaryIds.includes('prop-asset')&&store.get().scene.nodes['prop-test'],'Prop registration creates an outliner node');
commands.dispatch('scene.setNodeCorrection',{nodeId:'hero-proxy',field:'pivot',value:[.1,.2,.3]});assert(store.get().scene.nodes['hero-proxy'].correction.pivot[1]===.2,'Pivot correction is project state');
commands.dispatch('scene.setEditorCamera',{camera:{position:[9,8,7],target:[1,2,3]}});assert(store.get().scene.editorCamera.position[0]===9&&shot().start.values['camera.distance']!==9,'Editor camera remains independent from Shot camera');
commands.dispatch('ui.setTimelineMonitorMode',{mode:'viewport'});assert(store.get().ui.timelineMonitorMode==='viewport','Timeline monitor switches to Viewport mode');
commands.dispatch('ui.setTimelineMonitorMode',{mode:'player'});assert(store.get().ui.timelineMonitorMode==='player','Timeline monitor switches back to Player mode');
const poolState=createDefaultState(),poolHistory=new HistoryService(poolState.meta.id+'-pool'),poolStore=new ProjectStore({state:poolState,history:poolHistory,persistence,sync}),poolCommands=new CommandBus({store:poolStore,history:poolHistory,persistence,sync,toast(){}});registerCommands(poolCommands);
const poolShot=()=>poolStore.get().shots.byId[poolStore.get().shots.activeShotId];
for(const axisId of ['light','camera','focus','composition','subject-size','subject-rotation','view','motion-design','environment','atmosphere'])poolCommands.dispatch('shot.toggleCreativeLock',{axisId});
for(const optionId of ['18mm','35mm','50mm','200mm','macro','tilt-shift'])poolCommands.dispatch('shot.toggleCreativeExclusion',{axisId:'lens',optionId});
poolCommands.dispatch('shot.generateVariant',{mode:'near'});
assert(poolShot().end.choices.lens==='85mm','Variant generation chooses only from the allowed per-axis pool');
const lockedCameraDistance=poolShot().end.values['camera.distance'];poolCommands.dispatch('shot.toggleCreativeExclusion',{axisId:'lens',optionId:'85mm'});poolCommands.dispatch('shot.generateVariant',{mode:'bold'});
assert(poolShot().end.choices.lens==='85mm'&&poolShot().end.values['camera.distance']===lockedCameraDistance,'An empty option pool behaves as a generation lock');
poolCommands.dispatch('shot.resetCreativePool',{axisId:'lens'});assert(Object.keys(poolShot().creativeExclusions).filter(key=>key.startsWith('lens:')).length===0,'Axis pool reset restores all options');
console.log('V43B.2 CORE + LOCKS + EXCLUSION POOLS + TIMELINE MONITOR SMOKE · PASS');
function assert(condition,label){if(!condition)throw new Error(`FAIL · ${label}`);console.log(`PASS · ${label}`)}
