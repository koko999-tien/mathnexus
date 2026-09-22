import { MATH_CONCEPTS, MATH_DOMAINS, type MathDomainId } from '../data/mathKnowledge.ts';
import { conceptDepth } from './knowledgeGraph.ts';

export interface KnowledgeMapNodePosition {
  id: string;
  domain: MathDomainId;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KnowledgeMapEdge {
  from: string;
  to: string;
}

export interface KnowledgeMapLayout {
  width: number;
  height: number;
  nodes: KnowledgeMapNodePosition[];
  edges: KnowledgeMapEdge[];
}

const NODE_WIDTH = 168;
const NODE_HEIGHT = 48;
const X_GAP = 72;
const DOMAIN_GAP = 36;
const ROW_GAP = 12;
const PADDING_X = 36;
const PADDING_Y = 38;

export function buildKnowledgeMapLayout(domainFilter: MathDomainId | 'all' = 'all'): KnowledgeMapLayout {
  const concepts = domainFilter === 'all'
    ? MATH_CONCEPTS
    : MATH_CONCEPTS.filter(concept => concept.domain === domainFilter);

  const conceptIds = new Set(concepts.map(concept => concept.id));
  const domainIds = MATH_DOMAINS
    .map(domain => domain.id)
    .filter(domainId => domainFilter === 'all' ? concepts.some(concept => concept.domain === domainId) : domainId === domainFilter);

  const depthById = new Map(concepts.map(concept => [concept.id, conceptDepth(concept.id)]));
  const maxDepth = Math.max(0, ...depthById.values());
  const nodes: KnowledgeMapNodePosition[] = [];

  let cursorY = PADDING_Y;

  for (const domainId of domainIds) {
    const domainConcepts = concepts
      .filter(concept => concept.domain === domainId)
      .sort((a, b) => {
        const depthDelta = (depthById.get(a.id) || 0) - (depthById.get(b.id) || 0);
        return depthDelta || a.title.localeCompare(b.title, 'vi');
      });

    const byDepth = new Map<number, typeof domainConcepts>();
    for (const concept of domainConcepts) {
      const depth = depthById.get(concept.id) || 0;
      const bucket = byDepth.get(depth) || [];
      bucket.push(concept);
      byDepth.set(depth, bucket);
    }

    const rowsInDomain = Math.max(1, ...[...byDepth.values()].map(items => items.length));
    const domainHeight = rowsInDomain * NODE_HEIGHT + Math.max(0, rowsInDomain - 1) * ROW_GAP;

    for (const [depth, items] of byDepth) {
      const blockHeight = items.length * NODE_HEIGHT + Math.max(0, items.length - 1) * ROW_GAP;
      const startY = cursorY + Math.max(0, (domainHeight - blockHeight) / 2);

      items.forEach((concept, index) => {
        nodes.push({
          id: concept.id,
          domain: concept.domain,
          depth,
          x: PADDING_X + depth * (NODE_WIDTH + X_GAP),
          y: startY + index * (NODE_HEIGHT + ROW_GAP),
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        });
      });
    }

    cursorY += domainHeight + DOMAIN_GAP;
  }

  const edges: KnowledgeMapEdge[] = [];
  for (const concept of concepts) {
    for (const prerequisite of concept.prerequisites) {
      if (!conceptIds.has(prerequisite)) continue;
      edges.push({ from: prerequisite, to: concept.id });
    }
  }

  return {
    width: PADDING_X * 2 + (maxDepth + 1) * NODE_WIDTH + maxDepth * X_GAP,
    height: Math.max(280, cursorY - DOMAIN_GAP + PADDING_Y),
    nodes,
    edges,
  };
}
