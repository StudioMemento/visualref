import {installV45AOverlay} from './install-v45a-overlay.js';

export function shouldEnableV45A(locationLike=globalThis.location){
  try{const params=new URLSearchParams(locationLike?.search||'');return params.get('v45a')==='1'||globalThis.localStorage?.getItem('memento-v45a-dev')==='1';}catch{return false;}
}

export function attachV45AWhenReady(){
  if(!shouldEnableV45A())return;
  const attach=()=>{
    const runtime=globalThis.__MEMENTO_V44__;
    if(runtime){installV45AOverlay(runtime,{enabled:true});return true;}
    return false;
  };
  if(attach())return;
  let attempts=0;const timer=setInterval(()=>{if(attach()||++attempts>100)clearInterval(timer);},50);
}
