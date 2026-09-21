import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BookOpen, CircleDot, Cpu, Gauge, Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { ChatText } from '../components/ui/ChatText';
import { NBodyScene } from '../simulations/NBodyScene';
import { createNBodyEngine, type NBodyDiagnostics } from '../simulations/nbody/CpuNBodyEngine';

const BODY_OPTIONS = [48, 96, 160, 256];
const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

function isMobileProfile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
}

export default function GravityLab() {
  const [bodyCount, setBodyCount] = useState(() => isMobileProfile() ? 96 : 160);
  const [seed, setSeed] = useState(42);
  const [softening, setSoftening] = useState(0.35);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(true);
  const [revision, setRevision] = useState(0);
  const [mobile, setMobile] = useState(() => isMobileProfile());
  const [reduceMotion, setReduceMotion] = useState(false);

  const engine = useMemo(
    () => createNBodyEngine({ bodyCount, seed, softening }),
    [bodyCount, revision, seed, softening],
  );

  const initialDiagnostics = useMemo(() => engine.diagnostics(), [engine]);
  const [metrics, setMetrics] = useState<NBodyDiagnostics>(initialDiagnostics);

  useEffect(() => {
    setMetrics(initialDiagnostics);
    return () => engine.dispose();
  }, [engine, initialDiagnostics]);

  useEffect(() => {
    const compact = window.matchMedia('(max-width: 720px), (pointer: coarse)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setMobile(compact.matches);
      setReduceMotion(motion.matches);
    };

    update();
    compact.addEventListener('change', update);
    motion.addEventListener('change', update);
    return () => {
      compact.removeEventListener('change', update);
      motion.removeEventListener('change', update);
    };
  }, []);

  const initialEnergy = initialDiagnostics.totalEnergy;
  const energyDrift = initialEnergy === 0
    ? 0
    : Math.abs((metrics.totalEnergy - initialEnergy) / initialEnergy) * 100;
  const centerDistance = Math.hypot(...metrics.centerOfMass);

  const reset = () => {
    setRunning(false);
    setRevision(value => value + 1);
  };

  return <section className="gravity-lab page-enter">
    <div className="page-header gravity-heading">
      <div>
        <p className="eyebrow">COMPUTATIONAL PHYSICS · PHASE 1</p>
        <h1>Phòng mô phỏng hấp dẫn N-body</h1>
        <p>Một hệ hấp dẫn nhiều vật thể chạy bằng CPU Float64, tích phân leapfrog và dữ liệu TypedArray. Đây là mô phỏng số có kiểm soát, không phải ảnh động được dựng sẵn.</p>
      </div>
      <div className="gravity-runtime">
        <span><Cpu size={14} />CPU engine · Float64</span>
        <span><CircleDot size={14} />{engine.particleCount} vật thể</span>
        <span><Gauge size={14} />{metrics.lastStepMs.toFixed(2)} ms/bước</span>
      </div>
    </div>

    <div className="gravity-stage">
      <NBodyScene
        engine={engine}
        running={running}
        speed={speed}
        mobile={mobile}
        reduceMotion={reduceMotion}
        onMetrics={setMetrics}
      />

      <div className="gravity-controls panel" aria-label="Điều khiển mô phỏng N-body">
        <div className="gravity-control-head">
          <div><SlidersHorizontal size={17} /><span><strong>Điều khiển hệ</strong><small>Thay đổi tham số sẽ khởi tạo lại hệ bằng seed đã chọn.</small></span></div>
          <button type="button" className="button button-dark" onClick={() => setRunning(value => !value)} aria-label={running ? 'Tạm dừng mô phỏng' : 'Tiếp tục mô phỏng'}>
            {running ? <Pause size={15} /> : <Play size={15} />}{running ? 'Tạm dừng' : 'Tiếp tục'}
          </button>
        </div>

        <div className="gravity-control-grid">
          <label className="field">Số vật thể
            <select aria-label="Số vật thể N-body" value={bodyCount} onChange={event => setBodyCount(Number(event.target.value))}>
              {BODY_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="field">Seed
            <input aria-label="Seed mô phỏng" type="number" value={seed} onChange={event => setSeed(Number(event.target.value) || 1)} />
          </label>
          <label className="field">Tốc độ
            <select aria-label="Tốc độ mô phỏng" value={speed} onChange={event => setSpeed(Number(event.target.value))}>
              {SPEED_OPTIONS.map(value => <option key={value} value={value}>{value}×</option>)}
            </select>
          </label>
          <label className="field">Softening ε = {softening.toFixed(2)}
            <input aria-label="Softening hấp dẫn" type="range" min="0.15" max="1.2" step="0.05" value={softening} onChange={event => setSoftening(Number(event.target.value))} />
          </label>
        </div>

        <button type="button" className="button button-light gravity-reset" onClick={reset}><RotateCcw size={15} />Reset cùng tham số</button>
      </div>
    </div>

    <div className="gravity-metrics">
      <Metric label="Thời gian mô phỏng" value={metrics.simulatedTime.toFixed(2)} unit="đ.v." />
      <Metric label="Số bước tích phân" value={metrics.stepCount.toLocaleString('vi-VN')} unit="step" />
      <Metric label="Energy drift" value={energyDrift.toFixed(3)} unit="%" tone={energyDrift > 2 ? 'warn' : 'ok'} />
      <Metric label="Lệch tâm khối" value={centerDistance.toExponential(2)} unit="đ.v." tone={centerDistance > 0.1 ? 'warn' : 'ok'} />
    </div>

    <div className="gravity-explain-grid">
      <article className="panel">
        <div className="panel-heading-row"><div><p className="eyebrow">MÔ HÌNH TOÁN</p><h2 className="panel-title">Phương trình đang được tích phân</h2></div><Activity size={20} /></div>
        <ChatText text={"$$\\ddot{\\mathbf r}_i = G\\sum_{j\\ne i} m_j\\frac{\\mathbf r_j-\\mathbf r_i}{(\\|\\mathbf r_j-\\mathbf r_i\\|^2+\\varepsilon^2)^{3/2}}$$"} />
        <p className="helper-text">ε là softening số học để tránh lực tiến tới vô hạn khi hai hạt quá gần nhau. Hệ dùng đơn vị mô phỏng vô thứ nguyên, không tự nhận là hệ SI hay mô hình thiên văn chính xác.</p>
      </article>

      <article className="panel">
        <p className="eyebrow">ỔN ĐỊNH SỐ</p>
        <h2 className="panel-title">Vì sao dùng leapfrog?</h2>
        <p className="helper-text">Leapfrog là integrator đối xứng thời gian, thường giữ cấu trúc Hamilton tốt hơn Euler đơn giản. MathNexus chia bước lớn thành các substep tối đa 0,006 đơn vị thời gian và hiển thị energy drift để người dùng thấy chất lượng số thay vì chỉ nhìn chuyển động đẹp.</p>
      </article>

      <article className="panel">
        <p className="eyebrow">BACKEND</p>
        <h2 className="panel-title">Không giả WebGPU</h2>
        <p className="helper-text">Backend đang chạy thật là CPU Float64. WebGPU compute chưa được bật cho N-body cho đến khi có pipeline tương đương, kiểm tra số học và fallback đầy đủ. Renderer 3D vẫn dùng GPU thông qua Three.js/WebGL như bình thường.</p>
      </article>
    </div>

    <div className="panel gravity-knowledge">
      <div><BookOpen size={18} /><span><strong>Kiến thức nền nối với Knowledge Graph</strong><small>Mô phỏng không đứng riêng; các mắt xích toán học đã có trong MathNexus.</small></span></div>
      <div className="gravity-knowledge-links">
        <Link to="/map?concept=vectors">Vector<ArrowRight size={13} /></Link>
        <Link to="/map?concept=derivative-definition">Đạo hàm<ArrowRight size={13} /></Link>
        <Link to="/map?concept=first-order-ode">ODE cấp một<ArrowRight size={13} /></Link>
        <Link to="/calculus">Calculus Lab<ArrowRight size={13} /></Link>
      </div>
    </div>
  </section>;
}

function Metric({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: 'ok' | 'warn';
}) {
  return <div className={'gravity-metric ' + (tone || '')}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{unit}</small>
  </div>;
}
