export interface RootResult {
  value: number;
  iterations: number;
  method: 'newton' | 'bisection';
}

function finiteValue(fn: (x: number) => number, x: number) {
  try {
    const value = fn(x);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function numericalDerivative(fn: (x: number) => number, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  const h = Math.max(1, Math.abs(x)) * 1e-5;
  const fm2 = finiteValue(fn, x - 2 * h);
  const fm1 = finiteValue(fn, x - h);
  const fp1 = finiteValue(fn, x + h);
  const fp2 = finiteValue(fn, x + 2 * h);
  if ([fm2, fm1, fp1, fp2].some(value => value === null)) return null;
  return ((fm2 as number) - 8 * (fm1 as number) + 8 * (fp1 as number) - (fp2 as number)) / (12 * h);
}

export function numericalSecondDerivative(fn: (x: number) => number, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  const h = Math.max(1, Math.abs(x)) * 2e-4;
  const fm = finiteValue(fn, x - h);
  const f0 = finiteValue(fn, x);
  const fp = finiteValue(fn, x + h);
  if ([fm, f0, fp].some(value => value === null)) return null;
  return ((fm as number) - 2 * (f0 as number) + (fp as number)) / (h * h);
}

export function simpsonIntegral(
  fn: (x: number) => number,
  a: number,
  b: number,
  segments = 600,
): number | null {
  if (![a, b, segments].every(Number.isFinite)) return null;
  if (!Number.isSafeInteger(segments) || segments < 2 || segments > 10000) return null;
  if (a === b) return 0;

  const n = segments % 2 === 0 ? segments : segments + 1;
  const h = (b - a) / n;
  const fa = finiteValue(fn, a);
  const fb = finiteValue(fn, b);
  if (fa === null || fb === null) return null;

  let sum = fa + fb;
  for (let i = 1; i < n; i++) {
    const value = finiteValue(fn, a + i * h);
    if (value === null) return null;
    sum += (i % 2 === 0 ? 2 : 4) * value;
  }

  const result = sum * h / 3;
  return Number.isFinite(result) ? result : null;
}

function bisection(
  fn: (x: number) => number,
  left: number,
  right: number,
  maxIterations = 80,
): RootResult | null {
  let fl = finiteValue(fn, left);
  let fr = finiteValue(fn, right);
  if (fl === null || fr === null || fl * fr > 0) return null;
  if (Math.abs(fl) < 1e-12) return { value: left, iterations: 0, method: 'bisection' };
  if (Math.abs(fr) < 1e-12) return { value: right, iterations: 0, method: 'bisection' };

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const middle = (left + right) / 2;
    const fm = finiteValue(fn, middle);
    if (fm === null) return null;

    if (Math.abs(fm) < 1e-11 || Math.abs(right - left) < 1e-10 * Math.max(1, Math.abs(middle))) {
      return { value: middle, iterations: iteration, method: 'bisection' };
    }

    if (fl * fm <= 0) {
      right = middle;
      fr = fm;
    } else {
      left = middle;
      fl = fm;
    }
  }

  return { value: (left + right) / 2, iterations: maxIterations, method: 'bisection' };
}

export function findRootNear(fn: (x: number) => number, initial: number): RootResult | null {
  if (!Number.isFinite(initial)) return null;
  let x = initial;

  for (let iteration = 1; iteration <= 24; iteration++) {
    const fx = finiteValue(fn, x);
    if (fx === null) break;
    if (Math.abs(fx) < 1e-11) return { value: x, iterations: iteration - 1, method: 'newton' };

    const slope = numericalDerivative(fn, x);
    if (slope === null || Math.abs(slope) < 1e-12) break;

    const next = x - fx / slope;
    if (!Number.isFinite(next) || Math.abs(next) > 1e12) break;
    if (Math.abs(next - x) < 1e-11 * Math.max(1, Math.abs(next))) {
      const nextValue = finiteValue(fn, next);
      if (nextValue !== null && Math.abs(nextValue) < 1e-8) {
        return { value: next, iterations: iteration, method: 'newton' };
      }
      break;
    }
    x = next;
  }

  const baseStep = Math.max(0.25, Math.abs(initial) * 0.1);
  for (let scale = 1; scale <= 64; scale *= 2) {
    const radius = baseStep * scale;
    const result = bisection(fn, initial - radius, initial + radius);
    if (result) return result;
  }

  return null;
}

export function tangentLine(fn: (x: number) => number, x: number) {
  const y = finiteValue(fn, x);
  const slope = numericalDerivative(fn, x);
  if (y === null || slope === null) return null;
  return { x, y, slope, intercept: y - slope * x };
}

export function localBehavior(fn: (x: number) => number, x: number) {
  const first = numericalDerivative(fn, x);
  const second = numericalSecondDerivative(fn, x);
  if (first === null) return { first: null, second, trend: 'không xác định', curvature: 'không xác định' };

  const trend = Math.abs(first) < 1e-7 ? 'gần điểm dừng' : first > 0 ? 'đang tăng' : 'đang giảm';
  const curvature = second === null
    ? 'không xác định'
    : Math.abs(second) < 1e-6
      ? 'gần như phẳng'
      : second > 0
        ? 'cong lên'
        : 'cong xuống';

  return { first, second, trend, curvature };
}
