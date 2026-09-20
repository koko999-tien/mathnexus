import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FORMS } from '../data/formulas';
import { MathText } from '../components/ui/MathText';
import { matchesSearch } from '../utils/search';

const CATS = ['Tất cả', ...new Set(FORMS.map(f => f.cat))];

export function Formulas() {
  const [cat, setCat] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState('x^2 + 2x - 3 = 0');

  const filtered = FORMS.filter(f =>
    (cat === 'Tất cả' || f.cat === cat) &&
    matchesSearch(`${f.name} ${f.q.join(' ')}`, search)
  );

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-accent">CÔNG THỨC</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Soạn & hiểu công thức</h1>
        <p className="text-muted max-w-lg">Tìm công thức → đọc nó là gì, dùng khi nào, ứng dụng ra sao.</p>
      </div>
      <div className="flex gap-2 mb-4">
        <input aria-label="Tìm công thức" value={search} onChange={e => setSearch(e.target.value)} placeholder='Thử "đạo hàm", "Pythagoras"…' className="flex-1 min-w-0 px-3 py-2.5 border border-line rounded-xl bg-panel text-ink text-sm" />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} className="filter-chip" aria-pressed={cat === c}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {filtered.map(f => (
          <Link key={f.id} to={`/formula/${f.id}`} className="min-w-0 bg-panel border border-line rounded-2xl p-4 no-underline text-ink hover:border-sage transition-colors">
            <div className="text-[11px] tracking-[.12em] font-bold text-accent mb-1">{f.cat}</div>
            <div className="font-semibold text-sm mb-2">{f.name}</div>
            <div className="text-muted text-[13px] overflow-x-auto py-1"><MathText expr={f.expr} /></div>
          </Link>
        ))}
      </div>
      {!filtered.length && <div className="empty-state"><h3>Chưa tìm thấy công thức phù hợp</h3><button onClick={() => { setCat('Tất cả'); setSearch(''); }} className="button button-light">Xóa bộ lọc</button></div>}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-accent mb-2">XEM TRƯỚC BIỂU THỨC</div>
        <div className="mb-2">
          <label htmlFor="latex-preview" className="text-xs font-bold text-muted block mb-1">LaTeX: {'x^2, \\sqrt{x}, \\pi, \\theta, \\int'}</label>
          <input id="latex-preview" maxLength={2000} value={preview} onChange={e => setPreview(e.target.value)} className="w-full px-3 py-2.5 border border-line rounded-xl bg-bg text-ink text-sm" />
        </div>
        <div className="font-[Georgia] italic text-xl"><MathText expr={preview} display /></div>
      </div>
    </section>
  );
}

export default Formulas;
