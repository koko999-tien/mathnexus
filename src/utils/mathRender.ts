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
