const PREFIX = 'mathnexus_';
export const STORAGE_EVENT = 'mathnexus:storage';
export const STORAGE_ERROR_EVENT = 'mathnexus:storage-error';
export const PROGRESS_SCHEMA_VERSION = 1 as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new Event(STORAGE_EVENT));
    return true;
  } catch {
    window.dispatchEvent(new Event(STORAGE_ERROR_EVENT));
    return false;
  }
}

export interface DailyActivity {
  lessons: number;
  questions: number;
  correct: number;
  books: number;
}

export interface QuestionPracticeStat {
  attempts: number;
  correct: number;
  correctStreak: number;
  lastCorrect: boolean;
  updatedAt: string;
}

export interface ProgressData {
  version: typeof PROGRESS_SCHEMA_VERSION;
  lessonsRead: string[];
  questionsDone: number;
  booksOpened: string[];
  streak: number;
  lastDate: string;
  dailyGoal: number;
  displayName: string;
  questionsCorrect: number;
  lastLesson: string;
  activity: Record<string, DailyActivity>;
  practice: Record<string, QuestionPracticeStat>;
}

export const DEFAULT_PROGRESS: ProgressData = {
  version: PROGRESS_SCHEMA_VERSION,
  lessonsRead: [],
  questionsDone: 0,
  booksOpened: [],
  streak: 0,
  lastDate: '',
  dailyGoal: 5,
  displayName: 'Bạn học Toán',
  questionsCorrect: 0,
  lastLesson: '',
  activity: {},
  practice: {},
};

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function emptyActivity(): DailyActivity {
  return { lessons: 0, questions: 0, correct: 0, books: 0 };
}

const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
const ids = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];

function normalizePractice(value: unknown): Record<string, QuestionPracticeStat> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, QuestionPracticeStat> = {};
  for (const [id, rawStat] of Object.entries(value)) {
    if (!id || !rawStat || typeof rawStat !== 'object') continue;
    const stat = rawStat as Partial<QuestionPracticeStat>;
    const attempts = count(stat.attempts);
    const correct = Math.min(count(stat.correct), attempts);
    result[id] = {
      attempts,
      correct,
      correctStreak: Math.min(count(stat.correctStreak), attempts),
      lastCorrect: Boolean(stat.lastCorrect),
      updatedAt: typeof stat.updatedAt === 'string' ? stat.updatedAt : '',
    };
  }
  return result;
}

export function normalizeProgress(value: unknown): ProgressData {
  const raw = value && typeof value === 'object' ? value as Partial<ProgressData> : {};
  const activity: Record<string, DailyActivity> = {};
  if (raw.activity && typeof raw.activity === 'object') {
    for (const [date, day] of Object.entries(raw.activity)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== 'object') continue;
      activity[date] = { lessons: count(day.lessons), questions: count(day.questions), correct: Math.min(count(day.correct), count(day.questions)), books: count(day.books) };
    }
  }
  return {
    version: PROGRESS_SCHEMA_VERSION,
    lessonsRead: ids(raw.lessonsRead), booksOpened: ids(raw.booksOpened),
    questionsDone: count(raw.questionsDone), questionsCorrect: Math.min(count(raw.questionsCorrect), count(raw.questionsDone)),
    dailyGoal: Math.min(50, Math.max(1, count(raw.dailyGoal) || 5)),
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim().slice(0, 40) || DEFAULT_PROGRESS.displayName : DEFAULT_PROGRESS.displayName,
    lastDate: typeof raw.lastDate === 'string' ? raw.lastDate : '',
    lastLesson: typeof raw.lastLesson === 'string' ? raw.lastLesson : '',
    streak: count(raw.streak), activity, practice: normalizePractice(raw.practice),
  };
}

export function currentStreak(activity: ProgressData['activity'], now = new Date()): number {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const active = (day: string) => {
    const value = activity[day];
    return value && value.lessons + value.questions + value.books > 0;
  };
  if (!active(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (active(localDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getProgress(): ProgressData {
  const progress = normalizeProgress(load<unknown>('progress', DEFAULT_PROGRESS));
  progress.streak = currentStreak(progress.activity);
  return progress;
}

export function saveProgress(p: ProgressData): boolean {
  const current = load<unknown>('progress', null);
  if (
    current
    && typeof current === 'object'
    && 'version' in current
    && typeof current.version === 'number'
    && current.version > PROGRESS_SCHEMA_VERSION
  ) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(STORAGE_ERROR_EVENT));
    return false;
  }

  return save('progress', normalizeProgress(p));
}

function recordQuestion(p: ProgressData, day: DailyActivity, correct: boolean) {
  p.questionsDone++;
  day.questions++;
  if (correct) {
    p.questionsCorrect++;
    day.correct++;
  }
}

export function recordQuestionAttempt(questionId: string, correct: boolean): void {
  if (!questionId) return;
  const p = getProgress();
  const today = localDate();
  const day = { ...emptyActivity(), ...p.activity[today] };
  recordQuestion(p, day, correct);

  const previous = p.practice[questionId] || { attempts: 0, correct: 0, correctStreak: 0, lastCorrect: false, updatedAt: '' };
  p.practice[questionId] = {
    attempts: previous.attempts + 1,
    correct: previous.correct + (correct ? 1 : 0),
    correctStreak: correct ? previous.correctStreak + 1 : 0,
    lastCorrect: correct,
    updatedAt: new Date().toISOString(),
  };

  p.activity[today] = day;
  p.lastDate = today;
  p.streak = currentStreak(p.activity);
  saveProgress(p);
}

export function recordActivity(kind: 'lesson' | 'question' | 'book', value: string | boolean): void {
  const p = getProgress();
  const today = localDate();
  const day = { ...emptyActivity(), ...p.activity[today] };
  if (kind === 'lesson' && typeof value === 'string') {
    if (p.lessonsRead.includes(value)) return;
    p.lessonsRead.push(value);
    p.lastLesson = value;
    day.lessons++;
  } else if (kind === 'book' && typeof value === 'string') {
    if (p.booksOpened.includes(value)) return;
    p.booksOpened.push(value);
    day.books++;
  } else if (kind === 'question' && typeof value === 'boolean') {
    recordQuestion(p, day, value);
  } else return;
  p.activity[today] = day;
  p.lastDate = today;
  p.streak = currentStreak(p.activity);
  saveProgress(p);
}

export function parseBackup(text: string): { progress: ProgressData; notes: string } {
  const data = JSON.parse(text);
  if (data?.app !== 'MathNexus' || data.version !== 1 || !data.progress || typeof data.notes !== 'string' ||
      !Array.isArray(data.progress.lessonsRead) || !Array.isArray(data.progress.booksOpened) ||
      !Number.isSafeInteger(data.progress.questionsDone) || data.progress.questionsDone < 0) {
    throw new Error('Tệp không phải bản sao lưu MathNexus hợp lệ.');
  }
  return { progress: normalizeProgress(data.progress), notes: data.notes };
}
