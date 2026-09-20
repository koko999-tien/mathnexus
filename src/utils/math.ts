import katex from 'katex';

export function renderMath(expr: string, displayMode = false): string {
  try {
    return katex.renderToString(expr, {
      displayMode,
      throwOnError: false,
      trust: false,
      maxExpand: 100,
      maxSize: 20,
    });
  } catch {
    return expr.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
  }
}

export function gcd(a: number, b: number): number {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return NaN;
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export function lcm(a: number, b: number): number {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return NaN;
  if (a === 0 || b === 0) return 0;
  const result = Math.abs(a / gcd(a, b) * b);
  return Number.isSafeInteger(result) ? result : NaN;
}

export function isPrime(n: number): boolean {
  if (!Number.isSafeInteger(n) || n < 2 || n > 1e12) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function nCr(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || n > 170) return NaN;
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) {
    r = r * (n - i) / (i + 1);
  }
  return Math.round(r);
}

export function nPr(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || n > 170) return NaN;
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r *= (n - i);
  return r;
}

export function solveQuadratic(a: number, b: number, c: number): string {
  if (![a, b, c].every(Number.isFinite)) return 'Hãy nhập đủ ba hệ số hữu hạn.';
  if (a === 0) {
    if (b === 0) return c === 0 ? 'Phương trình có vô số nghiệm.' : 'Phương trình vô nghiệm.';
    return `Phương trình bậc nhất: x = ${formatNumber(-c / b)}`;
  }
  // Normalize before computing the discriminant to avoid overflowing b² and 4ac.
  const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c));
  const an = a / scale, bn = b / scale, cn = c / scale;
  const delta = bn * bn - 4 * an * cn;
  if (delta < 0) return 'Δ < 0: phương trình không có nghiệm thực.';
  if (delta === 0) return `Δ = 0: nghiệm kép x = ${formatNumber(-bn / (2 * an))}`;
  const q = -0.5 * (bn + (bn >= 0 ? 1 : -1) * Math.sqrt(delta));
  const roots = [q / an, cn / q].sort((x, y) => x - y);
  return `Hai nghiệm thực: x₁ = ${formatNumber(roots[0])}, x₂ = ${formatNumber(roots[1])}`;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'ngoài phạm vi tính toán';
  return Number(value.toPrecision(10)).toLocaleString('vi-VI', { maximumSignificantDigits: 10 });
}
