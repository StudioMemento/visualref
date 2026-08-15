import {
  boundsEmpty,
  boundsExpandPoint,
  degToRad,
  mat4Identity,
  mat4Multiply,
  mat4RotationX,
  mat4RotationY,
  mat4RotationZ,
  mat4Scale,
  mat4TransformPoint,
  mat4Translation,
} from '../engine/math.js';

export function eulerMatrix(rotation = [0, 0, 0]) {
  return mat4Multiply(
    mat4Multiply(mat4RotationY(degToRad(rotation[1] || 0)), mat4RotationX(degToRad(rotation[0] || 0))),
    mat4RotationZ(degToRad(rotation[2] || 0)),
  );
}

export function composeNodeMatrix(node) {
  if (!node) return mat4Identity();
  const transform = node.transform || {};
  const position = transform.position || [0, 0, 0];
  const rotation = transform.rotation || [0, 0, 0];
  const scale = transform.scale || [1, 1, 1];
  const pivot = node.pivot?.position || [0, 0, 0];
  return mat4Multiply(
    mat4Multiply(
      mat4Multiply(
        mat4Multiply(mat4Translation(...position), mat4Translation(...pivot)),
        eulerMatrix(rotation),
      ),
      mat4Scale(scale[0], scale[1], scale[2]),
    ),
    mat4Translation(-pivot[0], -pivot[1], -pivot[2]),
  );
}

export function transformBounds(bounds, matrix) {
  const out = boundsEmpty();
  if (!bounds) return out;
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        boundsExpandPoint(out, mat4TransformPoint(matrix, [x, y, z]));
      }
    }
  }
  return out;
}

function transformVectorByRotationScale(vector, rotation, scale) {
  const matrix = mat4Multiply(eulerMatrix(rotation), mat4Scale(scale[0], scale[1], scale[2]));
  const origin = mat4TransformPoint(matrix, [0, 0, 0]);
  const point = mat4TransformPoint(matrix, vector);
  return [point[0] - origin[0], point[1] - origin[1], point[2] - origin[2]];
}

export function pivotPositionPreservingGeometry(node, newPivot) {
  const oldPivot = node.pivot?.position || [0, 0, 0];
  const rotation = node.transform?.rotation || [0, 0, 0];
  const scale = node.transform?.scale || [1, 1, 1];
  const delta = [oldPivot[0] - newPivot[0], oldPivot[1] - newPivot[1], oldPivot[2] - newPivot[2]];
  const transformed = transformVectorByRotationScale(delta, rotation, scale);
  const correction = [delta[0] - transformed[0], delta[1] - transformed[1], delta[2] - transformed[2]];
  const position = node.transform?.position || [0, 0, 0];
  return [position[0] + correction[0], position[1] + correction[1], position[2] + correction[2]];
}

export function groundNodeTransform(node, localBounds) {
  const matrix = composeNodeMatrix(node);
  const bounds = transformBounds(localBounds, matrix);
  const next = [...node.transform.position];
  if (Number.isFinite(bounds.min[1])) next[1] -= bounds.min[1];
  return next;
}

export function snapValue(value, step) {
  const size = Math.max(0.0001, Number(step) || 1);
  return Math.round(value / size) * size;
}

export function transformNearlyEqual(a, b, epsilon = 1e-5) {
  return ['position', 'rotation', 'scale'].every((key) => (a[key] || []).every((value, index) => Math.abs(value - (b[key]?.[index] ?? value)) <= epsilon));
}
