/* Local-repository V46 entry used by scripts/install-v46.mjs. */
import "../app/bootstrap.js";
import {installV46Polish} from "./polish-controller.js";

const started=performance.now();
(function waitForBase(){
  const api=globalThis.__MEMENTO_V45__;
  if(api){installV46Polish(api);return;}
  if(performance.now()-started>15000){
    console.error("V46 could not find the local V45 base runtime.");
    document.documentElement.classList.remove("is-booting");
    return;
  }
  requestAnimationFrame(waitForBase);
})();
