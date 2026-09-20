import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Clock3 } from 'lucide-react';
import type { Lesson } from '../../data/lessons';

export function LessonCard({ lesson, done = false }: { lesson: Lesson; done?: boolean }) {
  const tone = lesson.icon === 'geometry' ? 'peach' : lesson.icon === 'analysis' ? 'blue' : lesson.icon === 'logic' ? 'lilac' : 'green';
  return <Link to={`/lesson/${lesson.id}`} className={`lesson-card ${tone}`}>
    <div className="lesson-card-top"><span className={`subject-icon ${tone}`}>{lesson.sym}</span><span className="level-tag">{lesson.lv}</span></div>
    <p className="lesson-category">{lesson.cat}</p><h3>{lesson.t}</h3>
    <p className="lesson-excerpt">{lesson.txt.replace(/<[^>]+>/g, ' ').trim().split(/(?<=[.!?])\s/)[0]}</p>
    <div className="lesson-card-footer"><span>{done ? <><Check size={14} /> Đã hoàn thành</> : <><Clock3 size={14} /> {lesson.m}</>}</span><ArrowUpRight size={17} /></div>
  </Link>;
}
