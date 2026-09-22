const DEFAULT_MODEL = 'gemini-3.8-flash';
const MAX_QUERY_LENGTH = 1200;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 18;
const rateBuckets = new Map();

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

function sourceKind(uri = '') {
  const lower = uri.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(lower)) return 'video';
  if (/arxiv\.org|doi\.org|openalex\.org|springer\.com|sciencedirect\.com|nature\.com|ams\.org|cambridge\.org|wiley\.com|jstor\.org/.test(lower)) return 'paper';
  if (/github\.com|observablehq\.com|desmos\.com/.test(lower)) return 'tool';
  return 'web';
}

function hostname(uri = '') {
  try {
    return new URL(uri).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map(part => typeof part?.text === 'string' ? part.text : '').join('').trim();
}

function extractGrounding(payload) {
  const metadata = payload?.candidates?.[0]?.groundingMetadata || {};
  const chunks = Array.isArray(metadata.groundingChunks) ? metadata.groundingChunks : [];
  const seen = new Set();
  const sources = [];

  for (const chunk of chunks) {
    const web = chunk?.web;
    const uri = typeof web?.uri === 'string' ? web.uri.trim() : '';
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: typeof web?.title === 'string' && web.title.trim() ? web.title.trim() : hostname(uri),
      uri,
      domain: hostname(uri),
      kind: sourceKind(uri),
    });
    if (sources.length >= 14) break;
  }

  return {
    queries: Array.isArray(metadata.webSearchQueries)
      ? metadata.webSearchQueries.filter(query => typeof query === 'string').slice(0, 8)
      : [],
    sources,
  };
}

async function callGroundedSearch(prompt) {
  const apiKey = cleanEnv(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    return {
      ok: false,
      error: 'GEMINI_API_KEY chưa được cấu hình.',
      code: 'MISSING_GEMINI_API_KEY',
    };
  }

  const model = cleanEnv(process.env.GEMINI_SEARCH_MODEL)
    || cleanEnv(process.env.GEMINI_MODEL)
    || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22_000);

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.18,
            maxOutputTokens: 1800,
          },
        }),
      },
    );

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return {
        ok: false,
        error: String(payload?.error?.message || 'Google Search grounding failed').slice(0, 800),
        code: String(payload?.error?.status || upstream.status),
      };
    }

    const text = extractGeminiText(payload);
    const grounding = extractGrounding(payload);
    if (!text && grounding.sources.length === 0) {
      return { ok: false, error: 'Không nhận được dữ liệu tìm kiếm.', code: 'EMPTY_SEARCH_RESPONSE' };
    }

    return {
      ok: true,
      text,
      model,
      ...grounding,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === 'AbortError'
        ? 'Tìm kiếm vượt quá thời gian chờ.'
        : String(error?.message || 'Không kết nối được dịch vụ tìm kiếm.').slice(0, 800),
      code: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function openAlexWork(work) {
  const primary = work?.primary_location;
  const source = primary?.source?.display_name || '';
  const authors = Array.isArray(work?.authorships)
    ? work.authorships
      .map(item => item?.author?.display_name)
      .filter(Boolean)
      .slice(0, 4)
    : [];

  const url = primary?.landing_page_url
    || primary?.pdf_url
    || work?.doi
    || work?.id
    || '';

  return {
    id: String(work?.id || url || Math.random()),
    title: String(work?.title || 'Untitled'),
    url,
    date: String(work?.publication_date || ''),
    language: String(work?.language || ''),
    type: String(work?.type || 'work'),
    citedBy: Number(work?.cited_by_count || 0),
    source,
    authors,
    openAccess: Boolean(work?.open_access?.is_oa),
  };
}

async function fetchOpenAlex({ query = '', limit = 8 } = {}) {
  const apiKey = cleanEnv(process.env.OPENALEX_API_KEY);
  const params = new URLSearchParams({
    per_page: String(Math.min(12, Math.max(1, limit))),
    sort: 'publication_date:desc',
    select: 'id,title,doi,publication_date,language,type,cited_by_count,primary_location,authorships,open_access',
  });

  if (query) {
    params.set('search', query.slice(0, 500));
  } else {
    const from = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    params.set('filter', `primary_topic.field.id:26,from_publication_date:${from}`);
  }

  if (apiKey) params.set('api_key', apiKey);

  try {
    const response = await fetch(`https://api.openalex.org/works?${params.toString()}`, {
      headers: { 'User-Agent': 'MathNexus/1.0 (mathematics discovery workspace)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.results) ? payload.results.map(openAlexWork) : [];
  } catch {
    return [];
  }
}

async function fetchYouTube(query) {
  const key = cleanEnv(process.env.YOUTUBE_API_KEY);
  if (!key || !query) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '6',
    order: 'relevance',
    q: query.slice(0, 300),
    key,
    safeSearch: 'moderate',
  });

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return (Array.isArray(payload?.items) ? payload.items : []).map(item => ({
      id: String(item?.id?.videoId || ''),
      title: String(item?.snippet?.title || ''),
      url: item?.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : '',
      channel: String(item?.snippet?.channelTitle || ''),
      publishedAt: String(item?.snippet?.publishedAt || ''),
      description: String(item?.snippet?.description || ''),
      language: '',
    })).filter(item => item.id && item.title);
  } catch {
    return [];
  }
}

const FEED_PROMPT = `
Bạn đang biên tập mục theo dõi toán học cho một công cụ nghiên cứu.

Dùng Google Search để rà soát các nội dung toán học mới hoặc đáng chú ý trên web. Ưu tiên:
- bài báo khoa học, preprint, thông báo kết quả nghiên cứu;
- seminar, lecture, video chuyên môn, talk;
- bài viết giải thích chuyên sâu, ghi chú kỹ thuật, dự án hoặc công cụ toán học có giá trị;
- nguồn từ nhiều quốc gia và nhiều ngôn ngữ; không ưu tiên tiếng Anh chỉ vì ngôn ngữ;
- nội dung xuất bản gần đây, nhưng có thể đưa một nội dung cũ nếu vừa được thảo luận lại vì có giá trị rõ ràng.

Không viết quảng cáo, không dùng các cụm như "cực kỳ thú vị", "đột phá" nếu nguồn không chứng minh điều đó.
Không bịa tiêu đề, tác giả, ngày tháng hoặc đường dẫn.
Viết bằng tiếng Việt, giữ nguyên tiêu đề gốc khi nhắc tới nguồn.
Trình bày 5-7 tín hiệu ngắn, mỗi tín hiệu gồm: tiêu đề gốc — loại nội dung — lý do đáng xem trong 1 câu.
`.trim();

function searchPrompt(query) {
  return `
Người dùng đang nghiên cứu hoặc phát triển một ý tưởng toán học. Truy vấn của họ là:

"${query}"

Dùng Google Search để tìm tài liệu liên quan trực tiếp. Phạm vi phải rộng hơn tìm kiếm bài báo:
- paper, preprint, journal article;
- lecture, seminar, conference talk, video chuyên môn;
- notes, textbook chapter, blog kỹ thuật, project, software, visualization;
- nội dung ở bất kỳ ngôn ngữ nào nếu liên quan tốt.

Yêu cầu:
1. Ưu tiên nguồn gốc/nguồn sơ cấp khi có thể.
2. Phân biệt rõ kết quả nghiên cứu với nội dung giải thích hoặc video.
3. Không suy đoán mức độ liên quan nếu chỉ nhìn thấy tiêu đề.
4. Không bịa URL hoặc tài liệu.
5. Trả lời bằng tiếng Việt, nhưng giữ nguyên tiêu đề nguồn.
6. Mở đầu bằng 2-4 câu tổng hợp hướng tìm kiếm; sau đó liệt kê tối đa 8 nguồn/nhánh đáng kiểm tra.
7. Nếu truy vấn mơ hồ, nêu các cách hiểu hợp lý thay vì tự chọn một nghĩa duy nhất.
`.trim();
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
    const [grounded, papers] = await Promise.all([
      callGroundedSearch(FEED_PROMPT),
      fetchOpenAlex({ limit: 8 }),
    ]);

    response.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=3600');
    return response.status(200).json({
      mode: 'feed',
      generatedAt: new Date().toISOString(),
      briefing: grounded.ok ? grounded.text : '',
      sources: grounded.ok ? grounded.sources : [],
      queries: grounded.ok ? grounded.queries : [],
      papers,
      model: grounded.ok ? grounded.model : null,
      searchAvailable: grounded.ok,
      warning: grounded.ok ? null : grounded.error,
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

  const [grounded, papers, videos] = await Promise.all([
    callGroundedSearch(searchPrompt(query)),
    fetchOpenAlex({ query, limit: 8 }),
    fetchYouTube(query),
  ]);

  if (!grounded.ok && papers.length === 0 && videos.length === 0) {
    return response.status(502).json({
      error: grounded.error || 'Không tìm thấy dữ liệu.',
      code: grounded.code || 'DISCOVERY_FAILED',
    });
  }

  return response.status(200).json({
    mode: 'search',
    query,
    generatedAt: new Date().toISOString(),
    synthesis: grounded.ok ? grounded.text : '',
    sources: grounded.ok ? grounded.sources : [],
    queries: grounded.ok ? grounded.queries : [],
    papers,
    videos,
    model: grounded.ok ? grounded.model : null,
    searchAvailable: grounded.ok,
    warning: grounded.ok ? null : grounded.error,
  });
}
