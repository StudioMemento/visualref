import {clamp} from "../core/utils.js";

class CanvasFallback{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext("2d");this.resizeObserver=null;this.mount();}
  mount(){const resize=()=>{const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.max(1,Math.round(rect.width*dpr));this.canvas.height=Math.max(1,Math.round(rect.height*dpr));this.ctx.setTransform(dpr,0,0,dpr,0,0);};this.resizeObserver=new ResizeObserver(resize);this.resizeObserver.observe(this.canvas);resize();}
  render(frame){
    const {ctx,canvas}=this,w=canvas.clientWidth,h=canvas.clientHeight,v=frame.values||{};ctx.clearRect(0,0,w,h);
    const depth=clamp(v["environment.depth"]??.3,0,1),gradient=ctx.createRadialGradient(w*.52,h*.43,0,w*.52,h*.43,Math.max(w,h)*.7);gradient.addColorStop(0,`rgba(${26+Math.round(depth*20)},${27+Math.round(depth*10)},${34+Math.round(depth*12)},1)`);gradient.addColorStop(1,"#030304");ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(w*.5+(v["subject.positionX"]??0)*w*.17,h*.53-(v["subject.positionY"]??0)*h*.2);const scale=(v["subject.scale"]??1)*Math.min(w,h)*.22,rot=(v["subject.rotationY"]??0)*Math.PI/180;ctx.rotate(rot*.22);ctx.shadowColor=`rgba(255,121,80,${.12+(v["light.key"]??.7)*.08})`;ctx.shadowBlur=34;const g=ctx.createLinearGradient(-scale,0,scale,0);g.addColorStop(0,"#0c0d10");g.addColorStop(.42,"#d4d7dc");g.addColorStop(.56,"#5d626a");g.addColorStop(1,"#111216");ctx.fillStyle=g;roundRect(ctx,-scale*.85,-scale*.14,scale*1.7,scale*.28,scale*.14);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#08090b";roundRect(ctx,-scale*1.05,-scale*.20,scale*.38,scale*.4,scale*.08);ctx.fill();ctx.strokeStyle="rgba(255,255,255,.2)";ctx.lineWidth=1;ctx.stroke();ctx.restore();
  }
  dispose(){this.resizeObserver?.disconnect();}
}
function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}

export class RendererService{
  constructor({canvas,onStatus}){this.canvas=canvas;this.onStatus=onStatus;this.mode="booting";this.THREE=null;this.resizeObserver=null;this.fallback=null;this.ready=this.init();}
  status(label,mode="ready"){this.mode=mode;this.onStatus?.({label,mode});}
  async init(){
    try{
      const THREE=await Promise.race([import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Three.js load timeout")),2800))]);this.THREE=THREE;this.initThree();this.status("THREE · READY","ready");
    }catch(error){console.warn("Three.js module unavailable, using visible fallback",error);this.fallback=new CanvasFallback(this.canvas);this.status("PROXY · FALLBACK","fallback");}
  }
  initThree(){
    const T=this.THREE;this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:"high-performance"});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.setClearColor(0x040405,1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
    this.scene=new T.Scene();this.scene.background=new T.Color(0x050506);this.scene.fog=new T.FogExp2(0x050506,.045);
    this.camera=new T.PerspectiveCamera(38,1,.05,100);this.camera.position.set(0,.1,5.5);
    this.subject=new T.Group();
    const bodyMat=new T.MeshPhysicalMaterial({color:0x34373d,metalness:.72,roughness:.27,clearcoat:.5,clearcoatRoughness:.35});
    const darkMat=new T.MeshStandardMaterial({color:0x090a0c,metalness:.45,roughness:.5});
    const body=new T.Mesh(new T.BoxGeometry(2.35,.34,.48,6,2,3),bodyMat);body.geometry.computeVertexNormals();body.rotation.z=-.05;body.castShadow=true;body.receiveShadow=true;
    const handle=new T.Mesh(new T.BoxGeometry(.52,.58,.7,3,3,3),darkMat);handle.position.x=-1.23;handle.rotation.z=-.05;handle.castShadow=true;
    const detail=new T.Mesh(new T.TorusGeometry(.18,.035,12,32),new T.MeshPhysicalMaterial({color:0xff7950,emissive:0x401208,emissiveIntensity:.55,metalness:.5,roughness:.3}));detail.rotation.y=Math.PI/2;detail.position.set(-.98,0,.36);
    this.subject.add(body,handle,detail);this.scene.add(this.subject);
    const floorMat=new T.MeshPhysicalMaterial({color:0x0b0b0e,metalness:.25,roughness:.5,transparent:true,opacity:.8});this.floor=new T.Mesh(new T.PlaneGeometry(30,30),floorMat);this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-1.2;this.floor.receiveShadow=true;this.scene.add(this.floor);
    const grid=new T.GridHelper(24,48,0x222228,0x141418);grid.position.y=-1.19;grid.material.transparent=true;grid.material.opacity=.24;this.grid=grid;this.scene.add(grid);
    this.ambient=new T.HemisphereLight(0x394052,0x050506,.48);this.key=new T.DirectionalLight(0xf2f4ff,2.1);this.key.position.set(-3,4,5);this.key.castShadow=true;this.rim=new T.PointLight(0xff7950,5.2,18,1.6);this.rim.position.set(3,1.4,-1);this.fill=new T.PointLight(0x4b78ff,1.3,14,2);this.fill.position.set(-2,-.4,2);this.scene.add(this.ambient,this.key,this.rim,this.fill);
    const points=[];for(let i=0;i<90;i++)points.push((Math.random()-.5)*14,Math.random()*7-2.2,-Math.random()*9-1);const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(points,3));this.motes=new T.Points(geometry,new T.PointsMaterial({color:0xffa07c,size:.035,transparent:true,opacity:.28,depthWrite:false}));this.scene.add(this.motes);
    const resize=()=>{const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;this.renderer.setSize(rect.width,rect.height,false);this.camera.aspect=rect.width/rect.height;this.camera.updateProjectionMatrix();};this.resizeObserver=new ResizeObserver(resize);this.resizeObserver.observe(this.canvas);resize();
    this.canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();this.status("CONTEXT · LOST","error");});this.canvas.addEventListener("webglcontextrestored",()=>{this.status("THREE · RESTORED","ready");});
  }
  async render(frame,state,wallTime=0){
    await this.ready;if(this.fallback){this.fallback.render(frame,state);return;}if(!this.renderer||!frame)return;
    const v=frame.values,base=state.scene.nodes["hero-proxy"]?.baseTransform||{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};
    this.subject.visible=state.scene.nodes["hero-proxy"]?.visible!==false;this.subject.position.set((v["subject.positionX"]??0)+base.position[0],(v["subject.positionY"]??0)+base.position[1],base.position[2]);this.subject.rotation.set(base.rotation[0],(v["subject.rotationY"]??0)*Math.PI/180+base.rotation[1],base.rotation[2]);const s=(v["subject.scale"]??1)*base.scale[0];this.subject.scale.setScalar(s);
    const distance=v["camera.distance"]??5.5,height=v["camera.height"]??.1;this.camera.position.set(0,height,distance);this.camera.lookAt(this.subject.position.x*.2,this.subject.position.y*.15,0);
    const key=v["light.key"]??.8;this.key.intensity=1.2+key*1.4;this.rim.intensity=2.8+key*3.1;this.ambient.intensity=.28+key*.2;
    const depth=clamp(v["environment.depth"]??.3,0,1);this.scene.fog.density=.018+depth*.065;this.grid.material.opacity=.09+depth*.24;this.floor.material.opacity=.58+depth*.3;this.scene.background.setRGB(.018+depth*.014,.018+depth*.012,.024+depth*.018);
    this.motes.rotation.y=wallTime*.012;this.motes.position.x=Math.sin(wallTime*.09)*.08;
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.resizeObserver?.disconnect();this.renderer?.dispose();this.fallback?.dispose();}
}
