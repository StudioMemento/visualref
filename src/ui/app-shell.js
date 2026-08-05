const LOGO=`<svg viewBox="0 0 1600 100" role="img" aria-label="MEMENTO"><polygon points="109.14,10.45 109.14,89.55 101.23,81.64 101.23,28.91 69.58,60.55 37.94,28.91 37.94,81.64 30.03,89.55 30.03,10.45 69.58,50"/><polygon points="596.08,10.45 596.08,89.55 588.17,81.64 588.17,28.91 556.52,60.55 524.88,28.91 524.88,81.64 516.97,89.55 516.97,10.45 556.52,50"/><polygon points="1077.74,10.45 1077.74,89.55 1017.09,28.91 1017.09,81.65 1009.18,89.55 1009.18,10.45 1069.84,71.09 1069.84,18.36"/><polygon points="344.7,81.64 352.61,89.55 273.5,89.55 281.41,81.64"/><rect x="297.23" y="46.05" width="31.64" height="7.91"/><polygon points="352.61,10.45 344.7,18.36 281.41,18.36 273.5,10.45"/><polygon points="831.64,81.64 839.55,89.55 760.44,89.55 768.35,81.64"/><rect x="784.17" y="46.05" width="31.64" height="7.91"/><polygon points="839.55,10.45 831.64,18.36 768.35,18.36 760.44,10.45"/><polygon points="1247.38,10.45 1326.49,10.45 1318.57,18.36 1290.88,18.36 1290.88,89.55 1282.98,81.64 1282.98,18.36 1255.29,18.36"/><path d="M1530.42,10.45c-21.85,0-39.56,17.71-39.56,39.55 0,21.85,17.71,39.55,39.55,39.55 21.85,0,39.55-17.7,39.55-39.55 0-21.84-17.7-39.55-39.55-39.55zm0,71.2c-17.47,0-31.64-14.17-31.64-31.65 0-17.47,14.17-31.64,31.64-31.64 17.48,0,31.64,14.17,31.64,31.64 0,17.48-14.16,31.64-31.64,31.65z"/></svg>`;

export class AppShell{
  constructor({root,workspace,store,commands,history}){this.root=root;this.workspace=workspace;this.store=store;this.commands=commands;this.history=history;this.toastHost=null;this.build();this.bind();this.unsubscribe=store.subscribe(state=>this.render(state));}
  build(){
    const modes=[['render','◫','RENDER'],['viewport','◇','VIEWPORT'],['timeline','⌁','TIMELINE']];
    const modeLinks=modes.map(([id,icon,label])=>`<a class="mode-link ${id===this.workspace?'active':''}" href="./${id}.html" data-nav-workspace="${id}"><i>${icon}</i>${label}</a>`).join('');
    const mobileLinks=modes.map(([id,icon,label])=>`<a class="${id===this.workspace?'active':''}" href="./${id}.html" data-nav-workspace="${id}"><i>${icon}</i>${label}</a>`).join('');
    this.root.innerHTML=`<div class="app-shell">
      <header class="app-header"><div class="brand-zone">${LOGO}</div><nav class="mode-zone">${modeLinks}</nav><div class="action-zone">
        <button class="header-button" data-shell-action="undo" title="Undo">↶</button><button class="header-button" data-shell-action="redo" title="Redo">↷</button>
        <button class="project-button" data-shell-action="project"><span data-role="project-name">MEMENTO V43B</span></button>
        <label class="advanced-switch"><input type="checkbox" data-role="advanced"><i></i><span>ADVANCED</span></label>
        <button class="header-button" data-shell-action="focus" title="Fullscreen">⛶</button>
      </div></header>
      <main class="workspace-shell"><section class="player-column" id="playerRoot"></section><button class="workspace-splitter" id="workspaceSplitter" aria-label="Resize workspace"></button><aside class="workspace-panel" id="workspacePanel"></aside></main>
      <nav class="mobile-nav">${mobileLinks}</nav><div class="toast-host" id="toastHost"></div><div id="projectDialogHost"></div>
    </div>`;
    this.playerRoot=this.root.querySelector('#playerRoot');this.panelRoot=this.root.querySelector('#workspacePanel');this.toastHost=this.root.querySelector('#toastHost');this.dialogHost=this.root.querySelector('#projectDialogHost');
  }
  bind(){
    this.root.addEventListener('click',event=>{
      const action=event.target.closest('[data-shell-action]')?.dataset.shellAction;
      if(action==='undo')this.commands.dispatch('history.undo');
      if(action==='redo')this.commands.dispatch('history.redo');
      if(action==='project')this.commands.dispatch('ui.openProject',{open:true});
      if(action==='focus')this.toggleFullscreen();
      const close=event.target.closest('[data-project-close]');if(close)this.commands.dispatch('ui.openProject',{open:false});
      const reset=event.target.closest('[data-project-reset]');if(reset)this.commands.dispatch('project.reset');
    });
    this.root.querySelector('[data-role="advanced"]').addEventListener('change',event=>this.commands.dispatch('ui.toggleAdvanced',{value:event.target.checked}));
    this.root.querySelectorAll('[data-nav-workspace]').forEach(link=>link.addEventListener('click',()=>{
      const next=link.dataset.navWorkspace;this.store.transient('Workspace route',state=>state.ui.activeWorkspace=next,{persist:true,broadcast:true});
    }));
    const splitter=this.root.querySelector('#workspaceSplitter');
    splitter.addEventListener('pointerdown',event=>{const startX=event.clientX,start=this.store.get().ui.splitter;splitter.setPointerCapture(event.pointerId);splitter.classList.add('dragging');const move=e=>this.store.setSplitter(start+(e.clientX-startX)/innerWidth);const up=()=>{splitter.classList.remove('dragging');splitter.removeEventListener('pointermove',move);splitter.removeEventListener('pointerup',up);};splitter.addEventListener('pointermove',move);splitter.addEventListener('pointerup',up);});
  }
  render(state){
    document.documentElement.style.setProperty('--player-share',`${Math.round(state.ui.splitter*100)}%`);
    const name=this.root.querySelector('[data-role="project-name"]');if(name)name.textContent=state.meta.name;
    const advanced=this.root.querySelector('[data-role="advanced"]');if(advanced)advanced.checked=Boolean(state.ui.advanced);
    const undo=this.root.querySelector('[data-shell-action="undo"]'),redo=this.root.querySelector('[data-shell-action="redo"]');if(undo)undo.disabled=!this.history.canUndo();if(redo)redo.disabled=!this.history.canRedo();
    this.renderDialog(state);
  }
  renderDialog(state){
    if(!state.ui.projectDialogOpen){this.dialogHost.innerHTML='';return;}
    this.dialogHost.innerHTML=`<div class="project-dialog" data-project-close><section class="project-card" onclick="event.stopPropagation()"><header><div><small>PROJECT STATE</small><b>V43B REAL SCENE</b></div><button data-project-close>×</button></header><div class="project-body"><label class="project-field"><span>PROJECT NAME</span><input data-project-name value="${escapeHtml(state.meta.name)}"></label><div class="project-meta"><span>AUTOSAVE</span><b>PROJECT + BINARY ASSETS</b><span>SCHEMA</span><b>${state.schema.name} · ${state.schema.version}</b><span>WORKSPACE</span><b>${state.ui.activeWorkspace.toUpperCase()}</b></div><div class="project-actions"><button data-project-save-name>SAVE NAME</button><button class="danger" data-project-reset>RESET PROJECT</button></div></div></section></div>`;
    const input=this.dialogHost.querySelector('[data-project-name]');this.dialogHost.querySelector('[data-project-save-name]').addEventListener('click',()=>{this.commands.dispatch('project.rename',{name:input.value});this.toast('PROJECT NAME SAVED');});
  }
  toast(message){
    const node=document.createElement('div');node.className='toast';node.textContent=message;this.toastHost.appendChild(node);setTimeout(()=>node.remove(),2400);
  }
  async toggleFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{this.toast('FULLSCREEN UNAVAILABLE');}}
  dispose(){this.unsubscribe?.();}
}
function escapeHtml(value){return String(value).replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));}
