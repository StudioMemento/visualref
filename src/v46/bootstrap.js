/* Standalone V46 entry: the frozen V45 base is loaded from a commit-pinned CDN. */
import "https://cdn.jsdelivr.net/gh/StudioMemento/visualref@48ff1e50424da0a0546ade9039f00368073f56f2/src/app/bootstrap.js";
import {installV46Polish} from "./polish-controller.js";

const started=performance.now();
(function waitForBase(){
  const api=globalThis.__MEMENTO_V45__;
  if(api){installV46Polish(api);return;}
  if(performance.now()-started>15000){
    console.error("V46 could not find the V45 base runtime.");
    const root=document.getElementById("app");
    if(root)root.innerHTML='<main class="v46-fatal"><div><b>V46 BASE LOAD FAILED</b><p>Check the network connection and reload.</p><button onclick="location.reload()">RELOAD</button></div></main>';
    document.documentElement.classList.remove("is-booting");
    return;
  }
  requestAnimationFrame(waitForBase);
})();
