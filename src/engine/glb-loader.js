import {
  boundsEmpty,
  boundsExpandPoint,
  isFiniteBounds,
  mat4Compose,
  mat4Identity,
  mat4Multiply,
  mat4TransformPoint,
} from './math.js';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

const COMPONENTS = {
  5120: { Ctor: Int8Array, bytes: 1, getter: 'getInt8', signed: true },
  5121: { Ctor: Uint8Array, bytes: 1, getter: 'getUint8', signed: false },
  5122: { Ctor: Int16Array, bytes: 2, getter: 'getInt16', signed: true },
  5123: { Ctor: Uint16Array, bytes: 2, getter: 'getUint16', signed: false },
  5125: { Ctor: Uint32Array, bytes: 4, getter: 'getUint32', signed: false },
  5126: { Ctor: Float32Array, bytes: 4, getter: 'getFloat32', signed: true },
};
const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

export class GLBError extends Error {
  constructor(message, code = 'GLB_ERROR') { super(message); this.name = 'GLBError'; this.code = code; }
}

export function parseGLB(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer)) throw new GLBError('Expected an ArrayBuffer.', 'INVALID_INPUT');
  if (arrayBuffer.byteLength < 20) throw new GLBError('The file is too small to be a valid GLB.', 'INVALID_HEADER');
  const view = new DataView(arrayBuffer);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  const declaredLength = view.getUint32(8, true);
  if (magic !== GLB_MAGIC) throw new GLBError('This file is not a binary glTF (.glb).', 'INVALID_MAGIC');
  if (version !== 2) throw new GLBError(`Only glTF 2.0 is supported (found version ${version}).`, 'UNSUPPORTED_VERSION');
  if (declaredLength > arrayBuffer.byteLength) throw new GLBError('The GLB length header exceeds the available bytes.', 'TRUNCATED');

  let offset = 12;
  let json = null;
  let binChunk = null;
  while (offset + 8 <= declaredLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    if (offset + chunkLength > declaredLength) throw new GLBError('A GLB chunk is truncated.', 'TRUNCATED_CHUNK');
    const chunk = arrayBuffer.slice(offset, offset + chunkLength);
    if (chunkType === JSON_CHUNK) {
      const text = new TextDecoder().decode(chunk).replace(/\u0000+$/g, '').trim();
      try { json = JSON.parse(text); } catch (error) { throw new GLBError(`Invalid glTF JSON: ${error.message}`, 'INVALID_JSON'); }
    } else if (chunkType === BIN_CHUNK && !binChunk) {
      binChunk = chunk;
    }
    offset += chunkLength;
  }
  if (!json) throw new GLBError('The GLB has no JSON chunk.', 'MISSING_JSON');
  if (!binChunk && (json.buffers?.[0]?.byteLength || 0) > 0) throw new GLBError('The GLB has no binary buffer chunk.', 'MISSING_BIN');
  return { json, binChunk: binChunk || new ArrayBuffer(0), version, declaredLength };
}

function normalizedValue(value, componentType) {
  switch (componentType) {
    case 5120: return Math.max(value / 127, -1);
    case 5121: return value / 255;
    case 5122: return Math.max(value / 32767, -1);
    case 5123: return value / 65535;
    case 5125: return value / 4294967295;
    default: return value;
  }
}

function readAccessorRaw(gltf, binChunk, accessorIndex, forceFloat = false) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor) throw new GLBError(`Missing accessor ${accessorIndex}.`, 'MISSING_ACCESSOR');
  if (accessor.sparse) throw new GLBError('Sparse accessors are not supported in V48A yet.', 'SPARSE_ACCESSOR');
  const component = COMPONENTS[accessor.componentType];
  const componentCount = TYPE_COMPONENTS[accessor.type];
  if (!component || !componentCount) throw new GLBError(`Unsupported accessor format ${accessor.componentType}/${accessor.type}.`, 'ACCESSOR_FORMAT');
  const count = accessor.count || 0;
  if (accessor.bufferView == null) return new (forceFloat ? Float32Array : component.Ctor)(count * componentCount);
  const bufferView = gltf.bufferViews?.[accessor.bufferView];
  if (!bufferView) throw new GLBError(`Missing bufferView ${accessor.bufferView}.`, 'MISSING_BUFFER_VIEW');
  if ((bufferView.buffer ?? 0) !== 0) throw new GLBError('External/multiple buffers are not supported inside GLB.', 'MULTIPLE_BUFFERS');
  const elementBytes = component.bytes * componentCount;
  const stride = bufferView.byteStride || elementBytes;
  const base = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  if (base + Math.max(0, count - 1) * stride + elementBytes > binChunk.byteLength) {
    throw new GLBError(`Accessor ${accessorIndex} exceeds its binary buffer.`, 'ACCESSOR_RANGE');
  }
  const needsFloat = forceFloat || accessor.normalized || accessor.componentType === 5126;
  const Out = needsFloat ? Float32Array : component.Ctor;
  const out = new Out(count * componentCount);
  const dataView = new DataView(binChunk);
  let oi = 0;
  for (let i = 0; i < count; i += 1) {
    const elementOffset = base + i * stride;
    for (let c = 0; c < componentCount; c += 1) {
      const byteOffset = elementOffset + c * component.bytes;
      const value = component.bytes === 1 ? dataView[component.getter](byteOffset) : dataView[component.getter](byteOffset, true);
      out[oi++] = accessor.normalized ? normalizedValue(value, accessor.componentType) : value;
    }
  }
  return out;
}

function triangulate(indices, mode = 4) {
  if (mode === 4) return indices instanceof Uint32Array ? indices : new Uint32Array(indices);
  const result = [];
  if (mode === 5) {
    for (let i = 0; i < indices.length - 2; i += 1) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      if (a === b || b === c || a === c) continue;
      if (i % 2) result.push(b, a, c); else result.push(a, b, c);
    }
  } else if (mode === 6) {
    for (let i = 1; i < indices.length - 1; i += 1) result.push(indices[0], indices[i], indices[i + 1]);
  } else {
    throw new GLBError(`Primitive mode ${mode} is not supported.`, 'PRIMITIVE_MODE');
  }
  return new Uint32Array(result);
}

function nodeLocalMatrix(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return new Float32Array(node.matrix);
  return mat4Compose(node.translation || [0, 0, 0], node.rotation || [0, 0, 0, 1], node.scale || [1, 1, 1]);
}

function parseMaterials(gltf) {
  const defaults = {
    name: 'Default',
    baseColorFactor: [0.72, 0.72, 0.74, 1],
    metallicFactor: 0,
    roughnessFactor: 0.55,
    emissiveFactor: [0, 0, 0],
    alphaMode: 'OPAQUE',
    alphaCutoff: 0.5,
    doubleSided: false,
    baseColorTexture: null,
    unlit: false,
  };
  return (gltf.materials || []).map((material, index) => {
    const pbr = material.pbrMetallicRoughness || {};
    return {
      ...defaults,
      name: material.name || `Material ${index + 1}`,
      baseColorFactor: pbr.baseColorFactor || defaults.baseColorFactor,
      metallicFactor: pbr.metallicFactor ?? defaults.metallicFactor,
      roughnessFactor: pbr.roughnessFactor ?? defaults.roughnessFactor,
      emissiveFactor: material.emissiveFactor || defaults.emissiveFactor,
      alphaMode: material.alphaMode || defaults.alphaMode,
      alphaCutoff: material.alphaCutoff ?? defaults.alphaCutoff,
      doubleSided: !!material.doubleSided,
      baseColorTexture: pbr.baseColorTexture?.index ?? null,
      unlit: !!material.extensions?.KHR_materials_unlit,
    };
  });
}

async function decodeImages(gltf, binChunk) {
  if (!gltf.images?.length || typeof createImageBitmap !== 'function') return [];
  return Promise.all(gltf.images.map(async (image, index) => {
    let blob;
    if (image.bufferView != null) {
      const view = gltf.bufferViews?.[image.bufferView];
      if (!view) throw new GLBError(`Missing image bufferView ${image.bufferView}.`, 'MISSING_IMAGE_VIEW');
      const bytes = binChunk.slice(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
      blob = new Blob([bytes], { type: image.mimeType || 'image/png' });
    } else if (image.uri?.startsWith('data:')) {
      const response = await fetch(image.uri); blob = await response.blob();
    } else {
      throw new GLBError(`Image ${index} uses an external URI. Pack textures into the GLB first.`, 'EXTERNAL_IMAGE');
    }
    return createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
  }));
}

function textureImageIndices(gltf) {
  return (gltf.textures || []).map((texture) => texture.source ?? null);
}

export async function decodeGLB(arrayBuffer, { name = 'Hero.glb', onProgress = () => {} } = {}) {
  onProgress({ phase: 'decoding', progress: 0.05, label: 'Reading glTF container' });
  const { json: gltf, binChunk } = parseGLB(arrayBuffer);
  const used = new Set(gltf.extensionsUsed || []);
  if (used.has('KHR_draco_mesh_compression')) throw new GLBError('This GLB uses Draco compression. The V48A decoder pack is not included in this checkpoint.', 'DRACO_REQUIRED');
  if (used.has('EXT_meshopt_compression')) throw new GLBError('This GLB uses Meshopt compression. The V48A decoder pack is not included in this checkpoint.', 'MESHOPT_REQUIRED');

  const materials = parseMaterials(gltf);
  const images = await decodeImages(gltf, binChunk);
  const textureSources = textureImageIndices(gltf);
  const bounds = boundsEmpty();
  const primitives = [];
  const scenes = gltf.scenes || [];
  const activeScene = scenes[gltf.scene || 0] || { nodes: gltf.nodes?.map((_, i) => i) || [] };
  const totalNodes = gltf.nodes?.length || 1;
  let visited = 0;

  const visit = (nodeIndex, parentMatrix) => {
    const node = gltf.nodes?.[nodeIndex];
    if (!node) return;
    const worldMatrix = mat4Multiply(parentMatrix, nodeLocalMatrix(node));
    if (node.mesh != null) {
      const mesh = gltf.meshes?.[node.mesh];
      if (!mesh) throw new GLBError(`Node ${nodeIndex} references missing mesh ${node.mesh}.`, 'MISSING_MESH');
      for (const [primitiveIndex, primitive] of (mesh.primitives || []).entries()) {
        if (primitive.extensions?.KHR_draco_mesh_compression) throw new GLBError('A mesh primitive requires Draco compression.', 'DRACO_REQUIRED');
        const positions = readAccessorRaw(gltf, binChunk, primitive.attributes?.POSITION, true);
        if (!positions.length) continue;
        let normals = primitive.attributes?.NORMAL != null ? readAccessorRaw(gltf, binChunk, primitive.attributes.NORMAL, true) : null;
        const uvs = primitive.attributes?.TEXCOORD_0 != null ? readAccessorRaw(gltf, binChunk, primitive.attributes.TEXCOORD_0, true) : null;
        let sourceIndices;
        if (primitive.indices != null) sourceIndices = readAccessorRaw(gltf, binChunk, primitive.indices, false);
        else { sourceIndices = new Uint32Array(positions.length / 3); sourceIndices.forEach((_, i) => { sourceIndices[i] = i; }); }
        const indices = triangulate(sourceIndices, primitive.mode ?? 4);
        if (!normals || normals.length !== positions.length) normals = generateNormals(positions, indices);
        for (let i = 0; i < positions.length; i += 3) {
          boundsExpandPoint(bounds, mat4TransformPoint(worldMatrix, [positions[i], positions[i + 1], positions[i + 2]]));
        }
        const material = materials[primitive.material] || parseMaterials({ materials: [{}] })[0];
        primitives.push({
          name: `${node.name || mesh.name || 'Mesh'} · ${primitiveIndex + 1}`,
          positions,
          normals,
          uvs: uvs && uvs.length === (positions.length / 3) * 2 ? uvs : new Float32Array((positions.length / 3) * 2),
          indices,
          matrix: worldMatrix,
          material,
          textureImage: material.baseColorTexture != null ? images[textureSources[material.baseColorTexture]] || null : null,
        });
      }
    }
    visited += 1;
    onProgress({ phase: 'decoding', progress: 0.15 + 0.7 * (visited / totalNodes), label: `Decoding ${node.name || 'scene node'}` });
    for (const child of node.children || []) visit(child, worldMatrix);
  };
  for (const nodeIndex of activeScene.nodes || []) visit(nodeIndex, mat4Identity());
  if (!primitives.length) throw new GLBError('The GLB contains no supported triangle meshes.', 'NO_MESHES');
  if (!isFiniteBounds(bounds)) throw new GLBError('The mounted geometry has invalid bounds.', 'INVALID_BOUNDS');
  onProgress({ phase: 'decoding', progress: 1, label: 'Geometry decoded' });
  return {
    name,
    gltf,
    primitives,
    bounds,
    stats: {
      meshes: primitives.length,
      vertices: primitives.reduce((sum, p) => sum + p.positions.length / 3, 0),
      triangles: primitives.reduce((sum, p) => sum + p.indices.length / 3, 0),
      materials: new Set(primitives.map((p) => p.material.name)).size,
      animations: gltf.animations?.length || 0,
      textures: images.length,
    },
  };
}

function generateNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
    const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
    const abx = positions[ib] - ax, aby = positions[ib + 1] - ay, abz = positions[ib + 2] - az;
    const acx = positions[ic] - ax, acy = positions[ic + 1] - ay, acz = positions[ic + 2] - az;
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    for (const index of [ia, ib, ic]) { normals[index] += nx; normals[index + 1] += ny; normals[index + 2] += nz; }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length; normals[i + 1] /= length; normals[i + 2] /= length;
  }
  return normals;
}

export async function fetchArrayBufferWithProgress(url, onProgress = () => {}) {
  const response = await fetch(url);
  if (!response.ok) throw new GLBError(`Could not fetch starter Hero (${response.status}).`, 'FETCH_FAILED');
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body?.getReader) {
    const data = await response.arrayBuffer();
    onProgress({ loaded: data.byteLength, total: data.byteLength, ratio: 1 });
    return data;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.byteLength;
    onProgress({ loaded, total, ratio: total ? loaded / total : 0 });
  }
  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return merged.buffer;
}
