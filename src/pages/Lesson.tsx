import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LESSONS } from '../data/lessons';
import { lessonDescription, lessonHtml } from '../data/lessonContent';
import { getProgress, recordActivity, saveProgress } from '../utils/storage';
import { useProgress } from '../hooks/useProgress';
import { ArrowLeft, ArrowRight, Check, Clock3 } from 'lucide-react';
import { PageMeta } from '../components/seo/PageMeta';
import { SITE_URL } from '../data/seo';
import NotFound from './NotFound';

export function Lesson() {
  const { id } = useParams();
  const lesson = LESSONS.find(item => item.id === id);
  const p = useProgress();
  const [textSize, setTextSize] = useState(1);
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    if (!lesson) return;
    saveProgress({ ...getProgress(), lastLesson: lesson.id });
  }, [lesson]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mn-text-size');
      const saved = raw === null ? NaN : Number(raw);
      if ([0, 1, 2].includes(saved)) setTextSize(saved);
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setReadProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [id]);

  const chooseTextSize = (size: number) => {
    setTextSize(size);
    try { window.localStorage.setItem('mn-text-size', String(size)); } catch { /* storage unavailable */ }
  };

  if (!lesson) return <NotFound />;
  const done = p.lessonsRead.includes(lesson.id);
  const next = LESSONS[(LESSONS.indexOf(lesson) + 1) % LESSONS.length];
  const description = lessonDescription(lesson);
  const path = `/lesson/${encodeURIComponent(lesson.id)}`;

  return (
    <section>
      <PageMeta
        title={`${lesson.t} · MathNexus`}
        description={description}
        path={path}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'LearningResource',
          name: lesson.t,
          description,
          educationalLevel: lesson.lv,
          learningResourceType: 'Article',
          inLanguage: 'vi',
          url: `${SITE_URL}${path}`,
          isPartOf: { '@type': 'WebSite', name: 'MathNexus', url: `${SITE_URL}/` },
        }}
      />
      <Link to="/library" className="inline-flex items-center gap-1 text-accent font-semibold text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Thư viện
      </Link>
      <div className="text-[11px] tracking-[.14em] font-bold text-accent mb-1">{lesson.lv} · {lesson.cat}</div>
      <h1 className="text-3xl tracking-tight font-bold mb-2">{lesson.t}</h1>
      <div className="flex items-center gap-3 text-muted text-[13px] mb-6">
        <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {lesson.m}</span>
        {done && <span className="flex items-center gap-1 text-accent font-semibold" role="status"><Check size={14} /> Đã hoàn thành</span>}
      </div>
      <div className="reading-progress" aria-hidden="true"><span style={{ transform: `scaleX(${readProgress})` }} /></div>
      <div className="lesson-tools">
        <span>Cỡ chữ</span>
        <div className="text-size-group" role="group" aria-label="Chỉnh cỡ chữ bài học">
          <button type="button" aria-pressed={textSize === 0} aria-label="Cỡ chữ nhỏ" onClick={() => chooseTextSize(0)}><span style={{ fontSize: 12 }}>A</span></button>
          <button type="button" aria-pressed={textSize === 1} aria-label="Cỡ chữ vừa" onClick={() => chooseTextSize(1)}><span style={{ fontSize: 15 }}>A</span></button>
          <button type="button" aria-pressed={textSize === 2} aria-label="Cỡ chữ lớn" onClick={() => chooseTextSize(2)}><span style={{ fontSize: 18 }}>A</span></button>
        </div>
      </div>
      <article className="panel lesson-body" data-text-size={textSize} dangerouslySetInnerHTML={{ __html: lessonHtml(lesson) }} />
      <div className="flex flex-wrap items-center gap-3 mt-5">
        {!done && <button onClick={() => recordActivity('lesson', lesson.id)} className="button button-dark"><Check size={16} />Đánh dấu đã đọc</button>}
        <Link to={`/practice?cat=${encodeURIComponent(lesson.cat)}`} className="button button-light">Luyện tập chủ đề này</Link>
        <Link to={`/lesson/${next.id}`} className="text-link ml-auto">Bài tiếp theo<ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}

export default Lesson;
