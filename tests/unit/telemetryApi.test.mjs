import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/telemetry.js';

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test('telemetry endpoint logs only whitelisted error metadata', async () => {
  const originalInfo = console.info;
  const logs = [];
  console.info = (...args) => logs.push(args.join(' '));

  try {
    const response = mockResponse();
    await handler({
      method: 'POST',
      headers: {
        origin: 'https://mathnexus.example',
        host: 'mathnexus.example',
        'x-forwarded-for': '203.0.113.41',
      },
      body: {
        type: 'client_error',
        route: '/ai',
        source: 'react_boundary',
        errorName: 'TypeError',
        file: 'index-Abc123.js',
        line: 120,
        column: 14,
        message: 'Câu hỏi AI bí mật của người dùng',
        notes: 'Nội dung sổ tay tuyệt đối không được log',
        localStorage: { progress: 'private' },
      },
    }, response);

    assert.equal(response.statusCode, 202);
    assert.equal(response.payload.ok, true);
    assert.equal(typeof response.payload.requestId, 'string');
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.equal(response.headers['X-RateLimit-Limit'], '120');
    assert.equal(logs.length, 1);

    const logged = logs[0];
    assert.match(logged, /"type":"client_error"/);
    assert.match(logged, /"route":"\/ai"/);
    assert.match(logged, /"errorName":"TypeError"/);
    assert.doesNotMatch(logged, /Câu hỏi AI bí mật/);
    assert.doesNotMatch(logged, /Nội dung sổ tay/);
    assert.doesNotMatch(logged, /localStorage|progress/);
  } finally {
    console.info = originalInfo;
  }
});

test('telemetry endpoint accepts bounded performance metrics and drops extra fields', async () => {
  const originalInfo = console.info;
  const logs = [];
  console.info = (...args) => logs.push(args.join(' '));

  try {
    const response = mockResponse();
    await handler({
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.42' },
      body: {
        type: 'performance',
        route: '/lesson/:id',
        metrics: { lcp: 2345.678, cls: 0.12345, ttfb: 180.2, dcl: 900.1 },
        aiPrompt: 'do not log me',
      },
    }, response);

    assert.equal(response.statusCode, 202);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /"lcp":2345.68/);
    assert.match(logs[0], /"cls":0.12/);
    assert.doesNotMatch(logs[0], /aiPrompt|do not log me/);
  } finally {
    console.info = originalInfo;
  }
});

test('telemetry endpoint rejects unsafe origins, oversized bodies and raw query routes', async () => {
  const crossOrigin = mockResponse();
  await handler({
    method: 'POST',
    headers: { origin: 'https://evil.example', host: 'mathnexus.example' },
    body: { type: 'performance', route: '/', metrics: { lcp: 100 } },
  }, crossOrigin);
  assert.equal(crossOrigin.statusCode, 403);
  assert.equal(crossOrigin.payload.code, 'ORIGIN_NOT_ALLOWED');

  const oversized = mockResponse();
  await handler({
    method: 'POST',
    headers: { 'content-length': String(16 * 1024 + 1) },
    body: { type: 'performance', route: '/', metrics: { lcp: 100 } },
  }, oversized);
  assert.equal(oversized.statusCode, 413);
  assert.equal(oversized.payload.code, 'REQUEST_TOO_LARGE');

  const queryRoute = mockResponse();
  await handler({
    method: 'POST',
    headers: {},
    body: { type: 'performance', route: '/ai?q=private', metrics: { lcp: 100 } },
  }, queryRoute);
  assert.equal(queryRoute.statusCode, 400);
  assert.equal(queryRoute.payload.code, 'INVALID_EVENT');
});
