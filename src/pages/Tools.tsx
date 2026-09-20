import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Calculator } from 'lucide-react';
import { gcd, lcm, isPrime, nCr, nPr, solveQuadratic, formatNumber } from '../utils/math';

const real = (value: string) => value.trim() === '' ? NaN : Number(value);
const integer = (value: number) => Number.isSafeInteger(value);

export default function Tools() {
  const [gcdValues, setGcdValues] = useState(['48', '18']);
  const [percent, setPercent] = useState(['15', '80']);
  const [quad, setQuad] = useState(['1', '-5', '6']);
  const [comb, setComb] = useState(['5', '2']);
  const [complex, setComplex] = useState(['3', '4', '1', '-2']);
  const [prime, setPrime] = useState(['97', '5']);
  const [ga, gb] = gcdValues.map(real), [pa, pb] = percent.map(real), [a, b, c] = quad.map(real), [n, k] = comb.map(real), [za, zb, zc, zd] = complex.map(real), [pn, pm] = prime.map(real);
  const combinationValid = integer(n) && integer(k) && n >= 0 && n <= 170 && k >= 0 && k <= n;
  const imaginary = za * zd + zb * zc;

  return <section className="page-enter"><div className="page-header"><p className="eyebrow">TÍNH TOÁN & KIỂM CHỨNG</p><h1>Công cụ toán học</h1><p>Thay đổi dữ kiện để tính ngay. Dùng kết quả để kiểm tra và hiểu sâu hơn lời giải của bạn.</p></div><div className="tools-grid">
    <ToolPanel title="ƯCLN và BCNN" description="Nhập hai số nguyên, kể cả số âm hoặc 0." labels={['a', 'b']} values={gcdValues} onChange={setGcdValues}><Result>{integer(ga) && integer(gb) ? `ƯCLN = ${formatNumber(gcd(ga, gb))} · BCNN = ${formatNumber(lcm(ga, gb))}` : 'Vui lòng nhập hai số nguyên an toàn.'}</Result></ToolPanel>
    <ToolPanel title="Tỷ lệ phần trăm" description="a chiếm bao nhiêu phần trăm của b?" labels={['a', 'b']} values={percent} onChange={setPercent}><Result>{!Number.isFinite(pa) || !Number.isFinite(pb) ? 'Vui lòng nhập đủ hai số.' : pb === 0 ? 'Số gốc b phải khác 0.' : `${formatNumber(pa)} = ${formatNumber(pa / pb * 100)}% của ${formatNumber(pb)}`}</Result></ToolPanel>
    <ToolPanel title="Giải phương trình" description="ax² + bx + c = 0, xét nghiệm thực." labels={['a', 'b', 'c']} values={quad} onChange={setQuad}><Result>{solveQuadratic(a, b, c)}</Result></ToolPanel>
    <ToolPanel title="Tổ hợp & chỉnh hợp" description="Nhập số nguyên 0 ≤ k ≤ n ≤ 170." labels={['n', 'k']} values={comb} onChange={setComb}><Result>{combinationValid ? `C(${n}, ${k}) = ${formatNumber(nCr(n, k))} · A(${n}, ${k}) = ${formatNumber(nPr(n, k))}${!Number.isSafeInteger(nCr(n, k)) || !Number.isSafeInteger(nPr(n, k)) ? ' (xấp xỉ)' : ''}` : 'Cần số nguyên thỏa mãn 0 ≤ k ≤ n ≤ 170.'}</Result></ToolPanel>
    <ToolPanel title="Số phức" description="z₁ = a + bi, z₂ = c + di. Tính môđun và tích." labels={['a', 'b', 'c', 'd']} values={complex} onChange={setComplex}><Result>{[za, zb, zc, zd].every(Number.isFinite) ? `|z₁| = ${formatNumber(Math.hypot(za, zb))} · z₁z₂ = ${formatNumber(za * zc - zb * zd)} ${imaginary < 0 ? '−' : '+'} ${formatNumber(Math.abs(imaginary))}i` : 'Vui lòng nhập đủ bốn hệ số.'}</Result></ToolPanel>
    <ToolPanel title="Nguyên tố & đồng dư" description="Nhập n nguyên, |n| ≤ 10¹² và môđun m nguyên dương." labels={['n', 'm']} values={prime} onChange={setPrime}><Result>{!integer(pn) || Math.abs(pn) > 1e12 || !integer(pm) || pm <= 0 ? 'Cần |n| ≤ 10¹², m > 0 và cả hai là số nguyên.' : `${formatNumber(pn)} ${isPrime(pn) ? 'là' : 'không phải'} số nguyên tố · ${formatNumber(pn)} mod ${formatNumber(pm)} = ${formatNumber(((pn % pm) + pm) % pm)}`}</Result></ToolPanel>
  </div></section>;
}

function ToolPanel({ title, description, labels, values, onChange, children }: { title: string; description: string; labels: string[]; values: string[]; onChange: (value: string[]) => void; children: ReactNode }) {
  const id = useId();
  return <section className="panel tool-panel" aria-labelledby={id}><h2 id={id}><Calculator size={18} />{title}</h2><p className="helper-text">{description}</p><div className="tool-inputs">{labels.map((label, index) => <label className="field" key={label}>{label}<input type="number" step="any" inputMode="decimal" value={values[index]} onChange={e => onChange(values.map((v, i) => i === index ? e.target.value : v))} /></label>)}</div>{children}</section>;
}

function Result({ children }: { children: ReactNode }) {
  return <output className="tool-result" aria-live="polite">{children}</output>;
}
