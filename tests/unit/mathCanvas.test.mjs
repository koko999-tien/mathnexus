import test from 'node:test';
import assert from 'node:assert/strict';
import { screenToWorld, translateObject, zoomViewportAt } from '../../src/canvas/canvasMath.ts';
import {
  clearCanvasState, createEmptyCanvasState, loadCanvasState, normalizeCanvasState, saveCanvasState,
} from '../../src/canvas/canvasStorage.ts';

class MemoryStorage {
  map = new Map();
  writes = 0;

  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); this.writes++; }
  removeItem(key) { this.map.delete(key); }
}

function textObject(index) {
  const time = '2026-09-21T00:00:00.000Z';
  return {
    id: 'text_' + String(index).padStart(3, '0'),
    type: 'text',
    x: index * 10,
    y: index * -4,
    width: 240,
    height: 120,
    text: 'Object ' + index,
    createdAt: time,
    updatedAt: time,
  };
}

test('zooming around the pointer preserves the world coordinate under it', () => {
  const viewport = { x: 120, y: -80, zoom: 1.25 };
  const origin = { x: 20, y: 40 };
  const pointer = { x: 640, y: 360 };
  const before = screenToWorld(pointer, viewport, origin);
  const next = zoomViewportAt(viewport, 2.2, pointer, origin);
  const after = screenToWorld(pointer, next, origin);

  assert.ok(Math.abs(before.x - after.x) < 1e-9);
  assert.ok(Math.abs(before.y - after.y) < 1e-9);
  assert.equal(next.zoom, 2.2);
});

test('translating vector objects moves complete geometry, not only their anchors', () => {
  const time = '2026-09-21T00:00:00.000Z';
  const arrow = {
    id: 'arrow_1', type: 'arrow', x: 10, y: 20, x2: 90, y2: 50,
    width: 80, height: 30, createdAt: time, updatedAt: time,
  };
  const movedArrow = translateObject(arrow, 5, -7);
  assert.deepEqual([movedArrow.x, movedArrow.y, movedArrow.x2, movedArrow.y2], [15, 13, 95, 43]);

  const stroke = {
    id: 'stroke_1', type: 'stroke', x: 0, y: 0, width: 1, height: 1,
    points: [{ x: 0, y: 0 }, { x: 3, y: 4 }],
    createdAt: time, updatedAt: time,
  };
  const movedStroke = translateObject(stroke, -2, 6);
  assert.deepEqual(movedStroke.points, [{ x: -2, y: 6 }, { x: 1, y: 10 }]);
});

test('canvas persistence chunks objects and skips unchanged chunk writes', () => {
  const storage = new MemoryStorage();
  const state = {
    ...createEmptyCanvasState('main'),
    title: 'Deep workspace',
    viewport: { x: 120, y: -40, zoom: 1.5 },
    objects: Array.from({ length: 55 }, (_, index) => textObject(index)),
  };

  const first = saveCanvasState(state, storage);
  assert.equal(first.ok, true);
  assert.equal(first.chunkCount, 3);
  assert.equal(first.changedChunks, 3);

  const writesAfterFirst = storage.writes;
  const second = saveCanvasState(state, storage);
  assert.equal(second.changedChunks, 0);
  assert.equal(storage.writes, writesAfterFirst + 1, 'only metadata should be rewritten');

  const changed = {
    ...state,
    objects: state.objects.map(object => object.id === 'text_030' ? { ...object, text: 'Changed once' } : object),
  };
  const third = saveCanvasState(changed, storage);
  assert.equal(third.changedChunks, 1);

  const loaded = loadCanvasState('main', storage);
  assert.equal(loaded.objects.length, 55);
  assert.equal(loaded.title, 'Deep workspace');
  assert.deepEqual(loaded.viewport, { x: 120, y: -40, zoom: 1.5 });
  assert.equal(loaded.objects.find(object => object.id === 'text_030')?.type, 'text');
  assert.equal(loaded.objects.find(object => object.id === 'text_030')?.text, 'Changed once');

  clearCanvasState('main', storage);
  assert.equal(loadCanvasState('main', storage).objects.length, 0);
});

test('canvas normalization drops malformed objects and bounds unsafe geometry', () => {
  const normalized = normalizeCanvasState({
    canvasId: 'main',
    title: '  ',
    viewport: { x: Infinity, y: 5, zoom: 99 },
    objects: [
      { id: '', type: 'text', text: 'bad' },
      { id: 'bad-type', type: 'script', text: 'bad' },
      { ...textObject(1), width: -20, height: 99999 },
      { id: 'link_1', type: 'link', x: 0, y: 0, width: 200, height: 100, label: 'x', url: 'javascript:alert(1)', createdAt: '', updatedAt: '' },
    ],
  }, 'main');

  assert.equal(normalized.objects.length, 2);
  assert.equal(normalized.viewport.x, 0);
  assert.equal(normalized.viewport.zoom, 4);
  assert.equal(normalized.objects[0].width, 24);
  assert.equal(normalized.objects[0].height, 1200);
  assert.equal(normalized.title, 'Không gian toán học của tôi');
});
