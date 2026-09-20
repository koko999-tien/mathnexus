import { useState, useRef, useEffect } from 'react';
import { LESSONS } from '../data/lessons';
import { BOOKS } from '../data/books';
import { FORMS } from '../data/formulas';
import { Send } from 'lucide-react';

interface Msg { role: 'user' | 'bot'; text: string; }

const QUICK = [
  'Số phức là gì',
  'Toán rời rạc dùng để làm gì',
  'Công thức Euler',
  'C(n,k) tổ hợp',
  'Gợi ý một bài tư duy',
  'Sách đại số tuyến tính',
];

function searchApp(query: string): string {
  const q = query.toLowerCase();
  const lesson = LESSONS.find(l => l.t.toLowerCase().includes(q) || l.txt.toLowerCase().includes(q));
  if (lesson) return `📖 **${lesson.t}** (${lesson.lv} — ${lesson.cat})\n\n${lesson.txt.replace(/<[^>]+>/g, '')}`;
  const book = BOOKS.find(b => b.t.toLowerCase().includes(q));
  if (book) return `📚 **${book.t}**\n\n${book.why}\n\nÝ tưởng: ${book.ideas}`;
  const form = FORMS.find(f => f.name.toLowerCase().includes(q) || f.q.some(k => q.includes(k)));
  if (form) return `🔢 **${form.name}**\n\n${form.what}\n\n${form.expr}\n\n${form.ex}`;
  return `Mình chưa tìm thấy nội dung phù hợp cho "${query}". Thử hỏi về: phân số, Pythagoras, đạo hàm, số phức, Bayes, hoặc một cuốn sách cụ thể.`;
}

export function AI() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: 'Xin chào! Hỏi mình về bài học, công thức, sách trong thư viện.' }]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { role: 'user', text }, { role: 'bot', text: searchApp(text) }]);
    setInput('');
  };

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">TRỢ LÝ</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Trợ lý AI (trên máy)</h1>
        <p className="text-muted max-w-lg">Trả lời từ thư viện, công thức và tủ sách trong app.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} className="px-3 py-1.5 rounded-full border border-line bg-panel text-[13px] hover:bg-[#eef8d8] transition-colors cursor-pointer">{q}</button>
        ))}
      </div>
      <div className="flex flex-col h-[min(58vh,500px)] border border-line rounded-2xl overflow-hidden bg-panel">
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-2.5">
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] px-3 py-2.5 rounded-xl text-[14px] whitespace-pre-wrap ${m.role === 'user' ? 'self-end bg-lime text-lime-ink' : 'self-start bg-bg border border-line'}`}>
              {m.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 p-2.5 border-t border-line">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="Hỏi công thức, bài học, sách…" className="flex-1 px-3 py-2 border border-line rounded-xl bg-bg text-ink text-sm" />
          <button onClick={() => send(input)} className="bg-lime text-lime-ink px-4 py-2 rounded-xl font-bold text-sm border-0 cursor-pointer hover:opacity-90 transition"><Send size={16} /></button>
        </div>
      </div>
    </section>
  );
}

export default AI;
