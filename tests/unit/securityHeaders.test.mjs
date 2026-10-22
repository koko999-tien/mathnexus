import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const globalHeaders = config.headers.flatMap(entry => entry.headers);
const csp = globalHeaders.find(header => header.key === 'Content-Security-Policy')?.value || '';
const directives = new Map(
  csp.split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [name, ...sources] = part.split(/\s+/);
      return [name, sources];
    }),
);

function sources(name) {
  return directives.get(name) || [];
}

test('CSP keeps the app locked down while allowing library media', () => {
  assert.deepEqual(sources('default-src'), ["'self'"]);
  assert.deepEqual(sources('frame-ancestors'), ["'none'"]);
  assert.deepEqual(sources('object-src'), ["'none'"]);

  for (const source of [
    'https://covers.openlibrary.org',
    'https://upload.wikimedia.org',
    'https://*.wikipedia.org',
    'https://archive.org',
    'https://*.archive.org',
  ]) {
    assert.ok(sources('img-src').includes(source), `img-src is missing ${source}`);
  }

  assert.ok(sources('frame-src').includes('https://archive.org'));
  assert.ok(sources('frame-src').includes('https://*.archive.org'));
});
