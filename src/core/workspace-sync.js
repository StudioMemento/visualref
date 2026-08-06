import {uid,safeParse} from "./utils.js";

export class WorkspaceSync{
  constructor(){
    this.id=uid("tab");this.listener=null;this.lastRemote=0;
    this.channel="BroadcastChannel" in globalThis?new BroadcastChannel("memento-visualref-v44"):null;
    if(this.channel)this.channel.onmessage=event=>this.receive(event.data);
    addEventListener("storage",event=>{if(event.key==="memento-v44-sync"&&event.newValue)this.receive(safeParse(event.newValue,null));});
  }
  onState(listener){this.listener=listener;}
  broadcast(state){
    const message={type:"state",source:this.id,sentAt:Date.now(),state};
    this.channel?.postMessage(message);
    try{localStorage.setItem("memento-v44-sync",JSON.stringify(message));}catch{}
  }
  receive(message){
    if(!message||message.type!=="state"||message.source===this.id||!message.state)return;
    if(message.sentAt<=this.lastRemote)return;this.lastRemote=message.sentAt;
    this.listener?.(message.state);
  }
  close(){this.channel?.close();}
}
