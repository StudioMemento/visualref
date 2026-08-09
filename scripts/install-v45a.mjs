import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();const pkgPath=path.join(root,'package.json'),bootPath=path.join(root,'src/app/bootstrap.js');
if(!fs.existsSync(pkgPath)||!fs.existsSync(bootPath))throw new Error('Run from the VisualRef repository root.');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8')),boot=fs.readFileSync(bootPath,'utf8');
if(pkg.name!=='memento-visualref-v44'||pkg.version!=='44.0.2')throw new Error(`Refusing donor ${pkg.name}@${pkg.version}; expected memento-visualref-v44@44.0.2.`);
if(!boot.includes('globalThis.__MEMENTO_V44__')||!boot.includes('version:"44"'))throw new Error('Refusing unexpected bootstrap signature.');
if(!boot.includes('attachV45AWhenReady')){
  const patched=`import {attachV45AWhenReady} from "../v45/runtime/dev-bootstrap.js";\n${boot}\nattachV45AWhenReady();\n`;
  fs.writeFileSync(bootPath,patched);
}
pkg.scripts ||= {};pkg.scripts['check:v45']='node tests/v45-core-smoke.mjs && node tests/v45-migration-smoke.mjs';pkg.scripts.check='node tests/structure-check.mjs && node tests/core-smoke.mjs && npm run check:v45';
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
console.log('V45A overlay installed. Production remains V44 unless ?v45a=1 or localStorage memento-v45a-dev=1.');
