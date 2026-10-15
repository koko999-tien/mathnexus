import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Brain, Check, CircleAlert, Flag, Gauge, RotateCcw, Target, Trophy, X } from 'lucide-react';
import { QUIZ, type Quiz, type QuizDifficulty } from '../data/quiz';
import { GENERATED_BANK, GENERATED_CATS, GENERATED_DIFFICULTIES, countGenerated, generateSession, templateById } from '../utils/generatedQuiz';
import { MATH_CONCEPTS } from '../data/mathKnowledge';
import { QUIZ_CONCEPT_MAP } from '../data/mathOntology';
import { useProgress } from '../hooks/useProgress';
import { useLearningGoal } from '../hooks/useLearningGoal';
import { buildGoalDiagnosticPlan } from '../learning/learningGoal';
import { buildGoalDiagnosticDebrief, type GoalDiagnosticDebrief } from '../learning/diagnosticDebrief';
import { recordQuestionAttempt } from '../utils/storage';
import { practiceCategoryInsights, practiceOverview, questionAccuracy, questionsNeedingReview } from '../utils/practiceInsights';

const CATS = ['Tất cả', ...new Set(QUIZ.map(q => q.cat))];
const DIFFICULTIES: Array<'Tất cả' | QuizDifficulty> = ['Tất cả', 'Cơ bản', 'Vừa', 'Khó'];
const GEN_DIFFICULTIES: Array<'Tất cả' | QuizDifficulty> = ['Tất cả', ...GENERATED_DIFFICULTIES];
const SESSION_SIZES = ['5', '10', 'all'] as const;
type PracticeMode = 'normal' | 'review' | 'goal' | 'placement';
const PLACEMENT_SIZE = 8;

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const progress = useProgress();
  const learningGoal = useLearningGoal();
  const modeParam = params.get('mode');
  const mode: PracticeMode = modeParam === 'review' ? 'review' : modeParam === 'goal' ? 'goal' : modeParam === 'placement' ? 'placement' : 'normal';
  const requestedConcept = params.get('concept') || '';
  const concept = MATH_CONCEPTS.find(item => item.id === requestedConcept);
  const requestedSrc = params.get('src') === 'gen' ? 'gen' : 'bank';
  // Sinh đề chỉ có ý nghĩa ở lane thường và ôn yếu (không gắn khái niệm/mục tiêu cụ thể).
  // Placement luôn dùng đề sinh để bao quát nhiều kỹ năng.
  const src = mode === 'placement' ? 'gen' : (concept || mode === 'goal') ? 'bank' : requestedSrc;
  const onlyTemplates = params.get('tpl')?.split(',').map(id => id.trim()).filter(id => templateById(id)) || [];
  const seedParam = Number(params.get('seed') || '0');
  const [autoSeed] = useState(() => Date.now());
  const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : autoSeed;
  const cats = src === 'gen' ? ['Tất cả', ...GENERATED_CATS] : CATS;
  const difficulties = src === 'gen' ? GEN_DIFFICULTIES : DIFFICULTIES;
  const requested = params.get('cat') || 'Tất cả';
  const cat = cats.includes(requested) ? requested : 'Tất cả';
  const requestedDifficulty = params.get('difficulty') || 'Tất cả';
  const difficulty = difficulties.includes(requestedDifficulty as 'Tất cả' | QuizDifficulty) ? requestedDifficulty as 'Tất cả' | QuizDifficulty : 'Tất cả';
  const requestedSize = params.get('size') || '5';
  const size = SESSION_SIZES.includes(requestedSize as typeof SESSION_SIZES[number]) ? requestedSize as typeof SESSION_SIZES[number] : '5';
  const bank = src === 'gen' ? GENERATED_BANK : QUIZ;
  const conceptQuestionIds = concept
    ? new Set(Object.entries(QUIZ_CONCEPT_MAP).filter(([, conceptId]) => conceptId === concept.id).map(([questionId]) => questionId))
    : null;
  const goalDiagnostic = buildGoalDiagnosticPlan(progress, learningGoal.goal);
  const goalQuestionIds = mode === 'goal' ? new Set(goalDiagnostic?.questionIds || []) : null;

  const overview = practiceOverview(bank, progress);
  const insights = practiceCategoryInsights(bank, progress).filter(item => item.attempts > 0).slice(0, 5);
  const filtered = bank.filter(question =>
    (goalQuestionIds === null || goalQuestionIds.has(question.id)) &&
    (conceptQuestionIds === null || conceptQuestionIds.has(question.id)) &&
    (cat === 'Tất cả' || question.cat === cat) &&
    (difficulty === 'Tất cả' || question.difficulty === difficulty)
  );

  const genPoolSize = src === 'gen' ? countGenerated(cat, difficulty, onlyTemplates) : 0;
  const genLimit = size === 'all' ? Math.max(genPoolSize, 1) : Number(size);
  const generated = src === 'gen' && mode !== 'placement' ? generateSession(seed, genLimit, cat, difficulty, onlyTemplates) : [];
  const placementQuestions = mode === 'placement' ? generateSession(seed, PLACEMENT_SIZE, 'Tất cả', 'Tất cả') : [];
  const weakTemplateIds = src === 'gen' && mode === 'review'
    ? new Set(questionsNeedingReview(GENERATED_BANK, progress).map(question => question.id))
    : null;
  const sessionQuestions = mode === 'placement'
    ? placementQuestions
    : src === 'gen'
      ? (weakTemplateIds ? generated.filter(question => weakTemplateIds.has(question.templateId)) : generated)
      : null;
  const totalAttempts = Object.values(progress.practice || {}).reduce((sum, stat) => sum + (stat?.attempts || 0), 0);

  const updateParam = (key: string, value: string, defaultValue?: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    if ((key === 'cat' || key === 'difficulty') && mode !== 'goal') next.delete('mode');
    setParams(next, { replace: true });
  };

  const setMode = (nextMode: 'normal' | 'review' | 'goal') => {
    const next = new URLSearchParams(params);
    if (nextMode === 'review' || nextMode === 'goal') next.set('mode', nextMode);
    else next.delete('mode');
    if (nextMode === 'goal') next.delete('concept');
    setParams(next, { replace: true });
  };

  const setSrc = (nextSrc: 'bank' | 'gen') => {
    const next = new URLSearchParams(params);
    if (nextSrc === 'gen') {
      next.set('src', 'gen');
      next.set('seed', String(Date.now()));
    } else {
      next.delete('src');
      next.delete('seed');
    }
    next.delete('mode');
    next.delete('concept');
    next.delete('cat');
    next.delete('difficulty');
    setParams(next, { replace: true });
  };

  const newSeed = () => {
    const next = new URLSearchParams(params);
    next.set('seed', String(Date.now()));
    setParams(next, { replace: true });
  };

  const sessionKey = [src, seed, onlyTemplates.join(','), goalDiagnostic?.targetConceptId || '', concept?.id || '', cat, difficulty, size, mode].join('|');

  return <section className="page-enter">
    <div className="page-header"><p className="eyebrow">LUYỆN TẬP</p><h1>{mode === 'placement' ? 'Kiểm tra trình độ đầu vào' : 'Luyện tập theo kết quả trước'}</h1><p>{mode === 'placement' ? `8 câu bao quát 8 chuyên đề, không tính giờ. Làm xong MathNexus biết bạn đang đứng ở đâu để gợi ý lộ trình.` : mode === 'goal' ? goalDiagnostic ? 'Đang kiểm tra lộ trình tới “' + goalDiagnostic.targetTitle + '”. MathNexus chỉ lấy các câu hỏi thuộc những khái niệm trên đường tới mục tiêu mà bạn chưa có đủ dữ liệu.' : 'Chưa có mục tiêu học tập hợp lệ để tạo phiên kiểm tra.' : concept ? 'Phiên này chỉ tập trung vào khái niệm “' + concept.title + '”. MathNexus chỉ lấy các câu hỏi đã được gắn trực tiếp với khái niệm này.' : 'Các câu bạn thường làm sai sẽ được ưu tiên trong những lần ôn tiếp theo.'}</p></div>

    {totalAttempts === 0 && mode === 'normal' && <div className="panel placement-banner"><div><p className="eyebrow">BẮT ĐẦU TỪ ĐÂU?</p><h2 className="panel-title">Kiểm tra trình độ đầu vào · 8 câu</h2><p className="helper-text">Làm một lượt, MathNexus sẽ biết kỹ năng nào của bạn cần củng cố và gợi ý đúng chỗ học tiếp.</p></div><Link to={'/practice?mode=placement&seed=' + Date.now()} className="button button-dark">Bắt đầu kiểm tra<ArrowRight size={16} /></Link></div>}

    <div className="practice-overview">
      <div className="practice-overview-card"><span className="small-icon green"><Target size={20} /></span><div><strong>{overview.attemptedQuestions}/{src === 'gen' ? GENERATED_BANK.length : QUIZ.length}</strong><small>{src === 'gen' ? 'Kỹ năng đã luyện' : 'Câu đã từng làm'}</small></div></div>
      <div className="practice-overview-card"><span className="small-icon blue"><Gauge size={20} /></span><div><strong>{overview.accuracy === null ? '—' : overview.accuracy + '%'}</strong><small>Độ chính xác</small></div></div>
      <button className={'practice-overview-card review-card' + (mode === 'review' ? ' is-active' : '')} onClick={() => setMode(mode === 'review' ? 'normal' : 'review')} aria-pressed={mode === 'review'}>
        <span className="small-icon peach"><CircleAlert size={20} /></span><div><strong>{overview.reviewQuestions}</strong><small>{mode === 'review' ? 'Đang ôn câu yếu' : 'Câu cần ôn lại'}</small></div><ArrowRight size={17} />
      </button>
    </div>

    <div className="practice-controls panel">
      {mode !== 'placement' && <div className="practice-control-block"><span className="control-label">Nguồn đề</span><div className="filter-row" aria-label="Nguồn đề luyện tập">
        <button className="filter-chip" aria-pressed={src === 'bank'} onClick={() => setSrc('bank')}>Bộ có sẵn ({QUIZ.length} câu)</button>
        <button className="filter-chip" aria-pressed={src === 'gen'} onClick={() => setSrc('gen')}>Sinh đề mới (vô hạn)</button>
      </div></div>}
      {mode !== 'placement' && <div className="practice-control-block"><span className="control-label">Chuyên đề</span><div className="filter-row" aria-label="Chuyên đề luyện tập">{cats.map(c => <button key={c} className="filter-chip" aria-pressed={cat === c} onClick={() => updateParam('cat', c, 'Tất cả')}>{c}</button>)}</div></div>}
      {mode !== 'placement' && <div className="practice-control-grid">
        <label className="field">Độ khó<select aria-label="Độ khó luyện tập" value={difficulty} onChange={event => updateParam('difficulty', event.target.value, 'Tất cả')}>{difficulties.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="field">Độ dài phiên<select aria-label="Độ dài phiên luyện tập" value={size} onChange={event => updateParam('size', event.target.value, '5')}><option value="5">5 câu</option><option value="10">10 câu</option><option value="all">Toàn bộ câu phù hợp</option></select></label>
        {src === 'gen' && <button type="button" className="button button-light" onClick={newSeed}><RotateCcw size={16} />Đổi đề mới</button>}
        <button type="button" className={'button ' + (mode === 'review' ? 'button-dark' : 'button-light')} onClick={() => setMode(mode === 'review' ? 'normal' : 'review')}><Brain size={16} />{mode === 'review' ? 'Thoát ôn câu yếu' : 'Ôn câu cần nhớ'}{overview.reviewQuestions > 0 && <span className="practice-count-badge">{overview.reviewQuestions}</span>}</button>
        {learningGoal.goal && <button type="button" className={'button ' + (mode === 'goal' ? 'button-dark' : 'button-light')} onClick={() => setMode(mode === 'goal' ? 'normal' : 'goal')}><Flag size={16} />{mode === 'goal' ? 'Thoát kiểm tra mục tiêu' : 'Kiểm tra mục tiêu'}</button>}
      </div>}
      <p className="helper-text">{src === 'gen' ? `Đề sinh tự động theo seed ${seed}${onlyTemplates.length ? ' · đúng kỹ năng vừa hỏi AI' : ''} — mỗi lần Đổi đề là một bộ số mới, đáp án tính chính xác ngay trên máy. ` : ''}{mode === 'goal' && goalDiagnostic ? 'Mục tiêu: “' + goalDiagnostic.targetTitle + '” · ' + goalDiagnostic.conceptIds.length + ' khái niệm chưa đủ dữ liệu · ' : concept ? 'Khái niệm đang chọn: “' + concept.title + '”. ' : ''}{mode === 'review' ? src === 'gen' ? 'Chế độ ôn tập sinh đề mới cho đúng những kỹ năng bạn từng sai.' : 'Chế độ ôn tập chỉ lấy những câu bạn từng làm sai và chưa trả lời đúng liên tiếp 2 lần.' : (src === 'gen' ? (sessionQuestions?.length || 0) : filtered.length) + ' câu phù hợp với bộ lọc hiện tại.'}</p>
    </div>

    {insights.length > 0 && <div className="practice-insights panel"><div className="panel-heading-row"><div><p className="eyebrow">DỮ LIỆU TỪ CHÍNH CÁC LẦN BẠN LÀM</p><h2 className="panel-title">Điểm cần chú ý theo chuyên đề</h2></div><Link to="/progress" className="text-link">Mở trang tiến độ<ArrowRight size={15} /></Link></div>
      <div className="practice-insight-grid">{insights.map(item => <div className="practice-insight" key={item.name}><div><strong>{item.name}</strong><span>{item.attempted}/{item.total} câu đã gặp</span></div><div className="practice-insight-score"><strong>{item.accuracy === null ? '—' : item.accuracy + '%'}</strong><small>{item.needsReview ? item.needsReview + ' cần ôn' : 'Đang ổn'}</small></div></div>)}</div>
    </div>}

    <PracticeSession key={sessionKey} candidates={filtered} mode={mode} size={size} cat={cat} difficulty={difficulty} conceptId={concept?.id || ''} goalTargetId={goalDiagnostic?.targetConceptId || ''} preset={sessionQuestions} src={src} />
  </section>;
}

function PracticeSession({ candidates, mode, size, cat, difficulty, conceptId, goalTargetId, preset, src }: { candidates: Quiz[]; mode: PracticeMode; size: typeof SESSION_SIZES[number]; cat: string; difficulty: 'Tất cả' | QuizDifficulty; conceptId: string; goalTargetId: string; preset?: Quiz[] | null; src: 'bank' | 'gen' }) {
  const progress = useProgress();
  const learningGoal = useLearningGoal();
  const [sessionBaseline, setSessionBaseline] = useState(() => progress);
  const [questions] = useState(() => {
    if (preset) return preset;
    const pool = mode === 'review' ? questionsNeedingReview(candidates, progress) : candidates;
    const limit = size === 'all' ? pool.length : Number(size);
    return pool.slice(0, limit);
  });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  if (!questions.length) {
    return <div className="panel practice-empty"><span className="small-icon green"><Check size={20} /></span><h2>{mode === 'review' ? 'Không còn câu nào cần ôn trong bộ lọc này' : mode === 'goal' ? 'Chưa có câu kiểm tra cho phần còn thiếu' : 'Chưa có câu hỏi phù hợp'}</h2><p>{mode === 'review' ? 'Các câu bạn từng sai đã được làm đúng liên tiếp đủ để tạm rời danh sách ôn.' : mode === 'goal' ? 'Một số phần trên lộ trình chưa có câu hỏi trực tiếp. Hãy mở bản đồ kiến thức để xem phần còn thiếu.' : 'Hãy đổi chuyên đề hoặc độ khó để bắt đầu một phiên khác.'}</p>{mode === 'review' && <Link to={buildPracticeHref(cat, difficulty, size, conceptId, src)} className="button button-light">Luyện bình thường</Link>}{mode === 'goal' && goalTargetId && <Link to={'/map?concept=' + encodeURIComponent(goalTargetId)} className="button button-light">Mở lộ trình mục tiêu</Link>}</div>;
  }

  const q = questions[index];
  const answered = answers[index];
  const score = answers.filter((answer, i) => answer === questions[i].i).length;
  const currentStat = progress.practice[q.id];
  const previousAccuracy = questionAccuracy(currentStat);
  const wrongQuestions = questions.filter((question, i) => answers[i] !== question.i);
  const debrief = mode === 'goal' && finished
    ? buildGoalDiagnosticDebrief(questions, answers, sessionBaseline, progress, learningGoal.goal)
    : null;

  const restart = () => { setSessionBaseline(progress); setIndex(0); setAnswers([]); setFinished(false); };
  const answer = (choice: number) => {
    if (answered !== undefined) return;
    setAnswers(current => [...current, choice]);
    recordQuestionAttempt(q.id, choice === q.i);
  };
  const next = () => { if (index + 1 === questions.length) setFinished(true); else setIndex(i => i + 1); };

  if (finished) return <div className="panel practice-result" aria-live="polite">
    <span className="result-trophy"><Trophy size={36} /></span>
    <p className="eyebrow">{mode === 'goal' ? 'ĐÃ HOÀN THÀNH PHIÊN KIỂM TRA MỤC TIÊU' : mode === 'placement' ? 'KẾT QUẢ KIỂM TRA ĐẦU VÀO' : 'HOÀN THÀNH PHIÊN LUYỆN TẬP'}</p>
    <h2>Bạn đã làm đúng {score}/{questions.length} câu!</h2>
    <p>{mode === 'placement' ? 'Kết quả này đã kích hoạt gợi ý cá nhân trên toàn web: câu yếu được ưu tiên ôn, bản đồ kiến thức biết chỗ bạn đang đứng.' : mode === 'goal' ? 'Kết quả đã được lưu theo từng khái niệm trên lộ trình, không chỉ dưới dạng một điểm tổng.' : score === questions.length ? 'Bạn đã trả lời đúng toàn bộ câu hỏi. Nếu có câu từng sai, thêm một lần đúng nữa có thể đưa câu đó khỏi danh sách cần ôn.' : 'Có ' + wrongQuestions.length + ' câu nên ôn lại sớm. Các câu này đã được đưa vào danh sách ôn tập.'}</p>
    {debrief && <DiagnosticDebriefPanel debrief={debrief} />}
    {mode === 'placement' && <PlacementSummary questions={questions} answers={answers} />}
    <div className="flex flex-wrap justify-center gap-3 my-6">
      <button className="button button-dark" onClick={restart}><RotateCcw size={16} />Luyện lại phiên này</button>
      {mode === 'placement' && <Link to="/map" className="button button-light">Mở bản đồ kiến thức<ArrowRight size={16} /></Link>}
      {mode !== 'goal' && mode !== 'placement' && wrongQuestions.length > 0 && <Link to={src === 'gen' ? buildGenReviewHref(cat, difficulty, size) : buildReviewHref(cat, difficulty, size, conceptId)} className="button button-light"><Brain size={16} />Ôn câu yếu</Link>}
      {mode === 'placement' && wrongQuestions.length > 0 && <Link to={buildGenReviewHref(cat, difficulty, size)} className="button button-light"><Brain size={16} />Ôn câu yếu</Link>}
      <Link to="/progress" className="button button-light">Xem tiến độ</Link>
    </div>
    {wrongQuestions.map(question => <div key={question.id} className="review-question"><div className="review-question-head"><strong>{question.q}</strong><span className={'difficulty-tag ' + difficultyClass(question.difficulty)}>{question.difficulty}</span></div><p>Đáp án đúng: {question.a[question.i]}</p><small>{question.ex}</small></div>)}
  </div>;

  return <div className="panel practice-panel">
    <div className="practice-meta"><span>Câu {index + 1} / {questions.length}</span><span><Check size={15} />{score} câu đúng</span></div>
    <div className="progress-track" role="progressbar" aria-label="Tiến độ phiên luyện tập" aria-valuenow={answers.length} aria-valuemin={0} aria-valuemax={questions.length}><span style={{ width: (answers.length / questions.length * 100) + '%' }} /></div>
    <div className="question-tags"><span className="eyebrow">{q.cat}</span><span className={'difficulty-tag ' + difficultyClass(q.difficulty)}>{q.difficulty}</span>{currentStat?.attempts ? <span className="history-tag">Đã làm {currentStat.attempts} lần · đúng {previousAccuracy}%</span> : <span className="history-tag">Câu mới</span>}</div>
    <h2 className="practice-question">{q.q}</h2>
    <div className="answer-grid">{q.a.map((option, i) => <button key={index + '-' + i} disabled={answered !== undefined} onClick={() => answer(i)} className={'answer-option ' + (answered === undefined ? '' : i === q.i ? 'correct' : i === answered ? 'incorrect' : 'muted')}><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{answered !== undefined && i === q.i && <Check size={18} />}{answered === i && i !== q.i && <X size={18} />}</button>)}</div>
    {answered !== undefined && <div className={'answer-explanation ' + (answered === q.i ? 'correct' : 'incorrect')} role="status"><strong>{answered === q.i ? 'Chính xác, làm tốt lắm!' : 'Chưa đúng — câu này đã được thêm vào vùng cần ôn.'}</strong><p>{q.ex}</p>{answered !== q.i && <small>Muốn đưa câu này ra khỏi vùng ôn, hãy trả lời đúng nó ở các lần luyện sau.</small>}</div>}
    <div className="practice-actions"><span className="helper-text">{answered === undefined ? mode === 'review' ? 'Đây là một câu MathNexus chọn lại vì bạn từng vấp ở đây.' : mode === 'goal' ? 'Câu này thuộc một khái niệm trên lộ trình mục tiêu mà bạn chưa có đủ dữ liệu.' : 'Chọn một đáp án để xem lời giải.' : mode === 'goal' ? 'Kết quả đã được cập nhật vào lộ trình mục tiêu.' : 'Kết quả đã được lưu vào lịch sử luyện tập.'}</span><button disabled={answered === undefined} onClick={next} className="button button-dark">{index + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}<ArrowRight size={16} /></button></div>
  </div>;
}

function PlacementSummary({ questions, answers }: { questions: Quiz[]; answers: number[] }) {
  const byCat = new Map<string, { correct: number; total: number }>();
  questions.forEach((question, index) => {
    const entry = byCat.get(question.cat) || { correct: 0, total: 0 };
    entry.total += 1;
    if (answers[index] === question.i) entry.correct += 1;
    byCat.set(question.cat, entry);
  });
  return <div className="practice-insight-grid" aria-label="Kết quả theo chuyên đề">
    {[...byCat.entries()].map(([name, stat]) => <div className="practice-insight" key={name}>
      <div><strong>{name}</strong><span>{stat.correct}/{stat.total} câu đúng</span></div>
      <div className="practice-insight-score"><strong>{Math.round(stat.correct / stat.total * 100)}%</strong><small>{stat.correct === stat.total ? 'Vững' : 'Cần củng cố'}</small></div>
    </div>)}
  </div>;
}

function DiagnosticDebriefPanel({ debrief }: { debrief: GoalDiagnosticDebrief }) {
  const weak = debrief.weakestConcept;
  const weakNeedsRepair = Boolean(weak && weak.correct < weak.attempted);
  return <section className="diagnostic-debrief" aria-label="Kết quả theo khái niệm">
    <div className="diagnostic-debrief-head">
      <div><p className="eyebrow">KẾT QUẢ THEO KHÁI NIỆM</p><h3>Kết quả sau phiên</h3><p>Mục tiêu: <strong>{debrief.targetTitle}</strong></p></div>
      <div className="diagnostic-debrief-score"><strong>{debrief.accuracy}%</strong><span>{debrief.correct}/{debrief.attempted} câu đúng</span></div>
    </div>
    <div className="diagnostic-debrief-metrics">
      <div><span>Tiến độ mục tiêu</span><strong>{debrief.goalProgressBefore}% → {debrief.goalProgressAfter}%</strong><small>{debrief.goalProgressDelta > 0 ? '+' + debrief.goalProgressDelta + '% trong phiên này' : 'Chưa tăng mức độ nắm vững'}</small></div>
      <div><span>Khái niệm đã kiểm tra</span><strong>{debrief.concepts.length}</strong><small>Kết quả được lưu theo từng khái niệm</small></div>
    </div>
    <div className="diagnostic-concept-grid">
      {debrief.concepts.map(item => <Link key={item.conceptId} to={item.to} className="diagnostic-concept-row">
        <div><strong>{item.title}</strong><span>{item.correct}/{item.attempted} đúng · {item.stateLabel}</span></div>
        <div className="diagnostic-concept-evidence"><strong>{item.accuracy}%</strong><small>Độ tin cậy {item.confidenceBefore}% → {item.confidenceAfter}%{item.confidenceDelta > 0 ? ' (+' + item.confidenceDelta + ')' : ''}</small></div>
        <ArrowRight size={15} />
      </Link>)}
    </div>
    <div className="diagnostic-debrief-next">
      {weakNeedsRepair && weak ? <>
        <div><Brain size={17} /><span><strong>Ưu tiên củng cố: {weak.title}</strong><small>Đây là khái niệm có tỷ lệ đúng thấp nhất trong phiên vừa rồi.</small></span></div>
        <Link to={'/practice?concept=' + encodeURIComponent(weak.conceptId) + '&mode=review&size=5'} className="button button-light">Ôn đúng điểm yếu<ArrowRight size={14} /></Link>
      </> : debrief.nextAction ? <>
        <div><Flag size={17} /><span><strong>Bước tiếp theo: {debrief.nextAction.title}</strong><small>{debrief.nextAction.detail}</small></span></div>
        <Link to={debrief.nextAction.to} className="button button-light">Tiếp tục lộ trình<ArrowRight size={14} /></Link>
      </> : <div><Check size={17} /><span><strong>Mục tiêu đã có đủ dữ liệu đánh giá</strong><small>Không cần thêm bước học bắt buộc cho mục tiêu này.</small></span></div>}
    </div>
  </section>;
}

function difficultyClass(difficulty: QuizDifficulty) {
  return difficulty === 'Cơ bản' ? 'easy' : difficulty === 'Vừa' ? 'medium' : 'hard';
}

function buildPracticeHref(cat: string, difficulty: 'Tất cả' | QuizDifficulty, size: typeof SESSION_SIZES[number], conceptId = '', src: 'bank' | 'gen' = 'bank') {
  const params = new URLSearchParams();
  if (conceptId) params.set('concept', conceptId);
  if (src === 'gen' && !conceptId) {
    params.set('src', 'gen');
    params.set('seed', String(Date.now()));
  }
  if (cat !== 'Tất cả') params.set('cat', cat);
  if (difficulty !== 'Tất cả') params.set('difficulty', difficulty);
  if (size !== '5') params.set('size', size);
  const query = params.toString();
  return '/practice' + (query ? '?' + query : '');
}

function buildGenReviewHref(cat: string, difficulty: 'Tất cả' | QuizDifficulty, size: typeof SESSION_SIZES[number]) {
  const href = new URLSearchParams();
  href.set('src', 'gen');
  href.set('seed', String(Date.now()));
  if (cat !== 'Tất cả') href.set('cat', cat);
  if (difficulty !== 'Tất cả') href.set('difficulty', difficulty);
  if (size !== '5') href.set('size', size);
  href.set('mode', 'review');
  return '/practice?' + href.toString();
}

function buildReviewHref(cat: string, difficulty: 'Tất cả' | QuizDifficulty, size: typeof SESSION_SIZES[number], conceptId = '') {
  const href = new URLSearchParams();
  if (conceptId) href.set('concept', conceptId);
  if (cat !== 'Tất cả') href.set('cat', cat);
  if (difficulty !== 'Tất cả') href.set('difficulty', difficulty);
  if (size !== '5') href.set('size', size);
  href.set('mode', 'review');
  return '/practice?' + href.toString();
}
