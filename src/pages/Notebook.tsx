import { useMemo, useRef, useState } from 'react';
import { Save, Download, Plus, Trash2, Search, Eye, Pencil, Paperclip } from 'lucide-react';
import { downloadFile } from '../utils/download';
import { save as saveLegacy } from '../utils/storage';
import {
  lessonBlock,
  loadActiveId,
  loadNotes,
  questionBlock,
  saveActiveId,
  saveNotes,
  searchNotes,
  type NotebookNote,
} from '../utils/notebook';
import { QUIZ } from '../data/quiz';
import { LESSONS } from '../data/lessons';
import { ChatText } from '../components/ui/ChatText';

const PRESETS = [
  { label: 'Định lý', prefix: '## Định lý\n' },
  { label: 'Lỗi', prefix: '## Lỗi thường gặp\n' },
  { label: 'Công thức', prefix: '### Công thức + ý nghĩa\n$...$ viết công thức inline, $$...$$ viết công thức dòng riêng\n' },
  { label: 'Phản ví dụ', prefix: '## Phản ví dụ\n' },
];

function touch(note: NotebookNote, patch: Partial<NotebookNote>): NotebookNote {
  return { ...note, ...patch, updatedAt: new Date().toISOString() };
}

export function Notebook() {
  const [notes, setNotes] = useState<NotebookNote[]>(loadNotes);
  const [activeId, setActiveId] = useState(() => loadActiveId(notes[0]?.id || ''));
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(true);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachQuery, setAttachQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const visible = useMemo(() => searchNotes(notes, query), [notes, query]);
  const active = notes.find(note => note.id === activeId) || notes[0];
  const attachNeedle = attachQuery.trim().toLowerCase();
  const matchedQuestions = QUIZ.filter(item =>
    !attachNeedle ||
    `${item.q} ${item.cat}`.toLowerCase().includes(attachNeedle),
  ).slice(0, 6);
  const matchedLessons = LESSONS.filter(item =>
    !attachNeedle ||
    `${item.t} ${item.cat}`.toLowerCase().includes(attachNeedle),
  ).slice(0, 6);

  const persist = (next: NotebookNote[], nextActiveId: string) => {
    setNotes(next);
    setActiveId(nextActiveId);
    saveActiveId(nextActiveId);
    const ok = saveNotes(next);
    const current = next.find(note => note.id === nextActiveId);
    if (current) saveLegacy('notes', current.text);
    setSaved(ok);
  };

  const updateText = (value: string) => {
    if (!active) return;
    persist(notes.map(note => note.id === active.id ? touch(note, { text: value }) : note), active.id);
  };

  const updateTitle = (value: string) => {
    if (!active) return;
    persist(notes.map(note => note.id === active.id ? touch(note, { title: value.slice(0, 120) }) : note), active.id);
  };

  const insertAtCursor = (block: string) => {
    if (!active) return;
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? active.text.length;
    const end = editor?.selectionEnd ?? start;
    const next = active.text.slice(0, start) + block + active.text.slice(end);
    persist(notes.map(note => note.id === active.id ? touch(note, { text: next }) : note), active.id);
    requestAnimationFrame(() => {
      if (!editor) return;
      editor.focus();
      const caret = start + block.length;
      editor.setSelectionRange(caret, caret);
    });
  };

  const createNote = () => {
    const note: NotebookNote = { id: `note-${Date.now().toString(36)}`, title: 'Ghi chú mới', text: '', updatedAt: new Date().toISOString() };
    persist([note, ...notes], note.id);
    setConfirmDelete(false);
  };

  const deleteActive = () => {
    if (!active) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const next = notes.filter(note => note.id !== active.id);
    const fallback: NotebookNote = { id: `note-${Date.now().toString(36)}`, title: 'Ghi chú mới', text: '', updatedAt: new Date().toISOString() };
    persist(next.length ? next : [fallback], next[0]?.id || fallback.id);
    setConfirmDelete(false);
  };

  if (!active) {
    return <section><p className="helper-text">Sổ tay trống.</p></section>;
  }

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-accent">GHI CHÚ</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Sổ tay của tôi</h1>
        <p className="text-muted max-w-lg">Định lý, lỗi thường gặp, ý tưởng — lưu trên trình duyệt này.<br /><small>Gõ $...$ cho công thức inline, $$...$$ cho công thức dòng riêng, rồi bấm Xem trước.</small></p>
      </div>

      <div className="notebook-layout">
        <aside className="notebook-list" aria-label="Danh sách ghi chú">
          <label className="field notebook-search"><Search size={15} /><input aria-label="Tìm trong sổ tay" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm ghi chú…" autoComplete="off" /></label>
          <button className="button button-light" onClick={createNote}><Plus size={16} />Ghi chú mới</button>
          <ul>
            {visible.map(note => <li key={note.id}>
              <button
                className={'notebook-item' + (note.id === active.id ? ' is-active' : '')}
                onClick={() => { setActiveId(note.id); saveActiveId(note.id); setConfirmDelete(false); }}
                aria-current={note.id === active.id}
              >
                <strong>{note.title}</strong>
                <small>{note.text.split('\n').filter(line => line.trim()).length} dòng · {new Date(note.updatedAt).toLocaleDateString('vi-VN')}</small>
              </button>
            </li>)}
          </ul>
          {!visible.length && <p className="helper-text">Không tìm thấy ghi chú nào.</p>}
        </aside>

        <div className="notebook-editor-pane">
          <div className="notebook-title-row">
            <input aria-label="Tiêu đề ghi chú" value={active.title} onChange={event => updateTitle(event.target.value)} maxLength={120} />
            <div className="notebook-view-toggle" role="group" aria-label="Chế độ xem">
              <button className={!preview ? 'is-active' : ''} onClick={() => setPreview(false)} aria-pressed={!preview}><Pencil size={14} /> Soạn</button>
              <button className={preview ? 'is-active' : ''} onClick={() => setPreview(true)} aria-pressed={preview}><Eye size={14} /> Trước</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => insertAtCursor(p.prefix)} className="filter-chip">{p.label}</button>
            ))}
            <button className="filter-chip" aria-expanded={attachOpen} onClick={() => setAttachOpen(open => !open)}><Paperclip size={14} /> Gắn câu hỏi / bài học</button>
          </div>

          {attachOpen && <div className="panel notebook-attach">
            <label className="field"><Search size={15} /><input aria-label="Tìm câu hỏi hoặc bài học để gắn" value={attachQuery} onChange={event => setAttachQuery(event.target.value)} placeholder="Gõ tên câu hỏi, bài học…" autoComplete="off" /></label>
            <p className="eyebrow">CÂU HỎI</p>
            {matchedQuestions.map(item => <div key={item.id} className="notebook-attach-row">
              <span>{item.q}</span>
              <button className="text-link" aria-label={`Gắn câu hỏi: ${item.q}`} onClick={() => insertAtCursor(questionBlock(item.q, item.a[item.i], item.ex))}>Gắn</button>
            </div>)}
            <p className="eyebrow">BÀI HỌC</p>
            {matchedLessons.map(item => <div key={item.id} className="notebook-attach-row">
              <span>{item.t}</span>
              <button className="text-link" aria-label={`Gắn bài học: ${item.t}`} onClick={() => insertAtCursor(lessonBlock(item.t, `/lesson/${item.id}`))}>Gắn</button>
            </div>)}
          </div>}

          {preview ? (
            <div className="notebook-preview" aria-label="Xem trước ghi chú"><ChatText text={active.text || '*Chưa có nội dung.*'} /></div>
          ) : (
            <textarea ref={editorRef} aria-label="Nội dung sổ tay" value={active.text} onChange={e => updateText(e.target.value)} rows={14} placeholder="Định lý, lỗi thường gặp, ý tưởng — một ý mỗi dòng." className="notebook-editor" />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted mt-4">
            <span className="flex items-center gap-2" role="status"><Save size={14} /> {saved ? 'Đã lưu trên trình duyệt' : 'Chưa lưu được. Hãy tải ghi chú xuống.'} · {active.text.split('\n').filter(l => l.trim()).length} dòng</span>
            <span className="flex flex-wrap gap-2">
              <button className="button button-light" disabled={!active.text.trim()} onClick={() => downloadFile(active.text, 'mathnexus-so-tay.md', 'text/markdown;charset=utf-8')}><Download size={16} />Tải Markdown</button>
              <button className={'button ' + (confirmDelete ? 'button-dark' : 'button-light')} onClick={deleteActive}><Trash2 size={16} />{confirmDelete ? 'Bấm nữa để xóa' : 'Xóa ghi chú'}</button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Notebook;
