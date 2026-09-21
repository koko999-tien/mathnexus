import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search, Sparkles } from 'lucide-react';
import { LESSONS } from '../../data/lessons';
import { NAVIGATION } from '../../data/navigation';
import { scoreSearch } from '../../utils/search';
import { searchKnowledge } from '../../utils/knowledgeSearch';
import { Modal } from './Modal';

const SUGGESTIONS = LESSONS.slice(0, 5).map(item => ({
  title: item.t,
  detail: `${item.lv} · ${item.cat}`,
  type: 'Bài học',
  to: `/lesson/${item.id}`,
}));

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  const results = useMemo(() => {
    if (!trimmed) return SUGGESTIONS;

    const knowledge = searchKnowledge(trimmed, 16).map(item => ({
      title: item.title,
      detail: item.detail,
      type: item.type,
      to: item.to,
      score: item.score,
    }));

    const pages = NAVIGATION
      .map(item => ({
        title: item.label,
        detail: item.group,
        type: 'Trang',
        to: item.to,
        score: scoreSearch(
          {
            title: item.label,
            detail: item.group,
            keywords: 'mathnexus điều hướng trang chức năng toán học',
          },
          trimmed,
        ),
      }))
      .filter(item => item.score > 0);

    return [...knowledge, ...pages]
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'vi'))
      .slice(0, 18);
  }, [trimmed]);

  const aiHref = trimmed ? `/ai?q=${encodeURIComponent(trimmed)}` : '/ai';

  return (
    <Modal title="Bạn muốn tìm hiểu điều gì?" onClose={onClose}>
      <div className="search-field">
        <Search size={20} />
        <input
          autoFocus
          aria-label="Tìm kiếm toàn bộ MathNexus"
          placeholder="Thử: mình yếu đạo hàm, nên học gì trước?"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>

      <div className="search-results">
        <p className="eyebrow">{trimmed ? `${results.length} kết quả được xếp theo độ phù hợp` : 'Gợi ý dành cho bạn'}</p>

        {results.map(item => (
          <Link key={item.to} to={item.to} onClick={onClose} className="search-result">
            <div>
              <span className="search-type">{item.type}</span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        ))}

        {trimmed && (
          <Link to={aiHref} onClick={onClose} className="search-result">
            <div>
              <span className="search-type">AI</span>
              <strong>Hỏi MathNexus AI về “{trimmed}”</strong>
              <small>Gemini sẽ dùng các bài học, công thức và sách liên quan làm ngữ cảnh.</small>
            </div>
            <Sparkles size={18} />
          </Link>
        )}

        {!results.length && trimmed && (
          <div className="empty-state">
            <Search size={30} />
            <h3>Chưa có mục nào khớp trực tiếp</h3>
            <p>Bạn vẫn có thể chuyển nguyên câu hỏi sang MathNexus AI ngay bên dưới.</p>
          </div>
        )}
      </div>

      <p className="dialog-hint">Tìm được khi gõ không dấu và cả câu tự nhiên · Esc để đóng</p>
    </Modal>
  );
}
