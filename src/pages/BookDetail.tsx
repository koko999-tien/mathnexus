import { useParams, Link } from 'react-router-dom';
import { BOOKS } from '../data/books';
import { recordActivity } from '../utils/storage';
import { ArrowLeft } from 'lucide-react';

export function BookDetail() {
  const { id } = useParams();
  const book = BOOKS.find(b => b.id === id);
  useEffect(() => { if (book) recordActivity('book', book.id); }, [book]);
  if (!book) return <p className="text-muted">Sách không tồn tại.</p>;

  return (
    <section>
      <Link to="/books" className="inline-flex items-center gap-1 text-accent font-semibold text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Tủ sách
      </Link>
      <div className="text-[11px] tracking-[.14em] font-bold text-accent mb-1">{book.lv}</div>
      <h1 className="text-3xl tracking-tight font-bold mb-4">{book.t}</h1>
      <div className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-muted m-0 mb-1">Tại sao đọc?</h3>
          <p className="m-0">{book.why}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-muted m-0 mb-1">Ý tưởng chính</h3>
          <p className="m-0">{book.ideas}</p>
        </div>
      </div>
    </section>
  );
}

export default BookDetail;
import { useEffect } from 'react';
