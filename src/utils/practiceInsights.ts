import type { Quiz } from '../data/quiz';
import type { ProgressData, QuestionPracticeStat } from './storage';

export interface PracticeCategoryInsight {
  name: string;
  attempted: number;
  total: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  needsReview: number;
}

export function questionAccuracy(stat?: QuestionPracticeStat): number | null {
  if (!stat?.attempts) return null;
  return Math.round(stat.correct / stat.attempts * 100);
}

export function questionNeedsReview(stat?: QuestionPracticeStat): boolean {
  if (!stat || stat.attempts === 0) return false;
  const hasMiss = stat.correct < stat.attempts;
  return hasMiss && stat.correctStreak < 2;
}

export function practiceCategoryInsights(questions: Quiz[], progress: ProgressData): PracticeCategoryInsight[] {
  const categories = [...new Set(questions.map(question => question.cat))];
  return categories.map(name => {
    const items = questions.filter(question => question.cat === name);
    const stats = items.map(question => progress.practice[question.id]).filter(Boolean);
    const attempts = stats.reduce((sum, stat) => sum + stat.attempts, 0);
    const correct = stats.reduce((sum, stat) => sum + stat.correct, 0);
    return {
      name,
      attempted: stats.length,
      total: items.length,
      attempts,
      correct,
      accuracy: attempts ? Math.round(correct / attempts * 100) : null,
      needsReview: items.filter(question => questionNeedsReview(progress.practice[question.id])).length,
    };
  }).sort((a, b) => b.needsReview - a.needsReview || b.attempts - a.attempts || a.name.localeCompare(b.name, 'vi'));
}

export function questionsNeedingReview(questions: Quiz[], progress: ProgressData): Quiz[] {
  return questions.filter(question => questionNeedsReview(progress.practice[question.id]));
}

export function practiceOverview(questions: Quiz[], progress: ProgressData) {
  const attemptedQuestions = questions.filter(question => progress.practice[question.id]?.attempts).length;
  const reviewQuestions = questionsNeedingReview(questions, progress).length;
  const attempts = questions.reduce((sum, question) => sum + (progress.practice[question.id]?.attempts || 0), 0);
  const correct = questions.reduce((sum, question) => sum + (progress.practice[question.id]?.correct || 0), 0);
  return {
    attemptedQuestions,
    reviewQuestions,
    attempts,
    correct,
    accuracy: attempts ? Math.round(correct / attempts * 100) : null,
  };
}
