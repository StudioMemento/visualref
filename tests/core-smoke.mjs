class StorageMock{constructor(){this.map=new Map()}getItem(key){return this.map.get(key)??null}setItem(key,value){this.map.set(key,String(value))}removeItem(key){this.map.delete(key)}}
globalThis.sessionStorage=new StorageMock();globalThis.localStorage=new StorageMock();globalThis.performance={now:()=>Date.now()};

const {createDefaultState,normalizeState,correctionDefaultsForType}=await import('../src/core/default-state.js');
const {normalizationScaleForAsset,cameraTargetRadius}=await import('../src/core/normalization-contract.js');
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

assert('subject.positionZ' in shot().start.values&&'subject.rotationX' in shot().end.values,'V43C 3D transform axes are present');
const migrated=normalizeState(structuredClone(store.get()));assert(migrated.schema.release==='V43C-R1','Earlier state normalizes into the core rebuild release');
assert(migrated.scene.nodes['hero-proxy'].correction.normalizeMode==='camera'&&migrated.scene.nodes['hero-proxy'].correction.autoNormalize===true,'Hero normalization is locked to the Shot Camera contract');
assert(migrated.scene.nodes['environment-proxy'].correction.normalizeMode==='native'&&migrated.scene.nodes['environment-proxy'].correction.autoNormalize===false,'Environment normalization remains native and editable');
const radiusSmall=0.5,radiusLarge=12,smallScale=normalizationScaleForAsset({type:'hero',sourceRadius:radiusSmall}),largeScale=normalizationScaleForAsset({type:'hero',sourceRadius:radiusLarge}),targetRadius=cameraTargetRadius();
assert(Math.abs(radiusSmall*smallScale-targetRadius)<1e-9&&Math.abs(radiusLarge*largeScale-targetRadius)<1e-9,'Different Hero GLBs normalize to the same camera-relative radius');
assert(normalizationScaleForAsset({type:'environment',sourceRadius:200,sourceMaxDimension:400})===1,'Environment GLBs preserve native scale');
commands.dispatch('asset.register',{asset:{id:'hero-test',type:'hero',name:'test.glb',source:'indexeddb',status:'ready',size:100},node:null});
assert(store.get().assets.heroId==='hero-test'&&store.get().scene.nodes['hero-proxy'].assetId==='hero-test','Hero asset registration updates shared scene');
const propNode={id:'prop-test',name:'Prop · test.glb',type:'prop',assetId:'prop-asset',visible:true,locked:false,baseTransform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},correction:correctionDefaultsForType('prop'),helpers:{bounds:true,pivot:false}};
commands.dispatch('asset.register',{asset:{id:'prop-asset',type:'prop',name:'prop.glb',source:'indexeddb',status:'ready',size:50,nodeId:'prop-test'},node:propNode});
assert(store.get().assets.secondaryIds.includes('prop-asset')&&store.get().scene.nodes['prop-test'],'Prop registration creates an outliner node');
commands.dispatch('scene.setNodeCorrection',{nodeId:'hero-proxy',field:'pivot',value:[.1,.2,.3]});assert(store.get().scene.nodes['hero-proxy'].correction.pivot[1]===.2,'Pivot correction is project state');
commands.dispatch('asset.register',{asset:{id:'environment-test',type:'environment',name:'environment.glb',source:'indexeddb',status:'ready',size:500},node:null});
assert(store.get().scene.nodes['environment-proxy'].correction.normalizeMode==='native'&&store.get().scene.nodes['environment-proxy'].correction.autoNormalize===false,'Environment import resets to native-space correction');
commands.dispatch('scene.setNodeTransform',{nodeId:'environment-proxy',transform:{position:[4,2,-8],rotation:[0,.5,0],scale:[2,1.5,2]}});
assert(store.get().scene.nodes['environment-proxy'].baseTransform.position[0]===4&&store.get().scene.nodes['environment-proxy'].baseTransform.scale[2]===2,'Environment position rotation and scale are persistent scene state');
commands.dispatch('scene.setNodeCorrection',{nodeId:'environment-proxy',field:'pivot',value:[1,.25,-2]});
assert(store.get().scene.nodes['environment-proxy'].correction.pivot[2]===-2&&store.get().scene.nodes['environment-proxy'].correction.normalizeMode==='native','Environment pivot is editable without enabling camera normalization');

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


// Core rebuild parity: shot management, sequence presets and editing tools.
const orderBefore=store.get().shots.order.length;commands.dispatch('shot.duplicate');assert(store.get().shots.order.length===orderBefore+1,'Shot duplication creates an independent slot');
commands.dispatch('shot.addToTimeline',{trackId:'v1'});const editClip=store.get().timeline.clips[store.get().timeline.selectedClipId],editStart=editClip.startFrame,editDuration=editClip.durationFrames;
commands.dispatch('timeline.trimClipSide',{clipId:editClip.id,side:'left',startFrame:editStart+2,durationFrames:editDuration-2,sourceInFrame:2});assert(editClip.startFrame===editStart+2&&editClip.sourceInFrame===2,'Timeline trims the left edge and preserves source timing');
commands.dispatch('timeline.splitClip',{clipId:editClip.id,frame:editClip.startFrame+2});assert(Object.values(store.get().timeline.clips).filter(item=>item.type==='shot').length>=3,'Blade creates a second shot segment');
const selectedAfterBlade=store.get().timeline.selectedClipId,sourceShotId=store.get().timeline.clips[selectedAfterBlade].shotId;commands.dispatch('timeline.makeUnique',{clipId:selectedAfterBlade});assert(store.get().timeline.clips[selectedAfterBlade].linked===false&&store.get().timeline.clips[selectedAfterBlade].shotId!==sourceShotId,'Make unique breaks the linked-shot reference safely');
commands.dispatch('timeline.toggleTrack',{trackId:'v1',field:'locked'});assert(store.get().timeline.tracks.v1.locked===true,'Track lock is persistent state');commands.dispatch('timeline.toggleTrack',{trackId:'v1',field:'locked'});
commands.dispatch('timeline.addMarker',{frame:12,label:'BEAT'});assert(store.get().timeline.markers.some(marker=>marker.frame===12&&marker.label==='BEAT'),'Timeline markers are stored');
commands.dispatch('timeline.addFx',{effect:'flash',startFrame:12,durationFrames:8});assert(Object.values(store.get().timeline.clips).some(item=>item.type==='fx'&&item.effect==='flash'),'FX clips are functional timeline objects');
commands.dispatch('asset.register',{asset:{id:'audio-test',type:'audio',name:'beat.wav',source:'indexeddb',status:'ready',size:20,meta:{durationFrames:96,waveform:[.1,.4,.8,.2]}}});commands.dispatch('timeline.addAudio',{assetId:'audio-test',trackId:'a1',durationFrames:96,startFrame:0});assert(Object.values(store.get().timeline.clips).some(item=>item.type==='audio'&&item.assetId==='audio-test'),'Audio clips are attached to audio tracks');
commands.dispatch('timeline.applySequencePreset',{presetId:'premium-product'});assert(store.get().timeline.sequencePresetId==='premium-product'&&Object.values(store.get().timeline.clips).filter(item=>item.type==='shot').length===4,'Sequence recipes build a complete four-shot timeline');

console.log('V43C-R1 CORE REBUILD · FUNCTIONAL PARITY SMOKE · PASS');
function assert(condition,label){if(!condition)throw new Error(`FAIL · ${label}`);console.log(`PASS · ${label}`)}
