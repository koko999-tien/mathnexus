import { MATH_CONCEPTS } from '../data/mathKnowledge.ts';
import { conceptMastery, masteryLabel } from './conceptMastery.ts';
import { normalizeSearch } from './search.ts';
import type { KnowledgeHit } from './knowledgeSearch.ts';
import type { ProgressData } from './storage.ts';

export type TutorMode =
  | 'DISCOVER'
  | 'GUIDED_HINT'
  | 'CONCEPT_EXPLANATION'
  | 'PROOF_GUIDANCE'
  | 'ERROR_DIAGNOSIS'
  | 'VISUAL_INTUITION'
  | 'DIRECT_SOLUTION';

export type TutorModePreference = 'AUTO' | TutorMode;

export interface TutorPlan {
  mode: TutorMode;
  directSolutionAllowed: boolean;
  anchorConceptIds: string[];
  masterySummary: string;
  strategy: string;
  localOpening: string;
}

const DIRECT_PATTERNS = [
  /giai day du/,
  /loi giai hoan chinh/,
  /cho dap an/,
  /dap an cuoi/,
  /dap so/,
  /giai ra/,
  /lam ho toi/,
];

const HINT_PATTERNS = [/goi y/, /huong dan tung buoc/, /dung cho dap an/, /khong cho dap an/];
const PROOF_PATTERNS = [/chung minh/, /proof/, /vi sao dinh ly/, /tai sao dung/];
const ERROR_PATTERNS = [/sai o dau/, /kiem tra bai/, /kiem tra loi/, /loi sai/, /minh lam.*sai/, /tai sao sai/];
const VISUAL_PATTERNS = [/truc quan/, /hinh dung/, /ve hinh/, /mo phong/, /do thi/, /minh hoa/];
const DISCOVER_PATTERNS = [/nen hoc/, /hoc gi truoc/, /bat dau tu dau/, /lo trinh/, /tien quyet/, /minh yeu/];
const EXPLAIN_PATTERNS = [/la gi/, /giai thich/, /khai niem/, /y nghia/, /cong thuc/];

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some(pattern => pattern.test(value));
}

export function detectTutorMode(question: string): TutorMode {
  const normalized = normalizeSearch(question);

  if (matchesAny(normalized, DIRECT_PATTERNS)) return 'DIRECT_SOLUTION';
  if (matchesAny(normalized, ERROR_PATTERNS)) return 'ERROR_DIAGNOSIS';
  if (matchesAny(normalized, PROOF_PATTERNS)) return 'PROOF_GUIDANCE';
  if (matchesAny(normalized, VISUAL_PATTERNS)) return 'VISUAL_INTUITION';
  if (matchesAny(normalized, HINT_PATTERNS)) return 'GUIDED_HINT';
  if (matchesAny(normalized, DISCOVER_PATTERNS)) return 'DISCOVER';
  if (matchesAny(normalized, EXPLAIN_PATTERNS)) return 'CONCEPT_EXPLANATION';
  return 'GUIDED_HINT';
}

function uniqueConceptIds(hits: readonly KnowledgeHit[]) {
  return [...new Set(hits.map(hit => hit.conceptId).filter((id): id is string => Boolean(id)))].slice(0, 4);
}

function masteryContext(progress: ProgressData, conceptIds: string[]) {
  if (!conceptIds.length) {
    return {
      summary: 'Chưa xác định được concept neo từ truy xuất cục bộ.',
      weakestConceptId: null as string | null,
    };
  }

  const rows = conceptIds.map(id => {
    try {
      const mastery = conceptMastery(progress, id);
      const concept = MATH_CONCEPTS.find(item => item.id === id);
      return {
        id,
        title: concept?.title || id,
        mastery,
      };
    } catch {
      return null;
    }
  }).filter((row): row is NonNullable<typeof row> => Boolean(row));

  const summary = rows.length
    ? rows.map(row => {
        const score = row.mastery.score === null ? 'chưa có điểm' : row.mastery.score + '%';
        return `${row.title}: ${score}, ${masteryLabel(row.mastery.state)}, độ tin cậy ${row.mastery.confidence}%`;
      }).join('; ')
    : 'Chưa có bằng chứng mastery cho concept liên quan.';

  const weakest = [...rows].sort((a, b) => {
    const aScore = a.mastery.score ?? -1;
    const bScore = b.mastery.score ?? -1;
    if (aScore !== bScore) return aScore - bScore;
    return a.mastery.confidence - b.mastery.confidence;
  })[0];

  return {
    summary,
    weakestConceptId: weakest?.id || null,
  };
}

function prerequisitePrompt(conceptId: string | null) {
  if (!conceptId) return '';
  const concept = MATH_CONCEPTS.find(item => item.id === conceptId);
  if (!concept?.prerequisites.length) return '';

  const names = concept.prerequisites
    .map(id => MATH_CONCEPTS.find(item => item.id === id)?.title)
    .filter((title): title is string => Boolean(title))
    .slice(0, 3);

  return names.length
    ? `Trước khi đi sâu, kiểm tra nhanh nền tảng: ${names.join(', ')}.`
    : '';
}

export function buildTutorPlan(
  question: string,
  hits: readonly KnowledgeHit[],
  progress: ProgressData,
  preference: TutorModePreference = 'AUTO',
): TutorPlan {
  const detected = detectTutorMode(question);
  const mode = preference === 'AUTO' ? detected : preference;
  const normalized = normalizeSearch(question);
  const explicitSolution = matchesAny(normalized, DIRECT_PATTERNS);
  const directSolutionAllowed = mode === 'DIRECT_SOLUTION' || explicitSolution;
  const anchorConceptIds = uniqueConceptIds(hits);
  const mastery = masteryContext(progress, anchorConceptIds);
  const prerequisite = prerequisitePrompt(mastery.weakestConceptId);

  const strategyByMode: Record<TutorMode, string> = {
    DISCOVER: 'Giúp người học xác định concept đích, tiên quyết và một bước học tiếp theo. Hỏi một câu kiểm tra nền tảng trước khi đề xuất lộ trình.',
    GUIDED_HINT: 'Không đưa lời giải hoàn chỉnh ngay. Cho đúng một gợi ý có giá trị, rồi hỏi người học thử bước kế tiếp. Chỉ tăng độ trực tiếp theo tiến triển hội thoại.',
    CONCEPT_EXPLANATION: 'Giải thích trực giác trước, sau đó định nghĩa/công thức, rồi đưa một ví dụ nhỏ và một câu hỏi kiểm tra hiểu.',
    PROOF_GUIDANCE: 'Tách mục tiêu chứng minh, giả thiết và công cụ khả dụng. Gợi ý lemma hoặc hướng biến đổi kế tiếp, không nhảy thẳng tới toàn bộ chứng minh trừ khi người dùng yêu cầu rõ.',
    ERROR_DIAGNOSIS: 'Xác định bước sai cụ thể, giải thích vì sao sai, giữ lại phần đúng và yêu cầu người học sửa đúng một bước trước khi tiếp tục.',
    VISUAL_INTUITION: 'Ưu tiên hình dung hình học, đồ thị, chuyển động hoặc phản ví dụ trực quan; sau đó mới nối sang ký hiệu và công thức.',
    DIRECT_SOLUTION: 'Được phép đưa lời giải đầy đủ vì người dùng yêu cầu trực tiếp. Vẫn trình bày từng bước, nêu điểm then chốt và tự kiểm tra kết quả.',
  };

  let localOpening = '';
  if (mode === 'DIRECT_SOLUTION') {
    localOpening = 'Bạn đã yêu cầu lời giải đầy đủ, nên MathNexus có thể đi thẳng vào lời giải từng bước.';
  } else if (mode === 'ERROR_DIAGNOSIS') {
    localOpening = 'Hãy xác định chính xác bước bạn nghi ngờ nhất; MathNexus sẽ giữ lại phần đúng và sửa từ điểm sai đầu tiên.';
  } else if (mode === 'PROOF_GUIDANCE') {
    localOpening = 'Trước hết hãy tách rõ giả thiết và điều phải chứng minh; sau đó chọn đúng định nghĩa hoặc định lý nối hai phía.';
  } else if (mode === 'VISUAL_INTUITION') {
    localOpening = 'Hãy thử mô tả đối tượng bằng hình ảnh, chuyển động hoặc đồ thị trước khi dùng công thức.';
  } else if (mode === 'DISCOVER') {
    localOpening = prerequisite || 'Hãy xác định concept đích trước, rồi kiểm tra một mắt xích tiên quyết gần nhất.';
  } else if (mode === 'CONCEPT_EXPLANATION') {
    localOpening = 'Bắt đầu bằng câu hỏi: đại lượng này đang mô tả điều gì và thay đổi ra sao? Sau trực giác mới gắn ký hiệu.';
  } else {
    localOpening = prerequisite || 'Mình sẽ cho một gợi ý trước, rồi bạn thử bước tiếp theo thay vì nhận ngay toàn bộ đáp án.';
  }

  return {
    mode,
    directSolutionAllowed,
    anchorConceptIds,
    masterySummary: mastery.summary,
    strategy: strategyByMode[mode],
    localOpening,
  };
}

export function tutorModeLabel(mode: TutorMode | TutorModePreference) {
  const labels: Record<TutorMode | TutorModePreference, string> = {
    AUTO: 'Tự động',
    DISCOVER: 'Khám phá',
    GUIDED_HINT: 'Gợi ý Socratic',
    CONCEPT_EXPLANATION: 'Giải thích khái niệm',
    PROOF_GUIDANCE: 'Dẫn chứng minh',
    ERROR_DIAGNOSIS: 'Chẩn đoán lỗi',
    VISUAL_INTUITION: 'Trực quan',
    DIRECT_SOLUTION: 'Lời giải đầy đủ',
  };
  return labels[mode];
}
