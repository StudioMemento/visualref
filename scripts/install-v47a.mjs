#!/usr/bin/env node
import {copyFile,mkdir,readFile,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const targetRoot=resolve(process.argv[2]||process.cwd());
const required=["src/app/bootstrap.js","src/core/commands.js","src/engine/renderer-service.js","src/workspaces/render-workspace.js","viewport.html","render.html","timeline.html","package.json"];
for(const relative of required){if(!existsSync(join(targetRoot,relative))){console.error(`V47A installer stopped: ${targetRoot} is not the expected VisualRef repository. Missing ${relative}.`);process.exit(1);}}
const packagePath=join(targetRoot,"package.json"),packageJson=JSON.parse(await readFile(packagePath,"utf8"));
if(!/visualref/i.test(packageJson.name||"")&&!/VisualRef/i.test(packageJson.description||"")){console.error("V47A installer stopped: package.json does not identify a VisualRef project.");process.exit(1);}

const backupRoot=join(targetRoot,"_backup_before_v47a");await mkdir(backupRoot,{recursive:true});
for(const relative of ["index.html","viewport.html","render.html","timeline.html","package.json"]){const src=join(targetRoot,relative),dst=join(backupRoot,relative);await mkdir(dirname(dst),{recursive:true});if(!existsSync(dst))await copyFile(src,dst);}
for(const dir of ["css","src/v46","src/v47","docs"] )await mkdir(join(targetRoot,dir),{recursive:true});
for(const relative of ["css/v46.css","css/v47.css","src/v46/polish-controller.js","src/v47/delta-engine.js","src/v47/foundation-controller.js","src/v47/local-bootstrap.js"]){await copyFile(join(sourceRoot,relative),join(targetRoot,relative));}
for(const [source,target] of [["docs/V47A_IMPLEMENTATION.md","docs/V47A_IMPLEMENTATION.md"],["docs/V47A_VALIDATION_REPORT.md","docs/V47A_VALIDATION_REPORT.md"],["V47_GOALS.md","docs/V47_GOALS.md"]])await copyFile(join(sourceRoot,source),join(targetRoot,target));

for(const page of ["viewport.html","render.html","timeline.html"]){
  const path=join(targetRoot,page);let html=await readFile(path,"utf8");
  html=html.replace(/V4[56](?:A)?/g,"V47A");
  html=html.replace(/<html([^>]*)class="([^"]*)"/i,(match,before,classes)=>`<html${before}class="${[...new Set(`${classes} v46-preboot v47-preboot`.trim().split(/\s+/))].join(" ")}"`);
  if(!/v47-preboot/i.test(html))html=html.replace(/<html([^>]*)>/i,'<html$1 class="v46-preboot v47-preboot">');
  if(!html.includes("./css/v46.css"))html=html.replace("</head>",'  <link rel="stylesheet" href="./css/v46.css">\n</head>');
  if(!html.includes("./css/v47.css"))html=html.replace("</head>",'  <link rel="stylesheet" href="./css/v47.css">\n</head>');
  html=html.replace(/src="\.\/src\/(?:app\/bootstrap|v46\/local-bootstrap|v47\/bootstrap)\.js"/,'src="./src/v47/local-bootstrap.js"');
  html=html.replace(/data-memento-build="[^"]+"/g,'data-memento-build="v47a"');
  await writeFile(path,html,"utf8");
}
await writeFile(join(targetRoot,"index.html"),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./viewport.html"><title>MEMENTO VisualRef · V47A</title><script>location.replace("./viewport.html" + location.search + location.hash);</script></head><body style="margin:0;background:#060607;color:#f4f4f5;font-family:Inter,system-ui;display:grid;min-height:100vh;place-items:center">Opening Viewport…</body></html>
`,"utf8");
packageJson.name="memento-visualref-v47a";packageJson.version="47.1.0";packageJson.description="MEMENTO VisualRef V47A — candidate Delta generation, procedural limbo recipes and image-first workspace hierarchy.";
packageJson.scripts={...(packageJson.scripts||{}),"check:v47a":"node --check src/v46/polish-controller.js && node --check src/v47/local-bootstrap.js && node --check src/v47/delta-engine.js && node --check src/v47/foundation-controller.js"};
await writeFile(packagePath,JSON.stringify(packageJson,null,2)+"\n","utf8");
console.log("V47A Delta + Limbo foundation installed successfully.");console.log(`Target: ${targetRoot}`);console.log("Entry page: viewport.html");console.log("Backup: _backup_before_v47a/");console.log("Run: npm run check && npm run check:v47a");
