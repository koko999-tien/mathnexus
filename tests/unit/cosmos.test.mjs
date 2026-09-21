import test from 'node:test';
import assert from 'node:assert/strict';
import { MATH_ATOMS } from '../../src/data/mathOntology.ts';
import { MATH_CONCEPTS, MATH_DOMAINS } from '../../src/data/mathKnowledge.ts';
import { buildCosmosGraph, cosmosSearch } from '../../src/cosmos/cosmosGraph.ts';
import { positionsToMap } from '../../src/cosmos/cosmosLayout.ts';
import { SpatialHash3D } from '../../src/cosmos/spatialIndex.ts';

test('Math Cosmos graph is deterministic and contains every macro domain and concept', () => {
  const a = buildCosmosGraph(null);
  const b = buildCosmosGraph(null);

  assert.equal(a.nodes.filter(node => node.kind === 'domain').length, MATH_DOMAINS.length);
  assert.equal(a.nodes.filter(node => node.kind === 'concept').length, MATH_CONCEPTS.length);
  assert.equal(a.nodes.filter(node => node.kind === 'atom').length, 0);
  assert.deepEqual(
    a.nodes.map(node => [node.id, ...node.position.map(value => Number(value.toFixed(6)))]),
    b.nodes.map(node => [node.id, ...node.position.map(value => Number(value.toFixed(6)))]),
  );
});

test('expanding a concept discloses its ontology atoms as micro nodes', () => {
  const conceptId = 'derivative-definition';
  const graph = buildCosmosGraph(conceptId);
  const expectedAtoms = MATH_ATOMS.filter(atom => atom.conceptId === conceptId);

  assert.equal(graph.nodes.filter(node => node.kind === 'atom').length, expectedAtoms.length);
  assert.ok(graph.edges.some(edge => edge.source === 'concept:' + conceptId && edge.kind === 'decomposes'));
  assert.ok(graph.nodes.some(node => node.id === 'atom:derivative-limit'));
});

test('Cosmos search ranks semantic title matches', () => {
  const graph = buildCosmosGraph('derivative-definition');
  const taylor = cosmosSearch(graph, 'Taylor');
  assert.equal(taylor[0]?.id, 'concept:taylor');

  const derivative = cosmosSearch(graph, 'tỷ số sai phân');
  assert.ok(derivative.some(node => node.id === 'atom:derivative-limit'));
});


test('expanding ontology preserves existing spatial memory', () => {
  const base = buildCosmosGraph(null);
  const previous = positionsToMap(base.nodes);
  const expanded = buildCosmosGraph('derivative-definition', previous);

  for (const node of base.nodes) {
    const next = expanded.nodes.find(item => item.id === node.id);
    assert.ok(next, 'existing node should survive expansion: ' + node.id);
    assert.deepEqual(next.position, node.position, 'existing node moved during micro expansion: ' + node.id);
  }
});

test('spatial hash returns nearby nodes without scanning semantic relations', () => {
  const points = [
    { position: [0, 0, 0] },
    { position: [3, 4, 0] },
    { position: [30, 0, 0] },
    { position: [-2, 0, 1] },
  ];
  const index = new SpatialHash3D(points, 5);
  assert.deepEqual(index.queryRadius([0, 0, 0], 5).sort((a, b) => a - b), [0, 1, 3]);
  assert.deepEqual(index.queryRadius([30, 0, 0], 1), [2]);
});
