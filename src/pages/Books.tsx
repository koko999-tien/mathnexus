import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BOOKS } from '../data/books';

const LVS = ['Tất cả', ...new Set(BOOKS.map(b => b.lv))];

export function Books() {
  const [lv, setLv] = useState('Tất cả');
  const filtered = BOOKS.filter(b => lv === 'Tất cả' || b.lv === lv);

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">ĐỌC SÁCH</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Tủ sách</h1>
        <p className="text-muted max-w-lg">Sách nên đọc theo cấp — cửa vào tư duy, không phải giáo trình đầy đủ.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {LVS.map(v => (
          <button key={v} onClick={() => setLv(v)} className={`px-3 py-1.5 rounded-full border text-[13px] ${lv === v ? 'bg-[#eef8d8] border-transparent font-semibold' : 'bg-panel border-line'}`}>{v}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filtered.map(b => (
          <Link key={b.id} to={`/book/${b.id}`} className="bg-panel border border-line rounded-2xl p-4 no-underline text-ink hover:border-sage transition-colors">
            <div className="text-[12px] text-muted mb-1">{b.lv}</div>
            <div className="font-semibold text-sm mb-2">{b.t}</div>
            <p className="text-muted text-[13px] m-0">{b.why}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
