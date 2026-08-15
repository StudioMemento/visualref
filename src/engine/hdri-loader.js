export class HDRIError extends Error {
  constructor(message, code = 'HDRI_ERROR') { super(message); this.name = 'HDRIError'; this.code = code; }
}

const textDecoder = new TextDecoder('ascii');

function findHeaderEnd(bytes) {
  for (let i = 0; i < bytes.length - 1; i += 1) {
    if (bytes[i] === 10 && bytes[i + 1] === 10) return i + 2;
    if (i < bytes.length - 3 && bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) return i + 4;
  }
  return -1;
}

function readLine(bytes, start) {
  let end = start;
  while (end < bytes.length && bytes[end] !== 10) end += 1;
  const text = textDecoder.decode(bytes.subarray(start, end)).replace(/\r$/, '');
  return { text, next: Math.min(bytes.length, end + 1) };
}

function decodeScanlineRLE(bytes, offset, width) {
  if (offset + 4 > bytes.length) throw new HDRIError('HDR scanline is truncated.', 'TRUNCATED_SCANLINE');
  if (bytes[offset] !== 2 || bytes[offset + 1] !== 2 || (bytes[offset + 2] & 0x80)) return null;
  const encodedWidth = (bytes[offset + 2] << 8) | bytes[offset + 3];
  if (encodedWidth !== width) throw new HDRIError('HDR scanline width does not match the header.', 'INVALID_SCANLINE_WIDTH');
  offset += 4;
  const scanline = new Uint8Array(width * 4);
  for (let channel = 0; channel < 4; channel += 1) {
    let cursor = 0;
    while (cursor < width) {
      if (offset >= bytes.length) throw new HDRIError('HDR RLE data is truncated.', 'TRUNCATED_RLE');
      const count = bytes[offset++];
      if (count > 128) {
        const run = count - 128;
        if (!run || cursor + run > width || offset >= bytes.length) throw new HDRIError('HDR RLE run is invalid.', 'INVALID_RLE');
        const value = bytes[offset++];
        for (let i = 0; i < run; i += 1) scanline[(cursor + i) * 4 + channel] = value;
        cursor += run;
      } else {
        const literal = count;
        if (!literal || cursor + literal > width || offset + literal > bytes.length) throw new HDRIError('HDR RLE literal is invalid.', 'INVALID_RLE');
        for (let i = 0; i < literal; i += 1) scanline[(cursor + i) * 4 + channel] = bytes[offset++];
        cursor += literal;
      }
    }
  }
  return { scanline, offset };
}

function rgbeToLinear(r, g, b, e) {
  if (!e) return [0, 0, 0];
  const factor = Math.pow(2, e - 128) / 256;
  return [r * factor, g * factor, b * factor];
}

export function decodeRadianceHDR(arrayBuffer, { exposure = 1 } = {}) {
  if (!(arrayBuffer instanceof ArrayBuffer)) throw new HDRIError('Expected an ArrayBuffer.', 'INVALID_INPUT');
  const bytes = new Uint8Array(arrayBuffer);
  const headerEnd = findHeaderEnd(bytes);
  if (headerEnd < 0) throw new HDRIError('Radiance HDR header terminator is missing.', 'INVALID_HEADER');
  const header = textDecoder.decode(bytes.subarray(0, headerEnd));
  if (!/^#\?(RADIANCE|RGBE)/m.test(header)) throw new HDRIError('This is not a Radiance RGBE HDR file.', 'INVALID_MAGIC');
  if (!/FORMAT=32-bit_rle_rgbe/m.test(header)) throw new HDRIError('Only 32-bit RLE RGBE HDR files are supported.', 'UNSUPPORTED_FORMAT');

  const resolutionLine = readLine(bytes, headerEnd);
  const match = resolutionLine.text.trim().match(/^(-Y|\+Y)\s+(\d+)\s+([+-]X)\s+(\d+)$/i);
  if (!match) throw new HDRIError('HDR resolution line is invalid.', 'INVALID_RESOLUTION');
  const yDirection = match[1].toUpperCase();
  const height = Number(match[2]);
  const xDirection = match[3].toUpperCase();
  const width = Number(match[4]);
  if (!width || !height || width > 16384 || height > 8192) throw new HDRIError('HDR dimensions are unsupported.', 'UNSUPPORTED_DIMENSIONS');

  const rgbe = new Uint8Array(width * height * 4);
  let offset = resolutionLine.next;
  for (let y = 0; y < height; y += 1) {
    const decoded = decodeScanlineRLE(bytes, offset, width);
    let scanline;
    if (decoded) {
      scanline = decoded.scanline;
      offset = decoded.offset;
    } else {
      const length = width * 4;
      if (offset + length > bytes.length) throw new HDRIError('HDR pixel data is truncated.', 'TRUNCATED_PIXELS');
      scanline = bytes.subarray(offset, offset + length);
      offset += length;
    }
    const targetY = yDirection === '-Y' ? y : (height - 1 - y);
    for (let x = 0; x < width; x += 1) {
      const targetX = xDirection === '+X' ? x : (width - 1 - x);
      rgbe.set(scanline.subarray(x * 4, x * 4 + 4), (targetY * width + targetX) * 4);
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  const average = [0, 0, 0];
  let maxLuminance = 0;
  let luminanceSum = 0;
  const sampleStep = Math.max(1, Math.floor((width * height) / 600000));
  let samples = 0;
  for (let i = 0; i < width * height; i += 1) {
    const [r, g, b] = rgbeToLinear(rgbe[i * 4], rgbe[i * 4 + 1], rgbe[i * 4 + 2], rgbe[i * 4 + 3]);
    const mappedR = 1 - Math.exp(-r * exposure);
    const mappedG = 1 - Math.exp(-g * exposure);
    const mappedB = 1 - Math.exp(-b * exposure);
    rgba[i * 4] = Math.round(Math.pow(Math.max(0, mappedR), 1 / 2.2) * 255);
    rgba[i * 4 + 1] = Math.round(Math.pow(Math.max(0, mappedG), 1 / 2.2) * 255);
    rgba[i * 4 + 2] = Math.round(Math.pow(Math.max(0, mappedB), 1 / 2.2) * 255);
    rgba[i * 4 + 3] = 255;
    if (i % sampleStep === 0) {
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      average[0] += r; average[1] += g; average[2] += b;
      maxLuminance = Math.max(maxLuminance, luminance);
      luminanceSum += luminance;
      samples += 1;
    }
  }
  if (samples) {
    average[0] /= samples; average[1] /= samples; average[2] /= samples;
  }
  return {
    width,
    height,
    rgba,
    average,
    averageLuminance: samples ? luminanceSum / samples : 0,
    maxLuminance,
    format: 'radiance-rgbe',
  };
}

export function decodeHDRI(arrayBuffer, { name = 'Environment.hdr', exposure = 1 } = {}) {
  const lower = String(name).toLowerCase();
  if (lower.endsWith('.exr')) throw new HDRIError('OpenEXR is not enabled in this offline V49 build. Use a Radiance .hdr file.', 'EXR_NOT_ENABLED');
  if (!lower.endsWith('.hdr')) throw new HDRIError('Choose a Radiance .hdr environment file.', 'UNSUPPORTED_EXTENSION');
  return decodeRadianceHDR(arrayBuffer, { exposure });
}
