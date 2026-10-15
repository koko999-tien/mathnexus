import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/gemini.js';

const SMALL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'.repeat(12);

function mockResponse({ streaming = false } = {}) {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    chunks: [],
    ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    ...(streaming
      ? {
        write(chunk) { this.chunks.push(String(chunk)); return true; },
        end() { this.ended = true; return this; },
      }
      : {}),
  };
}

function withEnv(fn) {
  return async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    process.env.GEMINI_API_KEY = 'unit-test-key';
    process.env.GEMINI_MODEL = 'unit-test-model';
    try {
      await fn();
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalKey;
      if (originalModel === undefined) delete process.env.GEMINI_MODEL;
      else process.env.GEMINI_MODEL = originalModel;
    }
  };
}

function sseUpstream(texts) {
  const body = texts
    .map(text => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`)
    .join('');
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

test('stream request returns SSE deltas and a done event', withEnv(async () => {
  globalThis.fetch = async url => {
    assert.match(String(url), /streamGenerateContent/);
    return sseUpstream(['Chào ', 'bạn!']);
  };

  const response = mockResponse({ streaming: true });
  await handler({ method: 'POST', body: { message: 'Xin chào', stream: true } }, response);

  assert.equal(response.headers['Content-Type'], 'text/event-stream; charset=utf-8');
  assert.equal(response.ended, true);
  const events = response.chunks.join('').split('\n\n').filter(Boolean)
    .map(block => JSON.parse(block.replace(/^data:\s*/, '')));
  assert.equal(events[0].type, 'start');
  assert.deepEqual(events.filter(e => e.type === 'delta').map(e => e.delta), ['Chào ', 'bạn!']);
  const done = events.at(-1);
  assert.equal(done.type, 'done');
  assert.equal(done.text, 'Chào bạn!');
}));

test('stream request without streaming-capable response falls back to JSON', withEnv(async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { modelVersion: 'unit-test-model', candidates: [{ content: { parts: [{ text: 'Câu trả lời JSON.' }] } }] };
    },
  });

  const response = mockResponse();
  await handler({ method: 'POST', body: { message: 'Xin chào', stream: true } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.text, 'Câu trả lời JSON.');
}));

test('valid image is forwarded to Gemini as inlineData', withEnv(async () => {
  let upstreamBody = null;
  globalThis.fetch = async (_url, options) => {
    upstreamBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      async json() {
        return { modelVersion: 'unit-test-model', candidates: [{ content: { parts: [{ text: 'Trong ảnh là tam giác vuông.' }] } }] };
      },
    };
  };

  const response = mockResponse();
  await handler({
    method: 'POST',
    body: { message: '', image: { mime: 'image/png', data: SMALL_PNG_BASE64 } },
  }, response);

  assert.equal(response.statusCode, 200);
  const lastParts = upstreamBody.contents.at(-1).parts;
  assert.equal(lastParts.length, 2);
  assert.equal(lastParts[1].inlineData.mimeType, 'image/png');
  assert.equal(lastParts[1].inlineData.data, SMALL_PNG_BASE64);
}));

test('image with disallowed mime type is rejected', withEnv(async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('must not call upstream'); };

  const response = mockResponse();
  await handler({
    method: 'POST',
    body: { message: 'Giải giúp mình', image: { mime: 'image/gif', data: SMALL_PNG_BASE64 } },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.code, 'INVALID_IMAGE');
  assert.equal(called, false);
}));

test('oversized image is rejected before calling upstream', withEnv(async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('must not call upstream'); };

  const response = mockResponse();
  await handler({
    method: 'POST',
    body: { message: 'Giải giúp mình', image: { mime: 'image/jpeg', data: 'a'.repeat(3 * 1024 * 1024 + 1) } },
  }, response);

  assert.equal(response.statusCode, 413);
  assert.equal(response.payload.code, 'IMAGE_TOO_LARGE');
  assert.equal(called, false);
}));

test('empty message without image is still rejected', withEnv(async () => {
  const response = mockResponse();
  await handler({ method: 'POST', body: { message: '   ' } }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.code, 'EMPTY_MESSAGE');
}));
