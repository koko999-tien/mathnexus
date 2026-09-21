import type { Quiz } from '../data/quiz.ts';
import { MATH_CONCEPTS } from '../data/mathKnowledge.ts';
import { QUIZ_CONCEPT_MAP } from '../data/mathOntology.ts';
import { conceptMastery, masteryLabel } from '../utils/conceptMastery.ts';
import type { ProgressData } from '../utils/storage.ts';
import { buildLearningGoalState, type LearningGoal, type LearningGoalAction } from './learningGoal.ts';

export interface DiagnosticConceptDebrief {
  conceptId: string;
  title: string;
  attempted: number;
  correct: number;
  accuracy: number;
  scoreBefore: number | null;
  scoreAfter: number | null;
  confidenceBefore: number;
  confidenceAfter: number;
  stateAfter: ReturnType<typeof conceptMastery>['state'];
  stateLabel: string;
  scoreDelta: number;
  confidenceDelta: number;
  to: string;
}

export interface GoalDiagnosticDebrief {
  targetConceptId: string;
  targetTitle: string;
  attempted: number;
  correct: number;
  accuracy: number;
  goalProgressBefore: number;
  goalProgressAfter: number;
  goalProgressDelta: number;
  concepts: DiagnosticConceptDebrief[];
  weakestConcept: DiagnosticConceptDebrief | null;
  nextAction: LearningGoalAction | null;
}

export function buildGoalDiagnosticDebrief(
  questions: Quiz[],
  answers: number[],
  progressBefore: ProgressData,
  progressAfter: ProgressData,
  goal: LearningGoal | null,
): GoalDiagnosticDebrief | null {
  const beforeGoal = buildLearningGoalState(progressBefore, goal);
  const afterGoal = buildLearningGoalState(progressAfter, goal);
  if (!beforeGoal || !afterGoal) return null;

  const pathOrder = new Map(afterGoal.steps.map((step, index) => [step.concept.id, index]));
  const grouped = new Map<string, { attempted: number; correct: number }>();

  questions.forEach((question, index) => {
    if (index >= answers.length) return;
    const conceptId = QUIZ_CONCEPT_MAP[question.id];
    if (!conceptId) return;
    const current = grouped.get(conceptId) || { attempted: 0, correct: 0 };
    current.attempted += 1;
    if (answers[index] === question.i) current.correct += 1;
    grouped.set(conceptId, current);
  });

  const concepts = [...grouped.entries()]
    .map(([conceptId, session]) => {
      const concept = MATH_CONCEPTS.find(item => item.id === conceptId);
      if (!concept) return null;

      const before = conceptMastery(progressBefore, conceptId);
      const after = conceptMastery(progressAfter, conceptId);
      const scoreBefore = before.score;
      const scoreAfter = after.score;
      const scoreDelta = (scoreAfter ?? 0) - (scoreBefore ?? 0);

      return {
        conceptId,
        title: concept.title,
        attempted: session.attempted,
        correct: session.correct,
        accuracy: session.attempted ? Math.round(session.correct / session.attempted * 100) : 0,
        scoreBefore,
        scoreAfter,
        confidenceBefore: before.confidence,
        confidenceAfter: after.confidence,
        stateAfter: after.state,
        stateLabel: masteryLabel(after.state),
        scoreDelta,
        confidenceDelta: after.confidence - before.confidence,
        to: '/map?concept=' + encodeURIComponent(conceptId),
      } satisfies DiagnosticConceptDebrief;
    })
    .filter((item): item is DiagnosticConceptDebrief => Boolean(item))
    .sort((a, b) =>
      (pathOrder.get(a.conceptId) ?? Number.MAX_SAFE_INTEGER) - (pathOrder.get(b.conceptId) ?? Number.MAX_SAFE_INTEGER)
      || a.title.localeCompare(b.title, 'vi')
    );

  const attempted = concepts.reduce((sum, item) => sum + item.attempted, 0);
  const correct = concepts.reduce((sum, item) => sum + item.correct, 0);
  const weakestConcept = [...concepts]
    .sort((a, b) => a.accuracy - b.accuracy || a.confidenceAfter - b.confidenceAfter || a.title.localeCompare(b.title, 'vi'))[0] || null;

  return {
    targetConceptId: afterGoal.target.id,
    targetTitle: afterGoal.target.title,
    attempted,
    correct,
    accuracy: attempted ? Math.round(correct / attempted * 100) : 0,
    goalProgressBefore: beforeGoal.progressPercent,
    goalProgressAfter: afterGoal.progressPercent,
    goalProgressDelta: afterGoal.progressPercent - beforeGoal.progressPercent,
    concepts,
    weakestConcept,
    nextAction: afterGoal.nextAction,
  };
}
