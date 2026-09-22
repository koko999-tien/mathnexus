import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, WheelEvent as ReactWheelEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, CircleDot, Download, Hand, Layers3, Link as LinkIcon, Maximize2,
  Minus, MousePointer2, Pencil, Plus, RotateCcw, Save, Sigma, Trash2, Type,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import { ChatText } from '../components/ui/ChatText';
import { MATH_CONCEPTS } from '../data/mathKnowledge';
import { FORMS } from '../data/formulas';
import { downloadFile } from '../utils/download';
import { clampCanvasZoom, screenToWorld, translateObject, zoomViewportAt } from '../canvas/canvasMath';
import {
  clearCanvasState, createEmptyCanvasState, createStableId, loadCanvasState, saveCanvasState,
} from '../canvas/canvasStorage';
import type {
  CanvasPoint, CanvasTool, MathCanvasObject, MathCanvasState,
} from '../canvas/types';

const CANVAS_ID = 'main';

function now() {
  return new Date().toISOString();
}

function defaultObject(type: MathCanvasObject['type'], point: CanvasPoint): MathCanvasObject {
  const base = {
    id: createStableId(type),
    x: point.x,
    y: point.y,
    width: 280,
    height: 150,
    createdAt: now(),
    updatedAt: now(),
  };

  if (type === 'text') return { ...base, type, text: 'Một ý tưởng toán học mới…' };
  if (type === 'latex') return { ...base, type, latex: 'e^{i\\pi}+1=0' };
  if (type === 'concept') return { ...base, type, conceptId: MATH_CONCEPTS[0]?.id || '' };
  if (type === 'formula') return { ...base, type, formulaId: FORMS[0]?.id || '' };
  if (type === 'simulation') return { ...base, type, simulationId: 'gravity', width: 310, height: 170 };
  if (type === 'link') return { ...base, type, label: 'Nguồn tham khảo', url: 'https://', width: 300, height: 120 };
  if (type === 'stroke') return { ...base, type, points: [point], width: 1, height: 1 };
  return { ...base, type: 'arrow', x2: point.x + 180, y2: point.y, width: 180, height: 1 };
}

export default function MathCanvas() {
  const [canvas, setCanvas] = useState<MathCanvasState>(() => loadCanvasState(CANVAS_ID));
  const [tool, setTool] = useState<CanvasTool>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(true);
  const [arrowStart, setArrowStart] = useState<CanvasPoint | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const latestCanvasRef = useRef(canvas);
  const panRef = useRef<{ pointerId: number; x: number; y: number; vx: number; vy: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    start: CanvasPoint;
    snapshots: Map<string, MathCanvasObject>;
  } | null>(null);
  const drawRef = useRef<{ pointerId: number; id: string; points: CanvasPoint[] } | null>(null);

  useEffect(() => {
    latestCanvasRef.current = canvas;
    setSaved(false);
    const timer = window.setTimeout(() => {
      setSaved(saveCanvasState({ ...canvas, updatedAt: now() }).ok);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [canvas]);

  useEffect(() => () => {
    const latest = latestCanvasRef.current;
    saveCanvasState({ ...latest, updatedAt: now() });
  }, []);

  const selected = useMemo(
    () => canvas.objects.filter(object => selectedIds.includes(object.id)),
    [canvas.objects, selectedIds],
  );
  const primary = selected.length === 1 ? selected[0] : null;

  const stageOrigin = () => {
    const rect = stageRef.current?.getBoundingClientRect();
    return { x: rect?.left || 0, y: rect?.top || 0 };
  };

  const pointerWorld = (clientX: number, clientY: number) =>
    screenToWorld({ x: clientX, y: clientY }, canvas.viewport, stageOrigin());

  const stageCenter = () => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return pointerWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const updateObjects = (updater: (objects: MathCanvasObject[]) => MathCanvasObject[]) => {
    setCanvas(current => ({ ...current, objects: updater(current.objects), updatedAt: now() }));
  };

  const addObject = (type: Exclude<MathCanvasObject['type'], 'stroke' | 'arrow'>) => {
    const object = defaultObject(type, stageCenter());
    updateObjects(objects => [...objects, object]);
    setSelectedIds([object.id]);
    setTool('select');
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0014);
    setCanvas(current => ({
      ...current,
      viewport: zoomViewportAt(
        current.viewport,
        current.viewport.zoom * factor,
        { x: event.clientX, y: event.clientY },
        stageOrigin(),
      ),
      updatedAt: now(),
    }));
  };

  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const isBackground = event.target === event.currentTarget || (event.target as HTMLElement).dataset.canvasLayer === 'world';
    const point = pointerWorld(event.clientX, event.clientY);

    if (tool === 'pan' && isBackground) {
      panRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        vx: canvas.viewport.x,
        vy: canvas.viewport.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'draw' && isBackground) {
      const object = defaultObject('stroke', point);
      if (object.type !== 'stroke') return;
      drawRef.current = { pointerId: event.pointerId, id: object.id, points: [point] };
      updateObjects(objects => [...objects, object]);
      setSelectedIds([object.id]);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'arrow' && isBackground) {
      if (!arrowStart) {
        setArrowStart(point);
      } else {
        const object = defaultObject('arrow', arrowStart);
        if (object.type === 'arrow') {
          object.x2 = point.x;
          object.y2 = point.y;
          object.width = Math.abs(point.x - arrowStart.x);
          object.height = Math.abs(point.y - arrowStart.y);
          updateObjects(objects => [...objects, object]);
          setSelectedIds([object.id]);
        }
        setArrowStart(null);
        setTool('select');
      }
      return;
    }

    if (tool === 'select' && isBackground) setSelectedIds([]);
  };

  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) {
      const pan = panRef.current;
      setCanvas(current => ({
        ...current,
        viewport: {
          ...current.viewport,
          x: pan.vx + event.clientX - pan.x,
          y: pan.vy + event.clientY - pan.y,
        },
      }));
      return;
    }

    if (dragRef.current?.pointerId === event.pointerId) {
      const point = pointerWorld(event.clientX, event.clientY);
      const dx = point.x - dragRef.current.start.x;
      const dy = point.y - dragRef.current.start.y;
      const snapshots = dragRef.current.snapshots;
      updateObjects(objects => objects.map(object => {
        const snapshot = snapshots.get(object.id);
        return snapshot ? translateObject(snapshot, dx, dy) : object;
      }));
      return;
    }

    if (drawRef.current?.pointerId === event.pointerId) {
      const point = pointerWorld(event.clientX, event.clientY);
      const points = drawRef.current.points;
      const previous = points[points.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < 2 / canvas.viewport.zoom) return;
      points.push(point);
      const id = drawRef.current.id;
      updateObjects(objects => objects.map(object =>
        object.id === id && object.type === 'stroke'
          ? { ...object, points: [...points], updatedAt: now() }
          : object
      ));
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (drawRef.current?.pointerId === event.pointerId) drawRef.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture may already be released */ }
  };

  const beginObjectDrag = (event: ReactPointerEvent<Element>, object: MathCanvasObject) => {
    if (tool !== 'select' || event.button !== 0) return;
    event.stopPropagation();

    let nextSelection = selectedIds;
    if (event.shiftKey) {
      nextSelection = selectedIds.includes(object.id)
        ? selectedIds.filter(id => id !== object.id)
        : [...selectedIds, object.id];
      setSelectedIds(nextSelection);
      return;
    }

    if (!selectedIds.includes(object.id)) {
      nextSelection = [object.id];
      setSelectedIds(nextSelection);
    }

    const groupMembers = object.groupId
      ? canvas.objects.filter(item => item.groupId === object.groupId).map(item => item.id)
      : [];
    const movingIds = new Set(groupMembers.length ? groupMembers : nextSelection);
    if (!movingIds.has(object.id)) movingIds.add(object.id);

    const snapshots = new Map(
      canvas.objects.filter(item => movingIds.has(item.id)).map(item => [item.id, structuredClone(item)]),
    );

    dragRef.current = {
      pointerId: event.pointerId,
      start: pointerWorld(event.clientX, event.clientY),
      snapshots,
    };
    stageRef.current?.setPointerCapture(event.pointerId);
  };

  const deleteSelected = () => {
    const ids = new Set(selectedIds);
    updateObjects(objects => objects.filter(object => !ids.has(object.id)));
    setSelectedIds([]);
  };

  const groupSelected = () => {
    if (selectedIds.length < 2) return;
    const groupId = createStableId('group');
    const ids = new Set(selectedIds);
    updateObjects(objects => objects.map(object => ids.has(object.id) ? { ...object, groupId, updatedAt: now() } : object));
  };

  const ungroupSelected = () => {
    const ids = new Set(selectedIds);
    updateObjects(objects => objects.map(object => ids.has(object.id)
      ? { ...object, groupId: undefined, updatedAt: now() }
      : object
    ));
  };

  const patchPrimary = (patch: Partial<MathCanvasObject>) => {
    if (!primary) return;
    updateObjects(objects => objects.map(object => object.id === primary.id
      ? { ...object, ...patch, id: object.id, type: object.type, updatedAt: now() } as MathCanvasObject
      : object
    ));
  };

  const resetCanvas = () => {
    if (!window.confirm('Xóa toàn bộ Math Canvas trên trình duyệt này?')) return;
    clearCanvasState(CANVAS_ID);
    setCanvas(createEmptyCanvasState(CANVAS_ID));
    setSelectedIds([]);
    setArrowStart(null);
  };

  const exportCanvas = () => {
    const payload = JSON.stringify({ app: 'MathNexus', kind: 'math-canvas', ...canvas }, null, 2);
    downloadFile(payload, 'mathnexus-math-canvas.json', 'application/json;charset=utf-8');
  };

  return <section className="math-canvas-page page-enter">
    <div className="canvas-page-head">
      <div>
        <p className="eyebrow">BẢNG GHI CHÚ TOÁN HỌC</p>
        <h1>Math Canvas</h1>
        <p>Đặt ghi chú, công thức, khái niệm và mô phỏng trên cùng một mặt phẳng. Có thể kéo, phóng to, thu nhỏ và nối các mục với nhau.</p>
      </div>
      <div className="canvas-save-state" role="status"><Save size={14} />{saved ? 'Đã lưu cục bộ' : 'Đang chờ lưu…'}</div>
    </div>

    <div className="math-canvas-shell">
      <div className="canvas-toolbar panel" aria-label="Thanh công cụ Math Canvas">
        <div className="canvas-tool-group">
          <ToolButton active={tool === 'select'} label="Chọn" onClick={() => { setTool('select'); setArrowStart(null); }} icon={<MousePointer2 size={15} />} />
          <ToolButton active={tool === 'pan'} label="Pan" onClick={() => { setTool('pan'); setArrowStart(null); }} icon={<Hand size={15} />} />
          <ToolButton active={tool === 'draw'} label="Vẽ" onClick={() => { setTool('draw'); setArrowStart(null); }} icon={<Pencil size={15} />} />
          <ToolButton active={tool === 'arrow'} label="Mũi tên" onClick={() => { setTool('arrow'); setArrowStart(null); }} icon={<Minus size={15} />} />
        </div>

        <div className="canvas-toolbar-divider" />

        <div className="canvas-tool-group">
          <ToolButton label="Thêm văn bản" onClick={() => addObject('text')} icon={<Type size={15} />} />
          <ToolButton label="Thêm LaTeX" onClick={() => addObject('latex')} icon={<Sigma size={15} />} />
          <ToolButton label="Thêm khái niệm" onClick={() => addObject('concept')} icon={<BookOpen size={15} />} />
          <ToolButton label="Thêm công thức" onClick={() => addObject('formula')} icon={<Plus size={15} />} />
          <ToolButton label="Thêm mô phỏng" onClick={() => addObject('simulation')} icon={<CircleDot size={15} />} />
          <ToolButton label="Thêm liên kết" onClick={() => addObject('link')} icon={<LinkIcon size={15} />} />
        </div>

        <div className="canvas-toolbar-divider" />

        <div className="canvas-tool-group">
          <ToolButton label="Thu nhỏ" onClick={() => setCanvas(current => ({ ...current, viewport: { ...current.viewport, zoom: clampCanvasZoom(current.viewport.zoom / 1.2) } }))} icon={<ZoomOut size={15} />} />
          <span className="canvas-zoom-readout">{Math.round(canvas.viewport.zoom * 100)}%</span>
          <ToolButton label="Phóng to" onClick={() => setCanvas(current => ({ ...current, viewport: { ...current.viewport, zoom: clampCanvasZoom(current.viewport.zoom * 1.2) } }))} icon={<ZoomIn size={15} />} />
          <ToolButton label="Đặt lại khung nhìn" onClick={() => setCanvas(current => ({ ...current, viewport: { x: 0, y: 0, zoom: 1 } }))} icon={<Maximize2 size={15} />} />
        </div>

        <div className="canvas-toolbar-spacer" />
        <div className="canvas-tool-group">
          <button type="button" className="canvas-icon-button" disabled={selectedIds.length < 2} onClick={groupSelected} aria-label="Nhóm đối tượng"><Layers3 size={15} /></button>
          <button type="button" className="canvas-icon-button" disabled={!selected.some(item => item.groupId)} onClick={ungroupSelected} aria-label="Bỏ nhóm"><RotateCcw size={15} /></button>
          <button type="button" className="canvas-icon-button danger" disabled={!selectedIds.length} onClick={deleteSelected} aria-label="Xóa đối tượng đã chọn"><Trash2 size={15} /></button>
          <button type="button" className="canvas-icon-button" onClick={exportCanvas} aria-label="Xuất Math Canvas"><Download size={15} /></button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={'math-canvas-stage tool-' + tool}
        onWheel={onWheel}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        data-testid="math-canvas-stage"
        style={{
          '--canvas-zoom': canvas.viewport.zoom,
          '--canvas-grid-x': canvas.viewport.x + 'px',
          '--canvas-grid-y': canvas.viewport.y + 'px',
          '--canvas-grid-size': (24 * canvas.viewport.zoom) + 'px',
          '--canvas-grid-major': (120 * canvas.viewport.zoom) + 'px',
        } as CSSProperties}
      >
        <div
          className="math-canvas-world"
          data-canvas-layer="world"
          style={{ transform: `translate(${canvas.viewport.x}px, ${canvas.viewport.y}px) scale(${canvas.viewport.zoom})` }}
        >
          <svg className="canvas-vector-layer" data-canvas-layer="world" viewBox="-50000 -50000 100000 100000" aria-hidden="true">
            <defs>
              <marker id="canvas-arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" />
              </marker>
            </defs>
            {canvas.objects.map(object => {
              const selectVector = (event: ReactPointerEvent<Element>) => {
                event.stopPropagation();
                if (event.shiftKey) {
                  setSelectedIds(current => current.includes(object.id)
                    ? current.filter(id => id !== object.id)
                    : [...current, object.id]
                  );
                  return;
                }
                if (!selectedIds.includes(object.id)) setSelectedIds([object.id]);
                beginObjectDrag(event, object);
              };

              if (object.type === 'stroke') {
                const d = object.points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
                return <g key={object.id} className={selectedIds.includes(object.id) ? 'canvas-stroke-group selected' : 'canvas-stroke-group'}>
                  <path d={d} className="canvas-stroke" />
                  <path d={d} className="canvas-vector-hit" onPointerDown={selectVector} />
                </g>;
              }
              if (object.type === 'arrow') {
                return <g key={object.id} className={selectedIds.includes(object.id) ? 'canvas-arrow selected' : 'canvas-arrow'}>
                  <line x1={object.x} y1={object.y} x2={object.x2} y2={object.y2} markerEnd="url(#canvas-arrow-head)" />
                  <line x1={object.x} y1={object.y} x2={object.x2} y2={object.y2} className="canvas-vector-hit" onPointerDown={selectVector} />
                  {object.label && <text x={(object.x + object.x2) / 2} y={(object.y + object.y2) / 2 - 7}>{object.label}</text>}
                </g>;
              }
              return null;
            })}
            {arrowStart && tool === 'arrow' && <circle cx={arrowStart.x} cy={arrowStart.y} r={6 / canvas.viewport.zoom} className="canvas-arrow-start" />}
          </svg>

          {canvas.objects.map(object => object.type === 'stroke' || object.type === 'arrow' ? null : (
            <CanvasCard
              key={object.id}
              object={object}
              selected={selectedIds.includes(object.id)}
              onPointerDown={event => beginObjectDrag(event, object)}
              onSelect={event => {
                event.stopPropagation();
                if (event.shiftKey) {
                  setSelectedIds(current => current.includes(object.id)
                    ? current.filter(id => id !== object.id)
                    : [...current, object.id]
                  );
                } else {
                  setSelectedIds([object.id]);
                }
              }}
            />
          ))}
        </div>

        {!canvas.objects.length && <div className="canvas-empty-state">
          <NetworkIcon />
          <h2>Bắt đầu bằng một mảnh tri thức</h2>
          <p>Thêm văn bản, LaTeX, khái niệm hoặc kéo tự do trên mặt phẳng. Dùng bánh xe chuột để zoom quanh vị trí con trỏ.</p>
          <button type="button" className="button button-dark" onClick={() => addObject('concept')}><BookOpen size={15} />Thêm concept đầu tiên</button>
        </div>}

        <div className="canvas-coordinate-hud">
          <span>x {Math.round(canvas.viewport.x)}</span>
          <span>y {Math.round(canvas.viewport.y)}</span>
          <span>{Math.round(canvas.viewport.zoom * 100)}%</span>
          {arrowStart && <span>Chọn điểm cuối mũi tên</span>}
        </div>
      </div>

      <aside className="canvas-inspector panel">
        <div className="canvas-inspector-head">
          <div><p className="eyebrow">INSPECTOR</p><h2>{selectedIds.length ? `${selectedIds.length} đối tượng` : 'Không có lựa chọn'}</h2></div>
          {selectedIds.length > 0 && <button type="button" className="canvas-icon-button" onClick={() => setSelectedIds([])} aria-label="Bỏ chọn"><Trash2 size={14} /></button>}
        </div>

        {!selectedIds.length && <div className="canvas-inspector-empty">
          <p>Chọn một card để chỉnh nội dung. Shift + click để chọn nhiều đối tượng rồi nhóm chúng.</p>
        </div>}

        {selectedIds.length > 1 && <div className="canvas-multi-inspector">
          <p>{selectedIds.length} đối tượng đang được chọn.</p>
          <button type="button" className="button button-light" onClick={groupSelected}><Layers3 size={15} />Nhóm lại</button>
          <button type="button" className="button button-light" onClick={ungroupSelected}>Bỏ nhóm</button>
        </div>}

        {primary && <ObjectInspector object={primary} patch={patchPrimary} />}
      </aside>
    </div>

    <div className="canvas-footer-actions">
      <label className="canvas-title-field">Tên workspace
        <input
          aria-label="Tên Math Canvas"
          value={canvas.title}
          maxLength={160}
          onChange={event => setCanvas(current => ({ ...current, title: event.target.value, updatedAt: now() }))}
        />
      </label>
      <div>
        <span>{canvas.objects.length} đối tượng · {new Set(canvas.objects.map(item => item.groupId).filter(Boolean)).size} nhóm</span>
        <button type="button" className="button button-light" onClick={resetCanvas}><Trash2 size={15} />Xóa workspace</button>
      </div>
    </div>
  </section>;
}

function ToolButton({ label, icon, active, onClick }: { label: string; icon: ReactNode; active?: boolean; onClick: () => void }) {
  return <button type="button" className={'canvas-icon-button ' + (active ? 'active' : '')} onClick={onClick} aria-label={label} title={label}>{icon}</button>;
}

function CanvasCard({
  object,
  selected,
  onPointerDown,
  onSelect,
}: {
  object: Exclude<MathCanvasObject, { type: 'stroke' | 'arrow' }>;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onSelect: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  return <article
    className={'canvas-object canvas-object-' + object.type + (selected ? ' selected' : '')}
    style={{ left: object.x, top: object.y, width: object.width, minHeight: object.height }}
    onPointerDown={event => {
      onSelect(event);
      if (!event.shiftKey) onPointerDown(event);
    }}
    data-object-id={object.id}
  >
    <CanvasObjectContent object={object} />
  </article>;
}

function CanvasObjectContent({ object }: { object: Exclude<MathCanvasObject, { type: 'stroke' | 'arrow' }> }) {
  if (object.type === 'text') return <div className="canvas-text-card"><Type size={15} /><p>{object.text || 'Văn bản trống'}</p></div>;

  if (object.type === 'latex') return <div className="canvas-latex-card"><span>LaTeX</span><ChatText text={`$$${object.latex || 'x'}$$`} /></div>;

  if (object.type === 'concept') {
    const concept = MATH_CONCEPTS.find(item => item.id === object.conceptId);
    return <div className="canvas-concept-card">
      <span>CONCEPT</span>
      <h3>{concept?.title || 'Khái niệm chưa xác định'}</h3>
      <p>{concept?.description || 'Chọn một concept trong Inspector.'}</p>
      {concept && <Link to={'/map?concept=' + encodeURIComponent(concept.id)} onPointerDown={event => event.stopPropagation()}>Mở Knowledge Graph</Link>}
    </div>;
  }

  if (object.type === 'formula') {
    const formula = FORMS.find(item => item.id === object.formulaId);
    return <div className="canvas-formula-card">
      <span>FORMULA</span>
      <h3>{formula?.name || 'Công thức'}</h3>
      {formula && <ChatText text={`$$${formula.expr}$$`} />}
      {formula && <Link to={'/formula/' + formula.id} onPointerDown={event => event.stopPropagation()}>Mở giải thích</Link>}
    </div>;
  }

  if (object.type === 'simulation') return <div className="canvas-simulation-card">
    <CircleDot size={19} />
    <div><span>SIMULATION</span><h3>N-body Gravity Lab</h3><p>Leapfrog · CPU Float64 · energy drift</p></div>
    <Link to="/simulations/gravity" onPointerDown={event => event.stopPropagation()}>Mở mô phỏng</Link>
  </div>;

  return <div className="canvas-link-card">
    <LinkIcon size={17} />
    <div><span>LINK</span><strong>{object.label || object.url || 'Liên kết'}</strong><small>{object.url}</small></div>
    {safeHref(object.url) && <a href={safeHref(object.url)!} target="_blank" rel="noreferrer" onPointerDown={event => event.stopPropagation()}>Mở</a>}
  </div>;
}

function ObjectInspector({ object, patch }: { object: MathCanvasObject; patch: (patch: Partial<MathCanvasObject>) => void }) {
  return <div className="canvas-object-inspector">
    <div className="canvas-inspector-kind"><span>{object.type.toUpperCase()}</span><small>{object.id.slice(0, 18)}</small></div>

    {object.type === 'text' && <label className="field">Nội dung
      <textarea value={object.text} rows={6} onChange={event => patch({ text: event.target.value } as Partial<MathCanvasObject>)} />
    </label>}

    {object.type === 'latex' && <label className="field">LaTeX
      <textarea aria-label="Nội dung LaTeX" value={object.latex} rows={4} onChange={event => patch({ latex: event.target.value } as Partial<MathCanvasObject>)} />
    </label>}

    {object.type === 'concept' && <label className="field">Khái niệm
      <select aria-label="Khái niệm trên Canvas" value={object.conceptId} onChange={event => patch({ conceptId: event.target.value } as Partial<MathCanvasObject>)}>
        {MATH_CONCEPTS.map(concept => <option key={concept.id} value={concept.id}>{concept.title}</option>)}
      </select>
    </label>}

    {object.type === 'formula' && <label className="field">Công thức
      <select aria-label="Công thức trên Canvas" value={object.formulaId} onChange={event => patch({ formulaId: event.target.value } as Partial<MathCanvasObject>)}>
        {FORMS.map(formula => <option key={formula.id} value={formula.id}>{formula.name}</option>)}
      </select>
    </label>}

    {object.type === 'link' && <>
      <label className="field">Nhãn
        <input value={object.label} onChange={event => patch({ label: event.target.value } as Partial<MathCanvasObject>)} />
      </label>
      <label className="field">URL
        <input aria-label="URL liên kết Canvas" value={object.url} onChange={event => patch({ url: event.target.value } as Partial<MathCanvasObject>)} />
      </label>
    </>}

    {object.type === 'arrow' && <label className="field">Nhãn mũi tên
      <input value={object.label || ''} onChange={event => patch({ label: event.target.value } as Partial<MathCanvasObject>)} />
    </label>}

    {object.type !== 'stroke' && object.type !== 'arrow' && <div className="canvas-size-grid">
      <label className="field">Rộng
        <input type="number" min="80" max="1600" value={Math.round(object.width)} onChange={event => patch({ width: Number(event.target.value) } as Partial<MathCanvasObject>)} />
      </label>
      <label className="field">Cao tối thiểu
        <input type="number" min="60" max="1200" value={Math.round(object.height)} onChange={event => patch({ height: Number(event.target.value) } as Partial<MathCanvasObject>)} />
      </label>
    </div>}

    {object.groupId && <div className="canvas-group-badge"><Layers3 size={13} />Nhóm: {object.groupId.slice(0, 15)}</div>}
  </div>;
}

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function NetworkIcon() {
  return <div className="canvas-empty-icon"><Sigma size={28} /></div>;
}
