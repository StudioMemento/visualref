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
  SCHEMA_VERSION,RELEASE,TRACKS
}=await import('../src/core/default-state.js');
const {CREATIVE_AXIS_MAP}=await import('../src/shots/creative-axes.js');
const {V45_RENDER_MACROS}=await import('../src/workspaces/render-workspace.js');
const {unitScaleToMeters,normalizationScaleForAsset,cameraTargetRadius}=await import('../src/core/normalization-contract.js');
const {RendererAuthority}=await import('../src/v45/renderer-authority.js');
const {createRuntimeInstrumentation}=await import('../src/v45/runtime-instrumentation.js');
const {HistoryService}=await import('../src/core/history-service.js');
const {ProjectStore}=await import('../src/core/project-store.js');
const {CommandBus}=await import('../src/core/command-bus.js');
const {registerCommands}=await import('../src/core/commands.js');
const {evaluateShot,evaluateSequence,deltaSummary}=await import('../src/player/shot-interpolator.js');

const persistence={save(){},clear(){},clearAssets(){},deleteAsset(){return Promise.resolve();}};
const sync={onState(){},broadcast(){}};
function makeHarness(id='core'){
  const state=createDefaultState();state.meta.id=`${state.meta.id}-${id}`;
  const history=new HistoryService(state.meta.id);
  const store=new ProjectStore({state,history,persistence,sync});
  const commands=new CommandBus({store,history,persistence,sync,toast(){}});registerCommands(commands);
  return {store,history,commands,shot:()=>store.get().shots.byId[store.get().shots.activeShotId]};
}
const {store,history,commands,shot}=makeHarness('v45');

section('V45 product state');
assert(SCHEMA_VERSION===45&&RELEASE==='V45','Release constants identify V45');
assert(store.get().schema.version===45&&store.get().schema.release==='V45','Default project is schema 45');
assert(store.get().meta.name==='MEMENTO V45','Default project name identifies V45');
assert(store.get().ui.viewportEditMode==='calibrate','Viewport starts in physical calibration mode');
assert(store.get().ui.renderMonitorMode==='live','Render monitor starts in Live mode');
assert(store.get().ui.timelineLibraryOpen===false&&store.get().ui.timelineRecipesOpen===false,'Timeline drawers start closed');
assert(V45_RENDER_MACROS.length===9,'Render has nine stable macro categories');
assert(TRACKS.map(track=>track.id).join(',')==='gfx,v3,v2,v1,a1,a2','Timeline has the canonical six tracks');
assert(shot().presetId===null,'Active project state has no visible preset authority');
assert(shot().start.choices['motion-design']==='none'&&shot().end.choices['motion-design']==='none','Motion is Off by default');
assert(shot().start.values['motion.energy']===0&&shot().end.values['motion.energy']===0,'Motion energy is zero at both endpoints');
assert(shot().start.choices['subject-presence']==='present','Hero is Present by default');

section('Migration boundary');
const legacy=createDefaultState();legacy.schema.version=44;legacy.schema.release='V44';legacy.meta.name='MEMENTO V44';legacy.ui.viewportEditMode='shot';delete legacy.ui.renderMonitorMode;delete legacy.ui.timelineLibraryOpen;delete legacy.ui.workspaceSplitters;
const migrated=normalizeState(legacy);
assert(migrated.schema.version===45&&migrated.schema.release==='V45'&&migrated.schema.migratedFrom==='V44','Schema 44 migrates explicitly to V45');
assert(migrated.meta.name==='MEMENTO V45','Legacy project title migrates to V45');
assert(migrated.ui.renderMonitorMode==='live'&&migrated.ui.timelineLibraryOpen===false,'Migration restores V45 UI defaults');
assert(migrated.ui.workspaceSplitters.render===.61&&migrated.ui.workspaceSplitters.timeline===.34,'Migration restores per-workspace splitters');

section('Renderer authority and instrumentation');
RendererAuthority.resetForTests();
const token=RendererAuthority.acquire('test-player');
assert(RendererAuthority.snapshot()?.owner==='test-player','Renderer authority records one owner');
let rejected=false;try{RendererAuthority.acquire('second-player');}catch{rejected=true;}
assert(rejected,'Renderer authority rejects a second owner');
assert(RendererAuthority.release(token)&&RendererAuthority.snapshot()===null,'Renderer authority releases cleanly');
const instrumentation=createRuntimeInstrumentation({store});
RendererAuthority.acquire('instrumented-player');const sample=instrumentation.snapshot();
assert(sample.rendererCount===1&&sample.liveHeroCount===1,'Instrumentation reports one renderer and one visible Hero');
RendererAuthority.resetForTests();instrumentation.dispose();

section('Physical calibration contract');
assert(unitScaleToMeters('m')===1&&unitScaleToMeters('cm')===.01&&unitScaleToMeters('mm')===.001,'Metric units convert to metres');
assert(Math.abs(unitScaleToMeters('in')-.0254)<1e-12&&Math.abs(unitScaleToMeters('ft')-.3048)<1e-12,'Imperial units convert to metres');
const heroCorrection=correctionDefaultsForType('hero'),envCorrection=correctionDefaultsForType('environment');
assert(heroCorrection.referenceDimension===null&&heroCorrection.referenceAxis==='x'&&heroCorrection.unit==='m','Hero physical reference defaults are explicit');
assert(heroCorrection.normalizeMode==='camera'&&envCorrection.normalizeMode==='native','Hero and Environment keep different normalization roles');
const target=cameraTargetRadius(),small=.5,large=12;
assert(Math.abs(small*normalizationScaleForAsset({type:'hero',sourceRadius:small})-target)<1e-9&&Math.abs(large*normalizationScaleForAsset({type:'hero',sourceRadius:large})-target)<1e-9,'Camera-relative Hero normalization remains deterministic');
assert(normalizationScaleForAsset({type:'environment',sourceRadius:100,sourceMaxDimension:200})===1,'Environment preserves native authoring scale');
commands.dispatch('scene.setNodeCorrection',{nodeId:'hero-proxy',field:'referenceAxis',value:'y'});
commands.dispatch('scene.setNodeCorrection',{nodeId:'hero-proxy',field:'referenceDimension',value:1.42});
commands.dispatch('scene.setNodeCorrection',{nodeId:'hero-proxy',field:'unit',value:'m'});
assert(store.get().scene.nodes['hero-proxy'].correction.referenceAxis==='y'&&store.get().scene.nodes['hero-proxy'].correction.referenceDimension===1.42,'Physical calibration persists through scene commands');

section('Render interaction contract');
commands.dispatch('ui.setRenderMonitorMode',{mode:'compare'});assert(store.get().ui.renderMonitorMode==='compare','Render monitor enters Compare');
commands.dispatch('ui.setRenderMonitorMode',{mode:'invalid'});assert(store.get().ui.renderMonitorMode==='live','Invalid Render monitor mode falls back to Live');
commands.dispatch('ui.setMacro',{macroId:'lens-focus'});assert(store.get().ui.selectedMacroId==='lens-focus','Render macro selection persists');
commands.dispatch('ui.setScope',{scope:'both'});commands.dispatch('shot.setCreativeChoice',{axisId:'camera',optionId:'push-in'});
assert(shot().start.choices.camera==='push-in'&&shot().end.choices.camera==='push-in','Both endpoint assignment updates Start and End');
commands.dispatch('ui.setScope',{scope:'start'});commands.dispatch('shot.setCreativeChoice',{axisId:'subject-presence',optionId:'hidden'});
assert(shot().start.choices['subject-presence']==='hidden'&&shot().end.choices['subject-presence']==='present','Subject presence can differ by endpoint');
commands.dispatch('ui.setScope',{scope:'both'});commands.dispatch('shot.setCreativeChoice',{axisId:'motion-design',optionId:'satellite'});
assert(shot().start.choices['motion-design']==='satellite'&&shot().end.choices['motion-design']==='satellite','Motion can be enabled deliberately');
commands.dispatch('shot.setAxis',{axisId:'motion.energy',value:.68,scope:'end'});assert(shot().end.values['motion.energy']===.68,'Motion Energy is independently controllable');
assert(CREATIVE_AXIS_MAP.get('motion-design').advancedAxes.includes('motion.energy'),'Motion exposes Energy only as precision');
const beforeVariant=shot().variant;commands.dispatch('shot.generateVariant',{mode:'near'});assert(shot().variant===beforeVariant+1,'Variation remains a first-class action');
assert(Boolean(evaluateShot(store.get(),shot().id,0))&&Boolean(evaluateShot(store.get(),shot().id,shot().durationFrames)),'Shot evaluates at both endpoints');
assert(deltaSummary(store.get()).count>0,'Shot delta is computed');

section('Atomic asset state');
const originalHero=store.get().assets.heroId;
commands.dispatch('asset.stageImport',{session:{id:'bad-import',assetId:'hero-bad',type:'hero',nodeId:'hero-proxy',name:'bad.glb',previousAssetId:originalHero}});
commands.dispatch('asset.validateStagedImport',{sessionId:'bad-import',diagnostics:[],meta:{meshes:1}});
assert(store.get().assets.heroId===originalHero,'Staging and validation do not replace the live Hero');
commands.dispatch('asset.failImport',{sessionId:'bad-import',error:new Error('parse failed')});
assert(store.get().assets.heroId===originalHero&&store.get().assets.importSession.status==='error','Failed asset replacement preserves the previous Hero');
commands.dispatch('asset.cancelImport',{sessionId:'bad-import'});assert(store.get().assets.importSession===null,'Failed import can be dismissed');

section('Timeline professional core');
commands.dispatch('ui.setTimelineLibraryOpen',{});commands.dispatch('ui.setTimelineRecipesOpen',{});
assert(store.get().ui.timelineLibraryOpen&&store.get().ui.timelineRecipesOpen,'Timeline Library and Recipes are contextual toggles');
const sceneCount=Object.keys(store.get().scene.nodes).length;
commands.dispatch('shot.addToTimeline',{trackId:'v1'});
let clip=store.get().timeline.clips[store.get().timeline.selectedClipId];
assert(clip?.linked&&clip.trackId==='v1','A linked Shot clip is added to V1');
const shotCountBefore=store.get().shots.order.length;
commands.dispatch('timeline.makeUnique',{clipId:clip.id});clip=store.get().timeline.clips[clip.id];
assert(clip.linked===false&&store.get().shots.order.length===shotCountBefore+1,'Make Unique creates a Shot copy and breaks the link');
assert(Object.keys(store.get().scene.nodes).length===sceneCount,'Make Unique never clones the physical scene');
const startBefore=clip.startFrame;commands.dispatch('timeline.moveClip',{clipId:clip.id,startFrame:startBefore+14,trackId:'v2'});
clip=store.get().timeline.clips[clip.id];assert(clip.startFrame>=startBefore&&clip.trackId==='v2','Timeline move changes time and compatible track only');
assert(Object.keys(store.get().scene.nodes).length===sceneCount,'Timeline editing never changes scene entity count');
commands.dispatch('timeline.trimClipSide',{clipId:clip.id,side:'left',startFrame:clip.startFrame+2,durationFrames:clip.durationFrames-2,sourceInFrame:2});
assert(store.get().timeline.clips[clip.id].sourceInFrame===2,'Left trim preserves source timing');
commands.dispatch('timeline.addMarker',{frame:12,label:'BEAT'});assert(store.get().timeline.markers.some(marker=>marker.frame===12),'Timeline marker is stored');
commands.dispatch('timeline.addFx',{effect:'flash',startFrame:12,durationFrames:8});assert(Object.values(store.get().timeline.clips).some(item=>item.type==='fx'),'FX is a real timeline clip');
commands.dispatch('asset.register',{asset:{id:'audio-test',type:'audio',name:'beat.wav',source:'indexeddb',status:'ready',size:20,meta:{durationFrames:96,waveform:[.1,.4,.8,.2]}}});
commands.dispatch('timeline.addAudio',{assetId:'audio-test',trackId:'a1',durationFrames:96,startFrame:0});assert(Object.values(store.get().timeline.clips).some(item=>item.type==='audio'&&item.trackId==='a1'),'Audio attaches to an audio track');
assert(Boolean(evaluateSequence(store.get(),12)),'Sequence evaluates after mixed clip operations');

section('One history path');
const nameBefore=shot().name;commands.dispatch('shot.generateVariant',{mode:'balanced'});const nameAfter=shot().name;
assert(history.canUndo()&&nameAfter!==nameBefore,'A command records history');
commands.dispatch('history.undo');assert(shot().name===nameBefore,'Undo restores the prior project state');
commands.dispatch('history.redo');assert(shot().name===nameAfter,'Redo restores the next project state');
store.setSplitter(.67,'render');assert(store.get().ui.workspaceSplitters.render===.67,'Workspace splitter persists per workspace');

console.log('\nV45 · CORE / CALIBRATION / RENDER / TIMELINE · FUNCTIONAL SMOKE · PASS');
function section(label){console.log(`\n## ${label}`);}
function assert(condition,label){if(!condition)throw new Error(`FAIL · ${label}`);console.log(`PASS · ${label}`);}
