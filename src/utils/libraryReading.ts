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

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export function getLibraryReadingRecords(): LibraryReadingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && typeof item === 'object' && typeof item.id === 'string')
      .map(item => ({
        id: String(item.id),
        title: String(item.title || 'Untitled'),
        authors: Array.isArray(item.authors) ? item.authors.map(String).slice(0, 8) : [],
        cover: String(item.cover || ''),
        openLibraryKey: String(item.openLibraryKey || ''),
        openLibraryUrl: String(item.openLibraryUrl || ''),
        archiveId: String(item.archiveId || ''),
        status: item.status === 'finished' ? 'finished' : item.status === 'reading' ? 'reading' : 'saved',
        progress: clampProgress(item.progress),
        note: String(item.note || ''),
        bookmarks: Array.isArray(item.bookmarks)
          ? item.bookmarks
            .filter((bookmark: unknown) => bookmark && typeof bookmark === 'object')
            .map((bookmark: any) => ({
              id: String(bookmark.id || ''),
              label: String(bookmark.label || ''),
              createdAt: String(bookmark.createdAt || ''),
            }))
            .filter((bookmark: { id: string }) => bookmark.id)
            .slice(0, 100)
          : [],
        updatedAt: String(item.updatedAt || ''),
      }));
  } catch {
    return [];
  }
}

export function saveLibraryReadingRecord(record: LibraryReadingRecord) {
  const records = getLibraryReadingRecords();
  const next = [record, ...records.filter(item => item.id !== record.id)]
    .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''))
    .slice(0, 200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getLibraryReadingRecords().filter(item => item.id !== id)));
}
