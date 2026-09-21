export type MathPrecisionMode = 'visual' | 'standard' | 'highPrecision';

export type PrecisionExactness =
  | 'visual-approximation'
  | 'floating-approximation'
  | 'decimal-high-precision'
  | 'exact-integer';

export interface MathPrecisionPolicy {
  mode: MathPrecisionMode;
  label: string;
  arithmetic: string;
  significantDigits: number | null;
  exactness: PrecisionExactness;
  description: string;
  suitableFor: string[];
  notSuitableFor: string[];
}

export const HIGH_PRECISION_DIGITS = 50;

export const MATH_PRECISION_POLICIES: Record<MathPrecisionMode, MathPrecisionPolicy> = {
  visual: {
    mode: 'visual',
    label: 'Visual',
    arithmetic: 'Float32 / GPU-oriented display buffers',
    significantDigits: 7,
    exactness: 'visual-approximation',
    description: 'Dành cho tọa độ, hình học hiển thị và animation. Không dùng làm nguồn sự thật cho kết luận toán học.',
    suitableFor: ['3D rendering', 'particle display buffers', 'camera coordinates'],
    notSuitableFor: ['proof', 'exact decimal arithmetic', 'ill-conditioned algebra'],
  },
  standard: {
    mode: 'standard',
    label: 'Standard',
    arithmetic: 'IEEE-754 Float64',
    significantDigits: 15,
    exactness: 'floating-approximation',
    description: 'Độ chính xác mặc định cho giải tích số, thống kê và mô phỏng CPU. Có sai số làm tròn nhị phân.',
    suitableFor: ['numerical calculus', 'statistics', 'simulation state', 'general scientific calculation'],
    notSuitableFor: ['exact decimal money-style arithmetic', 'extreme cancellation', 'symbolic proof'],
  },
  highPrecision: {
    mode: 'highPrecision',
    label: 'High Precision',
    arithmetic: `decimal.js · ${HIGH_PRECISION_DIGITS} significant digits`,
    significantDigits: HIGH_PRECISION_DIGITS,
    exactness: 'decimal-high-precision',
    description: 'Tính đại số thập phân với 50 chữ số có nghĩa. Không biến phép tính số thành chứng minh ký hiệu.',
    suitableFor: ['decimal algebra', 'ill-conditioned 2×2 systems', 'quadratic roots', 'long decimal sequences'],
    notSuitableFor: ['3D rendering', 'general trigonometric expression parser', 'symbolic proof'],
  },
};

export function getPrecisionPolicy(mode: MathPrecisionMode) {
  return MATH_PRECISION_POLICIES[mode];
}

export function precisionDisclosure(mode: MathPrecisionMode) {
  const policy = getPrecisionPolicy(mode);
  return `${policy.label} · ${policy.arithmetic}`;
}
