import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");
const [bootstrap,local,controller,css,viewportPage,renderPage,timelinePage]=await Promise.all([
  read("src/v46/bootstrap.js"),read("src/v46/local-bootstrap.js"),read("src/v46/polish-controller.js"),read("css/v46.css"),read("viewport.html"),read("render.html"),read("timeline.html")
]);
const checks=[];
const check=(name,value)=>checks.push({name,pass:Boolean(value)});
const count=(text,needle)=>text.split(needle).length-1;

check("standalone creates one PlayerController",count(bootstrap,"new PlayerController(")===1);
check("local creates one PlayerController",count(local,"new PlayerController(")===1);
check("standalone does not import legacy app bootstrap",!bootstrap.includes("src/app/bootstrap.js"));
check("local does not import legacy app bootstrap",!local.includes('import "../app/bootstrap.js"'));
check("workspace navigation is in-place",bootstrap.includes("function switchWorkspace")&&bootstrap.includes("history.pushState")&&bootstrap.includes("workspaceController?.dispose?.()"));
check("renderer survives workspace switches",bootstrap.includes("if(player.renderer)player.renderer.workspace=next")&&!bootstrap.includes("player?.dispose?.();\n  try{workspaceController"));
check("viewport-capable renderer is created once",bootstrap.includes('workspace:"viewport"')&&bootstrap.includes("await player.renderer.ready"));
check("every route loads the Render editor CSS superset",[viewportPage,renderPage,timelinePage].every(page=>page.includes("css/v44-render-editor.css")));
check("local bootstrap mirrors in-place switch",local.includes("function switchWorkspace")&&local.includes("history.pushState"));
check("viewport full dock exists",["SELECT","MOVE","ROTATE","SCALE","PIVOT","LOCAL","SNAP","FRAME","GROUND","RESET","GUIDE"].every(label=>controller.includes(`>${label}<`)||controller.includes(`${label}</span>`)));
check("viewport outliner + searchable properties",controller.includes("v46a-outliner")&&controller.includes("data-v46a-property-search"));
check("render monitor has three modes",["live","endpoints","viewport"].every(mode=>controller.includes(`data-v46a-render-monitor=\"${mode}\"`)));
check("numeric delta replaces qualitative control",controller.includes("data-v46-delta-number")&&controller.includes('select.value="balanced"'));
check("camera owns creative framing",controller.includes("applyCreativeCameraFraming")&&controller.includes("stabilizeFrameValues")&&controller.includes("COMPOSITION_CAMERA")&&controller.includes("SIZE_CAMERA")&&controller.includes("VIEW_CAMERA"));
check("subject translation/scale is stabilized",controller.includes('values["subject.positionX"]=0')&&controller.includes('values["subject.scale"]=1'));
check("subject rotation has one owner",controller.includes("ROTATION_BY_CHOICE")&&controller.includes("enforceAllShotRotations"));
check("auto ground and zero pivot are present",controller.includes("autoGroundAndZeroPivot")&&controller.includes('resolvePivotValue?.("hero-proxy",[0,0,0]')&&controller.includes("getGroundedTransform"));
check("zero XYZ helper is present",controller.includes("V46A_ZERO_PIVOT_XYZ")&&controller.includes("AxesHelper"));
check("render Start Both End zones stay visible",css.includes('content:attr(data-endpoint-label)')&&controller.includes('dataset.endpointLabel="START"')&&controller.includes('dataset.endpointLabel="BOTH"')&&controller.includes('dataset.endpointLabel="END"'));
check("render sticky Start Both End scope",css.includes(".v46a-scope-sticky")&&css.includes("position:sticky"));
check("viewport two-panel layout is forced",css.includes("grid-template-columns:minmax(230px,34%) minmax(0,1fr)")&&css.includes(".v46a-property-search"));

const failed=checks.filter(item=>!item.pass);
for(const item of checks)console.log(`${item.pass?"PASS":"FAIL"} · ${item.name}`);
if(failed.length){console.error(`\n${failed.length} V46A static check(s) failed.`);process.exit(1);}
console.log(`\nV46A static check: ${checks.length}/${checks.length} PASS`);
