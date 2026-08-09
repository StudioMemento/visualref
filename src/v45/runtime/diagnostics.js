import {heroEntities} from '../core/invariants.js';

export function collectV45Diagnostics({project,rendererAuthority,assetTransactions=[]}={}){
  return Object.freeze({
    schema:project?.schema?.version||null,
    rendererCount:rendererAuthority?.snapshot?.().rendererCount??0,
    rendererOwner:rendererAuthority?.snapshot?.().owner??null,
    heroEntityCount:heroEntities(project).length,
    shotCount:Object.keys(project?.shots?.byId||{}).length,
    timelineClipCount:Object.keys(project?.timeline?.clips||{}).length,
    assetTransactions:assetTransactions.slice(-20)
  });
}
