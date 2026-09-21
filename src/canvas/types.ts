export type CanvasTool = 'select' | 'pan' | 'draw' | 'arrow';

export type CanvasObjectType =
  | 'text'
  | 'latex'
  | 'concept'
  | 'formula'
  | 'simulation'
  | 'link'
  | 'stroke'
  | 'arrow';

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasObjectBase {
  id: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TextCanvasObject extends CanvasObjectBase {
  type: 'text';
  text: string;
}

export interface LatexCanvasObject extends CanvasObjectBase {
  type: 'latex';
  latex: string;
}

export interface ConceptCanvasObject extends CanvasObjectBase {
  type: 'concept';
  conceptId: string;
}

export interface FormulaCanvasObject extends CanvasObjectBase {
  type: 'formula';
  formulaId: string;
}

export interface SimulationCanvasObject extends CanvasObjectBase {
  type: 'simulation';
  simulationId: 'gravity';
}

export interface LinkCanvasObject extends CanvasObjectBase {
  type: 'link';
  label: string;
  url: string;
}

export interface StrokeCanvasObject extends CanvasObjectBase {
  type: 'stroke';
  points: CanvasPoint[];
}

export interface ArrowCanvasObject extends CanvasObjectBase {
  type: 'arrow';
  x2: number;
  y2: number;
  label?: string;
}

export type MathCanvasObject =
  | TextCanvasObject
  | LatexCanvasObject
  | ConceptCanvasObject
  | FormulaCanvasObject
  | SimulationCanvasObject
  | LinkCanvasObject
  | StrokeCanvasObject
  | ArrowCanvasObject;

export interface MathCanvasState {
  version: 1;
  canvasId: string;
  title: string;
  viewport: CanvasViewport;
  objects: MathCanvasObject[];
  updatedAt: string;
}
