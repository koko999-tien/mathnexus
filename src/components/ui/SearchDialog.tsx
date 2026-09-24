import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search, Sparkles, X } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
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

  function handleResultKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const links = Array.from(resultsRef.current?.querySelectorAll<HTMLAnchorElement>('a.search-result') || []);
    const current = links.indexOf(event.target as HTMLAnchorElement);
    const isInput = event.target === inputRef.current;
    if (!isInput && current < 0) return;
    if (event.key === 'Enter' && isInput && links.length) {
      event.preventDefault();
      links[0].click();
    } else if (event.key === 'ArrowDown' && links.length) {
      event.preventDefault();
      links[Math.min(current + 1, links.length - 1)].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (current <= 0) inputRef.current?.focus();
      else links[current - 1].focus();
    }
  }

  return (
    <Modal title="Bạn muốn tìm hiểu điều gì?" onClose={onClose} className="global-search-dialog">
      <div onKeyDown={handleResultKeys}>
        <div className="search-field">
          <Search size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            aria-label="Tìm kiếm toàn bộ MathNexus"
            aria-describedby="global-search-hint"
            autoComplete="off"
            maxLength={300}
            placeholder="Thử: mình yếu đạo hàm, nên học gì trước?"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          {query && <button className="icon-button search-clear" aria-label="Xóa từ khóa" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X size={18} /></button>}
        </div>

        <div className="search-results" ref={resultsRef}>
          <p className="search-summary" role="status" aria-live="polite" aria-atomic="true">{trimmed ? `${results.length} kết quả được xếp theo độ phù hợp` : 'Gợi ý dành cho bạn'}</p>

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

          {!results.length && trimmed && (
            <div className="empty-state">
              <Search size={30} aria-hidden="true" />
              <h3>Chưa có mục nào khớp trực tiếp</h3>
              <p>Thử từ khóa ngắn hơn, như “đạo hàm”, hoặc gửi câu hỏi cho trợ lý bên dưới.</p>
            </div>
          )}

          {trimmed && (
            <Link to={aiHref} onClick={onClose} className="search-result">
              <div>
                <span className="search-type">Trợ lý</span>
                <strong>Hỏi trợ lý toán học về “{trimmed}”</strong>
                <small>Hỏi thêm dựa trên các bài học, công thức và sách liên quan.</small>
              </div>
              <Sparkles size={18} />
            </Link>
          )}

        </div>
      </div>

      <p className="dialog-hint" id="global-search-hint">Gõ có dấu hoặc không dấu · ↑ ↓ chọn · Enter mở · Esc đóng</p>
    </Modal>
  );
}
