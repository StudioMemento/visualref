export const CAPABILITIES = {
  glb: true,
  multiAsset: true,
  splitView: true,
  hdriRadiance: true,
  exr: false,
  managedLighting: true,
  postFx: true,
  dof: true,
  motionBasic: true,
  motionGraphic: true,
  atmosphereProcedural: true,
  timeline: true,
  audio: false,
  playblast: false,
};

export function hasCapabilities(required = []) {
  return required.every((id) => CAPABILITIES[id] === true);
}
