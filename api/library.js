const ALLOWED_WIKI_LANGS = new Set(['vi', 'en']);
const CACHE_HEADER = 'public, s-maxage=1800, stale-while-revalidate=3600';

function clean(value, max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function requestParam(request, name) {
  const fromQuery = request.query?.[name];
  if (Array.isArray(fromQuery)) return clean(fromQuery[0]);
  if (fromQuery !== undefined) return clean(fromQuery);

  try {
    const url = new URL(request.url || '', 'http://localhost');
    return clean(url.searchParams.get(name));
  } catch {
    return '';
  }
}

function normalizeWikiLanguage(value) {
  const lang = clean(value, 8).toLowerCase();
  return ALLOWED_WIKI_LANGS.has(lang) ? lang : 'vi';
}

async function fetchJson(url, timeout = 9000) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MathNexus/1.0 (knowledge library; educational use)',
    },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`Upstream error ${response.status}`);
  return response.json();
}

function wikiArticleUrl(lang, title) {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(title || '').replace(/ /g, '_'))}`;
}

async function searchWikipedia(query, lang) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '0',
    gsrlimit: '12',
    prop: 'extracts|pageimages|info',
    exintro: '1',
    explaintext: '1',
    exsentences: '4',
    piprop: 'thumbnail',
    pithumbsize: '360',
    inprop: 'url',
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
  });

  const data = await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params.toString()}`);
  const pages = Array.isArray(data?.query?.pages) ? data.query.pages : [];

  return pages
    .sort((a, b) => Number(a.index || 999) - Number(b.index || 999))
    .map(page => ({
      id: String(page.pageid || page.title || ''),
      title: clean(page.title, 300),
      extract: clean(page.extract, 1800),
      thumbnail: clean(page.thumbnail?.source, 1200),
      url: clean(page.fullurl, 1200) || wikiArticleUrl(lang, page.title),
      lang,
      source: 'Wikipedia',
    }))
    .filter(item => item.title);
}

async function readWikipedia(title, lang) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts|pageimages|info',
    explaintext: '1',
    piprop: 'original|thumbnail',
    pithumbsize: '720',
    inprop: 'url',
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
  });

  const data = await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params.toString()}`, 12000);
  const page = Array.isArray(data?.query?.pages) ? data.query.pages[0] : null;
  if (!page || page.missing) return null;

  return {
    id: String(page.pageid || page.title || ''),
    title: clean(page.title, 300),
    extract: String(page.extract || '').trim().slice(0, 120000),
    thumbnail: clean(page.thumbnail?.source || page.original?.source, 1600),
    url: clean(page.fullurl, 1200) || wikiArticleUrl(lang, page.title),
    lang,
    source: 'Wikipedia',
  };
}

function openLibraryReadState(doc) {
  const access = clean(doc.ebook_access, 80).toLowerCase();
  const availability = doc.availability && typeof doc.availability === 'object' ? doc.availability : {};
  const identifier = clean(availability.identifier || (Array.isArray(doc.ia) ? doc.ia[0] : ''), 300);

  if (doc.public_scan_b || access === 'public') {
    return { state: 'public', label: 'Đọc online', identifier };
  }
  if (access === 'borrowable' || availability.status === 'borrow_available') {
    return { state: 'borrow', label: 'Có thể mượn', identifier };
  }
  if (doc.has_fulltext || identifier) {
    return { state: 'scan', label: 'Có bản số hóa', identifier };
  }
  return { state: 'record', label: 'Thông tin sách', identifier: '' };
}

async function searchOpenLibrary(query, page = 1, readableOnly = false) {
  const safePage = Math.min(20, Math.max(1, Number(page) || 1));
  const effectiveQuery = readableOnly ? `(${query}) AND ebook_access:public` : query;
  const fields = [
    'key',
    'title',
    'author_name',
    'first_publish_year',
    'cover_i',
    'edition_count',
    'language',
    'subject',
    'ia',
    'has_fulltext',
    'public_scan_b',
    'ebook_access',
    'availability',
  ].join(',');

  const params = new URLSearchParams({
    q: effectiveQuery,
    page: String(safePage),
    limit: '18',
    fields,
  });

  const data = await fetchJson(`https://openlibrary.org/search.json?${params.toString()}`, 12000);
  const docs = Array.isArray(data?.docs) ? data.docs : [];

  return {
    total: Number(data?.num_found || 0),
    page: safePage,
    items: docs.map(doc => {
      const read = openLibraryReadState(doc);
      const key = clean(doc.key, 300);
      const coverId = Number(doc.cover_i || 0);

      return {
        key,
        title: clean(doc.title, 500) || 'Untitled',
        authors: Array.isArray(doc.author_name) ? doc.author_name.map(name => clean(name, 180)).filter(Boolean).slice(0, 6) : [],
        firstPublishYear: Number(doc.first_publish_year || 0) || null,
        cover: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : '',
        editionCount: Number(doc.edition_count || 0),
        languages: Array.isArray(doc.language) ? doc.language.map(value => clean(value, 20)).filter(Boolean).slice(0, 8) : [],
        subjects: Array.isArray(doc.subject) ? doc.subject.map(value => clean(value, 120)).filter(Boolean).slice(0, 8) : [],
        hasFullText: Boolean(doc.has_fulltext),
        publicScan: Boolean(doc.public_scan_b),
        ebookAccess: clean(doc.ebook_access, 80),
        readState: read.state,
        readLabel: read.label,
        openLibraryUrl: key ? `https://openlibrary.org${key}` : 'https://openlibrary.org',
        readUrl: read.identifier ? `https://archive.org/details/${encodeURIComponent(read.identifier)}` : '',
        archiveId: read.identifier,
      };
    }).filter(item => item.key && item.title),
  };
}

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', CACHE_HEADER);

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' });
  }

  const source = requestParam(request, 'source').toLowerCase();
  const query = requestParam(request, 'q');
  const mode = requestParam(request, 'mode').toLowerCase() || 'search';

  try {
    if (source === 'wikipedia') {
      const lang = normalizeWikiLanguage(requestParam(request, 'lang'));
      if (mode === 'read') {
        const title = requestParam(request, 'title');
        if (!title) return response.status(400).json({ error: 'Wikipedia title is required.', code: 'EMPTY_TITLE' });
        if (title.length > 300) return response.status(400).json({ error: 'Wikipedia title is too long.', code: 'TITLE_TOO_LONG' });

        const article = await readWikipedia(title, lang);
        if (!article) return response.status(404).json({ error: 'Wikipedia article not found.', code: 'NOT_FOUND' });
        return response.status(200).json({ source: 'wikipedia', mode: 'read', article });
      }

      const effectiveQuery = query || (lang === 'vi' ? 'toán học' : 'mathematics');
      if (effectiveQuery.length > 500) return response.status(400).json({ error: 'Query is too long.', code: 'QUERY_TOO_LONG' });
      const items = await searchWikipedia(effectiveQuery, lang);
      return response.status(200).json({ source: 'wikipedia', mode: 'search', query: effectiveQuery, lang, items });
    }

    if (source === 'openlibrary') {
      const effectiveQuery = query || 'mathematics';
      if (effectiveQuery.length > 500) return response.status(400).json({ error: 'Query is too long.', code: 'QUERY_TOO_LONG' });
      const page = requestParam(request, 'page') || '1';
      const readableOnly = requestParam(request, 'readable') === '1';
      const result = await searchOpenLibrary(effectiveQuery, page, readableOnly);
      return response.status(200).json({ source: 'openlibrary', mode: 'search', query: effectiveQuery, readableOnly, ...result });
    }

    return response.status(400).json({
      error: 'Unsupported source. Use wikipedia or openlibrary.',
      code: 'UNSUPPORTED_SOURCE',
    });
  } catch {
    return response.status(502).json({ error: 'External library source is temporarily unavailable.', code: 'UPSTREAM_UNAVAILABLE' });
  }
}
