import { useEffect } from 'react';
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

  useEffect(() => {
    if (!lesson) return;
    saveProgress({ ...getProgress(), lastLesson: lesson.id });
  }, [lesson]);

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
      <article className="panel lesson-body" dangerouslySetInnerHTML={{ __html: lessonHtml(lesson) }} />
      <div className="flex flex-wrap items-center gap-3 mt-5">
        {!done && <button onClick={() => recordActivity('lesson', lesson.id)} className="button button-dark"><Check size={16} />Đánh dấu đã đọc</button>}
        <Link to={`/practice?cat=${encodeURIComponent(lesson.cat)}`} className="button button-light">Luyện tập chủ đề này</Link>
        <Link to={`/lesson/${next.id}`} className="text-link ml-auto">Bài tiếp theo<ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}

export default Lesson;
