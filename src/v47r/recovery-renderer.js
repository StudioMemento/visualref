const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function createRecoveryRendererClass(BaseRenderer){
  return class RecoveryRendererService extends BaseRenderer{
    constructor(options={}){
      super(options);
      this.recoveryWorkspace=options.workspace||"viewport";
      this.recoveryWorld=null;
    }
    initThree(){
      super.initThree();
      this.installRecoveryWorld();
    }
    installRecoveryWorld(){
      if(!this.T||!this.scene||this.recoveryWorld)return;
      const T=this.T,group=new T.Group();group.name="V47R_WORLD_AUTHORITY";
      const profile=[],front=22,curveStart=-7,radius=9,wallHeight=28,segments=30,width=80;
      profile.push(new T.Vector2(front,0),new T.Vector2(curveStart,0));
      for(let i=1;i<=segments;i++){const a=i/segments*Math.PI*.5;profile.push(new T.Vector2(curveStart-radius*Math.sin(a),radius-radius*Math.cos(a)));}
      profile.push(new T.Vector2(curveStart-radius,wallHeight));
      const positions=[],indices=[];
      for(const point of profile)positions.push(-width/2,point.y,point.x,width/2,point.y,point.x);
      for(let i=0;i<profile.length-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,d,a,d,c);}
      const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const material=new T.MeshStandardMaterial({color:0x666970,roughness:.93,metalness:.01,side:T.FrontSide});
      const cove=new T.Mesh(geometry,material);cove.name="V47R_CYCLORAMA";cove.receiveShadow=true;group.add(cove);

      const shadowCanvas=document.createElement("canvas");shadowCanvas.width=shadowCanvas.height=256;const ctx=shadowCanvas.getContext("2d");
      const gradient=ctx.createRadialGradient(128,128,2,128,128,124);gradient.addColorStop(0,"rgba(0,0,0,.72)");gradient.addColorStop(.34,"rgba(0,0,0,.42)");gradient.addColorStop(.74,"rgba(0,0,0,.12)");gradient.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
      const texture=new T.CanvasTexture(shadowCanvas);texture.colorSpace=T.SRGBColorSpace;
      const shadowMaterial=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:.6,toneMapped:false});
      const shadow=new T.Mesh(new T.PlaneGeometry(1,1),shadowMaterial);shadow.name="V47R_CONTACT_SHADOW";shadow.rotation.x=-Math.PI/2;shadow.renderOrder=4;group.add(shadow);
      this.scene.add(group);
      this.recoveryWorld={group,cove,material,shadow,shadowMaterial,texture,lastRecipe:null,lastSoftness:null};
    }
    setRecoveryWorkspace(workspace){
      this.recoveryWorkspace=workspace;this.workspace=workspace;this.viewportActive=workspace==="viewport";
      if(this.orbit)this.orbit.enabled=this.viewportActive&&this.viewportCameraMode!=="shot"&&!this.transformDragging;
    }
    configureViewport(options={}){
      const active=this.recoveryWorkspace==="viewport"?options.active!==false:false;
      return super.configureViewport({...options,active});
    }
    applyState(frame,state,wallTime=0,options={}){
      const camera=super.applyState(frame,state,wallTime,options);
      this.applyRecoveryWorld(frame,state,camera,options);
      return camera;
    }
    applyRecoveryWorld(frame,state,camera,{forceShotCamera=false}={}){
      if(!this.T||!this.recoveryWorld||!state)return;
      const T=this.T,world=state.recovery?.world||{},recipe=world.recipe||"grey-limbo",softness=clamp(Number(world.shadowSoftness??58),0,100),rw=this.recoveryWorld;
      if(this.floor)this.floor.visible=false;if(this.cove)this.cove.visible=false;
      const palettes={
        "grey-limbo":{surface:0x62656d,background:0x565961,ambient:.72,key:3.4,rim:5.8,fill:1.45,exposure:1.16},
        "white-limbo":{surface:0xc7c9cc,background:0xb7bac0,ambient:.82,key:3.0,rim:4.9,fill:1.7,exposure:1.02},
        "black-limbo":{surface:0x0b0c0f,background:0x050507,ambient:.48,key:4.0,rim:6.7,fill:1.1,exposure:1.27},
        "void":{surface:0x060608,background:0x030304,ambient:.42,key:3.5,rim:6.2,fill:.9,exposure:1.2}
      },palette=palettes[recipe]||palettes["grey-limbo"];
      rw.group.visible=recipe!=="void";rw.shadow.visible=recipe!=="void"&&world.ground!==false;
      rw.material.color.setHex(palette.surface);this.scene.background=new T.Color(palette.background);this.scene.fog=null;
      const lightKey=clamp(Number(frame?.values?.["light.key"]??1),.25,2.5),depth=clamp(Number(frame?.values?.["environment.depth"]??.35),0,1);
      if(this.ambient)this.ambient.intensity=palette.ambient*(.82+depth*.28);
      if(this.key)this.key.intensity=palette.key*lightKey;
      if(this.rim)this.rim.intensity=palette.rim*(.88+lightKey*.12);
      if(this.fill)this.fill.intensity=palette.fill;
      if(this.renderer)this.renderer.toneMappingExposure=palette.exposure;
      if(this.motes)this.motes.visible=false;

      const hero=this.heroGroup||this.nodeGroups?.get?.("hero-proxy");
      if(hero){
        hero.updateMatrixWorld(true);const box=new T.Box3().setFromObject(hero,true);
        if(!box.isEmpty()){
          const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),ground=Number.isFinite(box.min.y)?box.min.y:0;
          rw.group.position.set(0,0,0);rw.shadow.position.set(center.x,.006,center.z);
          const spread=1.08+softness/100*.74;rw.shadow.scale.set(Math.max(.28,size.x*spread),Math.max(.28,size.z*spread),1);
          rw.shadowMaterial.opacity=.74-softness/100*.34;
          if(world.safeFrame!==false&&!forceShotCamera&&this.recoveryWorkspace!=="viewport")this.ensureReadableFrame(camera,box);
          if(world.safeFrame!==false&&this.recoveryWorkspace==="viewport"&&this.viewportCameraMode==="shot")this.ensureReadableFrame(camera,box);
        }
      }
      if(recipe==="void")rw.group.visible=false;
      this.grid&&(this.grid.position.y=.004);
      rw.lastRecipe=recipe;rw.lastSoftness=softness;
    }
    ensureReadableFrame(camera,box){
      if(!camera||!box||box.isEmpty?.())return;
      const T=this.T,size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),direction=camera.position.clone().sub(center),distance=direction.length();if(!Number.isFinite(distance)||distance<.001)return;
      const vfov=T.MathUtils.degToRad(clamp(camera.fov||38,8,100)),aspect=Math.max(.25,camera.aspect||1),hfov=2*Math.atan(Math.tan(vfov/2)*aspect);
      const desiredVertical=(size.y*.5)/Math.max(.03,Math.tan(vfov/2)*.56),desiredHorizontal=(size.x*.5)/Math.max(.03,Math.tan(hfov/2)*.72),desired=Math.max(desiredVertical,desiredHorizontal,size.z*.7,.25);
      if(distance>desired*1.42||distance<desired*.58){direction.normalize();camera.position.copy(center).addScaledVector(direction,desired);camera.near=Math.max(.005,desired-Math.max(size.x,size.y,size.z)*1.8);camera.far=Math.max(camera.near+100,desired+Math.max(size.x,size.y,size.z)*18);camera.updateProjectionMatrix();camera.lookAt(center);}
    }
    dispose(){
      if(this.recoveryWorld){this.recoveryWorld.group?.parent?.remove(this.recoveryWorld.group);this.recoveryWorld.cove?.geometry?.dispose?.();this.recoveryWorld.material?.dispose?.();this.recoveryWorld.shadow?.geometry?.dispose?.();this.recoveryWorld.shadowMaterial?.dispose?.();this.recoveryWorld.texture?.dispose?.();this.recoveryWorld=null;}
      super.dispose();
    }
  };
}
