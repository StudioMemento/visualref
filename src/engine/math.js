export const EPSILON = 1e-6;
export const TAU = Math.PI * 2;

export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const degToRad = (value) => value * Math.PI / 180;
export const radToDeg = (value) => value * 180 / Math.PI;

export function vec3(x = 0, y = 0, z = 0) { return new Float32Array([x, y, z]); }
export function vec3Clone(a) { return new Float32Array(a); }
export function vec3Add(a, b) { return vec3(a[0] + b[0], a[1] + b[1], a[2] + b[2]); }
export function vec3Sub(a, b) { return vec3(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
export function vec3Scale(a, s) { return vec3(a[0] * s, a[1] * s, a[2] * s); }
export function vec3Dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function vec3Cross(a, b) {
  return vec3(
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  );
}
export function vec3Length(a) { return Math.hypot(a[0], a[1], a[2]); }
export function vec3Normalize(a) {
  const len = vec3Length(a) || 1;
  return vec3(a[0] / len, a[1] / len, a[2] / len);
}
export function vec3Lerp(a, b, t) { return vec3(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)); }

export function mat4Identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

export function mat4Clone(a) { return new Float32Array(a); }

export function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

export function mat4Translation(x = 0, y = 0, z = 0) {
  const out = mat4Identity();
  out[12] = x; out[13] = y; out[14] = z;
  return out;
}

export function mat4Scale(x = 1, y = x, z = x) {
  const out = mat4Identity();
  out[0] = x; out[5] = y; out[10] = z;
  return out;
}

export function mat4RotationX(rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
}

export function mat4RotationY(rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

export function mat4RotationZ(rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

export function mat4FromQuaternion(q = [0, 0, 0, 1]) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return new Float32Array([
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    0, 0, 0, 1,
  ]);
}

export function mat4Compose(translation = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1]) {
  const r = mat4FromQuaternion(rotation);
  r[0] *= scale[0]; r[1] *= scale[0]; r[2] *= scale[0];
  r[4] *= scale[1]; r[5] *= scale[1]; r[6] *= scale[1];
  r[8] *= scale[2]; r[9] *= scale[2]; r[10] *= scale[2];
  r[12] = translation[0]; r[13] = translation[1]; r[14] = translation[2];
  return r;
}

export function mat4Perspective(fovYRadians, aspect, near, far) {
  const f = 1 / Math.tan(fovYRadians / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0,
  ]);
}

export function mat4Orthographic(left, right, bottom, top, near, far) {
  const lr = 1 / (left - right), bt = 1 / (bottom - top), nf = 1 / (near - far);
  return new Float32Array([
    -2 * lr, 0, 0, 0,
    0, -2 * bt, 0, 0,
    0, 0, 2 * nf, 0,
    (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1,
  ]);
}

export function mat4LookAt(eye, target, up = [0, 1, 0]) {
  const z = vec3Normalize(vec3Sub(eye, target));
  let x = vec3Normalize(vec3Cross(up, z));
  if (vec3Length(x) < EPSILON) x = vec3(1, 0, 0);
  const y = vec3Cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -vec3Dot(x, eye), -vec3Dot(y, eye), -vec3Dot(z, eye), 1,
  ]);
}

export function mat4TransformPoint(m, p) {
  const x = p[0], y = p[1], z = p[2];
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
  return vec3(
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  );
}

export function mat4TransformDirection(m, p) {
  return vec3(
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2],
  );
}

export function mat3NormalFromMat4(m) {
  const a00 = m[0], a01 = m[1], a02 = m[2];
  const a10 = m[4], a11 = m[5], a12 = m[6];
  const a20 = m[8], a21 = m[9], a22 = m[10];
  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  let det = a00 * b01 + a01 * b11 + a02 * b21;
  if (!det) return new Float32Array([1,0,0,0,1,0,0,0,1]);
  det = 1 / det;
  const inv = [
    b01 * det,
    (-a22 * a01 + a02 * a21) * det,
    (a12 * a01 - a02 * a11) * det,
    b11 * det,
    (a22 * a00 - a02 * a20) * det,
    (-a12 * a00 + a02 * a10) * det,
    b21 * det,
    (-a21 * a00 + a01 * a20) * det,
    (a11 * a00 - a01 * a10) * det,
  ];
  // transpose inverse, column-major mat3
  return new Float32Array([
    inv[0], inv[3], inv[6],
    inv[1], inv[4], inv[7],
    inv[2], inv[5], inv[8],
  ]);
}

export function boundsEmpty() {
  return { min: vec3(Infinity, Infinity, Infinity), max: vec3(-Infinity, -Infinity, -Infinity) };
}

export function boundsExpandPoint(bounds, point) {
  for (let i = 0; i < 3; i += 1) {
    bounds.min[i] = Math.min(bounds.min[i], point[i]);
    bounds.max[i] = Math.max(bounds.max[i], point[i]);
  }
  return bounds;
}

export function boundsMerge(a, b) {
  boundsExpandPoint(a, b.min); boundsExpandPoint(a, b.max); return a;
}

export function boundsCenter(bounds) {
  return vec3(
    (bounds.min[0] + bounds.max[0]) * 0.5,
    (bounds.min[1] + bounds.max[1]) * 0.5,
    (bounds.min[2] + bounds.max[2]) * 0.5,
  );
}

export function boundsSize(bounds) {
  return vec3(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]);
}

export function boundsRadius(bounds) {
  return vec3Length(boundsSize(bounds)) * 0.5;
}

export function isFiniteBounds(bounds) {
  return [...bounds.min, ...bounds.max].every(Number.isFinite);
}
