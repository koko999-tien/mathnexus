export type ResearchShelfKind = 'paper' | 'source' | 'video';

export interface ResearchShelfItem {
  id: string;
  kind: ResearchShelfKind;
  title: string;
  url: string;
  provider?: string;
  source?: string;
  authors?: string[];
  date?: string;
  openAccess?: boolean;
  savedAt: string;
}

export const RESEARCH_SHELF_KEY = 'mathnexus:research-shelf:v1';
const MAX_ITEMS = 80;

function cleanText(value: unknown, max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanUrl(value: unknown) {
  const raw = cleanText(value, 2000);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function cleanAuthors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(item => cleanText(item, 120)).filter(Boolean).slice(0, 8);
}

export function normalizeResearchShelfItem(value: unknown): ResearchShelfItem | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<ResearchShelfItem>;
  const kind: ResearchShelfKind = input.kind === 'paper' || input.kind === 'video' ? input.kind : 'source';
  const title = cleanText(input.title, 600);
  const url = cleanUrl(input.url);
  if (!title || !url) return null;

  const savedAtRaw = cleanText(input.savedAt, 80);
  const savedAt = Number.isFinite(Date.parse(savedAtRaw)) ? new Date(savedAtRaw).toISOString() : new Date().toISOString();
  const authors = cleanAuthors(input.authors);

  return {
    id: cleanText(input.id, 1200) || `${kind}:${url}`,
    kind,
    title,
    url,
    provider: cleanText(input.provider, 160) || undefined,
    source: cleanText(input.source, 240) || undefined,
    authors: authors.length ? authors : undefined,
    date: cleanText(input.date, 80) || undefined,
    openAccess: Boolean(input.openAccess),
    savedAt,
  };
}

export function getResearchShelf(storage: Pick<Storage, 'getItem'> = localStorage): ResearchShelfItem[] {
  try {
    const raw = storage.getItem(RESEARCH_SHELF_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed
      .map(normalizeResearchShelfItem)
      .filter((item): item is ResearchShelfItem => Boolean(item))
      .filter(item => {
        const key = item.url.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveResearchShelf(items: ResearchShelfItem[], storage: Pick<Storage, 'setItem'> = localStorage) {
  const normalized = items
    .map(normalizeResearchShelfItem)
    .filter((item): item is ResearchShelfItem => Boolean(item))
    .slice(0, MAX_ITEMS);
  storage.setItem(RESEARCH_SHELF_KEY, JSON.stringify(normalized));
  return normalized;
}

export function toggleResearchShelfItem(
  items: ResearchShelfItem[],
  candidate: Omit<ResearchShelfItem, 'savedAt'> & { savedAt?: string },
) {
  const normalized = normalizeResearchShelfItem({
    ...candidate,
    savedAt: candidate.savedAt || new Date().toISOString(),
  });
  if (!normalized) return items;

  const exists = items.some(item => item.url.toLowerCase() === normalized.url.toLowerCase());
  if (exists) return items.filter(item => item.url.toLowerCase() !== normalized.url.toLowerCase());
  return [normalized, ...items].slice(0, MAX_ITEMS);
}

function bibEscape(value = '') {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/[{}]/g, match => `\\${match}`)
    .trim();
}

function citationKey(item: ResearchShelfItem, index: number) {
  const author = item.authors?.[0]?.split(/\s+/).at(-1) || '';
  const year = item.date?.match(/\b(19|20)\d{2}\b/)?.[0] || '';
  const seed = [author, year, item.title.split(/\s+/)[0]].filter(Boolean).join('');
  const normalized = seed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '');
  return normalized || `mathnexus${index + 1}`;
}

export function buildBibTeX(items: ResearchShelfItem[]) {
  const papers = items.filter(item => item.kind === 'paper');
  return papers.map((item, index) => {
    const fields = [
      `  title = {${bibEscape(item.title)}}`,
      item.authors?.length ? `  author = {${bibEscape(item.authors.join(' and '))}}` : '',
      item.date?.match(/\b(19|20)\d{2}\b/) ? `  year = {${item.date.match(/\b(19|20)\d{2}\b/)?.[0]}}` : '',
      item.source ? `  note = {${bibEscape(item.source)}}` : '',
      `  url = {${bibEscape(item.url)}}`,
    ].filter(Boolean);

    return `@misc{${citationKey(item, index)},\n${fields.join(',\n')}\n}`;
  }).join('\n\n');
}
