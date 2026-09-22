const MAX_QUERY_LENGTH = 1200;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const rateBuckets = new Map();

const GDELT_FEED_QUERY =
  '(mathematics OR "number theory" OR geometry OR topology OR theorem OR "mathematical physics")';

const CURATED_VIDEO_CHANNELS = [
  { name: '3Blue1Brown', id: 'UCYO_jab_esuFRV4b17AJtAw' },
  { name: 'Numberphile', id: 'UCoxcjq-8xIDTYp3uz647V5A' },
  { name: 'Mathologer', id: 'UC1_uAIS3r8Vu6JjXWvastJg' },
];

function headerValue(request, name) {
  const headers = request?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') return String(headers.get(name) || '').trim();
  const direct = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(direct) ? String(direct[0] || '').trim() : String(direct || '').trim();
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
  return headerValue(request, 'x-forwarded-for').split(',')[0]?.trim()
    || headerValue(request, 'x-real-ip')
    || '';
}

function consumeRateLimit(request, now = Date.now()) {
  const key = clientAddress(request);
  if (!key) return { allowed: true, remaining: RATE_LIMIT, retryAfterSeconds: 0 };

  const existing = rateBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + RATE_WINDOW_MS }
    : existing;

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (rateBuckets.size > 2048) {
    for (const [bucketKey, value] of rateBuckets) {
      if (value.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }

  return {
    allowed: bucket.count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function cleanEnv(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^["']|["']$/g, '').trim();
}

function hostname(uri = '') {
  try {
    return new URL(uri).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sourceKind(uri = '') {
  const lower = uri.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(lower)) return 'video';
  if (/arxiv\.org|doi\.org|openalex\.org|springer\.com|sciencedirect\.com|nature\.com|ams\.org|cambridge\.org|wiley\.com|jstor\.org|projecteuclid\.org|semanticscholar\.org/.test(lower)) return 'paper';
  if (/github\.com|observablehq\.com|desmos\.com|geogebra\.org/.test(lower)) return 'tool';
  return 'web';
}

function normalizeTitle(value = '') {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeSources(...groups) {
  const seen = new Set();
  const merged = [];

  for (const group of groups) {
    for (const item of group || []) {
      const uri = String(item?.uri || '').trim();
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      merged.push(item);
      if (merged.length >= 18) return merged;
    }
  }

  return merged;
}

function paperKey(paper) {
  const url = String(paper?.url || '').toLowerCase();
  const doiMatch = url.match(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/i);
  if (doiMatch) return `doi:${doiMatch[0].toLowerCase()}`;
  const title = normalizeTitle(String(paper?.title || ''));
  return title ? `title:${title}` : `id:${String(paper?.id || url)}`;
}

function mergePapers(...groups) {
  const seen = new Set();
  const merged = [];

  for (const group of groups) {
    for (const paper of group || []) {
      const key = paperKey(paper);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(paper);
      if (merged.length >= 20) return merged;
    }
  }

  return merged;
}

function datePartsToIso(value) {
  const parts = value?.['date-parts']?.[0];
  if (!Array.isArray(parts) || !parts.length) return '';
  const [year, month = 1, day = 1] = parts;
  if (!year) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function xmlDecode(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? xmlDecode(match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()) : '';
}

function coverageSummary({ sources, papers, videos, providers }) {
  const active = [
    providers.gdelt ? 'GDELT' : '',
    providers.openAlex ? 'OpenAlex' : '',
    providers.crossref ? 'Crossref' : '',
    providers.semanticScholar ? 'Semantic Scholar' : '',
    providers.youtubeRss ? 'YouTube RSS' : '',
  ].filter(Boolean);

  const parts = [];
  if (sources.length) parts.push(`${sources.length} nguồn web/tin tức`);
  if (papers.length) parts.push(`${papers.length} công trình học thuật`);
  if (videos.length) parts.push(`${videos.length} video từ kênh được theo dõi`);

  const countText = parts.length ? parts.join(', ') : 'chưa có kết quả';
  const providerText = active.length ? active.join(' · ') : 'không có nguồn khả dụng';

  return `Kết quả hiện có: ${countText}. Nguồn dữ liệu: ${providerText}.`;
}

async function fetchOpenAlex({ query = '', limit = 8 } = {}) {
  const apiKey = cleanEnv(process.env.OPENALEX_API_KEY);
  const params = new URLSearchParams({
    per_page: String(Math.min(12, Math.max(1, limit))),
    sort: 'publication_date:desc',
    select: 'id,title,doi,publication_date,language,type,cited_by_count,primary_location,authorships,open_access',
  });

  const today = new Date().toISOString().slice(0, 10);
  if (query) {
    params.set('search', query.slice(0, 500));
    params.set('filter', `to_publication_date:${today},is_retracted:false`);
  } else {
    const from = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    params.set(
      'filter',
      `primary_topic.field.id:26,from_publication_date:${from},to_publication_date:${today},is_retracted:false`,
    );
  }

  if (apiKey) params.set('api_key', apiKey);

  try {
    const response = await fetch(`https://api.openalex.org/works?${params.toString()}`, {
      headers: { 'User-Agent': 'MathNexus/1.0 (mathematics discovery workspace)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const payload = await response.json();

    return (Array.isArray(payload?.results) ? payload.results : []).map(work => {
      const primary = work?.primary_location;
      const source = primary?.source?.display_name || '';
      const authors = Array.isArray(work?.authorships)
        ? work.authorships
          .map(item => item?.author?.display_name)
          .filter(Boolean)
          .slice(0, 4)
        : [];
      const url = primary?.landing_page_url || primary?.pdf_url || work?.doi || work?.id || '';

      return {
        id: String(work?.id || url || `${work?.title || 'work'}-${work?.publication_date || ''}`),
        title: String(work?.title || 'Untitled'),
        url,
        date: String(work?.publication_date || ''),
        language: String(work?.language || ''),
        type: String(work?.type || 'work'),
        citedBy: Number(work?.cited_by_count || 0),
        source,
        authors,
        openAccess: Boolean(work?.open_access?.is_oa),
        database: 'OpenAlex',
      };
    });
  } catch {
    return [];
  }
}

async function fetchCrossref(query, limit = 8) {
  if (!query) return [];
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    query: query.slice(0, 500),
    rows: String(Math.min(12, Math.max(1, limit))),
    sort: 'relevance',
    order: 'desc',
    select: 'DOI,title,URL,published,published-online,published-print,issued,container-title,author,type,is-referenced-by-count',
    filter: `until-pub-date:${today}`,
  });

  try {
    const response = await fetch(`https://api.crossref.org/works?${params.toString()}`, {
      headers: { 'User-Agent': 'MathNexus/1.0 (metadata discovery; https://github.com/koko999-tien/mathnexus)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    const items = Array.isArray(payload?.message?.items) ? payload.message.items : [];

    return items.map(item => {
      const doi = String(item?.DOI || '');
      const title = Array.isArray(item?.title) ? String(item.title[0] || '') : String(item?.title || '');
      const container = Array.isArray(item?.['container-title'])
        ? String(item['container-title'][0] || '')
        : '';
      const authors = Array.isArray(item?.author)
        ? item.author.map(author => [author?.given, author?.family].filter(Boolean).join(' ')).filter(Boolean).slice(0, 4)
        : [];
      const date =
        datePartsToIso(item?.['published-online'])
        || datePartsToIso(item?.['published-print'])
        || datePartsToIso(item?.published)
        || datePartsToIso(item?.issued);
      const url = doi ? `https://doi.org/${doi}` : String(item?.URL || '');

      return {
        id: doi || url || title,
        title: title || 'Untitled',
        url,
        date,
        language: '',
        type: String(item?.type || 'work'),
        citedBy: Number(item?.['is-referenced-by-count'] || 0),
        source: container,
        authors,
        openAccess: false,
        database: 'Crossref',
      };
    }).filter(item => item.title && item.url);
  } catch {
    return [];
  }
}

async function fetchSemanticScholar(query, limit = 8) {
  if (!query) return [];

  const params = new URLSearchParams({
    query: query.replace(/-/g, ' ').slice(0, 500),
    limit: String(Math.min(12, Math.max(1, limit))),
    fields: 'title,url,year,authors,venue,citationCount,openAccessPdf,publicationDate,externalIds',
  });

  try {
    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`, {
      headers: { 'User-Agent': 'MathNexus/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    const data = Array.isArray(payload?.data) ? payload.data : [];

    return data.map(paper => {
      const doi = String(paper?.externalIds?.DOI || '');
      const url = doi ? `https://doi.org/${doi}` : String(paper?.url || '');
      const authors = Array.isArray(paper?.authors)
        ? paper.authors.map(author => author?.name).filter(Boolean).slice(0, 4)
        : [];

      return {
        id: String(paper?.paperId || url || paper?.title || ''),
        title: String(paper?.title || 'Untitled'),
        url,
        date: String(paper?.publicationDate || (paper?.year ? `${paper.year}-01-01` : '')),
        language: '',
        type: 'paper',
        citedBy: Number(paper?.citationCount || 0),
        source: String(paper?.venue || ''),
        authors,
        openAccess: Boolean(paper?.openAccessPdf?.url),
        database: 'Semantic Scholar',
      };
    }).filter(item => item.title && item.url);
  } catch {
    return [];
  }
}

async function fetchGdelt(query, { timespan = '30d', limit = 10 } = {}) {
  if (!query) return [];

  const params = new URLSearchParams({
    query: query.slice(0, 700),
    mode: 'artlist',
    maxrecords: String(Math.min(25, Math.max(1, limit))),
    timespan,
    sort: 'datedesc',
    format: 'jsonfeed',
  });

  try {
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.articles)
        ? payload.articles
        : [];

    return items.map(article => {
      const uri = String(article?.url || article?.external_url || '');
      const meta = [
        article?.language ? String(article.language) : '',
        article?.sourcecountry ? String(article.sourcecountry) : '',
      ].filter(Boolean).join(' · ');

      return {
        title: String(article?.title || hostname(uri) || 'Untitled'),
        uri,
        domain: String(article?.domain || hostname(uri)),
        kind: sourceKind(uri),
        description: meta || String(article?.summary || ''),
        age: String(article?.date_published || article?.seendate || ''),
        provider: 'GDELT',
      };
    }).filter(item => item.uri);
  } catch {
    return [];
  }
}

async function fetchCuratedVideos(query = '') {
  const feeds = await Promise.all(CURATED_VIDEO_CHANNELS.map(async channel => {
    try {
      const response = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.id)}`,
        {
          headers: {
            Accept: 'application/atom+xml, application/xml, text/xml',
            'User-Agent': 'Mozilla/5.0 (compatible; MathNexus/1.0)',
          },
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!response.ok) return [];
      const xml = await response.text();
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];

      return entries.slice(0, 8).map(entry => {
        const id = tagValue(entry, 'yt:videoId');
        const title = tagValue(entry, 'title');
        const publishedAt = tagValue(entry, 'published');
        const description = tagValue(entry, 'media:description');
        return {
          id,
          title,
          url: id ? `https://www.youtube.com/watch?v=${id}` : '',
          channel: channel.name,
          publishedAt,
          description,
          language: '',
        };
      }).filter(item => item.id && item.title);
    } catch {
      return [];
    }
  }));

  const all = feeds.flat().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  if (!query) return all.slice(0, 8);

  const tokens = normalizeTitle(query).split(' ').filter(token => token.length > 2);
  if (!tokens.length) return all.slice(0, 8);

  const ranked = all
    .map(video => {
      const haystack = normalizeTitle(`${video.title} ${video.description}`);
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { video, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || String(b.video.publishedAt).localeCompare(String(a.video.publishedAt)));

  return ranked.slice(0, 8).map(item => item.video);
}

function providerWarning(providers) {
  const academic = providers.openAlex || providers.crossref || providers.semanticScholar;
  const live = providers.gdelt || providers.youtubeRss;
  if (academic && live) return null;
  if (academic) return 'Nguồn học thuật đang hoạt động; nguồn web hoặc video tạm thời chưa phản hồi.';
  if (live) return 'Nguồn web/video đang hoạt động; một số cơ sở dữ liệu học thuật tạm thời chưa phản hồi.';
  return 'Các nguồn bên ngoài chưa phản hồi. Hãy thử lại sau.';
}

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (!sameOriginBrowserRequest(request)) {
    return response.status(403).json({ error: 'Cross-origin request rejected.', code: 'ORIGIN_REJECTED' });
  }

  const rate = consumeRateLimit(request);
  response.setHeader('X-RateLimit-Limit', String(RATE_LIMIT));
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    response.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return response.status(429).json({ error: 'Too many discovery requests.', code: 'RATE_LIMITED' });
  }

  if (request.method === 'GET') {
    const [gdelt, openAlex, crossref, videos] = await Promise.all([
      fetchGdelt(GDELT_FEED_QUERY, { timespan: '30d', limit: 12 }),
      fetchOpenAlex({ limit: 9 }),
      fetchCrossref('mathematics', 6),
      fetchCuratedVideos(),
    ]);

    const papers = mergePapers(openAlex, crossref).slice(0, 12);
    const providers = {
      gdelt: gdelt.length > 0,
      openAlex: openAlex.length > 0,
      crossref: crossref.length > 0,
      semanticScholar: false,
      youtubeRss: videos.length > 0,
    };

    response.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=3600');
    return response.status(200).json({
      mode: 'feed',
      generatedAt: new Date().toISOString(),
      briefing: coverageSummary({ sources: gdelt, papers, videos, providers }),
      synthesis: '',
      sources: mergeSources(gdelt),
      queries: [],
      papers,
      videos,
      model: null,
      searchAvailable: gdelt.length > 0 || papers.length > 0 || videos.length > 0,
      synthesisAvailable: false,
      providers,
      warning: providerWarning(providers),
    });
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' });
  }

  let body = {};
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body.', code: 'INVALID_JSON' });
  }

  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (!query) {
    return response.status(400).json({ error: 'Query is required.', code: 'EMPTY_QUERY' });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return response.status(400).json({ error: 'Query is too long.', code: 'QUERY_TOO_LONG' });
  }

  const [gdelt, openAlex, crossref, semanticScholar, videos] = await Promise.all([
    fetchGdelt(query, { timespan: '3m', limit: 10 }),
    fetchOpenAlex({ query, limit: 8 }),
    fetchCrossref(query, 8),
    fetchSemanticScholar(query, 8),
    fetchCuratedVideos(query),
  ]);

  const papers = mergePapers(semanticScholar, openAlex, crossref).slice(0, 16);
  const providers = {
    gdelt: gdelt.length > 0,
    openAlex: openAlex.length > 0,
    crossref: crossref.length > 0,
    semanticScholar: semanticScholar.length > 0,
    youtubeRss: videos.length > 0,
  };

  if (!gdelt.length && !papers.length && !videos.length) {
    return response.status(502).json({
      error: 'Không nhận được kết quả từ các nguồn discovery.',
      code: 'DISCOVERY_FAILED',
    });
  }

  return response.status(200).json({
    mode: 'search',
    query,
    generatedAt: new Date().toISOString(),
    synthesis: coverageSummary({ sources: gdelt, papers, videos, providers }),
    briefing: '',
    sources: mergeSources(gdelt),
    queries: [],
    papers,
    videos,
    model: null,
    searchAvailable: true,
    synthesisAvailable: false,
    providers,
    warning: providerWarning(providers),
  });
}
