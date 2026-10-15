import test from 'node:test';
import assert from 'node:assert/strict';
import { BKT_GUESS, BKT_INIT, BKT_LEARN, BKT_SLIP, bktUpdate, isMastered, seedMasteryFromHistory } from '../../src/utils/bkt.ts';
import { questionNeedsReview } from '../../src/utils/practiceInsights.ts';

test('BKT dung cong thuc OATutor', () => {
  // Dung dau tien tu 0.1: 0.1*0.9/(0.1*0.9+0.9*0.1)=0.5, +transit 0.1 -> 0.55
  assert.equal(bktUpdate(BKT_INIT, true), 0.55);
  // Sai dau tien: 0.1*0.1/(0.1*0.1+0.9*0.9)=0.01/0.82, +transit
  const afterMiss = bktUpdate(BKT_INIT, false);
  assert.ok(Math.abs(afterMiss - (0.01 / 0.82 + (1 - 0.01 / 0.82) * BKT_LEARN)) < 1e-12);
  // Gioi han [0,1] voi prior lac
  assert.ok(bktUpdate(2, true) <= 1);
  assert.ok(bktUpdate(-1, false) >= 0);
  assert.equal(BKT_SLIP, 0.1);
  assert.equal(BKT_GUESS, 0.1);
});

test('2 lan dung lien tiep dat nguong mastery 0.85', () => {
  let mastery = BKT_INIT;
  mastery = bktUpdate(mastery, true);
  assert.equal(isMastered(mastery), false);
  mastery = bktUpdate(mastery, true);
  assert.equal(isMastered(mastery), true);
});

test('truot tay 1 lan roi go lai ngay thi nhanh hon streak cung', () => {
  let mastery = 0.93;
  mastery = bktUpdate(mastery, false);
  assert.equal(isMastered(mastery), false);
  mastery = bktUpdate(mastery, true);
  assert.equal(isMastered(mastery), true);
});

test('seed du lieu cu giu danh sach on', () => {
  assert.equal(seedMasteryFromHistory({ attempts: 0 }), BKT_INIT);
  assert.ok(seedMasteryFromHistory({ attempts: 1, correct: 0, correctStreak: 0 }) < 0.85);
  assert.ok(seedMasteryFromHistory({ attempts: 1, correct: 1, correctStreak: 1 }) >= 0.85 - 1e-9);
  assert.ok(seedMasteryFromHistory({ attempts: 5, correct: 5, correctStreak: 5 }) >= 0.85);
});

test('needsReview tuong thich hanh vi cu', () => {
  assert.equal(questionNeedsReview(undefined), false);
  assert.equal(questionNeedsReview({ attempts: 0, correct: 0, correctStreak: 0, lastCorrect: false, updatedAt: '' }), false);
  // 1 lan sai -> on
  assert.equal(questionNeedsReview({ attempts: 1, correct: 0, correctStreak: 0, lastCorrect: false, updatedAt: '' }), true);
  // 1 lan dung, chua sai bao gio -> khong on (nhu cu)
  assert.equal(questionNeedsReview({ attempts: 1, correct: 1, correctStreak: 1, lastCorrect: true, updatedAt: '' }), false);
  // 2 lan dung lien tiep -> khong on
  assert.equal(questionNeedsReview({ attempts: 2, correct: 2, correctStreak: 2, lastCorrect: true, updatedAt: '', mastery: 0.93 }), false);
  // truot tay sau chuoi dung dai -> van vung, khong on (cai tien BKT)
  assert.equal(questionNeedsReview({ attempts: 6, correct: 5, correctStreak: 0, lastCorrect: false, updatedAt: '', mastery: 0.91 }), false);
});
