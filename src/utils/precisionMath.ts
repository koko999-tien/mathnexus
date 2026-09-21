import Decimal from 'decimal.js';
import { HIGH_PRECISION_DIGITS } from './precisionPolicy.ts';

export type DecimalInput = string | number;

export interface HighPrecisionValue {
  value: string;
  significantDigits: number;
}

export interface HighPrecisionQuadraticResult {
  kind: 'linear' | 'infinite' | 'none' | 'double' | 'two-real' | 'complex';
  discriminant?: HighPrecisionValue;
  roots?: HighPrecisionValue[];
}

export interface HighPrecisionLinearSystemResult {
  kind: 'unique' | 'none' | 'infinite';
  determinant: HighPrecisionValue;
  x?: HighPrecisionValue;
  y?: HighPrecisionValue;
}

export interface HighPrecisionMatrix2Result {
  determinant: HighPrecisionValue;
  inverse: [HighPrecisionValue, HighPrecisionValue, HighPrecisionValue, HighPrecisionValue] | null;
}

export interface HighPrecisionSequenceResult {
  nth: HighPrecisionValue;
  sum: HighPrecisionValue;
}

const MAX_INPUT_LENGTH = 220;
const MAX_EXPONENT = 10000;

function decimalConstructor(significantDigits = HIGH_PRECISION_DIGITS) {
  const precision = Math.max(20, Math.min(100, Math.trunc(significantDigits)));
  return Decimal.clone({
    precision,
    rounding: Decimal.ROUND_HALF_EVEN,
    toExpNeg: -20,
    toExpPos: 20,
  });
}

function normalizeDecimalInput(input: DecimalInput): string | null {
  const raw = String(input).trim();
  if (!raw || raw.length > MAX_INPUT_LENGTH) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) return null;

  const exponentMatch = raw.match(/[eE]([+-]?\d+)$/);
  if (exponentMatch && Math.abs(Number(exponentMatch[1])) > MAX_EXPONENT) return null;
  return raw;
}

function parseWith(D: typeof Decimal, input: DecimalInput) {
  const normalized = normalizeDecimalInput(input);
  if (normalized === null) return null;
  try {
    const value = new D(normalized);
    return value.isFinite() ? value : null;
  } catch {
    return null;
  }
}

function out(value: Decimal, significantDigits: number): HighPrecisionValue {
  const normalized = value.toSignificantDigits(significantDigits, Decimal.ROUND_HALF_EVEN);
  return {
    value: normalized.toString(),
    significantDigits,
  };
}

export function highPrecisionAdd(a: DecimalInput, b: DecimalInput, significantDigits = HIGH_PRECISION_DIGITS) {
  const D = decimalConstructor(significantDigits);
  const left = parseWith(D, a);
  const right = parseWith(D, b);
  if (!left || !right) return null;
  return out(left.plus(right), significantDigits);
}

export function highPrecisionPercentage(part: DecimalInput, whole: DecimalInput, significantDigits = HIGH_PRECISION_DIGITS) {
  const D = decimalConstructor(significantDigits);
  const a = parseWith(D, part);
  const b = parseWith(D, whole);
  if (!a || !b || b.isZero()) return null;
  return out(a.div(b).times(100), significantDigits);
}

export function highPrecisionQuadratic(
  aInput: DecimalInput,
  bInput: DecimalInput,
  cInput: DecimalInput,
  significantDigits = HIGH_PRECISION_DIGITS,
): HighPrecisionQuadraticResult | null {
  const D = decimalConstructor(significantDigits);
  const a = parseWith(D, aInput);
  const b = parseWith(D, bInput);
  const c = parseWith(D, cInput);
  if (!a || !b || !c) return null;

  if (a.isZero()) {
    if (b.isZero()) return { kind: c.isZero() ? 'infinite' : 'none' };
    return { kind: 'linear', roots: [out(c.neg().div(b), significantDigits)] };
  }

  const discriminant = b.times(b).minus(a.times(c).times(4));
  const discriminantOut = out(discriminant, significantDigits);
  const comparison = discriminant.comparedTo(0);

  if (comparison < 0) return { kind: 'complex', discriminant: discriminantOut };

  if (comparison === 0) {
    return {
      kind: 'double',
      discriminant: discriminantOut,
      roots: [out(b.neg().div(a.times(2)), significantDigits)],
    };
  }

  const rootDiscriminant = discriminant.sqrt();
  const signedRoot = b.isNegative() ? rootDiscriminant.neg() : rootDiscriminant;
  const q = b.plus(signedRoot).times(-0.5);
  const first = q.div(a);
  const second = c.div(q);
  const roots = first.comparedTo(second) <= 0 ? [first, second] : [second, first];

  return {
    kind: 'two-real',
    discriminant: discriminantOut,
    roots: roots.map(value => out(value, significantDigits)),
  };
}

export function highPrecisionLinearSystem2(
  aInput: DecimalInput,
  bInput: DecimalInput,
  eInput: DecimalInput,
  cInput: DecimalInput,
  dInput: DecimalInput,
  fInput: DecimalInput,
  significantDigits = HIGH_PRECISION_DIGITS,
): HighPrecisionLinearSystemResult | null {
  const D = decimalConstructor(significantDigits);
  const values = [aInput, bInput, eInput, cInput, dInput, fInput].map(value => parseWith(D, value));
  if (values.some(value => value === null)) return null;
  const [a, b, e, c, d, f] = values as Decimal[];

  const determinant = a.times(d).minus(b.times(c));
  const determinantOut = out(determinant, significantDigits);

  if (!determinant.isZero()) {
    return {
      kind: 'unique',
      determinant: determinantOut,
      x: out(e.times(d).minus(b.times(f)).div(determinant), significantDigits),
      y: out(a.times(f).minus(e.times(c)).div(determinant), significantDigits),
    };
  }

  const detX = e.times(d).minus(b.times(f));
  const detY = a.times(f).minus(e.times(c));
  return {
    kind: detX.isZero() && detY.isZero() ? 'infinite' : 'none',
    determinant: determinantOut,
  };
}

export function highPrecisionMatrix2Inverse(
  aInput: DecimalInput,
  bInput: DecimalInput,
  cInput: DecimalInput,
  dInput: DecimalInput,
  significantDigits = HIGH_PRECISION_DIGITS,
): HighPrecisionMatrix2Result | null {
  const D = decimalConstructor(significantDigits);
  const values = [aInput, bInput, cInput, dInput].map(value => parseWith(D, value));
  if (values.some(value => value === null)) return null;
  const [a, b, c, d] = values as Decimal[];

  const determinant = a.times(d).minus(b.times(c));
  const determinantOut = out(determinant, significantDigits);
  if (determinant.isZero()) return { determinant: determinantOut, inverse: null };

  return {
    determinant: determinantOut,
    inverse: [
      out(d.div(determinant), significantDigits),
      out(b.neg().div(determinant), significantDigits),
      out(c.neg().div(determinant), significantDigits),
      out(a.div(determinant), significantDigits),
    ],
  };
}

export function highPrecisionArithmeticSequence(
  a1Input: DecimalInput,
  dInput: DecimalInput,
  n: number,
  significantDigits = HIGH_PRECISION_DIGITS,
): HighPrecisionSequenceResult | null {
  if (!Number.isSafeInteger(n) || n < 1 || n > 1_000_000) return null;
  const D = decimalConstructor(significantDigits);
  const a1 = parseWith(D, a1Input);
  const d = parseWith(D, dInput);
  if (!a1 || !d) return null;

  const nDecimal = new D(n);
  const nth = a1.plus(d.times(n - 1));
  const sum = nDecimal.times(a1.times(2).plus(d.times(n - 1))).div(2);
  return { nth: out(nth, significantDigits), sum: out(sum, significantDigits) };
}

export function highPrecisionGeometricSequence(
  a1Input: DecimalInput,
  qInput: DecimalInput,
  n: number,
  significantDigits = HIGH_PRECISION_DIGITS,
): HighPrecisionSequenceResult | null {
  if (!Number.isSafeInteger(n) || n < 1 || n > 100000) return null;
  const D = decimalConstructor(significantDigits);
  const a1 = parseWith(D, a1Input);
  const q = parseWith(D, qInput);
  if (!a1 || !q) return null;

  try {
    const nth = a1.times(q.pow(n - 1));
    const sum = q.eq(1)
      ? a1.times(n)
      : a1.times(new D(1).minus(q.pow(n))).div(new D(1).minus(q));

    if (!nth.isFinite() || !sum.isFinite()) return null;
    return { nth: out(nth, significantDigits), sum: out(sum, significantDigits) };
  } catch {
    return null;
  }
}

export function formatHighPrecision(value: HighPrecisionValue | undefined | null) {
  if (!value) return '—';
  return value.value;
}
