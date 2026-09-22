import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, Cpu, Focus, Layers3, Network, Search, Sparkles, X } from 'lucide-react';
import { ChatText } from '../components/ui/ChatText';
import { PrecisionBadge } from '../components/ui/PrecisionBadge';
import { MATH_CONCEPTS, MATH_DOMAINS } from '../data/mathKnowledge';
import { MATH_ATOMS } from '../data/mathOntology';
import { MathCosmosGraph } from '../cosmos/MathCosmosGraph';
import { cosmosNodeById, cosmosSearch, type CosmosNode } from '../cosmos/cosmosGraph';
import { useCosmosGraph } from '../cosmos/useCosmosGraph';
import { recordAtomExploration, recordConceptExploration } from '../exploration/explorationState';

const QUICK_JUMPS = [
  ['concept:taylor', 'Taylor'],
  ['concept:bayes', 'Bayes'],
  ['concept:eigen', 'Trị riêng'],
  ['concept:complex-numbers', 'Số phức'],
  ['concept:first-order-ode', 'ODE'],
  ['concept:nbody-problem', 'N-body'],
] as const;

export default function MathCosmos() {
  const [expandedConceptId, setExpandedConceptId] = useState<string | null>('derivative-definition');
  const [selectedId, setSelectedId] = useState<string | null>('concept:derivative-definition');
  const [query, setQuery] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mobileQuality, setMobileQuality] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 720px), (pointer: coarse)');
    const updateMotion = () => setReduceMotion(media.matches);
    const updateQuality = () => setMobileQuality(compact.matches);
    updateMotion();
    updateQuality();
    media.addEventListener('change', updateMotion);
    compact.addEventListener('change', updateQuality);
    return () => {
      media.removeEventListener('change', updateMotion);
      compact.removeEventListener('change', updateQuality);
    };
  }, []);

  const { data, mode: layoutMode, durationMs: layoutDurationMs } = useCosmosGraph(expandedConceptId);
  const selected = cosmosNodeById(data, selectedId) || data.nodes.find(node => node.kind === 'domain');
  const results = useMemo(() => cosmosSearch(data, query), [data, query]);
  const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator;

  const selectNode = (node: CosmosNode) => {
    setSelectedId(node.id);
    if (node.kind === 'concept') {
      setExpandedConceptId(node.entityId);
      recordConceptExploration(node.entityId);
    }
    if (node.kind === 'atom') recordAtomExploration(node.entityId);
    if (node.kind === 'domain') setExpandedConceptId(null);
  };

  const jumpTo = (id: string) => {
    const conceptId = id.replace('concept:', '');
    recordConceptExploration(conceptId);
    setExpandedConceptId(conceptId);
    setSelectedId(id);
    setQuery('');
  };

  return <section className="math-cosmos-page page-enter">
    <div className="cosmos-page-head">
      <div>
        <p className="eyebrow">BẢN ĐỒ TOÁN HỌC 3D</p>
        <h1>Bản đồ toán học 3D</h1>
        <p>Chọn một lĩnh vực hoặc khái niệm để xem quan hệ, định nghĩa, định lý, ví dụ và các nội dung liên quan.</p>
      </div>
      <div className="cosmos-runtime-badges">
        <span><Box size={14} />InstancedMesh</span>
        <PrecisionBadge mode="visual" suffix="3D knowledge coordinates" compact />
        <span><Cpu size={14} />{webgpu ? 'WebGPU detected' : 'WebGL2 fallback'}</span>
        <span><Network size={14} />{layoutMode === 'worker' ? 'Worker layout' : layoutMode === 'fallback' ? 'Layout fallback' : 'Đang bố trí'}{layoutDurationMs !== null ? ' · ' + layoutDurationMs.toFixed(1) + ' ms' : ''}</span>
        <span><Layers3 size={14} />{data.nodes.length} node đang render</span>
      </div>
    </div>

    <div className="cosmos-stage">
      <MathCosmosGraph
        nodes={data.nodes}
        edges={data.edges}
        selectedId={selected?.id || null}
        onSelect={selectNode}
        reduceMotion={reduceMotion}
        quality={mobileQuality ? 'mobile' : 'desktop'}
      />

      <div className="cosmos-search-panel">
        <label>
          <Search size={15} />
          <input
            aria-label="Tìm trong bản đồ toán học 3D"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Tìm Taylor, Bayes, vector riêng..."
          />
          {query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><X size={14} /></button>}
        </label>
        {query && <div className="cosmos-search-results">
          {results.length ? results.map(node => <button type="button" key={node.id} onClick={() => selectNode(node)}>
            <span className={'cosmos-result-kind ' + node.kind}>{node.kind}</span>
            <span><strong>{node.title}</strong><small>{node.subtitle}</small></span>
          </button>) : <p>Chưa có mục phù hợp trong phần đang mở.</p>}
        </div>}
      </div>

      <div className="cosmos-quick-jumps" aria-label="Điểm truy cập nhanh trong bản đồ 3D">
        {QUICK_JUMPS.map(([id, label]) => <button type="button" key={id} onClick={() => jumpTo(id)}>{label}</button>)}
      </div>

      {selected && <aside className="cosmos-hud" aria-live="polite">
        <div className="cosmos-hud-top">
          <span className={'cosmos-node-kind ' + selected.kind}>{selected.kind === 'domain' ? 'LĨNH VỰC' : selected.kind === 'concept' ? 'KHÁI NIỆM' : 'CHI TIẾT'}</span>
          <span>{selected.subtitle}</span>
        </div>
        <h2>{selected.title}</h2>
        <p>{selected.description}</p>
        {selected.formula && <div className="cosmos-formula"><ChatText text={selected.formula} /></div>}
        <div className="cosmos-hud-actions">
          <Link to={selected.href} className="button button-light">Mở cấu trúc đầy đủ<ArrowRight size={15} /></Link>
          {selected.kind === 'concept' && expandedConceptId === selected.entityId && <button type="button" className="button button-light" onClick={() => setExpandedConceptId(null)}><Focus size={15} />Thu gọn vi mô</button>}
        </div>
      </aside>}
    </div>

    <div className="cosmos-explainer-grid">
      <article className="panel">
        <span className="small-icon green"><Network size={19} /></span>
        <h2>Lĩnh vực → Khái niệm → Nội dung</h2>
        <p>{MATH_DOMAINS.length} lĩnh vực chứa {MATH_CONCEPTS.length} khái niệm. Khi chọn một khái niệm, MathNexus mở tiếp {MATH_ATOMS.length} mục nội dung chi tiết hiện có.</p>
      </article>
      <article className="panel">
        <span className="small-icon blue"><Sparkles size={19} /></span>
        <h2>Di chuyển camera</h2>
        <p>Camera di chuyển theo đường ngắn tới nút được chọn. Nếu thiết bị bật chế độ giảm chuyển động, vị trí sẽ được đổi ngay mà không chạy hiệu ứng.</p>
      </article>
      <article className="panel">
        <span className="small-icon lilac"><Cpu size={19} /></span>
        <h2>Hiển thị nhiều nút</h2>
        <p>Các nút dùng chung cơ chế hiển thị; phần bố trí chạy riêng trong Web Worker để giảm tải cho giao diện khi bản đồ có nhiều dữ liệu.</p>
      </article>
    </div>
  </section>;
}
