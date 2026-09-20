import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { LessonCard } from '../components/ui/LessonCard';
import { useProgress } from '../hooks/useProgress';
import { matchesSearch } from '../utils/search';

const CATS = ['Tất cả', ...new Set(LESSONS.map(l => l.cat))];
const LEVELS = ['Tất cả', ...new Set(LESSONS.map(l => l.lv))];

export default function Library() {
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || 'Tất cả';
  const level = params.get('level') || 'Tất cả';
  const search = params.get('q') || '';
  const p = useProgress();
  const setFilter = (name: string, value: string) => setParams(current => { if (!value || value === 'Tất cả') current.delete(name); else current.set(name, value); return current; }, { replace: true });
  const filtered = LESSONS.filter(l => (cat === 'Tất cả' || l.cat === cat) && (level === 'Tất cả' || l.lv === level) && matchesSearch(`${l.t} ${l.cat}`, search));

  return <section className="page-enter"><div className="page-header"><p className="eyebrow">ĐỌC ĐỂ HIỂU</p><h1>Thư viện kiến thức</h1><p>Mỗi khái niệm là một cánh cửa. Chọn chủ đề khiến bạn tò mò và bắt đầu từ đó.</p></div>
    <div className="library-toolbar"><div className="search-field"><Search size={18} /><input value={search} onChange={e => setFilter('q', e.target.value)} placeholder="Tìm tên bài học, chủ đề…" aria-label="Tìm bài học" /></div><SlidersHorizontal size={18} className="text-muted hidden sm:block" /><select aria-label="Cấp học" value={level} onChange={e => setFilter('level', e.target.value)}>{LEVELS.map(l => <option key={l} value={l}>{l === 'Tất cả' ? 'Tất cả cấp học' : l}</option>)}</select></div>
    <div className="filter-row" aria-label="Chuyên đề">{CATS.map(c => <button key={c} className="filter-chip" aria-pressed={cat === c} onClick={() => setFilter('cat', c)}>{c}</button>)}</div>
    <p className="helper-text mb-4" aria-live="polite">{filtered.length} bài học dành cho bạn</p>
    <div className="lesson-grid">{filtered.map(lesson => <LessonCard key={lesson.id} lesson={lesson} done={p.lessonsRead.includes(lesson.id)} />)}</div>
    {!filtered.length && <div className="empty-state"><Search size={32} /><h3>Chưa có bài học phù hợp</h3><p>Thử đổi từ khóa hoặc chọn lại cấp học nhé.</p><button className="button button-light" onClick={() => setParams({})}>Xóa bộ lọc</button></div>}
  </section>;
}
