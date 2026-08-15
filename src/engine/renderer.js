import {
  boundsCenter,
  boundsRadius,
  boundsSize,
  clamp,
  mat3NormalFromMat4,
  mat4Identity,
  mat4LookAt,
  mat4Multiply,
  mat4Orthographic,
  mat4Perspective,
  mat4RotationY,
  mat4RotationZ,
  mat4Scale,
  mat4Translation,
  vec3,
} from './math.js';

const HERO_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;
out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vUV;
void main(){
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPosition = world.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  vUV = aUV;
  gl_Position = uProjection * uView * world;
}`;

const HERO_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUV;
out vec4 outColor;
uniform vec3 uCameraPosition;
uniform vec3 uLightDirection;
uniform vec4 uBaseColor;
uniform vec3 uEmissive;
uniform float uMetallic;
uniform float uRoughness;
uniform float uAmbient;
uniform float uLightIntensity;
uniform float uRim;
uniform float uLightWarmth;
uniform float uExposure;
uniform float uContrast;
uniform float uGradeWarmth;
uniform float uSaturation;
uniform bool uUseTexture;
uniform sampler2D uTexture;
uniform int uAlphaMode;
uniform float uAlphaCutoff;
uniform bool uDoubleSided;
uniform bool uUnlit;

vec3 grade(vec3 color){
  color *= uExposure;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);
  color = (color - 0.5) * uContrast + 0.5;
  color += vec3(uGradeWarmth * 0.075, uGradeWarmth * 0.022, -uGradeWarmth * 0.055);
  return max(color, 0.0);
}

void main(){
  vec4 texel = uUseTexture ? texture(uTexture, vUV) : vec4(1.0);
  vec4 base = uBaseColor * texel;
  if(uAlphaMode == 1 && base.a < uAlphaCutoff) discard;
  vec3 n = normalize(vNormal);
  if(uDoubleSided && !gl_FrontFacing) n = -n;
  vec3 color;
  if(uUnlit){
    color = base.rgb + uEmissive;
  } else {
    vec3 l = normalize(uLightDirection);
    vec3 v = normalize(uCameraPosition - vWorldPosition);
    vec3 h = normalize(l + v);
    float ndl = max(dot(n,l), 0.0);
    float ndh = max(dot(n,h), 0.0);
    float rough = clamp(uRoughness, 0.04, 1.0);
    float specPower = mix(150.0, 7.0, rough);
    float spec = pow(ndh, specPower) * mix(0.22, 1.25, uMetallic) * (1.0 - rough * 0.55);
    float fresnel = pow(1.0 - max(dot(n,v),0.0), 3.2);
    float rim = fresnel * uRim;
    vec3 lightTint = vec3(1.0 + uLightWarmth*0.18, 1.0 + uLightWarmth*0.035, 1.0 - uLightWarmth*0.14);
    vec3 diffuse = base.rgb * (uAmbient + ndl * uLightIntensity * (1.0 - uMetallic * 0.45));
    vec3 specColor = mix(vec3(0.92), base.rgb, uMetallic);
    color = diffuse * lightTint + specColor * spec * uLightIntensity + specColor * rim + uEmissive;
  }
  color = grade(color);
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0/2.2));
  outColor = vec4(color, base.a);
}`;

const STAGE_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
uniform mat4 uView;
uniform mat4 uProjection;
out vec3 vPosition;
out vec3 vNormal;
void main(){
  vPosition = aPosition;
  vNormal = aNormal;
  gl_Position = uProjection * uView * vec4(aPosition,1.0);
}`;

const STAGE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vPosition;
in vec3 vNormal;
out vec4 outColor;
uniform vec3 uFloorColor;
uniform vec3 uBackColor;
uniform vec3 uLightDirection;
uniform float uExposure;
void main(){
  float wall = smoothstep(0.15, 4.8, vPosition.y);
  float horizon = smoothstep(-7.0, -1.0, vPosition.z);
  vec3 color = mix(uFloorColor, uBackColor, max(wall, 1.0-horizon)*0.72);
  float ndl = max(dot(normalize(vNormal), normalize(uLightDirection)),0.0);
  color *= 0.72 + ndl*0.34;
  color *= uExposure;
  color = color/(color+vec3(1.0));
  color = pow(color,vec3(1.0/2.2));
  outColor=vec4(color,1.0);
}`;

const SHADOW_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=2) in vec2 aUV;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
out vec2 vUV;
void main(){ vUV=aUV; gl_Position=uProjection*uView*uModel*vec4(aPosition,1.0); }`;

const SHADOW_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 outColor;
uniform float uOpacity;
void main(){
  vec2 q=(vUV-0.5)*2.0;
  float d=dot(q,q);
  float alpha=(1.0-smoothstep(0.08,1.0,d))*uOpacity;
  outColor=vec4(0.0,0.0,0.0,alpha);
}`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Shader compile failed';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Program link failed';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function uniformMap(gl, program, names) {
  return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
}

function createGeometry(gl, positions, normals, uvs, indices) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffers = [];
  const add = (location, data, size) => {
    const buffer = gl.createBuffer(); buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };
  add(0, positions, 3);
  add(1, normals || new Float32Array(positions.length), 3);
  add(2, uvs || new Float32Array((positions.length / 3) * 2), 2);
  const indexBuffer = gl.createBuffer(); buffers.push(indexBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, buffers, count: indices.length, indexType: gl.UNSIGNED_INT };
}

function createTexture(gl, image) {
  if (!image) return null;
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function stageGeometry() {
  const width = 180, frontZ = 16, curveZ = -4, radius = 9, wallH = 24, segments = 44;
  const profile = [[frontZ, 0], [curveZ, 0]];
  for (let i = 1; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 0.5;
    profile.push([curveZ - radius * Math.sin(angle), radius - radius * Math.cos(angle)]);
  }
  profile.push([curveZ - radius, wallH]);
  const positions = [], normals = [], uvs = [], indices = [];
  profile.forEach(([z, y], i) => {
    const next = profile[Math.min(profile.length - 1, i + 1)];
    const prev = profile[Math.max(0, i - 1)];
    const dz = next[0] - prev[0], dy = next[1] - prev[1];
    const length = Math.hypot(dz, dy) || 1;
    const normal = [0, -dz / length, dy / length];
    positions.push(-width / 2, y, z, width / 2, y, z);
    normals.push(...normal, ...normal);
    uvs.push(0, i / (profile.length - 1), 1, i / (profile.length - 1));
  });
  for (let i = 0; i < profile.length - 1; i += 1) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, b, d, a, d, c);
  }
  return {
    positions: new Float32Array(positions), normals: new Float32Array(normals),
    uvs: new Float32Array(uvs), indices: new Uint32Array(indices),
  };
}

function shadowGeometry() {
  return {
    positions: new Float32Array([-1,0,-1, 1,0,-1, 1,0,1, -1,0,1]),
    normals: new Float32Array([0,1,0, 0,1,0, 0,1,0, 0,1,0]),
    uvs: new Float32Array([0,0, 1,0, 1,1, 0,1]),
    indices: new Uint32Array([0,1,2,0,2,3]),
  };
}

function setVec3(gl, location, value) { if (location) gl.uniform3fv(location, value); }
function setFloat(gl, location, value) { if (location) gl.uniform1f(location, value); }

export class VisualRenderer {
  constructor(canvas, { onContextState = () => {} } = {}) {
    this.canvas = canvas;
    this.onContextState = onContextState;
    this.gl = canvas.getContext('webgl2', {
      antialias: true, alpha: false, depth: true, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
    });
    if (!this.gl) throw new Error('WebGL 2 is required to run VisualRef V48A.');
    this.contextCount = 1;
    this.mountCount = 0;
    this.renderCount = 0;
    this.asset = null;
    this.gpuPrimitives = [];
    this.frame = null;
    this.invalidated = false;
    this.disposed = false;
    this.manualYaw = 0;
    this.manualPitch = 0;
    this.manualZoom = 1;
    this.drag = null;
    this.interactionEnabled = true;
    this.initPrograms();
    this.initSceneGeometry();
    this.installEvents();
    this.resizeObserver = new ResizeObserver(() => this.invalidate());
    this.resizeObserver.observe(canvas);
    this.invalidate();
  }

  initPrograms() {
    const gl = this.gl;
    this.heroProgram = createProgram(gl, HERO_VERTEX, HERO_FRAGMENT);
    this.heroUniforms = uniformMap(gl, this.heroProgram, [
      'uModel','uView','uProjection','uNormalMatrix','uCameraPosition','uLightDirection','uBaseColor','uEmissive',
      'uMetallic','uRoughness','uAmbient','uLightIntensity','uRim','uLightWarmth','uExposure','uContrast',
      'uGradeWarmth','uSaturation','uUseTexture','uTexture','uAlphaMode','uAlphaCutoff','uDoubleSided','uUnlit',
    ]);
    this.stageProgram = createProgram(gl, STAGE_VERTEX, STAGE_FRAGMENT);
    this.stageUniforms = uniformMap(gl, this.stageProgram, ['uView','uProjection','uFloorColor','uBackColor','uLightDirection','uExposure']);
    this.shadowProgram = createProgram(gl, SHADOW_VERTEX, SHADOW_FRAGMENT);
    this.shadowUniforms = uniformMap(gl, this.shadowProgram, ['uModel','uView','uProjection','uOpacity']);
  }

  initSceneGeometry() {
    const stage = stageGeometry();
    const shadow = shadowGeometry();
    this.stageGPU = createGeometry(this.gl, stage.positions, stage.normals, stage.uvs, stage.indices);
    this.shadowGPU = createGeometry(this.gl, shadow.positions, shadow.normals, shadow.uvs, shadow.indices);
  }

  installEvents() {
    const canvas = this.canvas;
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.onContextState({ state: 'lost', message: 'Graphics context lost. Attempting recovery…' });
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.onContextState({ state: 'restored', message: 'Graphics context restored.' });
      this.initPrograms(); this.initSceneGeometry();
      if (this.asset) this.uploadAsset(this.asset, false);
      this.invalidate();
    });
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.interactionEnabled || event.button !== 0) return;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: this.manualYaw, pitch: this.manualPitch };
      canvas.setPointerCapture?.(event.pointerId);
      canvas.classList.add('is-orbiting');
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const dx = event.clientX - this.drag.x, dy = event.clientY - this.drag.y;
      this.manualYaw = this.drag.yaw - dx * 0.006;
      this.manualPitch = clamp(this.drag.pitch - dy * 0.0045, -0.65, 0.55);
      this.invalidate();
    });
    const finish = (event) => {
      if (!this.drag || (event?.pointerId != null && this.drag.id !== event.pointerId)) return;
      this.drag = null; canvas.classList.remove('is-orbiting');
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    canvas.addEventListener('wheel', (event) => {
      if (!this.interactionEnabled) return;
      event.preventDefault();
      this.manualZoom = clamp(this.manualZoom * Math.exp(event.deltaY * 0.001), 0.58, 2.2);
      this.invalidate();
    }, { passive: false });
    canvas.addEventListener('dblclick', () => this.resetOrbit());
  }

  setInteractionEnabled(enabled) { this.interactionEnabled = !!enabled; }

  resetOrbit() {
    this.manualYaw = 0; this.manualPitch = 0; this.manualZoom = 1; this.invalidate();
  }

  setFrame(frame) { this.frame = frame; this.invalidate(); }

  disposeGPUPrimitives() {
    const gl = this.gl;
    for (const primitive of this.gpuPrimitives) {
      gl.deleteVertexArray(primitive.geometry.vao);
      primitive.geometry.buffers.forEach((buffer) => gl.deleteBuffer(buffer));
      if (primitive.texture) gl.deleteTexture(primitive.texture);
    }
    this.gpuPrimitives = [];
  }

  uploadAsset(asset, countMount = true) {
    const gl = this.gl;
    // Build the replacement first. A failed upload must never destroy the
    // currently mounted real Hero.
    const nextPrimitives = [];
    try {
      for (const primitive of asset.primitives) {
        nextPrimitives.push({
          geometry: createGeometry(gl, primitive.positions, primitive.normals, primitive.uvs, primitive.indices),
          matrix: primitive.matrix,
          material: primitive.material,
          texture: createTexture(gl, primitive.textureImage),
        });
      }
    } catch (error) {
      for (const primitive of nextPrimitives) {
        gl.deleteVertexArray(primitive.geometry.vao);
        primitive.geometry.buffers.forEach((buffer) => gl.deleteBuffer(buffer));
        if (primitive.texture) gl.deleteTexture(primitive.texture);
      }
      throw error;
    }
    const center = boundsCenter(asset.bounds);
    const size = boundsSize(asset.bounds);
    const maximum = Math.max(size[0], size[1], size[2]) || 1;
    const normalizationScale = 3.35 / maximum;
    this.disposeGPUPrimitives();
    this.asset = asset;
    this.normalizationScale = normalizationScale;
    this.normalizedSize = [size[0] * normalizationScale, size[1] * normalizationScale, size[2] * normalizationScale];
    this.normalizedRadius = Math.max(1.0, boundsRadius(asset.bounds) * normalizationScale);
    this.heroCenterY = this.normalizedSize[1] * 0.5;
    this.heroBaseMatrix = mat4Multiply(
      mat4Translation(-center[0] * normalizationScale, -asset.bounds.min[1] * normalizationScale, -center[2] * normalizationScale),
      mat4Scale(normalizationScale),
    );
    this.gpuPrimitives = nextPrimitives;
    if (countMount) this.mountCount += 1;
    this.invalidate();
  }

  async setAsset(asset) { this.uploadAsset(asset, true); }

  clearAsset() { this.disposeGPUPrimitives(); this.asset = null; this.invalidate(); }

  resize() {
    const gl = this.gl;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(2, Math.round(rect.width * dpr));
    const height = Math.max(2, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width; this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    return { width, height, aspect: width / height };
  }

  invalidate() {
    if (this.invalidated || this.disposed) return;
    this.invalidated = true;
    requestAnimationFrame(() => { this.invalidated = false; if (!this.disposed) this.render(); });
  }

  cameraMatrices(frame, viewport) {
    const radius = this.normalizedRadius || 1.8;
    const fov = clamp(frame?.fov || 0.72, 0.17, 1.35);
    const baseDistance = radius / Math.sin(fov * 0.5) * 1.07;
    const distance = baseDistance * (frame?.cameraDistance || 1) * this.manualZoom;
    const yaw = (frame?.cameraYaw || 0) + this.manualYaw;
    const pitch = clamp((frame?.cameraPitch || 0) + this.manualPitch, -1.35, 0.72);
    const target = vec3(
      (frame?.targetX || 0) * (this.normalizedSize?.[0] || 2),
      this.heroCenterY + (frame?.targetY || 0) * (this.normalizedSize?.[1] || 3),
      0,
    );
    const cp = Math.cos(pitch);
    const eye = vec3(
      target[0] + Math.sin(yaw) * cp * distance,
      target[1] - Math.sin(pitch) * distance,
      target[2] + Math.cos(yaw) * cp * distance,
    );
    const view = mat4LookAt(eye, target);
    const near = Math.max(0.015, distance - radius * 4.0);
    const far = Math.max(near + 10, distance + radius * 9.0 + 25);
    let projection;
    if ((frame?.orthoMix || 0) > 0.55) {
      const half = radius * (frame.cameraDistance || 1) * 1.12;
      projection = mat4Orthographic(-half * viewport.aspect, half * viewport.aspect, -half, half, near, far);
    } else {
      projection = mat4Perspective(fov, viewport.aspect, near, far);
    }
    return { eye, target, view, projection, distance };
  }

  render() {
    const gl = this.gl;
    const viewport = this.resize();
    const frame = this.frame || {
      clearColor: [0.02,0.021,0.025], stageColor: [0.18,0.185,0.2], stageBackColor: [0.095,0.1,0.115],
      stageVisible: true, lightDir: [-.55,.72,.43], exposure: 1, lightIntensity: 1.1, ambient: .3, rim: .35,
      lightWarmth: .1, contrast: 1, gradeWarmth: 0, saturation: 1, modelScale: 1,
    };
    gl.clearColor(...frame.clearColor, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    const camera = this.cameraMatrices(frame, viewport);

    if (frame.stageVisible) this.drawStage(frame, camera);
    if (this.asset) {
      this.drawContactShadow(frame, camera);
      this.drawHero(frame, camera);
    }
    this.renderCount += 1;
  }

  drawStage(frame, camera) {
    const gl = this.gl, u = this.stageUniforms;
    gl.useProgram(this.stageProgram);
    gl.bindVertexArray(this.stageGPU.vao);
    gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.depthMask(true);
    gl.uniformMatrix4fv(u.uView, false, camera.view);
    gl.uniformMatrix4fv(u.uProjection, false, camera.projection);
    setVec3(gl, u.uFloorColor, frame.stageColor);
    setVec3(gl, u.uBackColor, frame.stageBackColor);
    setVec3(gl, u.uLightDirection, frame.lightDir);
    setFloat(gl, u.uExposure, frame.exposure * 0.92);
    gl.drawElements(gl.TRIANGLES, this.stageGPU.count, this.stageGPU.indexType, 0);
  }

  drawContactShadow(frame, camera) {
    const gl = this.gl, u = this.shadowUniforms;
    gl.useProgram(this.shadowProgram);
    gl.bindVertexArray(this.shadowGPU.vao);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE); gl.depthMask(false);
    const sx = Math.max(0.8, (this.normalizedSize?.[0] || 2) * 0.72 * (frame.modelScale || 1));
    const sz = Math.max(0.65, (this.normalizedSize?.[2] || 1.5) * 0.78 * (frame.modelScale || 1));
    const model = mat4Multiply(mat4Translation(0, 0.012, 0), mat4Scale(sx, 1, sz));
    gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniformMatrix4fv(u.uView, false, camera.view);
    gl.uniformMatrix4fv(u.uProjection, false, camera.projection);
    gl.uniform1f(u.uOpacity, frame.stageVisible ? 0.42 : 0.25);
    gl.drawElements(gl.TRIANGLES, this.shadowGPU.count, this.shadowGPU.indexType, 0);
    gl.depthMask(true);
  }

  drawHero(frame, camera) {
    const gl = this.gl, u = this.heroUniforms;
    gl.useProgram(this.heroProgram);
    gl.uniformMatrix4fv(u.uView, false, camera.view);
    gl.uniformMatrix4fv(u.uProjection, false, camera.projection);
    setVec3(gl, u.uCameraPosition, camera.eye);
    setVec3(gl, u.uLightDirection, frame.lightDir);
    setFloat(gl, u.uAmbient, frame.ambient);
    setFloat(gl, u.uLightIntensity, frame.lightIntensity);
    setFloat(gl, u.uRim, frame.rim);
    setFloat(gl, u.uLightWarmth, frame.lightWarmth);
    setFloat(gl, u.uExposure, frame.exposure);
    setFloat(gl, u.uContrast, frame.contrast);
    setFloat(gl, u.uGradeWarmth, frame.gradeWarmth);
    setFloat(gl, u.uSaturation, frame.saturation);
    const root = mat4Multiply(
      mat4Multiply(mat4RotationY(frame.modelYaw || 0), mat4RotationZ(frame.modelRoll || 0)),
      mat4Scale(frame.modelScale || 1),
    );
    const sorted = [...this.gpuPrimitives].sort((a, b) => {
      const aa = a.material.alphaMode === 'BLEND' ? 1 : 0;
      const bb = b.material.alphaMode === 'BLEND' ? 1 : 0;
      return aa - bb;
    });
    for (const primitive of sorted) {
      const material = primitive.material;
      const model = mat4Multiply(mat4Multiply(root, this.heroBaseMatrix), primitive.matrix || mat4Identity());
      gl.uniformMatrix4fv(u.uModel, false, model);
      gl.uniformMatrix3fv(u.uNormalMatrix, false, mat3NormalFromMat4(model));
      gl.uniform4fv(u.uBaseColor, material.baseColorFactor);
      gl.uniform3fv(u.uEmissive, material.emissiveFactor);
      gl.uniform1f(u.uMetallic, material.metallicFactor);
      gl.uniform1f(u.uRoughness, material.roughnessFactor);
      gl.uniform1i(u.uAlphaMode, material.alphaMode === 'MASK' ? 1 : material.alphaMode === 'BLEND' ? 2 : 0);
      gl.uniform1f(u.uAlphaCutoff, material.alphaCutoff);
      gl.uniform1i(u.uDoubleSided, material.doubleSided ? 1 : 0);
      gl.uniform1i(u.uUnlit, material.unlit ? 1 : 0);
      gl.uniform1i(u.uUseTexture, primitive.texture ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, primitive.texture);
      gl.uniform1i(u.uTexture, 0);
      if (material.doubleSided) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
      if (material.alphaMode === 'BLEND') {
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      } else {
        gl.disable(gl.BLEND); gl.depthMask(true);
      }
      gl.bindVertexArray(primitive.geometry.vao);
      gl.drawElements(gl.TRIANGLES, primitive.geometry.count, primitive.geometry.indexType, 0);
    }
    gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
  }

  getDebugState() {
    return {
      contextCount: this.contextCount,
      mountCount: this.mountCount,
      renderCount: this.renderCount,
      primitiveCount: this.gpuPrimitives.length,
      assetName: this.asset?.name || null,
      normalizationScale: this.normalizationScale || null,
      normalizedSize: this.normalizedSize || null,
    };
  }

  dispose() {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.disposeGPUPrimitives();
  }
}
