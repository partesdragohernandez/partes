import { test } from 'node:test';
import assert from 'node:assert/strict';
import { improveText } from '../improve-text.js';
import worker from '../worker.js';

const request = data => new Request('https://partes.example/api/improve-text', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
test('validación y secret ausente no llaman a Gemini', async () => {
  assert.equal((await improveText(request({ text: '' }), {})).status, 400);
  assert.equal((await improveText(request({ text: 'texto', dni: 'privado' }), {})).status, 400);
  assert.equal((await improveText(request({ text: 'a'.repeat(4001) }), {})).status, 413);
  assert.equal((await worker.fetch(request({ text: 'texto' }), {})).status, 503);
  assert.equal((await improveText(new Request('https://partes.example/api/improve-text'), {})).status, 405);
});
test('solo envía el texto y devuelve únicamente la propuesta completa', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(!url.includes('test-secret'));
      assert.equal(options.headers['x-goog-api-key'], 'test-secret');
      const body = JSON.parse(options.body);
      assert.deepEqual(body.contents, [{ role: 'user', parts: [{ text: 'hay umedad' }] }]);
      assert.deepEqual(Object.keys(body).sort(), ['contents', 'generationConfig', 'systemInstruction']);
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Hay humedad.' }] } }] });
    };
    const result = await improveText(request({ text: 'hay umedad' }), { GEMINI_API_KEY: 'test-secret' });
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await result.json(), { text: 'Hay humedad.' });
    for (const status of [429, 403, 500]) {
      globalThis.fetch = async () => new Response('sensitive upstream error', { status });
      const result = await improveText(request({ text: 'texto' }), { GEMINI_API_KEY: 'test-secret' });
      assert.equal(result.status, status === 429 ? 429 : 502);
      assert.ok(!(await result.text()).includes('sensitive'));
    }
    globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Parcial' }] } }] });
    assert.equal((await improveText(request({ text: 'texto' }), { GEMINI_API_KEY: 'test-secret' })).status, 502);
    globalThis.fetch = async () => { throw new Error('secret'); };
    assert.equal((await improveText(request({ text: 'texto' }), { GEMINI_API_KEY: 'test-secret' })).status, 504);
  } finally { globalThis.fetch = original; }
});
