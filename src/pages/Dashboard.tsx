import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, ChartSpline, Check, Circle, Flame, Lightbulb, PenTool, Sigma, Sparkles, Target } from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { THINK } from '../data/think';
import { useProgress } from '../hooks/useProgress';
import { emptyActivity, localDate } from '../utils/storage';
import { recommendLessons, todayPlan } from '../utils/learningInsights';
import { LessonCard } from '../components/ui/LessonCard';
import { MathArtwork } from '../components/ui/MathArtwork';

export default function Dashboard() {
  const p = useProgress();
  const now = new Date();
  const today = now.toLocaleDateString('vi-VI', { weekday: 'long', day: 'numeric', month: 'long' });
  const challengeIndex = Number(localDate().replaceAll('-', '')) % THINK.length;
  const challenge = THINK[challengeIndex];
  const recommended = recommendLessons(p, 3);
  const nextLesson = recommended[0] || LESSONS[0];
  const plan = todayPlan(p);
  const planDone = plan.filter(item => item.done).length;
  const day = p.activity[localDate()] || emptyActivity();
  const goalProgress = Math.min(100, Math.round(day.questions / p.dailyGoal * 100));

  return <section className="dashboard page-enter">
    <div className="dashboard-heading"><div><p className="eyebrow">GÓC HỌC TẬP CỦA BẠN</p><h1>Một ngày mới, một ý tưởng mới<span className="heading-dot">.</span></h1><p>Chào {p.displayName === 'Bạn học Toán' ? 'bạn' : p.displayName}, cùng khám phá vẻ đẹp của toán học nhé.</p></div><span className="date-pill"><CalendarDays size={15} />{today}</span></div>

    <div className="hero-grid">
      <div className="hero-card"><div className="hero-copy"><span className="hero-label"><span /> HỌC ĐỂ HIỂU, KHÔNG CHỈ ĐỂ NHỚ</span><h2>Những ý tưởng lớn<br />bắt đầu từ <em>sự tò mò.</em></h2><p>{p.lastLesson ? 'Tiếp tục từ nhịp học gần nhất với “' + nextLesson.t + '”.' : 'Từ một công thức quen thuộc đến cả một thế giới đáng khám phá. Đi theo nhịp học của riêng bạn.'}</p><Link to={'/lesson/' + nextLesson.id} className="button button-dark">{p.lessonsRead.length || p.lastLesson ? 'Học bài tiếp theo' : 'Bắt đầu khám phá'}<ArrowRight size={17} /></Link><div className="hero-caption"><BookOpen size={14} /> {LESSONS.length} bài học · Từ THCS đến đại học</div></div><MathArtwork /></div>
      <div className="challenge-card"><div className="card-eyebrow"><span className="small-icon peach"><Lightbulb size={18} /></span><span>THỬ THÁCH HÔM NAY</span></div><span className="challenge-tag">Một chút tư duy</span><h2>{challenge.t}</h2><p>{challenge.q}</p><Link to={'/think?item=' + challengeIndex} className="text-link">Bạn có lời giải chứ?<ArrowRight size={16} /></Link><span className="challenge-decoration" aria-hidden="true">?</span></div>
    </div>

    <div className="stats-grid">{[
      { Icon: BookOpen, value: p.lessonsRead.length, label: 'Bài học hoàn thành', tone: 'green', detail: 'trong ' + LESSONS.length + ' bài học' },
      { Icon: PenTool, value: p.questionsDone, label: 'Câu hỏi đã luyện', tone: 'blue', detail: p.questionsDone ? p.questionsCorrect + ' câu trả lời đúng' : 'Sẵn sàng thử sức?' },
      { Icon: Target, value: day.questions + '/' + p.dailyGoal, label: 'Mục tiêu hôm nay', tone: 'lilac', detail: goalProgress === 100 ? 'Tuyệt vời, bạn đã làm được!' : 'Mỗi câu hỏi, một bước tiến' },
      { Icon: Flame, value: p.streak, label: 'Ngày học liên tiếp', tone: 'peach', detail: p.streak ? 'Giữ ngọn lửa tò mò nhé' : 'Bắt đầu từ hôm nay' },
    ].map(({ Icon, value, label, tone, detail }) => <Link to="/progress" key={label} className="stat-card"><div className="stat-top"><span className={'small-icon ' + tone}><Icon size={20} /></span><strong>{value}</strong></div><h3>{label}</h3><p>{detail}</p></Link>)}</div>

    <div className="today-plan panel">
      <div className="today-plan-head"><div><span className="eyebrow">KHÔNG CẦN HỌC LAN MAN</span><h2>Kế hoạch hôm nay</h2><p>Ba việc nhỏ để giữ nhịp học đều và có chủ đích.</p></div><div className="plan-score" aria-label={planDone + ' trên ' + plan.length + ' việc đã hoàn thành'}><strong>{planDone}/{plan.length}</strong><span>đã xong</span></div></div>
      <div className="plan-grid">{plan.map(item => <Link key={item.id} to={item.to} className={'plan-item' + (item.done ? ' is-done' : '')}>
        <span className="plan-check">{item.done ? <Check size={17} /> : <Circle size={17} />}</span>
        <span className="plan-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
        <span className="plan-progress">{item.progressLabel}<ArrowRight size={15} /></span>
      </Link>)}</div>
    </div>

    <div className="section-heading"><div><span className="eyebrow">ĐỀ XUẤT THEO NHỊP HỌC CỦA BẠN</span><h2>{p.lastLesson ? 'Nên học gì tiếp?' : 'Bắt đầu từ đâu?'}</h2></div><Link to="/library" className="text-link">Tất cả bài học<ArrowRight size={16} /></Link></div>
    <div className="lesson-grid">{recommended.map(lesson => <LessonCard key={lesson.id} lesson={lesson} done={p.lessonsRead.includes(lesson.id)} />)}</div>

    <div className="dashboard-bottom"><div><div className="section-heading"><div><span className="eyebrow">THỬ NGHIỆM ĐỂ HIỂU SÂU HƠN</span><h2>Bàn làm việc toán học</h2></div></div><div className="quick-tools">{[
      { to: '/graph', Icon: ChartSpline, title: 'Chạm vào đồ thị', text: 'Thay hệ số, thấy sự khác biệt.', tone: 'green' },
      { to: '/formulas', Icon: Sigma, title: 'Hiểu một công thức', text: 'Ý nghĩa đằng sau ký hiệu.', tone: 'blue' },
      { to: '/ai', Icon: Sparkles, title: 'Hỏi trợ lý AI', text: 'Gỡ rối từng bước suy luận.', tone: 'lilac' },
    ].map(({ to, Icon, title, text, tone }) => <Link key={to} to={to} className="quick-tool"><span className={'small-icon ' + tone}><Icon size={21} /></span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={18} /></Link>)}</div></div>
      <div className="daily-goal"><div className="goal-heading"><span className="small-icon green">{goalProgress === 100 ? <Check size={20} /> : <Target size={20} />}</span><span>THÓI QUEN NHỎ, TIẾN BỘ LỚN</span></div><h3>{goalProgress === 100 ? 'Bạn đã hoàn thành mục tiêu!' : 'Dành ít phút cho ' + p.dailyGoal + ' câu hỏi'}</h3><p>Không cần nhanh hơn ai. Chỉ cần tiến xa hơn chính mình ngày hôm qua.</p><div className="goal-label"><span>Mục tiêu hôm nay</span><strong>{day.questions}/{p.dailyGoal} câu</strong></div><div className="progress-track" role="progressbar" aria-label="Mục tiêu hôm nay" aria-valuenow={goalProgress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: goalProgress + '%' }} /></div><Link to="/practice" className="text-link">Luyện tập ngay<ArrowRight size={16} /></Link></div>
    </div>
  </section>;
}
