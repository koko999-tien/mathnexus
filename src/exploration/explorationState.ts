import { MATH_CONCEPTS, type MathDomainId } from '../data/mathKnowledge.ts';
import { MATH_ATOMS } from '../data/mathOntology.ts';
import { load, save, STORAGE_EVENT } from '../utils/storage.ts';

export const EXPLORATION_STORAGE_KEY = 'exploration_state_v1';
export const EXPLORATION_EVENT = 'mathnexus:exploration';

export interface DailyExploration {
  actions: number;
  newConcepts: number;
  newAtoms: number;
  revisits: number;
  simulations: number;
  adjustments: number;
}

export interface ExplorationSummary {
  version: 1;
  discoveredConceptIds: string[];
  discoveredAtomIds: string[];
  conceptVisits: Record<string, number>;
  simulationSessions: Record<string, number>;
  simulationAdjustments: Record<string, number>;
  daily: Record<string, DailyExploration>;
  lastActivity: string;
}

export type ExplorationAction =
  | { type: 'concept_open'; conceptId: string }
  | { type: 'atom_open'; atomId: string }
  | { type: 'simulation_session'; simulationId: string }
  | { type: 'simulation_adjustment'; simulationId: string };

export interface ExplorationMetrics {
  explorationIndex: number;
  discoveredConcepts: number;
  exploredDomains: number;
  deepAtoms: number;
  returnVisits: number;
  simulationSessions: number;
  simulationAdjustments: number;
  breadthScore: number;
  depthScore: number;
  revisitScore: number;
  simulationScore: number;
}

const MAX_VISIT_COUNT = 100000;
const MAX_DAILY_DAYS = 90;

const conceptIds = new Set(MATH_CONCEPTS.map(concept => concept.id));
const atomIds = new Set(MATH_ATOMS.map(atom => atom.id));
const atomToConcept = new Map(MATH_ATOMS.map(atom => [atom.id, atom.conceptId]));

function count(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? Math.min(MAX_VISIT_COUNT, value)
    : 0;
}

function ids(value: unknown, allowed: Set<string>) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && allowed.has(item)))];
}

function counts(value: unknown) {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!key || key.length > 120) continue;
    const safe = count(raw);
    if (safe > 0) result[key] = safe;
  }
  return result;
}

function normalizeDay(value: unknown): DailyExploration {
  const raw = value && typeof value === 'object' ? value as Partial<DailyExploration> : {};
  return {
    actions: count(raw.actions),
    newConcepts: count(raw.newConcepts),
    newAtoms: count(raw.newAtoms),
    revisits: count(raw.revisits),
    simulations: count(raw.simulations),
    adjustments: count(raw.adjustments),
  };
}

function emptyDay(): DailyExploration {
  return { actions: 0, newConcepts: 0, newAtoms: 0, revisits: 0, simulations: 0, adjustments: 0 };
}

export function createEmptyExplorationSummary(): ExplorationSummary {
  return {
    version: 1,
    discoveredConceptIds: [],
    discoveredAtomIds: [],
    conceptVisits: {},
    simulationSessions: {},
    simulationAdjustments: {},
    daily: {},
    lastActivity: '',
  };
}

export function normalizeExplorationSummary(value: unknown): ExplorationSummary {
  const fallback = createEmptyExplorationSummary();
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<ExplorationSummary>;

  const dailyEntries = raw.daily && typeof raw.daily === 'object'
    ? Object.entries(raw.daily)
        .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, MAX_DAILY_DAYS)
    : [];

  return {
    version: 1,
    discoveredConceptIds: ids(raw.discoveredConceptIds, conceptIds),
    discoveredAtomIds: ids(raw.discoveredAtomIds, atomIds),
    conceptVisits: Object.fromEntries(
      Object.entries(counts(raw.conceptVisits)).filter(([id]) => conceptIds.has(id)),
    ),
    simulationSessions: counts(raw.simulationSessions),
    simulationAdjustments: counts(raw.simulationAdjustments),
    daily: Object.fromEntries(dailyEntries.map(([date, day]) => [date, normalizeDay(day)])),
    lastActivity: typeof raw.lastActivity === 'string' ? raw.lastActivity.slice(0, 60) : '',
  };
}

function localDate(timestamp: Date) {
  return `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
}

function increment(map: Record<string, number>, key: string) {
  map[key] = Math.min(MAX_VISIT_COUNT, (map[key] || 0) + 1);
}

export function applyExplorationAction(
  input: ExplorationSummary,
  action: ExplorationAction,
  timestamp = new Date(),
): ExplorationSummary {
  const state = normalizeExplorationSummary(input);
  const next: ExplorationSummary = {
    ...state,
    discoveredConceptIds: [...state.discoveredConceptIds],
    discoveredAtomIds: [...state.discoveredAtomIds],
    conceptVisits: { ...state.conceptVisits },
    simulationSessions: { ...state.simulationSessions },
    simulationAdjustments: { ...state.simulationAdjustments },
    daily: { ...state.daily },
    lastActivity: timestamp.toISOString(),
  };

  const date = localDate(timestamp);
  const day = { ...emptyDay(), ...next.daily[date] };
  day.actions++;

  if (action.type === 'concept_open') {
    if (!conceptIds.has(action.conceptId)) return state;
    const previousVisits = next.conceptVisits[action.conceptId] || 0;
    increment(next.conceptVisits, action.conceptId);
    if (!next.discoveredConceptIds.includes(action.conceptId)) {
      next.discoveredConceptIds.push(action.conceptId);
      day.newConcepts++;
    } else if (previousVisits > 0) {
      day.revisits++;
    }
  }

  if (action.type === 'atom_open') {
    if (!atomIds.has(action.atomId)) return state;
    const conceptId = atomToConcept.get(action.atomId);
    if (conceptId && !next.discoveredConceptIds.includes(conceptId)) {
      next.discoveredConceptIds.push(conceptId);
      day.newConcepts++;
    }
    if (!next.discoveredAtomIds.includes(action.atomId)) {
      next.discoveredAtomIds.push(action.atomId);
      day.newAtoms++;
    }
  }

  if (action.type === 'simulation_session') {
    if (!action.simulationId || action.simulationId.length > 120) return state;
    increment(next.simulationSessions, action.simulationId);
    day.simulations++;
  }

  if (action.type === 'simulation_adjustment') {
    if (!action.simulationId || action.simulationId.length > 120) return state;
    increment(next.simulationAdjustments, action.simulationId);
    day.adjustments++;
  }

  next.daily[date] = day;
  return normalizeExplorationSummary(next);
}

export function explorationMetrics(input: ExplorationSummary): ExplorationMetrics {
  const state = normalizeExplorationSummary(input);
  const discoveredConcepts = state.discoveredConceptIds.length;
  const deepAtoms = state.discoveredAtomIds.length;
  const domains = new Set<MathDomainId>();

  for (const id of state.discoveredConceptIds) {
    const domain = MATH_CONCEPTS.find(concept => concept.id === id)?.domain;
    if (domain) domains.add(domain);
  }

  const returnVisits = Object.values(state.conceptVisits).reduce((sum, visits) => sum + Math.max(0, visits - 1), 0);
  const simulationSessions = Object.values(state.simulationSessions).reduce((sum, value) => sum + value, 0);
  const simulationAdjustments = Object.values(state.simulationAdjustments).reduce((sum, value) => sum + value, 0);

  const breadthScore = Math.min(100, Math.round(
    (Math.min(1, discoveredConcepts / 20) * 0.6 + Math.min(1, domains.size / 6) * 0.4) * 100,
  ));
  const depthScore = Math.min(100, Math.round(Math.min(1, deepAtoms / Math.max(6, discoveredConcepts * 2)) * 100));
  const revisitScore = Math.min(100, Math.round(Math.min(1, returnVisits / 12) * 100));
  const simulationScore = Math.min(100, Math.round(
    Math.min(1, (simulationSessions + simulationAdjustments * 0.25) / 8) * 100,
  ));

  const explorationIndex = Math.round(
    breadthScore * 0.42 +
    depthScore * 0.28 +
    revisitScore * 0.18 +
    simulationScore * 0.12,
  );

  return {
    explorationIndex,
    discoveredConcepts,
    exploredDomains: domains.size,
    deepAtoms,
    returnVisits,
    simulationSessions,
    simulationAdjustments,
    breadthScore,
    depthScore,
    revisitScore,
    simulationScore,
  };
}

export function recentExploration(input: ExplorationSummary, days = 14, now = new Date()) {
  const state = normalizeExplorationSummary(input);
  const result: Array<{ date: string; actions: number }> = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);

  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() - offset);
    const key = localDate(date);
    result.push({ date: key, actions: state.daily[key]?.actions || 0 });
  }

  return result;
}

export function getExplorationSummary() {
  return normalizeExplorationSummary(load<unknown>(EXPLORATION_STORAGE_KEY, createEmptyExplorationSummary()));
}

export function saveExplorationSummary(summary: ExplorationSummary) {
  const ok = save(EXPLORATION_STORAGE_KEY, normalizeExplorationSummary(summary));
  if (ok && typeof window !== 'undefined') window.dispatchEvent(new Event(EXPLORATION_EVENT));
  return ok;
}

export function recordExploration(action: ExplorationAction) {
  const current = getExplorationSummary();
  const next = applyExplorationAction(current, action);
  saveExplorationSummary(next);
  return next;
}

export function recordConceptExploration(conceptId: string) {
  return recordExploration({ type: 'concept_open', conceptId });
}

export function recordAtomExploration(atomId: string) {
  return recordExploration({ type: 'atom_open', atomId });
}

export function recordSimulationSession(simulationId: string) {
  return recordExploration({ type: 'simulation_session', simulationId });
}

export function recordSimulationAdjustment(simulationId: string) {
  return recordExploration({ type: 'simulation_adjustment', simulationId });
}

export function subscribeExploration(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(EXPLORATION_EVENT, handler);
  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EXPLORATION_EVENT, handler);
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
