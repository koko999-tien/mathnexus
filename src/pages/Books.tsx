import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, LoaderCircle, Search } from 'lucide-react';
import { BOOKS, type Book } from '../data/books';
import './library.css';

const LVS = ['Tất cả', ...new Set(BOOKS.map(b => b.lv))];

interface OpenMatch {
  key: string;
  title: string;
  authors: string[];
  firstPublishYear: number | null;
  cover: string;
  readState: 'public' | 'borrow' | 'scan' | 'record';
  readLabel: string;
  archiveId: string;
  openLibraryUrl: string;
}

interface Lookup {
  status: 'loading' | 'done' | 'error';
  items: OpenMatch[];
}

function searchTitle(book: Book): string {
  return book.t.split('—')[0]?.trim() || book.t;
}

function bookInfoHref(match: OpenMatch): string {
  const params = new URLSearchParams();
  params.set('key', match.key);
  if (match.archiveId) params.set('archive', match.archiveId);
  params.set('title', match.title);
  params.set('authors', match.authors.join('|'));
  if (match.cover) params.set('cover', match.cover);
  return '/library/book-info?' + params.toString();
}

function BookLookup({ book }: { book: Book }) {
  const [lookup, setLookup] = useState<Lookup | null>(null);

  const find = async () => {
    if (lookup?.status === 'loading') return;
    setLookup({ status: 'loading', items: [] });
    try {
      const query = new URLSearchParams({ source: 'openlibrary', q: searchTitle(book), readable: '1' });
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`/api/library?${query.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as { items?: OpenMatch[]; error?: string };
        if (!response.ok) throw new Error(typeof data.error === 'string' && data.error ? data.error : 'Không tải được kho sách mở.');
        setLookup({ status: 'done', items: Array.isArray(data.items) ? data.items.slice(0, 3) : [] });
      } finally {
        window.clearTimeout(timer);
      }
    } catch {
      setLookup({ status: 'error', items: [] });
    }
  };

  if (!lookup) {
    return <button className="text-link" onClick={() => void find()}><Search size={13} /> Tìm bản đọc mở</button>;
  }

  if (lookup.status === 'loading') {
    return <span className="helper-text" role="status"><LoaderCircle size={13} className="is-spinning" /> Đang tìm trong kho sách mở…</span>;
  }

  if (lookup.status === 'error') {
    return <span className="helper-text">Chưa tìm được lúc này. <button className="text-link" onClick={() => void find()}>Thử lại</button></span>;
  }

  if (!lookup.items.length) {
    return <span className="helper-text">Kho mở chưa có bản điện tử cuốn này. <Link to="/library">Tìm sách khác</Link></span>;
  }

  return <ul className="book-matches">
    {lookup.items.map(match => <li key={match.key}>
      {match.cover ? <img src={match.cover} alt="" loading="lazy" /> : <span className="openbook-cover-placeholder"><BookOpen size={18} /></span>}
      <div>
        <strong>{match.title}</strong>
        <small>{match.authors.slice(0, 3).join(', ')}{match.firstPublishYear ? ` · ${match.firstPublishYear}` : ''}</small>
        <span className={`openbook-status ${match.readState === 'public' ? 'public' : ''}`}>{match.readLabel}</span>
        <span className="book-match-links">
          <Link to={bookInfoHref(match)}>Chi tiết & ghi chú</Link>
          {match.readState === 'public' && match.archiveId ? <a href={`https://archive.org/details/${encodeURIComponent(match.archiveId)}`} target="_blank" rel="noreferrer">Đọc ngay <ExternalLink size={11} /></a> : <a href={match.openLibraryUrl} target="_blank" rel="noreferrer">Open Library <ExternalLink size={11} /></a>}
        </span>
      </div>
    </li>)}
  </ul>;
}

export function Books() {
  const [lv, setLv] = useState('Tất cả');
  const filtered = BOOKS.filter(b => lv === 'Tất cả' || b.lv === lv);

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-accent">ĐỌC SÁCH</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Tủ sách</h1>
        <p className="text-muted max-w-lg">Sách nên đọc theo cấp — cửa vào tư duy, không phải giáo trình đầy đủ.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {LVS.map(v => (
          <button key={v} onClick={() => setLv(v)} className="filter-chip" aria-pressed={lv === v}>{v}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filtered.map(b => (
          <div key={b.id} className="bg-panel border border-line rounded-2xl p-4">
            <Link to={`/book/${b.id}`} className="no-underline text-ink">
              <div className="text-[12px] text-muted mb-1">{b.lv}</div>
              <div className="font-semibold text-sm mb-2">{b.t}</div>
              <p className="text-muted text-[13px] m-0">{b.why}</p>
            </Link>
            <div className="book-lookup"><BookLookup book={b} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Books;
