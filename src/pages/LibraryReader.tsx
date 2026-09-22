import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Languages, LoaderCircle, Minus, Plus } from 'lucide-react';
import './library.css';

interface WikiArticle {
  id: string;
  title: string;
  extract: string;
  thumbnail: string;
  url: string;
  lang: string;
  source: string;
}

function splitArticle(text: string) {
  return text
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);
}

export default function LibraryReader() {
  const [params] = useSearchParams();
  const source = params.get('source') || 'wikipedia';
  const title = params.get('title') || '';
  const lang = params.get('lang') === 'en' ? 'en' : 'vi';
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (source !== 'wikipedia' || !title) {
        setError('Trang đọc hiện hỗ trợ bài viết Wikipedia.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const query = new URLSearchParams({
          source: 'wikipedia',
          mode: 'read',
          lang,
          title,
        });
        const response = await fetch(`/api/library?${query.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({})) as { article?: WikiArticle; error?: string };
        if (!response.ok || !data.article) throw new Error(data.error || 'Không tải được bài viết.');
        setArticle(data.article);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'Không tải được bài viết.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [source, title, lang]);

  const paragraphs = useMemo(() => splitArticle(article?.extract || ''), [article]);
  const words = useMemo(() => (article?.extract || '').trim().split(/\s+/).filter(Boolean).length, [article]);
  const readingMinutes = Math.max(1, Math.ceil(words / 220));

  if (loading) {
    return (
      <section className="library-reader page-enter">
        <div className="library-reader-loading"><LoaderCircle className="is-spinning" size={22} /> Đang tải bài viết…</div>
      </section>
    );
  }

  if (error || !article) {
    return (
      <section className="library-reader page-enter">
        <Link to="/library?tab=wikipedia" className="library-back"><ArrowLeft size={15} /> Thư viện kiến thức</Link>
        <div className="empty-state">
          <h2>Không mở được bài viết</h2>
          <p>{error || 'Bài viết không tồn tại.'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="library-reader page-enter">
      <div className="library-reader-toolbar">
        <Link to={`/library?tab=wikipedia&lang=${lang}&q=${encodeURIComponent(article.title)}`} className="library-back">
          <ArrowLeft size={15} /> Kết quả Wikipedia
        </Link>
        <div className="library-reader-actions">
          <span><Languages size={14} /> {lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
          <button type="button" onClick={() => setFontScale(value => Math.max(.9, value - .1))} aria-label="Giảm cỡ chữ"><Minus size={14} /></button>
          <button type="button" onClick={() => setFontScale(value => Math.min(1.4, value + .1))} aria-label="Tăng cỡ chữ"><Plus size={14} /></button>
        </div>
      </div>

      <article className="library-reader-paper" style={{ '--reader-scale': fontScale } as React.CSSProperties}>
        <header>
          <p className="eyebrow">WIKIPEDIA · {lang.toUpperCase()}</p>
          <h1>{article.title}</h1>
          <div className="library-reader-meta">
            <span>{words.toLocaleString('vi-VN')} từ</span>
            <span>Khoảng {readingMinutes} phút đọc</span>
            <a href={article.url} target="_blank" rel="noreferrer">Mở bài gốc <ExternalLink size={12} /></a>
          </div>
        </header>

        {article.thumbnail && (
          <figure className="library-reader-image">
            <img src={article.thumbnail} alt="" loading="lazy" />
          </figure>
        )}

        <div className="library-reader-content">
          {paragraphs.map((paragraph, index) => {
            const isHeading = paragraph.length < 90 && !/[.!?]$/.test(paragraph) && index > 0;
            return isHeading
              ? <h2 key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</h2>
              : <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>;
          })}
        </div>

        <footer>
          Nội dung được tải từ Wikipedia. Với công thức, bảng, hình minh họa hoặc chú thích phức tạp, hãy đối chiếu bài gốc.
        </footer>
      </article>
    </section>
  );
}
