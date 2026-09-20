import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, RotateCcw, Check, BookOpen, Flame, PenTool, Target, ArrowUpRight } from 'lucide-react';
import { saveProgress, DEFAULT_PROGRESS, localDate, load, save, parseBackup } from '../utils/storage';
import { useProgress } from '../hooks/useProgress';
import { LESSONS } from '../data/lessons';
import { downloadFile } from '../utils/download';

export default function Progress() {
  const p = useProgress();
  const [name, setName] = useState(p.displayName);
  const [goal, setGoal] = useState(String(p.dailyGoal));
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - 6 + index);
    const activity = p.activity[localDate(date)];
    return { date: localDate(date), label: date.toLocaleDateString('vi-VI', { weekday: 'short' }), count: activity ? activity.lessons + activity.questions + activity.books : 0 };
  });
  const max = Math.max(5, ...week.map(day => day.count));
  const completed = LESSONS.filter(l => p.lessonsRead.includes(l.id));

  const exportData = () => downloadFile(JSON.stringify({ app: 'MathNexus', version: 1, exportedAt: new Date().toISOString(), progress: p, notes: load<string>('notes', '') }, null, 2), `mathnexus-${localDate()}.json`, 'application/json');
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Tệp quá lớn. Vui lòng chọn bản sao lưu nhỏ hơn 2 MB.');
      const backup = parseBackup(await file.text());
      if (!window.confirm('Khôi phục sẽ thay thế tiến độ và sổ tay hiện tại bằng bản sao lưu này. Tiếp tục?')) return;
      const previousNotes = load<string>('notes', '');
      if (!save('notes', backup.notes)) throw new Error('Trình duyệt chưa lưu được sổ tay.');
      if (!saveProgress(backup.progress)) {
        save('notes', previousNotes);
        throw new Error('Trình duyệt chưa lưu được tiến độ. Hãy kiểm tra dung lượng lưu trữ.');
      }
      setName(backup.progress.displayName); setGoal(String(backup.progress.dailyGoal));
      setMessage('Đã khôi phục tiến độ và sổ tay thành công.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không đọc được tệp sao lưu.'); }
  };
  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    const dailyGoal = Number(goal);
    if (!name.trim() || !Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 50) { setMessage('Nhập tên và mục tiêu từ 1 đến 50 câu mỗi ngày.'); return; }
    setMessage(saveProgress({ ...p, displayName: name, dailyGoal }) ? 'Đã lưu góc học tập của bạn.' : 'Chưa lưu được thay đổi.');
  };
  const reset = () => {
    if (window.confirm('Đặt lại toàn bộ tiến độ học tập? Sổ tay của bạn vẫn được giữ lại.')) {
      if (saveProgress({ ...DEFAULT_PROGRESS, displayName: p.displayName, dailyGoal: p.dailyGoal })) setMessage('Đã đặt lại tiến độ học tập.');
    }
  };

  return <section className="page-enter"><div className="page-header"><p className="eyebrow">HÀNH TRÌNH CỦA RIÊNG BẠN</p><h1>Tiến độ học tập</h1><p>Mỗi lần hiểu thêm một chút đều đáng ghi nhận. Đây là những bước tiến của bạn.</p></div>
    <div className="stats-grid">{[
      { Icon: BookOpen, value: `${completed.length}/${LESSONS.length}`, title: 'Bài học hoàn thành', tone: 'green' },
      { Icon: PenTool, value: p.questionsDone, title: 'Câu hỏi đã luyện', tone: 'blue' },
      { Icon: Target, value: p.questionsDone ? `${Math.round(p.questionsCorrect / p.questionsDone * 100)}%` : '—', title: 'Tỷ lệ trả lời đúng', tone: 'lilac' },
      { Icon: Flame, value: p.streak, title: 'Ngày học liên tiếp', tone: 'peach' },
    ].map(({ Icon, value, title, tone }) => <div className="stat-card" key={title}><div className="stat-top"><span className={`small-icon ${tone}`}><Icon size={20} /></span><strong>{value}</strong></div><h3>{title}</h3></div>)}</div>
    <div className="progress-layout"><div className="panel"><h2 className="panel-title">7 ngày gần đây</h2><p className="helper-text">Bài hoàn thành, câu đã luyện và sách mở lần đầu.</p><div className="activity-chart">{week.map(day => <div key={day.date} className="activity-day"><strong>{day.count}</strong><div className="activity-bar"><span style={{ height: `${Math.max(3, day.count / max * 100)}%` }} className={day.count ? 'has-activity' : ''} /></div><span>{day.label}</span></div>)}</div><p className="helper-text">{week.reduce((sum, day) => sum + day.count, 0)} hoạt động học tập trong 7 ngày.</p></div>
      <form className="panel profile-form" onSubmit={saveProfile}><h2 className="panel-title">Góc học tập của bạn</h2><label className="field">Tên hiển thị<input value={name} onChange={e => setName(e.target.value)} maxLength={40} required autoComplete="nickname" /></label><label className="field">Mục tiêu câu hỏi mỗi ngày<input type="number" min="1" max="50" step="1" value={goal} onChange={e => setGoal(e.target.value)} required inputMode="numeric" /></label><button className="button button-dark" type="submit"><Check size={16} />Lưu thay đổi</button></form></div>
    <div className="panel mt-5"><h2 className="panel-title">Những điều bạn đã khám phá</h2>{completed.length ? <div className="completed-lessons">{completed.map(l => <Link key={l.id} to={`/lesson/${l.id}`}><Check size={16} /><span>{l.t}<small>{l.cat} · {l.lv}</small></span><ArrowUpRight size={16} /></Link>)}</div> : <div className="empty-state"><BookOpen size={30} /><p>Hành trình đang chờ bài học đầu tiên của bạn.</p><Link to="/library" className="button button-light">Khám phá thư viện</Link></div>}</div>
    <div className="panel mt-5"><h2 className="panel-title">Dữ liệu luôn trong tay bạn</h2><p className="helper-text mb-4">Tiến độ và sổ tay được lưu trên trình duyệt này. Để chuyển sang điện thoại hoặc máy tính khác, tải bản sao lưu rồi khôi phục trên thiết bị đó.</p><div className="flex flex-wrap gap-3"><button onClick={exportData} className="button button-light"><Download size={16} />Tải bản sao lưu</button><button onClick={() => inputRef.current?.click()} className="button button-light"><Upload size={16} />Khôi phục dữ liệu</button><input ref={inputRef} type="file" accept=".json,application/json" aria-label="Chọn bản sao lưu" className="hidden" onChange={event => void importData(event)} /><button onClick={reset} className="button button-light text-red-600"><RotateCcw size={16} />Đặt lại tiến độ</button></div></div>
    {message && <p role="status" className="form-message">{message}</p>}
  </section>;
}
