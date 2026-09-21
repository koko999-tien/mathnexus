import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Brain, Check, CircleAlert, Flag, Gauge, RotateCcw, Target, Trophy, X } from 'lucide-react';
import { QUIZ, type Quiz, type QuizDifficulty } from '../data/quiz';
import { MATH_CONCEPTS } from '../data/mathKnowledge';
import { QUIZ_CONCEPT_MAP } from '../data/mathOntology';
import { useProgress } from '../hooks/useProgress';
import { useLearningGoal } from '../hooks/useLearningGoal';
import { buildGoalDiagnosticPlan } from '../learning/learningGoal';
import { recordQuestionAttempt } from '../utils/storage';
import { practiceCategoryInsights, practiceOverview, questionAccuracy, questionsNeedingReview } from '../utils/practiceInsights';

const CATS = ['Tất cả', ...new Set(QUIZ.map(q => q.cat))];
const DIFFICULTIES: Array<'Tất cả' | QuizDifficulty> = ['Tất cả', 'Cơ bản', 'Vừa', 'Khó'];
const SESSION_SIZES = ['5', '10', 'all'] as const;

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const progress = useProgress();
  const learningGoal = useLearningGoal();
  const requested = params.get('cat') || 'Tất cả';
  const cat = CATS.includes(requested) ? requested : 'Tất cả';
  const requestedDifficulty = params.get('difficulty') || 'Tất cả';
  const difficulty = DIFFICULTIES.includes(requestedDifficulty as 'Tất cả' | QuizDifficulty) ? requestedDifficulty as 'Tất cả' | QuizDifficulty : 'Tất cả';
  const requestedSize = params.get('size') || '5';
  const size = SESSION_SIZES.includes(requestedSize as typeof SESSION_SIZES[number]) ? requestedSize as typeof SESSION_SIZES[number] : '5';
  const mode = params.get('mode') === 'review' ? 'review' : params.get('mode') === 'goal' ? 'goal' : 'normal';
  const requestedConcept = params.get('concept') || '';
  const concept = MATH_CONCEPTS.find(item => item.id === requestedConcept);
  const conceptQuestionIds = concept
    ? new Set(Object.entries(QUIZ_CONCEPT_MAP).filter(([, conceptId]) => conceptId === concept.id).map(([questionId]) => questionId))
    : null;
  const goalDiagnostic = buildGoalDiagnosticPlan(progress, learningGoal.goal);
  const goalQuestionIds = mode === 'goal' ? new Set(goalDiagnostic?.questionIds || []) : null;

  const overview = practiceOverview(QUIZ, progress);
  const insights = practiceCategoryInsights(QUIZ, progress).filter(item => item.attempts > 0).slice(0, 5);
  const filtered = QUIZ.filter(question =>
    (goalQuestionIds === null || goalQuestionIds.has(question.id)) &&
    (conceptQuestionIds === null || conceptQuestionIds.has(question.id)) &&
    (cat === 'Tất cả' || question.cat === cat) &&
    (difficulty === 'Tất cả' || question.difficulty === difficulty)
  );

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

  const sessionKey = [goalDiagnostic?.targetConceptId || '', concept?.id || '', cat, difficulty, size, mode].join('|');

  return <section className="page-enter">
    <div className="page-header"><p className="eyebrow">LUYỆN ĐÚNG CHỖ MÌNH ĐANG YẾU</p><h1>Luyện tập thích ứng</h1><p>{mode === 'goal' ? goalDiagnostic ? 'Đang chẩn đoán lộ trình tới “' + goalDiagnostic.targetTitle + '”. MathNexus chỉ lấy câu hỏi gắn với những concept trên đường tới mục tiêu nhưng chưa có đủ bằng chứng.' : 'Chưa có mục tiêu học tập hợp lệ để tạo phiên chẩn đoán.' : concept ? 'Phiên này đang khóa vào khái niệm “' + concept.title + '” từ Learning Compass/Knowledge Graph. MathNexus chỉ lấy các câu đã được ontology gắn trực tiếp với nút này.' : 'MathNexus ghi nhớ câu bạn hay sai để lần sau ưu tiên ôn đúng điểm yếu, thay vì bắt bạn làm lại mọi thứ như nhau.'}</p></div>

    <div className="practice-overview">
      <div className="practice-overview-card"><span className="small-icon green"><Target size={20} /></span><div><strong>{overview.attemptedQuestions}/{QUIZ.length}</strong><small>Câu đã từng làm</small></div></div>
      <div className="practice-overview-card"><span className="small-icon blue"><Gauge size={20} /></span><div><strong>{overview.accuracy === null ? '—' : overview.accuracy + '%'}</strong><small>Độ chính xác</small></div></div>
      <button className={'practice-overview-card review-card' + (mode === 'review' ? ' is-active' : '')} onClick={() => setMode(mode === 'review' ? 'normal' : 'review')} aria-pressed={mode === 'review'}>
        <span className="small-icon peach"><CircleAlert size={20} /></span><div><strong>{overview.reviewQuestions}</strong><small>{mode === 'review' ? 'Đang ôn câu yếu' : 'Câu cần ôn lại'}</small></div><ArrowRight size={17} />
      </button>
    </div>

    <div className="practice-controls panel">
      <div className="practice-control-block"><span className="control-label">Chuyên đề</span><div className="filter-row" aria-label="Chuyên đề luyện tập">{CATS.map(c => <button key={c} className="filter-chip" aria-pressed={cat === c} onClick={() => updateParam('cat', c, 'Tất cả')}>{c}</button>)}</div></div>
      <div className="practice-control-grid">
        <label className="field">Độ khó<select aria-label="Độ khó luyện tập" value={difficulty} onChange={event => updateParam('difficulty', event.target.value, 'Tất cả')}>{DIFFICULTIES.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="field">Độ dài phiên<select aria-label="Độ dài phiên luyện tập" value={size} onChange={event => updateParam('size', event.target.value, '5')}><option value="5">5 câu</option><option value="10">10 câu</option><option value="all">Toàn bộ câu phù hợp</option></select></label>
        <button type="button" className={'button ' + (mode === 'review' ? 'button-dark' : 'button-light')} onClick={() => setMode(mode === 'review' ? 'normal' : 'review')}><Brain size={16} />{mode === 'review' ? 'Thoát ôn câu yếu' : 'Ôn câu cần nhớ'}{overview.reviewQuestions > 0 && <span className="practice-count-badge">{overview.reviewQuestions}</span>}</button>
        {learningGoal.goal && <button type="button" className={'button ' + (mode === 'goal' ? 'button-dark' : 'button-light')} onClick={() => setMode(mode === 'goal' ? 'normal' : 'goal')}><Flag size={16} />{mode === 'goal' ? 'Thoát chẩn đoán mục tiêu' : 'Chẩn đoán mục tiêu'}</button>}
      </div>
      <p className="helper-text">{mode === 'goal' && goalDiagnostic ? 'Goal Diagnostic: “' + goalDiagnostic.targetTitle + '” · ' + goalDiagnostic.conceptIds.length + ' concept chưa đủ bằng chứng · ' : concept ? 'Knowledge Graph focus: “' + concept.title + '”. ' : ''}{mode === 'review' ? 'Chế độ ôn tập chỉ lấy những câu bạn từng làm sai và chưa trả lời đúng liên tiếp 2 lần.' : filtered.length + ' câu phù hợp với bộ lọc hiện tại.'}</p>
    </div>

    {insights.length > 0 && <div className="practice-insights panel"><div className="panel-heading-row"><div><p className="eyebrow">DỮ LIỆU TỪ CHÍNH CÁC LẦN BẠN LÀM</p><h2 className="panel-title">Điểm cần chú ý theo chuyên đề</h2></div><Link to="/progress" className="text-link">Mở trang tiến độ<ArrowRight size={15} /></Link></div>
      <div className="practice-insight-grid">{insights.map(item => <div className="practice-insight" key={item.name}><div><strong>{item.name}</strong><span>{item.attempted}/{item.total} câu đã gặp</span></div><div className="practice-insight-score"><strong>{item.accuracy === null ? '—' : item.accuracy + '%'}</strong><small>{item.needsReview ? item.needsReview + ' cần ôn' : 'Đang ổn'}</small></div></div>)}</div>
    </div>}

    <PracticeSession key={sessionKey} candidates={filtered} mode={mode} size={size} cat={cat} difficulty={difficulty} conceptId={concept?.id || ''} goalTargetId={goalDiagnostic?.targetConceptId || ''} />
  </section>;
}

function PracticeSession({ candidates, mode, size, cat, difficulty, conceptId, goalTargetId }: { candidates: Quiz[]; mode: 'normal' | 'review' | 'goal'; size: typeof SESSION_SIZES[number]; cat: string; difficulty: 'Tất cả' | QuizDifficulty; conceptId: string; goalTargetId: string }) {
  const progress = useProgress();
  const [questions] = useState(() => {
    const pool = mode === 'review' ? questionsNeedingReview(candidates, progress) : candidates;
    const limit = size === 'all' ? pool.length : Number(size);
    return pool.slice(0, limit);
  });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  if (!questions.length) {
    return <div className="panel practice-empty"><span className="small-icon green"><Check size={20} /></span><h2>{mode === 'review' ? 'Không còn câu nào cần ôn trong bộ lọc này' : mode === 'goal' ? 'Chưa có câu chẩn đoán cho phần còn thiếu' : 'Chưa có câu hỏi phù hợp'}</h2><p>{mode === 'review' ? 'Các câu bạn từng sai đã được làm đúng liên tiếp đủ để tạm rời danh sách ôn.' : mode === 'goal' ? 'Một số nút trên lộ trình chưa có câu hỏi trực tiếp. Hãy mở Knowledge Graph để xem chính xác khoảng trống hiện tại.' : 'Hãy đổi chuyên đề hoặc độ khó để bắt đầu một phiên khác.'}</p>{mode === 'review' && <Link to={buildPracticeHref(cat, difficulty, size, conceptId)} className="button button-light">Luyện bình thường</Link>}{mode === 'goal' && goalTargetId && <Link to={'/map?concept=' + encodeURIComponent(goalTargetId)} className="button button-light">Mở lộ trình mục tiêu</Link>}</div>;
  }

  const q = questions[index];
  const answered = answers[index];
  const score = answers.filter((answer, i) => answer === questions[i].i).length;
  const currentStat = progress.practice[q.id];
  const previousAccuracy = questionAccuracy(currentStat);
  const wrongQuestions = questions.filter((question, i) => answers[i] !== question.i);

  const restart = () => { setIndex(0); setAnswers([]); setFinished(false); };
  const answer = (choice: number) => {
    if (answered !== undefined) return;
    setAnswers(current => [...current, choice]);
    recordQuestionAttempt(q.id, choice === q.i);
  };
  const next = () => { if (index + 1 === questions.length) setFinished(true); else setIndex(i => i + 1); };

  if (finished) return <div className="panel practice-result" aria-live="polite"><span className="result-trophy"><Trophy size={36} /></span><p className="eyebrow">HOÀN THÀNH PHIÊN LUYỆN TẬP</p><h2>Bạn đã làm đúng {score}/{questions.length} câu!</h2><p>{score === questions.length ? 'Phiên này sạch lỗi. Nếu đây là câu từng sai, thêm một lần đúng nữa có thể đưa nó khỏi danh sách cần ôn.' : 'Có ' + wrongQuestions.length + ' câu nên quay lại sớm. MathNexus đã ghi nhớ chúng cho phiên ôn tập tiếp theo.'}</p><div className="flex flex-wrap justify-center gap-3 my-6"><button className="button button-dark" onClick={restart}><RotateCcw size={16} />Luyện lại phiên này</button>{wrongQuestions.length > 0 && <Link to={buildReviewHref(cat, difficulty, size, conceptId)} className="button button-light"><Brain size={16} />Ôn câu yếu</Link>}<Link to="/progress" className="button button-light">Xem tiến độ</Link></div>{wrongQuestions.map(question => <div key={question.id} className="review-question"><div className="review-question-head"><strong>{question.q}</strong><span className={'difficulty-tag ' + difficultyClass(question.difficulty)}>{question.difficulty}</span></div><p>Đáp án đúng: {question.a[question.i]}</p><small>{question.ex}</small></div>)}</div>;

  return <div className="panel practice-panel">
    <div className="practice-meta"><span>Câu {index + 1} / {questions.length}</span><span><Check size={15} />{score} câu đúng</span></div>
    <div className="progress-track" role="progressbar" aria-label="Tiến độ phiên luyện tập" aria-valuenow={answers.length} aria-valuemin={0} aria-valuemax={questions.length}><span style={{ width: (answers.length / questions.length * 100) + '%' }} /></div>
    <div className="question-tags"><span className="eyebrow">{q.cat}</span><span className={'difficulty-tag ' + difficultyClass(q.difficulty)}>{q.difficulty}</span>{currentStat?.attempts ? <span className="history-tag">Đã làm {currentStat.attempts} lần · đúng {previousAccuracy}%</span> : <span className="history-tag">Câu mới</span>}</div>
    <h2 className="practice-question">{q.q}</h2>
    <div className="answer-grid">{q.a.map((option, i) => <button key={index + '-' + i} disabled={answered !== undefined} onClick={() => answer(i)} className={'answer-option ' + (answered === undefined ? '' : i === q.i ? 'correct' : i === answered ? 'incorrect' : 'muted')}><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{answered !== undefined && i === q.i && <Check size={18} />}{answered === i && i !== q.i && <X size={18} />}</button>)}</div>
    {answered !== undefined && <div className={'answer-explanation ' + (answered === q.i ? 'correct' : 'incorrect')} role="status"><strong>{answered === q.i ? 'Chính xác, làm tốt lắm!' : 'Chưa đúng — câu này đã được thêm vào vùng cần ôn.'}</strong><p>{q.ex}</p>{answered !== q.i && <small>Muốn đưa câu này ra khỏi vùng ôn, hãy trả lời đúng nó ở các lần luyện sau.</small>}</div>}
    <div className="practice-actions"><span className="helper-text">{answered === undefined ? mode === 'review' ? 'Đây là một câu MathNexus chọn lại vì bạn từng vấp ở đây.' : mode === 'goal' ? 'Câu này được lấy từ một concept còn thiếu bằng chứng trên lộ trình mục tiêu.' : 'Chọn một đáp án để xem lời giải.' : mode === 'goal' ? 'Kết quả đã cập nhật evidence cho lộ trình mục tiêu.' : 'Kết quả đã được ghi vào trí nhớ luyện tập.'}</span><button disabled={answered === undefined} onClick={next} className="button button-dark">{index + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}<ArrowRight size={16} /></button></div>
  </div>;
}

function difficultyClass(difficulty: QuizDifficulty) {
  return difficulty === 'Cơ bản' ? 'easy' : difficulty === 'Vừa' ? 'medium' : 'hard';
}

function buildPracticeHref(cat: string, difficulty: 'Tất cả' | QuizDifficulty, size: typeof SESSION_SIZES[number], conceptId = '') {
  const params = new URLSearchParams();
  if (conceptId) params.set('concept', conceptId);
  if (cat !== 'Tất cả') params.set('cat', cat);
  if (difficulty !== 'Tất cả') params.set('difficulty', difficulty);
  if (size !== '5') params.set('size', size);
  const query = params.toString();
  return '/practice' + (query ? '?' + query : '');
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
