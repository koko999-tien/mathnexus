import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { currentStreak, emptyActivity, getProgress, localDate, normalizeProgress, parseBackup, PROGRESS_SCHEMA_VERSION, recordActivity, recordQuestionAttempt, saveProgress } from '../../src/utils/storage.ts';

const memory = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) } });
globalThis.window = new EventTarget();
beforeEach(() => memory.clear());

test('legacy and corrupted progress are safely migrated with fresh defaults', () => {
  memory.set('mathnexus_progress', '{bad json');
  assert.equal(getProgress().dailyGoal, 5);
  assert.equal(getProgress().version, PROGRESS_SCHEMA_VERSION);
  memory.set('mathnexus_progress', JSON.stringify({ lessonsRead: ['quad', 'quad', 3], questionsDone: 2 }));
  assert.deepEqual(getProgress().lessonsRead, ['quad']);
  assert.equal(getProgress().questionsCorrect, 0);
  assert.deepEqual(getProgress().activity, {});
  assert.deepEqual(getProgress().practice, {});
  assert.equal(normalizeProgress({ dailyGoal: 999, questionsDone: -3 }).dailyGoal, 50);
  assert.equal(normalizeProgress({ questionsDone: -3 }).questionsDone, 0);
  getProgress().lessonsRead.push('should-not-leak');
  assert.deepEqual(getProgress().lessonsRead, ['quad']);
});

test('completions are idempotent while each quiz answer counts and updates daily goals', () => {
  recordActivity('lesson', 'quad'); recordActivity('lesson', 'quad');
  recordActivity('book', 'book1'); recordActivity('book', 'book1');
  recordActivity('question', true); recordActivity('question', false);
  const p = getProgress();
  assert.equal(p.lessonsRead.length, 1);
  assert.equal(p.booksOpened.length, 1);
  assert.equal(p.questionsDone, 2);
  assert.equal(p.questionsCorrect, 1);
  assert.deepEqual(p.activity[localDate()], { lessons: 1, books: 1, questions: 2, correct: 1 });
  assert.equal(p.streak, 1);
});


test('practice memory tracks misses and recovery without double-counting answers', () => {
  recordQuestionAttempt('comb-5-2', false);
  let p = getProgress();
  assert.equal(p.questionsDone, 1);
  assert.deepEqual(p.practice['comb-5-2'], {
    attempts: 1,
    correct: 0,
    correctStreak: 0,
    lastCorrect: false,
    updatedAt: p.practice['comb-5-2'].updatedAt,
  });

  recordQuestionAttempt('comb-5-2', true);
  recordQuestionAttempt('comb-5-2', true);
  p = getProgress();
  assert.equal(p.questionsDone, 3);
  assert.equal(p.questionsCorrect, 2);
  assert.equal(p.practice['comb-5-2'].attempts, 3);
  assert.equal(p.practice['comb-5-2'].correct, 2);
  assert.equal(p.practice['comb-5-2'].correctStreak, 2);
  assert.equal(p.practice['comb-5-2'].lastCorrect, true);
});

test('streak uses local calendar days, survives month boundaries, and expires after a missed day', () => {
  const active = { ...emptyActivity(), questions: 1 };
  const activity = { '2026-08-30': active, '2026-08-31': active, '2026-09-01': active };
  assert.equal(currentStreak(activity, new Date(2026, 8, 1, 8)), 3);
  assert.equal(currentStreak(activity, new Date(2026, 8, 2, 23)), 3);
  assert.equal(currentStreak(activity, new Date(2026, 8, 3)), 0);
  assert.equal(localDate(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
});

test('backups round-trip progress and notes, rejecting unrelated data', () => {
  recordActivity('question', true);
  const backup = { app: 'MathNexus', version: 1, notes: 'Đạo hàm x² = 2x', progress: getProgress() };
  assert.equal(parseBackup(JSON.stringify(backup)).notes, backup.notes);
  assert.equal(parseBackup(JSON.stringify(backup)).progress.questionsDone, 1);
  assert.throws(() => parseBackup('{}'), /không phải/);
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, notes: {} })), /không phải/);
  saveProgress({ ...getProgress(), displayName: '   Tiến   ' });
  assert.equal(getProgress().displayName, 'Tiến');
});


test('legacy progress without a version upgrades to the current schema on normalize and save', () => {
  memory.set('mathnexus_progress', JSON.stringify({
    lessonsRead: ['quad'],
    questionsDone: 2,
    booksOpened: [],
  }));

  const progress = getProgress();
  assert.equal(progress.version, PROGRESS_SCHEMA_VERSION);
  assert.equal(saveProgress(progress), true);

  const persisted = JSON.parse(memory.get('mathnexus_progress'));
  assert.equal(persisted.version, PROGRESS_SCHEMA_VERSION);
  assert.deepEqual(persisted.lessonsRead, ['quad']);
});

test('older code refuses to overwrite a future progress schema', () => {
  memory.set('mathnexus_progress', JSON.stringify({
    version: PROGRESS_SCHEMA_VERSION + 1,
    lessonsRead: ['future-lesson'],
    questionsDone: 7,
    booksOpened: [],
    futureField: { keep: true },
  }));

  let storageErrors = 0;
  const handler = () => { storageErrors += 1; };
  window.addEventListener('mathnexus:storage-error', handler);

  try {
    const readable = getProgress();
    assert.equal(readable.version, PROGRESS_SCHEMA_VERSION);
    assert.equal(saveProgress({ ...readable, displayName: 'Rollback app' }), false);

    const raw = JSON.parse(memory.get('mathnexus_progress'));
    assert.equal(raw.version, PROGRESS_SCHEMA_VERSION + 1);
    assert.deepEqual(raw.futureField, { keep: true });
    assert.equal(storageErrors, 1);
  } finally {
    window.removeEventListener('mathnexus:storage-error', handler);
  }
});
