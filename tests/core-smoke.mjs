class StorageMock{
  constructor(){this.map=new Map();}
  getItem(key){return this.map.get(key)??null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}
globalThis.sessionStorage=new StorageMock();
globalThis.localStorage=new StorageMock();
globalThis.performance={now:()=>Date.now()};

const {
  createDefaultState,normalizeState,correctionDefaultsForType,
  DEFAULT_TRANSFORM,DEFAULT_TRANSFORM_LOCKS,SCHEMA_VERSION,RELEASE
}=await import('../src/core/default-state.js');
const {normalizationScaleForAsset,cameraTargetRadius}=await import('../src/core/normalization-contract.js');
const {HistoryService}=await import('../src/core/history-service.js');
const {ProjectStore}=await import('../src/core/project-store.js');
const {CommandBus}=await import('../src/core/command-bus.js');
const {registerCommands}=await import('../src/core/commands.js');
const {evaluateShot,evaluateSequence,deltaSummary}=await import('../src/player/shot-interpolator.js');

const persistence={save(){},clear(){},clearAssets(){}};
const sync={onState(){},broadcast(){}};
function makeHarness(id='core'){
  const state=createDefaultState();
  state.meta.id=`${state.meta.id}-${id}`;
  const history=new HistoryService(state.meta.id);
  const store=new ProjectStore({state,history,persistence,sync});
  const commands=new CommandBus({store,history,persistence,sync,toast(){}});
  registerCommands(commands);
  return {store,history,commands,shot:()=>store.get().shots.byId[store.get().shots.activeShotId]};
}
const {store,history,commands,shot}=makeHarness('v44');

section('V44 schema and migration');
assert(SCHEMA_VERSION===44&&RELEASE==='V44','Release constants identify V44');
assert(store.get().schema.version===44&&store.get().schema.release==='V44','Default project is schema 44');
assert(store.get().ui.viewportTool==='select'&&store.get().ui.viewportSpace==='world','Viewport starts with Select in World space');
assert(store.get().ui.viewportEditMode==='shot','Hero starts in Shot edit mode');
assert(store.get().ui.viewportSnapEnabled===false&&store.get().ui.viewportSnap.pivot===.1,'Viewport snap defaults are normalized');
const legacy=createDefaultState();legacy.schema.version=43;legacy.schema.release='V43C-R1';legacy.meta.name='MEMENTO V43C';delete legacy.ui.viewportSnap;delete legacy.ui.viewportSpace;delete legacy.assets.importSession;
const migrated=normalizeState(legacy);
assert(migrated.schema.version===44&&migrated.schema.release==='V44'&&migrated.schema.migratedFrom==='V43C-R1','Schema 43 migrates explicitly to V44');
assert(migrated.meta.name==='MEMENTO V44','Legacy project title migrates to V44');
assert(migrated.ui.viewportSpace==='world'&&migrated.ui.viewportSnap.position===.1,'Migration restores V44 viewport defaults');

section('Atomic asset state contract');
const originalHero=store.get().assets.heroId;
commands.dispatch('asset.stageImport',{session:{id:'import-bad',assetId:'hero-bad',type:'hero',nodeId:'hero-proxy',name:'broken.glb',previousAssetId:originalHero}});
assert(store.get().assets.heroId===originalHero&&store.get().assets.importSession.status==='staging','Staging never replaces the active Hero');
commands.dispatch('asset.validateStagedImport',{sessionId:'import-bad',diagnostics:[{level:'warning',code:'TEST',message:'staged'}],meta:{meshes:1}});
assert(store.get().assets.heroId===originalHero&&store.get().assets.importSession.status==='validated','Validation still preserves the previous Hero');
commands.dispatch('asset.failImport',{sessionId:'import-bad',error:new Error('parse failed')});
assert(store.get().assets.heroId===originalHero&&store.get().assets.importSession.status==='error'&&!store.get().ui.assetBusy,'Failed import rolls back project state');
commands.dispatch('asset.cancelImport',{sessionId:'import-bad'});
assert(store.get().assets.importSession===null,'Failed import can be dismissed without changing assets');

commands.dispatch('asset.stageImport',{session:{id:'import-hero',assetId:'hero-v44',type:'hero',nodeId:'hero-proxy',name:'hero.glb',previousAssetId:originalHero}});
commands.dispatch('asset.validateStagedImport',{sessionId:'import-hero',diagnostics:[],meta:{meshes:4,triangles:12000,animationCount:1}});
commands.dispatch('asset.commitImport',{sessionId:'import-hero',asset:{id:'hero-v44',type:'hero',name:'hero.glb',fileName:'hero.glb',source:'indexeddb',status:'ready',size:2048,diagnostics:[],inspection:{meshes:4,triangles:12000}},node:null});
assert(store.get().assets.heroId==='hero-v44'&&store.get().scene.nodes['hero-proxy'].assetId==='hero-v44','Validated Hero commit replaces the active asset');
assert(store.get().ui.viewportEditMode==='calibrate'&&store.get().ui.selectedNodeId==='hero-proxy','Hero import enters explicit Calibrate mode');
assert(store.get().scene.nodes['hero-proxy'].correction.normalizeMode==='camera'&&store.get().scene.nodes['hero-proxy'].correction.autoNormalize===true,'Hero commit restores camera normalization contract');
assert(store.get().assets.importSession===null&&!store.get().ui.assetBusy,'Successful commit closes the import transaction');
commands.dispatch('history.undo');
assert(store.get().assets.heroId===originalHero&&store.get().assets.importSession===null&&!store.get().ui.assetBusy,'Undo import restores the previous asset without reviving staging UI');
commands.dispatch('history.redo');
assert(store.get().assets.heroId==='hero-v44'&&store.get().assets.importSession===null&&!store.get().ui.assetBusy,'Redo import restores the committed asset cleanly');

commands.dispatch('asset.stageImport',{session:{id:'import-env',assetId:'environment-v44',type:'environment',nodeId:'environment-proxy',name:'world.glb',previousAssetId:store.get().assets.environmentId}});
commands.dispatch('asset.validateStagedImport',{sessionId:'import-env',diagnostics:[],meta:{meshes:12,triangles:44000}});
commands.dispatch('asset.commitImport',{sessionId:'import-env',asset:{id:'environment-v44',type:'environment',name:'world.glb',fileName:'world.glb',source:'indexeddb',status:'ready',size:4096,diagnostics:[]},node:null});
assert(store.get().assets.environmentId==='environment-v44','Validated Environment commit replaces the active world');
assert(store.get().scene.nodes['environment-proxy'].correction.normalizeMode==='native'&&store.get().scene.nodes['environment-proxy'].correction.autoNormalize===false,'Environment remains in native authoring units');
assert(store.get().ui.viewportEditMode==='scene','Environment import enters Scene calibration mode');

const propNode={id:'prop-v44-node',name:'Prop · detail.glb',type:'prop',assetId:'prop-v44',visible:true,locked:false,transformLocks:structuredClone(DEFAULT_TRANSFORM_LOCKS),baseTransform:structuredClone(DEFAULT_TRANSFORM),correction:correctionDefaultsForType('prop'),helpers:{bounds:true,pivot:false}};
commands.dispatch('asset.stageImport',{session:{id:'import-prop',assetId:'prop-v44',type:'prop',nodeId:propNode.id,name:'detail.glb'}});
commands.dispatch('asset.commitImport',{sessionId:'import-prop',asset:{id:'prop-v44',type:'prop',name:'detail.glb',source:'indexeddb',status:'ready',size:900,nodeId:propNode.id},node:propNode});
assert(store.get().assets.secondaryIds.includes('prop-v44')&&store.get().scene.nodes[propNode.id],'Prop commit creates an independent outliner node');
commands.dispatch('asset.markMissing',{assetId:'prop-v44',nodeId:propNode.id,message:'binary missing'});
assert(store.get().assets.byId['prop-v44'].status==='missing'&&store.get().scene.nodes[propNode.id].missing===true,'Missing IndexedDB binary is visible in project state');

section('World/Local gizmo state and transform locks');
commands.dispatch('ui.selectNode',{nodeId:'hero-proxy'});
commands.dispatch('ui.setViewportEditMode',{mode:'shot'});
commands.dispatch('ui.setViewportTool',{tool:'pivot'});
assert(store.get().ui.viewportTool==='pivot'&&store.get().ui.viewportEditMode==='calibrate','Pivot automatically leaves Hero Shot mode');
commands.dispatch('ui.setViewportEditMode',{mode:'shot'});
assert(store.get().ui.viewportEditMode==='shot'&&store.get().ui.viewportTool==='select','Returning to Shot mode safely exits Pivot');
commands.dispatch('ui.setViewportTool',{tool:'rotate'});commands.dispatch('ui.setViewportSpace',{space:'local'});
assert(store.get().ui.viewportTool==='rotate'&&store.get().ui.viewportSpace==='local','World/Local space and gizmo mode persist independently');
commands.dispatch('ui.setViewportSnap',{enabled:true});commands.dispatch('ui.setViewportSnap',{field:'rotationDeg',value:22.5});
assert(store.get().ui.viewportSnapEnabled&&store.get().ui.viewportSnap.rotationDeg===22.5,'Snap toggle and increments are project state');

const envId='environment-proxy';
commands.dispatch('scene.setNodeTransform',{nodeId:envId,transform:{position:[4,2,-8],rotation:[0,.5,0],scale:[2,1.5,2]}});
assert(store.get().scene.nodes[envId].baseTransform.position[0]===4&&store.get().scene.nodes[envId].baseTransform.scale[2]===2,'Environment Move/Rotate/Scale are persistent');
commands.dispatch('scene.setTransformChannelLock',{nodeId:envId,channel:'position',value:true});
commands.dispatch('scene.setNodeTransform',{nodeId:envId,transform:{position:[99,99,99],rotation:[.1,.2,.3],scale:[3,3,3]}});
assert(arrayEqual(store.get().scene.nodes[envId].baseTransform.position,[4,2,-8]),'Position lock blocks Move');
assert(arrayEqual(store.get().scene.nodes[envId].baseTransform.scale,[3,3,3]),'Unlocked Scale remains editable while Position is locked');
commands.dispatch('scene.setTransformChannelLock',{nodeId:envId,channel:'position',value:false});
commands.dispatch('scene.setNodeLocked',{nodeId:envId,value:true});
const lockedSnapshot=structuredClone(store.get().scene.nodes[envId].baseTransform);
commands.dispatch('scene.setNodeTransform',{nodeId:envId,transform:{position:[1,1,1],rotation:[1,1,1],scale:[1,1,1]}});
assert(deepEqual(store.get().scene.nodes[envId].baseTransform,lockedSnapshot),'Object lock blocks all transform writes');
commands.dispatch('scene.setNodeLocked',{nodeId:envId,value:false});

section('Compensated pivot and one-step history');
const beforePivot=structuredClone(store.get().scene.nodes[envId]);
const compensated={position:[beforePivot.baseTransform.position[0]+1.25,beforePivot.baseTransform.position[1]-.5,beforePivot.baseTransform.position[2]+.75],rotation:[...beforePivot.baseTransform.rotation],scale:[...beforePivot.baseTransform.scale]};
commands.dispatch('scene.setNodePivotCompensated',{nodeId:envId,pivot:[1.25,-.5,.75],baseTransform:compensated});
assert(arrayEqual(store.get().scene.nodes[envId].correction.pivot,[1.25,-.5,.75]),'Compensated Pivot stores the new transform origin');
assert(arrayEqual(store.get().scene.nodes[envId].baseTransform.position,compensated.position),'Pivot stores its geometry-preserving base compensation');
commands.dispatch('history.undo');
assert(arrayEqual(store.get().scene.nodes[envId].correction.pivot,beforePivot.correction.pivot)&&arrayEqual(store.get().scene.nodes[envId].baseTransform.position,beforePivot.baseTransform.position),'One Undo restores both pivot and compensation');
commands.dispatch('history.redo');
assert(arrayEqual(store.get().scene.nodes[envId].correction.pivot,[1.25,-.5,.75])&&arrayEqual(store.get().scene.nodes[envId].baseTransform.position,compensated.position),'One Redo reapplies the compensated Pivot');
commands.dispatch('scene.setTransformChannelLock',{nodeId:envId,channel:'pivot',value:true});
commands.dispatch('scene.setNodePivotCompensated',{nodeId:envId,pivot:[9,9,9],baseTransform:{position:[9,9,9],rotation:[0,0,0],scale:[1,1,1]}});
assert(arrayEqual(store.get().scene.nodes[envId].correction.pivot,[1.25,-.5,.75]),'Pivot lock blocks compensated Pivot writes');
commands.dispatch('scene.setTransformChannelLock',{nodeId:envId,channel:'pivot',value:false});

section('Hero and Environment normalization');
const radiusSmall=.5,radiusLarge=12,smallScale=normalizationScaleForAsset({type:'hero',sourceRadius:radiusSmall}),largeScale=normalizationScaleForAsset({type:'hero',sourceRadius:radiusLarge}),targetRadius=cameraTargetRadius();
assert(Math.abs(radiusSmall*smallScale-targetRadius)<1e-9&&Math.abs(radiusLarge*largeScale-targetRadius)<1e-9,'Different Hero GLBs normalize to one camera-relative radius');
assert(normalizationScaleForAsset({type:'environment',sourceRadius:200,sourceMaxDimension:400})===1,'Environment GLBs preserve native scale');
commands.dispatch('scene.setEditorCamera',{camera:{position:[9,8,7],target:[1,2,3]}});
assert(store.get().scene.editorCamera.position[0]===9&&shot().start.values['camera.distance']!==9,'Editor camera remains independent from Shot camera');

section('Creative Shot core');
assert(shot().start.choices.light==='studio'&&shot().end.choices.light==='studio','Creative defaults are normalized');
commands.dispatch('ui.setScope',{scope:'both'});commands.dispatch('shot.setCreativeChoice',{axisId:'camera',optionId:'push-in'});
assert(shot().start.choices.camera==='push-in'&&shot().end.choices.camera==='push-in','Creative choice writes both endpoints');
assert(shot().start.values['camera.distance']===6.2&&shot().end.values['camera.distance']===4.1,'Creative choice applies endpoint patches');
commands.dispatch('ui.setScope',{scope:'start'});commands.dispatch('shot.setCreativeChoice',{axisId:'subject-rotation',optionId:'45'});
assert(shot().start.choices['subject-rotation']==='45'&&shot().end.choices['subject-rotation']!=='45','Start choice preserves End');
commands.dispatch('shot.toggleCreativeLock',{axisId:'subject-size'});
assert(shot().creativeLocks['subject-size']===true&&shot().locks['subject.scale']===true,'Creative lock protects linked numeric axes');
commands.dispatch('shot.toggleCreativeLock',{axisId:'camera'});commands.dispatch('shot.toggleCreativeLock',{axisId:'lens'});commands.dispatch('shot.toggleCreativeLock',{axisId:'lens'});
assert(shot().creativeLocks.camera===true&&shot().creativeLocks.lens===false&&shot().locks['camera.distance']===true,'Overlapping category locks preserve shared numeric locks');
commands.dispatch('shot.toggleCreativeLock',{axisId:'camera'});
commands.dispatch('shot.toggleCreativeExclusion',{axisId:'lens',optionId:'18mm'});
assert(shot().creativeExclusions['lens:18mm']===true,'Per-option exclusion is stored in the generation pool');
commands.dispatch('ui.setScope',{scope:'both'});commands.dispatch('shot.setCreativeChoice',{axisId:'lens',optionId:'18mm'});
assert(shot().start.choices.lens==='18mm'&&shot().end.choices.lens==='18mm','Excluded options remain available for explicit manual choice');
commands.dispatch('ui.setScope',{scope:'start'});commands.dispatch('shot.setAxis',{axisId:'subject.scale',value:1.2});
assert(shot().start.values['subject.scale']===1.2&&shot().end.values['subject.scale']!==1.2,'START scope only writes START');
commands.dispatch('ui.setScope',{scope:'end'});commands.dispatch('shot.setAxis',{axisId:'subject.rotationY',value:64});
assert(shot().end.values['subject.rotationY']===64,'END scope writes END');
commands.dispatch('shot.addToTimeline',{trackId:'v1'});
let linkedClip=Object.values(store.get().timeline.clips).find(item=>item.type==='shot');
assert(Boolean(linkedClip?.linked),'Timeline clip stays linked to its Shot');
commands.dispatch('shot.generateVariant',{mode:'near'});
assert(store.get().timeline.clips[linkedClip.id].shotId===shot().id,'Shot link survives generation');
assert(Boolean(evaluateShot(store.get(),shot().id,0))&&Boolean(evaluateShot(store.get(),shot().id,shot().durationFrames)),'Shot evaluates at START and END');
assert(Boolean(evaluateSequence(store.get(),linkedClip.startFrame+4)),'Sequence evaluates a linked clip');
assert(deltaSummary(store.get()).count>0,'Delta is computed');
const generatedName=shot().name;commands.dispatch('history.undo');assert(shot().name!==generatedName,'Undo restores previous Shot');commands.dispatch('history.redo');assert(shot().name===generatedName,'Redo restores generated Shot');
assert('subject.positionZ' in shot().start.values&&'subject.rotationX' in shot().end.values,'Full 3D Subject axes are present');

section('Generation pools');
const pool=makeHarness('pool'),poolShot=pool.shot;
for(const axisId of ['light','camera','focus','composition','subject-size','subject-rotation','view','motion-design','environment','atmosphere'])pool.commands.dispatch('shot.toggleCreativeLock',{axisId});
for(const optionId of ['18mm','35mm','50mm','200mm','macro','tilt-shift'])pool.commands.dispatch('shot.toggleCreativeExclusion',{axisId:'lens',optionId});
pool.commands.dispatch('shot.generateVariant',{mode:'near'});
assert(poolShot().end.choices.lens==='85mm','Variant generation chooses only from the allowed pool');
const lockedCameraDistance=poolShot().end.values['camera.distance'];pool.commands.dispatch('shot.toggleCreativeExclusion',{axisId:'lens',optionId:'85mm'});pool.commands.dispatch('shot.generateVariant',{mode:'bold'});
assert(poolShot().end.choices.lens==='85mm'&&poolShot().end.values['camera.distance']===lockedCameraDistance,'An empty option pool behaves as a generation lock');
pool.commands.dispatch('shot.resetCreativePool',{axisId:'lens'});
assert(Object.keys(poolShot().creativeExclusions).filter(key=>key.startsWith('lens:')).length===0,'Axis pool reset restores every option');

section('Timeline functional core');
commands.dispatch('ui.setTimelineMonitorMode',{mode:'viewport'});assert(store.get().ui.timelineMonitorMode==='viewport','Timeline monitor opens Viewport mode');commands.dispatch('ui.setTimelineMonitorMode',{mode:'player'});assert(store.get().ui.timelineMonitorMode==='player','Timeline monitor returns to Player mode');
const orderBefore=store.get().shots.order.length;commands.dispatch('shot.duplicate');assert(store.get().shots.order.length===orderBefore+1,'Shot duplication creates an independent slot');
commands.dispatch('shot.addToTimeline',{trackId:'v1'});
let editClip=store.get().timeline.clips[store.get().timeline.selectedClipId],editStart=editClip.startFrame,editDuration=editClip.durationFrames;
commands.dispatch('timeline.trimClipSide',{clipId:editClip.id,side:'left',startFrame:editStart+2,durationFrames:editDuration-2,sourceInFrame:2});
editClip=store.get().timeline.clips[editClip.id];
assert(editClip.startFrame===editStart+2&&editClip.sourceInFrame===2,'Left trim preserves source timing');
commands.dispatch('timeline.splitClip',{clipId:editClip.id,frame:editClip.startFrame+2});
assert(Object.values(store.get().timeline.clips).filter(item=>item.type==='shot').length>=3,'Blade creates a second shot segment');
const selectedAfterBlade=store.get().timeline.selectedClipId,sourceShotId=store.get().timeline.clips[selectedAfterBlade].shotId;
commands.dispatch('timeline.makeUnique',{clipId:selectedAfterBlade});
assert(store.get().timeline.clips[selectedAfterBlade].linked===false&&store.get().timeline.clips[selectedAfterBlade].shotId!==sourceShotId,'Make Unique safely breaks a linked Shot');
commands.dispatch('timeline.toggleTrack',{trackId:'v1',field:'locked'});assert(store.get().timeline.tracks.v1.locked===true,'Track lock is persistent');commands.dispatch('timeline.toggleTrack',{trackId:'v1',field:'locked'});
commands.dispatch('timeline.addMarker',{frame:12,label:'BEAT'});assert(store.get().timeline.markers.some(marker=>marker.frame===12&&marker.label==='BEAT'),'Timeline markers are stored');
commands.dispatch('timeline.addFx',{effect:'flash',startFrame:12,durationFrames:8});assert(Object.values(store.get().timeline.clips).some(item=>item.type==='fx'&&item.effect==='flash'),'FX clips are functional timeline objects');
commands.dispatch('asset.register',{asset:{id:'audio-test',type:'audio',name:'beat.wav',source:'indexeddb',status:'ready',size:20,meta:{durationFrames:96,waveform:[.1,.4,.8,.2]}}});
commands.dispatch('timeline.addAudio',{assetId:'audio-test',trackId:'a1',durationFrames:96,startFrame:0});assert(Object.values(store.get().timeline.clips).some(item=>item.type==='audio'&&item.assetId==='audio-test'),'Audio clips attach to audio tracks');
commands.dispatch('timeline.applySequencePreset',{presetId:'premium-product'});
assert(store.get().timeline.sequencePresetId==='premium-product'&&Object.values(store.get().timeline.clips).filter(item=>item.type==='shot').length===4,'Sequence recipe builds a complete four-shot timeline');

console.log('\nV44 · GLB + ENVIRONMENT + WORLD/LOCAL GIZMO · FUNCTIONAL SMOKE · PASS');

function section(label){console.log(`\n## ${label}`);}
function assert(condition,label){if(!condition)throw new Error(`FAIL · ${label}`);console.log(`PASS · ${label}`);}
function arrayEqual(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>Math.abs(Number(value)-Number(b[index]))<1e-9);}
function deepEqual(a,b){return JSON.stringify(a)===JSON.stringify(b);}
