import test from 'node:test';
import assert from 'node:assert/strict';
import { gcd, lcm, isPrime, factorial, nCr, nPr, solveQuadratic, renderMath } from '../../src/utils/math.ts';
import { arithmeticSequence, descriptiveStatistics, geometricSequence, invertMatrix2, parseNumberList, quadraticAnalysis, solveLinearSystem2, vector2 } from '../../src/utils/advancedMath.ts';

test('integer tools handle zero, negatives and invalid inputs without hanging', () => {
  assert.equal(gcd(-48, 18), 6);
  assert.equal(gcd(0, 0), 0);
  assert.equal(lcm(0, 0), 0);
  assert.equal(lcm(-12, 18), 36);
  assert.ok(Number.isNaN(gcd(Infinity, 5)));
  assert.ok(Number.isNaN(gcd(2.5, 5)));
  assert.ok(Number.isNaN(lcm(Number.MAX_SAFE_INTEGER, 2)));
});

test('prime and combinatorics tools enforce bounded, integer domains', () => {
  assert.equal(isPrime(97), true);
  assert.equal(isPrime(1), false);
  assert.equal(isPrime(2.5), false);
  assert.equal(isPrime(Infinity), false);
  assert.equal(nCr(5, 2), 10);
  assert.equal(nCr(20, 17), 1140);
  assert.equal(nPr(5, 2), 20);
  assert.equal(factorial(0), 1);
  assert.ok(Number.isNaN(nCr(1e9, 5)));
  assert.ok(Number.isNaN(nPr(5.5, 2)));
  assert.ok(Number.isNaN(factorial(Infinity)));
});

test('quadratic solver handles degenerate and extreme coefficients', () => {
  assert.match(solveQuadratic(1, -5, 6), /x₁ = 2, x₂ = 3/);
  assert.match(solveQuadratic(0, 2, -4), /bậc nhất: x = 2/);
  assert.match(solveQuadratic(0, 0, 0), /vô số nghiệm/);
  assert.match(solveQuadratic(0, 0, 1), /vô nghiệm/);
  assert.match(solveQuadratic(1, -2, 1), /nghiệm kép x = 1/);
  assert.match(solveQuadratic(1, 0, 1), /không có nghiệm thực/);
  assert.match(solveQuadratic(1e200, -5e200, 6e200), /x₁ = 2, x₂ = 3/);
  assert.match(solveQuadratic(NaN, 1, 1), /hữu hạn/);
});

test('user-entered LaTeX does not create trusted HTML or javascript links', () => {
  assert.match(renderMath('x^2'), /katex/);
  assert.doesNotMatch(renderMath('\\href{javascript:alert(1)}{click}'), /href="javascript:/);
  assert.doesNotMatch(renderMath('\\htmlClass{injected}{x}'), /class="injected"/);
});


test('linear algebra engine solves systems and matrix inverses', () => {
  const system = solveLinearSystem2(1, 1, 5, 2, -1, 1);
  assert.equal(system?.kind, 'unique');
  assert.ok(Math.abs((system?.x ?? NaN) - 2) < 1e-10);
  assert.ok(Math.abs((system?.y ?? NaN) - 3) < 1e-10);
  assert.equal(solveLinearSystem2(1, 1, 2, 2, 2, 5)?.kind, 'none');
  assert.equal(solveLinearSystem2(1, 1, 2, 2, 2, 4)?.kind, 'infinite');

  const matrix = invertMatrix2(2, 1, 3, 4);
  assert.equal(matrix?.determinant, 5);
  assert.deepEqual(matrix?.inverse?.map(value => Number(value.toFixed(10))), [0.8, -0.2, -0.6, 0.4]);
  assert.equal(invertMatrix2(1, 2, 2, 4)?.inverse, null);
});

test('statistics, sequences and vectors produce stable mathematical summaries', () => {
  const stats = descriptiveStatistics([2, 4, 6, 8]);
  assert.equal(stats?.mean, 5);
  assert.equal(stats?.median, 5);
  assert.equal(stats?.variance, 5);
  assert.ok(Math.abs((stats?.standardDeviation ?? 0) - Math.sqrt(5)) < 1e-10);
  assert.deepEqual(parseNumberList('2, 4; 6 8'), [2, 4, 6, 8]);

  assert.deepEqual(arithmeticSequence(3, 2, 5), { nth: 11, sum: 35 });
  assert.deepEqual(geometricSequence(2, 3, 4), { nth: 54, sum: 80 });

  const vectors = vector2(1, 0, 0, 1);
  assert.equal(vectors?.dot, 0);
  assert.equal(vectors?.determinant, 1);
  assert.ok(Math.abs((vectors?.angleDegrees ?? 0) - 90) < 1e-10);
});

test('quadratic analysis exposes roots, vertex, axis and extremum', () => {
  const result = quadraticAnalysis(1, -2, -3);
  assert.equal(result?.discriminant, 16);
  assert.equal(result?.axis, 1);
  assert.equal(result?.vertexX, 1);
  assert.equal(result?.vertexY, -4);
  assert.deepEqual(result?.roots, [-1, 3]);
  assert.equal(result?.opens, 'up');
  assert.equal(result?.extremum, 'min');
  assert.equal(quadraticAnalysis(0, 1, 2), null);
});
