const DEG_TO_RAD=Math.PI/180;

export const HERO_CAMERA_CONTRACT=Object.freeze({
  referenceFov:38,
  referenceDistance:5.5,
  targetCoverage:.58
});

export function cameraTargetRadius({
  referenceFov=HERO_CAMERA_CONTRACT.referenceFov,
  referenceDistance=HERO_CAMERA_CONTRACT.referenceDistance,
  targetCoverage=HERO_CAMERA_CONTRACT.targetCoverage
}={}){
  const fov=Math.max(1,Math.min(179,Number(referenceFov)||HERO_CAMERA_CONTRACT.referenceFov));
  const distance=Math.max(.01,Number(referenceDistance)||HERO_CAMERA_CONTRACT.referenceDistance);
  const coverage=Math.max(.05,Math.min(1.4,Number(targetCoverage)||HERO_CAMERA_CONTRACT.targetCoverage));
  return Math.tan(fov*DEG_TO_RAD*.5)*distance*coverage;
}

export function normalizationScaleForAsset({
  type,
  sourceRadius=1,
  sourceMaxDimension=1,
  targetCoverage=HERO_CAMERA_CONTRACT.targetCoverage,
  propTargetSize=1.25
}={}){
  const radius=Math.max(.000001,Number(sourceRadius)||1);
  const maxDimension=Math.max(.000001,Number(sourceMaxDimension)||1);
  if(type==="hero")return cameraTargetRadius({targetCoverage})/radius;
  if(type==="environment")return 1;
  return Math.max(.000001,Number(propTargetSize)||1.25)/maxDimension;
}

export function correctionDefaultsForType(type){
  const common={
    pivot:[0,0,0],
    rotation:[0,0,0],
    scale:[1,1,1],
    groundOffset:0,
    autoNormalize:true,
    autoGround:true,
    normalizeMode:"scene",
    targetCoverage:HERO_CAMERA_CONTRACT.targetCoverage
  };
  if(type==="hero")return {...common,autoNormalize:true,autoGround:true,normalizeMode:"camera"};
  if(type==="environment")return {...common,autoNormalize:false,autoGround:false,normalizeMode:"native"};
  if(type==="camera"||type==="editor-camera"||type==="light")return {...common,autoNormalize:false,autoGround:false,normalizeMode:"none"};
  return common;
}
