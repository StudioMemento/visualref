import {assertProject} from './invariants.js';

const clone=value=>structuredClone(value);

export class V45ProjectStore{
  constructor(initial){this.state=clone(initial);assertProject(this.state);this.listeners=new Set();this.undoStack=[];this.redoStack=[];}
  get(){return this.state;}
  subscribe(listener){this.listeners.add(listener);listener(this.state,{type:'init'});return()=>this.listeners.delete(listener);}
  notify(meta){for(const listener of this.listeners)listener(this.state,meta);}
  commit(label,producer){
    const before=clone(this.state),next=clone(this.state);producer(next);next.meta.updatedAt=new Date().toISOString();assertProject(next);
    if(JSON.stringify(before)===JSON.stringify(next))return false;
    this.undoStack.push({state:before,label});this.redoStack.length=0;this.state=next;this.notify({type:'commit',label});return true;
  }
  undo(){const entry=this.undoStack.pop();if(!entry)return false;this.redoStack.push({state:clone(this.state),label:entry.label});this.state=entry.state;this.notify({type:'undo',label:entry.label});return true;}
  redo(){const entry=this.redoStack.pop();if(!entry)return false;this.undoStack.push({state:clone(this.state),label:entry.label});this.state=entry.state;this.notify({type:'redo',label:entry.label});return true;}
}
