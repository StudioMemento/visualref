const option=(id,label,{start={},end=start,description=""}={})=>({id,label,start,end,description});

export const CREATIVE_AXES=[
  {
    id:"light",label:"LIGHT",icon:"☼",defaultStart:"studio",defaultEnd:"studio",advancedAxes:["light.key"],
    options:[
      option("rim-side","RIM SIDE",{start:{"light.key":.72},end:{"light.key":.95}}),
      option("duo-rim","DUO RIM",{start:{"light.key":.82},end:{"light.key":1.12}}),
      option("top","TOP",{start:{"light.key":.62},end:{"light.key":.92}}),
      option("bottom","BOTTOM",{start:{"light.key":.48},end:{"light.key":.78}}),
      option("backlight","BACKLIGHT",{start:{"light.key":.55},end:{"light.key":1.05}}),
      option("radiant","RADIANT",{start:{"light.key":.9},end:{"light.key":1.5}}),
      option("three-point","THREE POINT",{start:{"light.key":.78},end:{"light.key":1.02}}),
      option("studio","STUDIO",{start:{"light.key":.72},end:{"light.key":1.05}}),
      option("spotlight","SPOTLIGHT",{start:{"light.key":.66},end:{"light.key":1.42}}),
      option("penumbra","PENUMBRA",{start:{"light.key":.44},end:{"light.key":.72}}),
      option("hard-light","HARD LIGHT",{start:{"light.key":.68},end:{"light.key":1.18}}),
      option("rim-sweep","RIM SWEEP",{start:{"light.key":.5},end:{"light.key":1.28}}),
      option("beauty-strip","BEAUTY STRIP",{start:{"light.key":.74},end:{"light.key":1.08}}),
      option("portal","PORTAL",{start:{"light.key":.58},end:{"light.key":.94}}),
      option("pulse","PULSE",{start:{"light.key":.36},end:{"light.key":1.55}})
    ]
  },
  {
    id:"camera",label:"CAMERA",icon:"▣",defaultStart:"micro-drift",defaultEnd:"micro-drift",advancedAxes:["camera.distance","camera.height","subject.positionX"],
    options:[
      option("static","STATIC",{start:{"camera.distance":5.3,"camera.height":.08,"subject.positionX":0},end:{"camera.distance":5.3,"camera.height":.08,"subject.positionX":0}}),
      option("micro-drift","MICRO DRIFT",{start:{"camera.distance":5.5,"camera.height":.1,"subject.positionX":-.18},end:{"camera.distance":4.8,"camera.height":.18,"subject.positionX":.18}}),
      option("push-in","PUSH-IN",{start:{"camera.distance":6.2,"camera.height":.08},end:{"camera.distance":4.1,"camera.height":.12}}),
      option("orbit","ORBIT",{start:{"camera.distance":5.7,"camera.height":.18,"subject.positionX":-.32},end:{"camera.distance":5.1,"camera.height":.14,"subject.positionX":.32}}),
      option("crane","CRANE",{start:{"camera.distance":5.8,"camera.height":1.05},end:{"camera.distance":4.9,"camera.height":.02}}),
      option("gimbal","GIMBAL",{start:{"camera.distance":5.5,"camera.height":.32},end:{"camera.distance":4.7,"camera.height":-.08}}),
      option("dolly-zoom","DOLLY ZOOM",{start:{"camera.distance":6.8,"camera.height":.1,"subject.scale":.78},end:{"camera.distance":3.7,"camera.height":.1,"subject.scale":1.28}}),
      option("pan","PAN",{start:{"camera.distance":5.5,"subject.positionX":-.72},end:{"camera.distance":5.5,"subject.positionX":.72}}),
      option("handheld","HANDHELD",{start:{"camera.distance":5.2,"camera.height":.2,"subject.positionX":-.08},end:{"camera.distance":4.9,"camera.height":.05,"subject.positionX":.12}})
    ]
  },
  {
    id:"lens",label:"LENS",icon:"◉",defaultStart:"35mm",defaultEnd:"35mm",advancedAxes:["camera.distance"],
    options:[
      option("18mm","18MM",{start:{"camera.distance":7.2},end:{"camera.distance":6.4}}),
      option("35mm","35MM",{start:{"camera.distance":5.5},end:{"camera.distance":4.4}}),
      option("50mm","50MM",{start:{"camera.distance":5.0},end:{"camera.distance":4.1}}),
      option("85mm","85MM",{start:{"camera.distance":4.4},end:{"camera.distance":3.7}}),
      option("200mm","200MM",{start:{"camera.distance":3.7},end:{"camera.distance":3.15}}),
      option("macro","MACRO",{start:{"camera.distance":3.45,"subject.scale":1.18},end:{"camera.distance":2.95,"subject.scale":1.46}}),
      option("tilt-shift","TILT-SHIFT",{start:{"camera.distance":5.4,"camera.height":.5},end:{"camera.distance":4.8,"camera.height":.24}})
    ]
  },
  {
    id:"focus",label:"FOCUS",icon:"⌗",defaultStart:"shallow",defaultEnd:"shallow",advancedAxes:[],
    options:[option("all","ALL FOCUS"),option("shallow","SHALLOW FOCUS"),option("rack","RACK FOCUS"),option("macro","MACRO"),option("foreground","FOREGROUND BLUR")]
  },
  {
    id:"composition",label:"COMPOSITION",icon:"▦",defaultStart:"centered",defaultEnd:"centered",advancedAxes:["subject.positionX","subject.positionY"],
    options:[
      option("centered","CENTERED",{start:{"subject.positionX":0,"subject.positionY":0},end:{"subject.positionX":0,"subject.positionY":0}}),
      option("thirds","THIRDS",{start:{"subject.positionX":-.48,"subject.positionY":.02},end:{"subject.positionX":.48,"subject.positionY":.02}}),
      option("negative","NEGATIVE SPACE",{start:{"subject.positionX":.62,"subject.positionY":.02},end:{"subject.positionX":.36,"subject.positionY":.02}}),
      option("off-scale","OFF SCALE",{start:{"subject.positionX":-.8,"subject.positionY":.26,"subject.scale":1.25},end:{"subject.positionX":.44,"subject.positionY":-.18,"subject.scale":1.1}}),
      option("low","LOW",{start:{"subject.positionY":-.28},end:{"subject.positionY":-.12}}),
      option("peak","PEAK",{start:{"subject.positionY":.32},end:{"subject.positionY":.12}})
    ]
  },
  {
    id:"subject-size",label:"SUBJECT SIZE",icon:"□",defaultStart:"medium",defaultEnd:"medium",advancedAxes:["subject.scale"],
    options:[
      option("very-small","VERY SMALL",{start:{"subject.scale":.42},end:{"subject.scale":.48}}),
      option("small","SMALL",{start:{"subject.scale":.66},end:{"subject.scale":.72}}),
      option("medium","MEDIUM",{start:{"subject.scale":.92},end:{"subject.scale":1.08}}),
      option("large","LARGE",{start:{"subject.scale":1.18},end:{"subject.scale":1.34}}),
      option("overscale","OVERSCALE",{start:{"subject.scale":1.48},end:{"subject.scale":1.72}})
    ]
  },
  {
    id:"subject-rotation",label:"SUBJECT ROTATION",icon:"⟳",defaultStart:"0",defaultEnd:"90",advancedAxes:["subject.rotationY"],
    options:[
      option("0","0°",{start:{"subject.rotationY":0},end:{"subject.rotationY":0}}),
      option("45","45°",{start:{"subject.rotationY":45},end:{"subject.rotationY":45}}),
      option("90","90°",{start:{"subject.rotationY":90},end:{"subject.rotationY":90}}),
      option("135","135°",{start:{"subject.rotationY":135},end:{"subject.rotationY":135}}),
      option("180","180°",{start:{"subject.rotationY":180},end:{"subject.rotationY":180}}),
      option("in-rotation","IN ROTATION",{start:{"subject.rotationY":-72},end:{"subject.rotationY":72}})
    ]
  },
  {
    id:"view",label:"VIEW",icon:"◉",defaultStart:"macro-three-quarter",defaultEnd:"macro-three-quarter",advancedAxes:["camera.height","subject.rotationY","subject.scale"],
    options:[
      option("centered","CENTERED",{start:{"camera.height":.08,"subject.rotationY":0},end:{"camera.height":.08,"subject.rotationY":0}}),
      option("three-quarter","THREE QUARTER",{start:{"subject.rotationY":-36},end:{"subject.rotationY":28}}),
      option("form-detail","FORM DETAIL",{start:{"subject.scale":1.18,"subject.rotationY":-18},end:{"subject.scale":1.36,"subject.rotationY":12}}),
      option("offset","OFFSET",{start:{"subject.positionX":-.38},end:{"subject.positionX":.34}}),
      option("low","LOW VIEW",{start:{"camera.height":-.32},end:{"camera.height":-.18}}),
      option("top","TOP VIEW",{start:{"camera.height":1.28},end:{"camera.height":.92}}),
      option("profile","PROFILE",{start:{"subject.rotationY":90},end:{"subject.rotationY":90}}),
      option("orthogonal","ORTHOGONAL",{start:{"subject.rotationY":0,"camera.distance":5.8},end:{"subject.rotationY":0,"camera.distance":5.8}}),
      option("macro-three-quarter","MACRO THREE QUARTER",{start:{"subject.scale":1.08,"subject.rotationY":-28,"camera.distance":4.2},end:{"subject.scale":1.32,"subject.rotationY":22,"camera.distance":3.55}}),
      option("zenithal","ZENITHAL",{start:{"camera.height":1.6,"subject.rotationY":0},end:{"camera.height":1.35,"subject.rotationY":12}})
    ]
  },
  {
    id:"motion-design",label:"MOTION DESIGN",icon:"∿",defaultStart:"none",defaultEnd:"none",advancedAxes:["subject.positionX","subject.positionY","subject.rotationY","environment.depth"],
    options:[
      option("none","NONE"),
      option("hero-clones","HERO + CLONES",{start:{"environment.depth":.42},end:{"environment.depth":.7}}),
      option("pattern","PATTERN",{start:{"environment.depth":.38},end:{"environment.depth":.62}}),
      option("spiral","SPIRAL",{start:{"subject.rotationY":-55,"environment.depth":.48},end:{"subject.rotationY":85,"environment.depth":.7}}),
      option("vortex","VORTEX",{start:{"subject.scale":.72,"environment.depth":.8},end:{"subject.scale":1.22,"environment.depth":.36}}),
      option("kaleidoscope","KALEIDOSCOPE",{start:{"subject.rotationY":-90,"environment.depth":.62},end:{"subject.rotationY":90,"environment.depth":.82}}),
      option("multiaxis","MULTIAXIS",{start:{"subject.positionX":-.4,"subject.positionY":.22,"subject.rotationY":-40},end:{"subject.positionX":.34,"subject.positionY":-.16,"subject.rotationY":55}}),
      option("exploded","EXPLODED",{start:{"subject.scale":.84,"environment.depth":.55},end:{"subject.scale":1.42,"environment.depth":.78}}),
      option("stack","STACK",{start:{"subject.positionY":.24},end:{"subject.positionY":-.12}}),
      option("satellite","SATELLITE ORBIT",{start:{"subject.rotationY":-75,"environment.depth":.52},end:{"subject.rotationY":68,"environment.depth":.68}}),
      option("wave","WAVE",{start:{"subject.positionY":-.2},end:{"subject.positionY":.22}}),
      option("dispersion","DISPERSION",{start:{"environment.depth":.22},end:{"environment.depth":.9}})
    ]
  },
  {
    id:"environment",label:"ENVIRONMENT",icon:"⌂",defaultStart:"void",defaultEnd:"void",advancedAxes:["environment.depth"],
    options:[
      option("void","VOID",{start:{"environment.depth":.18},end:{"environment.depth":.28}}),
      option("plane","PLANE",{start:{"environment.depth":.34},end:{"environment.depth":.48}}),
      option("limbo","LIMBO",{start:{"environment.depth":.52},end:{"environment.depth":.68}})
    ]
  },
  {
    id:"atmosphere",label:"ATMOSPHERE",icon:"⁙",defaultStart:"particles",defaultEnd:"particles",advancedAxes:["environment.depth","light.key"],
    options:[
      option("clean","CLEAN VOID",{start:{"environment.depth":.08},end:{"environment.depth":.14}}),
      option("particles","PARTICLES",{start:{"environment.depth":.26},end:{"environment.depth":.48}}),
      option("curl-flow","CURL FLOW",{start:{"environment.depth":.4,"light.key":.68},end:{"environment.depth":.72,"light.key":1.08}}),
      option("spark-burst","SPARK BURST",{start:{"environment.depth":.2,"light.key":.58},end:{"environment.depth":.78,"light.key":1.42}}),
      option("orbital-dust","ORBITAL DUST",{start:{"environment.depth":.45},end:{"environment.depth":.74}}),
      option("data-rain","DATA RAIN",{start:{"environment.depth":.58,"light.key":.52},end:{"environment.depth":.82,"light.key":1.18}})
    ]
  }
];

export const CREATIVE_AXIS_MAP=new Map(CREATIVE_AXES.map(axis=>[axis.id,axis]));

export function defaultCreativeChoices(endpoint){
  return Object.fromEntries(CREATIVE_AXES.map(axis=>[axis.id,endpoint==="start"?axis.defaultStart:axis.defaultEnd]));
}

export function optionFor(axisId,optionId){
  return CREATIVE_AXIS_MAP.get(axisId)?.options.find(option=>option.id===optionId)||null;
}

export function choiceLabel(axisId,optionId){
  return optionFor(axisId,optionId)?.label||String(optionId||"—").toUpperCase();
}
