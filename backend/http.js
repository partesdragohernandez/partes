export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function fail(status, message) { throw new HttpError(status, message); }
export const json = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers }
});
export async function body(request, max = 16000) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) fail(415, 'Se requiere JSON.');
  const reader = request.body?.getReader(); if (!reader) fail(400, 'Falta el contenido.');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); fail(413, 'Contenido demasiado grande.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const result = JSON.parse(new TextDecoder().decode(bytes));
    if (!result || typeof result !== 'object' || Array.isArray(result)) fail(400, 'JSON no válido.');
    return result;
  } catch { fail(400, 'JSON no válido.'); }
}
export function csrf(request) {
  if (['GET', 'HEAD'].includes(request.method)) return;
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('x-requested-with') !== 'partes') {
    fail(403, 'Origen de petición no permitido.');
  }
}
export function exactKeys(data, keys) {
  if (Object.keys(data).some(key => !keys.includes(key))) fail(400, 'La petición contiene campos no permitidos.');
}
export function text(value, name, max = 200, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, `Revisa ${name}.`);
  return value.trim();
}
export function canaryDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Atlantic/Canary', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
