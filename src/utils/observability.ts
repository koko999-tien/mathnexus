export type TelemetryErrorSource =
  | 'window_error'
  | 'unhandled_rejection'
  | 'react_boundary'
  | 'storage';

interface ClientErrorTelemetry {
  type: 'client_error';
  route: string;
  source: TelemetryErrorSource;
  errorName: string;
  file?: string;
  line?: number;
  column?: number;
}

interface PerformanceTelemetry {
  type: 'performance';
  route: string;
  metrics: {
    lcp?: number;
    cls?: number;
    ttfb?: number;
    dcl?: number;
  };
}

type TelemetryPayload = ClientErrorTelemetry | PerformanceTelemetry;

const TELEMETRY_ENDPOINT = '/api/telemetry';
const KNOWN_STATIC_ROUTES = new Set([
  '/',
  '/library',
  '/map',
  '/cosmos',
  '/books',
  '/think',
  '/practice',
  '/graph',
  '/tools',
  '/calculus',
  '/simulations/gravity',
  '/formulas',
  '/ai',
  '/notebook',
  '/canvas',
  '/progress',
]);

let initialized = false;
let lastErrorFingerprint = '';
let lastErrorAt = 0;

export function telemetryRouteTemplate(pathname: string) {
  const clean = pathname.split(/[?#]/, 1)[0] || '/';
  if (KNOWN_STATIC_ROUTES.has(clean)) return clean;
  if (/^\/lesson\/[^/]+\/?$/.test(clean)) return '/lesson/:id';
  if (/^\/book\/[^/]+\/?$/.test(clean)) return '/book/:id';
  if (/^\/formula\/[^/]+\/?$/.test(clean)) return '/formula/:id';
  return '/:unknown';
}

export function telemetryErrorName(value: unknown) {
  if (value instanceof Error) return sanitizeToken(value.name || value.constructor?.name || 'Error', 80) || 'Error';
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
    return sanitizeToken(value.name, 80) || 'Error';
  }
  return 'NonErrorRejection';
}

function sanitizeToken(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength).replace(/[^a-zA-Z0-9_.:\-/]/g, '_');
}

function sourceBasename(value: string | undefined) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return sanitizeToken(url.pathname.split('/').filter(Boolean).pop() || '', 120);
  } catch {
    return sanitizeToken(value.split(/[?#]/, 1)[0].split('/').filter(Boolean).pop() || '', 120);
  }
}

function stackLocation(error: Error) {
  const line = error.stack?.split('\n').find(entry => /:\d+:\d+\)?$/.test(entry));
  if (!line) return {};

  const match = line.match(/(?:https?:\/\/[^\s)]+|\/[^\s)]+):(\d+):(\d+)\)?$/);
  const sourceMatch = line.match(/(?:https?:\/\/[^\s)]+|\/[^\s)]+):\d+:\d+\)?$/);
  const source = sourceMatch?.[0]?.replace(/:\d+:\d+\)?$/, '') || '';

  return {
    file: sourceBasename(source),
    line: match ? Number(match[1]) : undefined,
    column: match ? Number(match[2]) : undefined,
  };
}

function telemetryEnabled() {
  if (!import.meta.env.PROD || typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host !== 'localhost'
    && host !== '127.0.0.1'
    && host !== '::1'
    && !host.endsWith('.github.io');
}

function sendTelemetry(payload: TelemetryPayload) {
  if (!telemetryEnabled()) return;

  const body = JSON.stringify(payload);
  if (body.length > 12_000) return;

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(TELEMETRY_ENDPOINT, blob)) return;
    }
  } catch {
    // Fall through to fetch. Observability must never break the product.
  }

  void fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => undefined);
}

function sendClientError(payload: ClientErrorTelemetry) {
  const fingerprint = [
    payload.errorName,
    payload.file || '',
    payload.line || 0,
    payload.column || 0,
  ].join(':');
  const now = Date.now();

  if (fingerprint === lastErrorFingerprint && now - lastErrorAt < 5000) return;
  lastErrorFingerprint = fingerprint;
  lastErrorAt = now;
  sendTelemetry(payload);
}

export function reportReactError(error: Error) {
  const location = stackLocation(error);
  sendClientError({
    type: 'client_error',
    route: telemetryRouteTemplate(window.location.pathname),
    source: 'react_boundary',
    errorName: telemetryErrorName(error),
    ...(location.file ? { file: location.file } : {}),
    ...(location.line !== undefined ? { line: location.line } : {}),
    ...(location.column !== undefined ? { column: location.column } : {}),
  });
}

function observeInitialPerformance() {
  const route = telemetryRouteTemplate(window.location.pathname);
  let lcp: number | undefined;
  let cls = 0;
  let sent = false;
  const observers: PerformanceObserver[] = [];

  try {
    const lcpObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      const last = entries.at(-1);
      if (last) lcp = last.startTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(lcpObserver);
  } catch {
    // Browser does not expose LCP.
  }

  try {
    const clsObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (!shift.hadRecentInput && typeof shift.value === 'number') cls += shift.value;
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    observers.push(clsObserver);
  } catch {
    // Browser does not expose layout shift entries.
  }

  const flush = () => {
    if (sent) return;
    sent = true;
    observers.forEach(observer => observer.disconnect());

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const metrics: PerformanceTelemetry['metrics'] = {};

    if (typeof lcp === 'number' && Number.isFinite(lcp)) metrics.lcp = Math.round(lcp * 100) / 100;
    if (Number.isFinite(cls)) metrics.cls = Math.round(cls * 10000) / 10000;
    if (navigation && Number.isFinite(navigation.responseStart)) metrics.ttfb = Math.round(navigation.responseStart * 100) / 100;
    if (navigation && Number.isFinite(navigation.domContentLoadedEventEnd)) metrics.dcl = Math.round(navigation.domContentLoadedEventEnd * 100) / 100;

    if (Object.keys(metrics).length) sendTelemetry({ type: 'performance', route, metrics });
  };

  const scheduleFlush = () => window.setTimeout(flush, 8000);
  if (document.readyState === 'complete') scheduleFlush();
  else window.addEventListener('load', scheduleFlush, { once: true });

  window.addEventListener('pagehide', flush, { once: true });
}

export function initObservability() {
  if (initialized || !telemetryEnabled()) return;
  initialized = true;

  window.addEventListener('error', event => {
    sendClientError({
      type: 'client_error',
      route: telemetryRouteTemplate(window.location.pathname),
      source: 'window_error',
      errorName: telemetryErrorName(event.error),
      ...(sourceBasename(event.filename) ? { file: sourceBasename(event.filename) } : {}),
      ...(event.lineno ? { line: event.lineno } : {}),
      ...(event.colno ? { column: event.colno } : {}),
    });
  });

  window.addEventListener('unhandledrejection', event => {
    sendClientError({
      type: 'client_error',
      route: telemetryRouteTemplate(window.location.pathname),
      source: 'unhandled_rejection',
      errorName: telemetryErrorName(event.reason),
    });
  });

  window.addEventListener('mathnexus:storage-error', () => {
    sendClientError({
      type: 'client_error',
      route: telemetryRouteTemplate(window.location.pathname),
      source: 'storage',
      errorName: 'StorageWriteFailure',
    });
  });

  observeInitialPerformance();
}
