import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROGRESS } from '../../src/utils/storage.ts';
import {
  buildGoalDiagnosticPlan,
  buildLearningGoalState,
  normalizeLearningGoal,
} from '../../src/learning/learningGoal.ts';

const goal = targetConceptId => ({
  version: 1,
  targetConceptId,
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
});

test('learning goal normalization rejects unknown concepts and malformed versions', () => {
  assert.equal(normalizeLearningGoal(null), null);
  assert.equal(normalizeLearningGoal({ version: 2, targetConceptId: 'taylor' }), null);
  assert.equal(normalizeLearningGoal({ ...goal('not-real') }), null);
  assert.equal(normalizeLearningGoal(goal('taylor'))?.targetConceptId, 'taylor');
});

test('fresh Taylor goal starts from the nearest reachable foundation', () => {
  const state = buildLearningGoalState(DEFAULT_PROGRESS, goal('taylor'));
  assert.ok(state);
  assert.equal(state?.target.id, 'taylor');
  assert.equal(state?.status, 'active');
  assert.equal(state?.progressPercent, 0);
  assert.equal(state?.nextAction?.conceptId, 'number-systems');
  assert.equal(state?.nextAction?.kind, 'lesson');
  assert.equal(state?.nextAction?.to, '/lesson/frac');
});

test('goal engine advances after prerequisite evidence is recorded', () => {
  const progress = {
    ...DEFAULT_PROGRESS,
    lessonsRead: ['frac'],
    lastLesson: 'frac',
  };
  const state = buildLearningGoalState(progress, goal('linear-equations'));

  assert.ok((state?.progressPercent || 0) > 0);
  assert.equal(state?.nextAction?.conceptId, 'algebraic-expressions');
  assert.equal(state?.nextAction?.kind, 'practice');
  assert.match(state?.nextAction?.to || '', /concept=algebraic-expressions/);
});

test('strong direct evidence can complete a goal even when the learner skipped the suggested route', () => {
  const progress = {
    ...DEFAULT_PROGRESS,
    lessonsRead: ['cplx'],
    practice: {
      'complex-i-square': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
      'complex-modulus-3-4': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
      'complex-multiply': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
    },
  };
  const state = buildLearningGoalState(progress, goal('complex-numbers'));

  assert.equal(state?.status, 'complete');
  assert.equal(state?.progressPercent, 100);
  assert.equal(state?.nextAction, null);
});


test('goal diagnostic interleaves questions across unsatisfied path concepts', () => {
  const plan = buildGoalDiagnosticPlan(DEFAULT_PROGRESS, goal('taylor'));

  assert.ok(plan);
  assert.equal(plan?.targetConceptId, 'taylor');
  assert.ok((plan?.conceptIds.length || 0) >= 3);
  assert.ok((plan?.questionIds.length || 0) >= 3);
  assert.equal(new Set(plan?.questionIds).size, plan?.questionIds.length);
  assert.ok(plan?.questionIds.includes('calc-power-derivative'));
  assert.ok(plan?.questionIds.includes('alg-log-2-8'));
});

test('completed direct-mastery goal does not generate redundant diagnostic questions', () => {
  const progress = {
    ...DEFAULT_PROGRESS,
    lessonsRead: ['cplx'],
    practice: {
      'complex-i-square': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
      'complex-modulus-3-4': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
      'complex-multiply': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
    },
  };

  const plan = buildGoalDiagnosticPlan(progress, goal('complex-numbers'));
  assert.deepEqual(plan?.questionIds, []);
  assert.deepEqual(plan?.conceptIds, []);
});
