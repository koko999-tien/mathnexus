import { useParams, Link } from 'react-router-dom';
import { LESSONS } from '../data/lessons';
import { getProgress, saveProgress } from '../utils/storage';
import { ArrowLeft, Check } from 'lucide-react';

export function Lesson() {
  const { id } = useParams();
  const lesson = LESSONS.find(l => l.id === id);
  if (!lesson) return <p className="text-muted">Bài học không tồn tại.</p>;

  const p = getProgress();
  const done = p.lessonsRead.includes(lesson.id);

  const markDone = () => {
    if (!p.lessonsRead.includes(lesson.id)) {
      p.lessonsRead.push(lesson.id);
      saveProgress(p);
      window.location.reload();
    }
  };

  return (
    <section>
      <Link to="/library" className="inline-flex items-center gap-1 text-[#3d6b5c] font-semibold text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Thư viện
      </Link>
      <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c] mb-1">{lesson.lv} · {lesson.cat}</div>
      <h1 className="text-3xl tracking-tight font-bold mb-2">{lesson.t}</h1>
      <div className="flex items-center gap-3 text-muted text-[13px] mb-6">
        <span>⏱ {lesson.m}</span>
        {done && <span className="flex items-center gap-1 text-forest font-semibold"><Check size={14} /> Đã đọc</span>}
      </div>
      <article className="bg-panel border border-line rounded-2xl p-6 prose max-w-none [&_p]:mb-3 [&_b]:font-semibold" dangerouslySetInnerHTML={{ __html: lesson.txt }} />
      {!done && (
        <button onClick={markDone} className="mt-4 bg-forest text-white px-5 py-2.5 rounded-xl font-bold text-sm border-0 cursor-pointer hover:opacity-90 transition">
          Đánh dấu đã đọc
        </button>
      )}
    </section>
  );
}

export default Lesson;
