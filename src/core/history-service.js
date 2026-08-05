import {deepClone,safeParse} from "./utils.js";

export class HistoryService{
  constructor(projectId,limit=48){
    this.projectId=projectId;this.limit=limit;this.past=[];this.future=[];
    this.key=`memento-v43-history:${projectId}`;this.restore();
  }
  restore(){
    const data=safeParse(sessionStorage.getItem(this.key),null);
    if(data&&Array.isArray(data.past)&&Array.isArray(data.future)){this.past=data.past;this.future=data.future;}
  }
  persist(){
    try{sessionStorage.setItem(this.key,JSON.stringify({past:this.past,future:this.future}));}catch{}
  }
  record(before,label){
    this.past.push({label,state:deepClone(before)});
    if(this.past.length>this.limit)this.past.shift();
    this.future=[];this.persist();
  }
  undo(current){
    const entry=this.past.pop();if(!entry)return null;
    this.future.push({label:entry.label,state:deepClone(current)});this.persist();
    return {label:entry.label,state:deepClone(entry.state)};
  }
  redo(current){
    const entry=this.future.pop();if(!entry)return null;
    this.past.push({label:entry.label,state:deepClone(current)});this.persist();
    return {label:entry.label,state:deepClone(entry.state)};
  }
  canUndo(){return this.past.length>0}
  canRedo(){return this.future.length>0}
  clear(){this.past=[];this.future=[];this.persist();}
}
