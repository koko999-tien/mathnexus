import { load, save } from './storage.ts';

export interface NotebookNote {
  id: string;
  title: string;
  text: string;
  updatedAt: string;
}

export const NOTEBOOK_KEY = 'notebook_notes_v1';
const ACTIVE_KEY = 'notebook_active_v1';
const LEGACY_KEY = 'notes';

function makeId(): string {
  return `note-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function normalizeNote(raw: unknown): NotebookNote | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const text = typeof record.text === 'string' ? record.text : '';
  const title = typeof record.title === 'string' && record.title.trim()
    ? record.title.slice(0, 120)
    : text.split('\n').find(line => line.trim())?.slice(0, 60) || 'Ghi chú không tên';
  const id = typeof record.id === 'string' && record.id ? record.id : makeId();
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString();
  return { id, title, text, updatedAt };
}

export function loadNotes(): NotebookNote[] {
  try {
    const raw = localStorage.getItem(`mathnexus_${NOTEBOOK_KEY}`);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const notes = parsed.map(normalizeNote).filter((note): note is NotebookNote => Boolean(note));
        if (notes.length) return notes;
      }
    }
  } catch {
    // Đọc thất bại thì thử migrate bên dưới.
  }

  // Migrate một lần từ sổ đơn cũ sang ghi chú đầu tiên.
  const legacy = load<unknown>(LEGACY_KEY, '');
  const text = typeof legacy === 'string' ? legacy : '';
  const migrated: NotebookNote[] = [{
    id: makeId(),
    title: 'Ghi chú của tôi',
    text,
    updatedAt: new Date().toISOString(),
  }];
  saveNotes(migrated);
  return migrated;
}

export function saveNotes(notes: NotebookNote[]): boolean {
  return save(NOTEBOOK_KEY, notes);
}

export function loadActiveId(fallbackId: string): string {
  try {
    const raw = localStorage.getItem(`mathnexus_${ACTIVE_KEY}`);
    if (typeof raw === 'string' && raw) return raw;
  } catch {
    // Bỏ qua, dùng fallback.
  }
  return fallbackId;
}

export function saveActiveId(id: string): void {
  try {
    localStorage.setItem(`mathnexus_${ACTIVE_KEY}`, id);
  } catch {
    // Lưu active là tiện ích, không bắt buộc.
  }
}

function foldQuery(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

export function searchNotes(notes: NotebookNote[], query: string): NotebookNote[] {
  const needle = foldQuery(query.trim());
  if (!needle) return notes;
  return notes.filter(note => foldQuery(`${note.title}\n${note.text}`).includes(needle));
}

export function questionBlock(question: string, answer: string, explanation: string): string {
  return `\n\n> Câu hỏi đã gắn: ${question}\n> Đáp án: ${answer}${explanation ? `\n> Giải thích: ${explanation}` : ''}\n`;
}

export function lessonBlock(title: string, path: string): string {
  return `\n\n> Bài học đã gắn: ${title}\n> Mở lại: ${path}\n`;
}
