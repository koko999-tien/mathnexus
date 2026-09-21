import { loadCanvasState, normalizeCanvasState, saveCanvasState } from '../canvas/canvasStorage.ts';
import type { MathCanvasState } from '../canvas/types.ts';
import {
  createEmptyExplorationSummary,
  getExplorationSummary,
  normalizeExplorationSummary,
  saveExplorationSummary,
  type ExplorationSummary,
} from '../exploration/explorationState.ts';
import {
  getLearningGoal,
  LEARNING_GOAL_KEY,
  normalizeLearningGoal,
  type LearningGoal,
} from '../learning/learningGoal.ts';
import {
  getProgress,
  load,
  normalizeProgress,
  parseBackup as parseLegacyBackup,
  save,
  saveProgress,
  type ProgressData,
} from './storage.ts';

export const BACKUP_VERSION = 2;

export interface MathNexusBackupV2 {
  app: 'MathNexus';
  version: 2;
  exportedAt: string;
  progress: ProgressData;
  notes: string;
  learningGoal: LearningGoal | null;
  exploration: ExplorationSummary;
  canvas: MathCanvasState;
}

export interface ParsedBackup {
  sourceVersion: 1 | 2;
  progress: ProgressData;
  notes: string;
  learningGoal?: LearningGoal | null;
  exploration?: ExplorationSummary;
  canvas?: MathCanvasState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createBackupSnapshot(): MathNexusBackupV2 {
  return {
    app: 'MathNexus',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    progress: getProgress(),
    notes: (() => { const value = load<unknown>('notes', ''); return typeof value === 'string' ? value : ''; })(),
    learningGoal: getLearningGoal(),
    exploration: getExplorationSummary(),
    canvas: loadCanvasState(),
  };
}

export function parseBackupSnapshot(text: string): ParsedBackup {
  const raw = JSON.parse(text) as unknown;
  if (!isRecord(raw) || raw.app !== 'MathNexus') {
    throw new Error('Tệp không phải bản sao lưu MathNexus hợp lệ.');
  }

  if (raw.version === 1) {
    const legacy = parseLegacyBackup(text);
    return {
      sourceVersion: 1,
      progress: legacy.progress,
      notes: legacy.notes,
    };
  }

  if (raw.version !== BACKUP_VERSION || !isRecord(raw.progress) || typeof raw.notes !== 'string') {
    throw new Error('Tệp không phải bản sao lưu MathNexus hợp lệ.');
  }

  if (!('learningGoal' in raw) || !('exploration' in raw) || !('canvas' in raw)) {
    throw new Error('Bản sao lưu MathNexus v2 bị thiếu dữ liệu.');
  }

  let learningGoal: LearningGoal | null = null;
  if (raw.learningGoal !== null) {
    learningGoal = normalizeLearningGoal(raw.learningGoal);
    if (!learningGoal) throw new Error('Mục tiêu học tập trong bản sao lưu không hợp lệ.');
  }

  if (!isRecord(raw.exploration) || !isRecord(raw.canvas)) {
    throw new Error('Dữ liệu khám phá hoặc Math Canvas trong bản sao lưu không hợp lệ.');
  }

  return {
    sourceVersion: 2,
    progress: normalizeProgress(raw.progress),
    notes: raw.notes,
    learningGoal,
    exploration: normalizeExplorationSummary(raw.exploration),
    canvas: normalizeCanvasState(raw.canvas),
  };
}

export function restoreBackupSnapshot(snapshot: ParsedBackup): { ok: true } | { ok: false; error: string } {
  const previous = {
    progress: getProgress(),
    notes: (() => { const value = load<unknown>('notes', ''); return typeof value === 'string' ? value : ''; })(),
    learningGoal: getLearningGoal(),
    exploration: getExplorationSummary(),
    canvas: loadCanvasState(),
  };

  try {
    if (!save('notes', snapshot.notes)) throw new Error('Không lưu được sổ tay.');
    if (!saveProgress(snapshot.progress)) throw new Error('Không lưu được tiến độ.');

    if (snapshot.sourceVersion === 2) {
      if (!save(LEARNING_GOAL_KEY, snapshot.learningGoal ?? null)) throw new Error('Không lưu được mục tiêu học tập.');
      if (!snapshot.exploration || !saveExplorationSummary(snapshot.exploration)) throw new Error('Không lưu được dữ liệu khám phá.');
      if (!snapshot.canvas || !saveCanvasState(snapshot.canvas).ok) throw new Error('Không lưu được Math Canvas.');
    }

    return { ok: true };
  } catch (error) {
    // Best-effort rollback keeps the previous local-first state when one subsystem cannot be written.
    save('notes', previous.notes);
    saveProgress(previous.progress);
    save(LEARNING_GOAL_KEY, previous.learningGoal ?? null);
    saveExplorationSummary(previous.exploration);
    saveCanvasState(previous.canvas);

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không khôi phục được bản sao lưu.',
    };
  }
}
