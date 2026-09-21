import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, CircleDot, GitBranch, LockKeyhole, Network, Route, Sparkles, Wrench } from 'lucide-react';
import { MATH_CONCEPTS, MATH_DOMAINS, type MathConcept } from '../data/mathKnowledge';
import { FORMS } from '../data/formulas';
import { LESSONS } from '../data/lessons';
import { useProgress } from '../hooks/useProgress';
import { conceptProgress, directDependents, learningPathTo } from '../utils/knowledgeGraph';

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

  const selectConcept = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('concept', id);
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
  return 'Công cụ toán học';
}
