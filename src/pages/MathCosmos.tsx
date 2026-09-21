import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, Cpu, Focus, Layers3, Network, Search, Sparkles, X } from 'lucide-react';
import { ChatText } from '../components/ui/ChatText';
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
        <p className="eyebrow">MATH COSMOS · DIGITAL KNOWLEDGE UNIVERSE</p>
        <h1>Vũ trụ tri thức toán học 3D</h1>
        <p>Bay xuyên qua các lĩnh vực toán, chọn một concept để mở tầng vi mô gồm định nghĩa, định lý, phản ví dụ và kỹ năng con.</p>
      </div>
      <div className="cosmos-runtime-badges">
        <span><Box size={14} />InstancedMesh</span>
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
            aria-label="Tìm node trong Math Cosmos"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Tìm Taylor, Bayes, vector riêng..."
          />
          {query && <button type="button" aria-label="Xóa tìm kiếm Cosmos" onClick={() => setQuery('')}><X size={14} /></button>}
        </label>
        {query && <div className="cosmos-search-results">
          {results.length ? results.map(node => <button type="button" key={node.id} onClick={() => selectNode(node)}>
            <span className={'cosmos-result-kind ' + node.kind}>{node.kind}</span>
            <span><strong>{node.title}</strong><small>{node.subtitle}</small></span>
          </button>) : <p>Chưa thấy node phù hợp trong lớp đang mở.</p>}
        </div>}
      </div>

      <div className="cosmos-quick-jumps" aria-label="Điểm nhảy nhanh trong Math Cosmos">
        {QUICK_JUMPS.map(([id, label]) => <button type="button" key={id} onClick={() => jumpTo(id)}>{label}</button>)}
      </div>

      {selected && <aside className="cosmos-hud" aria-live="polite">
        <div className="cosmos-hud-top">
          <span className={'cosmos-node-kind ' + selected.kind}>{selected.kind === 'domain' ? 'MACRO' : selected.kind === 'concept' ? 'CONCEPT' : 'MICRO'}</span>
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
        <h2>Macro → Concept → Micro</h2>
        <p>{MATH_DOMAINS.length} macro-domain chứa {MATH_CONCEPTS.length} concept. Khi chọn một concept, hệ thống mở tiếp ontology bên dưới từ {MATH_ATOMS.length} mảnh tri thức sâu hiện có.</p>
      </article>
      <article className="panel">
        <span className="small-icon blue"><Sparkles size={19} /></span>
        <h2>Camera có chủ đích</h2>
        <p>GSAP đưa camera bay đến node được chọn thay vì teleport. Nếu hệ điều hành bật giảm chuyển động, thời lượng animation tự hạ gần về 0.</p>
      </article>
      <article className="panel">
        <span className="small-icon lilac"><Cpu size={19} /></span>
        <h2>Renderer hướng tới hàng nghìn node</h2>
        <p>Node dùng một InstancedMesh chung. Force-layout chạy trong Web Worker, repulsion dùng spatial hash và renderer giảm node theo vùng camera để giữ main thread nhẹ hơn.</p>
      </article>
    </div>
  </section>;
}
