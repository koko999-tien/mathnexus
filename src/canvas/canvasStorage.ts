import type { CanvasObjectType, CanvasViewport, MathCanvasObject, MathCanvasState } from './types.ts';

const PREFIX = 'mathnexus_canvas_v1_';
const DEFAULT_CANVAS_ID = 'main';
const CHUNK_SIZE = 24;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface CanvasMeta {
  version: 1;
  canvasId: string;
  title: string;
  viewport: CanvasViewport;
  chunkCount: number;
  chunkHashes: string[];
  updatedAt: string;
}

function storageOrNull(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function metaKey(canvasId: string) {
  return `${PREFIX}${canvasId}_meta`;
}

function chunkKey(canvasId: string, index: number) {
  return `${PREFIX}${canvasId}_chunk_${index}`;
}

function finite(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function text(value: unknown, fallback = '', max = 10000) {
  return typeof value === 'string' ? value.slice(0, max) : fallback;
}

function validType(value: unknown): value is CanvasObjectType {
  return ['text', 'latex', 'concept', 'formula', 'simulation', 'link', 'stroke', 'arrow'].includes(String(value));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createStableId(prefix = 'obj') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyCanvasState(canvasId = DEFAULT_CANVAS_ID): MathCanvasState {
  return {
    version: 1,
    canvasId,
    title: 'Không gian toán học của tôi',
    viewport: { x: 0, y: 0, zoom: 1 },
    objects: [],
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeCanvasObject(value: unknown): MathCanvasObject | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !raw.id || !validType(raw.type)) return null;

  const base = {
    id: raw.id.slice(0, 140),
    type: raw.type,
    x: finite(raw.x),
    y: finite(raw.y),
    width: Math.max(24, Math.min(1600, finite(raw.width, 260))),
    height: Math.max(24, Math.min(1200, finite(raw.height, 150))),
    groupId: typeof raw.groupId === 'string' && raw.groupId ? raw.groupId.slice(0, 140) : undefined,
    createdAt: text(raw.createdAt, new Date().toISOString(), 60),
    updatedAt: text(raw.updatedAt, new Date().toISOString(), 60),
  };

  if (raw.type === 'text') {
    return { ...base, type: 'text', text: text(raw.text, '', 24000) };
  }
  if (raw.type === 'latex') {
    return { ...base, type: 'latex', latex: text(raw.latex, 'x^2', 12000) };
  }
  if (raw.type === 'concept') {
    return { ...base, type: 'concept', conceptId: text(raw.conceptId, '', 140) };
  }
  if (raw.type === 'formula') {
    return { ...base, type: 'formula', formulaId: text(raw.formulaId, '', 140) };
  }
  if (raw.type === 'simulation') {
    return { ...base, type: 'simulation', simulationId: 'gravity' };
  }
  if (raw.type === 'link') {
    return {
      ...base,
      type: 'link',
      label: text(raw.label, 'Liên kết', 300),
      url: text(raw.url, '', 2000),
    };
  }
  if (raw.type === 'stroke') {
    const points = Array.isArray(raw.points)
      ? raw.points
          .filter(point => point && typeof point === 'object')
          .slice(0, 6000)
          .map(point => {
            const item = point as Record<string, unknown>;
            return { x: finite(item.x), y: finite(item.y) };
          })
      : [];
    return { ...base, type: 'stroke', points };
  }

  return {
    ...base,
    type: 'arrow',
    x2: finite(raw.x2, base.x + 180),
    y2: finite(raw.y2, base.y),
    label: text(raw.label, '', 300) || undefined,
  };
}

export function normalizeCanvasState(value: unknown, canvasId = DEFAULT_CANVAS_ID): MathCanvasState {
  const fallback = createEmptyCanvasState(canvasId);
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<MathCanvasState>;

  const viewport = raw.viewport && typeof raw.viewport === 'object'
    ? {
        x: finite(raw.viewport.x),
        y: finite(raw.viewport.y),
        zoom: Math.max(0.2, Math.min(4, finite(raw.viewport.zoom, 1))),
      }
    : fallback.viewport;

  const objects = Array.isArray(raw.objects)
    ? raw.objects.map(normalizeCanvasObject).filter((item): item is MathCanvasObject => Boolean(item))
    : [];

  const unique = new Map<string, MathCanvasObject>();
  for (const object of objects) unique.set(object.id, object);

  return {
    version: 1,
    canvasId: typeof raw.canvasId === 'string' && raw.canvasId ? raw.canvasId.slice(0, 100) : canvasId,
    title: text(raw.title, fallback.title, 160).trim() || fallback.title,
    viewport,
    objects: [...unique.values()],
    updatedAt: text(raw.updatedAt, fallback.updatedAt, 60),
  };
}

export function loadCanvasState(canvasId = DEFAULT_CANVAS_ID, storage?: StorageLike): MathCanvasState {
  const target = storageOrNull(storage);
  if (!target) return createEmptyCanvasState(canvasId);

  try {
    const rawMeta = target.getItem(metaKey(canvasId));
    if (!rawMeta) return createEmptyCanvasState(canvasId);
    const parsedMeta = JSON.parse(rawMeta) as Partial<CanvasMeta>;
    const chunkCount = Math.max(0, Math.min(1000, Number.isInteger(parsedMeta.chunkCount) ? Number(parsedMeta.chunkCount) : 0));

    const objects: unknown[] = [];
    for (let index = 0; index < chunkCount; index++) {
      const rawChunk = target.getItem(chunkKey(canvasId, index));
      if (!rawChunk) continue;
      const parsed = JSON.parse(rawChunk);
      if (Array.isArray(parsed)) objects.push(...parsed);
    }

    return normalizeCanvasState({
      version: 1,
      canvasId,
      title: parsedMeta.title,
      viewport: parsedMeta.viewport,
      objects,
      updatedAt: parsedMeta.updatedAt,
    }, canvasId);
  } catch {
    return createEmptyCanvasState(canvasId);
  }
}

export function saveCanvasState(state: MathCanvasState, storage?: StorageLike) {
  const target = storageOrNull(storage);
  if (!target) return { ok: false, changedChunks: 0, chunkCount: 0 };

  const normalized = normalizeCanvasState(state, state.canvasId);
  const orderedObjects = [...normalized.objects].sort((a, b) => a.id.localeCompare(b.id));
  const chunks: string[] = [];

  for (let index = 0; index < orderedObjects.length; index += CHUNK_SIZE) {
    chunks.push(JSON.stringify(orderedObjects.slice(index, index + CHUNK_SIZE)));
  }

  let previousMeta: Partial<CanvasMeta> = {};
  try {
    const raw = target.getItem(metaKey(normalized.canvasId));
    previousMeta = raw ? JSON.parse(raw) : {};
  } catch {
    previousMeta = {};
  }

  let changedChunks = 0;
  const hashes = chunks.map(hashString);

  try {
    for (let index = 0; index < chunks.length; index++) {
      if (previousMeta.chunkHashes?.[index] === hashes[index]) continue;
      target.setItem(chunkKey(normalized.canvasId, index), chunks[index]);
      changedChunks++;
    }

    const oldChunkCount = Math.max(0, Number(previousMeta.chunkCount) || 0);
    for (let index = chunks.length; index < oldChunkCount; index++) {
      target.removeItem(chunkKey(normalized.canvasId, index));
    }

    const meta: CanvasMeta = {
      version: 1,
      canvasId: normalized.canvasId,
      title: normalized.title,
      viewport: normalized.viewport,
      chunkCount: chunks.length,
      chunkHashes: hashes,
      updatedAt: normalized.updatedAt,
    };
    target.setItem(metaKey(normalized.canvasId), JSON.stringify(meta));

    if (typeof window !== 'undefined') window.dispatchEvent(new Event('mathnexus:canvas-storage'));

    return { ok: true, changedChunks, chunkCount: chunks.length };
  } catch {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('mathnexus:storage-error'));
    return { ok: false, changedChunks, chunkCount: chunks.length };
  }
}

export function clearCanvasState(canvasId = DEFAULT_CANVAS_ID, storage?: StorageLike) {
  const target = storageOrNull(storage);
  if (!target) return;

  try {
    const raw = target.getItem(metaKey(canvasId));
    const meta = raw ? JSON.parse(raw) as Partial<CanvasMeta> : {};
    const chunkCount = Math.max(0, Number(meta.chunkCount) || 0);
    for (let index = 0; index < chunkCount; index++) target.removeItem(chunkKey(canvasId, index));
    target.removeItem(metaKey(canvasId));
  } catch {
    // Canvas reset is best-effort.
  }
}
