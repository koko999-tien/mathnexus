import { MATH_CONCEPTS, CONCEPT_BY_ID, type MathConcept } from '../data/mathKnowledge.ts';
import { QUIZ_CONCEPT_MAP } from '../data/mathOntology.ts';
import { allConceptMastery, type ConceptMastery } from '../utils/conceptMastery.ts';
import { learningPathTo } from '../utils/knowledgeGraph.ts';
import { load, save, type ProgressData } from '../utils/storage.ts';

export const LEARNING_GOAL_KEY = 'learning_goal_v1';

export interface LearningGoal {
  version: 1;
  targetConceptId: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalActionKind = 'lesson' | 'practice' | 'tool' | 'inspect';

export interface LearningGoalAction {
  kind: GoalActionKind;
  conceptId: string;
  title: string;
  detail: string;
  to: string;
}

export interface LearningGoalStep {
  concept: MathConcept;
  satisfied: boolean;
  mastery: ConceptMastery;
  lessonEvidence: boolean;
  questionCount: number;
}

export interface LearningGoalState {
  goal: LearningGoal;
  target: MathConcept;
  status: 'active' | 'complete' | 'blocked';
  progressPercent: number;
  satisfiedCount: number;
  totalCount: number;
  remainingCount: number;
  steps: LearningGoalStep[];
  nextAction: LearningGoalAction | null;
}

const questionCountByConcept = Object.values(QUIZ_CONCEPT_MAP).reduce((map, conceptId) => {
  map.set(conceptId, (map.get(conceptId) || 0) + 1);
  return map;
}, new Map<string, number>());

function validIsoDate(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function normalizeLearningGoal(value: unknown): LearningGoal | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<LearningGoal>;
  if (raw.version !== 1 || typeof raw.targetConceptId !== 'string' || !CONCEPT_BY_ID.has(raw.targetConceptId)) return null;

  const now = new Date(0).toISOString();
  const createdAt = validIsoDate(raw.createdAt) ? raw.createdAt! : now;
  const updatedAt = validIsoDate(raw.updatedAt) ? raw.updatedAt! : createdAt;

  return {
    version: 1,
    targetConceptId: raw.targetConceptId,
    createdAt,
    updatedAt,
  };
}

export function getLearningGoal(): LearningGoal | null {
  return normalizeLearningGoal(load<unknown>(LEARNING_GOAL_KEY, null));
}

export function setLearningGoal(targetConceptId: string): LearningGoal | null {
  if (!CONCEPT_BY_ID.has(targetConceptId)) return null;
  const previous = getLearningGoal();
  const timestamp = new Date().toISOString();
  const goal: LearningGoal = {
    version: 1,
    targetConceptId,
    createdAt: previous?.targetConceptId === targetConceptId ? previous.createdAt : timestamp,
    updatedAt: timestamp,
  };
  save(LEARNING_GOAL_KEY, goal);
  return goal;
}

export function clearLearningGoal() {
  save(LEARNING_GOAL_KEY, null);
}

function lessonEvidence(progress: ProgressData, concept: MathConcept) {
  return Boolean(concept.lessonIds?.length && concept.lessonIds.every(id => progress.lessonsRead.includes(id)));
}

function masterySatisfied(mastery: ConceptMastery) {
  return mastery.state === 'strong' || (mastery.state === 'solid' && mastery.confidence >= 45);
}

function stepSatisfied(progress: ProgressData, concept: MathConcept, mastery: ConceptMastery) {
  return lessonEvidence(progress, concept) || masterySatisfied(mastery);
}

function nextActionFor(step: LearningGoalStep, progress: ProgressData): LearningGoalAction {
  const concept = step.concept;
  const unreadLesson = concept.lessonIds?.find(id => !progress.lessonsRead.includes(id));

  if (unreadLesson) {
    return {
      kind: 'lesson',
      conceptId: concept.id,
      title: 'Học “' + concept.title + '”',
      detail: 'Đây là nút tiên quyết gần nhất chưa có đủ bằng chứng bài học.',
      to: '/lesson/' + unreadLesson,
    };
  }

  if (step.questionCount > 0) {
    return {
      kind: 'practice',
      conceptId: concept.id,
      title: 'Kiểm tra “' + concept.title + '”',
      detail: step.mastery.score === null
        ? 'Khái niệm này có câu hỏi được ontology gắn trực tiếp nhưng chưa có bằng chứng mastery.'
        : 'Bằng chứng hiện tại chưa đủ vững; luyện đúng concept này trước khi đi tiếp.',
      to: '/practice?concept=' + encodeURIComponent(concept.id) + '&size=5',
    };
  }

  if (concept.toolPaths?.length) {
    return {
      kind: 'tool',
      conceptId: concept.id,
      title: 'Thử nghiệm “' + concept.title + '”',
      detail: 'Nút này chưa có bài học trực tiếp; dùng công cụ liên kết để tạo trực giác trước.',
      to: concept.toolPaths[0],
    };
  }

  return {
    kind: 'inspect',
    conceptId: concept.id,
    title: 'Mở “' + concept.title + '” trên Knowledge Graph',
    detail: 'Đây là khoảng trống nội dung hiện tại. MathNexus vẫn chỉ rõ nút đang chặn lộ trình thay vì giả vờ đã có tài nguyên.',
    to: '/map?concept=' + encodeURIComponent(concept.id),
  };
}

export function buildLearningGoalState(progress: ProgressData, input: LearningGoal | null): LearningGoalState | null {
  const goal = normalizeLearningGoal(input);
  if (!goal) return null;

  const target = CONCEPT_BY_ID.get(goal.targetConceptId);
  if (!target) return null;

  const masteryById = new Map(allConceptMastery(progress).map(item => [item.conceptId, item]));
  const path = learningPathTo(target.id);
  const steps: LearningGoalStep[] = path.map(concept => {
    const mastery = masteryById.get(concept.id)!;
    return {
      concept,
      mastery,
      satisfied: stepSatisfied(progress, concept, mastery),
      lessonEvidence: lessonEvidence(progress, concept),
      questionCount: questionCountByConcept.get(concept.id) || 0,
    };
  });

  const targetStep = steps.find(step => step.concept.id === target.id)!;
  const satisfiedCount = steps.filter(step => step.satisfied).length;
  const complete = targetStep.satisfied;

  const satisfiedIds = new Set(steps.filter(step => step.satisfied).map(step => step.concept.id));
  const reachableUnsatisfied = steps.find(step =>
    !step.satisfied && step.concept.prerequisites.every(id => satisfiedIds.has(id))
  );
  const fallbackUnsatisfied = steps.find(step => !step.satisfied);
  const nextStep = reachableUnsatisfied || fallbackUnsatisfied;
  const nextAction = complete || !nextStep ? null : nextActionFor(nextStep, progress);

  const rawProgress = steps.length ? Math.round(satisfiedCount / steps.length * 100) : 0;
  const blocked = Boolean(nextStep && nextAction?.kind === 'inspect' && nextStep.concept.prerequisites.every(id => satisfiedIds.has(id)));

  return {
    goal,
    target,
    status: complete ? 'complete' : blocked ? 'blocked' : 'active',
    progressPercent: complete ? 100 : rawProgress,
    satisfiedCount,
    totalCount: steps.length,
    remainingCount: Math.max(0, steps.length - satisfiedCount),
    steps,
    nextAction,
  };
}

export function learningGoalTargets() {
  return MATH_CONCEPTS;
}
