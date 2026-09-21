import test from 'node:test';
import assert from 'node:assert/strict';
import { MATH_ATOMS } from '../../src/data/mathOntology.ts';
import { MATH_CONCEPTS, MATH_DOMAINS } from '../../src/data/mathKnowledge.ts';
import { buildCosmosGraph, cosmosSearch } from '../../src/cosmos/cosmosGraph.ts';

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
