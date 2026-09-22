import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  ExternalLink,
  LoaderCircle,
  Search,
  Trash2,
} from 'lucide-react';
import {
  getLibraryReadingRecords,
  removeLibraryReadingRecord,
  saveLibraryReadingRecord,
  upsertLibraryBook,
  type LibraryReadingRecord,
  type ReadingStatus,
} from '../utils/libraryReading';
import './library.css';

interface OpenLibraryDetail {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  firstPublishDate: string;
  subjects: string[];
  subjectPlaces: string[];
  subjectTimes: string[];
  cover: string;
  links: Array<{ title: string; url: string }>;
  openLibraryUrl: string;
}

interface InsideMatch {
  id: string;
  text: string;
  pages: number[];
}

interface InsideResponse {
  available: boolean;
  pageCount: number;
  matches: InsideMatch[];
  error?: string;
}

function statusLabel(status: ReadingStatus) {
  if (status === 'reading') return 'Đang đọc';
  if (status === 'finished') return 'Đã đọc';
  return 'Đã lưu';
}

export default function LibraryBookDetail() {
  const [params] = useSearchParams();
  const key = params.get('key') || '';
  const archiveId = params.get('archive') || '';
  const titleParam = params.get('title') || '';
  const authorsParam = params.get('authors') || '';
  const coverParam = params.get('cover') || '';
  const authors = useMemo(() => authorsParam.split('|').map(value => value.trim()).filter(Boolean).slice(0, 8), [authorsParam]);

  const [detail, setDetail] = useState<OpenLibraryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [record, setRecord] = useState<LibraryReadingRecord | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [bookmarkDraft, setBookmarkDraft] = useState('');
  const [insideDraft, setInsideDraft] = useState('');
  const [insideLoading, setInsideLoading] = useState(false);
  const [insideError, setInsideError] = useState('');
  const [insideData, setInsideData] = useState<InsideResponse | null>(null);

  const bookId = archiveId || key || titleParam;
  const displayTitle = detail?.title || titleParam || 'Sách Open Library';
  const cover = detail?.cover || coverParam;
  const openLibraryUrl = detail?.openLibraryUrl || (key ? `https://openlibrary.org${key}` : 'https://openlibrary.org');

  useEffect(() => {
    const existing = getLibraryReadingRecords().find(item => item.id === bookId) || null;
    setRecord(existing);
    setNoteDraft(existing?.note || '');
  }, [bookId]);

  useEffect(() => {
    if (!key) {
      setLoading(false);
      setError('Thiếu mã sách Open Library.');
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({
          source: 'openlibrary',
          mode: 'detail',
          key,
        });
        const response = await fetch(`/api/library?${query.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({})) as { book?: OpenLibraryDetail; error?: string };
        if (!response.ok || !data.book) throw new Error(data.error || 'Không tải được thông tin sách.');
        setDetail(data.book);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'Không tải được thông tin sách.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [key]);

  const ensureRecord = () => {
    const next = upsertLibraryBook({
      id: bookId,
      title: displayTitle,
      authors,
      cover,
      openLibraryKey: key,
      openLibraryUrl,
      archiveId,
    });
    setRecord(next);
    setNoteDraft(next.note);
    return next;
  };

  const updateRecord = (changes: Partial<LibraryReadingRecord>) => {
    const base = record || ensureRecord();
    const next: LibraryReadingRecord = {
      ...base,
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    saveLibraryReadingRecord(next);
    setRecord(next);
  };

  const removeRecord = () => {
    removeLibraryReadingRecord(bookId);
    setRecord(null);
    setNoteDraft('');
  };

  const saveNote = () => {
    updateRecord({ note: noteDraft.slice(0, 12000) });
  };

  const addBookmark = (event: FormEvent) => {
    event.preventDefault();
    const label = bookmarkDraft.trim();
    if (!label) return;
    const base = record || ensureRecord();
    updateRecord({
      bookmarks: [
        ...base.bookmarks,
        {
          id: `${Date.now()}`,
          label: label.slice(0, 240),
          createdAt: new Date().toISOString(),
        },
      ].slice(-100),
    });
    setBookmarkDraft('');
  };

  const removeBookmark = (id: string) => {
    if (!record) return;
    updateRecord({ bookmarks: record.bookmarks.filter(bookmark => bookmark.id !== id) });
  };

  const searchInside = async (event: FormEvent) => {
    event.preventDefault();
    const queryText = insideDraft.trim();
    if (!queryText || !archiveId) return;

    setInsideLoading(true);
    setInsideError('');
    setInsideData(null);

    try {
      const query = new URLSearchParams({
        source: 'openlibrary',
        mode: 'inside',
        archive: archiveId,
        q: queryText,
      });
      const response = await fetch(`/api/library?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json().catch(() => ({})) as InsideResponse;
      if (!response.ok) throw new Error(data.error || 'Không tìm được trong bản số hóa.');
      setInsideData(data);
    } catch (reason) {
      setInsideError(reason instanceof Error ? reason.message : 'Không tìm được trong bản số hóa.');
    } finally {
      setInsideLoading(false);
    }
  };

  if (loading) {
    return <section className="library-book-detail page-enter"><div className="library-loading"><LoaderCircle className="is-spinning" size={20} /> Đang tải thông tin sách…</div></section>;
  }

  return (
    <section className="library-book-detail page-enter">
      <div className="library-reader-toolbar">
        <Link to="/library?tab=openlibrary" className="library-back"><ArrowLeft size={15} /> Sách mở</Link>
        <div className="library-book-external-links">
          <a href={openLibraryUrl} target="_blank" rel="noreferrer">Open Library <ExternalLink size={12} /></a>
          {archiveId && <a href={`https://archive.org/details/${encodeURIComponent(archiveId)}`} target="_blank" rel="noreferrer">Internet Archive <ExternalLink size={12} /></a>}
        </div>
      </div>

      {error && <div className="library-source-note"><span>{error}</span></div>}

      <div className="library-book-detail-grid">
        <aside className="library-book-detail-side">
          <div className="library-book-detail-cover">
            {cover ? <img src={cover} alt="" /> : <BookOpen size={42} />}
          </div>

          {archiveId && (
            <Link
              className="button button-dark"
              to={`/library/book?archive=${encodeURIComponent(archiveId)}&title=${encodeURIComponent(displayTitle)}&ol=${encodeURIComponent(openLibraryUrl)}`}
            >
              Đọc trong MathNexus
            </Link>
          )}

          {!record ? (
            <button type="button" className="button button-light" onClick={ensureRecord}><Bookmark size={15} /> Lưu sách</button>
          ) : (
            <button type="button" className="button button-light" onClick={removeRecord}><Trash2 size={15} /> Bỏ khỏi danh sách</button>
          )}
        </aside>

        <div className="library-book-detail-main">
          <header>
            <p className="eyebrow">OPEN LIBRARY</p>
            <h1>{displayTitle}</h1>
            {detail?.subtitle && <p className="library-book-subtitle">{detail.subtitle}</p>}
            <div className="library-book-meta">
              {authors.length > 0 && <span>{authors.join(', ')}</span>}
              {detail?.firstPublishDate && <span>Xuất bản lần đầu: {detail.firstPublishDate}</span>}
              {record && <span>{statusLabel(record.status)} · {record.progress}%</span>}
            </div>
          </header>

          {detail?.description && (
            <section className="library-book-section">
              <h2>Giới thiệu</h2>
              <p className="library-book-description">{detail.description}</p>
            </section>
          )}

          {detail?.subjects.length ? (
            <section className="library-book-section">
              <h2>Chủ đề</h2>
              <div className="openbook-tags">
                {detail.subjects.slice(0, 16).map(subject => <span key={subject}>{subject}</span>)}
              </div>
            </section>
          ) : null}

          <section className="library-book-section">
            <h2>Tiến độ đọc</h2>
            <div className="library-reading-controls">
              <select
                aria-label="Trạng thái đọc"
                value={record?.status || 'saved'}
                onChange={event => updateRecord({ status: event.target.value as ReadingStatus })}
              >
                <option value="saved">Đã lưu</option>
                <option value="reading">Đang đọc</option>
                <option value="finished">Đã đọc</option>
              </select>

              <label>
                <span>{record?.progress || 0}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={record?.progress || 0}
                  onChange={event => updateRecord({ progress: Number(event.target.value), status: Number(event.target.value) >= 100 ? 'finished' : 'reading' })}
                  aria-label="Tiến độ đọc"
                />
              </label>
            </div>
          </section>

          <section className="library-book-section">
            <h2>Ghi chú</h2>
            <textarea
              value={noteDraft}
              onChange={event => setNoteDraft(event.target.value)}
              placeholder="Ghi ý chính, công thức, câu hỏi hoặc phần cần đọc lại…"
              aria-label="Ghi chú sách"
              rows={6}
            />
            <button type="button" className="button button-light" onClick={saveNote}><Check size={14} /> Lưu ghi chú</button>
          </section>

          <section className="library-book-section">
            <h2>Đánh dấu</h2>
            <form className="library-bookmark-form" onSubmit={addBookmark}>
              <input
                value={bookmarkDraft}
                onChange={event => setBookmarkDraft(event.target.value)}
                placeholder="Ví dụ: Chương 3 – định lý chính"
                aria-label="Nội dung đánh dấu"
              />
              <button type="submit">Thêm</button>
            </form>

            {record?.bookmarks.length ? (
              <div className="library-bookmark-list">
                {record.bookmarks.map(bookmark => (
                  <div key={bookmark.id}>
                    <span>{bookmark.label}</span>
                    <button type="button" onClick={() => removeBookmark(bookmark.id)} aria-label={`Xóa đánh dấu ${bookmark.label}`}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            ) : <p className="helper-text">Chưa có đánh dấu nào.</p>}
          </section>

          {archiveId && (
            <section className="library-book-section">
              <h2>Tìm trong bản số hóa</h2>
              <p className="helper-text">Tìm theo OCR của Internet Archive. Kết quả phụ thuộc chất lượng quét của từng cuốn.</p>
              <form className="library-inside-search" onSubmit={searchInside}>
                <div className="search-field">
                  <Search size={17} />
                  <input
                    value={insideDraft}
                    onChange={event => setInsideDraft(event.target.value)}
                    placeholder="Từ khóa hoặc cụm từ…"
                    aria-label="Tìm trong sách"
                  />
                  <button type="submit" className="button button-dark" disabled={insideLoading}>
                    {insideLoading ? <LoaderCircle size={14} className="is-spinning" /> : 'Tìm'}
                  </button>
                </div>
              </form>

              {insideError && <p className="overview-error">{insideError}</p>}
              {insideData && !insideData.available && <p className="helper-text">Bản số hóa này chưa hỗ trợ tìm nội dung bằng OCR.</p>}
              {insideData?.available && (
                <div className="library-inside-results">
                  <div className="library-source-summary">
                    <span><strong>{insideData.matches.length}</strong> đoạn khớp</span>
                    {insideData.pageCount > 0 && <span>{insideData.pageCount} trang OCR</span>}
                  </div>
                  {insideData.matches.map(match => (
                    <article key={match.id}>
                      <p>{match.text}</p>
                      {match.pages.length > 0 && <small>Trang OCR: {match.pages.join(', ')}</small>}
                    </article>
                  ))}
                  {!insideData.matches.length && <p className="helper-text">Không thấy cụm từ này trong OCR.</p>}
                </div>
              )}
            </section>
          )}

          {detail?.links.length ? (
            <section className="library-book-section">
              <h2>Liên kết từ Open Library</h2>
              <div className="library-book-links">
                {detail.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.title} <ExternalLink size={11} /></a>)}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
