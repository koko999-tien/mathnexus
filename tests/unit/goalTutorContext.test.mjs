import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROGRESS } from '../../src/utils/storage.ts';
import { buildGoalTutorContext } from '../../src/learning/goalTutorContext.ts';

const goal = {
  version: 1,
  targetConceptId: 'taylor',
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
};

test('goal tutor context exposes only explicit Learning Goal state and next graph action', () => {
  const context = buildGoalTutorContext(DEFAULT_PROGRESS, goal);

  assert.ok(context);
  assert.equal(context?.targetConceptId, 'taylor');
  assert.equal(context?.progressPercent, 0);
  assert.ok(context?.anchorConceptIds.includes('taylor'));
  assert.ok(context?.anchorConceptIds.includes('number-systems'));
  assert.match(context?.text || '', /Mục tiêu học tập người dùng đã chủ động đặt: Chuỗi Taylor/);
  assert.match(context?.text || '', /Học “Hệ số và biểu diễn số”/);
  assert.match(context?.text || '', /Không được tự thay đổi mục tiêu/);
  assert.ok(context?.links.some(link => link.to === '/map?concept=taylor'));
  assert.ok(context?.links.some(link => link.to === '/lesson/frac'));
});

test('goal tutor context reports completed targets without inventing a next action', () => {
  const progress = {
    ...DEFAULT_PROGRESS,
    lessonsRead: ['cplx'],
    practice: {
      'complex-i-square': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
      'complex-modulus-3-4': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
      'complex-multiply': { attempts: 3, correct: 3, correctStreak: 3, lastCorrect: true, updatedAt: '2026-09-22T00:00:00.000Z' },
    },
  };
  const context = buildGoalTutorContext(progress, { ...goal, targetConceptId: 'complex-numbers' });

  assert.equal(context?.status, 'complete');
  assert.equal(context?.progressPercent, 100);
  assert.match(context?.text || '', /đã có đủ bằng chứng trực tiếp/);
  assert.equal(context?.links.length, 1);
});
