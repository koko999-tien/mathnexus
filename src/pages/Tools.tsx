import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Calculator, Grid2X2, Gauge, ShieldCheck, Sigma, TrendingUp } from 'lucide-react';
import { gcd, lcm, isPrime, nCr, nPr, solveQuadratic, formatNumber } from '../utils/math';
import { arithmeticSequence, descriptiveStatistics, geometricSequence, invertMatrix2, parseNumberList, solveLinearSystem2, vector2 } from '../utils/advancedMath';
import { formatHighPrecision, highPrecisionArithmeticSequence, highPrecisionGeometricSequence, highPrecisionLinearSystem2, highPrecisionMatrix2Inverse, highPrecisionPercentage, highPrecisionQuadratic } from '../utils/precisionMath';
import { getPrecisionPolicy, type MathPrecisionMode } from '../utils/precisionPolicy';

const real = (value: string) => value.trim() === '' ? NaN : Number(value);
const integer = (value: number) => Number.isSafeInteger(value);
const fmt = (value: number | undefined | null) => value == null ? '—' : formatNumber(value);

export default function Tools() {
  const [gcdValues, setGcdValues] = useState(['48', '18']);
  const [percent, setPercent] = useState(['15', '80']);
  const [quad, setQuad] = useState(['1', '-5', '6']);
  const [comb, setComb] = useState(['5', '2']);
  const [complex, setComplex] = useState(['3', '4', '1', '-2']);
  const [prime, setPrime] = useState(['97', '5']);
  const [linear, setLinear] = useState(['1', '1', '5', '2', '-1', '1']);
  const [matrix, setMatrix] = useState(['2', '1', '3', '4']);
  const [statsText, setStatsText] = useState('2, 4, 6, 8, 10');
  const [sequenceKind, setSequenceKind] = useState<'arithmetic' | 'geometric'>('arithmetic');
  const [sequence, setSequence] = useState(['3', '2', '5']);
  const [vectors, setVectors] = useState(['1', '2', '3', '4']);
  const [precisionMode, setPrecisionMode] = useState<Exclude<MathPrecisionMode, 'visual'>>('standard');

  const [ga, gb] = gcdValues.map(real);
  const [pa, pb] = percent.map(real);
  const [a, b, c] = quad.map(real);
  const [n, k] = comb.map(real);
  const [za, zb, zc, zd] = complex.map(real);
  const [pn, pm] = prime.map(real);
  const [la, lb, le, lc, ld, lf] = linear.map(real);
  const [ma, mb, mc, md] = matrix.map(real);
  const [s1, sdq, sn] = sequence.map(real);
  const [vax, vay, vbx, vby] = vectors.map(real);

  const combinationValid = integer(n) && integer(k) && n >= 0 && n <= 170 && k >= 0 && k <= n;
  const imaginary = za * zd + zb * zc;
  const linearResult = solveLinearSystem2(la, lb, le, lc, ld, lf);
  const matrixResult = invertMatrix2(ma, mb, mc, md);
  const statsValues = parseNumberList(statsText);
  const stats = statsValues ? descriptiveStatistics(statsValues) : null;
  const sequenceResult = sequenceKind === 'arithmetic' ? arithmeticSequence(s1, sdq, sn) : geometricSequence(s1, sdq, sn);
  const vectorResult = vector2(vax, vay, vbx, vby);
  const highPrecision = precisionMode === 'highPrecision';
  const precisionPolicy = getPrecisionPolicy(precisionMode);
  const precisePercent = highPrecision ? highPrecisionPercentage(percent[0], percent[1]) : null;
  const preciseQuadratic = highPrecision ? highPrecisionQuadratic(quad[0], quad[1], quad[2]) : null;
  const preciseLinear = highPrecision ? highPrecisionLinearSystem2(linear[0], linear[1], linear[2], linear[3], linear[4], linear[5]) : null;
  const preciseMatrix = highPrecision ? highPrecisionMatrix2Inverse(matrix[0], matrix[1], matrix[2], matrix[3]) : null;
  const preciseSequence = highPrecision
    ? sequenceKind === 'arithmetic'
      ? highPrecisionArithmeticSequence(sequence[0], sequence[1], Number(sequence[2]))
      : highPrecisionGeometricSequence(sequence[0], sequence[1], Number(sequence[2]))
    : null;

  return <section className="page-enter">
    <div className="page-header"><p className="eyebrow">MATH WORKBENCH</p><h1>Công cụ toán học</h1><p>Tính, kiểm chứng và phân tích nhiều lớp toán học trong cùng một nơi — từ số học đến đại số tuyến tính, thống kê và vector.</p></div>

    <div className="panel precision-control" aria-label="Chính sách độ chính xác số">
      <div className="precision-control-copy"><span className="small-icon green"><ShieldCheck size={17} /></span><div><strong>Numerical Trust Layer</strong><small>{precisionPolicy.description}</small></div></div>
      <label className="precision-mode-field"><span>Chế độ</span><select aria-label="Chế độ độ chính xác" value={precisionMode} onChange={event => setPrecisionMode(event.target.value as Exclude<MathPrecisionMode, 'visual'>)}><option value="standard">Standard · Float64</option><option value="highPrecision">High Precision · Decimal 50</option></select></label>
      <div className="precision-policy-meta"><Gauge size={14} /><span><strong>{precisionPolicy.arithmetic}</strong><small>Áp dụng cho %, phương trình, hệ 2×2, ma trận và cấp số.</small></span></div>
    </div>

    <div className="tool-section-heading"><div><p className="eyebrow">SỐ HỌC & ĐẠI SỐ</p><h2>Nền tảng tính toán</h2></div><span>6 công cụ</span></div>
    <div className="tools-grid">
      <ToolPanel title="ƯCLN và BCNN" description="Nhập hai số nguyên, kể cả số âm hoặc 0." labels={['a', 'b']} values={gcdValues} onChange={setGcdValues}><Result>{integer(ga) && integer(gb) ? 'ƯCLN = ' + formatNumber(gcd(ga, gb)) + ' · BCNN = ' + formatNumber(lcm(ga, gb)) : 'Vui lòng nhập hai số nguyên an toàn.'}</Result></ToolPanel>
      <ToolPanel title="Tỷ lệ phần trăm" description="a chiếm bao nhiêu phần trăm của b?" labels={['a', 'b']} values={percent} onChange={setPercent}><Result>{highPrecision ? !precisePercent ? 'Vui lòng nhập hai số thập phân hợp lệ và b ≠ 0.' : percent[0] + ' = ' + formatHighPrecision(precisePercent) + '% của ' + percent[1] : !Number.isFinite(pa) || !Number.isFinite(pb) ? 'Vui lòng nhập đủ hai số.' : pb === 0 ? 'Số gốc b phải khác 0.' : formatNumber(pa) + ' = ' + formatNumber(pa / pb * 100) + '% của ' + formatNumber(pb)}<PrecisionTag mode={precisionMode} /></Result></ToolPanel>
      <ToolPanel title="Giải phương trình" description="ax² + bx + c = 0, xét nghiệm thực." labels={['a', 'b', 'c']} values={quad} onChange={setQuad}><Result>{highPrecision ? formatPreciseQuadratic(preciseQuadratic) : solveQuadratic(a, b, c)}<PrecisionTag mode={precisionMode} /></Result></ToolPanel>
      <ToolPanel title="Tổ hợp & chỉnh hợp" description="Nhập số nguyên 0 ≤ k ≤ n ≤ 170." labels={['n', 'k']} values={comb} onChange={setComb}><Result>{combinationValid ? 'C(' + n + ', ' + k + ') = ' + formatNumber(nCr(n, k)) + ' · A(' + n + ', ' + k + ') = ' + formatNumber(nPr(n, k)) + (!Number.isSafeInteger(nCr(n, k)) || !Number.isSafeInteger(nPr(n, k)) ? ' (xấp xỉ)' : '') : 'Cần số nguyên thỏa mãn 0 ≤ k ≤ n ≤ 170.'}</Result></ToolPanel>
      <ToolPanel title="Số phức" description="z₁ = a + bi, z₂ = c + di. Tính môđun và tích." labels={['a', 'b', 'c', 'd']} values={complex} onChange={setComplex}><Result>{[za, zb, zc, zd].every(Number.isFinite) ? '|z₁| = ' + formatNumber(Math.hypot(za, zb)) + ' · z₁z₂ = ' + formatNumber(za * zc - zb * zd) + ' ' + (imaginary < 0 ? '−' : '+') + ' ' + formatNumber(Math.abs(imaginary)) + 'i' : 'Vui lòng nhập đủ bốn hệ số.'}</Result></ToolPanel>
      <ToolPanel title="Nguyên tố & đồng dư" description="Nhập n nguyên, |n| ≤ 10¹² và môđun m nguyên dương." labels={['n', 'm']} values={prime} onChange={setPrime}><Result>{!integer(pn) || Math.abs(pn) > 1e12 || !integer(pm) || pm <= 0 ? 'Cần |n| ≤ 10¹², m > 0 và cả hai là số nguyên.' : formatNumber(pn) + ' ' + (isPrime(pn) ? 'là' : 'không phải') + ' số nguyên tố · ' + formatNumber(pn) + ' mod ' + formatNumber(pm) + ' = ' + formatNumber(((pn % pm) + pm) % pm)}</Result></ToolPanel>
    </div>

    <div className="tool-section-heading"><div><p className="eyebrow">ĐẠI SỐ TUYẾN TÍNH</p><h2>Hệ phương trình, ma trận & vector</h2></div><Grid2X2 size={20} /></div>
    <div className="tools-grid">
      <ToolPanel title="Hệ phương trình 2×2" description="a₁x+b₁y=c₁ và a₂x+b₂y=c₂." labels={['a₁', 'b₁', 'c₁', 'a₂', 'b₂', 'c₂']} values={linear} onChange={setLinear}>
        <Result>{highPrecision ? formatPreciseLinear(preciseLinear) : !linearResult ? 'Vui lòng nhập đủ sáu hệ số hữu hạn.' : linearResult.kind === 'unique' ? 'Nghiệm duy nhất: x = ' + fmt(linearResult.x) + ', y = ' + fmt(linearResult.y) + ' · det = ' + fmt(linearResult.determinant) : linearResult.kind === 'infinite' ? 'Hai phương trình phụ thuộc: hệ có vô số nghiệm.' : 'Hai đường thẳng song song: hệ vô nghiệm.'}<PrecisionTag mode={precisionMode} /></Result>
      </ToolPanel>

      <ToolPanel title="Ma trận 2×2" description="A = [[a,b],[c,d]]. Tính định thức và nghịch đảo." labels={['a', 'b', 'c', 'd']} values={matrix} onChange={setMatrix}>
        <Result>{highPrecision ? formatPreciseMatrix(preciseMatrix) : !matrixResult ? 'Vui lòng nhập bốn phần tử hữu hạn.' : matrixResult.inverse ? <span>det(A) = {fmt(matrixResult.determinant)} · A⁻¹ = [{fmt(matrixResult.inverse[0])}, {fmt(matrixResult.inverse[1])}; {fmt(matrixResult.inverse[2])}, {fmt(matrixResult.inverse[3])}]</span> : 'det(A) = 0 · Ma trận suy biến, không có nghịch đảo.'}<PrecisionTag mode={precisionMode} /></Result>
      </ToolPanel>

      <ToolPanel title="Vector 2D" description="u=(a,b), v=(c,d). Tính độ dài, tích vô hướng, định thức và góc." labels={['uₓ', 'uᵧ', 'vₓ', 'vᵧ']} values={vectors} onChange={setVectors}>
        <Result>{!vectorResult ? 'Vui lòng nhập đủ bốn tọa độ.' : <span>|u| = {fmt(vectorResult.magnitudeA)} · |v| = {fmt(vectorResult.magnitudeB)} · u·v = {fmt(vectorResult.dot)} · det(u,v) = {fmt(vectorResult.determinant)} · góc = {vectorResult.angleDegrees == null ? 'không xác định' : fmt(vectorResult.angleDegrees) + '°'}</span>}</Result>
      </ToolPanel>
    </div>

    <div className="tool-section-heading"><div><p className="eyebrow">DỮ LIỆU & DÃY SỐ</p><h2>Thống kê và quy luật</h2></div><Sigma size={20} /></div>
    <div className="tools-grid">
      <section className="panel tool-panel advanced-tool-panel" aria-labelledby="statistics-tool"><h2 id="statistics-tool"><TrendingUp size={18} />Thống kê mô tả</h2><p className="helper-text">Nhập tối đa 10.000 số, ngăn cách bằng dấu phẩy, chấm phẩy hoặc khoảng trắng.</p><label className="field">Dữ liệu<textarea rows={3} value={statsText} onChange={event => setStatsText(event.target.value)} placeholder="2, 4, 6, 8, 10" /></label><Result>{!stats ? 'Dữ liệu chưa hợp lệ.' : <span>n = {stats.count} · trung bình = {fmt(stats.mean)} · trung vị = {fmt(stats.median)} · σ = {fmt(stats.standardDeviation)} · Q1 = {fmt(stats.q1)} · Q3 = {fmt(stats.q3)} · min/max = {fmt(stats.min)}/{fmt(stats.max)}</span>}</Result></section>

      <section className="panel tool-panel advanced-tool-panel" aria-labelledby="sequence-tool"><h2 id="sequence-tool"><Sigma size={18} />Cấp số</h2><p className="helper-text">Tính số hạng thứ n và tổng n số hạng đầu.</p><label className="field">Loại dãy<select aria-label="Loại cấp số" value={sequenceKind} onChange={event => setSequenceKind(event.target.value as 'arithmetic' | 'geometric')}><option value="arithmetic">Cấp số cộng</option><option value="geometric">Cấp số nhân</option></select></label><div className="tool-inputs"><label className="field">u₁<input type="number" step="any" value={sequence[0]} onChange={event => setSequence(values => values.map((v, i) => i === 0 ? event.target.value : v))} /></label><label className="field">{sequenceKind === 'arithmetic' ? 'd' : 'q'}<input type="number" step="any" value={sequence[1]} onChange={event => setSequence(values => values.map((v, i) => i === 1 ? event.target.value : v))} /></label><label className="field">n<input type="number" step="1" min="1" value={sequence[2]} onChange={event => setSequence(values => values.map((v, i) => i === 2 ? event.target.value : v))} /></label></div><Result>{highPrecision ? !preciseSequence ? 'Cần u₁, công sai/công bội thập phân hợp lệ và n nguyên dương trong giới hạn.' : 'uₙ = ' + formatHighPrecision(preciseSequence.nth) + ' · Sₙ = ' + formatHighPrecision(preciseSequence.sum) : !sequenceResult ? 'Cần u₁, công sai/công bội hữu hạn và n nguyên dương trong giới hạn.' : 'uₙ = ' + fmt(sequenceResult.nth) + ' · Sₙ = ' + fmt(sequenceResult.sum)}<PrecisionTag mode={precisionMode} /></Result></section>
    </div>
  </section>;
}

function ToolPanel({ title, description, labels, values, onChange, children }: { title: string; description: string; labels: string[]; values: string[]; onChange: (value: string[]) => void; children: ReactNode }) {
  const id = useId();
  return <section className="panel tool-panel" aria-labelledby={id}><h2 id={id}><Calculator size={18} />{title}</h2><p className="helper-text">{description}</p><div className="tool-inputs">{labels.map((label, index) => <label className="field" key={label}>{label}<input type="number" step="any" inputMode="decimal" value={values[index]} onChange={event => onChange(values.map((v, i) => i === index ? event.target.value : v))} /></label>)}</div>{children}</section>;
}

function Result({ children }: { children: ReactNode }) {
  return <output className="tool-result" aria-live="polite">{children}</output>;
}


function PrecisionTag({ mode }: { mode: Exclude<MathPrecisionMode, 'visual'> }) {
  const policy = getPrecisionPolicy(mode);
  return <span className={'precision-result-tag ' + mode}>{policy.label} · {policy.significantDigits ?? '—'} chữ số</span>;
}

function formatPreciseQuadratic(result: ReturnType<typeof highPrecisionQuadratic>) {
  if (!result) return 'Vui lòng nhập ba hệ số thập phân hợp lệ.';
  if (result.kind === 'infinite') return 'Phương trình có vô số nghiệm.';
  if (result.kind === 'none') return 'Phương trình vô nghiệm.';
  if (result.kind === 'complex') return 'Δ = ' + formatHighPrecision(result.discriminant) + ' < 0 · chưa hiển thị nghiệm phức trong công cụ này.';
  if (result.kind === 'linear') return 'Phương trình bậc nhất: x = ' + formatHighPrecision(result.roots?.[0]);
  if (result.kind === 'double') return 'Δ = 0 · nghiệm kép x = ' + formatHighPrecision(result.roots?.[0]);
  return 'Hai nghiệm thực: x₁ = ' + formatHighPrecision(result.roots?.[0]) + ', x₂ = ' + formatHighPrecision(result.roots?.[1]) + ' · Δ = ' + formatHighPrecision(result.discriminant);
}

function formatPreciseLinear(result: ReturnType<typeof highPrecisionLinearSystem2>) {
  if (!result) return 'Vui lòng nhập đủ sáu hệ số thập phân hợp lệ.';
  if (result.kind === 'infinite') return 'det = 0 · hệ có vô số nghiệm.';
  if (result.kind === 'none') return 'det = 0 · hệ vô nghiệm.';
  return 'Nghiệm duy nhất: x = ' + formatHighPrecision(result.x) + ', y = ' + formatHighPrecision(result.y) + ' · det = ' + formatHighPrecision(result.determinant);
}

function formatPreciseMatrix(result: ReturnType<typeof highPrecisionMatrix2Inverse>) {
  if (!result) return 'Vui lòng nhập bốn phần tử thập phân hợp lệ.';
  if (!result.inverse) return 'det(A) = 0 · Ma trận suy biến, không có nghịch đảo.';
  return 'det(A) = ' + formatHighPrecision(result.determinant) + ' · A⁻¹ = [' +
    formatHighPrecision(result.inverse[0]) + ', ' + formatHighPrecision(result.inverse[1]) + '; ' +
    formatHighPrecision(result.inverse[2]) + ', ' + formatHighPrecision(result.inverse[3]) + ']';
}
