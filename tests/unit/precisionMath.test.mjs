import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatHighPrecision,
  highPrecisionAdd,
  highPrecisionArithmeticSequence,
  highPrecisionGeometricSequence,
  highPrecisionLinearSystem2,
  highPrecisionMatrix2Inverse,
  highPrecisionPercentage,
  highPrecisionQuadratic,
} from '../../src/utils/precisionMath.ts';
import { getPrecisionPolicy, HIGH_PRECISION_DIGITS } from '../../src/utils/precisionPolicy.ts';
import { solveLinearSystem2 } from '../../src/utils/advancedMath.ts';

test('decimal backend preserves exact decimal arithmetic that Float64 cannot represent exactly', () => {
  assert.equal(formatHighPrecision(highPrecisionAdd('0.1', '0.2')), '0.3');
  const percent = highPrecisionPercentage('0.1', '0.3');
  assert.ok(percent);
  assert.equal(percent.significantDigits, HIGH_PRECISION_DIGITS);
  assert.match(percent.value, /^33\.333333333333333333333333333333333333333333333333/);
});

test('Float64 and Decimal expose different truth boundaries on an ill-conditioned decimal system', () => {
  const standard = solveLinearSystem2(
    Number('1'),
    Number('1'),
    Number('2'),
    Number('1'),
    Number('1.0000000000000000000000001'),
    Number('2.0000000000000000000000001'),
  );

  const precise = highPrecisionLinearSystem2(
    '1',
    '1',
    '2',
    '1',
    '1.0000000000000000000000001',
    '2.0000000000000000000000001',
  );

  // IEEE-754 rounds the 25th-decimal perturbation away, so the standard path
  // sees two identical equations. High Precision keeps the decimal evidence.
  assert.equal(standard?.kind, 'infinite');
  assert.equal(precise?.kind, 'unique');
  assert.equal(precise?.determinant.value, '1e-25');
  assert.equal(precise?.x?.value, '1');
  assert.equal(precise?.y?.value, '1');
});

test('high precision linear algebra separates systems beyond Float64 decimal resolution', () => {
  const result = highPrecisionLinearSystem2(
    '1',
    '1',
    '2',
    '1',
    '1.0000000000000000000000001',
    '2.0000000000000000000000001',
  );

  assert.equal(result?.kind, 'unique');
  assert.equal(result?.determinant.value, '1e-25');
  assert.equal(result?.x?.value, '1');
  assert.equal(result?.y?.value, '1');

  const matrix = highPrecisionMatrix2Inverse('1', '1', '1', '1.0000000000000000000000001');
  assert.equal(matrix?.determinant.value, '1e-25');
  assert.ok(matrix?.inverse);
  assert.equal(matrix?.inverse?.[1].value, '-1e+25');
});

test('high precision quadratic uses stable roots and handles degenerate cases', () => {
  const result = highPrecisionQuadratic('1', '1e20', '1');
  assert.equal(result?.kind, 'two-real');
  assert.equal(result?.roots?.length, 2);
  assert.ok(Number(result?.roots?.[0].value) < -1e19);
  assert.ok(Math.abs(Number(result?.roots?.[1].value) + 1e-20) < 1e-35);

  assert.equal(highPrecisionQuadratic('0', '2', '-4')?.roots?.[0].value, '2');
  assert.equal(highPrecisionQuadratic('0', '0', '0')?.kind, 'infinite');
  assert.equal(highPrecisionQuadratic('1', '0', '1')?.kind, 'complex');
});

test('high precision sequences keep decimal structure across repeated operations', () => {
  const arithmetic = highPrecisionArithmeticSequence('0.1', '0.2', 4);
  assert.equal(arithmetic?.nth.value, '0.7');
  assert.equal(arithmetic?.sum.value, '1.6');

  const geometric = highPrecisionGeometricSequence('0.1', '0.1', 3);
  assert.equal(geometric?.nth.value, '0.001');
  assert.equal(geometric?.sum.value, '0.111');
});

test('precision layer rejects pathological decimal input bounds', () => {
  assert.equal(highPrecisionAdd('1e10001', '1'), null);
  assert.equal(highPrecisionPercentage('1', '0'), null);
  assert.equal(highPrecisionArithmeticSequence('1', '2', 0), null);
  assert.equal(highPrecisionGeometricSequence('1', '2', 100001), null);
});

test('precision policies distinguish visual, standard and high precision truth claims', () => {
  assert.equal(getPrecisionPolicy('visual').exactness, 'visual-approximation');
  assert.equal(getPrecisionPolicy('standard').arithmetic, 'IEEE-754 Float64');
  assert.equal(getPrecisionPolicy('highPrecision').significantDigits, 50);
});
