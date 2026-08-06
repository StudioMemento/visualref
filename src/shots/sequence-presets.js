export const SEQUENCE_PRESETS=[
  {id:"empty",label:"EMPTY",description:"Start from a clean timeline",shots:[]},
  {id:"premium-product",label:"PREMIUM PRODUCT",description:"Authority · reveal · detail · resolve",shots:["hero.silent-authority","reveal.edge-light","detail.material","closing.resolve"]},
  {id:"dynamic-launch",label:"DYNAMIC LAUNCH",description:"Discovery · impact · orbit · final",shots:["reveal.parallax","motion.impact","motion.orbit","closing.monogram"]},
  {id:"technical-proof",label:"TECHNICAL PROOF",description:"Hero · engineering · scan · resolve",shots:["hero.monument","tech.proof","tech.scan","closing.resolve"]},
  {id:"social-demo",label:"SOCIAL DEMO",description:"Fast four-shot mobile-friendly sequence",shots:["hero.silent-authority","detail.signature","graphic.diagonal","closing.monogram"]}
];
export const SEQUENCE_PRESET_MAP=new Map(SEQUENCE_PRESETS.map(preset=>[preset.id,preset]));
