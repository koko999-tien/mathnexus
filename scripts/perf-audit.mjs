import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = Number(process.env.PERF_PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;
const ROUTES = [
  ['/', 'Trang chủ'],
  ['/practice', 'Luyện tập'],
  ['/lesson/der', 'Bài học'],
  ['/map', 'Bản đồ'],
  ['/tools', 'Công cụ'],
  ['/ai', 'Hỏi AI'],
  ['/cosmos', 'Math Cosmos'],
];

const SLOW_3G = {
  offline: false,
  latency: 400,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8,
};

async function reachable(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

function startPreview() {
  const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  return spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
}

async function metrics(page) {
  await page.waitForFunction(() => !document.querySelector('.page-skeleton'), { timeout: 30000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1200);

  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const transfer = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), nav?.transferSize || 0);
    const js = resources
      .filter(entry => entry.name.endsWith('.js'))
      .reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    const perf = window.__perf || {};

    return {
      dcl: nav?.domContentLoadedEventEnd || 0,
      load: nav?.loadEventEnd || 0,
      fcp: perf.fcp || 0,
      lcp: perf.lcp || 0,
      cls: perf.cls || 0,
      tbt: perf.tbt || 0,
      jsKb: js / 1024,
      totalKb: transfer / 1024,
      lcpElement: perf.lcpElement || null,
      shifts: perf.shifts || [],
    };
  });
}

function formatRow([name, label], result) {
  return [
    name.padEnd(16),
    label.padEnd(14),
    `${Math.round(result.dcl)} ms`.padStart(9),
    `${Math.round(result.load)} ms`.padStart(9),
    `${Math.round(result.fcp)} ms`.padStart(9),
    `${Math.round(result.lcp)} ms`.padStart(9),
    result.cls.toFixed(3).padStart(6),
    `${Math.round(result.tbt)} ms`.padStart(8),
    `${Math.round(result.jsKb)} KB`.padStart(8),
    `${Math.round(result.totalKb)} KB`.padStart(8),
  ].join(' ');
}

async function main() {
  const alreadyRunning = await reachable(BASE, 500);
  const server = alreadyRunning ? null : startPreview();
  if (!(await reachable(BASE))) {
    server?.kill();
    throw new Error(`Preview server did not start at ${BASE}`);
  }

  const browser = await chromium.launch();
  const rows = [];

  try {
    for (const route of ROUTES) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await context.addInitScript(() => {
        window.__perf = { fcp: 0, lcp: 0, cls: 0, tbt: 0, shifts: [], lcpElement: null };
        const describe = node => {
          if (!node) return null;
          return {
            tag: node.tagName || '',
            cls: (node.getAttribute?.('class') || '').slice(0, 80),
            text: (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          };
        };
        try {
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') window.__perf.fcp = entry.startTime;
            }
          }).observe({ type: 'paint', buffered: true });

          new PerformanceObserver(list => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) {
              window.__perf.lcp = last.startTime;
              window.__perf.lcpElement = describe(last.element);
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (entry.hadRecentInput) continue;
              window.__perf.cls += entry.value;
              if (window.__perf.shifts.length < 6) {
                window.__perf.shifts.push({
                  value: entry.value,
                  sources: (entry.sources || []).map(source => describe(source.node)),
                });
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });

          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) window.__perf.tbt += entry.duration - 50;
            }
          }).observe({ type: 'longtask', buffered: true });
        } catch {
        }
      });

      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', SLOW_3G);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      await page.goto(BASE + route[0], { waitUntil: 'domcontentloaded', timeout: 45000 });
      rows.push([route, await metrics(page)]);
      await context.close();
    }
  } finally {
    await browser.close();
    server?.kill();
  }

  console.log('\nMathNexus performance audit · Slow 3G · CPU 4x · 390×844\n');
  console.log([
    'Route'.padEnd(16),
    'Khu vực'.padEnd(14),
    'DCL'.padStart(9),
    'Load'.padStart(9),
    'FCP'.padStart(9),
    'LCP'.padStart(9),
    'CLS'.padStart(6),
    'TBT'.padStart(8),
    'JS'.padStart(8),
    'Tổng'.padStart(8),
  ].join(' '));
  rows.forEach(row => console.log(formatRow(...row)));

  const shiftSources = new Map();
  for (const [, result] of rows) {
    for (const shift of result.shifts) {
      const sources = shift.sources.filter(Boolean);
      for (const source of sources) {
        const key = `${source.tag.toLowerCase()}${source.cls ? '.' + source.cls.replace(/\s+/g, '.') : ''}`;
        const current = shiftSources.get(key) || { value: 0, text: source.text };
        current.value += shift.value / sources.length;
        shiftSources.set(key, current);
      }
    }
  }

  const topShifts = [...shiftSources.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 6);
  if (topShifts.length) {
    console.log('\nNguồn layout shift:');
    topShifts.forEach(([key, info]) => console.log(`  ${key} · ${info.value.toFixed(3)}${info.text ? ' · “' + info.text + '”' : ''}`));
  }

  const slow = rows.filter(([, result]) => result.lcp > 4000);
  const shaky = rows.filter(([, result]) => result.cls > 0.1);
  if (slow.length) {
    console.log('\nLCP > 4s:');
    slow.forEach(([route, result]) => {
      const element = result.lcpElement;
      console.log(`  ${route[0]} · ${Math.round(result.lcp)} ms${element ? ` · ${element.tag.toLowerCase()}${element.cls ? '.' + element.cls.replace(/\s+/g, '.') : ''} · “${element.text}”` : ''}`);
    });
  }
  if (shaky.length) console.log(`\nCLS > 0.1: ${shaky.map(([route]) => route[0]).join(', ')}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
