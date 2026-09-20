import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Sparkles, BookOpen, Trash2, ArrowUpRight } from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { BOOKS } from '../data/books';
import { FORMS } from '../data/formulas';
import { normalizeSearch } from '../utils/search';
import { ChatText } from '../components/ui/ChatText';

interface Message {
  role: 'user' | 'bot';
  text: string;
  source?: 'gemini' | 'local';
  links?: { to: string; label: string }[];
}

const WELCOME: Message = { role: 'bot', text: 'Chào bạn! Cùng gỡ rối một bài toán nhé. Bạn có thể hỏi về một khái niệm, nhờ giải thích công thức hoặc tìm bài học phù hợp.' };
const QUICK = ['Số phức là gì?', 'Giải thích đạo hàm', 'Công thức Euler', 'C(n,k) tổ hợp', 'Gợi ý bài tư duy'];

function localContext(query: string) {
  const q = normalizeSearch(query);
  const matches = (title: string) => {
    const normalized = normalizeSearch(title);
    return q.length > 1 && (q.includes(normalized) || normalized.includes(q));
  };
  const chunks: string[] = [];
  const links: { to: string; label: string }[] = [];
  const lesson = LESSONS.find(item => matches(item.t)) || LESSONS.find(item => matches(item.cat));
  if (lesson) {
    chunks.push(`${lesson.t}\n${lesson.txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    links.push({ to: `/lesson/${lesson.id}`, label: lesson.t });
  }
  const formula = FORMS.find(item => matches(item.name) || item.q.some(keyword => keyword.length > 1 && q.includes(normalizeSearch(keyword))));
  if (formula) {
    chunks.push(`${formula.name}: ${formula.what}\n$$${formula.expr}$$\nVí dụ: ${formula.ex}`);
    links.push({ to: `/formula/${formula.id}`, label: formula.name });
  }
  const book = BOOKS.find(item => matches(item.t));
  if (book) { chunks.push(`${book.t}: ${book.why}`); links.push({ to: `/book/${book.id}`, label: book.t }); }
  if (q.includes('tu duy')) { chunks.push('Hãy thử một bài toán suy luận trong mục Phát triển tư duy. Bạn có thể tự tìm lời giải trước khi mở gợi ý.'); links.push({ to: '/think', label: 'Khám phá bài tư duy' }); }
  return { text: chunks.join('\n\n'), links };
}

export default function AI() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, loading]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy.current) return;
    busy.current = true;
    const context = localContext(text);
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort('timeout'), 30000);
    setInput(''); setLoading(true);
    setMessages(current => [...current, { role: 'user', text }]);
    try {
      if (!navigator.onLine) throw new Error('Bạn đang ngoại tuyến.');
      if (import.meta.env.BASE_URL === '/mathnexus/') throw new Error('Bản GitHub Pages đang dùng thư viện tra cứu cục bộ.');
      const history: { role: 'user' | 'model'; text: string }[] = [];
      for (let i = 1; i < messages.length; i++) {
        if (messages[i].source === 'gemini' && messages[i - 1].role === 'user') {
          history.push({ role: 'user', text: messages[i - 1].text }, { role: 'model', text: messages[i].text });
        }
      }
      const response = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ message: text, history: history.slice(-8), appContext: context.text }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404 || payload.code === 'MISSING_API_KEY') throw new Error('Gemini chưa được cấu hình trên máy chủ này.');
        if (response.status === 429 || payload.upstreamStatus === 429) throw new Error('Gemini đang quá tải. Bạn có thể thử lại sau ít phút.');
        throw new Error('Chưa kết nối được với Gemini. Hãy thử lại sau.');
      }
      if (typeof payload.text !== 'string' || !payload.text.trim()) throw new Error('Gemini chưa trả về câu trả lời.');
      setMessages(current => [...current, { role: 'bot', text: payload.text, source: 'gemini' }]);
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;
      const detail = controller.signal.aborted ? 'Kết nối Gemini mất quá nhiều thời gian.' : error instanceof Error ? error.message : 'Chưa kết nối được Gemini.';
      setMessages(current => [...current, { role: 'bot', source: 'local', text: `${detail}\n\n${context.text || 'Thư viện chưa tìm thấy câu trả lời cho câu hỏi này. Thử tìm theo tên khái niệm như “đạo hàm”, “số phức” hoặc “tổ hợp”.'}`, links: context.links }]);
    } finally {
      window.clearTimeout(timer); busy.current = false;
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') setLoading(false);
    }
  };

  return <section className="page-enter"><div className="page-header"><p className="eyebrow">MỘT NGƯỜI BẠN CÙNG SUY NGHĨ</p><h1>Trợ lý MathNexus</h1><p>Hỏi để hiểu bản chất, tìm lời giải từng bước. Gemini cần kết nối máy chủ; thư viện cục bộ luôn sẵn sàng để tra cứu.</p></div><div className="filter-row">{QUICK.map(question => <button className="filter-chip" key={question} onClick={() => void send(question)} disabled={loading}>{question}</button>)}</div>
    <div className="chat-panel"><div className="chat-header"><span><Sparkles size={18} />MathNexus AI · Gemini</span><button className="icon-button" aria-label="Xóa cuộc trò chuyện" disabled={loading} onClick={() => setMessages([WELCOME])}><Trash2 size={17} /></button></div><div className="chat-messages" ref={scrollRef} role="log" aria-label="Cuộc trò chuyện" aria-live="polite">{messages.map((message, i) => <div key={i} className={`chat-message ${message.role}`}>
      {message.role === 'bot' && <span className="chat-source">{message.source === 'local' ? <><BookOpen size={13} />Tra cứu cục bộ · Không phải câu trả lời từ Gemini</> : <><Sparkles size={13} />{message.source === 'gemini' ? 'Gemini' : 'MathNexus'}</>}</span>}
      <div className="chat-text"><ChatText text={message.text} /></div>{!!message.links?.length && <div className="chat-links">{message.links.map(link => <Link key={link.to} to={link.to}>{link.label}<ArrowUpRight size={13} /></Link>)}</div>}
    </div>)}{loading && <div className="chat-message bot" role="status"><span className="chat-source"><Sparkles size={13} />Gemini đang suy nghĩ…</span><button className="text-link" onClick={() => { controllerRef.current?.abort(); busy.current = false; setLoading(false); }}>Dừng trả lời</button></div>}</div>
      <form className="chat-input" onSubmit={event => { event.preventDefault(); void send(input); }}><input aria-label="Câu hỏi cho trợ lý" value={input} onChange={e => setInput(e.target.value)} maxLength={12000} disabled={loading} placeholder="Điều gì khiến bạn tò mò?" autoComplete="off" /><button type="submit" aria-label="Gửi câu hỏi" className="button button-dark" disabled={loading || !input.trim()}><Send size={18} /></button></form>
    </div><p className="helper-text mt-3">Hãy đối chiếu các bước tính với bài học và công cụ để tự kiểm tra kết quả.</p></section>;
}
