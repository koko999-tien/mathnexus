import { SpatialHash3D } from './spatialIndex.ts';

export type LayoutNodeKind = 'domain' | 'concept' | 'atom';
export type LayoutEdgeKind = 'contains' | 'prerequisite' | 'decomposes' | 'depends';

export interface LayoutNode {
  id: string;
  kind: LayoutNodeKind;
  position: [number, number, number];
}

export interface LayoutEdge {
  source: string;
  target: string;
  kind: LayoutEdgeKind;
}

export type PositionMap = Record<string, [number, number, number]>;

interface MutablePoint {
  position: [number, number, number];
}

const DESIRED_EDGE_LENGTH: Record<LayoutEdgeKind, number> = {
  contains: 8.5,
  prerequisite: 11,
  decomposes: 4.4,
  depends: 4.4,
};

export function positionsToMap(nodes: readonly LayoutNode[]): PositionMap {
  return Object.fromEntries(nodes.map(node => [node.id, [...node.position] as [number, number, number]]));
}

export function applyLayoutPositions<T extends LayoutNode>(nodes: readonly T[], positions: Float32Array): T[] {
  if (positions.length !== nodes.length * 3) throw new Error('Cosmos layout position buffer has an invalid length.');

  return nodes.map((node, index) => ({
    ...node,
    position: [
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2],
    ] as [number, number, number],
  }));
}

export function layoutCosmosPositions(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
  previous: PositionMap = {},
): Float32Array {
  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const anchors = nodes.map(node => [...node.position] as [number, number, number]);
  const points: MutablePoint[] = nodes.map(node => ({
    position: previous[node.id] ? [...previous[node.id]] as [number, number, number] : [...node.position] as [number, number, number],
  }));

  const hasPrevious = Object.keys(previous).length > 0;
  const fixed = nodes.map(node => node.kind === 'domain' || (hasPrevious && Boolean(previous[node.id])));
  const movableCount = fixed.filter(value => !value).length;
  const iterations = hasPrevious && movableCount <= 24 ? 30 : 48;
  const repulsionRadius = 13;
  const cellSize = 7.5;

  for (let iteration = 0; iteration < iterations; iteration++) {
    const deltas = Array.from({ length: nodes.length }, () => [0, 0, 0] as [number, number, number]);
    const spatial = new SpatialHash3D(points, cellSize);

    for (let i = 0; i < nodes.length; i++) {
      if (fixed[i]) continue;

      const current = points[i].position;
      const neighbors = spatial.queryRadius(current, repulsionRadius);

      for (const j of neighbors) {
        if (j === i) continue;
        const other = points[j].position;
        const dx = current[0] - other[0];
        const dy = current[1] - other[1];
        const dz = current[2] - other[2];
        const dist2 = dx * dx + dy * dy + dz * dz + 0.7;
        const force = Math.min(0.105, 2.4 / dist2);
        deltas[i][0] += dx * force;
        deltas[i][1] += dy * force;
        deltas[i][2] += dz * force;
      }
    }

    for (const edge of edges) {
      const a = indexById.get(edge.source);
      const b = indexById.get(edge.target);
      if (a == null || b == null) continue;

      const pa = points[a].position;
      const pb = points[b].position;
      const dx = pb[0] - pa[0];
      const dy = pb[1] - pa[1];
      const dz = pb[2] - pa[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const force = (distance - DESIRED_EDGE_LENGTH[edge.kind]) * 0.0048;
      const nx = dx / distance;
      const ny = dy / distance;
      const nz = dz / distance;

      if (!fixed[a]) {
        deltas[a][0] += nx * force;
        deltas[a][1] += ny * force;
        deltas[a][2] += nz * force;
      }
      if (!fixed[b]) {
        deltas[b][0] -= nx * force;
        deltas[b][1] -= ny * force;
        deltas[b][2] -= nz * force;
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      if (fixed[i]) continue;

      const node = nodes[i];
      const anchorStrength = node.kind === 'atom' ? 0.055 : 0.03;
      const delta = deltas[i];
      const current = points[i].position;
      const anchor = anchors[i];

      delta[0] += (anchor[0] - current[0]) * anchorStrength;
      delta[1] += (anchor[1] - current[1]) * anchorStrength;
      delta[2] += (anchor[2] - current[2]) * anchorStrength;

      const maxStep = node.kind === 'atom' ? 0.28 : 0.34;
      const length = Math.hypot(delta[0], delta[1], delta[2]) || 1;
      const factor = Math.min(1, maxStep / length);

      current[0] += delta[0] * factor;
      current[1] += delta[1] * factor;
      current[2] += delta[2] * factor;
    }
  }

  const output = new Float32Array(nodes.length * 3);
  nodes.forEach((_node, index) => {
    const position = points[index].position;
    output[index * 3] = position[0];
    output[index * 3 + 1] = position[1];
    output[index * 3 + 2] = position[2];
  });

  return output;
}
