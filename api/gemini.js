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

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server',
    });
  }

  const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const appContext = typeof body.appContext === 'string' ? body.appContext.trim().slice(0, 12000) : '';

  if (!message) {
    return response.status(400).json({ error: 'Message is required' });
  }

  if (message.length > 12000) {
    return response.status(400).json({ error: 'Message is too long' });
  }

  const userText = appContext
    ? `Ngữ cảnh MathNexus:\n${appContext}\n\nCâu hỏi của người dùng:\n${message}`
    : message;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
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
        contents: [
          ...normalizeHistory(body.history),
          {
            role: 'user',
            parts: [{ text: userText }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 4096,
        },
      }),
    });

    const payload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const detail = payload?.error?.message || 'Gemini request failed';
      return response.status(502).json({ error: detail });
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map(part => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (!text) {
      return response.status(502).json({ error: 'Gemini returned an empty response' });
    }

    return response.status(200).json({
      text,
      model: payload?.modelVersion || model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return response.status(500).json({ error: message });
  }
}
