import { useParams, Link } from 'react-router-dom';
import { LESSONS } from '../data/lessons';
import { getProgress, saveProgress, recordActivity } from '../utils/storage';
import { useProgress } from '../hooks/useProgress';
import { ArrowLeft, ArrowRight, Check, Clock3 } from 'lucide-react';
import NotFound from './NotFound';

export function Lesson() {
  const { id } = useParams();
  const lesson = LESSONS.find(l => l.id === id);
  const p = useProgress();
  useEffect(() => {
    if (!lesson) return;
    document.title = `${lesson.t} · MathNexus`;
    saveProgress({ ...getProgress(), lastLesson: lesson.id });
  }, [lesson]);
  if (!lesson) return <NotFound />;
  const done = p.lessonsRead.includes(lesson.id);
  const next = LESSONS[(LESSONS.indexOf(lesson) + 1) % LESSONS.length];

  return (
    <section>
      <Link to="/library" className="inline-flex items-center gap-1 text-accent font-semibold text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Thư viện
      </Link>
      <div className="text-[11px] tracking-[.14em] font-bold text-accent mb-1">{lesson.lv} · {lesson.cat}</div>
      <h1 className="text-3xl tracking-tight font-bold mb-2">{lesson.t}</h1>
      <div className="flex items-center gap-3 text-muted text-[13px] mb-6">
        <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {lesson.m}</span>
        {done && <span className="flex items-center gap-1 text-accent font-semibold" role="status"><Check size={14} /> Đã hoàn thành</span>}
      </div>
      <article className="panel lesson-body" dangerouslySetInnerHTML={{ __html: lesson.txt }} />
      <div className="flex flex-wrap items-center gap-3 mt-5">
        {!done && <button onClick={() => recordActivity('lesson', lesson.id)} className="button button-dark"><Check size={16} />Đánh dấu đã đọc</button>}
        <Link to={`/practice?cat=${encodeURIComponent(lesson.cat)}`} className="button button-light">Luyện tập chủ đề này</Link>
        <Link to={`/lesson/${next.id}`} className="text-link ml-auto">Bài tiếp theo<ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}

export default Lesson;
import { useEffect } from 'react';
