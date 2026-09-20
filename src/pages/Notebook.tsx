import { useState } from 'react';
import { load, save } from '../utils/storage';
import { Save, Download } from 'lucide-react';
import { downloadFile } from '../utils/download';

const PRESETS = [
  { label: 'Định lý', prefix: 'Định lý: ' },
  { label: 'Lỗi', prefix: 'Lỗi thường gặp: ' },
  { label: 'Công thức', prefix: 'Công thức + ý nghĩa: ' },
  { label: 'Phản ví dụ', prefix: 'Phản ví dụ: ' },
];

export function Notebook() {
  const [text, setText] = useState(() => { const value = load<unknown>('notes', ''); return typeof value === 'string' ? value : ''; });
  const [saved, setSaved] = useState(true);
  const updateText = (value: string) => { setText(value); setSaved(save('notes', value)); };

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-accent">GHI CHÚ</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Sổ tay của tôi</h1>
        <p className="text-muted max-w-lg">Định lý, lỗi thường gặp, ý tưởng — lưu trên trình duyệt này.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => updateText(text + (text ? '\n' : '') + p.prefix)} className="filter-chip">{p.label}</button>
        ))}
      </div>
      <textarea aria-label="Nội dung sổ tay" value={text} onChange={e => updateText(e.target.value)} rows={14} placeholder="Định lý, lỗi thường gặp, ý tưởng — một ý mỗi dòng." className="notebook-editor" />
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted mt-4">
        <span className="flex items-center gap-2" role="status"><Save size={14} /> {saved ? 'Đã lưu trên trình duyệt' : 'Chưa lưu được. Hãy tải ghi chú xuống.'} · {text.split('\n').filter(l => l.trim()).length} dòng</span>
        <button className="button button-light" disabled={!text.trim()} onClick={() => downloadFile(text, 'mathnexus-so-tay.txt', 'text/plain;charset=utf-8')}><Download size={16} />Tải ghi chú</button>
      </div>
    </section>
  );
}

export default Notebook;
