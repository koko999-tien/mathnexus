import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { THINK } from '../data/think';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

export function Think() {
  const [params] = useSearchParams();
  const selected = params.has('item') ? Number(params.get('item')) : -1;
  const [open, setOpen] = useState<number | null>(null);
  const items = THINK.map((item, index) => ({ item, index })).sort((a, b) => Number(b.index === selected) - Number(a.index === selected));

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-accent">LẬP LUẬN</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Phát triển tư duy</h1>
        <p className="text-muted max-w-lg">Không cần công thức nặng. Cần chuỗi suy luận và phản ví dụ.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(({ item, index: i }) => (
          <div key={i} className={`bg-panel border rounded-2xl p-5 ${i === selected ? 'border-sage' : 'border-line'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-forest" />
                <span className="font-semibold text-sm">{item.t}</span>
              </div>
              <button aria-label={`${open === i ? 'Ẩn' : 'Xem'} gợi ý: ${item.t}`} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="icon-button">
                {open === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            <p className="text-sm m-0 mb-2">{item.q}</p>
            {open === i && (
              <div className="text-[13px] text-muted bg-bg rounded-xl p-3 mt-2 border border-line">
                {item.h}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default Think;
