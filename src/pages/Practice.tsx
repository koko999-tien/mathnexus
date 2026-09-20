import { useState } from 'react';
import { QUIZ } from '../data/quiz';
import { getProgress, saveProgress } from '../utils/storage';
import { Check, X } from 'lucide-react';

const CATS = ['Tất cả', ...new Set(QUIZ.map(q => q.cat))];

export function Practice() {
  const [cat, setCat] = useState('Tất cả');
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);

  const filtered = QUIZ.filter(q => cat === 'Tất cả' || q.cat === cat);
  const q = filtered[idx % filtered.length];

  const answer = (i: number) => {
    if (answered !== null) return;
    setAnswered(i);
    const p = getProgress();
    p.questionsDone++;
    saveProgress(p);
  };

  const next = () => {
    setIdx((idx + 1) % filtered.length);
    setAnswered(null);
  };

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">LUYỆN</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Luyện tập</h1>
        <p className="text-muted max-w-lg">Câu theo chuyên đề: đại số, hình, giải tích, số phức, rời rạc…</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {CATS.map(c => (
          <button key={c} onClick={() => { setCat(c); setIdx(0); setAnswered(null); }} className={`px-3 py-1.5 rounded-full border text-[13px] ${cat === c ? 'bg-[#eef8d8] border-transparent font-semibold' : 'bg-panel border-line'}`}>{c}</button>
        ))}
      </div>
      <div className="bg-panel border border-line rounded-2xl p-5">
        <div className="text-[11px] tracking-[.12em] font-bold text-[#3d6b5c] mb-2">{q.cat}</div>
        <p className="font-semibold text-lg m-0 mb-4">{q.q}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {q.a.map((a, i) => {
            let cls = 'bg-bg border border-line rounded-xl px-4 py-3 text-sm text-left cursor-pointer hover:border-sage transition-colors';
            if (answered !== null) {
              if (i === q.i) cls = 'bg-[#eef8d8] border border-forest rounded-xl px-4 py-3 text-sm text-left font-semibold';
              else if (i === answered) cls = 'bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-left';
              else cls = 'bg-bg border border-line rounded-xl px-4 py-3 text-sm text-left opacity-50';
            }
            return <button key={i} onClick={() => answer(i)} className={cls}>{a}</button>;
          })}
        </div>
        {answered !== null && (
          <div className="flex items-start gap-2 text-[13px]">
            {answered === q.i ? <Check size={16} className="text-forest mt-0.5 shrink-0" /> : <X size={16} className="text-red-500 mt-0.5 shrink-0" />}
            <span className="text-muted">{q.ex}</span>
          </div>
        )}
        <button onClick={next} className="mt-4 bg-forest text-white px-5 py-2.5 rounded-xl font-bold text-sm border-0 cursor-pointer hover:opacity-90 transition">
          Câu tiếp →
        </button>
      </div>
    </section>
  );
}
