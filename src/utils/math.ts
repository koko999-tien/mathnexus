import katex from 'katex';

export function renderMath(expr: string, displayMode = false): string {
  try {
    return katex.renderToString(expr, {
      displayMode,
      throwOnError: false,
      trust: true,
    });
  } catch {
    return expr;
  }
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function factorial(n: number): number {
  if (n < 0) return 0;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function nCr(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let r = 1;
  for (let i = 0; i < k; i++) {
    r = r * (n - i) / (i + 1);
  }
  return Math.round(r);
}

export function nPr(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r *= (n - i);
  return r;
}
