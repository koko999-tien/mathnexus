import type { CanvasPoint, CanvasViewport, MathCanvasObject } from './types.ts';

export const MIN_CANVAS_ZOOM = 0.2;
export const MAX_CANVAS_ZOOM = 4;

export function clampCanvasZoom(value: number) {
  return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, value));
}

export function screenToWorld(
  point: CanvasPoint,
  viewport: CanvasViewport,
  origin: CanvasPoint,
): CanvasPoint {
  return {
    x: (point.x - origin.x - viewport.x) / viewport.zoom,
    y: (point.y - origin.y - viewport.y) / viewport.zoom,
  };
}

export function worldToScreen(
  point: CanvasPoint,
  viewport: CanvasViewport,
  origin: CanvasPoint,
): CanvasPoint {
  return {
    x: origin.x + viewport.x + point.x * viewport.zoom,
    y: origin.y + viewport.y + point.y * viewport.zoom,
  };
}

export function zoomViewportAt(
  viewport: CanvasViewport,
  nextZoom: number,
  screenPoint: CanvasPoint,
  origin: CanvasPoint,
): CanvasViewport {
  const zoom = clampCanvasZoom(nextZoom);
  const world = screenToWorld(screenPoint, viewport, origin);
  return {
    x: screenPoint.x - origin.x - world.x * zoom,
    y: screenPoint.y - origin.y - world.y * zoom,
    zoom,
  };
}

export function translateObject<T extends MathCanvasObject>(object: T, dx: number, dy: number): T {
  const moved = {
    ...object,
    x: object.x + dx,
    y: object.y + dy,
    updatedAt: new Date().toISOString(),
  } as T;

  if (object.type === 'arrow') {
    moved.x2 = object.x2 + dx;
    moved.y2 = object.y2 + dy;
  }

  if (object.type === 'stroke') {
    moved.points = object.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
  }

  return moved;
}

export function objectBounds(object: MathCanvasObject) {
  if (object.type === 'stroke') {
    const xs = object.points.map(point => point.x);
    const ys = object.points.map(point => point.y);
    return {
      minX: Math.min(...xs, object.x),
      minY: Math.min(...ys, object.y),
      maxX: Math.max(...xs, object.x),
      maxY: Math.max(...ys, object.y),
    };
  }

  if (object.type === 'arrow') {
    return {
      minX: Math.min(object.x, object.x2),
      minY: Math.min(object.y, object.y2),
      maxX: Math.max(object.x, object.x2),
      maxY: Math.max(object.y, object.y2),
    };
  }

  return {
    minX: object.x,
    minY: object.y,
    maxX: object.x + object.width,
    maxY: object.y + object.height,
  };
}
