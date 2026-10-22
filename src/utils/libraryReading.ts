export type ReadingStatus = 'saved' | 'reading' | 'finished';

export interface LibraryReadingRecord {
  id: string;
  title: string;
  authors: string[];
  cover: string;
  openLibraryKey: string;
  openLibraryUrl: string;
  archiveId: string;
  status: ReadingStatus;
  progress: number;
  note: string;
  bookmarks: Array<{
    id: string;
    label: string;
    createdAt: string;
  }>;
  updatedAt: string;
}

const STORAGE_KEY = 'mathnexus:library-reading:v1';
const MAX_RECORDS = 200;

function clampProgress(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export function normalizeLibraryReadingRecord(value: unknown): LibraryReadingRecord | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const id = String(item.id || '').trim();
  if (!id) return null;

  return {
    id,
    title: String(item.title || 'Untitled'),
    authors: Array.isArray(item.authors) ? item.authors.map(String).filter(Boolean).slice(0, 8) : [],
    cover: String(item.cover || ''),
    openLibraryKey: String(item.openLibraryKey || ''),
    openLibraryUrl: String(item.openLibraryUrl || ''),
    archiveId: String(item.archiveId || ''),
    status: item.status === 'finished' ? 'finished' : item.status === 'reading' ? 'reading' : 'saved',
    progress: clampProgress(item.progress),
    note: String(item.note || ''),
    bookmarks: Array.isArray(item.bookmarks)
      ? item.bookmarks
        .filter((bookmark: unknown): bookmark is Record<string, unknown> => Boolean(bookmark) && typeof bookmark === 'object')
        .map((bookmark: Record<string, unknown>) => ({
          id: String(bookmark.id || ''),
          label: String(bookmark.label || ''),
          createdAt: String(bookmark.createdAt || ''),
        }))
        .filter((bookmark: { id: string }) => bookmark.id)
        .slice(0, 100)
      : [],
    updatedAt: String(item.updatedAt || ''),
  };
}

export function normalizeLibraryReadingRecords(value: unknown): LibraryReadingRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map(normalizeLibraryReadingRecord)
    .filter((item): item is LibraryReadingRecord => Boolean(item))
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, MAX_RECORDS);
}

export function getLibraryReadingRecords(): LibraryReadingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeLibraryReadingRecords(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveLibraryReadingRecords(records: LibraryReadingRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeLibraryReadingRecords(records)));
    return true;
  } catch {
    return false;
  }
}

export function saveLibraryReadingRecord(record: LibraryReadingRecord) {
  const records = getLibraryReadingRecords();
  const next = [record, ...records.filter(item => item.id !== record.id)]
    .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''))
    .slice(0, MAX_RECORDS);
  if (!saveLibraryReadingRecords(next)) throw new Error('Không lưu được tiến độ đọc.');
}

export function upsertLibraryBook(input: {
  id: string;
  title: string;
  authors?: string[];
  cover?: string;
  openLibraryKey?: string;
  openLibraryUrl?: string;
  archiveId?: string;
}) {
  const existing = getLibraryReadingRecords().find(item => item.id === input.id);
  const now = new Date().toISOString();

  const record: LibraryReadingRecord = existing
    ? {
      ...existing,
      title: input.title || existing.title,
      authors: input.authors?.length ? input.authors : existing.authors,
      cover: input.cover || existing.cover,
      openLibraryKey: input.openLibraryKey || existing.openLibraryKey,
      openLibraryUrl: input.openLibraryUrl || existing.openLibraryUrl,
      archiveId: input.archiveId || existing.archiveId,
      updatedAt: now,
    }
    : {
      id: input.id,
      title: input.title,
      authors: input.authors || [],
      cover: input.cover || '',
      openLibraryKey: input.openLibraryKey || '',
      openLibraryUrl: input.openLibraryUrl || '',
      archiveId: input.archiveId || '',
      status: 'saved',
      progress: 0,
      note: '',
      bookmarks: [],
      updatedAt: now,
    };

  saveLibraryReadingRecord(record);
  return record;
}

export function removeLibraryReadingRecord(id: string) {
  if (!saveLibraryReadingRecords(getLibraryReadingRecords().filter(item => item.id !== id))) {
    throw new Error('Không lưu được tiến độ đọc.');
  }
}
