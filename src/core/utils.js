export function deepClone(value){
  if(typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
export function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
export function lerp(a,b,t){return a+(b-a)*t;}
export function smoothstep(t){t=clamp(t,0,1);return t*t*(3-2*t);}
export function uid(prefix="id"){
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}
export function jsonEqual(a,b){return JSON.stringify(a)===JSON.stringify(b);}
export function debounce(fn,delay=180){let timer;return (...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay);};}
export function aspectNumber(value){
  const map={"16:9":16/9,"9:16":9/16,"4:3":4/3,"1:1":1,"2.39:1":2.39};
  return map[value] ?? 16/9;
}
export function formatTimecode(frame,fps){
  const safeFps=Math.max(1,Math.round(fps||24));
  const safe=Math.max(0,Math.round(frame||0));
  const seconds=Math.floor(safe/safeFps), frames=safe%safeFps;
  const s=seconds%60, m=Math.floor(seconds/60)%60, h=Math.floor(seconds/3600);
  return [h,m,s].map(v=>String(v).padStart(2,"0")).join(":")+":"+String(frames).padStart(2,"0");
}
export function seeded(seed){
  let value=(Number(seed)||1)>>>0;
  return ()=>{value=(value+0x6D2B79F5)|0;let t=Math.imul(value^value>>>15,1|value);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}
export function safeParse(raw,fallback=null){try{return JSON.parse(raw)}catch{return fallback}}
