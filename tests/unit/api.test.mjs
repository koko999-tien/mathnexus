import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/gemini.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-3.8-flash';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
});

async function request(body, method = 'POST') {
  const response = {
    code: 200,
    payload: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; },
    json(value) { this.payload = value; return this; },
  };
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
    return new Response(JSON.stringify({
      modelVersion: 'gemini-test-version',
      candidates: [{ content: { parts: [{ thought: true, text: 'internal' }, { text: 'Kết quả là 4.' }] } }],
    }), { status: 200 });
  };
  const response = await request({ message: '2+2?', appContext: 'Phép cộng', history: [{ role: 'invalid', text: 'ignored' }] });
  assert.equal(response.code, 200);
  assert.equal(response.payload.text, 'Kết quả là 4.');
  assert.equal(response.payload.model, 'gemini-test-version');
  assert.equal(response.payload.fallbackUsed, false);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('transport timeouts are retried and can recover on the same model', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new DOMException('Timeout', 'TimeoutError');
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Đã phục hồi.' }] } }],
    }), { status: 200 });
  };

  const response = await request({ message: '2+2?' });
  assert.equal(response.code, 200);
  assert.equal(response.payload.text, 'Đã phục hồi.');
  assert.equal(calls, 2);
});

test('invalid configured model falls back to a stable model', async () => {
  process.env.GEMINI_MODEL = 'invalid-model-for-test';
  const urls = [];

  globalThis.fetch = async url => {
    urls.push(String(url));
    if (urls.length === 1) {
      return new Response(JSON.stringify({
        error: { status: 'NOT_FOUND', message: 'model not found' },
      }), { status: 404 });
    }
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Fallback hoạt động.' }] } }],
    }), { status: 200 });
  };

  const response = await request({ message: 'hello' });
  assert.equal(response.code, 200);
  assert.equal(response.payload.text, 'Fallback hoạt động.');
  assert.equal(response.payload.fallbackUsed, true);
  assert.equal(urls.length, 2);
  assert.match(urls[1], /gemini-3\.8-flash/);
});
