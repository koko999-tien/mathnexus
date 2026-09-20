const DEFAULT_MODEL = 'gemini-3.8-flash';

const SYSTEM_PROMPT = `
Bạn là MathNexus AI, trợ lý học toán cho người Việt.

Nguyên tắc:
- Trả lời bằng tiếng Việt trừ khi người dùng yêu cầu ngôn ngữ khác.
- Ưu tiên giải thích rõ bản chất, sau đó mới đến công thức.
- Với bài toán, trình bày từng bước và tự kiểm tra kết quả trước khi trả lời.
- Nếu có "Ngữ cảnh MathNexus", hãy dùng nó làm nguồn ngữ cảnh cho nội dung trong ứng dụng.
- Không bịa rằng MathNexus có bài học, sách hay công thức nếu ngữ cảnh không cung cấp.
- Khi câu hỏi thiếu dữ kiện, nêu giả định ngắn gọn thay vì bịa dữ kiện.
- Giữ câu trả lời dễ đọc trên màn hình điện thoại.
`.trim();

function cleanEnv(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^["']|["']$/g, '').trim();
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

async function callGemini({ apiKey, model, contents }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const geminiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 4096,
      },
    }),
  });

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

export default async function handler(request, response) {
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

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const appContext = typeof body.appContext === 'string' ? body.appContext.trim().slice(0, 12000) : '';

  if (!message) {
    return response.status(400).json({ error: 'Message is required', code: 'EMPTY_MESSAGE' });
  }

  if (message.length > 12000) {
    return response.status(400).json({ error: 'Message is too long', code: 'MESSAGE_TOO_LONG' });
  }

  const userText = appContext
    ? `Ngữ cảnh MathNexus:\n${appContext}\n\nCâu hỏi của người dùng:\n${message}`
    : message;

  const contents = [
    ...normalizeHistory(body.history),
    {
      role: 'user',
      parts: [{ text: userText }],
    },
  ];

  const configuredModel = cleanEnv(process.env.GEMINI_MODEL) || DEFAULT_MODEL;
  const modelsToTry = configuredModel === DEFAULT_MODEL
    ? [DEFAULT_MODEL]
    : [configuredModel, DEFAULT_MODEL];

  try {
    let lastError = null;

    for (const model of modelsToTry) {
      const result = await callGemini({ apiKey, model, contents });

      if (result.ok) {
        return response.status(200).json({
          text: result.text,
          model: result.model,
        });
      }

      lastError = result;

      const modelLooksInvalid =
        result.status === 404 ||
        /model.*(not found|not supported|invalid)|not found.*model/i.test(String(result.detail));

      if (!modelLooksInvalid || model === DEFAULT_MODEL) {
        break;
      }
    }

    return response.status(502).json({
      error: String(lastError?.detail || 'Gemini request failed').slice(0, 1000),
      code: String(lastError?.code || 'GEMINI_UPSTREAM_ERROR'),
      upstreamStatus: lastError?.status || null,
      model: lastError?.model || configuredModel,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown server error';

    console.error(
      '[MathNexus Gemini server error]',
      JSON.stringify({ message: detail.slice(0, 1000) }),
    );

    return response.status(500).json({
      error: detail,
      code: 'SERVER_ERROR',
    });
  }
}
