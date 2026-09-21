const STOP_WORDS = new Set([
  'ai', 'ban', 'bi', 'cai', 'can', 'cho', 'co', 'cua', 'duoc', 'gi', 'hay', 'hoc',
  'la', 'lam', 'minh', 'mot', 'nao', 'nen', 'nhu', 'o', 'roi', 'sao', 'the', 'thi',
  'toi', 'trong', 've', 'va', 'voi', 'muon', 'giup', 'giai', 'thich',
]);

export interface SearchFields {
  title: string;
  detail?: string;
  keywords?: string;
  content?: string;
}

export function normalizeSearch(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearch(text: string) {
  const tokens = normalizeSearch(text)
    .split(' ')
    .filter(Boolean)
    .filter(token => token.length > 1 || /^\d+$/.test(token))
    .filter(token => !STOP_WORDS.has(token));

  return [...new Set(tokens)];
}

export function scoreSearch(fields: SearchFields, query: string) {
  const q = normalizeSearch(query);
  if (!q) return 0;

  const title = normalizeSearch(fields.title);
  const detail = normalizeSearch(fields.detail || '');
  const keywords = normalizeSearch(fields.keywords || '');
  const content = normalizeSearch(fields.content || '');
  const combined = [title, detail, keywords, content].filter(Boolean).join(' ');
  const tokens = tokenizeSearch(query);

  let score = 0;

  if (title === q) score += 140;
  else if (title.startsWith(q)) score += 105;
  else if (title.includes(q)) score += 85;
  else if (q.length > 3 && q.includes(title) && title.length > 3) score += 55;

  if (keywords.includes(q)) score += 52;
  if (detail.includes(q)) score += 34;
  if (content.includes(q)) score += 20;

  if (!tokens.length) {
    return combined.includes(q) ? Math.max(score, 12) : 0;
  }

  const titleWords = new Set(title.split(' '));
  let matched = 0;

  for (const token of tokens) {
    let tokenScore = 0;

    if (titleWords.has(token)) tokenScore = Math.max(tokenScore, 28);
    else if (title.startsWith(token)) tokenScore = Math.max(tokenScore, 22);
    else if (title.includes(token)) tokenScore = Math.max(tokenScore, 18);

    if (keywords.split(' ').includes(token)) tokenScore = Math.max(tokenScore, 16);
    else if (keywords.includes(token)) tokenScore = Math.max(tokenScore, 12);

    if (detail.includes(token)) tokenScore = Math.max(tokenScore, 9);
    if (content.includes(token)) tokenScore = Math.max(tokenScore, /^\d+$/.test(token) ? 1 : 5);

    if (tokenScore > 0) {
      matched += 1;
      score += tokenScore;
    }
  }

  if (!matched) return 0;
  if (tokens.length >= 3 && matched < 2) return 0;

  const coverage = matched / tokens.length;
  score += Math.round(coverage * 35);

  if (coverage < 0.4 && tokens.length >= 3) score *= 0.55;
  if (coverage === 1 && tokens.length > 1) score += 18;

  return Math.round(score * 100) / 100;
}

export function matchesSearch(text: string, query: string) {
  const normalizedText = normalizeSearch(text);
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const tokens = tokenizeSearch(query);
  if (!tokens.length) return normalizedText.includes(normalizedQuery);

  return tokens.every(token => normalizedText.includes(token));
}
