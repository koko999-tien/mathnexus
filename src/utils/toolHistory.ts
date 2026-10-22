import { load, save } from './storage.ts';

export interface ToolHistoryEntry {
  id: string;
  tool: string;
  title: string;
  input: string;
  result: string;
  values: string[];
  meta: string;
  at: string;
}

export const TOOL_HISTORY_KEY = 'tool_history_v1';
export const TOOL_HISTORY_LIMIT = 30;

const MAX_TEXT = 500;

function text(value: unknown, max = MAX_TEXT): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function normalizeEntry(raw: unknown): ToolHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const tool = text(record.tool, 40);
  const result = text(record.result);
  if (!tool || !result) return null;
  return {
    id: text(record.id, 80) || `calc-${tool}-${Date.now().toString(36)}`,
    tool,
    title: text(record.title, 120) || tool,
    input: text(record.input),
    result,
    values: Array.isArray(record.values)
      ? record.values.filter((value): value is string => typeof value === 'string').slice(0, 16)
      : [],
    meta: text(record.meta, 40),
    at: typeof record.at === 'string' && Number.isFinite(Date.parse(record.at))
      ? record.at
      : new Date(0).toISOString(),
  };
}

export function normalizeToolHistoryEntries(value: unknown): ToolHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeEntry)
    .filter((entry): entry is ToolHistoryEntry => Boolean(entry))
    .slice(0, TOOL_HISTORY_LIMIT);
}

export function loadToolHistory(): ToolHistoryEntry[] {
  return normalizeToolHistoryEntries(load<unknown>(TOOL_HISTORY_KEY, []));
}

export function saveToolHistory(entries: ToolHistoryEntry[]): boolean {
  return save(TOOL_HISTORY_KEY, normalizeToolHistoryEntries(entries));
}

export function historySignature(entry: Pick<ToolHistoryEntry, 'tool' | 'input' | 'result' | 'meta'>): string {
  return `${entry.tool}|${entry.meta}|${entry.input}|${entry.result}`;
}

export function pushToolHistory(entries: ToolHistoryEntry[], entry: ToolHistoryEntry): ToolHistoryEntry[] {
  const signature = historySignature(entry);
  return [entry, ...entries.filter(existing => historySignature(existing) !== signature)]
    .slice(0, TOOL_HISTORY_LIMIT);
}

export function clearToolHistory(): void {
  save(TOOL_HISTORY_KEY, []);
}

export function historyTime(at: string, now = new Date()): string {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return '';
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}
