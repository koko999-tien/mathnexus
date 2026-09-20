import { useState } from 'react';
import { gcd, lcm, isPrime, nCr, nPr } from '../utils/math';

export function Tools() {
  const [gcdA, setGcdA] = useState(48);
  const [gcdB, setGcdB] = useState(18);
  const [pctA, setPctA] = useState(15);
  const [pctB, setPctB] = useState(80);
  const [qa, setQa] = useState(1);
  const [qb, setQb] = useState(-5);
  const [qc, setQc] = useState(6);
  const [cn, setCn] = useState(5);
  const [ck, setCk] = useState(2);
  const [za, setZa] = useState(3);
  const [zb, setZb] = useState(4);
  const [zc, setZc] = useState(1);
  const [zd, setZd] = useState(-2);
  const [pn, setPn] = useState(97);
  const [pm, setPm] = useState(5);

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">TINH TOÁN</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Công cụ toán học</h1>
        <p className="text-muted max-w-lg">Tính rồi đọc ý nghĩa: số nguyên, tổ hợp, số phức, phương trình.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ToolPanel title="UCLN và BCNN">
          <Input label="a" value={gcdA} onChange={setGcdA} />
          <Input label="b" value={gcdB} onChange={setGcdB} />
          <Result text={`UCLN = ${gcd(gcdA, gcdB)}, BCNN = ${lcm(gcdA, gcdB)}`} />
        </ToolPanel>
        <ToolPanel title="Phần trăm">
          <Input label="a" value={pctA} onChange={setPctA} />
          <Input label="b" value={pctB} onChange={setPctB} />
          <Result text={`${pctA} = ${((pctA / pctB) * 100).toFixed(2)}% của ${pctB}`} />
        </ToolPanel>
        <ToolPanel title="Nghiệm bậc hai">
          <Input label="a" value={qa} onChange={setQa} />
          <Input label="b" value={qb} onChange={setQb} />
          <Input label="c" value={qc} onChange={setQc} />
          <Result text={(() => {
            const d = qb * qb - 4 * qa * qc;
            if (d < 0) return `Δ = ${d} < 0: không có nghiệm thực`;
            if (d === 0) return `Δ = 0: nghiệm kép x = ${(-qb / (2 * qa)).toFixed(4)}`;
            return `Δ = ${d}: x₁ = ${((-qb + Math.sqrt(d)) / (2 * qa)).toFixed(4)}, x₂ = ${((-qb - Math.sqrt(d)) / (2 * qa)).toFixed(4)}`;
          })()} />
        </ToolPanel>
        <ToolPanel title="Tổ hợp C(n,k)">
          <Input label="n" value={cn} onChange={setCn} />
          <Input label="k" value={ck} onChange={setCk} />
          <Result text={`C(${cn},${ck}) = ${nCr(cn, ck)}, P(${cn},${ck}) = ${nPr(cn, ck)}`} />
        </ToolPanel>
        <ToolPanel title="Số phức">
          <Input label="a" value={za} onChange={setZa} />
          <Input label="b" value={zb} onChange={setZb} />
          <Input label="c" value={zc} onChange={setZc} />
          <Input label="d" value={zd} onChange={setZd} />
          <Result text={`|z₁| = ${Math.sqrt(za*za+zb*zb).toFixed(4)}, z₁·z₂ = ${za*zc-zb*zd} + ${za*zd+zb*zc}i`} />
        </ToolPanel>
        <ToolPanel title="Nguyên tố và đồng dư">
          <Input label="n" value={pn} onChange={setPn} />
          <Input label="m" value={pm} onChange={setPm} />
          <Result text={`${pn}: ${isPrime(pn) ? 'Nguyên tố' : 'Không nguyên tố'}, ${pn} mod ${pm} = ${((pn % pm) + pm) % pm}`} />
        </ToolPanel>
      </div>
    </section>
  );
}

function ToolPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-line rounded-2xl p-5">
      <h3 className="font-bold text-sm m-0 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-2">
      <label className="text-xs font-bold text-muted block mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(+e.target.value)} className="w-full px-3 py-2 border border-line rounded-xl bg-bg text-ink text-sm" />
    </div>
  );
}

function Result({ text }: { text: string }) {
  return <p className="text-[13px] text-muted border border-dashed border-line rounded-xl p-2.5 mt-2 m-0">{text}</p>;
}
