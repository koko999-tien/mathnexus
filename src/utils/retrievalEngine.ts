import { normalizeSearch, scoreSearch, tokenizeSearch, type SearchFields } from './search.ts';

export interface RetrievalDocument<T> extends SearchFields {
  id: string;
  kind: string;
  payload: T;
}

export interface RetrievalHit<T> {
  document: RetrievalDocument<T>;
  score: number;
  lexicalScore: number;
  reasons: string[];
}

export interface RetrievalOptions<T> {
  limit?: number;
  kindWeights?: Record<string, number>;
  scoreAdjust?: (document: RetrievalDocument<T>, query: string) => number;
  minScore?: number;
}

function matchReasons(document: RetrievalDocument<unknown>, query: string) {
  const normalizedQuery = normalizeSearch(query);
  const title = normalizeSearch(document.title);
  const keywords = normalizeSearch(document.keywords || '');
  const detail = normalizeSearch(document.detail || '');
  const tokens = tokenizeSearch(query);
  const reasons: string[] = [];

  if (title === normalizedQuery) reasons.push('exact-title');
  else if (title.startsWith(normalizedQuery)) reasons.push('title-prefix');
  else if (title.includes(normalizedQuery)) reasons.push('title-phrase');

  const titleWords = new Set(title.split(' '));
  if (tokens.some(token => titleWords.has(token))) reasons.push('title-token');
  if (tokens.some(token => keywords.includes(token))) reasons.push('keyword');
  if (normalizedQuery && detail.includes(normalizedQuery)) reasons.push('detail');

  return reasons;
}

export function rankRetrieval<T>(
  documents: readonly RetrievalDocument<T>[],
  query: string,
  options: RetrievalOptions<T> = {},
): RetrievalHit<T>[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const kindWeights = options.kindWeights || {};
  const minScore = options.minScore ?? 0;
  const limit = Math.max(1, options.limit ?? 12);

  return documents
    .map(document => {
      const lexicalScore = scoreSearch(document, trimmed);
      if (lexicalScore <= 0) return null;

      const weight = kindWeights[document.kind] ?? 1;
      const adjustment = options.scoreAdjust?.(document, trimmed) ?? 0;
      const score = Math.round((lexicalScore * weight + adjustment) * 100) / 100;

      return {
        document,
        lexicalScore,
        score,
        reasons: matchReasons(document, trimmed),
      };
    })
    .filter((item): item is RetrievalHit<T> => Boolean(item) && item.score > minScore)
    .sort((a, b) =>
      b.score - a.score ||
      b.lexicalScore - a.lexicalScore ||
      a.document.title.localeCompare(b.document.title, 'vi')
    )
    .slice(0, limit);
}

export function bestRetrieval<T>(
  documents: readonly RetrievalDocument<T>[],
  query: string,
  options: Omit<RetrievalOptions<T>, 'limit'> = {},
) {
  return rankRetrieval(documents, query, { ...options, limit: 1 })[0] || null;
}
