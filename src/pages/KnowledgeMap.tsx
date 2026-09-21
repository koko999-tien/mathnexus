import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, Check, CircleDot, Gauge, GitBranch, GraduationCap, Layers3, LockKeyhole, Network, Route, Sparkles, Wrench } from 'lucide-react';
import { MATH_CONCEPTS, MATH_DOMAINS, type MathConcept } from '../data/mathKnowledge';
import { MATH_ATOMS, ONTOLOGY_KIND_META, type MathAtom, type OntologyKind } from '../data/mathOntology';
import { FORMS } from '../data/formulas';
import { LESSONS } from '../data/lessons';
import { useProgress } from '../hooks/useProgress';
import { conceptProgress, directDependents, learningPathTo } from '../utils/knowledgeGraph';
import { atomsForConcept, atomDependencies, ontologyDepthScore } from '../utils/mathOntology';
import { conceptMastery, masteryLabel } from '../utils/conceptMastery';
import { ChatText } from '../components/ui/ChatText';
import { recordAtomExploration, recordConceptExploration } from '../exploration/explorationState';

const STATE_LABEL = {
  covered: 'Đã học',
  ready: 'Sẵn sàng',
  locked: 'Cần tiên quyết',
  gap: 'Khoảng trống nội dung',
} as const;

export default function KnowledgeMap() {
  const progress = useProgress();
  const [params, setParams] = useSearchParams();
  const progressItems = useMemo(() => conceptProgress(progress), [progress]);
  const defaultConcept = progressItems.find(item => item.state === 'ready')?.concept.id || MATH_CONCEPTS[0].id;
  const selectedId = MATH_CONCEPTS.some(concept => concept.id === params.get('concept')) ? params.get('concept')! : defaultConcept;
  const selected = MATH_CONCEPTS.find(concept => concept.id === selectedId)!;
  const selectedProgress = progressItems.find(item => item.concept.id === selectedId)!;
  const path = learningPathTo(selectedId);
  const dependents = directDependents(selectedId);
  const atoms = atomsForConcept(selectedId);
  const mastery = conceptMastery(progress, selectedId);
  const requestedAtomId = params.get('atom');
  const selectedAtom = atoms.find(atom => atom.id === requestedAtomId) || atoms[0];
  const requestedAtomValid = Boolean(requestedAtomId && MATH_ATOMS.some(atom => atom.id === requestedAtomId && atom.conceptId === selectedId));
  const ontologyScore = ontologyDepthScore(selectedId);

  useEffect(() => {
    recordConceptExploration(selectedId);
    if (requestedAtomId && requestedAtomValid) recordAtomExploration(requestedAtomId);
  }, [requestedAtomId, requestedAtomValid, selectedId]);

  const selectConcept = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('concept', id);
    next.delete('atom');
    setParams(next, { replace: true });
  };

  const selectAtom = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('concept', selectedId);
    next.set('atom', id);
    setParams(next, { replace: true });
  };

  return <section className="page-enter">
    <div className="page-header">
      <p className="eyebrow">MATH KNOWLEDGE GRAPH</p>
      <h1>Bản đồ cấu trúc toán học</h1>
      <p>Không xem toán như một danh sách bài rời. Mỗi khái niệm nằm trong một mạng tiên quyết: biết gì trước, đang đứng ở đâu và từ đây có thể đi tiếp tới đâu.</p>
    </div>

    <div className="knowledge-summary">
      <SummaryCard icon={<Network size={19} />} value={MATH_CONCEPTS.length} label="khái niệm" />
      <SummaryCard icon={<GitBranch size={19} />} value={MATH_DOMAINS.length} label="lĩnh vực" />
      <SummaryCard icon={<Check size={19} />} value={progressItems.filter(item => item.covered).length} label="đã có bằng chứng học" />
      <SummaryCard icon={<Sparkles size={19} />} value={progressItems.filter(item => item.state === 'ready').length} label="đang sẵn sàng học" />
      <SummaryCard icon={<Layers3 size={19} />} value={MATH_ATOMS.length} label="mảnh tri thức sâu" />
    </div>

    <div className="knowledge-layout">
      <div className="knowledge-domains">
        {MATH_DOMAINS.map(domain => {
          const items = progressItems.filter(item => item.concept.domain === domain.id);
          const covered = items.filter(item => item.covered).length;
          return <section className="panel knowledge-domain" key={domain.id}>
            <div className="knowledge-domain-head">
              <div><span className="domain-order">{String(domain.order).padStart(2, '0')}</span><h2>{domain.name}</h2><p>{domain.description}</p></div>
              <span className="domain-progress">{covered}/{items.length}</span>
            </div>
            <div className="knowledge-domain-track"><span style={{ width: (items.length ? covered / items.length * 100 : 0) + '%' }} /></div>
            <div className="concept-list">
              {items.sort((a, b) => a.depth - b.depth || a.concept.title.localeCompare(b.concept.title, 'vi')).map(item =>
                <button key={item.concept.id} type="button" className={'concept-node ' + item.state + (selectedId === item.concept.id ? ' is-selected' : '')} onClick={() => selectConcept(item.concept.id)}>
                  <span className="concept-state-icon">{item.state === 'covered' ? <Check size={13} /> : item.state === 'locked' ? <LockKeyhole size={13} /> : <CircleDot size={13} />}</span>
                  <span className="concept-node-copy"><strong>{item.concept.title}</strong><small>Tầng {item.depth} · {item.concept.level}</small></span>
                  <span className="concept-state-label">{STATE_LABEL[item.state]}</span>
                </button>
              )}
            </div>
          </section>;
        })}
      </div>

      <aside className="knowledge-inspector">
        <div className="panel knowledge-inspector-card">
          <div className="concept-inspector-top">
            <span className={'concept-status-pill ' + selectedProgress.state}>{STATE_LABEL[selectedProgress.state]}</span>
            <span>{MATH_DOMAINS.find(domain => domain.id === selected.domain)?.name}</span>
          </div>
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>

          <div className="concept-meta-grid">
            <div><span>Cấp độ</span><strong>{selected.level}</strong></div>
            <div><span>Độ sâu</span><strong>Tầng {selectedProgress.depth}</strong></div>
            <div><span>Tiên quyết trực tiếp</span><strong>{selected.prerequisites.length}</strong></div>
            <div><span>Mở ra tiếp</span><strong>{dependents.length}</strong></div>
          </div>

          <div className="mastery-evidence-card">
            <div className="mastery-evidence-head">
              <span className="small-icon green"><Gauge size={16} /></span>
              <div><strong>Mức thành thạo theo bằng chứng</strong><small>Không đồng nhất “đã mở bài” với “đã hiểu”.</small></div>
              <span className={'mastery-state ' + mastery.state}>{masteryLabel(mastery.state)}</span>
            </div>
            <div className="mastery-evidence-metrics">
              <div><span>Điểm bằng chứng</span><strong>{mastery.score === null ? '—' : mastery.score + '%'}</strong></div>
              <div><span>Độ tin cậy</span><strong>{mastery.confidence}%</strong></div>
              <div><span>Độ sâu nội dung</span><strong>{ontologyScore}%</strong></div>
            </div>
            <div className="mastery-evidence-list">{mastery.evidence.map(item => <span key={item}><Check size={11} />{item}</span>)}</div>
          </div>

          <ConceptRelations title="Cần biết trước" concepts={selected.prerequisites.map(id => MATH_CONCEPTS.find(concept => concept.id === id)).filter((item): item is MathConcept => Boolean(item))} onSelect={selectConcept} empty="Đây là một nút nền tảng." />
          <ConceptRelations title="Sau khái niệm này" concepts={dependents} onSelect={selectConcept} empty="Chưa có nút phụ thuộc trực tiếp trong bản đồ hiện tại." />

          <div className="concept-resources">
            <h3>Tài nguyên gắn với nút này</h3>
            {selected.lessonIds?.map(id => {
              const lesson = LESSONS.find(item => item.id === id);
              return lesson ? <Link key={'lesson-' + id} to={'/lesson/' + id}><BookOpen size={15} /><span><strong>{lesson.t}</strong><small>Bài học · {lesson.lv}</small></span><ArrowRight size={14} /></Link> : null;
            })}
            {selected.formulaIds?.map(id => {
              const formula = FORMS.find(item => item.id === id);
              return formula ? <Link key={'formula-' + id} to={'/formula/' + id}><GitBranch size={15} /><span><strong>{formula.name}</strong><small>Công thức · {formula.cat}</small></span><ArrowRight size={14} /></Link> : null;
            })}
            {selected.toolPaths?.map(pathname => <Link key={pathname} to={pathname}><Wrench size={15} /><span><strong>{toolLabel(pathname)}</strong><small>Công cụ thực hành</small></span><ArrowRight size={14} /></Link>)}
            {!selected.lessonIds?.length && !selected.formulaIds?.length && !selected.toolPaths?.length && <div className="resource-gap"><Route size={18} /><span><strong>Nút kiến thức chưa có tài nguyên riêng</strong><small>Đây là một khoảng trống nội dung mà MathNexus cần phát triển tiếp.</small></span></div>}
          </div>
        </div>

        <div className="panel ontology-card">
          <div className="ontology-title">
            <div><p className="eyebrow">DEEP ONTOLOGY</p><h2>Bên trong “{selected.title}”</h2></div>
            <span>{atoms.length ? atoms.length + ' mảnh' : 'chưa phân rã'}</span>
          </div>
          {atoms.length ? <>
            <div className="ontology-kind-grid">
              {(['definition','theorem','lemma','proof','example','counterexample','subskill','misconception','exercise','application'] as OntologyKind[]).map(kind => {
                const count = atoms.filter(atom => atom.kind === kind).length;
                return count ? <div key={kind}><strong>{count}</strong><span>{ONTOLOGY_KIND_META[kind].label}</span></div> : null;
              })}
            </div>
            <div className="ontology-atom-list">
              {atoms.map(atom => <button type="button" key={atom.id} onClick={() => selectAtom(atom.id)} className={selectedAtom?.id === atom.id ? 'is-selected' : ''}>
                <span className={'atom-kind ' + atom.kind}>{ONTOLOGY_KIND_META[atom.kind].short}</span>
                <span><strong>{atom.title}</strong><small>{ONTOLOGY_KIND_META[atom.kind].label}{atom.difficulty ? ' · ' + atom.difficulty : ''}</small></span>
              </button>)}
            </div>
            {selectedAtom && <AtomInspector atom={selectedAtom} />}
          </> : <div className="ontology-empty"><AlertTriangle size={18} /><div><strong>Khái niệm này chưa được phân rã học thuật.</strong><p>Graph đã biết vị trí của nó, nhưng MathNexus chưa có định nghĩa/định lý/ví dụ/ngộ nhận ở tầng sâu.</p></div></div>}
        </div>

        <div className="panel learning-path-card">
          <div className="learning-path-title"><Route size={17} /><div><strong>Đường học tới “{selected.title}”</strong><span>{path.length} nút từ nền tảng đến mục tiêu</span></div></div>
          <div className="learning-path-list">
            {path.map((concept, index) => {
              const state = progressItems.find(item => item.concept.id === concept.id)?.state || 'locked';
              return <button key={concept.id} type="button" onClick={() => selectConcept(concept.id)} className={concept.id === selected.id ? 'is-target' : ''}>
                <span className={'path-index ' + state}>{state === 'covered' ? <Check size={12} /> : index + 1}</span>
                <span><strong>{concept.title}</strong><small>{MATH_DOMAINS.find(domain => domain.id === concept.domain)?.short} · {concept.level}</small></span>
              </button>;
            })}
          </div>
        </div>
      </aside>
    </div>
  </section>;
}

function AtomInspector({ atom }: { atom: MathAtom }) {
  const dependencies = atomDependencies(atom.id);
  return <div className="atom-inspector">
    <div className="atom-inspector-head"><span className={'atom-kind ' + atom.kind}>{ONTOLOGY_KIND_META[atom.kind].label}</span>{atom.difficulty && <span>{atom.difficulty}</span>}</div>
    <h3>{atom.title}</h3>
    <p><ChatText text={atom.summary} /></p>
    {atom.formula && <div className="atom-formula"><ChatText text={atom.formula} /></div>}
    {atom.body && <p className="atom-body"><ChatText text={atom.body} /></p>}
    {dependencies.length > 0 && <div className="atom-dependencies"><strong>Dựa trên</strong>{dependencies.map(item => <span key={item.id}>{item.title}</span>)}</div>}
    {atom.kind === 'misconception' && <div className="misconception-note"><AlertTriangle size={14} /><span>Đây là lỗi tư duy cần chủ động kiểm tra khi luyện tập.</span></div>}
    {atom.kind === 'exercise' && <Link className="text-link ontology-practice-link" to="/practice"><GraduationCap size={14} />Mở khu luyện tập<ArrowRight size={13} /></Link>}
  </div>;
}

function SummaryCard({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return <div className="knowledge-summary-card"><span className="small-icon green">{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function ConceptRelations({ title, concepts, onSelect, empty }: { title: string; concepts: MathConcept[]; onSelect: (id: string) => void; empty: string }) {
  return <div className="concept-relations"><h3>{title}</h3>{concepts.length ? <div>{concepts.map(concept => <button type="button" key={concept.id} onClick={() => onSelect(concept.id)}>{concept.title}<ArrowRight size={13} /></button>)}</div> : <p>{empty}</p>}</div>;
}

function toolLabel(path: string) {
  if (path === '/calculus') return 'Phòng thí nghiệm giải tích';
  if (path === '/graph') return 'Phòng thí nghiệm hàm số';
  if (path === '/tools') return 'Math Workbench';
  if (path === '/simulations/gravity') return 'Phòng mô phỏng hấp dẫn N-body';
  return 'Công cụ toán học';
}
