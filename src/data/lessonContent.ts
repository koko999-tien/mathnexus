import type { Lesson } from './lessons.ts';
import { LESSON_DEEP_DIVES } from './lessonDeepDives.ts';

export function lessonHtml(lesson: Lesson): string {
  return lesson.txt + (LESSON_DEEP_DIVES[lesson.id] || '');
}

export function lessonPlainText(lesson: Lesson): string {
  return lessonHtml(lesson)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lessonDescription(lesson: Lesson, maxLength = 158): string {
  const text = lessonPlainText(lesson);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).replace(/\s+\S*$/, '') + '…';
}
