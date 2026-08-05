import {debounce,safeParse} from "./utils.js";
import {normalizeState} from "./default-state.js";

const DB_NAME="memento-visualref-v43";
const DB_VERSION=1;
const PROJECT_STORE="projects";
const SNAPSHOT_KEY="memento-v43-project-snapshot";

export class PersistenceService{
  constructor(){this.dbPromise=null;this.saveDebounced=debounce(state=>this.saveNow(state),160);}
  open(){
    if(!("indexedDB" in globalThis))return Promise.resolve(null);
    if(this.dbPromise)return this.dbPromise;
    this.dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(PROJECT_STORE))db.createObjectStore(PROJECT_STORE,{keyPath:"id"});};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    }).catch(()=>null);
    return this.dbPromise;
  }
  async load(){
    const local=normalizeState(safeParse(localStorage.getItem(SNAPSHOT_KEY),null));
    const rawLocal=safeParse(localStorage.getItem(SNAPSHOT_KEY),null);
    const db=await this.open();
    if(!db)return rawLocal?local:null;
    const fromDb=await new Promise(resolve=>{
      try{const tx=db.transaction(PROJECT_STORE,"readonly"),store=tx.objectStore(PROJECT_STORE),request=store.get("active");request.onsuccess=()=>resolve(request.result?.state??null);request.onerror=()=>resolve(null);}catch{resolve(null)}
    });
    if(!fromDb)return rawLocal?local:null;
    const normalized=normalizeState(fromDb);
    if(!rawLocal)return normalized;
    const localTime=Date.parse(local.meta?.updatedAt||0),dbTime=Date.parse(normalized.meta?.updatedAt||0);
    return dbTime>localTime?normalized:local;
  }
  save(state){this.saveDebounced(state);}
  async saveNow(state){
    try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(state));}catch{}
    const db=await this.open();if(!db)return;
    try{const tx=db.transaction(PROJECT_STORE,"readwrite");tx.objectStore(PROJECT_STORE).put({id:"active",state,updatedAt:state.meta.updatedAt});}catch{}
  }
  async clear(){
    try{localStorage.removeItem(SNAPSHOT_KEY);}catch{}
    const db=await this.open();if(!db)return;
    try{const tx=db.transaction(PROJECT_STORE,"readwrite");tx.objectStore(PROJECT_STORE).delete("active");}catch{}
  }
}
