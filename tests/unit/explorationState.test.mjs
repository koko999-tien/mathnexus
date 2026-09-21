import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExplorationAction,
  createEmptyExplorationSummary,
  explorationMetrics,
  normalizeExplorationSummary,
  recentExploration,
} from '../../src/exploration/explorationState.ts';

test('exploration state records unique discoveries and separates revisits', () => {
  const start = createEmptyExplorationSummary();
  const time = new Date('2026-09-21T08:00:00.000Z');

  const first = applyExplorationAction(start, { type: 'concept_open', conceptId: 'derivative-definition' }, time);
  const second = applyExplorationAction(first, { type: 'concept_open', conceptId: 'derivative-definition' }, time);

  assert.deepEqual(second.discoveredConceptIds, ['derivative-definition']);
  assert.equal(second.conceptVisits['derivative-definition'], 2);
  assert.equal(second.daily['2026-09-21'].newConcepts, 1);
  assert.equal(second.daily['2026-09-21'].revisits, 1);
  assert.equal(second.daily['2026-09-21'].actions, 2);
});

test('opening a deep ontology atom adds depth without inventing mastery data', () => {
  const start = createEmptyExplorationSummary();
  const next = applyExplorationAction(
    start,
    { type: 'atom_open', atomId: 'derivative-limit' },
    new Date('2026-09-21T09:00:00.000Z'),
  );

  assert.ok(next.discoveredAtomIds.includes('derivative-limit'));
  assert.ok(next.discoveredConceptIds.includes('derivative-definition'));
  assert.equal(next.daily['2026-09-21'].newAtoms, 1);
  assert.equal('mastery' in next, false);
  assert.equal('emotion' in next, false);
  assert.equal('pointerPath' in next, false);
  assert.equal('cameraVelocity' in next, false);
});

test('exploration metric increases with breadth depth revisits and simulation work', () => {
  let state = createEmptyExplorationSummary();
  const time = new Date('2026-09-21T10:00:00.000Z');

  for (const conceptId of ['derivative-definition', 'definite-integrals', 'complex-numbers', 'bayes', 'nbody-problem']) {
    state = applyExplorationAction(state, { type: 'concept_open', conceptId }, time);
  }
  state = applyExplorationAction(state, { type: 'concept_open', conceptId: 'derivative-definition' }, time);
  state = applyExplorationAction(state, { type: 'atom_open', atomId: 'derivative-limit' }, time);
  state = applyExplorationAction(state, { type: 'atom_open', atomId: 'derivative-absolute-counter' }, time);
  state = applyExplorationAction(state, { type: 'simulation_session', simulationId: 'gravity' }, time);
  state = applyExplorationAction(state, { type: 'simulation_adjustment', simulationId: 'gravity' }, time);

  const metrics = explorationMetrics(state);
  assert.equal(metrics.discoveredConcepts, 5);
  assert.equal(metrics.deepAtoms, 2);
  assert.equal(metrics.returnVisits, 1);
  assert.equal(metrics.simulationSessions, 1);
  assert.equal(metrics.simulationAdjustments, 1);
  assert.ok(metrics.explorationIndex > 0);
  assert.ok(metrics.breadthScore > 0);
  assert.ok(metrics.depthScore > 0);
});

test('normalization drops unknown graph ids and bounds malformed counters', () => {
  const normalized = normalizeExplorationSummary({
    discoveredConceptIds: ['derivative-definition', 'not-real'],
    discoveredAtomIds: ['derivative-limit', 'not-real-atom'],
    conceptVisits: { 'derivative-definition': 2, 'not-real': 999, bayes: -4 },
    simulationSessions: { gravity: 3, ['x'.repeat(200)]: 5 },
    simulationAdjustments: { gravity: Number.POSITIVE_INFINITY },
    daily: {
      '2026-09-21': { actions: 5, newConcepts: 2, newAtoms: 1, revisits: 1, simulations: 1, adjustments: 1 },
      invalid: { actions: 100 },
    },
  });

  assert.deepEqual(normalized.discoveredConceptIds, ['derivative-definition']);
  assert.deepEqual(normalized.discoveredAtomIds, ['derivative-limit']);
  assert.deepEqual(normalized.conceptVisits, { 'derivative-definition': 2 });
  assert.deepEqual(normalized.simulationSessions, { gravity: 3 });
  assert.deepEqual(normalized.simulationAdjustments, {});
  assert.deepEqual(Object.keys(normalized.daily), ['2026-09-21']);
});

test('recent exploration returns a bounded chronological activity window', () => {
  let state = createEmptyExplorationSummary();
  state = applyExplorationAction(state, { type: 'concept_open', conceptId: 'bayes' }, new Date('2026-09-20T08:00:00'));
  state = applyExplorationAction(state, { type: 'simulation_session', simulationId: 'gravity' }, new Date('2026-09-21T08:00:00'));

  const recent = recentExploration(state, 3, new Date('2026-09-21T12:00:00'));
  assert.equal(recent.length, 3);
  assert.equal(recent[0].date, '2026-09-19');
  assert.equal(recent[1].actions, 1);
  assert.equal(recent[2].actions, 1);
});
