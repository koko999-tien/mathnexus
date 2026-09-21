import { BOOKS } from '../data/books';
import { LESSONS, type Lesson } from '../data/lessons';
import { QUIZ } from '../data/quiz';
import type { ProgressData } from './storage';
import { emptyActivity, localDate } from './storage';
import { questionsNeedingReview } from './practiceInsights';
import { conceptForLesson, conceptProgress } from './knowledgeGraph';

export interface LearningBreakdown {
  name: string;
  done: number;
  total: number;
  percent: number;
}

export interface RecentDay {
  date: string;
  label: string;
  count: number;
}

export interface DailyPlanItem {
  id: 'lesson' | 'practice' | 'book';
  title: string;
  detail: string;
  to: string;
  done: boolean;
  progressLabel: string;
}

const levelOrder = ['THCS', 'THPT', 'Tư duy', 'ĐH'];

export function recommendLessons(progress: ProgressData, limit = 3): Lesson[] {
  const unread = LESSONS.filter(lesson => !progress.lessonsRead.includes(lesson.id));
  if (!unread.length) return LESSONS.slice(0, limit);

  const starterOrder = ['frac', 'quad', 'pyth', 'der', 'prob', 'cplx'];
  if (!progress.lastLesson && progress.lessonsRead.length === 0) {
    const starters = starterOrder
      .map(id => unread.find(lesson => lesson.id === id))
      .filter((lesson): lesson is Lesson => Boolean(lesson));
    return [...starters, ...unread.filter(lesson => !starters.includes(lesson))].slice(0, limit);
  }

  const graph = conceptProgress(progress);
  const graphById = new Map(graph.map(item => [item.concept.id, item]));
  const lastLesson = LESSONS.find(lesson => lesson.id === progress.lastLesson);
  const lastConcept = progress.lastLesson ? conceptForLesson(progress.lastLesson) : undefined;

  return unread
    .map((lesson, index) => {
      const concept = conceptForLesson(lesson.id);
      const conceptState = concept ? graphById.get(concept.id) : undefined;
      let score = 0;

      if (conceptState?.state === 'ready') score += 70;
      if (conceptState?.state === 'locked') score -= conceptState.unmetPrerequisiteIds.length * 12;

      if (lastConcept && concept) {
        if (concept.prerequisites.includes(lastConcept.id)) score += 55;
        if (lastConcept.prerequisites.includes(concept.id)) score += 48;
        if (concept.domain === lastConcept.domain) score += 18;
      }

      if (lastLesson && lesson.cat === lastLesson.cat) score += 8;
      if (lastLesson && lesson.lv === lastLesson.lv) score += 4;
      if (conceptState) score += Math.max(0, 12 - conceptState.depth);

      return { lesson, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(item => item.lesson);
}

export function topicProgress(progress: ProgressData): LearningBreakdown[] {
  const map = new Map<string, { done: number; total: number }>();
  for (const lesson of LESSONS) {
    const current = map.get(lesson.cat) || { done: 0, total: 0 };
    current.total += 1;
    if (progress.lessonsRead.includes(lesson.id)) current.done += 1;
    map.set(lesson.cat, current);
  }

  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      done: value.done,
      total: value.total,
      percent: Math.round(value.done / value.total * 100),
    }))
    .sort((a, b) => Number(b.done > 0) - Number(a.done > 0) || b.percent - a.percent || b.total - a.total || a.name.localeCompare(b.name, 'vi'));
}

export function levelProgress(progress: ProgressData): LearningBreakdown[] {
  return levelOrder
    .map(name => {
      const lessons = LESSONS.filter(lesson => lesson.lv === name);
      const done = lessons.filter(lesson => progress.lessonsRead.includes(lesson.id)).length;
      return {
        name,
        done,
        total: lessons.length,
        percent: lessons.length ? Math.round(done / lessons.length * 100) : 0,
      };
    })
    .filter(item => item.total > 0);
}

export function recentActivity(progress: ProgressData, days = 14): RecentDay[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    const key = localDate(date);
    const activity = progress.activity[key] || emptyActivity();
    return {
      date: key,
      label: date.toLocaleDateString('vi-VI', { weekday: 'short', day: '2-digit' }),
      count: activity.lessons + activity.questions + activity.books,
    };
  });
}

export function todayPlan(progress: ProgressData): DailyPlanItem[] {
  const day = progress.activity[localDate()] || emptyActivity();
  const nextLesson = recommendLessons(progress, 1)[0];
  const nextBook = BOOKS.find(book => !progress.booksOpened.includes(book.id));
  const allBooksExplored = BOOKS.length > 0 && progress.booksOpened.length >= BOOKS.length;
  const reviewQuestions = questionsNeedingReview(QUIZ, progress);
  const reviewSessionSize = progress.dailyGoal <= 5 ? '5' : '10';

  return [
    {
      id: 'lesson',
      title: nextLesson ? `Học “${nextLesson.t}”` : 'Ôn lại một bài đã hoàn thành',
      detail: nextLesson ? `${nextLesson.lv} · ${nextLesson.cat} · ${nextLesson.m}` : 'Bạn đã đi hết thư viện hiện tại.',
      to: nextLesson ? `/lesson/${nextLesson.id}` : '/library',
      done: day.lessons >= 1,
      progressLabel: day.lessons >= 1 ? 'Đã xong hôm nay' : '0/1 bài',
    },
    {
      id: 'practice',
      title: reviewQuestions.length ? 'Ôn ' + reviewQuestions.length + ' câu đang yếu' : 'Luyện ' + progress.dailyGoal + ' câu',
      detail: reviewQuestions.length ? 'MathNexus ưu tiên những câu bạn từng trả lời sai và chưa phục hồi vững.' : 'Củng cố bằng việc tự trả lời thay vì chỉ đọc.',
      to: reviewQuestions.length ? '/practice?mode=review&size=' + reviewSessionSize : lastLessonCategory(progress) ? '/practice?cat=' + encodeURIComponent(lastLessonCategory(progress)!) : '/practice',
      done: day.questions >= progress.dailyGoal,
      progressLabel: Math.min(day.questions, progress.dailyGoal) + '/' + progress.dailyGoal + ' câu',
    },
    {
      id: 'book',
      title: allBooksExplored ? 'Ôn lại tủ sách' : nextBook ? `Mở “${nextBook.t}”` : 'Khám phá tủ sách',
      detail: allBooksExplored ? 'Bạn đã mở toàn bộ sách hiện có.' : 'Đọc phần giới thiệu để biết cuốn nào đáng theo lâu dài.',
      to: nextBook ? `/book/${nextBook.id}` : '/books',
      done: day.books >= 1 || allBooksExplored,
      progressLabel: day.books >= 1 || allBooksExplored ? 'Đã xong hôm nay' : '0/1 sách',
    },
  ];
}

function lastLessonCategory(progress: ProgressData) {
  return LESSONS.find(lesson => lesson.id === progress.lastLesson)?.cat || '';
}
