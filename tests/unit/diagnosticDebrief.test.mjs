import test from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ } from '../../src/data/quiz.ts';
import { DEFAULT_PROGRESS } from '../../src/utils/storage.ts';
import { buildGoalDiagnosticDebrief } from '../../src/learning/diagnosticDebrief.ts';

const goal = {
  version: 1,
  targetConceptId: 'taylor',
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
};

test('diagnostic debrief groups session evidence by concept and tracks confidence deltas', () => {
  const ids = ['alg-log-2-8', 'calc-power-derivative', 'calc-chain-rule'];
  const questions = ids.map(id => QUIZ.find(item => item.id === id)).filter(Boolean);
  const answers = [
    questions[0].i,
    (questions[1].i + 1) % questions[1].a.length,
    questions[2].i,
  ];

  const after = structuredClone(DEFAULT_PROGRESS);
  questions.forEach((question, index) => {
    const correct = answers[index] === question.i;
    after.practice[question.id] = {
      attempts: 1,
      correct: correct ? 1 : 0,
      correctStreak: correct ? 1 : 0,
      lastCorrect: correct,
      updatedAt: '2026-09-22T00:00:00.000Z',
    };
  });
  after.questionsDone = questions.length;
  after.questionsCorrect = 2;

  const debrief = buildGoalDiagnosticDebrief(questions, answers, DEFAULT_PROGRESS, after, goal);

  assert.ok(debrief);
  assert.equal(debrief?.attempted, 3);
  assert.equal(debrief?.correct, 2);
  assert.equal(debrief?.accuracy, 67);
  assert.equal(debrief?.concepts.length, 2);
  assert.ok(debrief?.concepts.every(item => item.confidenceDelta > 0));
  assert.equal(debrief?.weakestConcept?.conceptId, 'derivative-rules');
  assert.ok((debrief?.weakestConcept?.accuracy ?? 100) < 100);
});

test('diagnostic debrief reports no artificial goal progress when evidence is still weak', () => {
  const question = QUIZ.find(item => item.id === 'alg-log-2-8');
  assert.ok(question);

  const after = structuredClone(DEFAULT_PROGRESS);
  after.practice[question.id] = {
    attempts: 1,
    correct: 1,
    correctStreak: 1,
    lastCorrect: true,
    updatedAt: '2026-09-22T00:00:00.000Z',
  };
  after.questionsDone = 1;
  after.questionsCorrect = 1;

  const debrief = buildGoalDiagnosticDebrief([question], [question.i], DEFAULT_PROGRESS, after, goal);
  assert.equal(debrief?.goalProgressBefore, 0);
  assert.equal(debrief?.goalProgressAfter, 0);
  assert.equal(debrief?.goalProgressDelta, 0);
  assert.ok((debrief?.concepts[0].confidenceDelta || 0) > 0);
});
