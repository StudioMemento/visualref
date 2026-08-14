const ICONS={
  viewport:'<svg viewBox="0 0 24 24"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
  render:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m9 9 6 3-6 3z"/></svg>',
  timeline:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16M8 4v4M15 10v4M11 16v4"/></svg>',
  undo:'<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5M5 12h9a6 6 0 0 1 6 6"/></svg>',
  redo:'<svg viewBox="0 0 24 24"><path d="m15 7 5 5-5 5M19 12h-9a6 6 0 0 0-6 6"/></svg>'
};
const LOGO='<svg viewBox="0 0 1600 100" aria-label="MEMENTO"><polygon points="109.14,10.45 109.14,89.55 101.23,81.64 101.23,28.91 69.58,60.55 37.94,28.91 37.94,81.64 30.03,89.55 30.03,10.45 69.58,50"/><polygon points="596.08,10.45 596.08,89.55 588.17,81.64 588.17,28.91 556.52,60.55 524.88,28.91 524.88,81.64 516.97,89.55 516.97,10.45 556.52,50"/><polygon points="1077.74,10.45 1077.74,89.55 1017.09,28.91 1017.09,81.65 1009.18,89.55 1009.18,10.45 1069.84,71.09 1069.84,18.36"/><polygon points="344.7,81.64 352.61,89.55 273.5,89.55 281.41,81.64"/><rect x="297.23" y="46.05" width="31.64" height="7.91"/><polygon points="352.61,10.45 344.7,18.36 281.41,18.36 273.5,10.45"/><polygon points="831.64,81.64 839.55,89.55 760.44,89.55 768.35,81.64"/><rect x="784.17" y="46.05" width="31.64" height="7.91"/><polygon points="839.55,10.45 831.64,18.36 768.35,18.36 760.44,10.45"/><polygon points="1247.38,10.45 1326.49,10.45 1318.57,18.36 1290.88,18.36 1290.88,89.55 1282.98,81.64 1282.98,18.36 1255.29,18.36"/><path d="M1530.42,10.45c-21.85,0-39.56,17.71-39.56,39.55 0,21.85,17.71,39.55,39.55,39.55 21.85,0,39.55-17.7,39.55-39.55 0-21.84-17.7-39.55-39.55-39.55zm0,71.2c-17.47,0-31.64-14.17-31.64-31.65 0-17.47,14.17-31.64,31.64-31.64 17.48,0,31.64,14.17,31.64,31.64 0,17.48-14.16,31.64-31.64,31.65z"/></svg>';

export class RecoveryShell{
  constructor({root,store,commands,workspace="viewport",mock=false}){
    this.root=root;this.store=store;this.commands=commands;this.workspace=workspace;this.mock=mock;this.toastTimer=null;this.build();this.bind();this.setWorkspace(workspace,{initial:true});
  }
  build(){
    this.root.innerHTML=`<div class="vr-app">
      <header class="vr-topbar">
        <div class="vr-brand">${LOGO}<div class="vr-build"><b>V47R · CORE RECOVERY</b><span>ONE LIVING CINEMATIC INSTRUMENT</span></div></div>
        <nav class="vr-nav" aria-label="Workspace">
          ${["viewport","render","timeline"].map(value=>`<button type="button" data-workspace-nav="${value}" aria-pressed="false">${ICONS[value]}<span>${value}</span></button>`).join("")}
        </nav>
        <div class="vr-top-meta"><span data-role="runtime-label">${this.mock?"LOCAL ACCEPTANCE":"NATIVE V45 CORE"}</span><i class="vr-runtime-dot" data-role="runtime-dot"></i><button class="vr-icon-button" data-shell-action="undo" title="Undo">${ICONS.undo}</button><button class="vr-icon-button" data-shell-action="redo" title="Redo">${ICONS.redo}</button></div>
      </header>
      <main class="vr-main" data-workspace="${this.workspace}">
        <section class="vr-player-column" data-role="player-root"></section>
        <button class="vr-splitter" type="button" aria-label="Resize workspace" data-role="splitter"></button>
        <section class="vr-editor-column">
          <header class="vr-editor-titlebar"><span data-role="editor-kicker">WORLD</span><b data-role="editor-title">Build the world</b><small data-role="editor-meta">V47R</small></header>
          <div class="vr-recovery-slot" data-role="recovery-slot"></div>
          <div class="vr-native-stack">
            <div class="vr-native-root" data-workspace-root="viewport"></div>
            <div class="vr-native-root" data-workspace-root="render"></div>
            <div class="vr-native-root" data-workspace-root="timeline"></div>
          </div>
        </section>
      </main>
      <div class="vr-toast" data-role="toast"></div>
    </div>`;
    this.main=this.root.querySelector(".vr-main");this.playerRoot=this.root.querySelector('[data-role="player-root"]');this.recoverySlot=this.root.querySelector('[data-role="recovery-slot"]');this.splitter=this.root.querySelector('[data-role="splitter"]');this.toastElement=this.root.querySelector('[data-role="toast"]');
  }
  bind(){
    this.root.addEventListener("click",event=>{
      const workspace=event.target.closest("[data-workspace-nav]")?.dataset.workspaceNav;if(workspace){this.commands.dispatch("recovery.setWorkspace",{workspace});return;}
      const action=event.target.closest("[data-shell-action]")?.dataset.shellAction;if(action==="undo")this.commands.dispatch("history.undo");if(action==="redo")this.commands.dispatch("history.redo");
    });
    this.splitter.addEventListener("pointerdown",event=>this.beginResize(event));
    this.resizeHandler=()=>this.applySplitter(this.store.get().ui?.workspaceSplitters?.[this.workspace],false);addEventListener("resize",this.resizeHandler);
  }
  getWorkspaceRoot(workspace){return this.root.querySelector(`[data-workspace-root="${workspace}"]`);}
  setWorkspace(workspace,{initial=false}={}){
    this.workspace=workspace;this.main.dataset.workspace=workspace;document.body.dataset.workspace=workspace;
    this.root.querySelectorAll("[data-workspace-nav]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.workspaceNav===workspace)));
    this.root.querySelectorAll("[data-workspace-root]").forEach(panel=>panel.classList.toggle("active",panel.dataset.workspaceRoot===workspace));
    const copy={viewport:["WORLD","Build the world","CALIBRATE · COMPOSE"],render:["SHOT","Generate through Delta","CURRENT · CANDIDATE"],timeline:["CURVE","Direct the sequence","TIME · RHYTHM"]}[workspace];
    this.root.querySelector('[data-role="editor-kicker"]').textContent=copy[0];this.root.querySelector('[data-role="editor-title"]').textContent=copy[1];this.root.querySelector('[data-role="editor-meta"]').textContent=copy[2];
    this.applySplitter(this.store.get().ui?.workspaceSplitters?.[workspace],false);
    if(!initial)this.root.querySelector(`[data-workspace-nav="${workspace}"]`)?.focus({preventScroll:true});
  }
  setRuntime(status={}){
    const dot=this.root.querySelector('[data-role="runtime-dot"]'),label=this.root.querySelector('[data-role="runtime-label"]');dot.className=`vr-runtime-dot ${status.mode||"ready"}`;label.textContent=status.label||"ONE RUNTIME";
  }
  beginResize(event){
    if(matchMedia("(max-width:900px)").matches)return;event.preventDefault();this.splitter.setPointerCapture(event.pointerId);this.splitter.classList.add("dragging");
    const move=e=>{const rect=this.main.getBoundingClientRect(),ratio=(e.clientX-rect.left)/Math.max(1,rect.width);this.applySplitter(ratio,false);};
    const end=e=>{this.splitter.classList.remove("dragging");this.splitter.releasePointerCapture?.(e.pointerId);this.splitter.removeEventListener("pointermove",move);this.splitter.removeEventListener("pointerup",end);this.splitter.removeEventListener("pointercancel",end);const rect=this.main.getBoundingClientRect(),left=this.playerRoot.getBoundingClientRect().width,ratio=left/Math.max(1,rect.width);this.store.setSplitter?.(ratio,this.workspace);};
    this.splitter.addEventListener("pointermove",move);this.splitter.addEventListener("pointerup",end);this.splitter.addEventListener("pointercancel",end);
  }
  applySplitter(value,persist=false){
    if(matchMedia("(max-width:900px)").matches){this.main.style.gridTemplateColumns="";return;}
    const rect=this.main.getBoundingClientRect(),total=Math.max(1,rect.width-6),fallback=this.workspace==="timeline"?.34:.67,ratio=Math.max(.24,Math.min(.78,Number(value)||fallback));
    let left;
    if(this.workspace==="timeline")left=Math.max(330,Math.min(Math.min(900,total-500),total*ratio));
    else{const desiredRight=Math.max(360,Math.min(720,total*(1-ratio)));left=Math.max(460,total-desiredRight);}
    this.main.style.gridTemplateColumns=`${Math.round(left)}px 6px minmax(0,1fr)`;if(persist)this.store.setSplitter?.(left/total,this.workspace);
  }
  toast(message){clearTimeout(this.toastTimer);this.toastElement.textContent=String(message||"");this.toastElement.classList.add("on");this.toastTimer=setTimeout(()=>this.toastElement.classList.remove("on"),1500);}
  fatal(error){this.root.innerHTML=`<div class="vr-fatal"><div><b>V47R BOOT ERROR</b><p>${escapeHtml(error?.message||error)}</p><button onclick="location.reload()">RELOAD</button></div></div>`;}
  dispose(){removeEventListener("resize",this.resizeHandler);clearTimeout(this.toastTimer);}
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
