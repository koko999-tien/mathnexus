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

test('Open Library detail mode returns work metadata', async () => {
  globalThis.fetch = async url => {
    assert.equal(String(url), 'https://openlibrary.org/works/OL123W.json');
    return new Response(JSON.stringify({
      title: 'Topology',
      subtitle: 'An introduction',
      description: { value: 'A concise introduction to topology.' },
      first_publish_date: '1970',
      covers: [321],
      subjects: ['Topology', 'Mathematics'],
      subject_places: ['Europe'],
      subject_times: ['20th century'],
      links: [{ title: 'Companion notes', url: 'https://example.org/notes' }],
    }), { status: 200 });
  };

  const response = await request({
    source: 'openlibrary',
    mode: 'detail',
    key: '/works/OL123W',
  });

  assert.equal(response.code, 200);
  assert.equal(response.payload.book.title, 'Topology');
  assert.match(response.payload.book.description, /concise introduction/);
  assert.match(response.payload.book.cover, /321-L\.jpg/);
  assert.equal(response.payload.book.subjects[0], 'Topology');
});

test('Open Library inside mode resolves Archive host and returns OCR matches', async () => {
  const urls = [];
  globalThis.fetch = async url => {
    urls.push(String(url));

    if (String(url).startsWith('https://archive.org/metadata/')) {
      return new Response(JSON.stringify({
        d1: 'ia800204.us.archive.org',
        dir: '/27/items/calculusmadeclear',
      }), { status: 200 });
    }

    return new Response(JSON.stringify({
      page_count: 220,
      matches: [{
        text: 'The {{{derivative}}} measures a rate of change.',
        par: [{ page: 42 }, { page: 42 }],
      }],
    }), { status: 200 });
  };

  const response = await request({
    source: 'openlibrary',
    mode: 'inside',
    archive: 'calculusmadeclear',
    q: 'derivative',
  });

  assert.equal(response.code, 200);
  assert.equal(response.payload.available, true);
  assert.equal(response.payload.pageCount, 220);
  assert.equal(response.payload.matches[0].text, 'The derivative measures a rate of change.');
  assert.deepEqual(response.payload.matches[0].pages, [42]);
  assert.ok(urls.some(url => url.includes('/fulltext/inside.php?')));
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
