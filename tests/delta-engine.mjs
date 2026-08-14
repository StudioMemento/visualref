import assert from "node:assert/strict";
import {createDefaultState,HistoryService,PersistenceService,WorkspaceSync,ProjectStore,CommandBus,registerCommands} from "../src/v47r/mock-native.js";
import {generateCandidateFromState} from "../src/v47r/delta-engine.js";
import {initializeRecoveryState,registerRecoveryCommands} from "../src/v47r/commands.js";

const source=initializeRecoveryState(createDefaultState()),sourceSnapshot=structuredClone(source),seed=193847;
const a=generateCandidateFromState(source,{seed,target:55}),b=generateCandidateFromState(source,{seed,target:55});
assert.deepEqual(a.shot,b.shot,"same seed and target must be deterministic");
assert.deepEqual(source,sourceSnapshot,"pure Delta generation must not mutate Current");
assert.ok(Math.abs(a.comparison.score-55)<=5,`measured Delta ${a.comparison.score} should track target 55`);
const scores=[15,35,55,75,90].map(target=>generateCandidateFromState(source,{seed:12345,target}).comparison.score);
for(let index=1;index<scores.length;index++)assert.ok(scores[index]>=scores[index-1]-3,`Delta scores should progress with target: ${scores}`);

const locked=structuredClone(source);locked.shots.byId[locked.shots.activeShotId].creativeLocks.camera=true;const beforeCamera=structuredClone(locked.shots.byId[locked.shots.activeShotId]);const lockedCandidate=generateCandidateFromState(locked,{seed:445566,target:82}).shot;
assert.equal(lockedCandidate.start.choices.camera,beforeCamera.start.choices.camera,"locked START camera must remain unchanged");
assert.equal(lockedCandidate.end.choices.camera,beforeCamera.end.choices.camera,"locked END camera must remain unchanged");

const state=initializeRecoveryState(createDefaultState()),history=new HistoryService(),persistence=new PersistenceService(),sync=new WorkspaceSync(),store=new ProjectStore({state,history,persistence,sync}),bus=new CommandBus({store,history,persistence,sync,toast:()=>{}});registerCommands(bus);registerRecoveryCommands(bus,{store,toast:()=>{}});
bus.dispatch("candidate.setTarget",{value:62});const beforeGenerate=structuredClone(store.get().shots.byId[store.get().shots.activeShotId]);bus.dispatch("candidate.generate",{seed:98765});
assert.deepEqual(store.get().shots.byId[store.get().shots.activeShotId],beforeGenerate,"Current must remain unchanged until Accept");
assert.ok(store.get().recovery.candidates[store.get().shots.activeShotId].candidate,"Candidate should exist after generation");
bus.dispatch("candidate.accept");const afterAccept=store.get().shots.byId[store.get().shots.activeShotId],record=store.get().recovery.candidates[store.get().shots.activeShotId];
assert.notDeepEqual(afterAccept,beforeGenerate,"Accept must update Current");assert.deepEqual(record.previous,beforeGenerate,"Accept must preserve Previous");assert.equal(record.candidate,null,"Accept must clear Candidate");

const imported=createDefaultState(),importedId="hero-imported";imported.assets.byId[importedId]={id:importedId,type:"hero",source:"indexeddb",name:"Imported Hero",status:"ready"};imported.assets.heroId=importedId;
initializeRecoveryState(imported);assert.equal(imported.recovery.world.ground,false,"an inherited imported hero must be re-grounded instead of silently moving the stage");
const importedHistory=new HistoryService(),importedPersistence=new PersistenceService(),importedSync=new WorkspaceSync(),importedStore=new ProjectStore({state:imported,history:importedHistory,persistence:importedPersistence,sync:importedSync}),importedBus=new CommandBus({store:importedStore,history:importedHistory,persistence:importedPersistence,sync:importedSync,toast:()=>{}});registerCommands(importedBus);registerRecoveryCommands(importedBus,{store:importedStore,toast:()=>{}});
importedBus.dispatch("world.recoverVisualTruth",{nodeId:"hero-proxy",assetId:importedId,transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}});
assert.equal(importedStore.get().recovery.world.ground,true,"visual truth recovery must establish zero ground");assert.equal(importedStore.get().recovery.session.visualTruthAssetId,importedId,"visual truth recovery must be asset-specific");
console.log(`delta: deterministic · targets ${scores.join("/")} · locks · zero-ground recovery · safe accept passed`);
