import { useMemo, useState } from 'react';
import { Activity, ArrowRight, Calculator, CheckCircle2, Gauge, Sigma, Target } from 'lucide-react';
import { compileExpression, expressionErrorMessage } from '../utils/expressionMath';
import { findRootNear, localBehavior, numericalSecondDerivative, simpsonIntegral, tangentLine } from '../utils/calculusMath';
import { formatNumber } from '../utils/math';
import { PrecisionBadge } from '../components/ui/PrecisionBadge';

const EXAMPLES = [
  'sin(x) + x^2/3',
  'x^3 - 3x',
  'exp(-x^2)',
  'ln(x)',
  '1/(1+x^2)',
];

const number = (value: string) => value.trim() === '' ? NaN : Number(value);
const fmt = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : formatNumber(value);

export default function Calculus() {
  const [expression, setExpression] = useState('sin(x) + x^2/3');
  const [point, setPoint] = useState('1');
  const [interval, setInterval] = useState(['0', '2']);

  const compiled = useMemo(() => {
    try {
      return { value: compileExpression(expression), error: '' };
    } catch (error) {
      return { value: null, error: expressionErrorMessage(error) };
    }
  }, [expression]);

  const x0 = number(point);
  const left = number(interval[0]);
  const right = number(interval[1]);
  const evaluate = compiled.value?.evaluate;
  const f0 = evaluate && Number.isFinite(x0) ? evaluate(x0) : NaN;
  const tangent = evaluate && Number.isFinite(x0) ? tangentLine(evaluate, x0) : null;
  const second = evaluate && Number.isFinite(x0) ? numericalSecondDerivative(evaluate, x0) : null;
  const behavior = evaluate && Number.isFinite(x0) ? localBehavior(evaluate, x0) : null;
  const integral = evaluate && Number.isFinite(left) && Number.isFinite(right) ? simpsonIntegral(evaluate, left, right) : null;
  const root = evaluate && Number.isFinite(x0) ? findRootNear(evaluate, x0) : null;
  const average = integral !== null && left !== right ? integral / (right - left) : null;
  const leftValue = evaluate && Number.isFinite(left) ? evaluate(left) : NaN;
  const rightValue = evaluate && Number.isFinite(right) ? evaluate(right) : NaN;
  const secant = Number.isFinite(leftValue) && Number.isFinite(rightValue) && left !== right ? (rightValue - leftValue) / (right - left) : null;
  const intervalValid = Number.isFinite(left) && Number.isFinite(right);
  const pointValid = Number.isFinite(x0);

  const sampleOffsets = [-1, 0, 1];
  const samples = evaluate && pointValid
    ? sampleOffsets.map(offset => {
        const x = x0 + offset;
        const y = evaluate(x);
        return { x, y };
      })
    : [];

  return <section className="page-enter">
    <div className="page-header">
      <p className="eyebrow">CALCULUS LAB</p>
      <h1>Phòng thí nghiệm giải tích</h1>
      <p>Nhập một biểu thức theo biến x rồi khảo sát giá trị, đạo hàm, tiếp tuyến, tích phân và nghiệm gần điểm bạn chọn.</p>
    </div>

    <div className="precision-page-disclosure">
      <PrecisionBadge mode="standard" suffix="đạo hàm / tích phân / tìm nghiệm số" />
      <span>Đây là giải tích số trên Float64; kết quả có sai số xấp xỉ và không thay thế chứng minh ký hiệu.</span>
    </div>

    <div className="calculus-layout">
      <div className="panel calculus-input-panel">
        <div className="calculus-panel-title"><Calculator size={19} /><div><strong>Biểu thức</strong><span>Parser toán học riêng, không chạy mã JavaScript.</span></div></div>
        <label className="field">f(x)
          <input
            aria-label="Biểu thức f(x)"
            value={expression}
            onChange={event => setExpression(event.target.value)}
            maxLength={500}
            autoComplete="off"
            spellCheck={false}
            placeholder="Ví dụ: sin(x) + x^2/3"
          />
        </label>

        <div className="expression-examples" aria-label="Ví dụ biểu thức">
          {EXAMPLES.map(example => <button type="button" key={example} onClick={() => setExpression(example)}>{example}</button>)}
        </div>

        {compiled.error
          ? <p className="form-message error" role="alert">{compiled.error}</p>
          : <div className="expression-status"><CheckCircle2 size={16} /><span>Đã hiểu biểu thức</span><code>{compiled.value?.normalized}</code></div>}

        <div className="calculus-control-grid">
          <label className="field">Điểm khảo sát x₀<input type="number" step="any" inputMode="decimal" value={point} onChange={event => setPoint(event.target.value)} /></label>
          <label className="field">Cận a<input type="number" step="any" inputMode="decimal" value={interval[0]} onChange={event => setInterval(values => [event.target.value, values[1]])} /></label>
          <label className="field">Cận b<input type="number" step="any" inputMode="decimal" value={interval[1]} onChange={event => setInterval(values => [values[0], event.target.value])} /></label>
        </div>

        <div className="syntax-guide">
          <strong>Cú pháp hỗ trợ</strong>
          <p><code>+ − * / ^</code>, ngoặc, phép nhân ngầm như <code>2x</code>, hằng số <code>pi</code>, <code>e</code>, và các hàm <code>sin cos tan sqrt abs exp ln log</code>.</p>
        </div>
      </div>

      <div className="calculus-results">
        <div className="calculus-metric-grid">
          <Metric icon={<Target size={18} />} label={'f(' + (point || 'x₀') + ')'} value={Number.isFinite(f0) ? fmt(f0) : 'Không xác định'} detail={pointValid ? 'Giá trị hàm tại điểm khảo sát' : 'Hãy nhập x₀ hợp lệ'} />
          <Metric icon={<Activity size={18} />} label="Đạo hàm f′(x₀)" value={tangent ? fmt(tangent.slope) : 'Không tồn tại'} detail={behavior ? behavior.trend : 'Chưa thể khảo sát'} />
          <Metric icon={<Gauge size={18} />} label="Đạo hàm bậc hai" value={second === null ? 'Không xác định' : fmt(second)} detail={behavior ? behavior.curvature : 'Chưa thể khảo sát'} />
          <Metric icon={<Sigma size={18} />} label="Nghiệm gần x₀" value={root ? fmt(root.value) : 'Chưa tìm thấy'} detail={root ? (root.method === 'newton' ? 'Newton' : 'Chia đôi') + ' · ' + root.iterations + ' bước' : 'Có thể không có nghiệm thực gần đây'} />
        </div>

        <div className="calculus-detail-grid">
          <div className="panel calculus-result-panel">
            <div className="calculus-panel-title"><Activity size={18} /><div><strong>Tiếp tuyến tại x₀</strong><span>Hệ số góc lấy từ đạo hàm số bậc cao.</span></div></div>
            {tangent ? <>
              <div className="calculus-equation">y = {fmt(tangent.slope)}(x − {fmt(tangent.x)}) + {fmt(tangent.y)}</div>
              <div className="analysis-list">
                <div className="analysis-row"><span>Điểm tiếp xúc</span><strong>({fmt(tangent.x)}; {fmt(tangent.y)})</strong></div>
                <div className="analysis-row"><span>Hệ số góc</span><strong>{fmt(tangent.slope)}</strong></div>
                <div className="analysis-row"><span>Dạng y = mx + n</span><strong>y = {fmt(tangent.slope)}x {tangent.intercept < 0 ? '− ' + fmt(Math.abs(tangent.intercept)) : '+ ' + fmt(tangent.intercept)}</strong></div>
              </div>
            </> : <p className="calculus-empty">Không thể dựng tiếp tuyến hữu hạn tại điểm này. Hàm có thể không xác định hoặc không khả vi ở x₀.</p>}
          </div>

          <div className="panel calculus-result-panel">
            <div className="calculus-panel-title"><Sigma size={18} /><div><strong>Tích phân xác định</strong><span>Quy tắc Simpson trên đoạn [a, b].</span></div></div>
            {!intervalValid ? <p className="calculus-empty">Hãy nhập hai cận hữu hạn.</p> : integral === null ? <p className="calculus-empty">Không thể tích phân ổn định trên đoạn này. Có thể hàm gián đoạn hoặc vượt miền xác định.</p> : <>
              <div className="calculus-equation">∫[{fmt(left)}, {fmt(right)}] f(x)dx ≈ {fmt(integral)}</div>
              <div className="analysis-list">
                <div className="analysis-row"><span>Giá trị trung bình</span><strong>{average === null ? '—' : fmt(average)}</strong></div>
                <div className="analysis-row"><span>Hệ số góc dây cung</span><strong>{secant === null ? '—' : fmt(secant)}</strong></div>
                <div className="analysis-row"><span>Chiều đoạn</span><strong>{left < right ? 'a < b' : left > right ? 'a > b' : 'a = b'}</strong></div>
              </div>
            </>}
          </div>
        </div>

        <div className="panel calculus-samples">
          <div className="calculus-panel-title"><ArrowRight size={18} /><div><strong>Lân cận điểm khảo sát</strong><span>Ba mẫu nhanh giúp đối chiếu xu hướng của hàm.</span></div></div>
          <div className="sample-table" role="table" aria-label="Giá trị hàm quanh điểm khảo sát">
            <div className="sample-row sample-head" role="row"><span role="columnheader">x</span><span role="columnheader">f(x)</span></div>
            {samples.map(sample => <div className="sample-row" role="row" key={sample.x}><span role="cell">{fmt(sample.x)}</span><strong role="cell">{Number.isFinite(sample.y) ? fmt(sample.y) : 'Không xác định'}</strong></div>)}
          </div>
        </div>
      </div>
    </div>

    <p className="helper-text mt-4">Các kết quả đạo hàm, tích phân và nghiệm ở đây là xấp xỉ số. Với chứng minh ký hiệu hoặc bài toán cần điều kiện đặc biệt, hãy đối chiếu lại bằng lập luận giải tích.</p>
  </section>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="calculus-metric"><span className="small-icon green">{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></div>;
}
