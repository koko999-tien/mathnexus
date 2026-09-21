import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROGRESS } from '../../src/utils/storage.ts';
import { buildTutorPlan, detectTutorMode, tutorModeLabel } from '../../src/utils/tutorPlanner.ts';
import { searchKnowledge } from '../../src/utils/knowledgeSearch.ts';
import { normalizeTutor, tutorInstruction } from '../../api/tutorPolicy.js';

test('tutor intent detection separates hints, proof, error, visual and direct-solution requests', () => {
  assert.equal(detectTutorMode('Gợi ý cho mình bước đầu tiên thôi'), 'GUIDED_HINT');
  assert.equal(detectTutorMode('Chứng minh định lý này giúp mình'), 'PROOF_GUIDANCE');
  assert.equal(detectTutorMode('Mình sai ở đâu trong lời giải này?'), 'ERROR_DIAGNOSIS');
  assert.equal(detectTutorMode('Giải thích trực quan bằng đồ thị'), 'VISUAL_INTUITION');
  assert.equal(detectTutorMode('Mình yếu đạo hàm, nên học gì trước?'), 'DISCOVER');
  assert.equal(detectTutorMode('Đạo hàm là gì?'), 'CONCEPT_EXPLANATION');
  assert.equal(detectTutorMode('Cho đáp án và lời giải hoàn chỉnh'), 'DIRECT_SOLUTION');
});

test('Socratic planner uses retrieved concepts and mastery evidence without inventing scores', () => {
  const hits = searchKnowledge('mình yếu đạo hàm nên học gì trước', 8);
  const plan = buildTutorPlan('mình yếu đạo hàm nên học gì trước', hits, DEFAULT_PROGRESS, 'AUTO');

  assert.equal(plan.mode, 'DISCOVER');
  assert.equal(plan.directSolutionAllowed, false);
  assert.ok(plan.anchorConceptIds.length > 0);
  assert.match(plan.masterySummary, /chưa có điểm|Chưa/);
  assert.ok(plan.localOpening.length > 0);
  assert.equal(tutorModeLabel(plan.mode), 'Khám phá');
});

test('explicit full-solution request unlocks direct solution mode', () => {
  const hits = searchKnowledge('C(5,2) tổ hợp', 6);
  const plan = buildTutorPlan('Cho đáp án và lời giải hoàn chỉnh: C(5,2)', hits, DEFAULT_PROGRESS, 'AUTO');

  assert.equal(plan.mode, 'DIRECT_SOLUTION');
  assert.equal(plan.directSolutionAllowed, true);
});

test('server tutor policy whitelists modes and bounds untrusted client context', () => {
  const normalized = normalizeTutor({
    mode: 'INJECT_ANYTHING',
    directSolutionAllowed: false,
    strategy: 'x'.repeat(5000),
    masterySummary: 'y'.repeat(5000),
    anchorConceptIds: ['a'.repeat(200), 'b', 7, 'c', 'd', 'e', 'f', 'g'],
  });

  assert.equal(normalized.mode, 'GUIDED_HINT');
  assert.equal(normalized.directSolutionAllowed, false);
  assert.equal(normalized.strategy.length, 1200);
  assert.equal(normalized.masterySummary.length, 1800);
  assert.equal(normalized.anchorConceptIds.length, 6);
  assert.equal(normalized.anchorConceptIds[0].length, 100);

  const instruction = tutorInstruction(normalized);
  assert.match(instruction, /Mode: GUIDED_HINT/);
  assert.match(instruction, /không nên đưa lời giải hoàn chỉnh ngay/);
});

test('server direct-solution mode explicitly permits full solutions', () => {
  const normalized = normalizeTutor({
    mode: 'DIRECT_SOLUTION',
    directSolutionAllowed: false,
    strategy: 'Giải từng bước.',
    masterySummary: '',
    anchorConceptIds: [],
  });

  assert.equal(normalized.directSolutionAllowed, true);
  assert.match(tutorInstruction(normalized), /được phép đưa đáp án\/lời giải đầy đủ/);
});
