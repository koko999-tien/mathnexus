const DEFAULT_MODEL = 'gemini-3.8-flash';
const STABLE_FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash'];
const REQUEST_BUDGET_MS = 24000;
const ATTEMPT_TIMEOUT_MS = 7000;
const RETRY_DELAY_MS = 650;
const TUTOR_MODES = new Set(['DISCOVER','GUIDED_HINT','CONCEPT_EXPLANATION','PROOF_GUIDANCE','ERROR_DIAGNOSIS','VISUAL_INTUITION','DIRECT_SOLUTION']);

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


function normalizeTutor(tutor) {
  if (!tutor || typeof tutor !== 'object' || Array.isArray(tutor)) return null;

  const mode = TUTOR_MODES.has(tutor.mode) ? tutor.mode : 'GUIDED_HINT';
  const strategy = typeof tutor.strategy === 'string' ? tutor.strategy.trim().slice(0, 1200) : '';
  const masterySummary = typeof tutor.masterySummary === 'string' ? tutor.masterySummary.trim().slice(0, 1800) : '';
  const anchorConceptIds = Array.isArray(tutor.anchorConceptIds)
    ? tutor.anchorConceptIds.filter(id => typeof id === 'string').slice(0, 6).map(id => id.slice(0, 100))
    : [];

  return {
    mode,
    directSolutionAllowed: tutor.directSolutionAllowed === true || mode === 'DIRECT_SOLUTION',
    strategy,
    masterySummary,
    anchorConceptIds,
  };
}

function tutorInstruction(tutor) {
  if (!tutor) return '';

  const modeRules = {
    DISCOVER: 'Xác định mục tiêu và tiên quyết. Hỏi một câu kiểm tra nền tảng rồi đề xuất bước học tiếp theo.',
    GUIDED_HINT: 'Đưa đúng một gợi ý có ích và một câu hỏi tiếp theo. Không đưa toàn bộ lời giải trong lượt đầu trừ khi người dùng yêu cầu trực tiếp.',
    CONCEPT_EXPLANATION: 'Giải thích trực giác trước, sau đó định nghĩa/công thức, một ví dụ ngắn và một câu hỏi kiểm tra hiểu.',
    PROOF_GUIDANCE: 'Tách giả thiết, kết luận và công cụ. Gợi ý bước/lemma tiếp theo; chỉ đưa chứng minh đầy đủ khi được yêu cầu rõ.',
    ERROR_DIAGNOSIS: 'Chỉ ra bước sai đầu tiên, giải thích vì sao, giữ lại phần đúng và yêu cầu sửa một bước cụ thể.',
    VISUAL_INTUITION: 'Ưu tiên hình dung, đồ thị, chuyển động hoặc phản ví dụ trực quan trước ký hiệu.',
    DIRECT_SOLUTION: 'Đưa lời giải đầy đủ từng bước vì người dùng yêu cầu, nêu ý chính và tự kiểm tra kết quả.',
  };

  const directRule = tutor.directSolutionAllowed
    ? 'Lượt này được phép đưa đáp án/lời giải đầy đủ nếu phù hợp.'
    : 'Lượt này không nên đưa lời giải hoàn chỉnh ngay; ưu tiên dẫn dắt từng bước.';

  return [
    'Chiến lược gia sư cho lượt này:',
    `- Mode: ${tutor.mode}`,
    `- Quy tắc: ${modeRules[tutor.mode]}`,
    `- Direct solution: ${directRule}`,
    tutor.strategy ? `- Planner strategy: ${tutor.strategy}` : '',
    tutor.masterySummary ? `- Bằng chứng học tập cục bộ: ${tutor.masterySummary}` : '',
    tutor.anchorConceptIds.length ? `- Concept neo: ${tutor.anchorConceptIds.join(', ')}` : '',
    '- Chỉ dùng mastery như bằng chứng học tập có giới hạn; nếu thiếu bằng chứng, nói là chưa đánh giá thay vì suy đoán.',
  ].filter(Boolean).join('\n');
}

function timeoutSignal(deadline) {
  const remaining = Math.max(1, deadline - Date.now());
  return AbortSignal.timeout(Math.max(500, Math.min(ATTEMPT_TIMEOUT_MS, remaining)));
}

async function callGemini({ apiKey, model, contents, signal, systemPrompt }) {
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
      JSON.stringify({ model, finishReason: payload?.candidates?.[0]?.finishReason || null }),
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
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = cleanEnv(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    return response.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server',
      code: 'MISSING_API_KEY',
    });
  }

  let body = {};
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_JSON' });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response.status(400).json({ error: 'Expected a JSON object', code: 'INVALID_JSON' });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const appContext = typeof body.appContext === 'string' ? body.appContext.trim().slice(0, 12000) : '';
  const tutor = normalizeTutor(body.tutor);

  if (!message) {
    return response.status(400).json({ error: 'Message is required', code: 'EMPTY_MESSAGE' });
  }

  if (message.length > 12000) {
    return response.status(400).json({ error: 'Message is too long', code: 'MESSAGE_TOO_LONG' });
  }

  const userText = appContext
    ? `Ngữ cảnh MathNexus:\n${appContext}\n\nCâu hỏi của người dùng:\n${message}`
    : message;

  const dynamicSystemPrompt = [SYSTEM_PROMPT, tutorInstruction(tutor)].filter(Boolean).join('\n\n');

  const contents = [
    ...normalizeHistory(body.history),
    {
      role: 'user',
      parts: [{ text: userText }],
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
      });

      attempts.push({ model, attempt, code: result.ok ? 'OK' : String(result.code || result.status) });

      if (result.ok) {
        return response.status(200).json({
          text: result.text,
          model: result.model,
          fallbackUsed: model !== configuredModel,
          tutorMode: tutor?.mode || null,
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
      }),
    );
  }

  console.warn(
    '[MathNexus Gemini exhausted]',
    JSON.stringify({
      attempts,
      lastCode: String(lastError?.code || 'UNKNOWN'),
      elapsedMs: REQUEST_BUDGET_MS - Math.max(0, deadline - Date.now()),
    }),
  );

  return response.status(responseStatusFor(lastError)).json({
    error: String(lastError?.detail || 'Gemini request failed').slice(0, 1000),
    code: String(lastError?.code || 'GEMINI_UPSTREAM_ERROR'),
    upstreamStatus: lastError?.status || null,
    model: lastError?.model || configuredModel,
  });
}
