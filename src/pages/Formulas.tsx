import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FORMS } from '../data/formulas';
import { MathText } from '../components/ui/MathText';

const CATS = ['Tất cả', ...new Set(FORMS.map(f => f.cat))];

export function Formulas() {
  const [cat, setCat] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState('x^2 + 2x - 3 = 0');

  const filtered = FORMS.filter(f =>
    (cat === 'Tất cả' || f.cat === cat) &&
    (search === '' || f.name.toLowerCase().includes(search.toLowerCase()) || f.q.some(q => q.includes(search.toLowerCase())))
  );

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">CÔNG THỨC</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Soạn & hiểu công thức</h1>
        <p className="text-muted max-w-lg">Tìm công thức → đọc nó là gì, dùng khi nào, ứng dụng ra sao.</p>
      </div>
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Thử "phân số", "đạo hàm", "Pythagoras"…' className="flex-1 px-3 py-2.5 border border-line rounded-xl bg-bg text-ink text-sm" />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-full border text-[13px] ${cat === c ? 'bg-[#eef8d8] border-transparent font-semibold' : 'bg-panel border-line'}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {filtered.map(f => (
          <Link key={f.id} to={`/formula/${f.id}`} className="bg-panel border border-line rounded-2xl p-4 no-underline text-ink hover:border-sage transition-colors">
            <div className="text-[11px] tracking-[.12em] font-bold text-[#3d6b5c] mb-1">{f.cat}</div>
            <div className="font-semibold text-sm mb-2">{f.name}</div>
            <div className="text-muted text-[13px]"><MathText expr={f.expr} /></div>
          </Link>
        ))}
      </div>
      <div className="bg-panel border border-line rounded-2xl p-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c] mb-2">XEM TRƯỚC BIỂU THỨC</div>
        <div className="mb-2">
          <label className="text-xs font-bold text-muted block mb-1">Gõ: x^2, sqrt(x), pi, theta, integral</label>
          <input value={preview} onChange={e => setPreview(e.target.value)} className="w-full px-3 py-2.5 border border-line rounded-xl bg-bg text-ink text-sm" />
        </div>
        <div className="font-[Georgia] italic text-xl"><MathText expr={preview} display /></div>
      </div>
    </section>
  );
}

export default Formulas;
