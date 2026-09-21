import { useEffect, useMemo, useRef, useState } from 'react';
import { applyLayoutPositions, layoutCosmosPositions, positionsToMap, type PositionMap } from './cosmosLayout';
import { buildCosmosTopology, type CosmosGraphData } from './cosmosGraph';

export type CosmosLayoutMode = 'pending' | 'worker' | 'fallback';

interface WorkerResult {
  requestId: number;
  positions?: Float32Array;
  error?: string;
}

function alignNewAtomsToPreviousParent(graph: CosmosGraphData, previous: PositionMap): CosmosGraphData {
  if (!Object.keys(previous).length) return graph;

  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const nodes = graph.nodes.map(node => {
    if (node.kind !== 'atom' || previous[node.id]) return node;

    const parentEdge = graph.edges.find(edge => edge.kind === 'decomposes' && edge.target === node.id);
    if (!parentEdge) return node;

    const parent = nodeById.get(parentEdge.source);
    const previousParent = previous[parentEdge.source];
    if (!parent || !previousParent) return node;

    const dx = previousParent[0] - parent.position[0];
    const dy = previousParent[1] - parent.position[1];
    const dz = previousParent[2] - parent.position[2];

    return {
      ...node,
      position: [
        node.position[0] + dx,
        node.position[1] + dy,
        node.position[2] + dz,
      ] as [number, number, number],
    };
  });

  return { nodes, edges: graph.edges };
}

export function useCosmosGraph(expandedConceptId?: string | null) {
  const requestRef = useRef(0);
  const previousRef = useRef<PositionMap>({});

  const topology = useMemo(
    () => alignNewAtomsToPreviousParent(buildCosmosTopology(expandedConceptId), previousRef.current),
    [expandedConceptId],
  );

  const [data, setData] = useState<CosmosGraphData>(topology);
  const [mode, setMode] = useState<CosmosLayoutMode>('pending');

  useEffect(() => {
    const requestId = ++requestRef.current;
    const previous = previousRef.current;
    setData(topology);
    setMode('pending');

    const commit = (positions: Float32Array, nextMode: CosmosLayoutMode) => {
      if (requestRef.current !== requestId) return;
      const nodes = applyLayoutPositions(topology.nodes, positions);
      previousRef.current = positionsToMap(nodes);
      setData({ nodes, edges: topology.edges });
      setMode(nextMode);
    };

    const fallback = () => {
      try {
        commit(layoutCosmosPositions(topology.nodes, topology.edges, previous), 'fallback');
      } catch {
        setData(topology);
        setMode('fallback');
      }
    };

    if (typeof Worker === 'undefined') {
      fallback();
      return;
    }

    let worker: Worker;
    try {
      worker = new Worker(new URL('./cosmosLayout.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      fallback();
      return;
    }

    const timer = window.setTimeout(() => {
      worker.terminate();
      fallback();
    }, 5000);

    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      if (event.data.requestId !== requestId) return;
      window.clearTimeout(timer);
      worker.terminate();

      if (event.data.error || !(event.data.positions instanceof Float32Array)) {
        fallback();
        return;
      }

      commit(event.data.positions, 'worker');
    };

    worker.onerror = () => {
      window.clearTimeout(timer);
      worker.terminate();
      fallback();
    };

    worker.postMessage({
      requestId,
      nodes: topology.nodes.map(node => ({ id: node.id, kind: node.kind, position: node.position })),
      edges: topology.edges,
      previous,
    });

    return () => {
      window.clearTimeout(timer);
      worker.terminate();
    };
  }, [topology]);

  return { data, mode };
}
