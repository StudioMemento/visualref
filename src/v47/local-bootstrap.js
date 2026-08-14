/* Local-repository V47A entry used by scripts/install-v47a.mjs. */
import "../app/bootstrap.js";
import {installV46Polish} from "../v46/polish-controller.js";
import {installV47Foundation} from "./foundation-controller.js";

const started=performance.now();
(function waitForBase(){
  const base=globalThis.__MEMENTO_V45__;
  if(base){const v46=installV46Polish(base)||globalThis.__MEMENTO_V46__||base;installV47Foundation(v46);return;}
  if(performance.now()-started>15000){console.error("V47A could not find the local V45 base runtime.");document.documentElement.classList.remove("is-booting");return;}
  requestAnimationFrame(waitForBase);
})();
