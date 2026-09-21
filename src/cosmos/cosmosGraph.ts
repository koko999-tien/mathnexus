import { MATH_CONCEPTS, MATH_DOMAINS, type MathDomainId } from '../data/mathKnowledge.ts';
import { MATH_ATOMS, ONTOLOGY_KIND_META } from '../data/mathOntology.ts';
import { rankRetrieval, type RetrievalDocument } from '../utils/retrievalEngine.ts';
import { applyLayoutPositions, layoutCosmosPositions, type PositionMap } from './cosmosLayout.ts';

export type CosmosNodeKind = 'domain' | 'concept' | 'atom';
export type CosmosEdgeKind = 'contains' | 'prerequisite' | 'decomposes' | 'depends';

export interface CosmosNode {
  id: string;
  entityId: string;
  kind: CosmosNodeKind;
  title: string;
  subtitle: string;
  description: string;
  domain: MathDomainId;
  position: [number, number, number];
  radius: number;
  color: string;
  formula?: string;
  href: string;
}

export interface CosmosEdge {
  source: string;
  target: string;
  kind: CosmosEdgeKind;
}

export interface CosmosGraphData {
  nodes: CosmosNode[];
  edges: CosmosEdge[];
}

const DOMAIN_COLORS: Record<MathDomainId, string> = {
  foundations: '#84a9c0',
  algebra: '#a78bfa',
  geometry: '#6dd3a0',
  trigonometry: '#56c7d9',
  calculus: '#f4a261',
  'linear-algebra': '#e76f91',
  'probability-statistics': '#f6c85f',
  discrete: '#8ecae6',
  'number-theory': '#c5a3ff',
  'differential-equations': '#ff8fab',
  'mathematical-physics': '#7dd3fc',
};

function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function unitVector(seed: number): [number, number, number] {
  const a = (seed % 997) / 997 * Math.PI * 2;
  const z = ((Math.floor(seed / 997) % 991) / 990) * 2 - 1;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [Math.cos(a) * r, Math.sin(a) * r, z];
}

function domainCenter(index: number, count: number): [number, number, number] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / Math.max(1, count - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * index;
  return [Math.cos(theta) * r * 31, y * 21, Math.sin(theta) * r * 31];
}

function add(a: [number, number, number], b: [number, number, number], scale = 1): [number, number, number] {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale];
}

function firstFormula(conceptId: string) {
  return MATH_ATOMS.find(atom => atom.conceptId === conceptId && atom.formula)?.formula;
}

export function buildCosmosTopology(expandedConceptId?: string | null): CosmosGraphData {
  const nodes: CosmosNode[] = [];
  const edges: CosmosEdge[] = [];
  const centers = new Map<MathDomainId, [number, number, number]>();

  MATH_DOMAINS.forEach((domain, index) => {
    const position = domainCenter(index, MATH_DOMAINS.length);
    centers.set(domain.id, position);
    nodes.push({
      id: 'domain:' + domain.id,
      entityId: domain.id,
      kind: 'domain',
      title: domain.name,
      subtitle: 'Macro-node · ' + MATH_CONCEPTS.filter(concept => concept.domain === domain.id).length + ' khái niệm',
      description: domain.description,
      domain: domain.id,
      position,
      radius: 1.45,
      color: DOMAIN_COLORS[domain.id],
      href: '/map',
    });
  });

  MATH_CONCEPTS.forEach((concept, index) => {
    const center = centers.get(concept.domain)!;
    const direction = unitVector(hash(concept.id));
    const distance = 5.2 + (index % 4) * 0.75;
    const position = add(center, direction, distance);

    nodes.push({
      id: 'concept:' + concept.id,
      entityId: concept.id,
      kind: 'concept',
      title: concept.title,
      subtitle: concept.level + ' · ' + concept.prerequisites.length + ' tiên quyết',
      description: concept.description,
      domain: concept.domain,
      position,
      radius: 0.68,
      color: DOMAIN_COLORS[concept.domain],
      formula: firstFormula(concept.id),
      href: '/map?concept=' + encodeURIComponent(concept.id),
    });

    edges.push({ source: 'domain:' + concept.domain, target: 'concept:' + concept.id, kind: 'contains' });
    for (const prerequisite of concept.prerequisites) {
      if (MATH_CONCEPTS.some(item => item.id === prerequisite)) {
        edges.push({ source: 'concept:' + prerequisite, target: 'concept:' + concept.id, kind: 'prerequisite' });
      }
    }
  });

  if (expandedConceptId) {
    const parent = nodes.find(node => node.id === 'concept:' + expandedConceptId);
    if (parent) {
      const atoms = MATH_ATOMS.filter(atom => atom.conceptId === expandedConceptId);
      atoms.forEach((atom, index) => {
        const direction = unitVector(hash(atom.id));
        const distance = 2.25 + (index % 3) * 0.42;
        const position = add(parent.position, direction, distance);

        nodes.push({
          id: 'atom:' + atom.id,
          entityId: atom.id,
          kind: 'atom',
          title: atom.title,
          subtitle: ONTOLOGY_KIND_META[atom.kind].label + (atom.difficulty ? ' · ' + atom.difficulty : ''),
          description: atom.summary + (atom.body ? ' ' + atom.body : ''),
          domain: parent.domain,
          position,
          radius: 0.34,
          color: DOMAIN_COLORS[parent.domain],
          formula: atom.formula,
          href: '/map?concept=' + encodeURIComponent(expandedConceptId) + '&atom=' + encodeURIComponent(atom.id),
        });

        edges.push({ source: parent.id, target: 'atom:' + atom.id, kind: 'decomposes' });
        for (const dependency of atom.dependsOn || []) {
          if (atoms.some(item => item.id === dependency)) {
            edges.push({ source: 'atom:' + dependency, target: 'atom:' + atom.id, kind: 'depends' });
          }
        }
      });
    }
  }

  return { nodes, edges };
}

export function buildCosmosGraph(
  expandedConceptId?: string | null,
  previous: PositionMap = {},
): CosmosGraphData {
  const topology = buildCosmosTopology(expandedConceptId);
  const positions = layoutCosmosPositions(topology.nodes, topology.edges, previous);
  return {
    nodes: applyLayoutPositions(topology.nodes, positions),
    edges: topology.edges,
  };
}

export function cosmosNodeById(data: CosmosGraphData, id: string | null) {
  return id ? data.nodes.find(node => node.id === id) : undefined;
}

export function cosmosSearch(data: CosmosGraphData, query: string, limit = 8) {
  const documents: RetrievalDocument<CosmosNode>[] = data.nodes.map(node => ({
    id: node.id,
    kind: node.kind,
    title: node.title,
    detail: node.subtitle,
    keywords: `${node.kind} ${node.domain} ${node.formula || ''}`,
    content: node.description,
    payload: node,
  }));

  return rankRetrieval(documents, query, {
    limit,
    kindWeights: {
      domain: 0.96,
      concept: 1.08,
      atom: 1.04,
    },
  }).map(hit => hit.document.payload);
}
