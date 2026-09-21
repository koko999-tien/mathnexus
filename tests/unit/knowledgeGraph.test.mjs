import test from 'node:test';
import assert from 'node:assert/strict';
import { MATH_CONCEPTS } from '../../src/data/mathKnowledge.ts';
import { conceptDepth, conceptProgress, knowledgeGraphDiagnostics, learningPathTo, prerequisiteClosure } from '../../src/utils/knowledgeGraph.ts';
import { DEFAULT_PROGRESS } from '../../src/utils/storage.ts';

test('math knowledge graph has valid ids, references and no prerequisite cycles', () => {
  const diagnostics = knowledgeGraphDiagnostics();
  assert.deepEqual(diagnostics.duplicateIds, []);
  assert.deepEqual(diagnostics.missingPrerequisites, []);
  assert.equal(diagnostics.domainCount, 11);
  assert.ok(diagnostics.conceptCount >= 49);

  for (const concept of MATH_CONCEPTS) {
    assert.ok(conceptDepth(concept.id) >= 0);
  }
});

test('knowledge graph orders prerequisites before advanced targets', () => {
  const path = learningPathTo('taylor');
  const ids = path.map(item => item.id);
  assert.equal(ids.at(-1), 'taylor');
  assert.ok(ids.indexOf('limits') < ids.indexOf('derivative-rules'));
  assert.ok(ids.indexOf('derivative-rules') < ids.indexOf('taylor'));
  assert.ok(ids.indexOf('series') < ids.indexOf('taylor'));

  const prerequisites = prerequisiteClosure('first-order-ode').map(item => item.id);
  assert.ok(prerequisites.includes('derivative-rules'));
  assert.ok(prerequisites.includes('antiderivatives'));
  assert.ok(prerequisites.includes('exponential-logarithmic'));
});

test('concept readiness distinguishes covered, ready and curriculum-gap nodes', () => {
  const fresh = conceptProgress(DEFAULT_PROGRESS);
  assert.equal(fresh.find(item => item.concept.id === 'number-systems')?.state, 'ready');
  assert.equal(fresh.find(item => item.concept.id === 'quadratics')?.state, 'locked');

  const withNumbers = conceptProgress({ ...DEFAULT_PROGRESS, lessonsRead: ['frac'] });
  assert.equal(withNumbers.find(item => item.concept.id === 'number-systems')?.state, 'covered');
  assert.equal(withNumbers.find(item => item.concept.id === 'sets')?.state, 'ready');

  const withLimits = conceptProgress({ ...DEFAULT_PROGRESS, lessonsRead: ['frac', 'set', 'log', 'lim'] });
  assert.equal(withLimits.find(item => item.concept.id === 'continuity')?.state, 'ready');
});
