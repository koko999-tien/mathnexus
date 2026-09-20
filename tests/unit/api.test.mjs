import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/gemini.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
beforeEach(() => { process.env.GEMINI_API_KEY = 'test-key'; });
afterEach(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; });

async function request(body, method = 'POST') {
  const response = { code: 200, payload: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(value) { this.payload = value; return this; } };
  await handler({ method, body }, response);
  return response;
}

test('API validates methods, malformed JSON, null and oversized messages', async () => {
  assert.equal((await request({}, 'GET')).code, 405);
  assert.equal((await request('{')).code, 400);
  assert.equal((await request('null')).code, 400);
  assert.equal((await request([])).code, 400);
  assert.equal((await request({ message: ' ' })).code, 400);
  assert.equal((await request({ message: 'x'.repeat(12001) })).code, 400);
});

test('missing API credentials are reported without attempting an upstream call', async () => {
  delete process.env.GEMINI_API_KEY;
  globalThis.fetch = () => { throw new Error('must not call'); };
  const response = await request({ message: 'hello' });
  assert.equal(response.code, 503);
  assert.equal(response.payload.code, 'MISSING_API_KEY');
});

test('API passes bounded conversation context and returns only final answer parts', async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /:generateContent$/);
    assert.equal(options.headers['x-goog-api-key'], 'test-key');
    assert.ok(options.signal);
    const body = JSON.parse(options.body);
    assert.equal(body.contents.at(-1).role, 'user');
    assert.match(body.contents.at(-1).parts[0].text, /Ngữ cảnh MathNexus/);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ thought: true, text: 'internal' }, { text: 'Kết quả là 4.' }] } }] }), { status: 200 });
  };
  const response = await request({ message: '2+2?', appContext: 'Phép cộng', history: [{ role: 'invalid', text: 'ignored' }] });
  assert.equal(response.code, 200);
  assert.equal(response.payload.text, 'Kết quả là 4.');
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('upstream timeouts produce a retryable HTTP status', async () => {
  globalThis.fetch = async () => { throw new DOMException('Timeout', 'TimeoutError'); };
  const response = await request({ message: '2+2?' });
  assert.equal(response.code, 504);
  assert.equal(response.payload.code, 'TIMEOUT');
});
