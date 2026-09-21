import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningCompass } from '../../src/utils/learningCompass.ts';
import { createEmptyExplorationSummary, applyExplorationAction } from '../../src/exploration/explorationState.ts';
import { DEFAULT_PROGRESS } from '../../src/utils/storage.ts';

test('fresh learners receive explainable assessment, next-step and exploration guidance', () => {
  const compass = buildLearningCompass(DEFAULT_PROGRESS, createEmptyExplorationSummary(), 3);

  assert.ok(compass.length >= 2);
  assert.ok(compass.some(item => item.kind === 'assess'));
  const advance = compass.find(item => item.kind === 'advance');
  assert.equal(advance?.conceptId, 'number-systems');
  assert.match(advance?.to || '', /^\/lesson\//);
  assert.ok(compass.some(item => item.kind === 'explore'));
});

test('measured weak concepts are prioritized for concept-scoped review', () => {
  const progress = {
    ...DEFAULT_PROGRESS,
    lessonsRead: ['cplx'],
    practice: {
      'complex-i-square': { attempts: 3, correct: 1, correctStreak: 0, lastCorrect: false, updatedAt: '2026-09-22T00:00:00.000Z' },
      'complex-modulus-3-4': { attempts: 2, correct: 0, correctStreak: 0, lastCorrect: false, updatedAt: '2026-09-22T00:00:00.000Z' },
      'complex-multiply': { attempts: 2, correct: 1, correctStreak: 0, lastCorrect: false, updatedAt: '2026-09-22T00:00:00.000Z' },
    },
  };

  const compass = buildLearningCompass(progress, createEmptyExplorationSummary(), 3);
  const repair = compass[0];

  assert.equal(repair.kind, 'repair');
  assert.equal(repair.conceptId, 'complex-numbers');
  assert.match(repair.to, /concept=complex-numbers/);
  assert.match(repair.to, /mode=review/);
  assert.match(repair.detail, /độ tin cậy/);
});

test('exploration guidance prefers an unseen reachable concept', () => {
  const progress = { ...DEFAULT_PROGRESS, lessonsRead: ['frac'], lastLesson: 'frac' };
  let exploration = createEmptyExplorationSummary();
  exploration = applyExplorationAction(
    exploration,
    { type: 'concept_open', conceptId: 'sets' },
    new Date('2026-09-22T00:00:00.000Z'),
  );

  const compass = buildLearningCompass(progress, exploration, 3);
  const explore = compass.find(item => item.kind === 'explore');

  assert.ok(explore);
  assert.notEqual(explore?.conceptId, 'sets');
  assert.ok(explore?.to === '/cosmos' || explore?.to.startsWith('/map?concept='));
});
