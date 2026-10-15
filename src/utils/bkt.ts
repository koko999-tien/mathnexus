// Bayesian Knowledge Tracing gọn (theo OATutor, CHI'23):
// P(nắm vững) cập nhật sau mỗi lượt đúng/sai, chịu được đoán mò (guess)
// và trượt tay (slip) thay vì reset cứng như streak liên tiếp.
export const BKT_INIT = 0.1;
export const BKT_LEARN = 0.1;
export const BKT_SLIP = 0.1;
export const BKT_GUESS = 0.1;
export const BKT_MASTERY_THRESHOLD = 0.85;

export function bktUpdate(prior: number, correct: boolean): number {
  const clamped = Math.max(0, Math.min(1, prior));
  const posterior = correct
    ? (clamped * (1 - BKT_SLIP)) / (clamped * (1 - BKT_SLIP) + (1 - clamped) * BKT_GUESS)
    : (clamped * BKT_SLIP) / (clamped * BKT_SLIP + (1 - clamped) * (1 - BKT_GUESS));
  return posterior + (1 - posterior) * BKT_LEARN;
}

// Dữ liệu cũ chưa có mastery: suy ra điểm khởi đầu từ lịch sử gộp
// để không mất danh sách ôn hiện tại của người dùng.
export function seedMasteryFromHistory(stat: { attempts?: number; correct?: number; correctStreak?: number }): number {
  const attempts = stat.attempts || 0;
  if (attempts === 0) return BKT_INIT;
  if ((stat.correctStreak || 0) >= 2) return 0.92;
  const accuracy = Math.min(1, (stat.correct || 0) / attempts);
  return Math.max(0.05, Math.min(0.9, 0.15 + 0.7 * accuracy));
}

export function isMastered(mastery: number): boolean {
  return mastery >= BKT_MASTERY_THRESHOLD;
}
