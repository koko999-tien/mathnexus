import type { Quiz, QuizDifficulty } from '../data/quiz';

// Sinh đề luyện tập vô hạn ngay trên máy, không cần mạng hay AI.
// Mỗi template là một kỹ năng: đáp án tính chính xác bằng công thức,
// đáp án nhiễu là lỗi sai điển hình của học sinh (dấu, quên hệ số...).
// Seed cố định → đề tái lập được; id theo template để lịch sử ôn
// theo kỹ năng chứ không theo từng con số cụ thể.

export interface GeneratedQuiz extends Quiz {
  templateId: string;
}

interface Template {
  id: string;
  cat: string;
  difficulty: QuizDifficulty;
  make: (rng: Rng) => { q: string; options: string[]; correct: number; ex: string };
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const SUP: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

function sup(n: number): string {
  return String(n).split('').map(ch => SUP[ch] || ch).join('');
}

function term(coef: number, variable: string, power: number, first: boolean): string {
  if (coef === 0) return '';
  const abs = Math.abs(coef);
  const body = power === 0 ? String(abs) : power === 1 ? `${abs === 1 ? '' : abs}${variable}` : `${abs === 1 ? '' : abs}${variable}${sup(power)}`;
  if (first) return (coef < 0 ? '−' : '') + body;
  return (coef < 0 ? ' − ' : ' + ') + body;
}

function poly(coefs: number[], variable: string): string {
  const parts = coefs.map((coef, index) => term(coef, variable, coefs.length - 1 - index, index === 0)).filter(Boolean);
  return parts.length ? parts.join('') : '0';
}

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

function combinations(n: number, k: number): number {
  const small = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < small; i += 1) result = (result * (n - i)) / (i + 1);
  return Math.round(result);
}

function uniqueOptions(rng: Rng, correct: string, distractors: string[]): { options: string[]; correct: number } {
  const pool = [...new Set([correct, ...distractors])].slice(0, 4);
  let filler = 0;
  while (pool.length < 4) {
    filler += 1;
    const candidate = `${correct} (${filler})`;
    if (!pool.includes(candidate)) pool.push(candidate);
  }
  const options = shuffle(rng, pool);
  return { options, correct: options.indexOf(correct) };
}

const TEMPLATES: Template[] = [
  {
    id: 'gen-derivative-monomial',
    cat: 'Giải tích',
    difficulty: 'Cơ bản',
    make: rng => {
      const a = int(rng, 2, 6);
      const n = int(rng, 3, 5);
      const correct = `${a * n}x${sup(n - 1)}`;
      const { options, correct: i } = uniqueOptions(rng, correct, [`${a}x${sup(n - 1)}`, `${a * n}x${sup(n)}`, `${a}x${sup(n)}`]);
      return { q: `(x ↦ ${a}x${sup(n)})′ bằng?`, options, correct: i, ex: `(xⁿ)′=nxⁿ⁻¹ nên (${a}x${sup(n)})′=${a}·${n}x${sup(n - 1)}=${correct}.` };
    },
  },
  {
    id: 'gen-derivative-poly',
    cat: 'Giải tích',
    difficulty: 'Vừa',
    make: rng => {
      const a = int(rng, 1, 4);
      const b = pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
      const c = int(rng, -6, 6);
      const correct = poly([2 * a, b], 'x');
      const { options, correct: i } = uniqueOptions(rng, correct, [poly([a, b], 'x'), poly([2 * a, -b], 'x'), poly([2 * a, b, c], 'x')]);
      return { q: `(${poly([a, b, c], 'x')})′ bằng?`, options, correct: i, ex: `Đạo hàm từng hạng tử: (${a}x²)′=${2 * a}x, hằng số ${c} đạo hàm bằng 0 nên đáp án ${correct}.` };
    },
  },
  {
    id: 'gen-combination',
    cat: 'Tổ hợp',
    difficulty: 'Cơ bản',
    make: rng => {
      const n = int(rng, 5, 8);
      const k = int(rng, 2, 3);
      const correct = String(combinations(n, k));
      const { options, correct: i } = uniqueOptions(rng, correct, [String(n * k), String(factorial(n) / factorial(n - k)), String(combinations(n, k) + 1)]);
      return { q: `C(${n},${k}) bằng?`, options, correct: i, ex: `C(${n},${k})=${n}!/(${k}!${n - k}!)=${correct}.` };
    },
  },
  {
    id: 'gen-factorial',
    cat: 'Tổ hợp',
    difficulty: 'Cơ bản',
    make: rng => {
      const n = int(rng, 4, 6);
      const correct = String(factorial(n));
      const { options, correct: i } = uniqueOptions(rng, correct, [String(factorial(n - 1)), String(n * n), String(factorial(n) + n)]);
      return { q: `${n}! bằng?`, options, correct: i, ex: `${n}!=${Array.from({ length: n }, (_, k) => n - k).join('·')}=${correct}.` };
    },
  },
  {
    id: 'gen-det-2x2',
    cat: 'Đại số tuyến tính',
    difficulty: 'Vừa',
    make: rng => {
      const [a, b, c, d] = [int(rng, 1, 5), int(rng, 1, 5), int(rng, 1, 5), int(rng, 1, 5)];
      const correct = String(a * d - b * c);
      const { options, correct: i } = uniqueOptions(rng, correct, [String(a * d + b * c), String(a * d), String(b * c - a * d)]);
      return { q: `det([${a},${b}],[${c},${d}]) bằng?`, options, correct: i, ex: `Định thức 2×2 là ad−bc=${a}·${d}−${b}·${c}=${correct}.` };
    },
  },
  {
    id: 'gen-complex-modulus',
    cat: 'Số phức',
    difficulty: 'Cơ bản',
    make: rng => {
      const [a, b, expected] = pick(rng, [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15]] as const);
      const correct = String(expected);
      const { options, correct: i } = uniqueOptions(rng, correct, [String(a + b), String(a * b), String(expected + 1)]);
      return { q: `|${a}+${b}i| bằng?`, options, correct: i, ex: `|${a}+${b}i|=√(${a}²+${b}²)=√${a * a + b * b}=${correct}.` };
    },
  },
  {
    id: 'gen-mean',
    cat: 'Thống kê',
    difficulty: 'Cơ bản',
    make: rng => {
      const mean = int(rng, 4, 12);
      const n = 4;
      const start = mean - int(rng, 1, 3);
      const values = Array.from({ length: n }, (_, k) => start + k * 2);
      const actual = values.reduce((sum, value) => sum + value, 0) / n;
      const correct = String(actual);
      const { options, correct: i } = uniqueOptions(rng, correct, [String(actual + 1), String(actual - 1), String(actual * 2)]);
      return { q: `Trung bình của ${values.join(', ')} bằng?`, options, correct: i, ex: `(${values.join('+')})/${n}=${values.reduce((sum, value) => sum + value, 0)}/${n}=${correct}.` };
    },
  },
  {
    id: 'gen-log-power',
    cat: 'Đại số',
    difficulty: 'Cơ bản',
    make: rng => {
      const base = pick(rng, [2, 3, 5]);
      const k = int(rng, 2, 4);
      const correct = String(k);
      const { options, correct: i } = uniqueOptions(rng, correct, [String(base), String(k + 1), String(base ** k)]);
      return { q: `log_${base}${base ** k} bằng?`, options, correct: i, ex: `Vì ${base}${sup(k)}=${base ** k} nên log_${base}${base ** k}=${correct}.` };
    },
  },
  {
    id: 'gen-abs-equation',
    cat: 'Đại số',
    difficulty: 'Vừa',
    make: rng => {
      const a = int(rng, 1, 6);
      const b = int(rng, 2, 6);
      const sols = [a + b, a - b].sort((x, y) => x - y);
      const correct = `x=${sols[0]} hoặc x=${sols[1]}`;
      const { options, correct: i } = uniqueOptions(rng, correct, [`x=${a + b}`, `x=${a - b}`, `Vô nghiệm`]);
      return { q: `Nghiệm của |x−${a}|=${b}?`, options, correct: i, ex: `x−${a}=${b} hoặc x−${a}=−${b} nên ${correct}.` };
    },
  },
  {
    id: 'gen-trig-special',
    cat: 'Lượng giác',
    difficulty: 'Cơ bản',
    make: rng => {
      const [angle, fn, correct] = pick(rng, [
        ['30°', 'sin', '1/2'], ['45°', 'sin', '√2/2'], ['60°', 'cos', '1/2'],
        ['0°', 'cos', '1'], ['90°', 'sin', '1'], ['60°', 'sin', '√3/2'],
      ] as const);
      const { options, correct: i } = uniqueOptions(rng, correct, ['0', '1', '√3/3']);
      return { q: `${fn}(${angle}) bằng?`, options, correct: i, ex: `Giá trị lượng giác đặc biệt: ${fn}(${angle})=${correct}.` };
    },
  },
  {
    id: 'gen-definite-integral',
    cat: 'Giải tích',
    difficulty: 'Vừa',
    make: rng => {
      const a = int(rng, 1, 3);
      const b = int(rng, 1, 4);
      const upper = 2;
      const correct = String((a * upper * upper) / 2 + b * upper);
      const { options, correct: i } = uniqueOptions(rng, correct, [String((a * upper * upper) / 2), String(a + b), correct + '+C']);
      return { q: `∫₀² (${a}x+${b}) dx bằng?`, options, correct: i, ex: `Nguyên hàm ${a}x²/2+${b}x, thế cận 0→2 được ${correct}.` };
    },
  },
  {
    id: 'gen-prime-check',
    cat: 'Lý thuyết số',
    difficulty: 'Cơ bản',
    make: rng => {
      const [value, isPrime] = pick(rng, [[17, true], [19, true], [23, true], [15, false], [21, false], [27, false]] as const);
      const correct = isPrime ? 'Đúng' : 'Sai';
      const { options, correct: i } = uniqueOptions(rng, correct, [isPrime ? 'Sai' : 'Đúng', 'Không xác định', 'Tùy trường hợp']);
      return { q: `${value} có phải số nguyên tố không?`, options, correct: i, ex: isPrime ? `${value} chỉ có hai ước dương là 1 và ${value}.` : `${value} có ước ngoài 1 và chính nó nên là hợp số.` };
    },
  },
  {
    id: 'gen-bayes-screening',
    cat: 'Xác suất',
    difficulty: 'Khó',
    make: rng => {
      const prevalence = pick(rng, [1, 2]);
      const sensitivity = 99;
      const falsePositive = pick(rng, [4, 5]);
      const pD = prevalence / 100;
      const pPos = sensitivity / 100 * pD + falsePositive / 100 * (1 - pD);
      const posterior = (sensitivity / 100 * pD) / pPos;
      const correct = `${(posterior * 100).toFixed(1).replace('.', ',')}%`;
      const { options, correct: i } = uniqueOptions(rng, correct, [`${prevalence}%`, `${sensitivity}%`, `${(100 - posterior * 100).toFixed(1).replace('.', ',')}%`]);
      return { q: `Bệnh tỷ lệ ${prevalence}%. Test đúng ${sensitivity}% khi có bệnh, dương giả ${falsePositive}%. P(bệnh | dương tính) gần nhất?`, options, correct: i, ex: `Bayes: ${sensitivity}%·${prevalence}% / (${sensitivity}%·${prevalence}%+${falsePositive}%·${100 - prevalence}%) ≈ ${correct}.` };
    },
  },
  {
    id: 'gen-quadratic-roots',
    cat: 'Đại số',
    difficulty: 'Vừa',
    make: rng => {
      const roots = pick(rng, [[2, 3], [1, 4], [-1, 5], [2, -3], [-2, -4]] as const);
      const [r1, r2] = [...roots].sort((x, y) => x - y);
      const b = -(r1 + r2);
      const c = r1 * r2;
      const polyText = `x²${b >= 0 ? '+' : ''}${b}x${c >= 0 ? '+' : ''}${c}=0`;
      const correct = `x=${r1} hoặc x=${r2}`;
      const { options, correct: i } = uniqueOptions(rng, correct, [`x=${-r1} hoặc x=${-r2}`, `x=${r1}`, `Vô nghiệm`]);
      return { q: `Nghiệm của ${polyText}?`, options, correct: i, ex: `Phân tích (x−${r1})(x−${r2})=0 nên ${correct}.` };
    },
  },
  {
    id: 'gen-amgm-max',
    cat: 'Bất đẳng thức',
    difficulty: 'Vừa',
    make: rng => {
      const half = int(rng, 3, 9);
      const sum = half * 2;
      const correct = String(half * half);
      const { options, correct: i } = uniqueOptions(rng, correct, [String(sum), String(half * half + 1), String(sum * sum)]);
      return { q: `x,y≥0 và x+y=${sum}. Giá trị lớn nhất của xy?`, options, correct: i, ex: `AM–GM: √(xy)≤${sum}/2=${half} nên xy≤${correct}, dấu bằng khi x=y=${half}.` };
    },
  },
  {
    id: 'gen-lin-transform-image',
    cat: 'Đại số tuyến tính',
    difficulty: 'Vừa',
    make: rng => {
      const [a, b, c, d] = [int(rng, -2, 3), int(rng, -2, 3), int(rng, -2, 3), int(rng, -2, 3)];
      const [x, y] = [int(rng, 1, 4), int(rng, 1, 4)];
      const px = a * x + b * y;
      const py = c * x + d * y;
      const correct = `(${px}, ${py})`;
      const { options, correct: i } = uniqueOptions(rng, correct, [`(${px + 1}, ${py})`, `(${px}, ${py + 1})`, `(${py}, ${px})`]);
      return { q: `T(x,y)=(${a}x${b >= 0 ? '+' : ''}${b}y, ${c}x${d >= 0 ? '+' : ''}${d}y). T(${x},${y}) bằng?`, options, correct: i, ex: `Thay vào: (${a}·${x}${b >= 0 ? '+' : ''}${b}·${y}, ${c}·${x}${d >= 0 ? '+' : ''}${d}·${y})=${correct}.` };
    },
  },
  {
    id: 'gen-vector-dot',
    cat: 'Đại số tuyến tính',
    difficulty: 'Cơ bản',
    make: rng => {
      const [a, b, c, d] = [int(rng, -4, 5), int(rng, -4, 5), int(rng, -4, 5), int(rng, -4, 5)];
      const correct = String(a * c + b * d);
      const { options, correct: i } = uniqueOptions(rng, correct, [String(a * c - b * d), String(a * d + b * c), String(Math.abs(a * c + b * d) + 1)]);
      return { q: `a=(${a}, ${b}), b=(${c}, ${d}). Tích vô hướng a·b bằng?`, options, correct: i, ex: `a·b=${a}·${c}+${b}·${d}=${correct}.` };
    },
  },
  {
    id: 'gen-vector-parallel',
    cat: 'Đại số tuyến tính',
    difficulty: 'Vừa',
    make: rng => {
      const parallel = rng() < 0.5;
      const [a, b] = [int(rng, 1, 5), int(rng, 1, 5)];
      const k = int(rng, 2, 3);
      const [c, d] = parallel ? [a * k, b * k] : [a * k + 1, b * k];
      const correct = parallel ? 'Cùng phương' : 'Không cùng phương';
      const { options, correct: i } = uniqueOptions(rng, correct, [parallel ? 'Không cùng phương' : 'Cùng phương', 'Vuông góc', 'Không xác định']);
      return { q: `u=(${a}, ${b}), v=(${c}, ${d}). Hai vectơ này?`, options, correct: i, ex: parallel ? `v=${k}·u nên cùng phương.` : `${a}·${d}−${b}·${c}=${a * d - b * c}≠0 nên không cùng phương.` };
    },
  },
  {
    id: 'gen-coord-distance',
    cat: 'Hình học',
    difficulty: 'Cơ bản',
    make: rng => {
      const [dx, dy, expected] = pick(rng, [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17]] as const);
      const [x0, y0] = [int(rng, 0, 4), int(rng, 0, 4)];
      const correct = String(expected);
      const { options, correct: i } = uniqueOptions(rng, correct, [String(expected + 1), String(dx + dy), String(expected - 1)]);
      return { q: `Khoảng cách A(${x0}, ${y0}) đến B(${x0 + dx}, ${y0 + dy})?`, options, correct: i, ex: `AB=√(${dx}²+${dy}²)=√${dx * dx + dy * dy}=${correct}.` };
    },
  },
  {
    id: 'gen-coord-midpoint',
    cat: 'Hình học',
    difficulty: 'Cơ bản',
    make: rng => {
      const [x1, y1] = [int(rng, 0, 6), int(rng, 0, 6)];
      const [dx, dy] = [int(rng, 1, 4) * 2, int(rng, 1, 4) * 2];
      const correct = `(${(x1 + x1 + dx) / 2}, ${(y1 + y1 + dy) / 2})`;
      const { options, correct: i } = uniqueOptions(rng, correct, [`(${x1 + dx}, ${y1 + dy})`, `(${x1}, ${y1})`, `(${(x1 + x1 + dx) / 2 + 1}, ${(y1 + y1 + dy) / 2})`]);
      return { q: `Trung điểm của A(${x1}, ${y1}) và B(${x1 + dx}, ${y1 + dy})?`, options, correct: i, ex: `M=((${x1}+${x1 + dx})/2, (${y1}+${y1 + dy})/2)=${correct}.` };
    },
  },
  {
    id: 'gen-coord-slope',
    cat: 'Hình học',
    difficulty: 'Vừa',
    make: rng => {
      const slope = pick(rng, [-3, -2, -1, 1, 2, 3]);
      const [x0, y0] = [int(rng, 0, 4), int(rng, 0, 4)];
      const correct = String(slope);
      const { options, correct: i } = uniqueOptions(rng, correct, [String(-slope), String(slope + 1), `1/${slope}`]);
      return { q: `Đường thẳng qua A(${x0}, ${y0}) và B(${x0 + 1}, ${y0 + slope}) có hệ số góc?`, options, correct: i, ex: `m=Δy/Δx=${slope}/1=${correct}.` };
    },
  },
];

export const GENERATED_CATS = [...new Set(TEMPLATES.map(template => template.cat))];
export const GENERATED_DIFFICULTIES: QuizDifficulty[] = ['Cơ bản', 'Vừa', 'Khó'];

export const GENERATED_BANK: Quiz[] = TEMPLATES.map(template => ({
  id: template.id,
  cat: template.cat,
  difficulty: template.difficulty,
  q: '',
  a: [],
  i: 0,
  ex: '',
}));

export function countGenerated(cat = 'Tất cả', difficulty = 'Tất cả', only?: string[]): number {
  const allowed = only && only.length ? new Set(only) : null;
  return TEMPLATES.filter(template =>
    (!allowed || allowed.has(template.id)) &&
    (cat === 'Tất cả' || template.cat === cat) &&
    (difficulty === 'Tất cả' || template.difficulty === difficulty),
  ).length;
}

export function templateById(templateId: string) {
  return TEMPLATES.find(template => template.id === templateId);
}

// Đoán kỹ năng từ câu hỏi/câu trả lời (tiếng Việt, không dấu cũng được)
// để gợi ý đúng dạng bài tương tự. Không khớp gì → trả về rỗng (luyện tổng hợp).
const SKILL_KEYWORDS: Array<{ match: string[]; templates: string[] }> = [
  { match: ['đạo hàm', 'dao ham'], templates: ['gen-derivative-monomial', 'gen-derivative-poly'] },
  { match: ['tích phân', 'tich phan', 'nguyên hàm', 'nguyen ham'], templates: ['gen-definite-integral'] },
  { match: ['xác suất', 'xac suat', 'bayes'], templates: ['gen-bayes-screening'] },
  { match: ['logarit', 'log_'], templates: ['gen-log-power'] },
  { match: ['ma trận', 'ma tran', 'định thức', 'dinh thuc', 'det('], templates: ['gen-det-2x2'] },
  { match: ['số phức', 'so phuc', 'module', '|'], templates: ['gen-complex-modulus'] },
  { match: ['lượng giác', 'luong giac', 'sin(', 'cos('], templates: ['gen-trig-special'] },
  { match: ['tổ hợp', 'to hop', 'giai thừa', 'giai thua', 'c('], templates: ['gen-combination', 'gen-factorial'] },
  { match: ['trung bình', 'trung binh', 'thống kê', 'thong ke'], templates: ['gen-mean'] },
  { match: ['nguyên tố', 'nguyen to', 'đồng dư', 'dong du', 'modulo'], templates: ['gen-prime-check'] },
  { match: ['phương trình bậc hai', 'phuong trinh bac hai', 'nghiệm của x'], templates: ['gen-quadratic-roots', 'gen-abs-equation'] },
  { match: ['bất đẳng thức', 'bat dang thuc', 'lớn nhất', 'lon nhat', 'nhỏ nhất', 'nho nhat'], templates: ['gen-amgm-max'] },
  { match: ['biến đổi tuyến tính', 'bien doi tuyen tinh', 'ánh xạ tuyến tính'], templates: ['gen-lin-transform-image', 'gen-det-2x2'] },
  { match: ['vectơ', 'vecto', 'vector', 'tích vô hướng', 'tich vo huong', 'cùng phương', 'cung phuong'], templates: ['gen-vector-dot', 'gen-vector-parallel', 'gen-complex-modulus'] },
  { match: ['tọa độ', 'toa do', 'khoảng cách', 'khoang cach', 'trung điểm', 'trung diem', 'hệ số góc', 'he so goc'], templates: ['gen-coord-distance', 'gen-coord-midpoint', 'gen-coord-slope'] },
];

function foldVietnamese(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function detectSkillTemplates(text: string): string[] {
  const folded = foldVietnamese(text);
  const found: string[] = [];
  for (const rule of SKILL_KEYWORDS) {
    if (rule.match.some(keyword => folded.includes(foldVietnamese(keyword)))) {
      for (const id of rule.templates) {
        if (!found.includes(id)) found.push(id);
      }
    }
  }
  return found;
}

export function generateQuestion(templateId: string, seed: number): GeneratedQuiz | null {
  const template = templateById(templateId);
  if (!template) return null;
  const rng = mulberry32(seed);
  const built = template.make(rng);
  return {
    id: template.id,
    cat: template.cat,
    difficulty: template.difficulty,
    q: built.q,
    a: built.options,
    i: built.correct,
    ex: built.ex,
    templateId: template.id,
  };
}

export function generateSession(seed: number, count: number, cat = 'Tất cả', difficulty = 'Tất cả', only?: string[]): GeneratedQuiz[] {
  const allowed = only && only.length ? new Set(only.filter(id => templateById(id))) : null;
  const pool = TEMPLATES.filter(template =>
    (!allowed || allowed.has(template.id)) &&
    (cat === 'Tất cả' || template.cat === cat) &&
    (difficulty === 'Tất cả' || template.difficulty === difficulty),
  );
  if (!pool.length) return [];
  const rng = mulberry32(seed);
  const order = shuffle(rng, pool);
  const questions: GeneratedQuiz[] = [];
  for (let index = 0; index < count; index += 1) {
    const template = order[index % order.length];
    const built = template.make(mulberry32(seed * 31 + index * 101));
    questions.push({
      id: template.id,
      cat: template.cat,
      difficulty: template.difficulty,
      q: built.q,
      a: built.options,
      i: built.correct,
      ex: built.ex,
      templateId: template.id,
    });
  }
  return questions;
}
