import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { BOOKS } from '../data/books';
import { FORMS } from '../data/formulas';

interface Msg {
  role: 'user' | 'bot';
  text: string;
}

interface ApiHistoryItem {
  role: 'user' | 'model';
  text: string;
}

interface GeminiResponse {
  text?: unknown;
  error?: unknown;
  code?: unknown;
  model?: unknown;
  upstreamStatus?: unknown;
}

const QUICK = [
  'Số phức là gì',
  'Toán rời rạc dùng để làm gì',
  'Công thức Euler',
  'C(n,k) tổ hợp',
  'Gợi ý một bài tư duy',
  'Sách đại số tuyến tính',
];

function getLocalContext(query: string): string {
  const q = query.toLowerCase().trim();
  const chunks: string[] = [];

  const lesson = LESSONS.find(
    item => item.t.toLowerCase().includes(q) || item.txt.toLowerCase().includes(q),
  );
  if (lesson) {
    chunks.push(
      `Bài học: ${lesson.t} (${lesson.lv} — ${lesson.cat})\n${lesson.txt.replace(/<[^>]+>/g, '')}`,
    );
  }

  const book = BOOKS.find(item => item.t.toLowerCase().includes(q));
  if (book) {
    chunks.push(`Sách: ${book.t}\nLý do nên đọc: ${book.why}\nÝ tưởng: ${book.ideas}`);
  }

  const form = FORMS.find(
    item => item.name.toLowerCase().includes(q) || item.q.some(keyword => q.includes(keyword)),
  );
  if (form) {
    chunks.push(
      `Công thức: ${form.name}\nGiải thích: ${form.what}\nBiểu thức: ${form.expr}\nVí dụ: ${form.ex}`,
    );
  }

  return chunks.join('\n\n');
}

function localFallback(query: string): string {
  const context = getLocalContext(query);
  if (context) return context;

  return `Mình chưa tìm thấy nội dung phù hợp cho "${query}" trong dữ liệu cục bộ.`;
}

function errorLabel(payload: GeminiResponse, status: number): string {
  const message =
    typeof payload.error === 'string' && payload.error.trim()
      ? payload.error.trim()
      : `Gemini API trả HTTP ${status}`;

  const code =
    typeof payload.code === 'string' && payload.code.trim()
      ? ` [${payload.code.trim()}]`
      : '';

  return `${message}${code}`.slice(0, 700);
}

export function AI() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'bot',
      text: 'Xin chào! Mình là trợ lý MathNexus. Hãy hỏi mình về bài học, công thức, sách hoặc một bài toán bạn đang làm.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  const send = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || loading) return;

    const history: ApiHistoryItem[] = msgs.slice(-8).map(msg => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      text: msg.text,
    }));

    setMsgs(current => [...current, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          appContext: getLocalContext(text),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as GeminiResponse;

      if (!response.ok) {
        throw new Error(errorLabel(data, response.status));
      }

      if (typeof data.text !== 'string' || !data.text.trim()) {
        throw new Error('Gemini trả về phản hồi rỗng.');
      }

      setMsgs(current => [...current, { role: 'bot', text: data.text as string }]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Lỗi không xác định';

      setMsgs(current => [
        ...current,
        {
          role: 'bot',
          text: `${localFallback(text)}\n\nGemini chưa trả lời được. Chi tiết: ${detail}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">TRỢ LÝ</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">MathNexus AI · Gemini</h1>
        <p className="text-muted max-w-lg">
          Hỏi bài, giải thích khái niệm và dùng dữ liệu bài học, công thức, tủ sách trong MathNexus làm ngữ cảnh.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK.map(question => (
          <button
            key={question}
            onClick={() => void send(question)}
            disabled={loading}
            className="px-3 py-1.5 rounded-full border border-line bg-panel text-[13px] hover:bg-[#eef8d8] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="flex flex-col h-[min(58vh,500px)] border border-line rounded-2xl overflow-hidden bg-panel">
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-2.5">
          {msgs.map((msg, index) => (
            <div
              key={index}
              className={`max-w-[85%] px-3 py-2.5 rounded-xl text-[14px] whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'self-end bg-lime text-lime-ink'
                  : 'self-start bg-bg border border-line'
              }`}
            >
              {msg.text}
            </div>
          ))}

          {loading && (
            <div className="self-start bg-bg border border-line px-3 py-2.5 rounded-xl text-[14px] text-muted">
              Gemini đang suy nghĩ…
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="flex gap-2 p-2.5 border-t border-line">
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void send(input);
            }}
            disabled={loading}
            placeholder="Hỏi một bài toán, công thức, khái niệm…"
            className="flex-1 px-3 py-2 border border-line rounded-xl bg-bg text-ink text-sm disabled:opacity-60"
          />
          <button
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            className="bg-lime text-lime-ink px-4 py-2 rounded-xl font-bold text-sm border-0 cursor-pointer hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Gửi câu hỏi"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default AI;
