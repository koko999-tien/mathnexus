import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, RotateCcw, Check, BookOpen, Brain, Flame, PenTool, Target, ArrowUpRight, Network, Gauge } from 'lucide-react';
import { saveProgress, DEFAULT_PROGRESS, localDate } from '../utils/storage';
import { createBackupSnapshot, parseBackupSnapshot, restoreBackupSnapshot } from '../utils/backup';
import { useProgress } from '../hooks/useProgress';
import { LESSONS } from '../data/lessons';
import { QUIZ } from '../data/quiz';
import { levelProgress, recentActivity, topicProgress } from '../utils/learningInsights';
import { downloadFile } from '../utils/download';
import { practiceCategoryInsights, practiceOverview } from '../utils/practiceInsights';
import { allConceptMastery, masteryLabel } from '../utils/conceptMastery';
import { MATH_CONCEPTS, MATH_DOMAINS } from '../data/mathKnowledge';
import { ontologyDepthScore } from '../utils/mathOntology';
import { explorationMetrics } from '../exploration/explorationState';
import { useExplorationSummary } from '../hooks/useExplorationSummary';

export default function Progress() {
  const p = useProgress();
  const [name, setName] = useState(p.displayName);
  const [goal, setGoal] = useState(String(p.dailyGoal));
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = recentActivity(p, 14);
  const maxRecent = Math.max(1, ...recent.map(day => day.count));
  const topics = topicProgress(p).slice(0, 6);
  const levels = levelProgress(p);
  const completed = LESSONS.filter(lesson => p.lessonsRead.includes(lesson.id));
  const practice = practiceOverview(QUIZ, p);
  const practiceTopics = practiceCategoryInsights(QUIZ, p).filter(item => item.attempts > 0).slice(0, 8);
  const conceptMasteries = allConceptMastery(p);
  const measuredConcepts = conceptMasteries.filter(item => item.score !== null).sort((a, b) => (a.score || 0) - (b.score || 0) || b.confidence - a.confidence);
  const evidenceCoverage = Math.round(conceptMasteries.filter(item => item.score !== null).length / Math.max(1, MATH_CONCEPTS.length) * 100);
  const conceptSpotlight = [...measuredConcepts.slice(0, 4), ...conceptMasteries.filter(item => item.score === null && ontologyDepthScore(item.conceptId) > 0).slice(0, Math.max(0, 6 - measuredConcepts.slice(0, 4).length))];
  const exploration = useExplorationSummary();
  const explorationStats = explorationMetrics(exploration);

  const exportData = () => downloadFile(JSON.stringify(createBackupSnapshot(), null, 2), 'mathnexus-' + localDate() + '.json', 'application/json');

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('Tệp quá lớn. Vui lòng chọn bản sao lưu nhỏ hơn 8 MB.');
      const backup = parseBackupSnapshot(await file.text());
      const confirmText = backup.sourceVersion === 2
        ? 'Khôi phục sẽ thay thế tiến độ, sổ tay, mục tiêu học, dữ liệu khám phá và Math Canvas hiện tại. Tiếp tục?'
        : 'Đây là bản sao lưu MathNexus v1. Chỉ tiến độ và sổ tay sẽ được thay thế; mục tiêu học, dữ liệu khám phá và Math Canvas hiện tại sẽ được giữ nguyên. Tiếp tục?';
      if (!window.confirm(confirmText)) return;

      const restored = restoreBackupSnapshot(backup);
      if (!restored.ok) throw new Error(restored.error);

      setName(backup.progress.displayName);
      setGoal(String(backup.progress.dailyGoal));
      setMessage(backup.sourceVersion === 2
        ? 'Đã khôi phục đầy đủ dữ liệu học tập từ bản sao lưu v2.'
        : 'Đã khôi phục bản sao lưu v1. Dữ liệu học tập mới hơn vẫn được giữ nguyên.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không đọc được tệp sao lưu.');
    }
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    const dailyGoal = Number(goal);
    if (!name.trim() || !Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 50) {
      setMessage('Nhập tên và mục tiêu từ 1 đến 50 câu mỗi ngày.');
      return;
    }
    setMessage(saveProgress({ ...p, displayName: name, dailyGoal }) ? 'Đã lưu góc học tập của bạn.' : 'Chưa lưu được thay đổi.');
  };

  const reset = () => {
    if (window.confirm('Đặt lại toàn bộ tiến độ học tập? Sổ tay của bạn vẫn được giữ lại.')) {
      if (saveProgress({ ...DEFAULT_PROGRESS, displayName: p.displayName, dailyGoal: p.dailyGoal })) setMessage('Đã đặt lại tiến độ học tập.');
    }
  };

  return <section className="page-enter"><div className="page-header"><p className="eyebrow">HÀNH TRÌNH CỦA RIÊNG BẠN</p><h1>Tiến độ học tập</h1><p>Không chỉ đếm số bài đã xong — hãy nhìn xem kiến thức của bạn đang mở rộng theo hướng nào.</p></div>
    <div className="stats-grid">{[
      { Icon: BookOpen, value: completed.length + '/' + LESSONS.length, title: 'Bài học hoàn thành', tone: 'green' },
      { Icon: PenTool, value: p.questionsDone, title: 'Câu hỏi đã luyện', tone: 'blue' },
      { Icon: Target, value: p.questionsDone ? Math.round(p.questionsCorrect / p.questionsDone * 100) + '%' : '—', title: 'Tỷ lệ trả lời đúng', tone: 'lilac' },
      { Icon: Flame, value: p.streak, title: 'Ngày học liên tiếp', tone: 'peach' },
    ].map(({ Icon, value, title, tone }) => <div className="stat-card" key={title}><div className="stat-top"><span className={'small-icon ' + tone}><Icon size={20} /></span><strong>{value}</strong></div><h3>{title}</h3></div>)}</div>

    <div className="panel mastery-panel">
      <div className="panel-heading-row"><div><p className="eyebrow">KHÔNG CHỈ HỌC XONG — CẦN BIẾT MÌNH ĐANG VƯỚNG Ở ĐÂU</p><h2 className="panel-title">Độ vững qua luyện tập</h2><p className="helper-text">Được tính từ chính các câu bạn đã làm, không phải từ số bài đã mở.</p></div><Link to={practice.reviewQuestions > 0 ? "/practice?mode=review" : "/practice"} className="button button-light"><Brain size={16} />{practice.reviewQuestions > 0 ? 'Ôn ' + practice.reviewQuestions + ' câu yếu' : 'Bắt đầu luyện'}</Link></div>
      {practiceTopics.length ? <div className="mastery-grid">{practiceTopics.map(item => <Link key={item.name} to={item.needsReview > 0 ? '/practice?cat=' + encodeURIComponent(item.name) + '&mode=review' : '/practice?cat=' + encodeURIComponent(item.name)} className="mastery-row">
        <div className="mastery-copy"><strong>{item.name}</strong><span>{item.attempted}/{item.total} câu đã gặp · {item.attempts} lượt làm</span></div>
        <div className="mastery-score"><strong>{item.accuracy === null ? '—' : item.accuracy + '%'}</strong><small>{item.needsReview > 0 ? item.needsReview + ' câu cần ôn' : 'Không có câu yếu'}</small></div>
        <ArrowUpRight size={16} />
      </Link>)}</div> : <div className="mastery-empty"><Brain size={28} /><div><strong>Chưa có đủ dữ liệu luyện tập</strong><p>Hãy làm vài câu. MathNexus sẽ bắt đầu chỉ ra chuyên đề nào cần quay lại.</p></div><Link to="/practice" className="text-link">Làm phiên đầu tiên<ArrowUpRight size={15} /></Link></div>}
    </div>

    <div className="panel concept-evidence-panel">
      <div className="panel-heading-row"><div><p className="eyebrow">NĂNG LỰC THEO KHÁI NIỆM, KHÔNG CHỈ THEO CHUYÊN ĐỀ</p><h2 className="panel-title">Bản đồ bằng chứng học tập</h2><p className="helper-text">Điểm chỉ xuất hiện khi có bằng chứng trực tiếp từ bài học hoặc luyện tập. “Chưa đánh giá” không đồng nghĩa với yếu.</p></div><Link to="/map" className="button button-light"><Network size={16} />Mở bản đồ toán học</Link></div>
      <div className="concept-evidence-summary">
        <div><Gauge size={17} /><span><strong>{evidenceCoverage}%</strong><small>khái niệm đã có bằng chứng</small></span></div>
        <div><Brain size={17} /><span><strong>{measuredConcepts.length}</strong><small>khái niệm đã đo được</small></span></div>
        <div><Target size={17} /><span><strong>{measuredConcepts.filter(item => item.state === 'strong' || item.state === 'solid').length}</strong><small>khái niệm khá vững trở lên</small></span></div>
      </div>
      <div className="concept-evidence-grid">{conceptSpotlight.map(item => {
        const concept = MATH_CONCEPTS.find(candidate => candidate.id === item.conceptId)!;
        const domain = MATH_DOMAINS.find(candidate => candidate.id === concept.domain);
        const depth = ontologyDepthScore(concept.id);
        return <Link key={concept.id} to={'/map?concept=' + encodeURIComponent(concept.id)} className="concept-evidence-row">
          <div className="concept-evidence-copy"><strong>{concept.title}</strong><span>{domain?.short} · {concept.level} · nội dung sâu {depth}%</span></div>
          <div className="concept-evidence-score"><strong>{item.score === null ? '—' : item.score + '%'}</strong><small>{masteryLabel(item.state)} · tin cậy {item.confidence}%</small></div>
          <ArrowUpRight size={15} />
        </Link>;
      })}</div>
      {!conceptSpotlight.length && <div className="mastery-empty"><Brain size={28} /><div><strong>Chưa có dữ liệu khái niệm</strong><p>Hoàn thành một bài hoặc làm vài câu luyện tập để MathNexus bắt đầu dựng hồ sơ năng lực.</p></div><Link to="/practice" className="text-link">Bắt đầu tạo bằng chứng<ArrowUpRight size={15} /></Link></div>}
    </div>

    <div className="panel exploration-state-panel">
      <div className="panel-heading-row">
        <div>
          <p className="eyebrow">CURIOSITY ≠ MASTERY</p>
          <h2 className="panel-title">Khám phá tự chủ</h2>
          <p className="helper-text">Chỉ số này mô tả mức độ bạn tự mở rộng không gian tri thức. Nó không phải điểm số, không đánh giá trí thông minh và không suy đoán cảm xúc.</p>
        </div>
        <Link to="/cosmos" className="button button-light"><Network size={16} />Tiếp tục khám phá</Link>
      </div>

      <div className="exploration-summary-grid">
        <div data-testid="exploration-index"><span>Chỉ số khám phá</span><strong>{explorationStats.explorationIndex}</strong><small>/100 · mô tả hành vi khám phá</small></div>
        <div data-testid="exploration-concepts"><span>Khái niệm đã tự mở</span><strong>{explorationStats.discoveredConcepts}</strong><small>{explorationStats.exploredDomains} lĩnh vực</small></div>
        <div data-testid="exploration-atoms"><span>Mảnh ontology đã mở</span><strong>{explorationStats.deepAtoms}</strong><small>độ sâu, không phải mastery</small></div>
        <div data-testid="exploration-simulations"><span>Phiên mô phỏng</span><strong>{explorationStats.simulationSessions}</strong><small>{explorationStats.simulationAdjustments} lần chỉnh tham số</small></div>
      </div>

      <div className="exploration-dimensions">
        {[
          ['Độ rộng tri thức', explorationStats.breadthScore],
          ['Độ sâu khám phá', explorationStats.depthScore],
          ['Quay lại khái niệm', explorationStats.revisitScore],
          ['Thực nghiệm mô phỏng', explorationStats.simulationScore],
        ].map(([label, value]) => <div className="exploration-dimension" key={String(label)}>
          <div><strong>{label}</strong><span>{value}%</span></div>
          <div className="progress-track" role="progressbar" aria-label={String(label)} aria-valuenow={Number(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: value + '%' }} /></div>
        </div>)}
      </div>

      <p className="exploration-privacy-note">MathNexus chỉ lưu tổng hợp cục bộ như concept đã mở, lần quay lại và phiên mô phỏng. Không lưu đường rê chuột, tốc độ camera hay dùng dữ liệu này để chẩn đoán trạng thái tâm lý.</p>
    </div>

    <div className="learning-breakdown">
      <div className="panel"><div className="panel-heading-row"><div><p className="eyebrow">BẢN ĐỒ KIẾN THỨC</p><h2 className="panel-title">Theo chuyên đề</h2></div><span className="helper-text">{completed.length} bài đã hoàn thành</span></div>
        <div className="breakdown-list">{topics.map(item => <div className="breakdown-row" key={item.name}><div className="breakdown-label"><strong>{item.name}</strong><span>{item.done}/{item.total} bài · {item.percent}%</span></div><div className="progress-track" role="progressbar" aria-label={'Tiến độ ' + item.name} aria-valuenow={item.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: item.percent + '%' }} /></div></div>)}</div>
      </div>
      <div className="panel"><p className="eyebrow">ĐI TỪ NỀN TẢNG ĐẾN SÂU HƠN</p><h2 className="panel-title">Theo cấp độ</h2>
        <div className="level-roadmap">{levels.map((item, index) => <div className={'level-step' + (item.percent === 100 ? ' is-complete' : '')} key={item.name}><span className="level-index">{item.percent === 100 ? <Check size={15} /> : index + 1}</span><div><strong>{item.name}</strong><small>{item.done}/{item.total} bài · {item.percent}%</small></div><div className="mini-track"><span style={{ width: item.percent + '%' }} /></div></div>)}</div>
      </div>
    </div>

    <div className="progress-layout"><div className="panel"><div className="panel-heading-row"><div><h2 className="panel-title">14 ngày gần đây</h2><p className="helper-text">Mỗi ô là tổng bài học, câu luyện và sách mở mới trong ngày.</p></div><strong className="activity-total">{recent.reduce((sum, day) => sum + day.count, 0)} hoạt động</strong></div>
      <div className="activity-heatmap" aria-label="Hoạt động 14 ngày gần đây">{recent.map(day => {
        const intensity = day.count === 0 ? 0 : Math.max(1, Math.ceil(day.count / maxRecent * 4));
        return <div key={day.date} className="heatmap-day" title={day.date + ': ' + day.count + ' hoạt động'}><span className={'heatmap-cell intensity-' + intensity} /><small>{day.label}</small><strong>{day.count}</strong></div>;
      })}</div>
      <p className="helper-text">{p.streak ? 'Chuỗi hiện tại: ' + p.streak + ' ngày. Giữ nhịp bằng một hoạt động nhỏ mỗi ngày.' : 'Chỉ cần một hoạt động học trong ngày để bắt đầu chuỗi của bạn.'}</p>
    </div>
      <form className="panel profile-form" onSubmit={saveProfile}><h2 className="panel-title">Góc học tập của bạn</h2><label className="field">Tên hiển thị<input value={name} onChange={event => setName(event.target.value)} maxLength={40} required autoComplete="nickname" /></label><label className="field">Mục tiêu câu hỏi mỗi ngày<input type="number" min="1" max="50" step="1" value={goal} onChange={event => setGoal(event.target.value)} required inputMode="numeric" /></label><button className="button button-dark" type="submit"><Check size={16} />Lưu thay đổi</button></form></div>

    <div className="panel mt-5"><h2 className="panel-title">Những điều bạn đã khám phá</h2>{completed.length ? <div className="completed-lessons">{completed.map(lesson => <Link key={lesson.id} to={'/lesson/' + lesson.id}><Check size={16} /><span>{lesson.t}<small>{lesson.cat} · {lesson.lv}</small></span><ArrowUpRight size={16} /></Link>)}</div> : <div className="empty-state"><BookOpen size={30} /><p>Hành trình đang chờ bài học đầu tiên của bạn.</p><Link to="/library" className="button button-light">Khám phá thư viện</Link></div>}</div>

    <div className="panel mt-5"><h2 className="panel-title">Dữ liệu luôn trong tay bạn</h2><p className="helper-text mb-4">Tiến độ, sổ tay, mục tiêu học, dữ liệu khám phá và Math Canvas đều được lưu cục bộ. Bản sao lưu v2 mang toàn bộ dữ liệu học tập bền vững sang thiết bị khác.</p><div className="flex flex-wrap gap-3"><button onClick={exportData} className="button button-light"><Download size={16} />Tải bản sao lưu</button><button onClick={() => inputRef.current?.click()} className="button button-light"><Upload size={16} />Khôi phục dữ liệu</button><input ref={inputRef} type="file" accept=".json,application/json" aria-label="Chọn bản sao lưu" className="hidden" onChange={event => void importData(event)} /><button onClick={reset} className="button button-light text-red-600"><RotateCcw size={16} />Đặt lại tiến độ</button></div></div>
    {message && <p role="status" className="form-message">{message}</p>}
  </section>;
}
