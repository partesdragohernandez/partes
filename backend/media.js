import { fail } from './http.js';
export function imageBytes(data, signature = false) {
  if (typeof data !== 'string') fail(400, 'Imagen no válida.');
  const match = data.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || data.length > (signature ? 4000000 : 16000000)) fail(400, 'Formato o tamaño de imagen no válido.');
  let bytes;
  try { bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)); } catch { fail(400, 'Imagen no válida.'); }
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (!(match[1] === 'image/png' && png || match[1] === 'image/jpeg' && jpeg || match[1] === 'image/webp' && webp)) fail(400, 'El contenido de la imagen no corresponde a su formato.');
  if (signature && !png) fail(400, 'La firma debe ser una imagen PNG del lienzo.');
  return { bytes, contentType: match[1] };
}
// Inspect actual PNG pixels rather than trusting a client-side flag.
export async function validSignature(bytes) {
  if (bytes.length < 45 || ![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) fail(400, 'Firma PNG no válida.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height, channels, ended = false; const chunks = []; let compressedSize = 0;
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset), end = offset + 12 + length;
    if (end > bytes.length) fail(400, 'Firma PNG incompleta.');
    const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));
    if (type === 'IHDR') {
      if (length !== 13 || width) fail(400, 'Firma no válida.');
      width = view.getUint32(offset + 8); height = view.getUint32(offset + 12);
      const depth = bytes[offset + 16], color = bytes[offset + 17]; channels = color === 6 ? 4 : color === 2 ? 3 : 0;
      if (!width || !height || width > 4000 || height > 2000 || width * height > 3000000 || depth !== 8 || !channels || bytes[offset + 18] || bytes[offset + 19] || bytes[offset + 20]) fail(400, 'Formato de firma no admitido. Vuelve a dibujarla.');
    } else if (type === 'IDAT') { chunks.push(bytes.subarray(offset + 8, offset + 8 + length)); compressedSize += length; }
    else if (type === 'IEND') { ended = true; break; }
    offset = end;
  }
  if (!ended || !width || !chunks.length) fail(400, 'Firma no válida.');
  const compressed = new Uint8Array(compressedSize); let pos = 0;
  for (const chunk of chunks) { compressed.set(chunk, pos); pos += chunk.length; }
  const expected = (width * channels + 1) * height; let raw;
  try {
    const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
    raw = new Uint8Array(expected); let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; if (size + value.length > expected) { await reader.cancel(); fail(400, 'Firma no válida.'); } raw.set(value, size); size += value.length; }
    if (size !== expected) fail(400, 'Firma no válida.');
  } catch { fail(400, 'No se pudo validar la firma.'); }
  const stride = width * channels; let previous = new Uint8Array(stride), current = new Uint8Array(stride), ink = 0;
  for (let y=0;y<height;y++) if(raw[y*(stride+1)]>4) fail(400,'Firma no válida.');
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; if (filter > 4) fail(400, 'Firma no válida.');
    if (filter === 0) current.set(raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)));
    else for (let x = 0; x < stride; x++) {
      const a = x >= channels ? current[x - channels] : 0, b = previous[x], c = x >= channels ? previous[x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      current[x] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) {
      const offset = x * channels;
      if ((channels === 3 || current[offset + 3] > 32) && Math.min(current[offset], current[offset + 1], current[offset + 2]) < 220) {
        ink++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    if (ink >= 12 && maxX-minX >= 3 && maxY-minY >= 3) return;
    [previous, current] = [current, previous];
  }
  if (ink < 12 || maxX - minX < 3 || maxY - minY < 3) fail(400, 'Falta una firma manuscrita: el lienzo está vacío o no contiene un trazo suficiente.');
}
export async function asDataURL(object) {
  const bytes = new Uint8Array(await object.arrayBuffer()); let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  const type = object.httpMetadata?.contentType || 'image/png';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) fail(400, 'Formato de imagen no admitido.');
  return `data:${type};base64,${btoa(binary)}`;
}
