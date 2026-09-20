import { useRef, useState } from 'react';

type FuncType = 'quad' | 'lin' | 'sin' | 'exp' | 'abs';

const FUNCS: { val: FuncType; label: string }[] = [
  { val: 'quad', label: 'Parabol y = ax² + bx + c' },
  { val: 'lin', label: 'Đường thẳng y = bx + c' },
  { val: 'sin', label: 'Điều hòa y = a sin(bx + c)' },
  { val: 'exp', label: 'Mũ y = a e^(bx) + c' },
  { val: 'abs', label: 'Tuyệt đối y = a|x| + c' },
];

export function Graph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [type, setType] = useState<FuncType>('quad');
  const [a, setA] = useState(1);
  const [b, setB] = useState(-2);
  const [c, setC] = useState(-3);
  const [info, setInfo] = useState('');

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const scale = 30;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += scale) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += scale) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Axes
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Function
    ctx.strokeStyle = '#4d7c5a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    let minVal = Infinity, maxVal = -Infinity;
    for (let px = 0; px < W; px++) {
      const x = (px - cx) / scale;
      let y: number;
      switch (type) {
        case 'quad': y = a * x * x + b * x + c; break;
        case 'lin': y = b * x + c; break;
        case 'sin': y = a * Math.sin(b * x + c); break;
        case 'exp': y = a * Math.exp(b * x) + c; break;
        case 'abs': y = a * Math.abs(x) + c; break;
      }
      if (!isFinite(y) || Math.abs(y) > 1000) { started = false; continue; }
      minVal = Math.min(minVal, y); maxVal = Math.max(maxVal, y);
      const py = cy - y * scale;
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    setInfo(`Phạm vi y: [${minVal.toFixed(1)}, ${maxVal.toFixed(1)}]`);
  };

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">HÌNH ẢNH HÓA</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Đồ thị hàm số</h1>
        <p className="text-muted max-w-lg">Chọn họ hàm, nhập hệ số, đọc ý nghĩa đường cong.</p>
      </div>
      <div className="mb-3">
        <label className="text-xs font-bold text-muted block mb-1">Họ hàm</label>
        <select value={type} onChange={e => setType(e.target.value as FuncType)} className="w-full px-3 py-2.5 border border-line rounded-xl bg-bg text-ink text-sm">
          {FUNCS.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div><label className="text-xs font-bold text-muted block mb-1">a</label><input type="number" value={a} onChange={e => setA(+e.target.value)} className="w-full px-3 py-2.5 border border-line rounded-xl bg-bg text-ink text-sm" /></div>
        <div><label className="text-xs font-bold text-muted block mb-1">b</label><input type="number" value={b} onChange={e => setB(+e.target.value)} className="w-full px-3 py-2.5 border border-line rounded-xl bg-bg text-ink text-sm" /></div>
        <div><label className="text-xs font-bold text-muted block mb-1">c</label><input type="number" value={c} onChange={e => setC(+e.target.value)} className="w-full px-3 py-2.5 border border-line rounded-xl bg-bg text-ink text-sm" /></div>
      </div>
      <button onClick={draw} className="bg-lime text-lime-ink px-5 py-2.5 rounded-xl font-bold text-sm border-0 cursor-pointer hover:opacity-90 transition mb-3">Vẽ đồ thị</button>
      {info && <p className="text-[13px] text-muted border border-dashed border-line rounded-xl p-2.5 mb-3">{info}</p>}
      <div className="border border-line rounded-xl bg-white overflow-hidden">
        <canvas ref={canvasRef} width={900} height={360} className="w-full h-auto" />
      </div>
    </section>
  );
}

export default Graph;
