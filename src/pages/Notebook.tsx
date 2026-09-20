import { useState, useEffect } from 'react';
import { load, save } from '../utils/storage';
import { Save } from 'lucide-react';

const PRESETS = [
  { label: 'Định lý', prefix: 'Định lý: ' },
  { label: 'Lỗi', prefix: 'Lỗi thường gặp: ' },
  { label: 'Công thức', prefix: 'Công thức + ý nghĩa: ' },
  { label: 'Phản ví dụ', prefix: 'Phản ví dụ: ' },
];

export function Notebook() {
  const [text, setText] = useState(() => load<string>('notes', ''));

  useEffect(() => { save('notes', text); }, [text]);

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">GHI CHÚ</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Sổ tay của tôi</h1>
        <p className="text-muted max-w-lg">Định lý, lỗi thường gặp, ý tưởng — lưu trên trình duyệt này.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => setText(t => t + '\n' + p.prefix)} className="px-3 py-1.5 rounded-full border border-line bg-panel text-[13px] hover:bg-[#eef8d8] transition-colors cursor-pointer">{p.label}</button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={14} placeholder="Định lý, lỗi thường gặp, ý tưởng — một ý mỗi dòng." className="w-full px-3 py-2.5 border border-line rounded-xl bg-bg text-ink text-sm font-mono resize-y mb-4" />
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Save size={14} /> Tự lưu khi gõ · {text.split('\n').filter(l => l.trim()).length} dòng
      </div>
    </section>
  );
}
