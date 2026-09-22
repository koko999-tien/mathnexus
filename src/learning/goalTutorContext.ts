import type { ProgressData } from '../utils/storage.ts';
import { buildLearningGoalState, type LearningGoal } from './learningGoal.ts';

export interface GoalTutorContext {
  targetConceptId: string;
  targetTitle: string;
  status: 'active' | 'complete' | 'blocked';
  progressPercent: number;
  text: string;
  anchorConceptIds: string[];
  links: { to: string; label: string }[];
}

export function buildGoalTutorContext(
  progress: ProgressData,
  goal: LearningGoal | null,
): GoalTutorContext | null {
  const state = buildLearningGoalState(progress, goal);
  if (!state) return null;

  const unsatisfied = state.steps.filter(step => !step.satisfied);
  const nextConceptId = state.nextAction?.conceptId;
  const anchorConceptIds = [
    state.target.id,
    ...(nextConceptId ? [nextConceptId] : []),
    ...unsatisfied.map(step => step.concept.id),
  ].filter((id, index, all) => all.indexOf(id) === index).slice(0, 6);

  const missingNames = unsatisfied.slice(0, 5).map(step => step.concept.title);
  const lines = [
    'Mục tiêu học tập người dùng đã chủ động đặt: ' + state.target.title + ' (' + state.target.id + ').',
    'Tiến độ theo evidence: ' + state.progressPercent + '% · ' + state.satisfiedCount + '/' + state.totalCount + ' nút có bằng chứng.',
    state.status === 'complete'
      ? 'Trạng thái mục tiêu: đã có đủ bằng chứng trực tiếp.'
      : state.status === 'blocked'
        ? 'Trạng thái mục tiêu: đang bị chặn bởi một khoảng trống nội dung trong Knowledge Graph.'
        : 'Trạng thái mục tiêu: đang hoạt động.',
    state.nextAction
      ? 'Bước được Learning Goal Engine đề xuất: ' + state.nextAction.title + '. ' + state.nextAction.detail
      : 'Learning Goal Engine hiện không yêu cầu thêm bước bắt buộc.',
    missingNames.length
      ? 'Các nút chưa đủ bằng chứng gần mục tiêu: ' + missingNames.join(', ') + '.'
      : 'Không còn nút thiếu bằng chứng trên lộ trình hiện tại.',
    'Không được tự thay đổi mục tiêu này; chỉ dùng nó làm ngữ cảnh nếu phù hợp với câu hỏi hiện tại.',
  ];

  const links = [
    { to: '/map?concept=' + encodeURIComponent(state.target.id), label: 'Mục tiêu: ' + state.target.title },
    ...(state.nextAction ? [{ to: state.nextAction.to, label: 'Bước tiếp theo: ' + state.nextAction.title }] : []),
  ].filter((link, index, all) => all.findIndex(item => item.to === link.to) === index);

  return {
    targetConceptId: state.target.id,
    targetTitle: state.target.title,
    status: state.status,
    progressPercent: state.progressPercent,
    text: lines.join('\n'),
    anchorConceptIds,
    links,
  };
}
