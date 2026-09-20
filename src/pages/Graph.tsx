import { useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw, ChartSpline } from 'lucide-react';
import { formatNumber } from '../utils/math';

type Family = 'quad' | 'lin' | 'sin' | 'exp' | 'abs';
const FAMILIES: { value: Family; label: string }[] = [
  { value: 'quad', label: 'Bậc hai · y = ax² + bx + c' },
  { value: 'lin', label: 'Bậc nhất · y = ax + b' },
  { value: 'sin', label: 'Lượng giác · y = a sin(bx + c)' },
  { value: 'exp', label: 'Hàm mũ · y = a e^(bx) + c' },
  { value: 'abs', label: 'Giá trị tuyệt đối · y = a|x| + c' },
];
const W = 800, H = 500;

function evaluate(type: Family, x: number, a: number, b: number, c: number) {
  switch (type) {
    case 'quad': return a * x * x + b * x + c;
    case 'lin': return a * x + b;
    case 'sin': return a * Math.sin(b * x + c);
    case 'exp': return a * Math.exp(b * x) + c;
    case 'abs': return a * Math.abs(x) + c;
  }
}

export default function Graph() {
  const [family, setFamily] = useState<Family>('quad');
  const [coefficients, setCoefficients] = useState(['1', '-2', '-3']);
  const [range, setRange] = useState(10);
  const [probe, setProbe] = useState('2');
  const [a, b, c] = coefficients.map(value => value.trim() === '' ? NaN : Number(value));
  const required = family === 'lin' ? [a, b] : family === 'abs' ? [a, c] : [a, b, c];
  const valid = required.every(value => Number.isFinite(value) && Math.abs(value) <= 1e6);
  const scale = W / (2 * range);
  const step = range <= 5 ? 1 : range <= 12 ? 2 : 5;
  const path = useMemo(() => {
    if (!valid) return '';
    let result = '', started = false;
    for (let px = 0; px <= W; px++) {
      const y = H / 2 - evaluate(family, (px - W / 2) / scale, a, b, c) * scale;
      if (!Number.isFinite(y) || Math.abs(y) > H * 4) { started = false; continue; }
      result += `${started ? 'L' : 'M'}${px},${y.toFixed(2)} `;
      started = true;
    }
    return result;
  }, [family, a, b, c, valid, scale]);
  const ticks = Array.from({ length: Math.ceil(range * 2 / step) + 1 }, (_, i) => -Math.ceil(range / step) * step + i * step).filter(x => Math.abs(x) <= range);
  const yTicks = ticks.filter(y => Math.abs(y * scale) < H / 2 - 15);
  const reset = () => { setFamily('quad'); setCoefficients(['1', '-2', '-3']); setRange(10); setProbe('2'); };

  return <section className="page-enter"><div className="page-header"><p className="eyebrow">NHÌN THẤY TOÁN HỌC</p><h1>Đồ thị hàm số</h1><p>Thay đổi hệ số và quan sát đường cong chuyển động. Một cách khác để hiểu hàm số.</p></div><div className="graph-layout"><div className="panel graph-controls"><h2><ChartSpline size={18} />Khám phá hàm số</h2><label className="field">Họ hàm<select value={family} onChange={e => setFamily(e.target.value as Family)}>{FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></label>{['a', 'b', 'c'].map((name, index) => ((family === 'lin' && index === 2) || (family === 'abs' && index === 1)) ? null : <div className="coefficient" key={name}><label className="field">Hệ số {name}<input type="number" step="any" inputMode="decimal" value={coefficients[index]} onChange={e => setCoefficients(values => values.map((v, i) => i === index ? e.target.value : v))} /></label><input type="range" min="-10" max="10" step="0.25" aria-label={`Điều chỉnh ${name}`} value={Number(coefficients[index]) || 0} onChange={e => setCoefficients(values => values.map((v, i) => i === index ? e.target.value : v))} /></div>)}<button className="button button-light" onClick={reset}><RotateCcw size={15} />Đặt lại đồ thị</button><p className="helper-text">Hàm lượng giác sử dụng radian. Kéo thanh trượt hoặc nhập số để cập nhật ngay.</p></div><div className="min-w-0"><div className="graph-canvas panel"><div className="graph-toolbar"><span><span className="status-dot" />Đồ thị trực tiếp</span><div><button className="icon-button" aria-label="Thu nhỏ" disabled={range >= 25} onClick={() => setRange(r => Math.min(25, r + 2))}><Minus size={18} /></button><button className="icon-button" aria-label="Phóng to" disabled={range <= 2} onClick={() => setRange(r => Math.max(2, r - 2))}><Plus size={18} /></button></div></div><svg className="function-graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Đồ thị ${FAMILIES.find(f => f.value === family)?.label}, hệ số a = ${a}, b = ${b}, c = ${c}`}><defs><clipPath id="plot-clip"><rect width={W} height={H} /></clipPath></defs><g className="graph-grid">{ticks.map(x => <line key={`x${x}`} x1={W / 2 + x * scale} y1={0} x2={W / 2 + x * scale} y2={H} />)}{yTicks.map(y => <line key={`y${y}`} x1={0} y1={H / 2 - y * scale} x2={W} y2={H / 2 - y * scale} />)}</g><g className="graph-axes"><line x1="0" y1={H / 2} x2={W} y2={H / 2} /><line x1={W / 2} y1="0" x2={W / 2} y2={H} /></g><g className="graph-labels">{ticks.filter(x => x !== 0 && Math.abs(x) < range).map(x => <text key={x} x={W / 2 + x * scale} y={H / 2 + 27} textAnchor="middle">{x}</text>)}{yTicks.filter(y => y !== 0).map(y => <text key={y} x={W / 2 - 13} y={H / 2 - y * scale + 6} textAnchor="end">{y}</text>)}<text x={W / 2 - 24} y={H / 2 + 27}>0</text><text x={W - 20} y={H / 2 - 13}>x</text><text x={W / 2 + 12} y="22">y</text></g><path data-testid="function-path" d={path} clipPath="url(#plot-clip)" fill="none" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinejoin="round" /></svg></div>{!valid && <p className="form-message error" role="alert">Nhập đầy đủ hệ số hữu hạn trong khoảng −1.000.000 đến 1.000.000.</p>}<div className="panel graph-probe"><label className="field">Giá trị x<input type="number" step="any" value={probe} onChange={e => setProbe(e.target.value)} inputMode="decimal" /></label><output aria-live="polite">f(x) = <strong>{valid && probe.trim() && Number.isFinite(Number(probe)) ? formatNumber(evaluate(family, Number(probe), a, b, c)) : '—'}</strong></output><p className="helper-text">Miền đang xem: x ∈ [−{range}, {range}]</p></div></div></div></section>;
}
