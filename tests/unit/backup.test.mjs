import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyCanvasState, loadCanvasState, saveCanvasState } from '../../src/canvas/canvasStorage.ts';
import { createEmptyExplorationSummary, getExplorationSummary } from '../../src/exploration/explorationState.ts';
import { getLearningGoal, setLearningGoal } from '../../src/learning/learningGoal.ts';
import { createBackupSnapshot, parseBackupSnapshot, restoreBackupSnapshot } from '../../src/utils/backup.ts';
import { DEFAULT_PROGRESS, getProgress, load, save, saveProgress } from '../../src/utils/storage.ts';

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

  const snapshot = createBackupSnapshot();
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.progress.displayName, 'Tiến');
  assert.equal(snapshot.notes, 'Ghi chú đạo hàm');
  assert.equal(snapshot.learningGoal?.targetConceptId, 'taylor');
  assert.deepEqual(snapshot.exploration.discoveredConceptIds, ['taylor']);
  assert.equal(snapshot.canvas.title, 'Canvas Giải tích');

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
});
