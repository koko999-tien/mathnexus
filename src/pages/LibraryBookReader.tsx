import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, LibraryBig } from 'lucide-react';
import './library.css';

const SAFE_ARCHIVE_ID = /^[A-Za-z0-9._-]{1,180}$/;

export default function LibraryBookReader() {
  const [params] = useSearchParams();
  const archiveId = params.get('archive') || '';
  const title = params.get('title') || 'Sách số hóa';
  const openLibraryUrl = params.get('ol') || '';
  const key = params.get('key') || '';
  const authors = params.get('authors') || '';
  const cover = params.get('cover') || '';
  const validArchiveId = SAFE_ARCHIVE_ID.test(archiveId);
  const embedUrl = validArchiveId ? `https://archive.org/embed/${archiveId}` : '';
  const detailsUrl = validArchiveId ? `https://archive.org/details/${archiveId}` : '';

  if (!validArchiveId) {
    return (
      <section className="library-reader page-enter">
        <Link to="/library?tab=openlibrary" className="library-back"><ArrowLeft size={15} /> Sách mở</Link>
        <div className="empty-state">
          <LibraryBig size={30} />
          <h2>Không mở được bản số hóa</h2>
          <p>Thiếu mã tài liệu hợp lệ từ Internet Archive.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="library-book-reader page-enter">
      <div className="library-reader-toolbar">
        <Link to="/library?tab=openlibrary" className="library-back"><ArrowLeft size={15} /> Sách mở</Link>
        <div className="library-book-external-links">
          {key && (
            <Link
              to={`/library/book-info?key=${encodeURIComponent(key)}&archive=${encodeURIComponent(archiveId)}&title=${encodeURIComponent(title)}&authors=${encodeURIComponent(authors)}&cover=${encodeURIComponent(cover)}`}
            >
              Ghi chú & tiến độ
            </Link>
          )}
          {openLibraryUrl.startsWith('https://openlibrary.org/') && (
            <a href={openLibraryUrl} target="_blank" rel="noreferrer">Open Library <ExternalLink size={12} /></a>
          )}
          <a href={detailsUrl} target="_blank" rel="noreferrer">Internet Archive <ExternalLink size={12} /></a>
        </div>
      </div>

      <header className="library-book-reader-head">
        <p className="eyebrow">BẢN SỐ HÓA · INTERNET ARCHIVE</p>
        <h1>{title}</h1>
        <p>Trình đọc bên dưới dùng bản số hóa công khai do Internet Archive cung cấp.</p>
      </header>

      <div className="library-book-frame">
        <iframe
          title={`Đọc ${title}`}
          src={embedUrl}
          allow="fullscreen"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </section>
  );
}
