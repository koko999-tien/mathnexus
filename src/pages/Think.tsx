import { useState } from 'react';
import { THINK } from '../data/think';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

export function Think() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">LẬP LUẬN</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Phát triển tư duy</h1>
        <p className="text-muted max-w-lg">Không cần công thức nặng. Cần chuỗi suy luận và phản ví dụ.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {THINK.map((item, i) => (
          <div key={i} className="bg-panel border border-line rounded-2xl p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-forest" />
                <span className="font-semibold text-sm">{item.t}</span>
              </div>
              <button onClick={() => setOpen(open === i ? null : i)} className="text-muted hover:text-ink transition-colors bg-transparent border-0 cursor-pointer p-1">
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
