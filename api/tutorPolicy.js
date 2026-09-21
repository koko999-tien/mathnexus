export const TUTOR_MODES = new Set([
  'DISCOVER',
  'GUIDED_HINT',
  'CONCEPT_EXPLANATION',
  'PROOF_GUIDANCE',
  'ERROR_DIAGNOSIS',
  'VISUAL_INTUITION',
  'DIRECT_SOLUTION',
]);

export function normalizeTutor(tutor) {
  if (!tutor || typeof tutor !== 'object' || Array.isArray(tutor)) return null;

  const mode = TUTOR_MODES.has(tutor.mode) ? tutor.mode : 'GUIDED_HINT';
  const strategy = typeof tutor.strategy === 'string' ? tutor.strategy.trim().slice(0, 1200) : '';
  const masterySummary = typeof tutor.masterySummary === 'string' ? tutor.masterySummary.trim().slice(0, 1800) : '';
  const anchorConceptIds = Array.isArray(tutor.anchorConceptIds)
    ? tutor.anchorConceptIds
        .filter(id => typeof id === 'string')
        .slice(0, 6)
        .map(id => id.slice(0, 100))
    : [];

  return {
    mode,
    directSolutionAllowed: tutor.directSolutionAllowed === true || mode === 'DIRECT_SOLUTION',
    strategy,
    masterySummary,
    anchorConceptIds,
  };
}

export function tutorInstruction(tutor) {
  if (!tutor) return '';

  const modeRules = {
    DISCOVER: 'Xác định mục tiêu và tiên quyết. Hỏi một câu kiểm tra nền tảng rồi đề xuất bước học tiếp theo.',
    GUIDED_HINT: 'Đưa đúng một gợi ý có ích và một câu hỏi tiếp theo. Không đưa toàn bộ lời giải trong lượt đầu trừ khi người dùng yêu cầu trực tiếp.',
    CONCEPT_EXPLANATION: 'Giải thích trực giác trước, sau đó định nghĩa/công thức, một ví dụ ngắn và một câu hỏi kiểm tra hiểu.',
    PROOF_GUIDANCE: 'Tách giả thiết, kết luận và công cụ. Gợi ý bước/lemma tiếp theo; chỉ đưa chứng minh đầy đủ khi được yêu cầu rõ.',
    ERROR_DIAGNOSIS: 'Chỉ ra bước sai đầu tiên, giải thích vì sao, giữ lại phần đúng và yêu cầu sửa một bước cụ thể.',
    VISUAL_INTUITION: 'Ưu tiên hình dung, đồ thị, chuyển động hoặc phản ví dụ trực quan trước ký hiệu.',
    DIRECT_SOLUTION: 'Đưa lời giải đầy đủ từng bước vì người dùng yêu cầu, nêu ý chính và tự kiểm tra kết quả.',
  };

  const directRule = tutor.directSolutionAllowed
    ? 'Lượt này được phép đưa đáp án/lời giải đầy đủ nếu phù hợp.'
    : 'Lượt này không nên đưa lời giải hoàn chỉnh ngay; ưu tiên dẫn dắt từng bước.';

  return [
    'Chiến lược gia sư cho lượt này:',
    `- Mode: ${tutor.mode}`,
    `- Quy tắc: ${modeRules[tutor.mode]}`,
    `- Direct solution: ${directRule}`,
    tutor.strategy ? `- Planner strategy: ${tutor.strategy}` : '',
    tutor.masterySummary ? `- Bằng chứng học tập cục bộ: ${tutor.masterySummary}` : '',
    tutor.anchorConceptIds.length ? `- Concept neo: ${tutor.anchorConceptIds.join(', ')}` : '',
    '- Chỉ dùng mastery như bằng chứng học tập có giới hạn; nếu thiếu bằng chứng, nói là chưa đánh giá thay vì suy đoán.',
  ].filter(Boolean).join('\n');
}
