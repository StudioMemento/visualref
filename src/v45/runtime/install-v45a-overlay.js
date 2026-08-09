import {createReadOnlyV45View} from '../compatibility/v44-adapter.js';
import {collectV45Diagnostics} from './diagnostics.js';

export function installV45AOverlay(v44Runtime,{enabled=false}={}){
  if(!enabled)return null;
  if(!v44Runtime?.store||Number(v44Runtime.schema)!==44)throw new Error('V45A overlay requires the frozen V44/schema-44 runtime');
  const view=createReadOnlyV45View(v44Runtime.store);
  const api={
    version:'45A',
    mode:'read-only-bridge',
    getProject:()=>view.get(),
    diagnostics:()=>collectV45Diagnostics({project:view.get(),rendererAuthority:null}),
    subscribe:listener=>view.subscribe(listener)
  };
  globalThis.__MEMENTO_V45A__=api;
  document?.body?.setAttribute?.('data-v45a','bridge');
  console.info('V45A bridge enabled · production mutations remain on V44');
  return api;
}
