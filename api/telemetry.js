import { randomUUID } from 'node:crypto';

const MAX_BODY_BYTES = 16 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const rateBuckets = new Map();

const ERROR_SOURCES = new Set([
  'window_error',
  'unhandled_rejection',
  'react_boundary',
  'storage',
]);

function headerValue(request, name) {
  const headers = request?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') return String(headers.get(name) || '').trim();
  const direct = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(direct) ? String(direct[0] || '').trim() : String(direct || '').trim();
}

function bodyBytes(request) {
  const contentLength = Number(headerValue(request, 'content-length'));
  if (Number.isFinite(contentLength) && contentLength >= 0) return contentLength;
  try {
    if (typeof request.body === 'string') return Buffer.byteLength(request.body, 'utf8');
    if (request.body && typeof request.body === 'object') return Buffer.byteLength(JSON.stringify(request.body), 'utf8');
  } catch {
    return MAX_BODY_BYTES + 1;
  }
  return 0;
}

function sameOriginBrowserRequest(request) {
  const origin = headerValue(request, 'origin');
  if (!origin) return true;
  const host = headerValue(request, 'x-forwarded-host') || headerValue(request, 'host');
  if (!host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientAddress(request) {
  const forwarded = headerValue(request, 'x-forwarded-for');
  return forwarded.split(',')[0]?.trim() || headerValue(request, 'x-real-ip') || '';
}

function consumeRateLimit(request, now = Date.now()) {
  const key = clientAddress(request);
  if (!key) return { allowed: true, remaining: RATE_LIMIT, retryAfterSeconds: 0 };

  if (rateBuckets.size > 2048) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }

  const existing = rateBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + RATE_WINDOW_MS }
    : existing;

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function parseBody(request) {
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}');
  return request.body || {};
}

function safeRoute(value) {
  if (typeof value !== 'string') return null;
  const route = value.trim();
  if (!route.startsWith('/') || route.includes('?') || route.includes('#') || route.length > 160) return null;
  return route;
}

function safeToken(value, maxLength = 80) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength).replace(/[^a-zA-Z0-9_.:\-/]/g, '_');
}

function safeMetric(value, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) return null;
  return Math.round(value * 100) / 100;
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const route = safeRoute(raw.route);
  if (!route) return null;

  if (raw.type === 'client_error') {
    const source = ERROR_SOURCES.has(raw.source) ? raw.source : null;
    const errorName = safeToken(raw.errorName, 80);
    if (!source || !errorName) return null;

    const event = {
      type: 'client_error',
      route,
      source,
      errorName,
    };

    const file = safeToken(raw.file, 120);
    const line = Number.isInteger(raw.line) && raw.line >= 0 && raw.line <= 10_000_000 ? raw.line : null;
    const column = Number.isInteger(raw.column) && raw.column >= 0 && raw.column <= 100_000 ? raw.column : null;

    if (file) event.file = file;
    if (line !== null) event.line = line;
    if (column !== null) event.column = column;
    return event;
  }

  if (raw.type === 'performance') {
    const metrics = {
      lcp: safeMetric(raw.metrics?.lcp, 120_000),
      cls: safeMetric(raw.metrics?.cls, 10),
      ttfb: safeMetric(raw.metrics?.ttfb, 120_000),
      dcl: safeMetric(raw.metrics?.dcl, 120_000),
    };

    const cleanMetrics = Object.fromEntries(
      Object.entries(metrics).filter(([, value]) => value !== null),
    );
    if (!Object.keys(cleanMetrics).length) return null;

    return {
      type: 'performance',
      route,
      metrics: cleanMetrics,
    };
  }

  return null;
}

export default async function handler(request, response) {
  const requestId = randomUUID();
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Request-Id', requestId);

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED', requestId });
  }

  if (!sameOriginBrowserRequest(request)) {
    return response.status(403).json({ error: 'Cross-origin browser request is not allowed', code: 'ORIGIN_NOT_ALLOWED', requestId });
  }

  if (bodyBytes(request) > MAX_BODY_BYTES) {
    return response.status(413).json({ error: 'Request body is too large', code: 'REQUEST_TOO_LARGE', requestId });
  }

  const rate = consumeRateLimit(request);
  response.setHeader('X-RateLimit-Limit', String(RATE_LIMIT));
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining));

  if (!rate.allowed) {
    response.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return response.status(429).json({ error: 'Too many telemetry events', code: 'RATE_LIMITED', requestId });
  }

  let raw;
  try {
    raw = parseBody(request);
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON', requestId });
  }

  const event = normalizeEvent(raw);
  if (!event) {
    return response.status(400).json({ error: 'Invalid telemetry event', code: 'INVALID_EVENT', requestId });
  }

  console.info(
    '[MathNexus telemetry]',
    JSON.stringify({
      requestId,
      ...event,
      receivedAt: new Date().toISOString(),
    }),
  );

  return response.status(202).json({ ok: true, requestId });
}
