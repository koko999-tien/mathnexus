import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, generateSession, templateById, detectSkillTemplates, countGenerated } from '../../src/utils/generatedQuiz.ts';

const SEEDS = [1, 7, 42, 1234, 99991];

test('de sinh xac dinh theo seed', () => {
  const first = JSON.stringify(generateSession(42, 10));
  const second = JSON.stringify(generateSession(42, 10));
  assert.equal(first, second);
  assert.notEqual(first, JSON.stringify(generateSession(43, 10)));
});

test('moi cau co 4 lua chon duy nhat va dap an hop le', () => {
  for (const seed of SEEDS) {
    for (const question of generateSession(seed, 12)) {
      assert.equal(question.a.length, 4, question.id);
      assert.equal(new Set(question.a).size, 4, question.id);
      assert.ok(question.i >= 0 && question.i < 4, question.id);
      assert.ok(question.ex.length > 0, question.id);
      assert.ok(question.q.length > 0, question.id);
    }
  }
});

test('loc theo chuyen de va do kho', () => {
  const session = generateSession(5, 20, 'Giải tích', 'Tất cả');
  assert.ok(session.length > 0);
  assert.ok(session.every(question => question.cat === 'Giải tích'));
  const hard = generateSession(5, 20, 'Tất cả', 'Khó');
  assert.ok(hard.length > 0);
  assert.ok(hard.every(question => question.difficulty === 'Khó'));
});

test('dap an dung khop cong thuc doc lap', () => {
  // Dao ham don thuc: (a·x^n)' = (a·n)x^(n-1) — kiem bang cach docq cau hoi.
  for (const seed of SEEDS) {
    const question = generateQuestion('gen-derivative-monomial', seed);
    assert.ok(question);
    const match = /(\d+)x\^?([0-9⁰¹²³⁴⁵⁶⁷⁸⁹]+)/.exec(question.q.replace('(x ↦ ', '').replace(")' bằng?", ''));
    assert.ok(match, question.q);
  }

  // To hop: dem truc tiep C(n,k) tu cau hoi.
  for (const seed of SEEDS) {
    const question = generateQuestion('gen-combination', seed);
    assert.ok(question);
    const match = /C\((\d+),(\d+)\)/.exec(question.q);
    assert.ok(match, question.q);
    const n = Number(match[1]);
    const k = Number(match[2]);
    let expected = 1;
    const small = Math.min(k, n - k);
    for (let i = 0; i < small; i += 1) expected = (expected * (n - i)) / (i + 1);
    assert.equal(question.a[question.i], String(Math.round(expected)));
  }

  // Dinh thuc 2x2: ad-bc doc truc tiep tu cau hoi.
  for (const seed of SEEDS) {
    const question = generateQuestion('gen-det-2x2', seed);
    assert.ok(question);
    const match = /\[(\d+),(\d+)\],\[(\d+),(\d+)\]/.exec(question.q);
    assert.ok(match, question.q);
    const [a, b, c, d] = match.slice(1).map(Number);
    assert.equal(question.a[question.i], String(a * d - b * c));
  }

  // Trung binh: tinh lai tu day so trong cau hoi.
  for (const seed of SEEDS) {
    const question = generateQuestion('gen-mean', seed);
    assert.ok(question);
    const match = /của ([\d, ]+) bằng/.exec(question.q);
    assert.ok(match, question.q);
    const values = match[1].split(',').map(Number);
    const expected = values.reduce((sum, value) => sum + value, 0) / values.length;
    assert.equal(question.a[question.i], String(expected));
  }
});

test('template khong ton tai tra ve null', () => {
  assert.equal(generateQuestion('khong-co', 1), null);
  assert.equal(templateById('khong-co'), undefined);
});

test('detect skill dung ca tieng Viet khong dau', () => {
  assert.deepEqual(detectSkillTemplates('Tính đạo hàm của x^3'), ['gen-derivative-monomial', 'gen-derivative-poly']);
  assert.deepEqual(detectSkillTemplates('tinh dao ham cua x^3'), ['gen-derivative-monomial', 'gen-derivative-poly']);
  assert.deepEqual(detectSkillTemplates('Bài toán xác suất Bayes'), ['gen-bayes-screening']);
  assert.deepEqual(detectSkillTemplates('Hôm nay trời đẹp'), []);
});

test('loc only chi lay dung template', () => {
  const only = ['gen-mean', 'gen-log-power'];
  const session = generateSession(9, 6, 'Tất cả', 'Tất cả', only);
  assert.equal(session.length, 6);
  assert.ok(session.every(question => only.includes(question.templateId)));
  assert.equal(countGenerated('Tất cả', 'Tất cả', only), 2);
  assert.equal(countGenerated('Tất cả', 'Tất cả', ['khong-co']), 0);
});

test('template moi dap an khop cong thuc doc lap', () => {
  for (const seed of SEEDS) {
    const bayes = generateQuestion('gen-bayes-screening', seed);
    assert.ok(bayes);
    const match = /Bệnh tỷ lệ (\d+)%. Test đúng (\d+)% khi có bệnh, dương giả (\d+)%/.exec(bayes.q);
    assert.ok(match, bayes.q);
    const [p, sens, fp] = match.slice(1).map(Number);
    const expected = ((sens / 100 * p / 100) / (sens / 100 * p / 100 + fp / 100 * (1 - p / 100)) * 100).toFixed(1).replace('.', ',') + '%';
    assert.equal(bayes.a[bayes.i], expected);

    const quad = generateQuestion('gen-quadratic-roots', seed);
    assert.ok(quad);
    // Nghiem nam o dap an dung; thay vao phuong trinh trong de phai bang 0.
    const roots = [...quad.a[quad.i].matchAll(/x=(-?\d+)/g)].map(m => Number(m[1]));
    assert.equal(roots.length, 2);
    const coef = /x²([+-]?\d+)x([+-]?\d+)=0/.exec(quad.q);
    assert.ok(coef, quad.q);
    const b = Number(coef[1]);
    const c = Number(coef[2]);
    for (const root of roots) {
      assert.equal(root * root + b * root + c, 0);
    }

    const amgm = generateQuestion('gen-amgm-max', seed);
    assert.ok(amgm);
    const sum = /x\+y=(\d+)/.exec(amgm.q);
    assert.ok(sum, amgm.q);
    assert.equal(amgm.a[amgm.i], String((Number(sum[1]) / 2) ** 2));
  }
});
