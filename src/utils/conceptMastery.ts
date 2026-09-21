import { MATH_CONCEPTS } from '../data/mathKnowledge.ts';
import { QUIZ_CONCEPT_MAP } from '../data/mathOntology.ts';
import type { ProgressData } from './storage.ts';

export type MasteryState = 'unassessed' | 'developing' | 'solid' | 'strong';

export interface ConceptMastery {
  conceptId: string;
  score: number | null;
  confidence: number;
  state: MasteryState;
  lessons: { completed: number; total: number };
  practice: { attemptedQuestions: number; totalQuestions: number; attempts: number; correct: number; accuracy: number | null };
  prerequisiteCoverage: number;
  evidence: string[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function conceptMastery(progress: ProgressData, conceptId: string): ConceptMastery {
  const concept = MATH_CONCEPTS.find(item => item.id === conceptId);
  if (!concept) throw new Error('Unknown concept for mastery: ' + conceptId);

  const lessonIds = concept.lessonIds || [];
  const completedLessons = lessonIds.filter(id => progress.lessonsRead.includes(id)).length;

  const questionIds = Object.entries(QUIZ_CONCEPT_MAP)
    .filter(([, mappedConcept]) => mappedConcept === conceptId)
    .map(([questionId]) => questionId);
  const attemptedQuestionIds = questionIds.filter(id => (progress.practice[id]?.attempts || 0) > 0);
  const attempts = questionIds.reduce((sum, id) => sum + (progress.practice[id]?.attempts || 0), 0);
  const correct = questionIds.reduce((sum, id) => sum + (progress.practice[id]?.correct || 0), 0);
  const accuracy = attempts ? Math.round(correct / attempts * 100) : null;

  const prerequisiteLessons = concept.prerequisites.flatMap(id => MATH_CONCEPTS.find(item => item.id === id)?.lessonIds || []);
  const prerequisiteCoverage = prerequisiteLessons.length
    ? prerequisiteLessons.filter(id => progress.lessonsRead.includes(id)).length / prerequisiteLessons.length
    : 1;

  const evidenceValues: Array<{ value: number; weight: number }> = [];
  const hasDirectEvidence = completedLessons > 0 || attempts > 0;
  if (lessonIds.length && completedLessons > 0) evidenceValues.push({ value: completedLessons / lessonIds.length * 100, weight: 0.45 });
  if (questionIds.length && attempts) {
    const breadth = attemptedQuestionIds.length / questionIds.length;
    const repetition = Math.min(1, attempts / Math.max(2, questionIds.length * 2));
    const practiceValue = (accuracy || 0) * (0.7 + 0.3 * breadth);
    evidenceValues.push({ value: practiceValue, weight: 0.45 + repetition * 0.1 });
  }
  if (hasDirectEvidence && concept.prerequisites.length) evidenceValues.push({ value: prerequisiteCoverage * 100, weight: 0.15 });

  const weightSum = evidenceValues.reduce((sum, item) => sum + item.weight, 0);
  const score = hasDirectEvidence && weightSum
    ? clamp(evidenceValues.reduce((sum, item) => sum + item.value * item.weight, 0) / weightSum)
    : null;

  let confidence = 0;
  if (lessonIds.length) confidence += completedLessons / lessonIds.length * 45;
  if (questionIds.length) {
    confidence += attemptedQuestionIds.length / questionIds.length * 25;
    confidence += Math.min(1, attempts / Math.max(2, questionIds.length * 3)) * 25;
  }
  if (hasDirectEvidence && concept.prerequisites.length) confidence += prerequisiteCoverage * 5;
  confidence = hasDirectEvidence ? clamp(confidence) : 0;

  let state: MasteryState = 'unassessed';
  if (score !== null) {
    if (score >= 80 && confidence >= 70) state = 'strong';
    else if (score >= 60 && confidence >= 40) state = 'solid';
    else state = 'developing';
  }

  const evidence: string[] = [];
  if (lessonIds.length) evidence.push(`Bài học: ${completedLessons}/${lessonIds.length} đã hoàn thành`);
  if (questionIds.length) evidence.push(attempts ? `Luyện tập: ${correct}/${attempts} lượt đúng · ${attemptedQuestionIds.length}/${questionIds.length} dạng đã thử` : `Luyện tập: chưa có lượt làm trong ${questionIds.length} dạng đã gắn`);
  if (concept.prerequisites.length) evidence.push(`Nền tảng trực tiếp: ${Math.round(prerequisiteCoverage * 100)}% có bằng chứng bài học`);
  if (!evidence.length) evidence.push('Chưa có nguồn bằng chứng học tập được gắn với khái niệm này.');

  return {
    conceptId,
    score,
    confidence,
    state,
    lessons: { completed: completedLessons, total: lessonIds.length },
    practice: {
      attemptedQuestions: attemptedQuestionIds.length,
      totalQuestions: questionIds.length,
      attempts,
      correct,
      accuracy,
    },
    prerequisiteCoverage: clamp(prerequisiteCoverage * 100),
    evidence,
  };
}

export function allConceptMastery(progress: ProgressData) {
  return MATH_CONCEPTS.map(concept => conceptMastery(progress, concept.id));
}

export function weakestMeasuredConcepts(progress: ProgressData, limit = 5) {
  return allConceptMastery(progress)
    .filter(item => item.score !== null && item.confidence >= 20)
    .sort((a, b) => (a.score || 0) - (b.score || 0) || b.confidence - a.confidence)
    .slice(0, limit);
}

export function masteryLabel(state: MasteryState) {
  if (state === 'strong') return 'Bằng chứng mạnh';
  if (state === 'solid') return 'Khá vững';
  if (state === 'developing') return 'Đang hình thành';
  return 'Chưa đánh giá';
}
