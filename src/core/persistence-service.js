import {debounce,safeParse} from "./utils.js";
import {normalizeState} from "./default-state.js";

const DB_NAME="memento-visualref-v43";
const DB_VERSION=2;
const PROJECT_STORE="projects";
const ASSET_STORE="assets";
const SNAPSHOT_KEY="memento-v43-project-snapshot";

export class PersistenceService{
  constructor(){this.dbPromise=null;this.saveDebounced=debounce(state=>this.saveNow(state),160);}
  open(){
    if(!("indexedDB" in globalThis))return Promise.resolve(null);
    if(this.dbPromise)return this.dbPromise;
    this.dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(PROJECT_STORE))db.createObjectStore(PROJECT_STORE,{keyPath:"id"});
        if(!db.objectStoreNames.contains(ASSET_STORE))db.createObjectStore(ASSET_STORE,{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    }).catch(error=>{console.warn("IndexedDB unavailable",error);return null;});
    return this.dbPromise;
  }
  async load(){
    const rawLocal=safeParse(localStorage.getItem(SNAPSHOT_KEY),null);
    const local=normalizeState(rawLocal);
    const db=await this.open();
    if(!db)return rawLocal?local:null;
    const fromDb=await this.getFromStore(PROJECT_STORE,"active");
    if(!fromDb?.state)return rawLocal?local:null;
    const normalized=normalizeState(fromDb.state);
    if(!rawLocal)return normalized;
    const localTime=Date.parse(local.meta?.updatedAt||0),dbTime=Date.parse(normalized.meta?.updatedAt||0);
    return dbTime>localTime?normalized:local;
  }
  save(state){this.saveDebounced(state);}
  async saveNow(state){
    try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(state));}catch(error){console.warn("Snapshot save failed",error);}
    const db=await this.open();if(!db)return;
    await this.putToStore(PROJECT_STORE,{id:"active",state,updatedAt:state.meta.updatedAt});
  }
  async putAsset({id,blob,name,type,kind,meta={}}){
    if(!id||!(blob instanceof Blob))throw new TypeError("Asset id and Blob are required");
    const record={id,blob,name:name||id,type:type||blob.type||"application/octet-stream",kind:kind||"asset",size:blob.size,updatedAt:new Date().toISOString(),meta};
    const db=await this.open();if(!db)throw new Error("IndexedDB is required for binary asset persistence");
    await this.putToStore(ASSET_STORE,record);return record;
  }
  async getAsset(id){if(!id)return null;return this.getFromStore(ASSET_STORE,id);}
  async deleteAsset(id){
    const db=await this.open();if(!db||!id)return false;
    return new Promise(resolve=>{try{const tx=db.transaction(ASSET_STORE,"readwrite"),request=tx.objectStore(ASSET_STORE).delete(id);request.onsuccess=()=>resolve(true);request.onerror=()=>resolve(false);}catch{resolve(false)}});
  }
  async listAssets(){
    const db=await this.open();if(!db)return [];
    return new Promise(resolve=>{try{const tx=db.transaction(ASSET_STORE,"readonly"),request=tx.objectStore(ASSET_STORE).getAll();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>resolve([]);}catch{resolve([])}});
  }
  async clearAssets(){
    const db=await this.open();if(!db)return;
    await new Promise(resolve=>{try{const tx=db.transaction(ASSET_STORE,"readwrite"),request=tx.objectStore(ASSET_STORE).clear();request.onsuccess=()=>resolve();request.onerror=()=>resolve();}catch{resolve()}});
  }
  async clear({assets=false}={}){
    try{localStorage.removeItem(SNAPSHOT_KEY);}catch{}
    const db=await this.open();if(!db)return;
    await new Promise(resolve=>{try{const tx=db.transaction(PROJECT_STORE,"readwrite"),request=tx.objectStore(PROJECT_STORE).delete("active");request.onsuccess=()=>resolve();request.onerror=()=>resolve();}catch{resolve()}});
    if(assets)await this.clearAssets();
  }
  async getFromStore(storeName,id){
    const db=await this.open();if(!db)return null;
    return new Promise(resolve=>{try{const tx=db.transaction(storeName,"readonly"),request=tx.objectStore(storeName).get(id);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>resolve(null);}catch{resolve(null)}});
  }
  async putToStore(storeName,value){
    const db=await this.open();if(!db)return false;
    return new Promise(resolve=>{try{const tx=db.transaction(storeName,"readwrite"),request=tx.objectStore(storeName).put(value);request.onsuccess=()=>resolve(true);request.onerror=()=>resolve(false);}catch{resolve(false)}});
  }
}
