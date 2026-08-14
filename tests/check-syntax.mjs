import {readdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {join} from "node:path";

const files=[];
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())await walk(path);else if(path.endsWith(".js")||path.endsWith(".mjs"))files.push(path);}}
await walk("src");await walk("tests");
for(const file of files){const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});if(result.status!==0){console.error(result.stderr||result.stdout);process.exit(result.status||1);}}
console.log(`syntax: ${files.length} JavaScript modules passed`);
