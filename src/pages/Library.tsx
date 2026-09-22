import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookmarkCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Globe2,
  Image,
  Languages,
  LibraryBig,
  LoaderCircle,
  Map,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { BOOKS } from '../data/books';
import { MATH_CONCEPTS, MATH_DOMAINS, type MathDomainId } from '../data/mathKnowledge';
import { LIBRARY_DOMAIN_PROFILE_BY_ID } from '../data/libraryCatalog';
import { LessonCard } from '../components/ui/LessonCard';
import { useProgress } from '../hooks/useProgress';
import { matchesSearch } from '../utils/search';
import { getLibraryReadingRecords, type LibraryReadingRecord } from '../utils/libraryReading';
import './library.css';

type LibraryTab = 'lessons' | 'wikipedia' | 'openlibrary' | 'reading';

interface WikipediaItem {
  id: string;
  title: string;
  extract: string;
  thumbnail: string;
  url: string;
  lang: string;
  source: string;
}

interface OpenLibraryItem {
  key: string;
  title: string;
  authors: string[];
  firstPublishYear: number | null;
  cover: string;
  editionCount: number;
  languages: string[];
  subjects: string[];
  hasFullText: boolean;
  publicScan: boolean;
  ebookAccess: string;
  readState: 'public' | 'borrow' | 'scan' | 'record';
  readLabel: string;
  openLibraryUrl: string;
  readUrl: string;
  archiveId: string;
}

interface WikipediaResponse {
  source: 'wikipedia';
  query: string;
  lang: string;
  items: WikipediaItem[];
}

interface OpenLibraryResponse {
  source: 'openlibrary';
  query: string;
  total: number;
  page: number;
  readableOnly: boolean;
  items: OpenLibraryItem[];
}

const CATS = ['Tất cả', ...new Set(LESSONS.map(lesson => lesson.cat))];
const LEVELS = ['Tất cả', ...new Set(LESSONS.map(lesson => lesson.lv))];

function normalizeTab(value: string | null): LibraryTab {
  if (value === 'wikipedia' || value === 'openlibrary' || value === 'reading') return value;
  return 'lessons';
}

export default function Library() {
  const [params, setParams] = useSearchParams();
  const tab = normalizeTab(params.get('tab'));
  const cat = params.get('cat') || 'Tất cả';
  const level = params.get('level') || 'Tất cả';
  const search = params.get('q') || '';
  const lang = params.get('lang') === 'en' ? 'en' : 'vi';
  const readableOnly = params.get('readable') === '1';
  const page = Math.max(1, Number(params.get('page') || 1) || 1);
  const progress = useProgress();
  const domainParam = params.get('domain') as MathDomainId | null;
  const selectedDomainId: MathDomainId = domainParam && LIBRARY_DOMAIN_PROFILE_BY_ID.has(domainParam) ? domainParam : 'foundations';
  const selectedDomain = MATH_DOMAINS.find(domain => domain.id === selectedDomainId)!;
  const selectedProfile = LIBRARY_DOMAIN_PROFILE_BY_ID.get(selectedDomainId)!;
  const domainConcepts = MATH_CONCEPTS.filter(concept => concept.domain === selectedDomainId);
  const domainLessonIds = new Set(domainConcepts.flatMap(concept => concept.lessonIds || []));
  const domainLessons = LESSONS.filter(lesson => domainLessonIds.has(lesson.id));
  const domainBooks = BOOKS.filter(book => selectedProfile.relatedBookIds.includes(book.id));

  const [draft, setDraft] = useState(search);
  const [wikiData, setWikiData] = useState<WikipediaResponse | null>(null);
  const [bookData, setBookData] = useState<OpenLibraryResponse | null>(null);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState('');
  const [savedBooks, setSavedBooks] = useState<LibraryReadingRecord[]>(() => getLibraryReadingRecords());

  const setFilter = (name: string, value: string) => setParams(current => {
    if (!value || value === 'Tất cả') current.delete(name);
    else current.set(name, value);
    if (name !== 'page') current.delete('page');
    return current;
  }, { replace: true });

  const switchTab = (next: LibraryTab) => setParams(current => {
    if (next === 'lessons') current.delete('tab');
    else current.set('tab', next);
    current.delete('page');
    current.delete('cat');
    current.delete('level');
    return current;
  });

  useEffect(() => {
    setDraft(search);
  }, [search, tab]);

  useEffect(() => {
    if (tab === 'reading') {
      setSavedBooks(getLibraryReadingRecords());
      return;
    }
    if (tab === 'lessons') return;
    const controller = new AbortController();

    async function loadExternal() {
      setExternalLoading(true);
      setExternalError('');

      try {
        const query = new URLSearchParams({
          source: tab === 'wikipedia' ? 'wikipedia' : 'openlibrary',
        });
        if (search) query.set('q', search);

        if (tab === 'wikipedia') {
          query.set('lang', lang);
        } else {
          query.set('page', String(page));
          if (readableOnly) query.set('readable', '1');
        }

        const response = await fetch(`/api/library?${query.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({})) as (WikipediaResponse | OpenLibraryResponse) & { error?: string };
        if (!response.ok) throw new Error(data.error || 'Không tải được nguồn thư viện.');

        if (tab === 'wikipedia') setWikiData(data as WikipediaResponse);
        else setBookData(data as OpenLibraryResponse);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setExternalError(reason instanceof Error ? reason.message : 'Không tải được nguồn thư viện.');
      } finally {
        if (!controller.signal.aborted) setExternalLoading(false);
      }
    }

    void loadExternal();
    return () => controller.abort();
  }, [tab, search, lang, readableOnly, page]);

  const filtered = LESSONS.filter(lesson =>
    (cat === 'Tất cả' || lesson.cat === cat)
    && (level === 'Tất cả' || lesson.lv === level)
    && matchesSearch(`${lesson.t} ${lesson.cat}`, search)
  );

  const submitExternalSearch = (event: FormEvent) => {
    event.preventDefault();
    setParams(current => {
      const value = draft.trim();
      if (value) current.set('q', value);
      else current.delete('q');
      current.delete('page');
      return current;
    });
  };

  const selectDomain = (domainId: MathDomainId) => setParams(current => {
    current.set('domain', domainId);
    return current;
  }, { replace: true });

  const openDomainSource = (source: 'wikipedia' | 'openlibrary') => setParams(current => {
    current.set('domain', selectedDomainId);
    current.set('tab', source);
    current.set('q', source === 'wikipedia'
      ? (lang === 'vi' ? selectedProfile.wikipediaVi : selectedProfile.wikipediaEn)
      : selectedProfile.openLibraryQuery);
    current.delete('page');
    current.delete('cat');
    current.delete('level');
    return current;
  });

  return (
    <section className="knowledge-library page-enter">
      <div className="page-header">
        <p className="eyebrow">THƯ VIỆN KIẾN THỨC</p>
        <h1>Đọc bài học, bài viết và sách toán học</h1>
        <p>
          Nội dung của MathNexus được đặt cùng các nguồn công khai từ Wikipedia và Open Library để bạn có thể tra cứu rộng hơn mà không cần API trả phí.
        </p>

        <section className="library-domain-browser" aria-label="Duyệt thư viện theo lĩnh vực toán học">
          <div className="library-domain-head">
            <div>
              <p className="eyebrow">THEO LĨNH VỰC</p>
              <h2>Duyệt từ khái niệm đến tài liệu</h2>
            </div>
            <span>{MATH_DOMAINS.length} lĩnh vực</span>
          </div>

          <div className="library-domain-list" role="group" aria-label="Lĩnh vực toán học">
            {MATH_DOMAINS.map(domain => (
              <button
                key={domain.id}
                type="button"
                aria-pressed={domain.id === selectedDomainId}
                onClick={() => selectDomain(domain.id)}
              >
                {domain.short}
              </button>
            ))}
          </div>

          <div className="library-domain-detail">
            <div className="library-domain-copy">
              <div className="library-domain-title">
                <Map size={17} />
                <div>
                  <strong>{selectedDomain.name}</strong>
                  <p>{selectedDomain.description}</p>
                </div>
              </div>

              <div className="library-domain-stats">
                <span><strong>{domainConcepts.length}</strong> khái niệm</span>
                <span><strong>{domainLessons.length}</strong> bài học</span>
                <span><strong>{domainBooks.length}</strong> sách gợi ý</span>
              </div>
            </div>

            <div className="library-domain-columns">
              <div>
                <small>Khái niệm</small>
                <div className="library-domain-links">
                  {domainConcepts.slice(0, 6).map(concept => (
                    <Link key={concept.id} to={`/map?concept=${encodeURIComponent(concept.id)}`}>{concept.title}</Link>
                  ))}
                </div>
              </div>

              <div>
                <small>Nội dung MathNexus</small>
                <div className="library-domain-links">
                  {domainLessons.slice(0, 4).map(lesson => (
                    <Link key={lesson.id} to={`/lesson/${lesson.id}`}>{lesson.t}</Link>
                  ))}
                  {domainBooks.slice(0, 3).map(book => (
                    <Link key={book.id} to={`/book/${book.id}`}>{book.t}</Link>
                  ))}
                  {!domainLessons.length && !domainBooks.length && <span>Chưa có nội dung nội bộ cho lĩnh vực này.</span>}
                </div>
              </div>
            </div>

            <div className="library-domain-actions">
              <button type="button" onClick={() => openDomainSource('wikipedia')}><Globe2 size={14} /> Wikipedia về {selectedDomain.short}</button>
              <button type="button" onClick={() => openDomainSource('openlibrary')}><LibraryBig size={14} /> Sách về {selectedDomain.short}</button>
            </div>
          </div>
        </section>

        <div className="library-source-tabs" role="group" aria-label="Nguồn thư viện">
          <button type="button" aria-pressed={tab === 'lessons'} onClick={() => switchTab('lessons')}>
            <BookOpen size={16} /> Bài học MathNexus
          </button>
          <button type="button" aria-pressed={tab === 'wikipedia'} onClick={() => switchTab('wikipedia')}>
            <Globe2 size={16} /> Wikipedia
          </button>
          <button type="button" aria-pressed={tab === 'openlibrary'} onClick={() => switchTab('openlibrary')}>
            <LibraryBig size={16} /> Sách mở
          </button>
          <button type="button" aria-pressed={tab === 'reading'} onClick={() => switchTab('reading')}>
            <BookmarkCheck size={16} /> Đang đọc
          </button>
        </div>
      </div>

      {tab === 'lessons' ? (
        <>
          <div className="library-toolbar">
            <div className="search-field">
              <Search size={18} />
              <input
                value={search}
                onChange={event => setFilter('q', event.target.value)}
                placeholder="Tìm tên bài học, chủ đề…"
                aria-label="Tìm bài học"
              />
            </div>
            <SlidersHorizontal size={18} className="text-muted hidden sm:block" />
            <select aria-label="Cấp học" value={level} onChange={event => setFilter('level', event.target.value)}>
              {LEVELS.map(item => <option key={item} value={item}>{item === 'Tất cả' ? 'Tất cả cấp học' : item}</option>)}
            </select>
          </div>

          <div className="filter-row" aria-label="Chuyên đề">
            {CATS.map(item => (
              <button
                key={item}
                className="filter-chip"
                aria-pressed={cat === item}
                onClick={() => setFilter('cat', item)}
              >
                {item}
              </button>
            ))}
          </div>

          <p className="helper-text mb-4" aria-live="polite">{filtered.length} bài học</p>
          <div className="lesson-grid">
            {filtered.map(lesson => (
              <LessonCard key={lesson.id} lesson={lesson} done={progress.lessonsRead.includes(lesson.id)} />
            ))}
          </div>

          {!filtered.length && (
            <div className="empty-state">
              <Search size={32} />
              <h3>Chưa có bài học phù hợp</h3>
              <p>Thử đổi từ khóa hoặc chọn lại cấp học.</p>
              <button className="button button-light" onClick={() => setParams({})}>Xóa bộ lọc</button>
            </div>
          )}
        </>
      ) : tab === 'reading' ? (
        <>
          <div className="library-source-summary">
            <span><strong>{savedBooks.length}</strong> sách đã lưu trên thiết bị này</span>
            <span>Dữ liệu cục bộ</span>
          </div>

          {savedBooks.length ? (
            <div className="openlibrary-grid">
              {savedBooks.map(book => (
                <article key={book.id} className="openbook-card">
                  <div className="openbook-cover">
                    {book.cover
                      ? <img src={book.cover} alt="" loading="lazy" />
                      : <div className="openbook-cover-placeholder"><BookOpen size={23} /></div>}
                  </div>
                  <div className="openbook-body">
                    <div className="openbook-meta">{book.status === 'finished' ? 'Đã đọc' : book.status === 'reading' ? 'Đang đọc' : 'Đã lưu'} · {book.progress}%</div>
                    <h3>{book.title}</h3>
                    <div className="openbook-authors">{book.authors.join(', ') || 'Chưa rõ tác giả'}</div>
                    <div className="library-reading-progress" aria-label={`Tiến độ ${book.title}`}>
                      <span style={{ width: `${book.progress}%` }} />
                    </div>
                    <div className="library-card-actions">
                      <Link
                        className="primary"
                        to={`/library/book-info?key=${encodeURIComponent(book.openLibraryKey)}&archive=${encodeURIComponent(book.archiveId)}&title=${encodeURIComponent(book.title)}&authors=${encodeURIComponent(book.authors.join('|'))}&cover=${encodeURIComponent(book.cover)}`}
                      >
                        Mở ghi chú
                      </Link>
                      {book.archiveId && (
                        <Link to={`/library/book?archive=${encodeURIComponent(book.archiveId)}&title=${encodeURIComponent(book.title)}&ol=${encodeURIComponent(book.openLibraryUrl)}&key=${encodeURIComponent(book.openLibraryKey)}&authors=${encodeURIComponent(book.authors.join('|'))}&cover=${encodeURIComponent(book.cover)}`}>
                          Đọc sách
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <BookmarkCheck size={30} />
              <h3>Chưa có sách nào được lưu</h3>
              <p>Mở tab Sách mở, chọn một cuốn rồi lưu vào danh sách đọc.</p>
              <button className="button button-light" onClick={() => switchTab('openlibrary')}>Tìm sách</button>
            </div>
          )}
        </>
      ) : (
        <>
          <form className="library-external-toolbar" onSubmit={submitExternalSearch}>
            <div className="search-field">
              <Search size={18} />
              <input
                value={draft}
                onChange={event => setDraft(event.target.value)}
                placeholder={tab === 'wikipedia' ? 'Ví dụ: topology, số nguyên tố, đạo hàm…' : 'Tên sách, tác giả hoặc chủ đề toán học…'}
                aria-label={tab === 'wikipedia' ? 'Tìm Wikipedia' : 'Tìm sách Open Library'}
              />
              <button type="submit" className="button button-dark">Tìm</button>
            </div>

            <div className="library-external-options">
              {tab === 'wikipedia' ? (
                <select value={lang} onChange={event => setFilter('lang', event.target.value)} aria-label="Ngôn ngữ Wikipedia">
                  <option value="vi">Wikipedia tiếng Việt</option>
                  <option value="en">English Wikipedia</option>
                </select>
              ) : (
                <label>
                  <input
                    type="checkbox"
                    checked={readableOnly}
                    onChange={event => setFilter('readable', event.target.checked ? '1' : '')}
                  />
                  Chỉ sách đọc online
                </label>
              )}
            </div>
          </form>

          <div className="library-source-note">
            <CircleAlert size={15} />
            {tab === 'wikipedia' ? (
              <span>
                Bài viết được tải từ Wikipedia. Bạn có thể đọc bản chữ ngay trong MathNexus hoặc mở bài gốc để xem đầy đủ công thức, hình và chú thích.
              </span>
            ) : (
              <span>
                Dữ liệu sách đến từ Open Library. Không phải mọi đầu sách đều có bản điện tử; trạng thái đọc/mượn là thông tin khả dụng do Open Library và Internet Archive cung cấp.
              </span>
            )}
          </div>

          {externalLoading && (
            <div className="library-loading"><LoaderCircle size={19} className="is-spinning" /> Đang tải dữ liệu…</div>
          )}

          {externalError && (
            <div className="empty-state">
              <CircleAlert size={30} />
              <h3>Chưa tải được nguồn bên ngoài</h3>
              <p>{externalError}</p>
            </div>
          )}

          {!externalLoading && !externalError && tab === 'wikipedia' && (
            <>
              <div className="library-source-summary">
                <span><strong>{wikiData?.items.length || 0}</strong> bài viết cho “{wikiData?.query || search || 'toán học'}”</span>
                <span><Languages size={13} /> {lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
              </div>

              <div className="wikipedia-grid">
                {(wikiData?.items || []).map(item => (
                  <article key={item.id} className="wikipedia-card">
                    <div className="wikipedia-card-media">
                      {item.thumbnail
                        ? <img src={item.thumbnail} alt="" loading="lazy" />
                        : <div className="wikipedia-card-placeholder"><Image size={24} /></div>}
                    </div>
                    <div className="wikipedia-card-body">
                      <span>Wikipedia · {item.lang.toUpperCase()}</span>
                      <h3>{item.title}</h3>
                      <p>{item.extract || 'Chưa có đoạn giới thiệu.'}</p>
                      <div className="library-card-actions">
                        <Link
                          className="primary"
                          to={`/library/read?source=wikipedia&lang=${item.lang}&title=${encodeURIComponent(item.title)}`}
                        >
                          Đọc trong MathNexus
                        </Link>
                        <a href={item.url} target="_blank" rel="noreferrer">Bài gốc <ExternalLink size={11} /></a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!wikiData?.items.length && (
                <div className="empty-state"><Search size={30} /><h3>Không thấy bài viết phù hợp</h3><p>Thử một từ khóa rộng hơn.</p></div>
              )}
            </>
          )}

          {!externalLoading && !externalError && tab === 'openlibrary' && (
            <>
              <div className="library-source-summary">
                <span>
                  Khoảng <strong>{(bookData?.total || 0).toLocaleString('vi-VN')}</strong> kết quả cho “{bookData?.query || search || 'mathematics'}”
                </span>
                <span>Trang {bookData?.page || page}</span>
              </div>

              <div className="openlibrary-grid">
                {(bookData?.items || []).map(book => (
                  <article key={book.key} className="openbook-card">
                    <div className="openbook-cover">
                      {book.cover
                        ? <img src={book.cover} alt="" loading="lazy" />
                        : <div className="openbook-cover-placeholder"><BookOpen size={23} /></div>}
                    </div>

                    <div className="openbook-body">
                      <div className="openbook-meta">
                        {[book.firstPublishYear, book.editionCount ? `${book.editionCount} ấn bản` : ''].filter(Boolean).join(' · ')}
                      </div>
                      <h3>{book.title}</h3>
                      <div className="openbook-authors">{book.authors.join(', ') || 'Chưa rõ tác giả'}</div>

                      {book.subjects.length > 0 && (
                        <div className="openbook-tags">
                          {book.subjects.slice(0, 3).map(subject => <span key={subject}>{subject}</span>)}
                        </div>
                      )}

                      <span className={`openbook-status ${book.readState === 'public' ? 'public' : ''}`}>{book.readLabel}</span>

                      <div className="library-card-actions">
                        <Link
                          to={`/library/book-info?key=${encodeURIComponent(book.key)}&archive=${encodeURIComponent(book.archiveId)}&title=${encodeURIComponent(book.title)}&authors=${encodeURIComponent(book.authors.join('|'))}&cover=${encodeURIComponent(book.cover)}`}
                        >
                          Chi tiết
                        </Link>
                        {book.readState === 'public' && book.archiveId ? (
                          <Link
                            className="primary"
                            to={`/library/book?archive=${encodeURIComponent(book.archiveId)}&title=${encodeURIComponent(book.title)}&ol=${encodeURIComponent(book.openLibraryUrl)}`}
                          >
                            Đọc trong MathNexus
                          </Link>
                        ) : book.readUrl ? (
                          <a href={book.readUrl} target="_blank" rel="noreferrer">
                            {book.readLabel} <ExternalLink size={11} />
                          </a>
                        ) : null}
                        <a href={book.openLibraryUrl} target="_blank" rel="noreferrer">
                          Open Library <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!bookData?.items.length && (
                <div className="empty-state"><Search size={30} /><h3>Không thấy sách phù hợp</h3><p>Thử bỏ bộ lọc đọc online hoặc đổi từ khóa.</p></div>
              )}

              {(bookData?.total || 0) > 18 && (
                <div className="library-pagination">
                  <button type="button" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>
                    <ChevronLeft size={14} /> Trang trước
                  </button>
                  <span className="helper-text">Trang {page}</span>
                  <button
                    type="button"
                    disabled={page * 18 >= (bookData?.total || 0)}
                    onClick={() => setFilter('page', String(page + 1))}
                  >
                    Trang sau <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
