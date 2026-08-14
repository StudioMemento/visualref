#!/usr/bin/env node
import {cp,copyFile,mkdir,readFile,stat,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const targetRoot=resolve(process.argv[2]||process.cwd());
const required=["src/app/bootstrap.js","src/workspaces/render-workspace.js","viewport.html","render.html","timeline.html","package.json"];

for(const relative of required){
  if(!existsSync(join(targetRoot,relative))){
    console.error(`V46 installer stopped: ${targetRoot} is not the expected V45 repository. Missing ${relative}.`);
    process.exit(1);
  }
}

const packagePath=join(targetRoot,"package.json");
const packageJson=JSON.parse(await readFile(packagePath,"utf8"));
if(!/visualref/i.test(packageJson.name||"")&&!/VisualRef/i.test(packageJson.description||"")){
  console.error("V46 installer stopped: package.json does not identify a VisualRef project.");
  process.exit(1);
}

const backupRoot=join(targetRoot,"_v45_backup_before_v46");
await mkdir(backupRoot,{recursive:true});
for(const relative of ["index.html","viewport.html","render.html","timeline.html","package.json"]){
  const src=join(targetRoot,relative),dst=join(backupRoot,relative);
  await mkdir(dirname(dst),{recursive:true});
  if(!existsSync(dst))await copyFile(src,dst);
}

await mkdir(join(targetRoot,"css"),{recursive:true});
await mkdir(join(targetRoot,"src/v46"),{recursive:true});
await mkdir(join(targetRoot,"docs"),{recursive:true});
await copyFile(join(sourceRoot,"css/v46.css"),join(targetRoot,"css/v46.css"));
await copyFile(join(sourceRoot,"src/v46/polish-controller.js"),join(targetRoot,"src/v46/polish-controller.js"));
await copyFile(join(sourceRoot,"src/v46/local-bootstrap.js"),join(targetRoot,"src/v46/local-bootstrap.js"));
await copyFile(join(sourceRoot,"docs/V46_POLISH_IMPLEMENTATION.md"),join(targetRoot,"docs/V46_POLISH_IMPLEMENTATION.md"));
await copyFile(join(sourceRoot,"V47_GOALS.md"),join(targetRoot,"docs/V47_GOALS.md"));

for(const page of ["viewport.html","render.html","timeline.html"]){
  const path=join(targetRoot,page);
  let html=await readFile(path,"utf8");
  html=html.replace(/V45/g,"V46").replace(/v45 · product vis/gi,"V46 · POLISH PASS");
  html=html.replace(/<html([^>]*)class="([^"]*)"/i,(match,before,classes)=>`<html${before}class="${classes.includes("v46-preboot")?classes:`${classes} v46-preboot`.trim()}"`);
  if(!/v46-preboot/i.test(html))html=html.replace(/<html([^>]*)>/i,'<html$1 class="v46-preboot">');
  if(!html.includes("./css/v46.css"))html=html.replace("</head>",'  <link rel="stylesheet" href="./css/v46.css">\n</head>');
  html=html.replace('src="./src/app/bootstrap.js"','src="./src/v46/local-bootstrap.js"');
  html=html.replace(/data-memento-build="v45"/g,'data-memento-build="v46"');
  await writeFile(path,html,"utf8");
}

await writeFile(join(targetRoot,"index.html"),`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="0;url=./viewport.html">
  <title>MEMENTO VisualRef · V46</title>
  <script>location.replace("./viewport.html" + location.search + location.hash);</script>
</head>
<body style="margin:0;background:#060607;color:#f4f4f5;font-family:Inter,system-ui;display:grid;min-height:100vh;place-items:center">Opening Viewport…</body>
</html>
`,"utf8");

packageJson.name="memento-visualref-v46";
packageJson.version="46.0.0";
packageJson.description="MEMENTO VisualRef V46 — viewport-first guided world building, render control polish and usable timeline creation.";
packageJson.scripts={...(packageJson.scripts||{}),"check:v46":"node --check src/v46/local-bootstrap.js && node --check src/v46/polish-controller.js"};
await writeFile(packagePath,JSON.stringify(packageJson,null,2)+"\n","utf8");

console.log("V46 polish pass installed successfully.");
console.log(`Target: ${targetRoot}`);
console.log("Entry page: viewport.html");
console.log("Backup: _v45_backup_before_v46/");
console.log("Run: npm run check && npm run check:v46");
