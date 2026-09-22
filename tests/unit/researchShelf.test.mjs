import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESEARCH_SHELF_KEY,
  buildBibTeX,
  getResearchShelf,
  normalizeResearchShelfItem,
  saveResearchShelf,
  toggleResearchShelfItem,
} from '../../src/utils/researchShelf.ts';

const memory = new Map();
const storage = {
  getItem(key) { return memory.get(key) ?? null; },
  setItem(key, value) { memory.set(key, value); },
};

beforeEach(() => memory.clear());

test('research shelf normalizes and deduplicates external items', () => {
  const paper = normalizeResearchShelfItem({
    kind: 'paper',
    title: '  Algebraic   Topology  ',
    url: 'https://arxiv.org/abs/2609.12345',
    authors: ['Ada Example', '', 'Emmy Example'],
    openAccess: true,
    savedAt: '2026-09-22T00:00:00Z',
  });
  assert.equal(paper?.title, 'Algebraic Topology');
  assert.equal(paper?.authors?.length, 2);
  assert.equal(paper?.openAccess, true);

  saveResearchShelf([paper, { ...paper, id: 'duplicate' }], storage);
  const restored = getResearchShelf(storage);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].url, 'https://arxiv.org/abs/2609.12345');
});

test('toggle adds and removes by canonical URL', () => {
  const item = {
    id: 'paper:1',
    kind: 'paper',
    title: 'A topology paper',
    url: 'https://doi.org/10.1000/example',
    authors: ['Ada Example'],
    source: 'Journal',
    date: '2026-09-20',
    openAccess: false,
  };

  const added = toggleResearchShelfItem([], item);
  assert.equal(added.length, 1);
  const removed = toggleResearchShelfItem(added, item);
  assert.equal(removed.length, 0);
});

test('invalid protocols and corrupted storage are rejected safely', () => {
  assert.equal(normalizeResearchShelfItem({ title: 'x', url: 'javascript:alert(1)' }), null);
  memory.set(RESEARCH_SHELF_KEY, '{bad json');
  assert.deepEqual(getResearchShelf(storage), []);
});

test('BibTeX export contains only saved papers and core metadata', () => {
  const items = [
    normalizeResearchShelfItem({
      kind: 'paper',
      title: 'Algebraic Topology for Data',
      url: 'https://arxiv.org/abs/2609.12345',
      authors: ['Ada Lovelace', 'Emmy Noether'],
      source: 'arXiv',
      date: '2026-09-20',
      savedAt: '2026-09-22T00:00:00Z',
    }),
    normalizeResearchShelfItem({
      kind: 'video',
      title: 'Topology lecture',
      url: 'https://www.youtube.com/watch?v=test',
      savedAt: '2026-09-22T00:00:00Z',
    }),
  ].filter(Boolean);

  const bib = buildBibTeX(items);
  assert.match(bib, /@misc\{/);
  assert.match(bib, /title = \{Algebraic Topology for Data\}/);
  assert.match(bib, /author = \{Ada Lovelace and Emmy Noether\}/);
  assert.match(bib, /year = \{2026\}/);
  assert.doesNotMatch(bib, /Topology lecture/);
});
