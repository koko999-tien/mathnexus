import test from 'node:test';
import assert from 'node:assert/strict';
import { atomsForConcept, ontologyDepthScore, ontologyDiagnostics } from '../../src/utils/mathOntology.ts';
import { conceptMastery } from '../../src/utils/conceptMastery.ts';
import { DEFAULT_PROGRESS } from '../../src/utils/storage.ts';

test('deep ontology references valid concepts and atoms', () => {
  const diagnostics = ontologyDiagnostics();
  assert.deepEqual(diagnostics.duplicateAtomIds, []);
  assert.deepEqual(diagnostics.unknownConceptIds, []);
  assert.deepEqual(diagnostics.missingAtomDependencies, []);
  assert.ok(diagnostics.atomCount >= 60);
  assert.ok(diagnostics.deepConceptCount >= 10);

  const derivative = atomsForConcept('derivative-definition');
  assert.ok(derivative.some(atom => atom.kind === 'definition'));
  assert.ok(derivative.some(atom => atom.kind === 'counterexample'));
  assert.ok(derivative.some(atom => atom.kind === 'misconception'));
  assert.ok(ontologyDepthScore('derivative-definition') >= 45);
});

test('mastery estimator separates score from evidence confidence', () => {
  const fresh = conceptMastery(DEFAULT_PROGRESS, 'complex-numbers');
  assert.equal(fresh.score, null);
  assert.equal(fresh.confidence, 0);
  assert.equal(fresh.state, 'unassessed');

  const progress = {
    ...DEFAULT_PROGRESS,
    lessonsRead: ['cplx'],
    practice: {
      'complex-i-square': { attempts: 2, correct: 2, correctStreak: 2, lastCorrect: true, updatedAt: '2026-09-21T00:00:00.000Z' },
      'complex-modulus-3-4': { attempts: 2, correct: 2, correctStreak: 2, lastCorrect: true, updatedAt: '2026-09-21T00:00:00.000Z' },
      'complex-multiply': { attempts: 1, correct: 1, correctStreak: 1, lastCorrect: true, updatedAt: '2026-09-21T00:00:00.000Z' },
    },
  };
  const measured = conceptMastery(progress, 'complex-numbers');
  assert.ok((measured.score || 0) >= 80);
  assert.ok(measured.confidence >= 70);
  assert.equal(measured.state, 'strong');
  assert.equal(measured.practice.attemptedQuestions, 3);
});
