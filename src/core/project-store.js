import {deepClone,jsonEqual,clamp} from "./utils.js";

export class ProjectStore{
  constructor({state,history,persistence,sync}){
    this.state=state;this.history=history;this.persistence=persistence;this.sync=sync;this.listeners=new Set();this.gesture=null;
    this.sync?.onState(remote=>this.replaceRemote(remote));
  }
  get(){return this.state;}
  subscribe(listener){this.listeners.add(listener);listener(this.state,{type:"init"});return()=>this.listeners.delete(listener);}
  notify(meta){for(const listener of this.listeners)listener(this.state,meta);}
  touch(){this.state.meta.updatedAt=new Date().toISOString();}
  commit(label,producer,{persist=true,broadcast=true}={}){
    const before=deepClone(this.state);producer(this.state);this.touch();
    if(jsonEqual(before,this.state))return false;
    this.history?.record(before,label);this.notify({type:"commit",label});
    if(persist)this.persistence?.save(this.state);if(broadcast)this.sync?.broadcast(this.state);return true;
  }
  transient(label,producer,{persist=false,broadcast=false}={}){
    producer(this.state);if(persist||broadcast)this.touch();this.notify({type:"transient",label});
    if(persist)this.persistence?.save(this.state);if(broadcast)this.sync?.broadcast(this.state);
  }
  beginGesture(label){if(this.gesture)return;this.gesture={label,before:deepClone(this.state)};}
  updateGesture(label,producer){if(!this.gesture)this.beginGesture(label);producer(this.state);this.touch();this.notify({type:"gesture",label});}
  endGesture(){
    if(!this.gesture)return false;const gesture=this.gesture;this.gesture=null;
    if(jsonEqual(gesture.before,this.state))return false;
    this.history?.record(gesture.before,gesture.label);this.persistence?.save(this.state);this.sync?.broadcast(this.state);this.notify({type:"gesture-end",label:gesture.label});return true;
  }
  cancelGesture(){if(!this.gesture)return;this.state=this.gesture.before;this.gesture=null;this.notify({type:"gesture-cancel"});}
  undo(){const result=this.history?.undo(this.state);if(!result)return false;this.state=result.state;this.touch();this.persistence?.save(this.state);this.sync?.broadcast(this.state);this.notify({type:"undo",label:result.label});return true;}
  redo(){const result=this.history?.redo(this.state);if(!result)return false;this.state=result.state;this.touch();this.persistence?.save(this.state);this.sync?.broadcast(this.state);this.notify({type:"redo",label:result.label});return true;}
  replace(label,state,{history=false,persist=true,broadcast=true}={}){
    const before=deepClone(this.state);this.state=deepClone(state);this.touch();if(history)this.history?.record(before,label);this.notify({type:"replace",label});if(persist)this.persistence?.save(this.state);if(broadcast)this.sync?.broadcast(this.state);
  }
  replaceRemote(state){
    const remoteTime=Date.parse(state?.meta?.updatedAt||0),localTime=Date.parse(this.state?.meta?.updatedAt||0);
    if(remoteTime<localTime)return;this.state=deepClone(state);this.notify({type:"remote"});this.persistence?.save(this.state);
  }
  setSplitter(value,workspace=null){this.transient("Resize workspace",state=>{const safe=clamp(value,.28,.76);state.ui.splitter=safe;if(workspace){state.ui.workspaceSplitters??={};state.ui.workspaceSplitters[workspace]=safe;}},{persist:true,broadcast:false});}
}
