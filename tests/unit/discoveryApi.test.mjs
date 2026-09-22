import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/discovery.js';

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

async function request({ method = 'GET', body, query, headers, url = '/api/discovery' } = {}) {
  const response = makeResponse();
  await handler({ method, body, query, headers, url }, response);
  return response;
}

function rssItem({ title, link, date = 'Mon, 21 Sep 2026 08:00:00 GMT', description = '' }) {
  return `<rss><channel><item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate><description><![CDATA[${description}]]></description></item></channel></rss>`;
}

function youtubeFeed({ id, title }) {
  return `<?xml version="1.0"?><feed>
    <entry>
      <yt:videoId>${id}</yt:videoId>
      <title><![CDATA[${title}]]></title>
      <published>2026-09-21T08:00:00+00:00</published>
      <media:description><![CDATA[mathematics lecture]]></media:description>
    </entry>
  </feed>`;
}

function mockDiscoveryFetch(seenUrls) {
  globalThis.fetch = async url => {
    const value = String(url);
    seenUrls.push(value);

    if (value.includes('api.gdeltproject.org')) {
      return new Response(JSON.stringify({
        items: [{
          title: 'A new topology result',
          url: 'https://example.org/topology-news',
          domain: 'example.org',
          date_published: '2026-09-21T06:00:00Z',
        }],
      }), { status: 200 });
    }

    if (value.includes('api.openalex.org')) {
      return new Response(JSON.stringify({
        results: [{
          id: 'https://openalex.org/W1',
          title: 'Algebraic topology and homotopy groups',
          doi: 'https://doi.org/10.1000/topology',
          publication_date: '2026-09-20',
          language: 'en',
          type: 'article',
          cited_by_count: 17,
          primary_location: {
            landing_page_url: 'https://doi.org/10.1000/topology',
            source: { display_name: 'Journal of Topology' },
          },
          authorships: [{ author: { display_name: 'Ada Example' } }],
          open_access: { is_oa: true },
        }],
      }), { status: 200 });
    }

    if (value.includes('api.crossref.org')) {
      return new Response(JSON.stringify({
        message: {
          items: [{
            DOI: '10.1000/crossref-math',
            title: ['Recent mathematics methods'],
            URL: 'https://doi.org/10.1000/crossref-math',
            published: { 'date-parts': [[2026, 9, 18]] },
            'container-title': ['Mathematics'],
            author: [{ given: 'Emmy', family: 'Example' }],
            type: 'journal-article',
            'is-referenced-by-count': 4,
          }],
        },
      }), { status: 200 });
    }

    if (value.includes('api.semanticscholar.org')) {
      return new Response(JSON.stringify({
        data: [{
          paperId: 'S2-1',
          title: 'Algebraic topology for data analysis',
          url: 'https://www.semanticscholar.org/paper/S2-1',
          year: 2026,
          authors: [{ name: 'Noether Example' }],
          venue: 'Topology Applications',
          citationCount: 8,
          openAccessPdf: { url: 'https://example.org/paper.pdf' },
          publicationDate: '2026-09-19',
          externalIds: {},
        }],
      }), { status: 200 });
    }

    if (value.includes('quantamagazine.org')) {
      return new Response(rssItem({
        title: 'Topology explained',
        link: 'https://www.quantamagazine.org/topology-explained',
        description: 'An expository mathematics article.',
      }), { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
    }

    if (value.includes('rss.arxiv.org')) {
      return new Response(rssItem({
        title: 'New results in algebraic topology',
        link: 'https://arxiv.org/abs/2609.12345',
        description: 'A recent preprint.',
      }), { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
    }

    if (value.includes('youtube.com/feeds/videos.xml')) {
      const match = value.match(/channel_id=([^&]+)/);
      const suffix = match ? decodeURIComponent(match[1]).slice(-4) : 'math';
      return new Response(youtubeFeed({
        id: `video-${suffix}`,
        title: 'Algebraic topology lecture',
      }), { status: 200, headers: { 'Content-Type': 'application/atom+xml' } });
    }

    throw new Error(`Unexpected URL: ${value}`);
  };
}

test('feed aggregates only current free/public discovery providers', async () => {
  const seenUrls = [];
  mockDiscoveryFetch(seenUrls);

  const response = await request();

  assert.equal(response.code, 200);
  assert.equal(response.payload.mode, 'feed');
  assert.equal(response.payload.providers.openAlex, true);
  assert.equal(response.payload.providers.crossref, true);
  assert.equal(response.payload.providers.gdelt, true);
  assert.equal(response.payload.providers.youtubeRss, true);
  assert.equal(response.payload.providers.editorialRss, true);
  assert.ok(response.payload.papers.some(item => item.database === 'OpenAlex'));
  assert.ok(response.payload.papers.some(item => item.database === 'Crossref'));
  assert.ok(response.payload.sources.some(item => item.provider === 'GDELT'));
  assert.ok(response.payload.videos.length > 0);

  const crossrefUrl = seenUrls.find(url => url.includes('api.crossref.org'));
  assert.ok(crossrefUrl);
  assert.match(decodeURIComponent(crossrefUrl), /from-pub-date:/);
  assert.doesNotMatch(JSON.stringify(response.payload), /Brave|Gemini|OpenAI/i);
});

test('search combines academic, editorial, web and video sources for a query', async () => {
  const seenUrls = [];
  mockDiscoveryFetch(seenUrls);

  const response = await request({
    method: 'POST',
    body: { query: 'algebraic topology' },
  });

  assert.equal(response.code, 200);
  assert.equal(response.payload.mode, 'search');
  assert.equal(response.payload.query, 'algebraic topology');
  assert.equal(response.payload.providers.semanticScholar, true);
  assert.ok(response.payload.papers.some(item => /algebraic topology/i.test(item.title)));
  assert.ok(response.payload.sources.some(item => /topology/i.test(item.title)));
  assert.ok(response.payload.videos.some(item => /topology/i.test(item.title)));
  assert.equal(response.payload.searchAvailable, true);

  assert.ok(seenUrls.some(url => {
    if (!url.includes('api.openalex.org')) return false;
    return new URL(url).searchParams.get('search') === 'algebraic topology';
  }));
  assert.ok(seenUrls.some(url => url.includes('api.semanticscholar.org')));
});

test('GET q supports reusable discovery search and validation remains strict', async () => {
  mockDiscoveryFetch([]);

  const searched = await request({
    method: 'GET',
    query: { q: 'number theory' },
    url: '/api/discovery?q=number%20theory',
  });
  assert.equal(searched.code, 200);
  assert.equal(searched.payload.mode, 'search');
  assert.equal(searched.payload.query, 'number theory');

  const empty = await request({ method: 'POST', body: { query: '   ' } });
  assert.equal(empty.code, 400);
  assert.equal(empty.payload.code, 'EMPTY_QUERY');

  const tooLong = await request({ method: 'POST', body: { query: 'x'.repeat(1201) } });
  assert.equal(tooLong.code, 400);
  assert.equal(tooLong.payload.code, 'QUERY_TOO_LONG');

  const wrongMethod = await request({ method: 'DELETE' });
  assert.equal(wrongMethod.code, 405);
});
