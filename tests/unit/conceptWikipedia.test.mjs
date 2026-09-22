import test from 'node:test';
import assert from 'node:assert/strict';
import {
  relatedConceptsForText,
  wikipediaQueryForConcept,
} from '../../src/data/conceptWikipedia.ts';

test('Wikipedia concept mapping returns stable Vietnamese and English queries', () => {
  assert.equal(wikipediaQueryForConcept('derivative-definition', 'vi'), 'Đạo hàm');
  assert.equal(wikipediaQueryForConcept('derivative-definition', 'en'), 'Derivative');
  assert.equal(wikipediaQueryForConcept('graph-theory', 'en'), 'Graph theory');
});

test('related concept matching recognizes English book metadata', () => {
  const concepts = relatedConceptsForText(
    'Calculus textbook covering limits, continuity, derivatives, definite integrals and Taylor series.',
    8,
  );
  const ids = concepts.map(item => item.id);

  assert.ok(ids.includes('limits'));
  assert.ok(ids.includes('derivative-definition') || ids.includes('derivative-rules'));
  assert.ok(ids.includes('definite-integrals'));
  assert.ok(ids.includes('taylor'));
});

test('related concept matching recognizes Vietnamese Wikipedia text', () => {
  const concepts = relatedConceptsForText(
    'Định lý Bayes mô tả xác suất có điều kiện và là một kết quả quan trọng trong xác suất.',
    5,
  );
  const ids = concepts.map(item => item.id);

  assert.ok(ids.includes('bayes'));
  assert.ok(ids.includes('conditional-probability'));
});
