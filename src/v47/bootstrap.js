/* Standalone V47A entry: frozen V45 base + local V46 compatibility + V47 foundation. */
import "https://cdn.jsdelivr.net/gh/StudioMemento/visualref@48ff1e50424da0a0546ade9039f00368073f56f2/src/app/bootstrap.js";
import {installV46Polish} from "../v46/polish-controller.js";
import {installV47Foundation} from "./foundation-controller.js";

const started=performance.now();
(function waitForBase(){
  const base=globalThis.__MEMENTO_V45__;
  if(base){const v46=installV46Polish(base)||globalThis.__MEMENTO_V46__||base;installV47Foundation(v46);return;}
  if(performance.now()-started>15000){
    console.error("V47A could not find the V45 base runtime.");
    const root=document.getElementById("app");
    if(root)root.innerHTML='<main class="v46-fatal"><div><b>V47A BASE LOAD FAILED</b><p>Check the network connection and reload.</p><button onclick="location.reload()">RELOAD</button></div></main>';
    document.documentElement.classList.remove("is-booting");
    return;
  }
  requestAnimationFrame(waitForBase);
})();
