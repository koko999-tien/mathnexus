# Math Cosmos Technical Audit — 2026-09-21

## Scope

Audit of the production MathNexus / Math Cosmos architecture before the worker-layout and shared-retrieval upgrade.

## A. KEEP

### React/Vite route architecture
- **Current:** React 19, TypeScript, Vite, lazy routes.
- **Why keep:** `/cosmos` is already isolated behind `lazy()`, so Three/R3F is not part of the initial route execution path.
- **Risk if rewritten:** high regression risk across PWA, routing and mobile E2E.
- **Testing:** production build, route E2E, offline routes.

### 3D renderer
- **Current:** React-Three-Fiber + Three.js, one `InstancedMesh` for nodes and one batched line geometry for edges.
- **Why keep:** correct draw-call architecture for graph growth.
- **Testing:** Cosmos route, instance picking, mobile viewport.

### Knowledge Graph / Ontology / Mastery
- **Current:** domains -> concepts -> ontology atoms plus evidence-based mastery.
- **Why keep:** this is the canonical knowledge model and must remain the source of truth for Cosmos, retrieval and AI.
- **Risk if duplicated:** divergent concept IDs and contradictory learning paths.
- **Testing:** graph diagnostics, ontology diagnostics, mastery tests.

### Gemini boundary
- **Current:** server-side `/api/gemini`, server-only key, model fallback, timeouts, local fallback.
- **Why keep:** correct security boundary.
- **Testing:** mocked Gemini success/failure, no frontend secret.

## B. HARDEN

### Cosmos quality scaling
- **Current limitation:** fixed DPR, star count and secondary light regardless of device class.
- **Severity:** medium.
- **Change:** mobile/coarse-pointer profile lowers DPR, star count and lighting work.
- **Regression risk:** low.
- **Testing:** mobile E2E and no horizontal overflow.

### Reduced motion
- **Current limitation:** camera respected reduced motion but selection halo and stars still animated.
- **Severity:** medium accessibility issue.
- **Change:** disable star drift and halo animation when reduced motion is requested.
- **Testing:** reduced-motion browser context.

## C. REFACTOR

### Graph layout on main thread
- **Current:** deterministic force relaxation runs synchronously in `buildCosmosGraph`.
- **Limitation:** graph expansion can block the main thread; pair repulsion trends toward quadratic work.
- **Severity:** high for future scaling.
- **Change:** dedicated Web Worker + `Float32Array` position buffers + deterministic synchronous fallback.
- **Spatial memory:** existing nodes are fixed to prior positions when ontology micro-nodes expand.
- **Scaling:** repulsion uses a spatial hash rather than all-pairs comparison.
- **Files:** `src/cosmos/cosmosLayout.ts`, `cosmosLayout.worker.ts`, `useCosmosGraph.ts`, `spatialIndex.ts`.
- **Testing:** deterministic graph test, position-preservation test, E2E worker/fallback route.

### Duplicate retrieval algorithms
- **Current:** global Search/AI use `scoreSearch`; Cosmos had a separate ad-hoc ranking algorithm.
- **Limitation:** identical queries can rank knowledge differently in Search, AI and Cosmos.
- **Severity:** high product-coherence issue.
- **Change:** one reusable deterministic retrieval engine. Knowledge retrieval adds graph-distance boosts without replacing lexical relevance.
- **Files:** `src/utils/retrievalEngine.ts`, `knowledgeSearch.ts`, `cosmosGraph.ts`.
- **Testing:** exact title ranking, natural-language prerequisite query, Cosmos/global consistency.

## D. BUILD NEXT

Not implemented in this change:

1. Barnes-Hut/octree layout for very large graphs.
2. WebGPU simulation engine abstraction.
3. CPU/WebGPU N-body lab.
4. high-precision policy layer around `decimal.js`.
5. Infinite Math Canvas.
6. Socratic tutor strategy layer.
7. backend Neo4j/Qdrant.

These should only be introduced when the local architecture demonstrates a real need.

## Architectural decisions

### Main thread
Owns React UI, accessibility, Three rendering and user interaction.

### Worker
Owns graph layout. It receives serializable nodes/edges and returns a transferable `Float32Array`.

### Fallback
If Worker creation/execution fails, the same deterministic layout engine runs synchronously. Knowledge remains accessible even if 3D infrastructure degrades.

### Spatial index
A reusable uniform 3D hash supports:
- local repulsion during layout;
- camera-radius node disclosure;
- future nearest-node and LOD features.

### Retrieval
One deterministic engine provides lexical scoring. Product-specific layers may add transparent boosts (e.g. prerequisite graph distance) but may not implement unrelated ranking systems.

## Definition of done for this upgrade

- lint passes;
- all unit tests pass;
- TypeScript + Vite build passes;
- E2E passes on Chromium/WebKit/mobile projects;
- `/cosmos` preview deploys;
- Worker failure has fallback;
- reduced-motion path works;
- mobile quality profile works;
- Search/AI/Cosmos retrieval remains deterministic;
- PR merges only after green CI;
- production Vercel route is verified after merge.