import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/library.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeResponse() {
  return {
    code: 200,
    payload: null,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    json(value) { this.payload = value; return this; },
  };
}

async function request(query = {}, url = '/api/library') {
  const response = makeResponse();
  await handler({ method: 'GET', query, url }, response);
  return response;
}

test('Wikipedia search returns readable article cards', async () => {
  globalThis.fetch = async url => {
    assert.match(String(url), /vi\.wikipedia\.org\/w\/api\.php/);
    return new Response(JSON.stringify({
      query: {
        pages: [{
          pageid: 10,
          index: 1,
          title: 'Đạo hàm',
          extract: 'Đạo hàm mô tả tốc độ thay đổi của một hàm số.',
          thumbnail: { source: 'https://upload.wikimedia.org/example.jpg' },
          fullurl: 'https://vi.wikipedia.org/wiki/Đạo_hàm',
        }],
      },
    }), { status: 200 });
  };

  const response = await request({ source: 'wikipedia', q: 'đạo hàm', lang: 'vi' });

  assert.equal(response.code, 200);
  assert.equal(response.payload.source, 'wikipedia');
  assert.equal(response.payload.items.length, 1);
  assert.equal(response.payload.items[0].title, 'Đạo hàm');
  assert.match(response.payload.items[0].extract, /tốc độ thay đổi/);
});

test('Wikipedia read mode returns full plain text article', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    query: {
      pages: [{
        pageid: 12,
        title: 'Topology',
        extract: 'Topology studies properties preserved under continuous deformation.\n\nHistory\n\nThe subject developed from geometry.',
        fullurl: 'https://en.wikipedia.org/wiki/Topology',
      }],
    },
  }), { status: 200 });

  const response = await request({
    source: 'wikipedia',
    mode: 'read',
    title: 'Topology',
    lang: 'en',
  });

  assert.equal(response.code, 200);
  assert.equal(response.payload.mode, 'read');
  assert.match(response.payload.article.extract, /History/);
  assert.equal(response.payload.article.lang, 'en');
});

test('Open Library search exposes reading availability and Archive link', async () => {
  let requested = '';
  globalThis.fetch = async url => {
    requested = String(url);
    return new Response(JSON.stringify({
      num_found: 120,
      docs: [{
        key: '/works/OL1W',
        title: 'Calculus Made Clear',
        author_name: ['Ada Example'],
        first_publish_year: 1920,
        cover_i: 123,
        edition_count: 4,
        language: ['eng'],
        subject: ['Calculus', 'Mathematics'],
        ia: ['calculusmadeclear'],
        has_fulltext: true,
        public_scan_b: true,
        ebook_access: 'public',
        availability: {
          status: 'open',
          identifier: 'calculusmadeclear',
        },
      }],
    }), { status: 200 });
  };

  const response = await request({
    source: 'openlibrary',
    q: 'calculus',
    page: '1',
    readable: '1',
  });

  assert.equal(response.code, 200);
  assert.equal(response.payload.total, 120);
  assert.equal(response.payload.items[0].readState, 'public');
  assert.equal(response.payload.items[0].readLabel, 'Đọc online');
  assert.match(response.payload.items[0].readUrl, /archive\.org\/details\/calculusmadeclear/);
  assert.match(decodeURIComponent(requested), /ebook_access:public/);
});

test('library endpoint validates source and method', async () => {
  const badSource = await request({ source: 'unknown' });
  assert.equal(badSource.code, 400);
  assert.equal(badSource.payload.code, 'UNSUPPORTED_SOURCE');

  const response = makeResponse();
  await handler({ method: 'POST', query: {}, url: '/api/library' }, response);
  assert.equal(response.code, 405);
  assert.equal(response.payload.code, 'METHOD_NOT_ALLOWED');
});
