import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Check, X, Trophy, RotateCcw } from 'lucide-react';
import { QUIZ } from '../data/quiz';
import { recordActivity } from '../utils/storage';

const CATS = ['Tất cả', ...new Set(QUIZ.map(q => q.cat))];

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('cat') || 'Tất cả';
  const cat = CATS.includes(requested) ? requested : 'Tất cả';
  return <section className="page-enter"><div className="page-header"><p className="eyebrow">TIẾN BỘ TỪNG CÂU HỎI</p><h1>Luyện tập</h1><p>Thử sức, đọc lời giải và hiểu vì sao. Một câu trả lời sai cũng là một cơ hội học thêm.</p></div><div className="filter-row" aria-label="Chuyên đề luyện tập">{CATS.map(c => <button key={c} className="filter-chip" aria-pressed={cat === c} onClick={() => setParams(c === 'Tất cả' ? {} : { cat: c })}>{c}</button>)}</div><PracticeSession key={cat} cat={cat} /></section>;
}

function PracticeSession({ cat }: { cat: string }) {
  const questions = QUIZ.filter(q => cat === 'Tất cả' || q.cat === cat);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const q = questions[index];
  const answered = answers[index];
  const score = answers.filter((answer, i) => answer === questions[i].i).length;
  const restart = () => { setIndex(0); setAnswers([]); setFinished(false); };
  const answer = (choice: number) => {
    if (answered !== undefined) return;
    setAnswers(current => [...current, choice]);
    recordActivity('question', choice === q.i);
  };
  const next = () => { if (index + 1 === questions.length) setFinished(true); else setIndex(i => i + 1); };

  if (finished) return <div className="panel practice-result" aria-live="polite"><span className="result-trophy"><Trophy size={36} /></span><p className="eyebrow">HOÀN THÀNH PHIÊN LUYỆN TẬP</p><h2>Bạn đã làm đúng {score}/{questions.length} câu!</h2><p>{score === questions.length ? 'Xuất sắc! Bạn đã nắm rất chắc chủ đề này.' : 'Hãy dành một chút thời gian xem lại các câu cần luyện thêm.'}</p><div className="flex flex-wrap justify-center gap-3 my-6"><button className="button button-dark" onClick={restart}><RotateCcw size={16} />Luyện lại</button><Link to="/progress" className="button button-light">Xem tiến độ</Link></div>{questions.map((question, i) => answers[i] !== question.i && <div key={question.q} className="review-question"><strong>{question.q}</strong><p>Đáp án đúng: {question.a[question.i]}</p><small>{question.ex}</small></div>)}</div>;

  return <div className="panel practice-panel"><div className="practice-meta"><span>Câu {index + 1} / {questions.length}</span><span><Check size={15} />{score} câu đúng</span></div><div className="progress-track" role="progressbar" aria-label="Tiến độ phiên luyện tập" aria-valuenow={answers.length} aria-valuemin={0} aria-valuemax={questions.length}><span style={{ width: `${answers.length / questions.length * 100}%` }} /></div><p className="eyebrow mt-7">{q.cat}</p><h2 className="practice-question">{q.q}</h2><div className="answer-grid">{q.a.map((option, i) => <button key={`${index}-${i}`} disabled={answered !== undefined} onClick={() => answer(i)} className={`answer-option ${answered === undefined ? '' : i === q.i ? 'correct' : i === answered ? 'incorrect' : 'muted'}`}><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{answered !== undefined && i === q.i && <Check size={18} />}{answered === i && i !== q.i && <X size={18} />}</button>)}</div>{answered !== undefined && <div className={`answer-explanation ${answered === q.i ? 'correct' : 'incorrect'}`} role="status"><strong>{answered === q.i ? 'Chính xác, làm tốt lắm!' : 'Chưa đúng, cùng xem lại nhé.'}</strong><p>{q.ex}</p></div>}<div className="practice-actions"><span className="helper-text">{answered === undefined ? 'Chọn một đáp án để xem lời giải.' : 'Kết quả đã được ghi nhận vào tiến độ.'}</span><button disabled={answered === undefined} onClick={next} className="button button-dark">{index + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}<ArrowRight size={16} /></button></div></div>;
}
