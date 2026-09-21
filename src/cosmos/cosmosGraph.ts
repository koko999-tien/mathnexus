import { MATH_CONCEPTS, MATH_DOMAINS, type MathDomainId } from '../data/mathKnowledge.ts';
import { MATH_ATOMS, ONTOLOGY_KIND_META } from '../data/mathOntology.ts';

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

function relax(nodes: CosmosNode[], edges: CosmosEdge[]) {
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const positions = nodes.map(node => [...node.position] as [number, number, number]);
  const anchors = nodes.map(node => [...node.position] as [number, number, number]);
  const n = nodes.length;
  const stride = n > 360 ? Math.ceil(n / 360) : 1;

  for (let iteration = 0; iteration < 42; iteration++) {
    const delta = Array.from({ length: n }, () => [0, 0, 0] as [number, number, number]);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j += stride) {
        const dx = positions[i][0] - positions[j][0];
        const dy = positions[i][1] - positions[j][1];
        const dz = positions[i][2] - positions[j][2];
        const dist2 = dx * dx + dy * dy + dz * dz + 0.7;
        const force = Math.min(0.09, 2.2 / dist2);
        delta[i][0] += dx * force; delta[i][1] += dy * force; delta[i][2] += dz * force;
        delta[j][0] -= dx * force; delta[j][1] -= dy * force; delta[j][2] -= dz * force;
      }
    }

    for (const edge of edges) {
      const a = index.get(edge.source);
      const b = index.get(edge.target);
      if (a == null || b == null) continue;
      const dx = positions[b][0] - positions[a][0];
      const dy = positions[b][1] - positions[a][1];
      const dz = positions[b][2] - positions[a][2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const desired = edge.kind === 'decomposes' || edge.kind === 'depends' ? 4.4 : edge.kind === 'contains' ? 8.5 : 11;
      const force = (distance - desired) * 0.0045;
      const nx = dx / distance, ny = dy / distance, nz = dz / distance;
      delta[a][0] += nx * force; delta[a][1] += ny * force; delta[a][2] += nz * force;
      delta[b][0] -= nx * force; delta[b][1] -= ny * force; delta[b][2] -= nz * force;
    }

    for (let i = 0; i < n; i++) {
      const anchorStrength = nodes[i].kind === 'domain' ? 0.12 : nodes[i].kind === 'atom' ? 0.045 : 0.028;
      delta[i][0] += (anchors[i][0] - positions[i][0]) * anchorStrength;
      delta[i][1] += (anchors[i][1] - positions[i][1]) * anchorStrength;
      delta[i][2] += (anchors[i][2] - positions[i][2]) * anchorStrength;
      const maxStep = nodes[i].kind === 'domain' ? 0.18 : 0.34;
      const length = Math.hypot(delta[i][0], delta[i][1], delta[i][2]) || 1;
      const factor = Math.min(1, maxStep / length);
      positions[i][0] += delta[i][0] * factor;
      positions[i][1] += delta[i][1] * factor;
      positions[i][2] += delta[i][2] * factor;
    }
  }

  return nodes.map((node, i) => ({ ...node, position: positions[i] }));
}

export function buildCosmosGraph(expandedConceptId?: string | null): CosmosGraphData {
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
        const radius = 2.25 + (index % 3) * 0.42;
        const position = add(parent.position, direction, radius);
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

  const relaxed = relax(nodes, edges);
  return { nodes: relaxed, edges };
}

export function cosmosNodeById(data: CosmosGraphData, id: string | null) {
  return id ? data.nodes.find(node => node.id === id) : undefined;
}

export function cosmosSearch(data: CosmosGraphData, query: string, limit = 8) {
  const normalized = query.trim().toLocaleLowerCase('vi-VI');
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return data.nodes
    .map(node => {
      const haystack = (node.title + ' ' + node.subtitle + ' ' + node.description).toLocaleLowerCase('vi-VI');
      let score = haystack.includes(normalized) ? 50 : 0;
      for (const token of tokens) if (haystack.includes(token)) score += 8;
      if (node.title.toLocaleLowerCase('vi-VI').startsWith(normalized)) score += 30;
      return { node, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title, 'vi'))
    .slice(0, limit)
    .map(item => item.node);
}
