const PREFIX = 'mathnexus_';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

export interface ProgressData {
  lessonsRead: string[];
  questionsDone: number;
  booksOpened: string[];
  streak: number;
  lastDate: string;
  dailyGoal: number;
  displayName: string;
}

export const DEFAULT_PROGRESS: ProgressData = {
  lessonsRead: [],
  questionsDone: 0,
  booksOpened: [],
  streak: 0,
  lastDate: '',
  dailyGoal: 5,
  displayName: 'Bạn học Toán',
};

export function getProgress(): ProgressData {
  return load<ProgressData>('progress', DEFAULT_PROGRESS);
}

export function saveProgress(p: ProgressData): void {
  save('progress', p);
}
