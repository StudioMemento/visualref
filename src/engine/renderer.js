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
  mat4RotationX,
  mat4RotationY,
  mat4RotationZ,
  mat4Scale,
  mat4TransformPoint,
  mat4Translation,
  vec3,
} from './math.js';
import { composeNodeMatrix, transformBounds } from '../scene/transforms.js';

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
uniform vec3 uLightDirection[4];
uniform vec3 uLightColor[4];
uniform float uLightIntensity[4];
uniform vec4 uBaseColor;
uniform vec3 uEmissive;
uniform float uMetallic;
uniform float uRoughness;
uniform float uAmbient;
uniform float uRim;
uniform float uLightWarmth;
uniform float uSpecular;
uniform float uOpacityMultiplier;
uniform bool uUseTexture;
uniform sampler2D uTexture;
uniform int uAlphaMode;
uniform float uAlphaCutoff;
uniform bool uDoubleSided;
uniform bool uUnlit;
uniform bool uViewportUnlit;
uniform bool uUseEnv;
uniform sampler2D uEnvMap;
uniform float uEnvRotation;
uniform float uEnvIntensity;
uniform float uReflectionIntensity;
uniform float uEnvBlur;

const float PI = 3.14159265359;
vec2 envUV(vec3 direction){
  vec3 d = normalize(direction);
  float phi = atan(d.z, d.x) + uEnvRotation;
  float theta = asin(clamp(d.y, -1.0, 1.0));
  return vec2(fract(phi / (2.0*PI) + 0.5), theta / PI + 0.5);
}
vec3 sampleEnv(vec3 direction){
  if(!uUseEnv) return vec3(0.0);
  return textureLod(uEnvMap, envUV(direction), uEnvBlur * 7.0).rgb;
}
void main(){
  vec4 texel = uUseTexture ? texture(uTexture, vUV) : vec4(1.0);
  vec4 base = uBaseColor * texel;
  if(uAlphaMode == 1 && base.a < uAlphaCutoff) discard;
  vec3 n = normalize(vNormal);
  if(uDoubleSided && !gl_FrontFacing) n = -n;
  vec3 v = normalize(uCameraPosition - vWorldPosition);
  vec3 color;
  if(uUnlit || uViewportUnlit){
    color = base.rgb + uEmissive;
  } else {
    float rough = clamp(uRoughness, 0.045, 1.0);
    vec3 diffuseLight = vec3(0.0);
    vec3 specularLight = vec3(0.0);
    for(int i=0;i<4;i++){
      vec3 l = normalize(uLightDirection[i]);
      vec3 h = normalize(l + v);
      float ndl = max(dot(n,l), 0.0);
      float ndh = max(dot(n,h), 0.0);
      float specPower = mix(220.0, 7.0, rough);
      float spec = pow(ndh, specPower) * mix(0.24, 1.35, uMetallic) * (1.0 - rough * 0.52);
      diffuseLight += uLightColor[i] * ndl * uLightIntensity[i];
      specularLight += uLightColor[i] * spec * uLightIntensity[i];
    }
    vec3 lightTint = vec3(1.0 + uLightWarmth*0.18, 1.0 + uLightWarmth*0.035, 1.0 - uLightWarmth*0.14);
    float fresnel = pow(1.0 - max(dot(n,v),0.0), 3.1);
    vec3 specColor = mix(vec3(0.92), base.rgb, uMetallic);
    vec3 envDiffuse = sampleEnv(n) * uEnvIntensity;
    vec3 envSpec = sampleEnv(reflect(-v,n)) * uReflectionIntensity * (0.24 + (1.0-rough)*0.76);
    vec3 diffuse = base.rgb * (uAmbient + diffuseLight * (1.0 - uMetallic * 0.42) + envDiffuse * 0.28);
    color = diffuse * lightTint + specColor * specularLight * uSpecular + specColor * fresnel * uRim + envSpec * mix(vec3(0.75), base.rgb, uMetallic) + uEmissive;
  }
  outColor = vec4(max(color, 0.0), base.a * uOpacityMultiplier);
}`;

const STAGE_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat4 uModel;
out vec3 vPosition;
out vec3 vNormal;
void main(){
  vec4 world = uModel * vec4(aPosition,1.0);
  vPosition = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uProjection * uView * world;
}`;

const STAGE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vPosition;
in vec3 vNormal;
out vec4 outColor;
uniform vec3 uFloorColor;
uniform vec3 uBackColor;
uniform vec3 uLightDirection;
uniform float uStageScale;
void main(){
  float heightMix = smoothstep(0.15, 7.0*uStageScale, vPosition.y);
  float radial = length(vPosition.xz) / max(1.0, 17.0*uStageScale);
  float edge = smoothstep(0.35, 1.0, radial);
  vec3 color = mix(uFloorColor, uBackColor, max(heightMix, edge*0.82));
  float ndl = max(dot(normalize(vNormal), normalize(uLightDirection)),0.0);
  color *= 0.72 + ndl*0.28;
  float floorGlow = exp(-length(vPosition.xz)*0.12/max(0.5,uStageScale));
  color += uFloorColor * floorGlow * 0.10;
  outColor=vec4(max(color,0.0),1.0);
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
  float alpha=(1.0-smoothstep(0.05,1.0,d))*uOpacity;
  outColor=vec4(0.0,0.0,0.0,alpha);
}`;

const LINE_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aColor;
uniform mat4 uView;
uniform mat4 uProjection;
out vec3 vColor;
void main(){ vColor=aColor; gl_Position=uProjection*uView*vec4(aPosition,1.0); }`;
const LINE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outColor;
void main(){ outColor=vec4(vColor,0.88); }`;

const ENV_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
uniform mat4 uView;
uniform mat4 uProjection;
out vec3 vDirection;
void main(){
  mat4 viewNoTranslation = uView;
  viewNoTranslation[3] = vec4(0.0,0.0,0.0,1.0);
  vDirection = aPosition;
  vec4 clip = uProjection * viewNoTranslation * vec4(aPosition,1.0);
  gl_Position = clip.xyww;
}`;
const ENV_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vDirection;
out vec4 outColor;
uniform sampler2D uEnvMap;
uniform float uRotation;
uniform float uIntensity;
uniform float uBlur;
const float PI = 3.14159265359;
void main(){
  vec3 d=normalize(vDirection);
  vec2 uv=vec2(fract((atan(d.z,d.x)+uRotation)/(2.0*PI)+0.5), asin(clamp(d.y,-1.0,1.0))/PI+0.5);
  vec3 color=textureLod(uEnvMap,uv,uBlur*7.0).rgb*uIntensity;
  outColor=vec4(color,1.0);
}`;

const POST_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPosition;
out vec2 vUV;
void main(){ vUV=aPosition*0.5+0.5; gl_Position=vec4(aPosition,0.0,1.0); }`;

const POST_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 outColor;
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2 uResolution;
uniform vec2 uFocusUV;
uniform float uAperture;
uniform float uFocalRange;
uniform float uBloom;
uniform float uBloomThreshold;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform float uWarmth;
uniform float uTint;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform int uAtmosphereMode;
uniform float uAtmosphereStrength;
uniform bool uBypass;
uniform bool uViewport;

float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec3 aces(vec3 x){
  const float a=2.51; const float b=0.03; const float c=2.43; const float d=0.59; const float e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
}
vec3 blurSample(vec2 uv,float radius){
  vec2 px=1.0/max(uResolution,vec2(1.0));
  vec3 sum=texture(uColor,uv).rgb*0.20;
  sum+=texture(uColor,uv+vec2(1.0,0.0)*px*radius).rgb*0.10;
  sum+=texture(uColor,uv+vec2(-1.0,0.0)*px*radius).rgb*0.10;
  sum+=texture(uColor,uv+vec2(0.0,1.0)*px*radius).rgb*0.10;
  sum+=texture(uColor,uv+vec2(0.0,-1.0)*px*radius).rgb*0.10;
  sum+=texture(uColor,uv+vec2(0.707,0.707)*px*radius).rgb*0.10;
  sum+=texture(uColor,uv+vec2(-0.707,0.707)*px*radius).rgb*0.10;
  sum+=texture(uColor,uv+vec2(0.707,-0.707)*px*radius).rgb*0.10;
  sum+=texture(uColor,uv+vec2(-0.707,-0.707)*px*radius).rgb*0.10;
  return sum;
}
vec3 atmosphere(vec3 color,vec2 uv){
  if(uAtmosphereMode==0 || uViewport) return color;
  float strength=uAtmosphereStrength;
  if(uAtmosphereMode==1){
    float haze=smoothstep(0.05,0.78,uv.y)*(0.06+0.04*sin(uv.x*8.0+uTime*2.0));
    color=mix(color,vec3(0.62,0.67,0.74),haze*strength);
  } else if(uAtmosphereMode==2){
    vec2 cell=floor(uv*uResolution/20.0);
    vec2 local=fract(uv*uResolution/20.0)-0.5;
    float n=hash21(cell);
    float spark=smoothstep(0.07,0.0,length(local))*step(0.88,n)*smoothstep(0.0,1.0,fract(n+uTime*0.12));
    color+=vec3(0.85,0.80,0.72)*spark*0.55*strength;
  } else if(uAtmosphereMode==3){
    float flow=sin((uv.x+sin(uv.y*7.0+uTime))*22.0+uTime*2.0)*0.5+0.5;
    flow*=smoothstep(0.48,0.52,flow)*0.055;
    color+=vec3(0.34,0.60,0.72)*flow*strength;
  } else if(uAtmosphereMode==4){
    vec2 p=uv-0.5;
    float a=atan(p.y,p.x);
    float r=length(p);
    float rays=pow(max(0.0,sin(a*18.0+uTime*3.0)),18.0)*smoothstep(0.45,0.02,r);
    color+=vec3(1.0,0.55,0.22)*rays*0.42*strength;
  } else if(uAtmosphereMode==5){
    vec2 p=uv-0.5;
    float r=length(p);
    float ring=exp(-abs(r-0.32)*34.0);
    float dust=step(0.84,hash21(floor((p+uTime*0.01)*uResolution/9.0)))*ring;
    color+=vec3(0.82,0.72,0.58)*dust*0.38*strength;
  } else if(uAtmosphereMode==6){
    vec2 grid=uv*uResolution/12.0;
    float column=hash21(vec2(floor(grid.x),0.0));
    float drop=fract(grid.y+uTime*(0.7+column*1.8)+column*9.0);
    float rain=smoothstep(0.12,0.0,drop)*step(0.80,column);
    color+=vec3(0.20,0.65,0.72)*rain*0.28*strength;
  }
  return color;
}
void main(){
  vec3 color=texture(uColor,vUV).rgb;
  if(!uViewport && !uBypass && uAperture>0.001){
    float depth=texture(uDepth,vUV).r;
    float focusDepth=texture(uDepth,clamp(uFocusUV,vec2(0.001),vec2(0.999))).r;
    float coc=clamp(abs(depth-focusDepth)/max(0.002,uFocalRange)*uAperture*18.0,0.0,8.0);
    color=mix(color,blurSample(vUV,1.0+coc*1.8),clamp(coc/8.0,0.0,0.92));
  }
  if(!uViewport && !uBypass && uBloom>0.001){
    vec3 blurred=blurSample(vUV,4.0+uBloom*10.0);
    float luma=dot(blurred,vec3(0.2126,0.7152,0.0722));
    color+=blurred*max(0.0,luma-uBloomThreshold)*uBloom*1.35;
  }
  if(!uViewport){
    color*=uExposure;
    float luma=dot(color,vec3(0.2126,0.7152,0.0722));
    color=mix(vec3(luma),color,uSaturation);
    color=(color-0.18)*uContrast+0.18;
    color+=vec3(uWarmth*0.075+uTint*0.018,uWarmth*0.022-uTint*0.012,-uWarmth*0.055+uTint*0.030);
    if(!uBypass) color=atmosphere(color,vUV);
  }
  color=aces(max(color,0.0));
  if(!uViewport && !uBypass){
    float vignette=smoothstep(0.86,0.22,length((vUV-0.5)*vec2(1.05,0.92)));
    color*=mix(1.0,vignette,clamp(uVignette,0.0,0.65));
    float grain=(hash21(vUV*uResolution+uTime*173.0)-0.5)*uGrain;
    color+=grain;
  }
  color=pow(clamp(color,0.0,1.0),vec3(1.0/2.2));
  outColor=vec4(color,1.0);
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

function setFloat(gl, location, value) { if (location !== null) gl.uniform1f(location, value); }
function setInt(gl, location, value) { if (location !== null) gl.uniform1i(location, value); }
function setVec2(gl, location, value) { if (location !== null) gl.uniform2fv(location, value); }
function setVec3(gl, location, value) { if (location !== null) gl.uniform3fv(location, value); }

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

function createHDRTexture(gl, decoded) {
  if (!decoded?.rgba) return null;
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, decoded.width, decoded.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, decoded.rgba);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function cycloramaGeometry() {
  const radialSegments = 96;
  const floorRadius = 12;
  const curveRadius = 5;
  const wallRadius = floorRadius + curveRadius;
  const wallHeight = 26;
  const profile = [
    { r: 0, y: 0, nr: 0, ny: 1 },
    { r: floorRadius, y: 0, nr: 0, ny: 1 },
  ];
  const curveSegments = 20;
  for (let i = 1; i <= curveSegments; i += 1) {
    const angle = (i / curveSegments) * Math.PI * 0.5;
    profile.push({
      r: floorRadius + curveRadius * Math.sin(angle),
      y: curveRadius - curveRadius * Math.cos(angle),
      nr: -Math.sin(angle),
      ny: Math.cos(angle),
    });
  }
  profile.push({ r: wallRadius, y: wallHeight, nr: -1, ny: 0 });
  const positions = [], normals = [], uvs = [], indices = [];
  for (let p = 0; p < profile.length; p += 1) {
    const point = profile[p];
    for (let i = 0; i <= radialSegments; i += 1) {
      const angle = (i / radialSegments) * Math.PI * 2;
      const c = Math.cos(angle), s = Math.sin(angle);
      positions.push(point.r * c, point.y, point.r * s);
      normals.push(point.nr * c, point.ny, point.nr * s);
      uvs.push(i / radialSegments, p / (profile.length - 1));
    }
  }
  const row = radialSegments + 1;
  for (let p = 0; p < profile.length - 1; p += 1) {
    for (let i = 0; i < radialSegments; i += 1) {
      const a = p * row + i, b = a + 1, c = a + row, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: new Uint32Array(indices) };
}

function planeGeometry() {
  return {
    positions: new Float32Array([-24,0,-24, 24,0,-24, 24,0,24, -24,0,24]),
    normals: new Float32Array([0,1,0, 0,1,0, 0,1,0, 0,1,0]),
    uvs: new Float32Array([0,0, 1,0, 1,1, 0,1]),
    indices: new Uint32Array([0,2,1,0,3,2]),
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

function sphereGeometry(segments = 48, rings = 24) {
  const positions = [], normals = [], uvs = [], indices = [];
  for (let y = 0; y <= rings; y += 1) {
    const v = y / rings;
    const phi = v * Math.PI;
    for (let x = 0; x <= segments; x += 1) {
      const u = x / segments;
      const theta = u * Math.PI * 2;
      const sx = Math.sin(phi) * Math.cos(theta);
      const sy = Math.cos(phi);
      const sz = Math.sin(phi) * Math.sin(theta);
      positions.push(sx, sy, sz); normals.push(-sx,-sy,-sz); uvs.push(u,v);
    }
  }
  const row = segments + 1;
  for (let y = 0; y < rings; y += 1) {
    for (let x = 0; x < segments; x += 1) {
      const a = y*row+x, b=a+1, c=a+row, d=c+1;
      indices.push(a,c,b,b,c,d);
    }
  }
  return { positions:new Float32Array(positions), normals:new Float32Array(normals), uvs:new Float32Array(uvs), indices:new Uint32Array(indices) };
}

function createFullscreenGeometry(gl) {
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return { vao, buffers:[buffer], count:6 };
}

function mat4EulerRadians(x=0,y=0,z=0) {
  return mat4Multiply(mat4Multiply(mat4RotationY(y), mat4RotationX(x)), mat4RotationZ(z));
}

function projectPoint(point, camera, region) {
  const viewPoint = mat4TransformPoint(camera.view, point);
  const clip = mat4TransformPoint(camera.projection, viewPoint);
  return {
    x: region.cssX + (clip[0] * 0.5 + 0.5) * region.cssWidth,
    y: region.cssY + (1 - (clip[1] * 0.5 + 0.5)) * region.cssHeight,
    z: clip[2],
  };
}

function instanceTransforms(frame) {
  const amount = clamp(frame.motionAmount || 0);
  const mode = frame.motionMode || 0;
  const transforms = [{ matrix: mat4Identity(), opacity: 1 }];
  if (mode === 4) {
    for (const x of [-2.4,-1.2,1.2,2.4]) transforms.push({ matrix: mat4Multiply(mat4Translation(x*amount,0,0),mat4Scale(0.58)), opacity:0.38 });
  } else if (mode === 5) {
    transforms.length=0;
    for(let y=-1;y<=1;y++) for(let x=-1;x<=1;x++) transforms.push({matrix:mat4Multiply(mat4Translation(x*1.65*amount,y*1.65*amount,0),mat4Scale(0.38+0.12*(1-amount))),opacity:0.78});
  } else if (mode === 6 || mode === 7) {
    const count=mode===7?10:8;
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+(frame.time||0)*1.2*(mode===7?1:-1);
      const radius=(1.1+i*0.11)*(0.5+amount*1.4);
      const y=(i-count/2)*0.18*amount;
      const transform=mat4Multiply(mat4Translation(Math.cos(a)*radius,y,Math.sin(a)*radius),mat4Multiply(mat4RotationY(-a),mat4Scale(0.32)));
      transforms.push({matrix:transform,opacity:0.48});
    }
  } else if (mode === 8) {
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      transforms.push({matrix:mat4Multiply(mat4Translation(Math.cos(a)*2.0*amount,Math.sin(a*2)*0.25*amount,Math.sin(a)*2.0*amount),mat4Multiply(mat4RotationY(a),mat4Scale(0.34))),opacity:0.48});
    }
  } else if (mode === 10) {
    for(let i=1;i<6;i++) transforms.push({matrix:mat4Multiply(mat4Translation(0,i*0.62*amount,-i*0.18*amount),mat4Multiply(mat4RotationY(i*0.14),mat4Scale(0.72))),opacity:0.52});
  } else if (mode === 11) {
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2+(frame.time||0)*Math.PI*2;
      transforms.push({matrix:mat4Multiply(mat4Translation(Math.cos(a)*2.1*amount,Math.sin(a*2)*0.55*amount,Math.sin(a)*2.1*amount),mat4Scale(0.30)),opacity:0.52});
    }
  } else if (mode === 12) {
    transforms.length=0;
    for(let i=-3;i<=3;i++) transforms.push({matrix:mat4Multiply(mat4Translation(i*1.18*amount,Math.sin(i*0.9+(frame.time||0)*Math.PI*2)*0.55*amount,0),mat4Scale(0.42)),opacity:0.72});
  } else if (mode === 13) {
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      transforms.push({matrix:mat4Multiply(mat4Translation(Math.cos(a)*2.8*amount,(i%3-1)*0.65*amount,Math.sin(a)*2.8*amount),mat4Multiply(mat4RotationY(a),mat4Scale(0.28))),opacity:0.34});
    }
  }
  return transforms;
}

export class VisualRenderer {
  constructor(canvas, {
    onContextState = () => {},
    onEditorCameraChange = () => {},
    onSelect = () => {},
    onFocusPoint = () => {},
    onTransformGesture = () => {},
  } = {}) {
    this.canvas = canvas;
    this.onContextState = onContextState;
    this.onEditorCameraChange = onEditorCameraChange;
    this.onSelect = onSelect;
    this.onFocusPoint = onFocusPoint;
    this.onTransformGesture = onTransformGesture;
    this.gl = canvas.getContext('webgl2', {
      antialias: true, alpha: false, depth: true, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
    });
    if (!this.gl) throw new Error('WebGL 2 is required to run VisualRef V49.');
    const gl = this.gl;
    this.contextCount = 1;
    this.mountCount = 0;
    this.heroMountCount = 0;
    this.renderCount = 0;
    this.splitRenderCount = 0;
    this.assets = new Map();
    this.hdriTextures = new Map();
    this.project = null;
    this.frame = null;
    this.workspace = null;
    this.invalidated = false;
    this.disposed = false;
    this.lastRegions = [];
    this.lastCameras = {};
    this.frameTimes = [];

    this.heroProgram = createProgram(gl, HERO_VERTEX, HERO_FRAGMENT);
    this.stageProgram = createProgram(gl, STAGE_VERTEX, STAGE_FRAGMENT);
    this.shadowProgram = createProgram(gl, SHADOW_VERTEX, SHADOW_FRAGMENT);
    this.lineProgram = createProgram(gl, LINE_VERTEX, LINE_FRAGMENT);
    this.envProgram = createProgram(gl, ENV_VERTEX, ENV_FRAGMENT);
    this.postProgram = createProgram(gl, POST_VERTEX, POST_FRAGMENT);

    this.heroUniforms = uniformMap(gl, this.heroProgram, [
      'uModel','uView','uProjection','uNormalMatrix','uCameraPosition','uLightDirection[0]','uLightColor[0]','uLightIntensity[0]',
      'uBaseColor','uEmissive','uMetallic','uRoughness','uAmbient','uRim','uLightWarmth','uSpecular','uOpacityMultiplier',
      'uUseTexture','uTexture','uAlphaMode','uAlphaCutoff','uDoubleSided','uUnlit','uViewportUnlit',
      'uUseEnv','uEnvMap','uEnvRotation','uEnvIntensity','uReflectionIntensity','uEnvBlur',
    ]);
    this.stageUniforms = uniformMap(gl, this.stageProgram, ['uView','uProjection','uModel','uFloorColor','uBackColor','uLightDirection','uStageScale']);
    this.shadowUniforms = uniformMap(gl, this.shadowProgram, ['uModel','uView','uProjection','uOpacity']);
    this.lineUniforms = uniformMap(gl, this.lineProgram, ['uView','uProjection']);
    this.envUniforms = uniformMap(gl, this.envProgram, ['uView','uProjection','uEnvMap','uRotation','uIntensity','uBlur']);
    this.postUniforms = uniformMap(gl, this.postProgram, [
      'uColor','uDepth','uResolution','uFocusUV','uAperture','uFocalRange','uBloom','uBloomThreshold','uExposure','uContrast','uSaturation',
      'uWarmth','uTint','uVignette','uGrain','uTime','uAtmosphereMode','uAtmosphereStrength','uBypass','uViewport',
    ]);

    this.stageGPU = createGeometry(gl, ...Object.values(cycloramaGeometry()));
    this.planeGPU = createGeometry(gl, ...Object.values(planeGeometry()));
    this.shadowGPU = createGeometry(gl, ...Object.values(shadowGeometry()));
    this.envGPU = createGeometry(gl, ...Object.values(sphereGeometry()));
    this.fullscreenGPU = createFullscreenGeometry(gl);
    this.lineVAO = gl.createVertexArray();
    this.lineBuffer = gl.createBuffer();
    gl.bindVertexArray(this.lineVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
    gl.bindVertexArray(null);

    this.target = { framebuffer: gl.createFramebuffer(), color: gl.createTexture(), depth: gl.createTexture(), width:0, height:0 };
    this.bindPointerInteractions();
    this.resizeObserver = new ResizeObserver(() => this.invalidate());
    this.resizeObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); this.onContextState({ state:'lost', message:'WebGL context was lost. The scene is preserved and will recover when the browser restores it.' }); });
    canvas.addEventListener('webglcontextrestored', () => this.onContextState({ state:'restored', message:'WebGL context restored. Reload the workspace to rebuild GPU resources safely.' }));
  }

  bindPointerInteractions() {
    const pointer = { active:false, mode:null, region:null, x:0, y:0, nodeId:null, moved:false };
    this.pointer = pointer;
    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;
      const region = this.regionFromClient(event.clientX,event.clientY);
      if (!region) return;
      pointer.active=true; pointer.region=region; pointer.x=event.clientX; pointer.y=event.clientY; pointer.moved=false;
      const tool=this.workspace?.viewportTool || 'select';
      if (region.kind==='viewport') {
        const picked=this.pickNode(event.clientX,event.clientY,region);
        if (picked) this.onSelect(picked);
        pointer.nodeId=picked || this.project?.scene?.selectedNodeId || null;
        if ((event.altKey || event.button===1 || event.button===2 || (tool==='select' && !picked))) pointer.mode='orbit';
        else if (['move','rotate','scale','pivot'].includes(tool) && pointer.nodeId) pointer.mode=tool;
        else pointer.mode='select';
      } else pointer.mode='focus';
      this.canvas.setPointerCapture?.(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!pointer.active) return;
      const dx=event.clientX-pointer.x, dy=event.clientY-pointer.y;
      if (Math.abs(dx)+Math.abs(dy)>1) pointer.moved=true;
      pointer.x=event.clientX; pointer.y=event.clientY;
      if (pointer.mode==='orbit') {
        const camera={...(this.workspace?.editorCamera || {})};
        camera.yaw=(camera.yaw || 0)-dx*0.008;
        camera.pitch=clamp((camera.pitch || 0)-dy*0.006,-1.48,1.10);
        this.onEditorCameraChange(camera); this.invalidate();
      } else if (['move','rotate','scale','pivot'].includes(pointer.mode)) {
        this.onTransformGesture({phase:'preview',tool:pointer.mode,dx,dy,nodeId:pointer.nodeId,event});
      }
    });
    const finish=(event) => {
      if (!pointer.active) return;
      if (['move','rotate','scale','pivot'].includes(pointer.mode)) this.onTransformGesture({phase:'commit',tool:pointer.mode,dx:0,dy:0,nodeId:pointer.nodeId,event});
      else if (pointer.mode==='focus' && !pointer.moved && pointer.region?.kind==='render') {
        const uv=this.focusUVFromClient(event.clientX,event.clientY,pointer.region); if(uv) this.onFocusPoint(uv);
      }
      pointer.active=false; pointer.mode=null; pointer.region=null; pointer.nodeId=null;
      this.canvas.releasePointerCapture?.(event.pointerId);
    };
    this.canvas.addEventListener('pointerup',finish);
    this.canvas.addEventListener('pointercancel',finish);
    this.canvas.addEventListener('wheel',(event)=>{
      const region=this.regionFromClient(event.clientX,event.clientY);
      if(region?.kind!=='viewport') return;
      event.preventDefault();
      const camera={...(this.workspace?.editorCamera || {})};
      camera.distance=clamp((camera.distance || 6)*Math.exp(event.deltaY*0.0012),0.8,80);
      this.onEditorCameraChange(camera); this.invalidate();
    },{passive:false});
    this.canvas.addEventListener('dblclick',(event)=>{
      const region=this.regionFromClient(event.clientX,event.clientY);
      if(!region) return;
      if(region.kind==='viewport') {
        const picked=this.pickNode(event.clientX,event.clientY,region) || this.project?.scene?.selectedNodeId;
        if(picked){ this.onSelect(picked); this.frameNode(picked); }
      } else {
        const uv=this.focusUVFromClient(event.clientX,event.clientY,region); if(uv) this.onFocusPoint(uv);
      }
    });
    this.canvas.addEventListener('contextmenu',(event)=>event.preventDefault());
  }

  setProjectState({ project, frame, workspace }) {
    this.project=project; this.frame=frame; this.workspace=workspace; this.invalidate();
  }
  setFrame(frame){ this.frame=frame; this.invalidate(); }
  setWorkspace(workspace){ this.workspace=workspace; this.invalidate(); }

  disposeAssetGPU(record) {
    const gl=this.gl;
    for(const primitive of record?.gpuPrimitives || []){
      gl.deleteVertexArray(primitive.geometry.vao);
      primitive.geometry.buffers.forEach((buffer)=>gl.deleteBuffer(buffer));
      if(primitive.texture) gl.deleteTexture(primitive.texture);
    }
  }

  uploadAsset(assetId, asset, { role='asset', countMount=true }={}) {
    const gl=this.gl;
    const next=[];
    try{
      asset.primitives.forEach((primitive,index)=>{
        next.push({
          geometry:createGeometry(gl,primitive.positions,primitive.normals,primitive.uvs,primitive.indices),
          matrix:primitive.matrix,
          material:primitive.material,
          texture:createTexture(gl,primitive.textureImage),
          explodeDirection:[Math.cos(index*2.399),((index%3)-1)*0.45,Math.sin(index*2.399)],
        });
      });
    }catch(error){
      next.forEach((primitive)=>{gl.deleteVertexArray(primitive.geometry.vao);primitive.geometry.buffers.forEach((buffer)=>gl.deleteBuffer(buffer));if(primitive.texture)gl.deleteTexture(primitive.texture);});
      throw error;
    }
    const center=boundsCenter(asset.bounds), size=boundsSize(asset.bounds), maximum=Math.max(size[0],size[1],size[2])||1;
    const target=role==='background'?8.0:role==='hero'?3.35:1.8;
    const normalizationScale=target/maximum;
    const baseMatrix=mat4Multiply(mat4Translation(-center[0]*normalizationScale,-asset.bounds.min[1]*normalizationScale,-center[2]*normalizationScale),mat4Scale(normalizationScale));
    const localBounds={min:new Float32Array([-size[0]*normalizationScale*0.5,0,-size[2]*normalizationScale*0.5]),max:new Float32Array([size[0]*normalizationScale*0.5,size[1]*normalizationScale,size[2]*normalizationScale*0.5])};
    const previous=this.assets.get(assetId); if(previous) this.disposeAssetGPU(previous);
    this.assets.set(assetId,{assetId,asset,role,gpuPrimitives:next,normalizationScale,normalizedSize:[size[0]*normalizationScale,size[1]*normalizationScale,size[2]*normalizationScale],normalizedRadius:Math.max(0.2,boundsRadius(asset.bounds)*normalizationScale),baseMatrix,localBounds});
    if(countMount){this.mountCount+=1;if(role==='hero')this.heroMountCount+=1;}
    this.invalidate();
    return this.assets.get(assetId);
  }

  async setAsset(assetId, asset, options={}) { return this.uploadAsset(assetId,asset,{...options,countMount:true}); }
  removeAsset(assetId){const record=this.assets.get(assetId);if(record)this.disposeAssetGPU(record);this.assets.delete(assetId);this.invalidate();}
  clearAssets(){for(const record of this.assets.values())this.disposeAssetGPU(record);this.assets.clear();this.invalidate();}

  setHDRI(assetId, decoded, {countMount=true}={}) {
    const gl=this.gl; const previous=this.hdriTextures.get(assetId); if(previous?.texture)gl.deleteTexture(previous.texture);
    const texture=createHDRTexture(gl,decoded); if(!texture)throw new Error('HDRI texture could not be created.');
    this.hdriTextures.set(assetId,{texture,decoded}); if(countMount)this.mountCount+=1; this.invalidate();
  }
  removeHDRI(assetId){const record=this.hdriTextures.get(assetId);if(record?.texture)this.gl.deleteTexture(record.texture);this.hdriTextures.delete(assetId);this.invalidate();}

  getAssetLocalBounds(assetId){return this.assets.get(assetId)?.localBounds || null;}
  getAssetRecord(assetId){return this.assets.get(assetId)||null;}

  resize() {
    const rect=this.canvas.getBoundingClientRect();
    const quality=this.project?.settings?.previewQuality || 'balanced';
    const cap=quality==='quality'?2:quality==='performance'?1:1.5;
    const dpr=Math.min(window.devicePixelRatio||1,cap);
    const width=Math.max(2,Math.round(rect.width*dpr)),height=Math.max(2,Math.round(rect.height*dpr));
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    return {width,height,dpr,cssWidth:rect.width,cssHeight:rect.height,rect};
  }

  ensureTarget(width,height){
    const gl=this.gl,t=this.target;if(t.width===width&&t.height===height)return;
    t.width=width;t.height=height;
    gl.bindTexture(gl.TEXTURE_2D,t.color);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindTexture(gl.TEXTURE_2D,t.depth);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,width,height,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,t.framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t.color,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,t.depth,0);
    const status=gl.checkFramebufferStatus(gl.FRAMEBUFFER);gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(status!==gl.FRAMEBUFFER_COMPLETE)throw new Error(`Post framebuffer incomplete (${status}).`);
  }

  invalidate(){if(this.invalidated||this.disposed)return;this.invalidated=true;requestAnimationFrame(()=>{this.invalidated=false;if(!this.disposed)this.render();});}

  computeRegions(viewport){
    let mode=this.workspace?.displayMode || 'render';
    if(viewport.cssWidth<600&&mode==='split')mode='render';
    const swapped=!!this.workspace?.splitSwapped;
    if(mode!=='split')return [{kind:mode==='viewport'?'viewport':'render',x:0,y:0,width:viewport.width,height:viewport.height,cssX:0,cssY:0,cssWidth:viewport.cssWidth,cssHeight:viewport.cssHeight}];
    const ratio=clamp(this.workspace?.splitRatio||0.5,0.35,0.65);
    const leftWidth=Math.round(viewport.width*ratio),leftCss=viewport.cssWidth*ratio;
    const left={kind:swapped?'viewport':'render',x:0,y:0,width:leftWidth,height:viewport.height,cssX:0,cssY:0,cssWidth:leftCss,cssHeight:viewport.cssHeight};
    const right={kind:swapped?'render':'viewport',x:leftWidth,y:0,width:viewport.width-leftWidth,height:viewport.height,cssX:leftCss,cssY:0,cssWidth:viewport.cssWidth-leftCss,cssHeight:viewport.cssHeight};
    return [left,right];
  }

  heroNodeAndAsset(){
    const assetId=this.project?.assets?.heroAssetId;const node=Object.values(this.project?.scene?.byId||{}).find((item)=>item.role==='hero'&&item.assetId===assetId)||Object.values(this.project?.scene?.byId||{}).find((item)=>item.role==='hero');
    return {node,asset:this.assets.get(node?.assetId||assetId)};
  }

  shotCameraMatrices(frame,region){
    const {node,asset}=this.heroNodeAndAsset();
    const sceneMatrix=composeNodeMatrix(node);
    const localCenter=asset?boundsCenter(asset.localBounds):[0,1.5,0];
    const center=asset?mat4TransformPoint(sceneMatrix,localCenter):vec3(0,1.5,0);
    const size=asset?.normalizedSize||[2,3,2];
    const scale=Math.max(...(node?.transform?.scale||[1,1,1]));
    const radius=Math.max(0.9,(asset?.normalizedRadius||1.8)*scale);
    const fov=clamp(frame?.fov||0.72,0.12,1.70);
    const baseDistance=radius/Math.sin(fov*0.5)*1.08;
    const distance=baseDistance*(frame?.cameraDistance||1);
    const yaw=frame?.cameraYaw||0,pitch=clamp(frame?.cameraPitch||0,-1.52,1.22);
    const target=vec3(center[0]+(frame?.targetX||0)*size[0]*scale,center[1]+(frame?.targetY||0)*size[1]*scale,center[2]);
    const cp=Math.cos(pitch);
    const eye=vec3(target[0]+Math.sin(yaw)*cp*distance,target[1]-Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*cp*distance);
    const view=mat4LookAt(eye,target);const near=Math.max(0.015,distance-radius*4.5),far=Math.max(near+10,distance+radius*12+40);
    let projection;if((frame?.orthoMix||0)>0.55){const half=radius*(frame?.cameraDistance||1)*1.15;projection=mat4Orthographic(-half*(region.width/region.height),half*(region.width/region.height),-half,half,near,far);}else{projection=mat4Perspective(fov,region.width/region.height,near,far);projection[8]+=frame?.tiltShift||0;}
    return {eye,target,view,projection,distance,near,far,type:'shot'};
  }

  editorCameraMatrices(region){
    const editor=this.workspace?.editorCamera||{yaw:-0.65,pitch:-0.18,distance:6.6,target:[0,1.5,0]};
    const target=vec3(...(editor.target||[0,1.5,0]));const yaw=editor.yaw||0,pitch=clamp(editor.pitch||0,-1.48,1.10),distance=clamp(editor.distance||6.6,0.8,80);const cp=Math.cos(pitch);
    const eye=vec3(target[0]+Math.sin(yaw)*cp*distance,target[1]-Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*cp*distance);
    const view=mat4LookAt(eye,target);const near=Math.max(0.01,distance*0.001),far=Math.max(100,distance*20);const projection=mat4Perspective(0.78,region.width/region.height,near,far);
    return {eye,target,view,projection,distance,near,far,type:'editor'};
  }

  render(){
    const started=performance.now();const gl=this.gl,viewport=this.resize();const regions=this.computeRegions(viewport);this.lastRegions=regions;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.SCISSOR_TEST);gl.viewport(0,0,viewport.width,viewport.height);gl.clearColor(0.004,0.004,0.006,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    this.lastCameras={};
    for(const region of regions){const camera=region.kind==='viewport'?this.editorCameraMatrices(region):this.shotCameraMatrices(this.frame,region);this.lastCameras[region.kind]=camera;this.renderRegion(region,camera,viewport);}
    gl.disable(gl.SCISSOR_TEST);this.renderCount+=1;if(regions.length===2)this.splitRenderCount+=1;
    const duration=performance.now()-started;this.frameTimes.push(duration);if(this.frameTimes.length>90)this.frameTimes.shift();
  }

  renderRegion(region,camera,viewport){
    const gl=this.gl;this.ensureTarget(Math.max(2,region.width),Math.max(2,region.height));
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.target.framebuffer);gl.viewport(0,0,region.width,region.height);gl.disable(gl.SCISSOR_TEST);
    const frame=this.frame||{clearColor:[0.01,0.011,0.014],stageColor:[0.115,0.12,0.132],stageBackColor:[0.05,0.054,0.064],stageVisible:true,lights:[{direction:[-.55,.72,.43],color:[1,.96,.92],intensity:1}],ambient:.28,rim:.3,specular:1};
    gl.clearColor(...(frame.clearColor||[0.01,0.011,0.014]),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    if(this.shouldDrawEnvironment(frame))this.drawEnvironment(frame,camera);
    if(frame.stageVisible)this.drawStage(frame,camera);
    this.drawSceneAssets(frame,camera,region.kind);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    const glY=viewport.height-region.y-region.height;gl.viewport(region.x,glY,region.width,region.height);gl.enable(gl.SCISSOR_TEST);gl.scissor(region.x,glY,region.width,region.height);
    this.drawPost(frame,region,region.kind);
    if(region.kind==='viewport')this.drawViewportHelpers(frame,camera,region);
  }

  shouldDrawEnvironment(frame){return !!this.activeHDRI()&&(frame.hdriVisible||this.project?.world?.hdri?.visible&&frame.stagePresetId==='hdri-world');}
  activeHDRI(){const id=this.project?.world?.hdriAssetId;return id?this.hdriTextures.get(id):null;}

  drawEnvironment(frame,camera){
    const record=this.activeHDRI();if(!record)return;const gl=this.gl,u=this.envUniforms;gl.useProgram(this.envProgram);gl.bindVertexArray(this.envGPU.vao);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.uniformMatrix4fv(u.uView,false,camera.view);gl.uniformMatrix4fv(u.uProjection,false,camera.projection);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,record.texture);setInt(gl,u.uEnvMap,0);setFloat(gl,u.uRotation,(this.project.world.hdri.rotationY||0)*Math.PI/180);setFloat(gl,u.uIntensity,this.project.world.hdri.intensity||1);setFloat(gl,u.uBlur,this.project.world.hdri.blur||0);gl.drawElements(gl.TRIANGLES,this.envGPU.count,this.envGPU.indexType,0);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
  }

  drawStage(frame,camera){
    const gl=this.gl,u=this.stageUniforms;gl.useProgram(this.stageProgram);const geometry=frame.stagePlaneOnly?this.planeGPU:this.stageGPU;gl.bindVertexArray(geometry.vao);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.depthMask(true);gl.uniformMatrix4fv(u.uView,false,camera.view);gl.uniformMatrix4fv(u.uProjection,false,camera.projection);const scale=this.project?.world?.stageScale||1;gl.uniformMatrix4fv(u.uModel,false,mat4Scale(scale));setVec3(gl,u.uFloorColor,frame.stageColor);setVec3(gl,u.uBackColor,frame.stageBackColor);setVec3(gl,u.uLightDirection,frame.lights?.[0]?.direction||[-.55,.72,.43]);setFloat(gl,u.uStageScale,scale);gl.drawElements(gl.TRIANGLES,geometry.count,geometry.indexType,0);
  }

  drawSceneAssets(frame,camera,viewKind){
    const project=this.project;if(!project)return;const nodes=(project.scene.order||[]).map((id)=>project.scene.byId[id]).filter(Boolean);
    for(const node of nodes){
      if(!node.visible)continue;const record=this.assets.get(node.assetId);if(!record)continue;
      if(node.role==='background'&&!frame.importedSetVisible&&viewKind==='render')continue;
      if(node.role==='background'&&!frame.importedSetVisible&&viewKind==='viewport'&&project.world.stagePresetId!=='imported-set')continue;
      const semantic=node.role==='hero'?this.semanticRoot(frame):mat4Identity();const scene=composeNodeMatrix(node);
      if(node.role!=='background'&&frame.stageVisible)this.drawContactShadow(frame,camera,node,record,semantic);
      const instances=node.role==='hero'?instanceTransforms(frame):[{matrix:mat4Identity(),opacity:1}];
      for(const instance of instances)this.drawAssetRecord(frame,camera,node,record,mat4Multiply(instance.matrix,mat4Multiply(semantic,scene)),instance.opacity,viewKind);
    }
  }

  semanticRoot(frame){
    const offset=frame.modelOffset||[0,0,0];
    return mat4Multiply(mat4Translation(offset[0],offset[1],offset[2]),mat4Multiply(mat4EulerRadians(frame.modelPitch||0,frame.modelYaw||0,frame.modelRoll||0),mat4Scale(frame.modelScale||1)));
  }

  drawContactShadow(frame,camera,node,record,semantic){
    if(node.role==='background'||frame.stagePresetId==='void'||frame.hdriVisible)return;const gl=this.gl,u=this.shadowUniforms;const world=mat4Multiply(semantic,composeNodeMatrix(node));const bounds=transformBounds(record.localBounds,world);if(!Number.isFinite(bounds.min[0]))return;const center=[(bounds.min[0]+bounds.max[0])/2,0.012,(bounds.min[2]+bounds.max[2])/2];const sx=Math.max(0.25,(bounds.max[0]-bounds.min[0])*.72),sz=Math.max(0.25,(bounds.max[2]-bounds.min[2])*.78);const model=mat4Multiply(mat4Translation(...center),mat4Scale(sx,1,sz));gl.useProgram(this.shadowProgram);gl.bindVertexArray(this.shadowGPU.vao);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);gl.depthMask(false);gl.uniformMatrix4fv(u.uModel,false,model);gl.uniformMatrix4fv(u.uView,false,camera.view);gl.uniformMatrix4fv(u.uProjection,false,camera.projection);setFloat(gl,u.uOpacity,node.role==='hero'?0.38:0.22);gl.drawElements(gl.TRIANGLES,this.shadowGPU.count,this.shadowGPU.indexType,0);gl.depthMask(true);gl.disable(gl.BLEND);
  }

  drawAssetRecord(frame,camera,node,record,root,opacity,viewKind){
    const gl=this.gl,u=this.heroUniforms;gl.useProgram(this.heroProgram);gl.uniformMatrix4fv(u.uView,false,camera.view);gl.uniformMatrix4fv(u.uProjection,false,camera.projection);setVec3(gl,u.uCameraPosition,camera.eye);
    const lights=(frame.lights||[]).slice(0,4);while(lights.length<4)lights.push({direction:[0,1,0],color:[1,1,1],intensity:0});gl.uniform3fv(u['uLightDirection[0]'],new Float32Array(lights.flatMap((light)=>light.direction)));gl.uniform3fv(u['uLightColor[0]'],new Float32Array(lights.flatMap((light)=>light.color)));gl.uniform1fv(u['uLightIntensity[0]'],new Float32Array(lights.map((light)=>light.intensity)));
    setFloat(gl,u.uAmbient,frame.ambient||0.2);setFloat(gl,u.uRim,frame.rim||0.3);setFloat(gl,u.uLightWarmth,frame.lightWarmth||0);setFloat(gl,u.uSpecular,frame.specular||1);setFloat(gl,u.uOpacityMultiplier,opacity);
    const hdri=this.activeHDRI();setInt(gl,u.uUseEnv,hdri?1:0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,hdri?.texture||null);setInt(gl,u.uEnvMap,1);setFloat(gl,u.uEnvRotation,(this.project?.world?.hdri?.rotationY||0)*Math.PI/180);setFloat(gl,u.uEnvIntensity,(this.project?.world?.hdri?.intensity||0)*(this.project?.world?.lighting?.hdriContribution||0));setFloat(gl,u.uReflectionIntensity,this.project?.world?.hdri?.reflectionIntensity||0);setFloat(gl,u.uEnvBlur,this.project?.world?.hdri?.blur||0);
    setInt(gl,u.uViewportUnlit,viewKind==='viewport'&&this.workspace?.viewportShading==='unlit'?1:0);
    const sorted=[...record.gpuPrimitives].sort((a,b)=>(a.material.alphaMode==='BLEND'?1:0)-(b.material.alphaMode==='BLEND'?1:0));
    sorted.forEach((primitive,index)=>{
      let explode=mat4Identity();if(node.role==='hero'&&(frame.motionMode||0)===3){const direction=primitive.explodeDirection;const amount=(frame.motionAmount||0)*1.55;explode=mat4Translation(direction[0]*amount,direction[1]*amount,direction[2]*amount);}
      const model=mat4Multiply(root,mat4Multiply(explode,mat4Multiply(record.baseMatrix,primitive.matrix||mat4Identity())));const material=primitive.material;gl.uniformMatrix4fv(u.uModel,false,model);gl.uniformMatrix3fv(u.uNormalMatrix,false,mat3NormalFromMat4(model));gl.uniform4fv(u.uBaseColor,material.baseColorFactor);gl.uniform3fv(u.uEmissive,material.emissiveFactor);setFloat(gl,u.uMetallic,material.metallicFactor);setFloat(gl,u.uRoughness,material.roughnessFactor);setInt(gl,u.uAlphaMode,material.alphaMode==='MASK'?1:material.alphaMode==='BLEND'?2:0);setFloat(gl,u.uAlphaCutoff,material.alphaCutoff);setInt(gl,u.uDoubleSided,material.doubleSided?1:0);setInt(gl,u.uUnlit,material.unlit?1:0);setInt(gl,u.uUseTexture,primitive.texture?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,primitive.texture);setInt(gl,u.uTexture,0);
      if(material.doubleSided)gl.disable(gl.CULL_FACE);else{gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);}if(material.alphaMode==='BLEND'||opacity<.999){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}else{gl.disable(gl.BLEND);gl.depthMask(true);}gl.bindVertexArray(primitive.geometry.vao);gl.drawElements(gl.TRIANGLES,primitive.geometry.count,primitive.geometry.indexType,0);
    });
    gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null);
  }

  drawPost(frame,region,kind){
    const gl=this.gl,u=this.postUniforms;gl.useProgram(this.postProgram);gl.bindVertexArray(this.fullscreenGPU.vao);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.target.color);setInt(gl,u.uColor,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.target.depth);setInt(gl,u.uDepth,1);setVec2(gl,u.uResolution,[region.width,region.height]);setVec2(gl,u.uFocusUV,frame.focusUV||this.project?.world?.post?.dof?.focusUV||[.5,.5]);setFloat(gl,u.uAperture,kind==='render'&&frame.dofEnabled?frame.aperture||0:0);setFloat(gl,u.uFocalRange,frame.focalRange||.2);setFloat(gl,u.uBloom,kind==='render'?frame.bloom||0:0);setFloat(gl,u.uBloomThreshold,frame.bloomThreshold||.72);setFloat(gl,u.uExposure,kind==='render'?frame.exposure||1:1);setFloat(gl,u.uContrast,kind==='render'?frame.contrast||1:1);setFloat(gl,u.uSaturation,kind==='render'?frame.saturation||1:1);setFloat(gl,u.uWarmth,kind==='render'?frame.gradeWarmth||0:0);setFloat(gl,u.uTint,kind==='render'?frame.gradeTint||0:0);setFloat(gl,u.uVignette,kind==='render'?frame.vignette||0:0);setFloat(gl,u.uGrain,kind==='render'&&frame.grain?frame.grainStrength||.03:0);setFloat(gl,u.uTime,frame.time||0);setInt(gl,u.uAtmosphereMode,kind==='render'?frame.atmosphereMode||0:0);setFloat(gl,u.uAtmosphereStrength,frame.atmosphereStrength||1);setInt(gl,u.uBypass,frame.postBypass?1:0);setInt(gl,u.uViewport,kind==='viewport'&&!frame.previewFx?1:0);gl.drawArrays(gl.TRIANGLES,0,this.fullscreenGPU.count);gl.enable(gl.DEPTH_TEST);
  }

  buildHelperLines(frame){
    const lines=[];const add=(a,b,color)=>{lines.push(...a,...color,...b,...color);};
    const size=10,step=1;for(let i=-size;i<=size;i+=step){const major=i===0;const c=major?[0.25,0.27,0.31]:[0.11,0.12,0.15];add([-size,0.002,i],[size,0.002,i],c);add([i,0.002,-size],[i,0.002,size],c);}add([0,0.004,0],[2.2,0.004,0],[0.78,0.25,0.20]);add([0,0.004,0],[0,2.2,0],[0.30,0.72,0.38]);add([0,0.004,0],[0,0.004,2.2],[0.24,0.48,0.90]);
    const selected=this.project?.scene?.byId?.[this.project?.scene?.selectedNodeId];const record=this.assets.get(selected?.assetId);if(selected&&record){const semantic=selected.role==='hero'?this.semanticRoot(frame):mat4Identity();const world=mat4Multiply(semantic,composeNodeMatrix(selected));const b=transformBounds(record.localBounds,world);const corners=[];for(const x of[b.min[0],b.max[0]])for(const y of[b.min[1],b.max[1]])for(const z of[b.min[2],b.max[2]])corners.push([x,y,z]);const edges=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];edges.forEach(([a,b])=>add(corners[a],corners[b],[0.80,0.62,0.44]));const pivot=mat4TransformPoint(world,selected.pivot?.position||[0,0,0]);const length=Math.max(.55,record.normalizedRadius*.38);add(pivot,[pivot[0]+length,pivot[1],pivot[2]],[0.95,0.28,0.24]);add(pivot,[pivot[0],pivot[1]+length,pivot[2]],[0.34,0.88,0.42]);add(pivot,[pivot[0],pivot[1],pivot[2]+length],[0.26,0.55,1.0]);}
    return new Float32Array(lines);
  }

  drawViewportHelpers(frame,camera){
    const gl=this.gl;const data=this.buildHelperLines(frame);if(!data.length)return;gl.useProgram(this.lineProgram);gl.bindVertexArray(this.lineVAO);gl.bindBuffer(gl.ARRAY_BUFFER,this.lineBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);gl.uniformMatrix4fv(this.lineUniforms.uView,false,camera.view);gl.uniformMatrix4fv(this.lineUniforms.uProjection,false,camera.projection);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);gl.depthMask(false);gl.drawArrays(gl.LINES,0,data.length/6);gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null);
  }

  regionFromClient(clientX,clientY){
    const rect=this.canvas.getBoundingClientRect();const x=clientX-rect.left,y=clientY-rect.top;return this.lastRegions.find((region)=>x>=region.cssX&&x<=region.cssX+region.cssWidth&&y>=region.cssY&&y<=region.cssY+region.cssHeight)||null;
  }
  focusUVFromClient(clientX,clientY,region=this.regionFromClient(clientX,clientY)){if(!region)return null;const rect=this.canvas.getBoundingClientRect();const x=clientX-rect.left-region.cssX,y=clientY-rect.top-region.cssY;return [clamp(x/region.cssWidth,.001,.999),clamp(1-y/region.cssHeight,.001,.999)];}

  pickNode(clientX,clientY,region=this.regionFromClient(clientX,clientY)){
    if(!region||region.kind!=='viewport'||!this.project)return null;const camera=this.lastCameras.viewport||this.editorCameraMatrices(region);let best=null,bestDistance=Infinity;for(const node of Object.values(this.project.scene.byId||{})){if(!node.visible)continue;const record=this.assets.get(node.assetId);if(!record)continue;const center=mat4TransformPoint(composeNodeMatrix(node),boundsCenter(record.localBounds));const projected=projectPoint(center,camera,region);if(projected.z<-1||projected.z>1)continue;const edge=mat4TransformPoint(composeNodeMatrix(node),[record.localBounds.max[0],center[1],center[2]]);const projectedEdge=projectPoint(edge,camera,region);const radius=Math.max(24,Math.abs(projectedEdge.x-projected.x));const distance=Math.hypot(clientX-this.canvas.getBoundingClientRect().left-projected.x,clientY-this.canvas.getBoundingClientRect().top-projected.y);if(distance<radius*1.25&&distance<bestDistance){best=node.id;bestDistance=distance;}}
    return best;
  }

  frameNode(nodeId){
    const node=this.project?.scene?.byId?.[nodeId],record=this.assets.get(node?.assetId);if(!node||!record)return;const world=composeNodeMatrix(node),center=mat4TransformPoint(world,boundsCenter(record.localBounds));const scale=Math.max(...(node.transform.scale||[1,1,1]));const camera={...(this.workspace?.editorCamera||{})};camera.target=[center[0],center[1],center[2]];camera.distance=Math.max(1.2,record.normalizedRadius*scale*3.0);this.onEditorCameraChange(camera);this.invalidate();
  }
  resetEditorCamera(){const hero=this.heroNodeAndAsset();if(hero.node)this.frameNode(hero.node.id);}

  getDebugState(){
    const primitiveCount=[...this.assets.values()].reduce((sum,record)=>sum+record.gpuPrimitives.length,0);const average=this.frameTimes.length?this.frameTimes.reduce((a,b)=>a+b,0)/this.frameTimes.length:0;const shot=this.lastCameras.render;return {contextCount:this.contextCount,mountCount:this.mountCount,heroMountCount:this.heroMountCount,renderCount:this.renderCount,splitRenderCount:this.splitRenderCount,assetCount:this.assets.size,primitiveCount,hdriCount:this.hdriTextures.size,gpuResourceCount:primitiveCount+this.assets.size+this.hdriTextures.size+8,lastDisplayMode:this.workspace?.displayMode||null,scissorRegions:this.lastRegions.map((region)=>({kind:region.kind,width:region.width,height:region.height})),frameTimeMs:Number(average.toFixed(3)),editorCamera:{...(this.workspace?.editorCamera||{})},shotCamera:shot?{eye:[...shot.eye],target:[...shot.target],distance:shot.distance}:null};
  }

  dispose(){this.disposed=true;this.resizeObserver?.disconnect();this.clearAssets();for(const record of this.hdriTextures.values())if(record.texture)this.gl.deleteTexture(record.texture);this.hdriTextures.clear();}
}
