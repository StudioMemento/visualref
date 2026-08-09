export class InvariantError extends Error{
  constructor(message,code='V45_INVARIANT'){super(message);this.name='InvariantError';this.code=code;}
}

export function heroEntities(project){
  return Object.values(project?.scene?.entities||{}).filter(entity=>entity?.role==='hero');
}

export function assertOneHero(project){
  const heroes=heroEntities(project);
  if(heroes.length>1)throw new InvariantError(`Expected at most one Hero entity, found ${heroes.length}`,'V45_ONE_HERO');
  if(project?.scene?.heroId && heroes[0]?.id!==project.scene.heroId)throw new InvariantError('scene.heroId does not match semantic Hero entity','V45_HERO_POINTER');
  return true;
}

export function assertClipReferences(project){
  for(const clip of Object.values(project?.timeline?.clips||{})){
    if(clip.type==='shot' && !project.shots?.byId?.[clip.shotId])throw new InvariantError(`Clip ${clip.id} references missing Shot ${clip.shotId}`,'V45_CLIP_SHOT_REF');
    if('sceneEntityId' in clip || 'heroEntityId' in clip)throw new InvariantError(`Clip ${clip.id} illegally owns a Scene entity reference`,'V45_CLIP_ENTITY_OWNERSHIP');
  }
  return true;
}

export function assertMotionDefaults(project){
  for(const shot of Object.values(project?.shots?.byId||{})){
    if(typeof shot.motion?.enabled!=='boolean')throw new InvariantError(`Shot ${shot.id} has invalid Motion state`,'V45_MOTION_STATE');
  }
  return true;
}

export function assertProject(project){
  if(project?.schema?.version!==45)throw new InvariantError(`Expected schema 45, got ${project?.schema?.version}`,'V45_SCHEMA');
  assertOneHero(project);assertClipReferences(project);assertMotionDefaults(project);return true;
}
