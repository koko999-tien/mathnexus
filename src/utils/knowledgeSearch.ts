import { LESSONS } from '../data/lessons';
import { BOOKS } from '../data/books';
import { FORMS } from '../data/formulas';
import { scoreSearch } from './search';

export type KnowledgeKind = 'lesson' | 'formula' | 'book';

export interface KnowledgeHit {
  kind: KnowledgeKind;
  type: string;
  title: string;
  detail: string;
  to: string;
  context: string;
  score: number;
}

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const KNOWLEDGE = [
  ...LESSONS.map(item => ({
    kind: 'lesson' as const,
    type: 'Bài học',
    title: item.t,
    detail: `${item.lv} · ${item.cat}`,
    to: `/lesson/${item.id}`,
    keywords: `${item.cat} ${item.lv} toán học học toán nền tảng kiến thức`,
    content: stripHtml(item.txt),
    context: `[Bài học] ${item.t} (${item.lv} · ${item.cat})\n${stripHtml(item.txt).slice(0, 2400)}`,
  })),
  ...FORMS.map(item => ({
    kind: 'formula' as const,
    type: 'Công thức',
    title: item.name,
    detail: item.cat,
    to: `/formula/${item.id}`,
    keywords: `${item.q.join(' ')} ${item.cat} công thức toán học`,
    content: `${item.what} ${item.why} ${item.use} ${item.ex} ${item.expr}`,
    context: `[Công thức] ${item.name} (${item.cat})\nBiểu thức: ${item.expr}\nÝ nghĩa: ${item.what}\nVì sao cần biết: ${item.why}\nVí dụ: ${item.ex}`,
  })),
  ...BOOKS.map(item => ({
    kind: 'book' as const,
    type: 'Sách',
    title: item.t,
    detail: item.lv,
    to: `/book/${item.id}`,
    keywords: `${item.lv} sách giáo trình đọc học toán toán học`,
    content: `${item.why} ${item.ideas}`,
    context: `[Sách] ${item.t} (${item.lv})\nLý do nên đọc: ${item.why}\nÝ tưởng chính: ${item.ideas}`,
  })),
];

export function searchKnowledge(query: string, limit = 12): KnowledgeHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return KNOWLEDGE
    .map(item => ({
      ...item,
      score: scoreSearch(
        {
          title: item.title,
          detail: item.detail,
          keywords: item.keywords,
          content: item.content,
        },
        trimmed,
      ),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'vi'))
    .slice(0, Math.max(1, limit))
    .map(({ keywords: _keywords, content: _content, ...item }) => item);
}

export function buildKnowledgeContext(query: string, limit = 5) {
  const ranked = searchKnowledge(query, 20);
  const counts: Record<KnowledgeKind, number> = { lesson: 0, formula: 0, book: 0 };
  const selected: KnowledgeHit[] = [];

  for (const item of ranked) {
    if (counts[item.kind] >= 2) continue;
    selected.push(item);
    counts[item.kind] += 1;
    if (selected.length >= limit) break;
  }

  const context = selected
    .map((item, index) => `Nguồn MathNexus ${index + 1}:\n${item.context}`)
    .join('\n\n')
    .slice(0, 10000);

  return {
    text: context,
    hits: selected,
    links: selected.map(item => ({ to: item.to, label: item.title })),
  };
}
