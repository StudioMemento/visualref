let active=null;
let serial=0;

export const RendererAuthority=Object.freeze({
  acquire(owner="visualref"){
    if(active&&active.owner!==owner)throw new Error(`Renderer authority already owned by ${active.owner}`);
    if(active){active.refs+=1;return active.token;}
    const token=`renderer-${++serial}`;
    active={owner,token,refs:1,acquiredAt:Date.now()};
    return token;
  },
  release(token){
    if(!active||active.token!==token)return false;
    active.refs-=1;
    if(active.refs<=0)active=null;
    return true;
  },
  assert(token){if(!active||active.token!==token)throw new Error("Renderer authority token is no longer active");return true;},
  snapshot(){return active?{...active}:null;},
  resetForTests(){active=null;serial=0;}
});
