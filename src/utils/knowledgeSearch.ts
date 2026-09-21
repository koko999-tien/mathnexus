import { LESSONS } from '../data/lessons.ts';
import { BOOKS } from '../data/books.ts';
import { FORMS } from '../data/formulas.ts';
import { MATH_CONCEPTS, MATH_DOMAINS } from '../data/mathKnowledge.ts';
import { MATH_ATOMS, ONTOLOGY_KIND_META } from '../data/mathOntology.ts';
import { rankRetrieval, type RetrievalDocument } from './retrievalEngine.ts';

export type KnowledgeKind = 'atom' | 'concept' | 'lesson' | 'formula' | 'book';

export interface KnowledgeHit {
  kind: KnowledgeKind;
  type: string;
  title: string;
  detail: string;
  to: string;
  context: string;
  score: number;
}

interface KnowledgeSource {
  kind: KnowledgeKind;
  type: string;
  title: string;
  detail: string;
  to: string;
  context: string;
  conceptId?: string;
  domainId?: string;
}

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const conceptTitle = (id: string) => MATH_CONCEPTS.find(item => item.id === id)?.title || id;
const domainTitle = (id: string) => MATH_DOMAINS.find(item => item.id === id)?.name || id;
const conceptForLesson = (id: string) => MATH_CONCEPTS.find(item => item.lessonIds?.includes(id));
const conceptForFormula = (id: string) => MATH_CONCEPTS.find(item => item.formulaIds?.includes(id));

const KNOWLEDGE: RetrievalDocument<KnowledgeSource>[] = [
  ...MATH_ATOMS.map(item => {
    const concept = MATH_CONCEPTS.find(candidate => candidate.id === item.conceptId);
    const payload: KnowledgeSource = {
      kind: 'atom',
      type: ONTOLOGY_KIND_META[item.kind].label,
      title: item.title,
      detail: `${conceptTitle(item.conceptId)} · ${ONTOLOGY_KIND_META[item.kind].label}`,
      to: `/map?concept=${encodeURIComponent(item.conceptId)}&atom=${encodeURIComponent(item.id)}`,
      conceptId: item.conceptId,
      domainId: concept?.domain,
      context: `[${ONTOLOGY_KIND_META[item.kind].label}] ${item.title} · thuộc ${conceptTitle(item.conceptId)}\n${item.summary}${item.body ? `\n${item.body}` : ''}${item.formula ? `\nBiểu thức: ${item.formula}` : ''}`,
    };
    return {
      id: 'atom:' + item.id,
      kind: payload.kind,
      title: payload.title,
      detail: payload.detail,
      keywords: `${item.tags?.join(' ') || ''} ${item.kind} ${ONTOLOGY_KIND_META[item.kind].label} ${conceptTitle(item.conceptId)}`,
      content: `${item.summary} ${item.body || ''} ${item.formula || ''}`,
      payload,
    };
  }),
  ...MATH_CONCEPTS.map(item => {
    const payload: KnowledgeSource = {
      kind: 'concept',
      type: 'Khái niệm',
      title: item.title,
      detail: `${domainTitle(item.domain)} · ${item.level}`,
      to: `/map?concept=${encodeURIComponent(item.id)}`,
      conceptId: item.id,
      domainId: item.domain,
      context: `[Khái niệm] ${item.title} (${domainTitle(item.domain)} · ${item.level})\nMô tả: ${item.description}\nTiên quyết trực tiếp: ${item.prerequisites.length ? item.prerequisites.map(conceptTitle).join(', ') : 'Không có'}\nKhái niệm này nằm trong Knowledge Graph và có thể dùng để xác định lộ trình học.`,
    };
    return {
      id: 'concept:' + item.id,
      kind: payload.kind,
      title: payload.title,
      detail: payload.detail,
      keywords: `${item.tags.join(' ')} ${domainTitle(item.domain)} tiên quyết prerequisite khái niệm`,
      content: `${item.description} ${item.prerequisites.map(conceptTitle).join(' ')}`,
      payload,
    };
  }),
  ...LESSONS.map(item => {
    const concept = conceptForLesson(item.id);
    const payload: KnowledgeSource = {
      kind: 'lesson',
      type: 'Bài học',
      title: item.t,
      detail: `${item.lv} · ${item.cat}`,
      to: `/lesson/${item.id}`,
      conceptId: concept?.id,
      domainId: concept?.domain,
      context: `[Bài học] ${item.t} (${item.lv} · ${item.cat})\n${stripHtml(item.txt).slice(0, 2400)}`,
    };
    return {
      id: 'lesson:' + item.id,
      kind: payload.kind,
      title: payload.title,
      detail: payload.detail,
      keywords: `${item.cat} ${item.lv} nền tảng kiến thức bài học ${concept?.tags.join(' ') || ''}`,
      content: stripHtml(item.txt),
      payload,
    };
  }),
  ...FORMS.map(item => {
    const concept = conceptForFormula(item.id);
    const payload: KnowledgeSource = {
      kind: 'formula',
      type: 'Công thức',
      title: item.name,
      detail: item.cat,
      to: `/formula/${item.id}`,
      conceptId: concept?.id,
      domainId: concept?.domain,
      context: `[Công thức] ${item.name} (${item.cat})\nBiểu thức: ${item.expr}\nÝ nghĩa: ${item.what}\nVì sao cần biết: ${item.why}\nVí dụ: ${item.ex}`,
    };
    return {
      id: 'formula:' + item.id,
      kind: payload.kind,
      title: payload.title,
      detail: payload.detail,
      keywords: `${item.q.join(' ')} ${item.cat} công thức ${concept?.tags.join(' ') || ''}`,
      content: `${item.what} ${item.why} ${item.use} ${item.ex} ${item.expr}`,
      payload,
    };
  }),
  ...BOOKS.map(item => {
    const payload: KnowledgeSource = {
      kind: 'book',
      type: 'Sách',
      title: item.t,
      detail: item.lv,
      to: `/book/${item.id}`,
      context: `[Sách] ${item.t} (${item.lv})\nLý do nên đọc: ${item.why}\nÝ tưởng chính: ${item.ideas}`,
    };
    return {
      id: 'book:' + item.id,
      kind: payload.kind,
      title: payload.title,
      detail: payload.detail,
      keywords: `${item.lv} sách giáo trình đọc tham khảo`,
      content: `${item.why} ${item.ideas}`,
      payload,
    };
  }),
];

const CONCEPT_DOCUMENTS = KNOWLEDGE.filter(document => document.kind === 'concept');

function graphDistances(anchorIds: string[], maxDepth = 2) {
  const adjacency = new Map<string, Set<string>>();
  for (const concept of MATH_CONCEPTS) {
    if (!adjacency.has(concept.id)) adjacency.set(concept.id, new Set());
    for (const prerequisite of concept.prerequisites) {
      if (!adjacency.has(prerequisite)) adjacency.set(prerequisite, new Set());
      adjacency.get(concept.id)!.add(prerequisite);
      adjacency.get(prerequisite)!.add(concept.id);
    }
  }

  const distance = new Map<string, number>();
  let frontier = [...anchorIds];
  frontier.forEach(id => distance.set(id, 0));

  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) || []) {
        if (distance.has(neighbor)) continue;
        distance.set(neighbor, depth);
        next.push(neighbor);
      }
    }
    frontier = next;
  }

  return distance;
}

function retrievalContext(query: string) {
  const anchors = rankRetrieval(CONCEPT_DOCUMENTS, query, {
    limit: 3,
    kindWeights: { concept: 1.08 },
  }).filter(hit => hit.lexicalScore >= 20);

  const anchorIds = anchors.map(hit => hit.document.payload.conceptId).filter((id): id is string => Boolean(id));
  const distances = graphDistances(anchorIds);
  const domains = new Set(
    anchorIds
      .map(id => MATH_CONCEPTS.find(concept => concept.id === id)?.domain)
      .filter((domain): domain is string => Boolean(domain)),
  );

  return { distances, domains };
}

export function searchKnowledge(query: string, limit = 12): KnowledgeHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { distances, domains } = retrievalContext(trimmed);

  return rankRetrieval(KNOWLEDGE, trimmed, {
    limit: Math.max(1, limit),
    kindWeights: {
      concept: 1.08,
      atom: 1.04,
      lesson: 1,
      formula: 1,
      book: 0.94,
    },
    scoreAdjust(document) {
      const conceptId = document.payload.conceptId;
      if (!conceptId) return 0;
      const distance = distances.get(conceptId);
      if (distance === 0) return 34;
      if (distance === 1) return 17;
      if (distance === 2) return 7;
      return document.payload.domainId && domains.has(document.payload.domainId) ? 3 : 0;
    },
  }).map(hit => ({
    kind: hit.document.payload.kind,
    type: hit.document.payload.type,
    title: hit.document.payload.title,
    detail: hit.document.payload.detail,
    to: hit.document.payload.to,
    context: hit.document.payload.context,
    score: hit.score,
  }));
}

export function buildKnowledgeContext(query: string, limit = 5) {
  const ranked = searchKnowledge(query, 24);
  const counts: Record<KnowledgeKind, number> = { atom: 0, concept: 0, lesson: 0, formula: 0, book: 0 };
  const selected: KnowledgeHit[] = [];

  for (const item of ranked) {
    const cap = item.kind === 'atom' ? 3 : 2;
    if (counts[item.kind] >= cap) continue;
    selected.push(item);
    counts[item.kind] += 1;
    if (selected.length >= limit) break;
  }

  const context = selected
    .map((item, index) => `Nguồn MathNexus ${index + 1}:\n${item.context}`)
    .join('\n\n')
    .slice(0, 10000);

  return {
    text: context,
    hits: selected,
    links: selected.map(item => ({ to: item.to, label: item.title })),
  };
}

export function knowledgeCorpusSize() {
  return KNOWLEDGE.length;
}
