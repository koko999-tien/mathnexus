import { randomUUID } from 'node:crypto';
import { normalizeTutor, tutorInstruction, tutorUserContext } from './tutorPolicy.js';

const DEFAULT_MODEL = 'gemini-3.8-flash';
const STABLE_FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash'];
const REQUEST_BUDGET_MS = 24000;
const ATTEMPT_TIMEOUT_MS = 7000;
const RETRY_DELAY_MS = 650;
const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_IMAGE_BASE64_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const INSTANCE_RATE_WINDOW_MS = 60_000;
const INSTANCE_RATE_LIMIT = 20;
const rateBuckets = new Map();

const SYSTEM_PROMPT = `
Bạn là MathNexus AI, trợ lý học toán cho người Việt.

Nguyên tắc:
- Trả lời bằng tiếng Việt trừ khi người dùng yêu cầu ngôn ngữ khác.
- Ưu tiên giải thích rõ bản chất, sau đó mới đến công thức.
- Với bài toán, tự kiểm tra kết quả trước khi trả lời.
- Mặc định hỗ trợ học bằng câu hỏi dẫn dắt/gợi ý; không cố tình giữ đáp án nếu người dùng đã yêu cầu lời giải đầy đủ.
- Không tuyên bố biết cảm xúc, bệnh lý, trí thông minh hay năng lực của người dùng từ hành vi học tập.
- Nếu có "Ngữ cảnh MathNexus", hãy dùng nó làm nguồn ngữ cảnh cho nội dung trong ứng dụng.
- Không bịa rằng MathNexus có bài học, sách hay công thức nếu ngữ cảnh không cung cấp.
- Khi câu hỏi thiếu dữ kiện, nêu giả định ngắn gọn thay vì bịa dữ kiện.
- Giữ câu trả lời dễ đọc trên màn hình điện thoại.
`.trim();


function headerValue(request, name) {
  const headers = request?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') return String(headers.get(name) || '').trim();
  const direct = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(direct) ? String(direct[0] || '').trim() : String(direct || '').trim();
}

function requestBodyBytes(request) {
  const contentLength = Number(headerValue(request, 'content-length'));
  if (Number.isFinite(contentLength) && contentLength >= 0) return contentLength;
  try {
    if (typeof request.body === 'string') return Buffer.byteLength(request.body, 'utf8');
    if (request.body && typeof request.body === 'object') return Buffer.byteLength(JSON.stringify(request.body), 'utf8');
  } catch {
    return MAX_REQUEST_BYTES + 1;
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
  const first = forwarded.split(',')[0]?.trim();
  return first || headerValue(request, 'x-real-ip') || '';
}

function consumeInstanceRateLimit(request, now = Date.now()) {
  const key = clientAddress(request);
  if (!key) return { allowed: true, remaining: INSTANCE_RATE_LIMIT, retryAfterSeconds: 0 };

  if (rateBuckets.size > 2048) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }

  const existing = rateBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + INSTANCE_RATE_WINDOW_MS }
    : existing;

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= INSTANCE_RATE_LIMIT,
    remaining: Math.max(0, INSTANCE_RATE_LIMIT - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function cleanEnv(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^["']|["']$/g, '').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientGeminiError(result) {
  return (
    result.status === 408 ||
    result.status === 429 ||
    result.status === 502 ||
    result.status === 503 ||
    result.status === 504 ||
    result.code === 'UNAVAILABLE' ||
    result.code === 'RESOURCE_EXHAUSTED' ||
    result.code === 'NETWORK_ERROR' ||
    result.code === 'TIMEOUT' ||
    result.code === 'EMPTY_RESPONSE'
  );
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(item => item && (item.role === 'user' || item.role === 'model') && typeof item.text === 'string')
    .slice(-8)
    .map(item => ({
      role: item.role,
      parts: [{ text: item.text.slice(0, 8000) }],
    }));
}

function normalizeImage(image) {
  if (image === undefined || image === null) return { image: null };
  if (!image || typeof image !== 'object' || Array.isArray(image)) {
    return { error: { status: 400, code: 'INVALID_IMAGE', message: 'Image must be an object' } };
  }

  let mime = typeof image.mime === 'string' ? image.mime.trim().toLowerCase() : '';
  let data = typeof image.data === 'string' ? image.data.trim() : '';

  const dataUrlMatch = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(data);
  if (dataUrlMatch) {
    if (dataUrlMatch[1] && !mime) mime = dataUrlMatch[1].trim().toLowerCase();
    data = (dataUrlMatch[3] || '').trim();
  }

  if (!ALLOWED_IMAGE_MIMES.has(mime)) {
    return { error: { status: 400, code: 'INVALID_IMAGE', message: 'Image must be JPEG, PNG or WebP' } };
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length < 100) {
    return { error: { status: 400, code: 'INVALID_IMAGE', message: 'Image data is not valid base64' } };
  }

  if (Buffer.byteLength(data, 'utf8') > MAX_IMAGE_BASE64_BYTES) {
    return { error: { status: 413, code: 'IMAGE_TOO_LARGE', message: 'Image is too large' } };
  }

  return { image: { mime, data } };
}

function extractStreamText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter(part => part && !part.thought && typeof part.text === 'string')
    .map(part => part.text)
    .join('');
}

async function openGeminiStream({ apiKey, model, contents, signal, systemPrompt }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  let geminiResponse;
  try {
    geminiResponse = await fetch(endpoint, {
      signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt || SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 4096,
        },
      }),
    });
  } catch (error) {
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return {
      ok: false,
      status: isTimeout ? 504 : 503,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      detail: isTimeout ? 'Gemini request timed out' : error instanceof Error ? error.message : 'Gemini network request failed',
      model,
    };
  }

  if (!geminiResponse.ok || !geminiResponse.body) {
    let payload = {};
    try {
      payload = await geminiResponse.json();
    } catch {
      payload = {};
    }
    const detail = payload?.error?.message || `Gemini request failed with HTTP ${geminiResponse.status}`;
    const code = payload?.error?.status || payload?.error?.code || 'GEMINI_UPSTREAM_ERROR';
    return { ok: false, status: geminiResponse.status, code, detail, model };
  }

  return { ok: true, body: geminiResponse.body, model };
}

function sseSend(response, event) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}


function timeoutSignal(deadline) {
  const remaining = Math.max(1, deadline - Date.now());
  return AbortSignal.timeout(Math.max(500, Math.min(ATTEMPT_TIMEOUT_MS, remaining)));
}

async function callGemini({ apiKey, model, contents, signal, systemPrompt, requestId }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let geminiResponse;
  try {
    geminiResponse = await fetch(endpoint, {
      signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt || SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 4096,
        },
      }),
    });
  } catch (error) {
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    const detail = isTimeout
      ? 'Gemini request timed out'
      : error instanceof Error
        ? error.message
        : 'Gemini network request failed';

    console.warn(
      '[MathNexus Gemini transport error]',
      JSON.stringify({
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: detail.slice(0, 500),
        model,
        requestId,
      }),
    );

    return {
      ok: false,
      status: isTimeout ? 504 : 503,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      detail,
      model,
    };
  }

  let payload = {};
  try {
    payload = await geminiResponse.json();
  } catch {
    payload = {};
  }

  if (!geminiResponse.ok) {
    const detail = payload?.error?.message || `Gemini request failed with HTTP ${geminiResponse.status}`;
    const code = payload?.error?.status || payload?.error?.code || 'GEMINI_UPSTREAM_ERROR';

    console.error(
      '[MathNexus Gemini upstream error]',
      JSON.stringify({
        status: geminiResponse.status,
        code,
        message: String(detail).slice(0, 1000),
        model,
        requestId,
      }),
    );

    return {
      ok: false,
      status: geminiResponse.status,
      code,
      detail,
      model,
    };
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.filter(part => !part.thought)
    ?.map(part => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (!text) {
    console.error(
      '[MathNexus Gemini empty response]',
      JSON.stringify({ model, requestId, finishReason: payload?.candidates?.[0]?.finishReason || null }),
    );

    return {
      ok: false,
      status: 502,
      code: 'EMPTY_RESPONSE',
      detail: 'Gemini returned an empty response',
      model,
    };
  }

  return {
    ok: true,
    text,
    model: payload?.modelVersion || model,
  };
}

function responseStatusFor(error) {
  if (!error) return 502;
  if (error.status === 429 || error.code === 'RESOURCE_EXHAUSTED') return 429;
  if (isTransientGeminiError(error)) return 503;
  return 502;
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

  if (requestBodyBytes(request) > MAX_REQUEST_BYTES + MAX_IMAGE_BASE64_BYTES) {
    return response.status(413).json({ error: 'Request body is too large', code: 'REQUEST_TOO_LARGE', requestId });
  }

  const rate = consumeInstanceRateLimit(request);
  response.setHeader('X-RateLimit-Limit', String(INSTANCE_RATE_LIMIT));
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    response.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return response.status(429).json({
      error: 'Too many Gemini requests from this client',
      code: 'INSTANCE_RATE_LIMITED',
      requestId,
    });
  }

  let body = {};
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON', requestId });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response.status(400).json({ error: 'Expected a JSON object', code: 'INVALID_JSON', requestId });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const appContext = typeof body.appContext === 'string' ? body.appContext.trim().slice(0, 12000) : '';
  const tutor = normalizeTutor(body.tutor);
  const wantStream = body.stream === true;

  const imageResult = normalizeImage(body.image);
  if (imageResult.error) {
    return response.status(imageResult.error.status).json({
      error: imageResult.error.message,
      code: imageResult.error.code,
      requestId,
    });
  }

  if (!message && !imageResult.image) {
    return response.status(400).json({ error: 'Message is required', code: 'EMPTY_MESSAGE', requestId });
  }

  if (message.length > 12000) {
    return response.status(400).json({ error: 'Message is too long', code: 'MESSAGE_TOO_LONG', requestId });
  }

  const bodyBytes = requestBodyBytes(request);
  if (message && !imageResult.image && bodyBytes > MAX_REQUEST_BYTES) {
    return response.status(413).json({ error: 'Request body is too large', code: 'REQUEST_TOO_LARGE', requestId });
  }

  if (imageResult.image && bodyBytes > MAX_IMAGE_BASE64_BYTES + 16 * 1024) {
    return response.status(413).json({ error: 'Request body is too large', code: 'REQUEST_TOO_LARGE', requestId });
  }

  const apiKey = cleanEnv(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    return response.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server',
      code: 'MISSING_API_KEY',
      requestId,
    });
  }

  const contextBlocks = [
    appContext ? `Ngữ cảnh MathNexus:\n${appContext}` : '',
    tutorUserContext(tutor),
  ].filter(Boolean);
  const userText = contextBlocks.length
    ? `${contextBlocks.join('\n\n')}\n\nCâu hỏi của người dùng:\n${message || '(xem ảnh bài toán đính kèm)'}`
    : message;

  const dynamicSystemPrompt = [SYSTEM_PROMPT, tutorInstruction(tutor)].filter(Boolean).join('\n\n');

  const userParts = [{ text: userText }];
  if (imageResult.image) {
    userParts.push({
      inlineData: {
        mimeType: imageResult.image.mime,
        data: imageResult.image.data,
      },
    });
  }

  const contents = [
    ...normalizeHistory(body.history),
    {
      role: 'user',
      parts: userParts,
    },
  ];

  const configuredModel = cleanEnv(process.env.GEMINI_MODEL) || DEFAULT_MODEL;
  const modelsToTry = [...new Set([
    configuredModel,
    DEFAULT_MODEL,
    ...STABLE_FALLBACK_MODELS,
  ])];
  const deadline = Date.now() + REQUEST_BUDGET_MS;
  const attempts = [];

  const canStream = wantStream && typeof response.write === 'function' && typeof response.end === 'function';

  if (canStream) {
    let streamOpened = null;
    let streamError = null;

    for (const model of modelsToTry) {
      if (Date.now() >= deadline - 500) break;
      const opened = await openGeminiStream({
        apiKey,
        model,
        contents,
        signal: timeoutSignal(deadline),
        systemPrompt: dynamicSystemPrompt,
      });

      attempts.push({ model, attempt: 1, code: opened.ok ? 'STREAM' : String(opened.code || opened.status) });

      if (opened.ok) {
        streamOpened = opened;
        break;
      }

      streamError = opened;

      const modelLooksInvalid =
        opened.status === 404 ||
        /model.*(not found|not supported|invalid)|not found.*model/i.test(String(opened.detail));

      if (!modelLooksInvalid && !isTransientGeminiError(opened)) {
        break;
      }
    }

    if (streamOpened) {
      response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      response.setHeader('X-Accel-Buffering', 'no');
      sseSend(response, { type: 'start', model: streamOpened.model, tutorMode: tutor?.mode || null, requestId });

      let fullText = '';
      try {
        const reader = streamOpened.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const event of events) {
            for (const line of event.split('\n')) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              let payload = null;
              try {
                payload = JSON.parse(data);
              } catch {
                continue;
              }
              const delta = extractStreamText(payload);
              if (delta) {
                fullText += delta;
                sseSend(response, { type: 'delta', delta });
              }
            }
          }
        }

        try {
          reader.releaseLock();
        } catch {
          // Lock release is best-effort.
        }
      } catch (error) {
        sseSend(response, {
          type: 'error',
          code: error?.name === 'AbortError' || error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR',
          error: error instanceof Error ? error.message.slice(0, 500) : 'Gemini stream failed',
        });
      }

      sseSend(response, {
        type: 'done',
        text: fullText.trim(),
        model: streamOpened.model,
        fallbackUsed: streamOpened.model !== configuredModel,
        tutorMode: tutor?.mode || null,
        requestId,
      });
      return response.end();
    }

    if (streamError && !isTransientGeminiError(streamError)) {
      return response.status(responseStatusFor(streamError)).json({
        error: String(streamError.detail || 'Gemini request failed').slice(0, 1000),
        code: String(streamError.code || 'GEMINI_UPSTREAM_ERROR'),
        upstreamStatus: streamError.status || null,
        model: streamError.model || configuredModel,
        requestId,
      });
    }
    // Transient stream failures fall through to the regular JSON path below.
  }

  let lastError = null;

  for (const model of modelsToTry) {
    let attempt = 0;

    while (attempt < 2 && Date.now() < deadline - 500) {
      attempt += 1;
      const result = await callGemini({
        apiKey,
        model,
        contents,
        signal: timeoutSignal(deadline),
        systemPrompt: dynamicSystemPrompt,
        requestId,
      });

      attempts.push({ model, attempt, code: result.ok ? 'OK' : String(result.code || result.status) });

      if (result.ok) {
        return response.status(200).json({
          text: result.text,
          model: result.model,
          fallbackUsed: model !== configuredModel,
          tutorMode: tutor?.mode || null,
          requestId,
        });
      }

      lastError = result;

      if (!isTransientGeminiError(result) || attempt >= 2) {
        break;
      }

      const remaining = deadline - Date.now();
      if (remaining <= RETRY_DELAY_MS + 500) {
        break;
      }
      await sleep(RETRY_DELAY_MS);
    }

    if (!lastError) break;

    const modelLooksInvalid =
      lastError.status === 404 ||
      /model.*(not found|not supported|invalid)|not found.*model/i.test(String(lastError.detail));

    if (!modelLooksInvalid && !isTransientGeminiError(lastError)) {
      break;
    }

    if (Date.now() >= deadline - 500) {
      break;
    }

    console.warn(
      '[MathNexus Gemini fallback]',
      JSON.stringify({
        fromModel: model,
        reason: String(lastError.code || lastError.status),
        requestId,
      }),
    );
  }

  console.warn(
    '[MathNexus Gemini exhausted]',
    JSON.stringify({
      attempts,
      lastCode: String(lastError?.code || 'UNKNOWN'),
      elapsedMs: REQUEST_BUDGET_MS - Math.max(0, deadline - Date.now()),
      requestId,
    }),
  );

  return response.status(responseStatusFor(lastError)).json({
    error: String(lastError?.detail || 'Gemini request failed').slice(0, 1000),
    code: String(lastError?.code || 'GEMINI_UPSTREAM_ERROR'),
    upstreamStatus: lastError?.status || null,
    model: lastError?.model || configuredModel,
    requestId,
  });
}
