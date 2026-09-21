export interface LinearSystemResult {
  kind: 'unique' | 'none' | 'infinite';
  determinant: number;
  x?: number;
  y?: number;
}

export interface Matrix2Inverse {
  determinant: number;
  inverse: [number, number, number, number] | null;
}

export interface StatisticsResult {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  variance: number;
  standardDeviation: number;
  q1: number;
  q3: number;
}

export interface SequenceResult {
  nth: number;
  sum: number;
}

export interface Vector2Result {
  magnitudeA: number;
  magnitudeB: number;
  dot: number;
  determinant: number;
  cosine: number | null;
  angleDegrees: number | null;
}

export interface QuadraticAnalysis {
  discriminant: number;
  axis: number;
  vertexX: number;
  vertexY: number;
  yIntercept: number;
  roots: number[];
  opens: 'up' | 'down';
  extremum: 'min' | 'max';
}

const EPS = 1e-10;

function finite(values: number[]) {
  return values.every(Number.isFinite);
}

function nearZero(value: number, scale = 1) {
  return Math.abs(value) <= EPS * Math.max(1, Math.abs(scale));
}

export function solveLinearSystem2(
  a: number, b: number, e: number,
  c: number, d: number, f: number,
): LinearSystemResult | null {
  if (!finite([a, b, e, c, d, f])) return null;

  const det = a * d - b * c;
  const scale = Math.max(Math.abs(a * d), Math.abs(b * c), 1);

  if (!nearZero(det, scale)) {
    return {
      kind: 'unique',
      determinant: det,
      x: (e * d - b * f) / det,
      y: (a * f - e * c) / det,
    };
  }

  const detX = e * d - b * f;
  const detY = a * f - e * c;
  const consistencyScale = Math.max(
    Math.abs(e * d), Math.abs(b * f),
    Math.abs(a * f), Math.abs(e * c),
    1,
  );

  return {
    kind: nearZero(detX, consistencyScale) && nearZero(detY, consistencyScale) ? 'infinite' : 'none',
    determinant: det,
  };
}

export function invertMatrix2(a: number, b: number, c: number, d: number): Matrix2Inverse | null {
  if (!finite([a, b, c, d])) return null;
  const determinant = a * d - b * c;
  const scale = Math.max(Math.abs(a * d), Math.abs(b * c), 1);
  if (nearZero(determinant, scale)) return { determinant, inverse: null };

  return {
    determinant,
    inverse: [d / determinant, -b / determinant, -c / determinant, a / determinant],
  };
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function descriptiveStatistics(values: number[]): StatisticsResult | null {
  if (!values.length || !finite(values) || values.length > 10000) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  const mean = sum / values.length;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;

  return {
    count: values.length,
    sum,
    mean,
    median: percentile(sorted, 0.5),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    variance,
    standardDeviation: Math.sqrt(variance),
    q1: percentile(sorted, 0.25),
    q3: percentile(sorted, 0.75),
  };
}

export function arithmeticSequence(a1: number, d: number, n: number): SequenceResult | null {
  if (!finite([a1, d, n]) || !Number.isSafeInteger(n) || n < 1 || n > 1_000_000) return null;
  return {
    nth: a1 + (n - 1) * d,
    sum: n * (2 * a1 + (n - 1) * d) / 2,
  };
}

export function geometricSequence(a1: number, q: number, n: number): SequenceResult | null {
  if (!finite([a1, q, n]) || !Number.isSafeInteger(n) || n < 1 || n > 100000) return null;
  const nth = a1 * q ** (n - 1);
  const sum = q === 1 ? a1 * n : a1 * (1 - q ** n) / (1 - q);
  if (!finite([nth, sum])) return null;
  return { nth, sum };
}

export function vector2(ax: number, ay: number, bx: number, by: number): Vector2Result | null {
  if (!finite([ax, ay, bx, by])) return null;
  const magnitudeA = Math.hypot(ax, ay);
  const magnitudeB = Math.hypot(bx, by);
  const dot = ax * bx + ay * by;
  const determinant = ax * by - ay * bx;

  if (magnitudeA === 0 || magnitudeB === 0) {
    return { magnitudeA, magnitudeB, dot, determinant, cosine: null, angleDegrees: null };
  }

  const cosine = Math.min(1, Math.max(-1, dot / (magnitudeA * magnitudeB)));
  return {
    magnitudeA,
    magnitudeB,
    dot,
    determinant,
    cosine,
    angleDegrees: Math.acos(cosine) * 180 / Math.PI,
  };
}

export function quadraticAnalysis(a: number, b: number, c: number): QuadraticAnalysis | null {
  if (!finite([a, b, c]) || a === 0) return null;
  const discriminant = b * b - 4 * a * c;
  const axis = -b / (2 * a);
  const vertexY = a * axis * axis + b * axis + c;
  const roots = discriminant < 0
    ? []
    : discriminant === 0
      ? [axis]
      : [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)].sort((x, y) => x - y);

  return {
    discriminant,
    axis,
    vertexX: axis,
    vertexY,
    yIntercept: c,
    roots,
    opens: a > 0 ? 'up' : 'down',
    extremum: a > 0 ? 'min' : 'max',
  };
}

export function parseNumberList(text: string): number[] | null {
  const parts = text
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);

  if (!parts.length || parts.length > 10000) return null;
  const values = parts.map(Number);
  return finite(values) ? values : null;
}
