import {RendererAuthority} from "./renderer-authority.js";

export function createRuntimeInstrumentation({store}={}){
  const samples=[];
  const snapshot=()=>{
    const state=store?.get?.();
    const heroNodes=Object.values(state?.scene?.nodes||{}).filter(node=>node.type==="hero"&&node.visible!==false).length;
    const renderer=RendererAuthority.snapshot();
    const sample={at:Date.now(),rendererCount:renderer?1:0,rendererOwner:renderer?.owner||null,liveHeroCount:heroNodes,assetCount:Object.keys(state?.assets?.byId||{}).length,clipCount:Object.keys(state?.timeline?.clips||{}).length};
    samples.push(sample);if(samples.length>120)samples.shift();return sample;
  };
  const unsubscribe=store?.subscribe?.(()=>snapshot());
  return {snapshot,samples,dispose(){unsubscribe?.();}};
}
