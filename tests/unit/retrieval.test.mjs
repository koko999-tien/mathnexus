import test from 'node:test';
import assert from 'node:assert/strict';
import { rankRetrieval } from '../../src/utils/retrievalEngine.ts';
import { searchKnowledge } from '../../src/utils/knowledgeSearch.ts';
import { buildCosmosGraph, cosmosSearch } from '../../src/cosmos/cosmosGraph.ts';

test('shared retrieval engine favors exact mathematical titles deterministically', () => {
  const documents = [
    { id: '1', kind: 'concept', title: 'Đạo hàm', detail: 'Giải tích', keywords: 'derivative', content: 'Tốc độ thay đổi', payload: 'derivative' },
    { id: '2', kind: 'concept', title: 'Tích phân', detail: 'Giải tích', keywords: 'integral', content: 'Diện tích có dấu', payload: 'integral' },
    { id: '3', kind: 'lesson', title: 'Ứng dụng đạo hàm', detail: 'THPT', keywords: 'cực trị', content: 'Tối ưu hóa bằng đạo hàm', payload: 'application' },
  ];

  const ranked = rankRetrieval(documents, 'đạo hàm', { limit: 3 });
  assert.equal(ranked[0].document.id, '1');
  assert.ok(ranked[0].score > ranked[1].score);
  assert.deepEqual(rankRetrieval(documents, 'đạo hàm', { limit: 3 }).map(hit => hit.document.id), ranked.map(hit => hit.document.id));
});

test('global knowledge retrieval uses graph structure without losing direct matches', () => {
  const hits = searchKnowledge('mình yếu đạo hàm nên học gì trước', 10);
  assert.ok(hits.some(hit => hit.to.includes('derivative-definition') || hit.to === '/lesson/der'));
  assert.ok(hits.some(hit => hit.to.includes('limits') || /giới hạn/i.test(hit.title + ' ' + hit.detail)));

  const complex = searchKnowledge('số phức', 8);
  assert.ok(complex.some(hit => hit.to === '/map?concept=complex-numbers'));
  assert.ok(complex.some(hit => hit.to === '/lesson/cplx'));
});

test('Cosmos search uses the same retrieval core as global search', () => {
  const graph = buildCosmosGraph('derivative-definition');
  assert.equal(cosmosSearch(graph, 'Taylor', 5)[0]?.id, 'concept:taylor');
  assert.ok(cosmosSearch(graph, 'tỷ số sai phân', 8).some(node => node.id === 'atom:derivative-limit'));
});
