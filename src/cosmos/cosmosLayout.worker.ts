/// <reference lib="webworker" />

import { layoutCosmosPositions, type LayoutEdge, type LayoutNode, type PositionMap } from './cosmosLayout.ts';

interface LayoutRequest {
  requestId: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  previous: PositionMap;
}

self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { requestId, nodes, edges, previous } = event.data;

  try {
    const startedAt = performance.now();
    const positions = layoutCosmosPositions(nodes, edges, previous);
    const durationMs = performance.now() - startedAt;
    self.postMessage({ requestId, positions, durationMs }, [positions.buffer]);
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : 'Cosmos layout worker failed.',
    });
  }
};
