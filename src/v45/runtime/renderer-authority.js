export class RendererAuthority{
  constructor({label='VisualRef Renderer'}={}){this.label=label;this.owner=null;this.instance=null;this.acquisitions=0;}
  acquire(ownerId,factory){
    if(!ownerId)throw new TypeError('ownerId is required');
    if(this.owner && this.owner!==ownerId)throw new Error(`${this.label} already owned by ${this.owner}`);
    if(!this.instance){this.instance=factory();this.acquisitions++;}this.owner=ownerId;return this.instance;
  }
  release(ownerId){
    if(this.owner!==ownerId)return false;
    const current=this.instance;this.owner=null;this.instance=null;current?.dispose?.();return true;
  }
  snapshot(){return Object.freeze({owner:this.owner,rendererCount:this.instance?1:0,acquisitions:this.acquisitions});}
}
