import { useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw, ChartSpline, Tangent, Crosshair } from 'lucide-react';
import { formatNumber } from '../utils/math';
import { quadraticAnalysis } from '../utils/advancedMath';

type Family = 'quad' | 'lin' | 'sin' | 'exp' | 'abs' | 'log' | 'recip';

const FAMILIES: { value: Family; label: string }[] = [
  { value: 'quad', label: 'Bậc hai · y = ax² + bx + c' },
  { value: 'lin', label: 'Bậc nhất · y = ax + b' },
  { value: 'sin', label: 'Lượng giác · y = a sin(bx + c)' },
  { value: 'exp', label: 'Hàm mũ · y = a e^(bx) + c' },
  { value: 'abs', label: 'Giá trị tuyệt đối · y = a|x| + c' },
  { value: 'log', label: 'Logarit · y = a ln(bx) + c' },
  { value: 'recip', label: 'Phân thức · y = a/(x−b) + c' },
];

const W = 800, H = 500;

function evaluate(type: Family, x: number, a: number, b: number, c: number) {
  switch (type) {
    case 'quad': return a * x * x + b * x + c;
    case 'lin': return a * x + b;
    case 'sin': return a * Math.sin(b * x + c);
    case 'exp': return a * Math.exp(b * x) + c;
    case 'abs': return a * Math.abs(x) + c;
    case 'log': return b * x > 0 ? a * Math.log(b * x) + c : NaN;
    case 'recip': return x === b ? NaN : a / (x - b) + c;
  }
}

function derivative(type: Family, x: number, a: number, b: number, c: number) {
  switch (type) {
    case 'quad': return 2 * a * x + b;
    case 'lin': return a;
    case 'sin': return a * b * Math.cos(b * x + c);
    case 'exp': return a * b * Math.exp(b * x);
    case 'abs': return x === 0 ? NaN : a * Math.sign(x);
    case 'log': return b * x > 0 && x !== 0 ? a / x : NaN;
    case 'recip': return x === b ? NaN : -a / ((x - b) ** 2);
  }
}

function familyValid(type: Family, a: number, b: number, c: number) {
  const required = type === 'lin' ? [a, b] : type === 'abs' ? [a, c] : [a, b, c];
  if (!required.every(value => Number.isFinite(value) && Math.abs(value) <= 1e6)) return false;
  if ((type === 'log' || type === 'sin') && b === 0) return false;
  return true;
}

function analysisRows(type: Family, a: number, b: number, c: number) {
  const rows: { label: string; value: string }[] = [];
  const f = formatNumber;

  if (type === 'quad') {
    const q = quadraticAnalysis(a, b, c);
    if (!q) return rows;
    rows.push({ label: 'Δ', value: f(q.discriminant) });
    rows.push({ label: 'Đỉnh', value: '(' + f(q.vertexX) + '; ' + f(q.vertexY) + ')' });
    rows.push({ label: 'Trục đối xứng', value: 'x = ' + f(q.axis) });
    rows.push({ label: 'Nghiệm thực', value: q.roots.length ? q.roots.map(f).join(', ') : 'Không có' });
    rows.push({ label: 'Cực trị', value: (q.extremum === 'min' ? 'GTNN' : 'GTLN') + ' = ' + f(q.vertexY) });
  } else if (type === 'lin') {
    rows.push({ label: 'Hệ số góc', value: f(a) });
    rows.push({ label: 'Giao Oy', value: '(0; ' + f(b) + ')' });
    rows.push({ label: 'Giao Ox', value: a === 0 ? (b === 0 ? 'Mọi x' : 'Không có') : '(' + f(-b / a) + '; 0)' });
    rows.push({ label: 'Tính đơn điệu', value: a > 0 ? 'Đồng biến' : a < 0 ? 'Nghịch biến' : 'Hàm hằng' });
  } else if (type === 'sin') {
    rows.push({ label: 'Biên độ', value: f(Math.abs(a)) });
    rows.push({ label: 'Chu kỳ', value: f(2 * Math.PI / Math.abs(b)) });
    rows.push({ label: 'Dịch pha', value: f(-c / b) });
    rows.push({ label: 'Miền giá trị', value: '[' + f(-Math.abs(a)) + '; ' + f(Math.abs(a)) + ']' });
  } else if (type === 'exp') {
    rows.push({ label: 'Miền xác định', value: 'ℝ' });
    rows.push({ label: 'Tiệm cận ngang', value: 'y = ' + f(c) });
    rows.push({ label: 'Giao Oy', value: '(0; ' + f(a + c) + ')' });
    rows.push({ label: 'Xu hướng', value: a * b > 0 ? 'Tăng theo x' : a * b < 0 ? 'Giảm theo x' : 'Hàm hằng' });
  } else if (type === 'abs') {
    rows.push({ label: 'Đỉnh', value: '(0; ' + f(c) + ')' });
    rows.push({ label: 'Trục đối xứng', value: 'x = 0' });
    const rootSquare = a === 0 ? NaN : -c / a;
    rows.push({ label: 'Nghiệm', value: Number.isFinite(rootSquare) && rootSquare >= 0 ? (rootSquare === 0 ? 'x = 0' : 'x = ±' + f(rootSquare)) : 'Không có' });
    rows.push({ label: 'Cực trị', value: a > 0 ? 'GTNN = ' + f(c) : a < 0 ? 'GTLN = ' + f(c) : 'Hàm hằng' });
  } else if (type === 'log') {
    rows.push({ label: 'Miền xác định', value: b > 0 ? 'x > 0' : 'x < 0' });
    rows.push({ label: 'Tiệm cận đứng', value: 'x = 0' });
    rows.push({ label: 'Đạo hàm', value: "f'(x) = " + f(a) + '/x' });
    const root = a === 0 ? NaN : Math.exp(-c / a) / b;
    rows.push({ label: 'Giao Ox', value: Number.isFinite(root) ? '(' + f(root) + '; 0)' : 'Không xác định' });
  } else {
    rows.push({ label: 'Tiệm cận đứng', value: 'x = ' + f(b) });
    rows.push({ label: 'Tiệm cận ngang', value: 'y = ' + f(c) });
    rows.push({ label: 'Tâm đối xứng', value: '(' + f(b) + '; ' + f(c) + ')' });
    rows.push({ label: 'Giao Ox', value: c === 0 ? 'Không có nếu a ≠ 0' : '(' + f(b - a / c) + '; 0)' });
  }

  return rows;
}

export default function Graph() {
  const [family, setFamily] = useState<Family>('quad');
  const [coefficients, setCoefficients] = useState(['1', '-2', '-3']);
  const [range, setRange] = useState(10);
  const [probe, setProbe] = useState('2');
  const [showTangent, setShowTangent] = useState(true);

  const [a, b, c] = coefficients.map(value => value.trim() === '' ? NaN : Number(value));
  const valid = familyValid(family, a, b, c);
  const scale = W / (2 * range);
  const step = range <= 5 ? 1 : range <= 12 ? 2 : 5;
  const probeX = probe.trim() === '' ? NaN : Number(probe);
  const probeY = valid && Number.isFinite(probeX) ? evaluate(family, probeX, a, b, c) : NaN;
  const slope = valid && Number.isFinite(probeX) ? derivative(family, probeX, a, b, c) : NaN;
  const rows = valid ? analysisRows(family, a, b, c) : [];

  const path = useMemo(() => {
    if (!valid) return '';
    let result = '';
    let started = false;
    let previousY = NaN;
    for (let px = 0; px <= W; px++) {
      const x = (px - W / 2) / scale;
      const yValue = evaluate(family, x, a, b, c);
      const y = H / 2 - yValue * scale;
      const jump = Number.isFinite(previousY) && Number.isFinite(y) && Math.abs(y - previousY) > H * 0.75;
      if (!Number.isFinite(y) || Math.abs(y) > H * 4 || jump) {
        started = false;
        previousY = y;
        continue;
      }
      result += (started ? 'L' : 'M') + px + ',' + y.toFixed(2) + ' ';
      started = true;
      previousY = y;
    }
    return result;
  }, [family, a, b, c, valid, scale]);

  const tangentPath = useMemo(() => {
    if (!showTangent || !valid || !Number.isFinite(probeX) || !Number.isFinite(probeY) || !Number.isFinite(slope)) return '';
    const x1 = -range;
    const x2 = range;
    const y1 = probeY + slope * (x1 - probeX);
    const y2 = probeY + slope * (x2 - probeX);
    return 'M0,' + (H / 2 - y1 * scale).toFixed(2) + ' L' + W + ',' + (H / 2 - y2 * scale).toFixed(2);
  }, [showTangent, valid, probeX, probeY, slope, range, scale]);

  const ticks = Array.from({ length: Math.ceil(range * 2 / step) + 1 }, (_, i) => -Math.ceil(range / step) * step + i * step).filter(x => Math.abs(x) <= range);
  const yTicks = ticks.filter(y => Math.abs(y * scale) < H / 2 - 15);
  const probeOnCanvas = Number.isFinite(probeX) && Number.isFinite(probeY) && Math.abs(probeX) <= range && Math.abs(probeY * scale) <= H / 2;
  const reset = () => { setFamily('quad'); setCoefficients(['1', '-2', '-3']); setRange(10); setProbe('2'); setShowTangent(true); };

  return <section className="page-enter">
    <div className="page-header"><p className="eyebrow">NHÌN THẤY & PHÂN TÍCH TOÁN HỌC</p><h1>Phòng thí nghiệm hàm số</h1><p>Vẽ đồ thị, đọc các đặc trưng quan trọng và khảo sát đạo hàm – tiếp tuyến ngay trên cùng một mô hình.</p></div>

    <div className="graph-layout">
      <div className="panel graph-controls">
        <h2><ChartSpline size={18} />Khám phá hàm số</h2>
        <label className="field">Họ hàm<select value={family} onChange={event => setFamily(event.target.value as Family)}>{FAMILIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        {['a', 'b', 'c'].map((name, index) => ((family === 'lin' && index === 2) || (family === 'abs' && index === 1)) ? null : <div className="coefficient" key={name}><label className="field">Hệ số {name}<input type="number" step="any" inputMode="decimal" value={coefficients[index]} onChange={event => setCoefficients(values => values.map((value, i) => i === index ? event.target.value : value))} /></label><input type="range" min="-10" max="10" step="0.25" aria-label={'Điều chỉnh ' + name} value={Number(coefficients[index]) || 0} onChange={event => setCoefficients(values => values.map((value, i) => i === index ? event.target.value : value))} /></div>)}
        <button className="button button-light" onClick={reset}><RotateCcw size={15} />Đặt lại đồ thị</button>
        <p className="helper-text">Hàm lượng giác dùng radian. Với logarit, cần b ≠ 0 và bx &gt; 0.</p>
      </div>

      <div className="min-w-0">
        <div className="graph-canvas panel">
          <div className="graph-toolbar"><span><span className="status-dot" />Đồ thị trực tiếp</span><div><button className="icon-button" aria-label="Thu nhỏ" disabled={range >= 25} onClick={() => setRange(value => Math.min(25, value + 2))}><Minus size={18} /></button><button className="icon-button" aria-label="Phóng to" disabled={range <= 2} onClick={() => setRange(value => Math.max(2, value - 2))}><Plus size={18} /></button></div></div>
          <svg className="function-graph" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={'Đồ thị ' + (FAMILIES.find(item => item.value === family)?.label || family)}>
            <defs><clipPath id="plot-clip"><rect width={W} height={H} /></clipPath></defs>
            <g className="graph-grid">{ticks.map(x => <line key={'x' + x} x1={W / 2 + x * scale} y1={0} x2={W / 2 + x * scale} y2={H} />)}{yTicks.map(y => <line key={'y' + y} x1={0} y1={H / 2 - y * scale} x2={W} y2={H / 2 - y * scale} />)}</g>
            <g className="graph-axes"><line x1="0" y1={H / 2} x2={W} y2={H / 2} /><line x1={W / 2} y1="0" x2={W / 2} y2={H} /></g>
            <g className="graph-labels">{ticks.filter(x => x !== 0 && Math.abs(x) < range).map(x => <text key={x} x={W / 2 + x * scale} y={H / 2 + 27} textAnchor="middle">{x}</text>)}{yTicks.filter(y => y !== 0).map(y => <text key={y} x={W / 2 - 13} y={H / 2 - y * scale + 6} textAnchor="end">{y}</text>)}<text x={W / 2 - 24} y={H / 2 + 27}>0</text><text x={W - 20} y={H / 2 - 13}>x</text><text x={W / 2 + 12} y="22">y</text></g>
            <path data-testid="function-path" d={path} clipPath="url(#plot-clip)" fill="none" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinejoin="round" />
            {tangentPath && <path data-testid="tangent-path" d={tangentPath} clipPath="url(#plot-clip)" fill="none" stroke="var(--color-warm)" strokeWidth="2.3" strokeDasharray="10 8" />}
            {probeOnCanvas && <g className="probe-marker"><circle cx={W / 2 + probeX * scale} cy={H / 2 - probeY * scale} r="6" /><circle cx={W / 2 + probeX * scale} cy={H / 2 - probeY * scale} r="12" /></g>}
          </svg>
        </div>

        {!valid && <p className="form-message error" role="alert">Kiểm tra các hệ số: cần số hữu hạn trong khoảng ±1.000.000; riêng sin/log cần b ≠ 0.</p>}

        <div className="graph-analysis-grid">
          <div className="panel graph-probe">
            <div className="graph-probe-title"><Crosshair size={17} /><strong>Khảo sát tại một điểm</strong></div>
            <label className="field">Giá trị x<input type="number" step="any" value={probe} onChange={event => setProbe(event.target.value)} inputMode="decimal" /></label>
            <div className="probe-results"><output>f(x) = <strong>{Number.isFinite(probeY) ? formatNumber(probeY) : '—'}</strong></output><output>f′(x) = <strong>{Number.isFinite(slope) ? formatNumber(slope) : 'không xác định'}</strong></output></div>
            <button className={'button ' + (showTangent ? 'button-dark' : 'button-light')} onClick={() => setShowTangent(value => !value)}><Tangent size={16} />{showTangent ? 'Ẩn tiếp tuyến' : 'Hiện tiếp tuyến'}</button>
            <p className="helper-text">{Number.isFinite(slope) && Number.isFinite(probeY) ? 'Tiếp tuyến: y = ' + formatNumber(slope) + '(x − ' + formatNumber(probeX) + ') + ' + formatNumber(probeY) : 'Tại điểm này hàm không có đạo hàm hữu hạn.'}</p>
          </div>

          <div className="panel function-analysis"><div className="graph-probe-title"><ChartSpline size={17} /><strong>Đặc trưng của hàm</strong></div><div className="analysis-list">{rows.map(row => <div className="analysis-row" key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div><p className="helper-text">Miền đang xem: x ∈ [−{range}, {range}]</p></div>
        </div>
      </div>
    </div>
  </section>;
}
