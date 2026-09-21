import { MATH_CONCEPTS, type MathConcept } from '../data/mathKnowledge.ts';
import { QUIZ_CONCEPT_MAP } from '../data/mathOntology.ts';
import type { ExplorationSummary } from '../exploration/explorationState.ts';
import { allConceptMastery } from './conceptMastery.ts';
import { conceptForLesson, conceptProgress } from './knowledgeGraph.ts';
import type { ProgressData } from './storage.ts';

export type LearningCompassKind = 'repair' | 'assess' | 'advance' | 'explore';

export interface LearningCompassItem {
  kind: LearningCompassKind;
  conceptId?: string;
  title: string;
  detail: string;
  to: string;
  score: number;
}

const questionIdsByConcept = Object.entries(QUIZ_CONCEPT_MAP).reduce((map, [questionId, conceptId]) => {
  const current = map.get(conceptId) || [];
  current.push(questionId);
  map.set(conceptId, current);
  return map;
}, new Map<string, string[]>());

function unreadLesson(concept: MathConcept, progress: ProgressData) {
  return concept.lessonIds?.find(id => !progress.lessonsRead.includes(id));
}

function conceptHref(conceptId: string) {
  return '/map?concept=' + encodeURIComponent(conceptId);
}

function practiceHref(conceptId: string) {
  const mapped = questionIdsByConcept.get(conceptId)?.length || 0;
  return mapped
    ? '/practice?concept=' + encodeURIComponent(conceptId) + '&mode=review&size=5'
    : conceptHref(conceptId);
}

export function buildLearningCompass(
  progress: ProgressData,
  exploration: ExplorationSummary,
  limit = 3,
): LearningCompassItem[] {
  const result: LearningCompassItem[] = [];
  const usedConceptIds = new Set<string>();
  const progressItems = conceptProgress(progress);
  const progressById = new Map(progressItems.map(item => [item.concept.id, item]));
  const mastery = allConceptMastery(progress);
  const lastConcept = progress.lastLesson ? conceptForLesson(progress.lastLesson) : undefined;

  const weakest = mastery
    .filter(item => item.score !== null && item.confidence >= 20 && (item.score || 0) < 70)
    .sort((a, b) => (a.score || 0) - (b.score || 0) || b.confidence - a.confidence)
    .find(item => MATH_CONCEPTS.some(concept => concept.id === item.conceptId));

  if (weakest) {
    const concept = MATH_CONCEPTS.find(item => item.id === weakest.conceptId)!;
    usedConceptIds.add(concept.id);
    result.push({
      kind: 'repair',
      conceptId: concept.id,
      title: 'Củng cố “' + concept.title + '”',
      detail: 'Bằng chứng hiện tại ' + weakest.score + '% · độ tin cậy ' + weakest.confidence + '%. Ưu tiên vá điểm yếu trước khi mở rộng.',
      to: practiceHref(concept.id),
      score: 100 - (weakest.score || 0) + weakest.confidence / 10,
    });
  } else {
    const assessable = mastery
      .filter(item => item.score === null && (questionIdsByConcept.get(item.conceptId)?.length || 0) > 0)
      .map(item => ({ item, graph: progressById.get(item.conceptId) }))
      .filter(entry => entry.graph?.state === 'ready')
      .sort((a, b) => (a.graph?.depth || 0) - (b.graph?.depth || 0))[0];

    if (assessable) {
      const concept = MATH_CONCEPTS.find(item => item.id === assessable.item.conceptId)!;
      usedConceptIds.add(concept.id);
      result.push({
        kind: 'assess',
        conceptId: concept.id,
        title: 'Đo mức hiểu “' + concept.title + '”',
        detail: 'Chưa có đủ bằng chứng để ước lượng mastery. Một phiên ngắn sẽ tạo tín hiệu trước khi hệ thống khuyên sâu hơn.',
        to: '/practice?concept=' + encodeURIComponent(concept.id) + '&size=5',
        score: 55,
      });
    } else {
      result.push({
        kind: 'assess',
        title: 'Tạo tín hiệu học tập đầu tiên',
        detail: 'Chưa có điểm yếu đủ chắc để kết luận. Làm một phiên 5 câu để MathNexus có dữ liệu thật thay vì đoán.',
        to: '/practice?size=5',
        score: 45,
      });
    }
  }

  const advance = progressItems
    .filter(item => item.state === 'ready' && !usedConceptIds.has(item.concept.id))
    .map(item => {
      const lessonId = unreadLesson(item.concept, progress);
      const sameDomain = lastConcept && item.concept.domain === lastConcept.domain ? 1 : 0;
      const visitCount = exploration.conceptVisits[item.concept.id] || 0;
      return {
        item,
        lessonId,
        score: (lessonId ? 50 : 0) + sameDomain * 24 + Math.min(visitCount, 4) * 2 - item.depth,
      };
    })
    .filter(entry => Boolean(entry.lessonId))
    .sort((a, b) => b.score - a.score || a.item.depth - b.item.depth || a.item.concept.title.localeCompare(b.item.concept.title, 'vi'))[0];

  if (advance?.lessonId) {
    usedConceptIds.add(advance.item.concept.id);
    result.push({
      kind: 'advance',
      conceptId: advance.item.concept.id,
      title: 'Tiến tới “' + advance.item.concept.title + '”',
      detail: advance.item.concept.prerequisites.length
        ? 'Các tiên quyết trực tiếp đã có đủ bằng chứng bài học. Đây là bước tiếp theo hợp lệ trong Knowledge Graph.'
        : 'Đây là một nút nền tảng đang sẵn sàng và có bài học trực tiếp để bắt đầu.',
      to: '/lesson/' + advance.lessonId,
      score: advance.score,
    });
  }

  const discovered = new Set(exploration.discoveredConceptIds);
  const explore = progressItems
    .filter(item => (item.state === 'ready' || item.state === 'gap') && !usedConceptIds.has(item.concept.id))
    .map(item => {
      const visits = exploration.conceptVisits[item.concept.id] || 0;
      const unseen = discovered.has(item.concept.id) ? 0 : 1;
      const hasInteractive = item.concept.toolPaths?.length ? 1 : 0;
      const hasFormula = item.concept.formulaIds?.length ? 1 : 0;
      const domainNovelty = lastConcept && item.concept.domain !== lastConcept.domain ? 1 : 0;
      return {
        item,
        visits,
        score: unseen * 45 + hasInteractive * 18 + hasFormula * 8 + domainNovelty * 6 - Math.min(visits, 10) - item.depth,
      };
    })
    .sort((a, b) => b.score - a.score || a.visits - b.visits || a.item.depth - b.item.depth)[0];

  if (explore) {
    usedConceptIds.add(explore.item.concept.id);
    result.push({
      kind: 'explore',
      conceptId: explore.item.concept.id,
      title: discovered.has(explore.item.concept.id)
        ? 'Quay lại “' + explore.item.concept.title + '”'
        : 'Khám phá “' + explore.item.concept.title + '”',
      detail: discovered.has(explore.item.concept.id)
        ? 'Khái niệm này ít được quay lại. Mở bản đồ để nối nó với tiên quyết, công thức và công cụ liên quan.'
        : 'Exploration State chưa ghi nhận bạn mở nút này. Đây là vùng đủ gần để khám phá mà không phá thứ tự tiên quyết.',
      to: conceptHref(explore.item.concept.id),
      score: explore.score,
    });
  } else {
    result.push({
      kind: 'explore',
      title: 'Bay vào Math Cosmos',
      detail: 'Khi không còn nút sẵn sàng nào đủ khác biệt, hãy khám phá toàn cảnh để tìm một câu hỏi mới thay vì học theo danh sách.',
      to: '/cosmos',
      score: 20,
    });
  }

  return result.slice(0, Math.max(1, Math.min(4, limit)));
}
