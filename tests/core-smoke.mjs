class StorageMock{constructor(){this.map=new Map()}getItem(key){return this.map.get(key)??null}setItem(key,value){this.map.set(key,String(value))}removeItem(key){this.map.delete(key)}}
globalThis.sessionStorage=new StorageMock();globalThis.localStorage=new StorageMock();globalThis.performance={now:()=>Date.now()};

const {createDefaultState}=await import('../src/core/default-state.js');
const {HistoryService}=await import('../src/core/history-service.js');
const {ProjectStore}=await import('../src/core/project-store.js');
const {CommandBus}=await import('../src/core/command-bus.js');
const {registerCommands}=await import('../src/core/commands.js');
const {evaluateShot,evaluateSequence,deltaSummary}=await import('../src/player/shot-interpolator.js');

const state=createDefaultState(),history=new HistoryService(state.meta.id),persistence={save(){},clear(){}},sync={onState(){},broadcast(){}};
const store=new ProjectStore({state,history,persistence,sync}),commands=new CommandBus({store,history,persistence,sync,toast(){}});registerCommands(commands);
const shot=()=>store.get().shots.byId[store.get().shots.activeShotId];

commands.dispatch('ui.setScope',{scope:'start'});commands.dispatch('shot.setAxis',{axisId:'subject.scale',value:1.2});
assert(shot().start.values['subject.scale']===1.2,'Start scope writes Start');assert(shot().end.values['subject.scale']!==1.2,'Start scope does not write End');
commands.dispatch('ui.setScope',{scope:'end'});commands.dispatch('shot.setAxis',{axisId:'subject.rotationY',value:64});assert(shot().end.values['subject.rotationY']===64,'End scope writes End');
commands.dispatch('shot.addToTimeline',{trackId:'v1'});const clip=Object.values(store.get().timeline.clips)[0];assert(Boolean(clip?.linked),'Timeline clip is linked');
commands.dispatch('shot.generateVariant',{mode:'near'});assert(clip.shotId===shot().id,'Shot link survives generation');
assert(Boolean(evaluateShot(store.get(),shot().id,0)),'Shot evaluates at Start');assert(Boolean(evaluateShot(store.get(),shot().id,shot().durationFrames)),'Shot evaluates at End');assert(Boolean(evaluateSequence(store.get(),clip.startFrame+4)),'Sequence evaluates linked clip');assert(deltaSummary(store.get()).count>0,'Delta is computed');
const generatedName=shot().name;commands.dispatch('history.undo');assert(shot().name!==generatedName,'Undo restores previous Shot');commands.dispatch('history.redo');assert(shot().name===generatedName,'Redo restores generated Shot');
console.log('V43A CORE SMOKE · PASS');
function assert(condition,label){if(!condition)throw new Error(`FAIL · ${label}`);console.log(`PASS · ${label}`)}
