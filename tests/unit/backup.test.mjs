import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyCanvasState, loadCanvasState, saveCanvasState } from '../../src/canvas/canvasStorage.ts';
import { createEmptyExplorationSummary, getExplorationSummary } from '../../src/exploration/explorationState.ts';
import { getLearningGoal, setLearningGoal } from '../../src/learning/learningGoal.ts';
import { createBackupSnapshot, parseBackupSnapshot, restoreBackupSnapshot } from '../../src/utils/backup.ts';
import { getLibraryReadingRecords, saveLibraryReadingRecord } from '../../src/utils/libraryReading.ts';
import { getResearchShelf, saveResearchShelf } from '../../src/utils/researchShelf.ts';
import { DEFAULT_PROGRESS, getProgress, load, save, saveProgress } from '../../src/utils/storage.ts';
import { loadToolHistory, saveToolHistory } from '../../src/utils/toolHistory.ts';

const memory = new Map();
const storage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key),
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
const windowTarget = new EventTarget();
Object.defineProperty(windowTarget, 'localStorage', { configurable: true, value: storage });
globalThis.window = windowTarget;

beforeEach(() => memory.clear());

const goal = {
  version: 1,
  targetConceptId: 'taylor',
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
};

const readingRecord = {
  id: 'book:calculus',
  title: 'Calculus',
  authors: ['Ada Example'],
  cover: 'https://covers.openlibrary.org/b/id/1-M.jpg',
  openLibraryKey: '/works/OL1W',
  openLibraryUrl: 'https://openlibrary.org/works/OL1W',
  archiveId: 'calculus',
  status: 'reading',
  progress: 42,
  note: 'Đọc chương 1',
  bookmarks: [{ id: 'bookmark-1', label: 'Giới hạn', createdAt: '2026-09-22T00:00:00.000Z' }],
  updatedAt: '2026-09-22T00:00:00.000Z',
};

const researchItem = {
  id: 'paper:topology',
  kind: 'paper',
  title: 'Algebraic Topology',
  url: 'https://arxiv.org/abs/2609.12345',
  authors: ['Ada Example'],
  source: 'arXiv',
  openAccess: true,
  savedAt: '2026-09-22T00:00:00.000Z',
};

const toolEntry = {
  id: 'calc-gcd-48-18',
  tool: 'gcd',
  title: 'ƯCLN',
  input: '48, 18',
  result: '6',
  values: ['48', '18'],
  meta: '',
  at: '2026-09-22T00:00:00.000Z',
};

test('backup v2 round-trips every durable learning subsystem', () => {
  saveProgress({ ...DEFAULT_PROGRESS, displayName: 'Tiến', lessonsRead: ['quad'] });
  save('notes', 'Ghi chú đạo hàm');
  setLearningGoal('taylor');
  save('exploration_state_v1', {
    ...createEmptyExplorationSummary(),
    discoveredConceptIds: ['taylor'],
    conceptVisits: { taylor: 2 },
  });
  const canvas = {
    ...createEmptyCanvasState(),
    title: 'Canvas Giải tích',
    objects: [{
      id: 'obj_1',
      type: 'text',
      x: 10,
      y: 20,
      width: 260,
      height: 150,
      text: 'Taylor',
      createdAt: '2026-09-22T00:00:00.000Z',
      updatedAt: '2026-09-22T00:00:00.000Z',
    }],
  };
  saveCanvasState(canvas);
  saveLibraryReadingRecord(readingRecord);
  saveResearchShelf([researchItem]);
  saveToolHistory([toolEntry]);

  const snapshot = createBackupSnapshot();
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.progress.displayName, 'Tiến');
  assert.equal(snapshot.notes, 'Ghi chú đạo hàm');
  assert.equal(snapshot.learningGoal?.targetConceptId, 'taylor');
  assert.deepEqual(snapshot.exploration.discoveredConceptIds, ['taylor']);
  assert.equal(snapshot.canvas.title, 'Canvas Giải tích');
  assert.equal(snapshot.libraryReading[0].progress, 42);
  assert.equal(snapshot.researchShelf[0].title, 'Algebraic Topology');
  assert.equal(snapshot.toolHistory[0].result, '6');

  memory.clear();
  const parsed = parseBackupSnapshot(JSON.stringify(snapshot));
  const restored = restoreBackupSnapshot(parsed);
  assert.deepEqual(restored, { ok: true });
  assert.equal(getProgress().displayName, 'Tiến');
  assert.equal(load('notes', ''), 'Ghi chú đạo hàm');
  assert.equal(getLearningGoal()?.targetConceptId, 'taylor');
  assert.deepEqual(getExplorationSummary().discoveredConceptIds, ['taylor']);
  assert.equal(loadCanvasState().title, 'Canvas Giải tích');
  assert.equal(loadCanvasState().objects.length, 1);
  assert.equal(getLibraryReadingRecords()[0].progress, 42);
  assert.equal(getResearchShelf()[0].url, researchItem.url);
  assert.equal(loadToolHistory()[0].result, '6');
});

test('legacy v1 backup remains readable without clearing newer subsystem data', () => {
  setLearningGoal('taylor');
  const legacy = {
    app: 'MathNexus',
    version: 1,
    notes: 'Legacy note',
    progress: {
      ...DEFAULT_PROGRESS,
      displayName: 'Legacy',
    },
  };

  const parsed = parseBackupSnapshot(JSON.stringify(legacy));
  assert.equal(parsed.sourceVersion, 1);
  assert.equal(restoreBackupSnapshot(parsed).ok, true);
  assert.equal(getProgress().displayName, 'Legacy');
  assert.equal(load('notes', ''), 'Legacy note');
  assert.equal(getLearningGoal()?.targetConceptId, 'taylor');
});

test('backup v2 without additive collections preserves newer local data', () => {
  saveLibraryReadingRecord(readingRecord);
  saveResearchShelf([researchItem]);
  saveToolHistory([toolEntry]);

  const legacyV2 = {
    app: 'MathNexus',
    version: 2,
    notes: '',
    progress: DEFAULT_PROGRESS,
    learningGoal: null,
    exploration: createEmptyExplorationSummary(),
    canvas: createEmptyCanvasState(),
  };

  const parsed = parseBackupSnapshot(JSON.stringify(legacyV2));
  assert.equal(parsed.libraryReading, undefined);
  assert.equal(parsed.researchShelf, undefined);
  assert.equal(parsed.toolHistory, undefined);
  assert.deepEqual(restoreBackupSnapshot(parsed), { ok: true });
  assert.equal(getLibraryReadingRecords()[0].id, readingRecord.id);
  assert.equal(getResearchShelf()[0].url, researchItem.url);
  assert.equal(loadToolHistory()[0].id, toolEntry.id);
});

test('backup v2 rejects missing or malformed extended state', () => {
  const base = {
    app: 'MathNexus',
    version: 2,
    notes: '',
    progress: DEFAULT_PROGRESS,
    learningGoal: goal,
    exploration: createEmptyExplorationSummary(),
    canvas: createEmptyCanvasState(),
  };

  assert.equal(parseBackupSnapshot(JSON.stringify(base)).learningGoal?.targetConceptId, 'taylor');
  assert.throws(() => parseBackupSnapshot(JSON.stringify({ ...base, canvas: undefined })), /thiếu dữ liệu/);
  assert.throws(() => parseBackupSnapshot(JSON.stringify({ ...base, learningGoal: { ...goal, targetConceptId: 'unknown' } })), /không hợp lệ/);
  assert.throws(() => parseBackupSnapshot(JSON.stringify({ ...base, libraryReading: {} })), /sách đang đọc/);
  assert.throws(() => parseBackupSnapshot(JSON.stringify({ ...base, researchShelf: 'broken' })), /kệ nghiên cứu/);
  assert.throws(() => parseBackupSnapshot(JSON.stringify({ ...base, toolHistory: null })), /lịch sử công cụ/);
});
