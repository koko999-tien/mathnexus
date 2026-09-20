import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import { LESSONS } from '../../data/lessons';
import { FORMS } from '../../data/formulas';
import { BOOKS } from '../../data/books';
import { NAVIGATION } from '../../data/navigation';
import { matchesSearch } from '../../utils/search';
import { Modal } from './Modal';

const ITEMS = [
  ...LESSONS.map(l => ({ title: l.t, detail: `${l.lv} · ${l.cat}`, type: 'Bài học', to: `/lesson/${l.id}`, keywords: l.cat })),
  ...FORMS.map(f => ({ title: f.name, detail: f.cat, type: 'Công thức', to: `/formula/${f.id}`, keywords: f.q.join(' ') })),
  ...BOOKS.map(b => ({ title: b.t, detail: b.lv, type: 'Sách', to: `/book/${b.id}`, keywords: b.why })),
  ...NAVIGATION.map(n => ({ title: n.label, detail: n.group, type: 'Trang', to: n.to, keywords: '' })),
];

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const results = query.trim() ? ITEMS.filter(item => matchesSearch(`${item.title} ${item.detail} ${item.keywords}`, query)).slice(0, 24) : ITEMS.slice(0, 5);
  return (
    <Modal title="Bạn muốn tìm hiểu điều gì?" onClose={onClose}>
      <div className="search-field"><Search size={20} /><input autoFocus aria-label="Tìm kiếm toàn bộ MathNexus" placeholder="Bài học, công thức, sách…" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <div className="search-results">
        <p className="eyebrow">{query ? `${results.length} kết quả phù hợp` : 'Gợi ý dành cho bạn'}</p>
        {results.map(item => <Link key={item.to} to={item.to} onClick={onClose} className="search-result"><div><span className="search-type">{item.type}</span><strong>{item.title}</strong><small>{item.detail}</small></div><ArrowUpRight size={18} /></Link>)}
        {!results.length && <div className="empty-state"><Search size={30} /><h3>Chưa tìm thấy nội dung</h3><p>Thử một từ khóa ngắn hơn, như “đạo hàm” hoặc “hình học”.</p></div>}
      </div>
      <p className="dialog-hint">Tìm được cả khi gõ không dấu · Esc để đóng</p>
    </Modal>
  );
}
