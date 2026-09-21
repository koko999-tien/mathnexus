import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Send, Sparkles, BookOpen, Trash2, ArrowUpRight } from 'lucide-react';
import { buildKnowledgeContext } from '../utils/knowledgeSearch';
import { ChatText } from '../components/ui/ChatText';

interface Message {
  role: 'user' | 'bot';
  text: string;
  source?: 'gemini' | 'local';
  model?: string;
  fallbackUsed?: boolean;
  links?: { to: string; label: string }[];
}

interface GeminiPayload {
  text?: unknown;
  error?: unknown;
  code?: unknown;
  model?: unknown;
  fallbackUsed?: unknown;
  upstreamStatus?: unknown;
}

const CHAT_KEY = 'mathnexus_ai_chat_v1';
const WELCOME: Message = { role: 'bot', text: 'Chào bạn! Cùng gỡ rối một bài toán nhé. Bạn có thể hỏi về một khái niệm, nhờ giải thích công thức hoặc tìm bài học phù hợp.' };
const QUICK = ['Số phức là gì?', 'Giải thích đạo hàm', 'Công thức Euler', 'C(n,k) tổ hợp', 'Gợi ý bài tư duy'];

function loadConversation(): Message[] {
  try {
    const raw = sessionStorage.getItem(CHAT_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [WELCOME];

    const safe = parsed
      .filter(item => item && (item.role === 'user' || item.role === 'bot') && typeof item.text === 'string')
      .slice(-30)
      .map(item => ({
        role: item.role as 'user' | 'bot',
        text: item.text.slice(0, 16000),
        source: item.source === 'gemini' || item.source === 'local' ? item.source : undefined,
        model: typeof item.model === 'string' ? item.model.slice(0, 120) : undefined,
        fallbackUsed: item.fallbackUsed === true,
        links: Array.isArray(item.links)
          ? item.links
              .filter((link: unknown): link is { to: string; label: string } => Boolean(link) && typeof (link as { to?: unknown }).to === 'string' && typeof (link as { label?: unknown }).label === 'string')
              .slice(0, 6)
          : undefined,
      }));

    return safe.length ? safe : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

function friendlyGeminiError(payload: GeminiPayload, status: number): string {
  const code = typeof payload.code === 'string' ? payload.code : '';
  const upstreamStatus = typeof payload.upstreamStatus === 'number' ? payload.upstreamStatus : null;

  if (status === 404 || code === 'MISSING_API_KEY') return 'Gemini chưa được cấu hình trên máy chủ này.';
  if (status === 429 || upstreamStatus === 429 || code === 'RESOURCE_EXHAUSTED') return 'Gemini đang giới hạn lượt gọi. Hãy thử lại sau một chút.';
  if (status === 503 || code === 'UNAVAILABLE') return 'Gemini đang quá tải tạm thời. MathNexus đã thử cả model dự phòng nhưng chưa nhận được phản hồi.';
  if (status === 504 || code === 'TIMEOUT') return 'Gemini phản hồi quá chậm nên MathNexus đã dừng yêu cầu.';
  if (code === 'NETWORK_ERROR') return 'Máy chủ MathNexus chưa kết nối được tới Gemini.';
  return 'Chưa kết nối được với Gemini. Hãy thử lại sau.';
}

export default function AI() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(loadConversation);
  const [input, setInput] = useState(() => searchParams.get('q')?.slice(0, 12000) || '');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;

    try {
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // Chat persistence is a convenience only; never block the assistant if storage is unavailable.
    }
  }, [messages, loading]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const clearConversation = () => {
    controllerRef.current?.abort();
    busy.current = false;
    setLoading(false);
    setMessages([WELCOME]);
    try { sessionStorage.removeItem(CHAT_KEY); } catch { /* no-op */ }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy.current) return;

    busy.current = true;
    const context = buildKnowledgeContext(text, 5);
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort('timeout'), 30000);

    setInput('');
    setLoading(true);
    setMessages(current => [...current, { role: 'user', text }]);

    try {
      if (!navigator.onLine) throw new Error('Bạn đang ngoại tuyến.');
      if (import.meta.env.BASE_URL === '/mathnexus/') throw new Error('Bản GitHub Pages đang dùng thư viện tra cứu cục bộ.');

      const history: { role: 'user' | 'model'; text: string }[] = [];
      for (let i = 1; i < messages.length; i++) {
        if (messages[i].source === 'gemini' && messages[i - 1].role === 'user') {
          history.push(
            { role: 'user', text: messages[i - 1].text },
            { role: 'model', text: messages[i].text },
          );
        }
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          history: history.slice(-8),
          appContext: context.text,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as GeminiPayload;

      if (!response.ok) {
        throw new Error(friendlyGeminiError(payload, response.status));
      }

      if (typeof payload.text !== 'string' || !payload.text.trim()) {
        throw new Error('Gemini chưa trả về câu trả lời.');
      }

      setMessages(current => [
        ...current,
        {
          role: 'bot',
          text: payload.text as string,
          source: 'gemini',
          model: typeof payload.model === 'string' ? payload.model : undefined,
          fallbackUsed: payload.fallbackUsed === true,
          links: context.links,
        },
      ]);
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;

      const detail = controller.signal.aborted
        ? 'Kết nối Gemini mất quá nhiều thời gian.'
        : error instanceof Error
          ? error.message
          : 'Chưa kết nối được Gemini.';

      setMessages(current => [
        ...current,
        {
          role: 'bot',
          source: 'local',
          text: `${detail}\n\n${context.text || 'Thư viện chưa tìm thấy nội dung liên quan. Bạn có thể thử hỏi theo tên khái niệm, chủ đề hoặc mục tiêu học.'}`,
          links: context.links,
        },
      ]);
    } finally {
      window.clearTimeout(timer);
      busy.current = false;
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') setLoading(false);
    }
  };

  return <section className="page-enter"><div className="page-header"><p className="eyebrow">MỘT NGƯỜI BẠN CÙNG SUY NGHĨ</p><h1>Trợ lý MathNexus</h1><p>Hỏi để hiểu bản chất, tìm lời giải từng bước. Gemini được bổ sung ngữ cảnh từ các bài học, công thức và sách phù hợp nhất trong MathNexus.</p></div><div className="filter-row">{QUICK.map(question => <button className="filter-chip" key={question} onClick={() => void send(question)} disabled={loading}>{question}</button>)}</div>
    <div className="chat-panel"><div className="chat-header"><span><Sparkles size={18} />MathNexus AI · Gemini</span><button className="icon-button" aria-label="Xóa cuộc trò chuyện" disabled={loading} onClick={clearConversation}><Trash2 size={17} /></button></div><div className="chat-messages" ref={scrollRef} role="log" aria-label="Cuộc trò chuyện" aria-live="polite">{messages.map((message, i) => <div key={i} className={`chat-message ${message.role}`}>
      {message.role === 'bot' && <span className="chat-source">{message.source === 'local' ? <><BookOpen size={13} />Tra cứu cục bộ · Không phải câu trả lời từ Gemini</> : <><Sparkles size={13} />{message.source === 'gemini' ? `Gemini${message.model ? ` · ${message.model}` : ''}${message.fallbackUsed ? ' · dự phòng' : ''}` : 'MathNexus'}</>}</span>}
      <div className="chat-text"><ChatText text={message.text} /></div>{!!message.links?.length && <div className="chat-links">{message.links.map(link => <Link key={link.to} to={link.to}>{link.label}<ArrowUpRight size={13} /></Link>)}</div>}
    </div>)}{loading && <div className="chat-message bot" role="status"><span className="chat-source"><Sparkles size={13} />Gemini đang suy nghĩ và tra cứu MathNexus…</span><button className="text-link" onClick={() => { controllerRef.current?.abort(); busy.current = false; setLoading(false); }}>Dừng trả lời</button></div>}</div>
      <form className="chat-input" onSubmit={event => { event.preventDefault(); void send(input); }}><input aria-label="Câu hỏi cho trợ lý" value={input} onChange={event => setInput(event.target.value)} maxLength={12000} disabled={loading} placeholder="Ví dụ: mình yếu đạo hàm, nên học gì trước?" autoComplete="off" /><button type="submit" aria-label="Gửi câu hỏi" className="button button-dark" disabled={loading || !input.trim()}><Send size={18} /></button></form>
    </div><p className="helper-text mt-3">Các liên kết dưới câu trả lời là nội dung MathNexus đã được chọn làm ngữ cảnh hoặc tài liệu liên quan để bạn đối chiếu.</p></section>;
}
