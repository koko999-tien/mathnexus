import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LESSONS } from '../data/lessons';

const CATS = ['Tất cả', ...new Set(LESSONS.map(l => l.cat))];
const LVS = ['Tất cả', ...new Set(LESSONS.map(l => l.lv))];

export function Library() {
  const [cat, setCat] = useState('Tất cả');
  const [lv, setLv] = useState('Tất cả');

  const filtered = LESSONS.filter(l =>
    (cat === 'Tất cả' || l.cat === cat) && (lv === 'Tất cả' || l.lv === lv)
  );

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">ĐỌC ĐỂ HIỂU</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Thư viện kiến thức</h1>
        <p className="text-muted max-w-lg">Bài đọc ngắn: định nghĩa, ý nghĩa, ví dụ. Không phải đề thi.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {LVS.map(v => (
          <button key={v} onClick={() => setLv(v)} className={`px-3 py-1.5 rounded-full border text-[13px] ${lv === v ? 'bg-[#eef8d8] border-transparent font-semibold' : 'bg-panel border-line'}`}>{v}</button>
        ))}
        <span className="w-px h-6 bg-line self-center" />
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-full border text-[13px] ${cat === c ? 'bg-[#eef8d8] border-transparent font-semibold' : 'bg-panel border-line'}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filtered.map(l => (
          <Link key={l.id} to={`/lesson/${l.id}`} className="bg-panel border border-line rounded-2xl p-4 no-underline text-ink hover:border-sage transition-colors">
            <div className="flex justify-between items-center mb-2">
              <span className={`w-9 h-9 rounded-xl grid place-items-center font-[Georgia] text-xl ${l.icon === 'algebra' ? 'bg-[#e8f1ec] text-[#3d6b5c]' : l.icon === 'geometry' ? 'bg-[#fbebde] text-warm' : l.icon === 'analysis' ? 'bg-[#e5f2fc] text-[#2783de]' : 'bg-[#f4eef8] text-[#6b4e8a]'}`}>
                {l.sym}
              </span>
              <span className="text-[12px] text-muted">{l.lv}</span>
            </div>
            <div className="font-semibold text-sm mb-1">{l.t}</div>
            <div className="flex justify-between items-center mt-3 text-muted text-[13px]">
              <span>{l.cat}</span>
              <span>{l.m}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
