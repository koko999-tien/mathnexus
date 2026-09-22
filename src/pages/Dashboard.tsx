import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  Calculator,
  ChartSpline,
  CircleDot,
  Compass,
  Flame,
  Layers3,
  Library,
  Lightbulb,
  Network,
  PenTool,
  Sigma,
  Sparkles,
  Target,
} from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { BOOKS } from '../data/books';
import { FORMS } from '../data/formulas';
import { THINK } from '../data/think';
import { MATH_CONCEPTS, MATH_DOMAINS } from '../data/mathKnowledge';
import { useProgress } from '../hooks/useProgress';
import { useLearningGoal } from '../hooks/useLearningGoal';
import { recommendLessons } from '../utils/learningInsights';
import { buildLearningGoalState } from '../learning/learningGoal';
import './dashboard.css';

const EXPERIENCE_PORTALS = [
  {
    to: '/map',
    Icon: Network,
    eyebrow: 'NHÌN TOÀN CẢNH',
    title: 'Bản đồ toán học',
    text: 'Đi xuyên qua các khái niệm và xem chúng nối với nhau bằng tiền đề, định lý và ứng dụng.',
    action: 'Mở bản đồ',
    tone: 'sage',
  },
  {
    to: '/cosmos',
    Icon: CircleDot,
    eyebrow: 'KHÁM PHÁ KHÔNG GIAN',
    title: 'Math Cosmos 3D',
    text: 'Nhìn toán học như một vũ trụ thay vì một danh sách chương mục. Bay, quan sát và tìm đường giữa các ý tưởng.',
    action: 'Bước vào Cosmos',
    tone: 'night',
  },
  {
    to: '/graph',
    Icon: ChartSpline,
    eyebrow: 'NHÌN THẤY HÀM SỐ',
    title: 'Đồ thị tương tác',
    text: 'Thay tham số và nhìn hình dạng biến đổi ngay trước mắt. Dùng trực giác thị giác để hiểu công thức.',
    action: 'Chạm vào đồ thị',
    tone: 'blue',
  },
  {
    to: '/canvas',
    Icon: Layers3,
    eyebrow: 'TỰ XÂY Ý TƯỞNG',
    title: 'Math Canvas',
    text: 'Đặt công thức, khái niệm, ghi chú và mô phỏng lên một mặt phẳng vô hạn để suy nghĩ bằng chính cấu trúc của bạn.',
    action: 'Mở canvas',
    tone: 'paper',
  },
  {
    to: '/ai',
    Icon: Sparkles,
    eyebrow: 'ĐỐI THOẠI',
    title: 'Trợ lý toán học',
    text: 'Hỏi vì sao, yêu cầu phản ví dụ, truy nguồn một định lý hoặc đào sâu một ý tưởng theo nhịp tò mò của bạn.',
    action: 'Bắt đầu đối thoại',
    tone: 'violet',
  },
  {
    to: '/books',
    Icon: Library,
    eyebrow: 'ĐỌC ĐỂ THẤY TOÁN ĐẸP',
    title: 'Tủ sách toán',
    text: 'Từ Pólya, Euclid đến Tao: đọc toán như đọc một lịch sử của ý tưởng, không phải chỉ để lấy công thức.',
    action: 'Vào tủ sách',
    tone: 'warm',
  },
];

const CURIOSITY_PATHS = [
  { to: '/library', Icon: BookOpen, title: 'Muốn hiểu một khái niệm', text: 'Đi từ trực giác đến định nghĩa, ví dụ và liên hệ.' },
  { to: '/think', Icon: Brain, title: 'Muốn bị một câu hỏi ám ảnh', text: 'Câu đố và câu hỏi mở để kéo tư duy ra khỏi lối mòn.' },
  { to: '/formulas', Icon: Sigma, title: 'Muốn hiểu một công thức', text: 'Không chỉ “dùng thế nào”, mà còn “vì sao nó có dạng đó”.' },
  { to: '/tools', Icon: Calculator, title: 'Muốn tính, kiểm tra, thử nghiệm', text: 'Dùng công cụ như một phòng thí nghiệm nhỏ cho giả thuyết.' },
  { to: '/calculus', Icon: Activity, title: 'Muốn chơi với biến thiên', text: 'Giới hạn, đạo hàm, tích phân và các trực giác của giải tích.' },
  { to: '/simulations/gravity', Icon: CircleDot, title: 'Muốn thấy toán bước ra thế giới', text: 'Quan sát mô hình động và mối quan hệ giữa phương trình với hiện tượng.' },
  { to: '/practice', Icon: PenTool, title: 'Muốn thử sức', text: 'Luyện tập vẫn ở đây — như một cách thử độ chắc của hiểu biết, không phải trung tâm của trải nghiệm.' },
  { to: '/canvas', Icon: Layers3, title: 'Muốn tạo một hệ ý tưởng riêng', text: 'Vẽ, nối, nhóm và lưu cách bạn nhìn một vấn đề toán học.' },
];

export default function Dashboard() {
  const progress = useProgress();
  const learningGoal = useLearningGoal();
  const recommended = recommendLessons(progress, 3);
  const now = new Date();
  const dayIndex = Number(
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
  );
  const curiosity = THINK[dayIndex % THINK.length];
  const featuredLesson = recommended[0] || LESSONS[0];
  const focusGoal = buildLearningGoalState(progress, learningGoal.goal);

  const domains = MATH_DOMAINS.map(domain => {
    const concepts = MATH_CONCEPTS.filter(concept => concept.domain === domain.id);
    const anchor = concepts[0];
    return {
      ...domain,
      count: concepts.length,
      to: anchor ? `/map?concept=${encodeURIComponent(anchor.id)}` : '/map',
    };
  });

  const displayName = progress.displayName === 'Bạn học Toán' ? 'bạn' : progress.displayName;

  return (
    <section className="math-home page-enter">
      <div className="math-home-hero">
        <div className="math-home-hero-copy">
          <p className="math-home-kicker"><Compass size={15} /> KHÔNG GIAN DÀNH CHO SỰ TÒ MÒ</p>
          <h1>
            Toán học không phải một danh sách bài phải làm.
            <span> Đây là nơi để đi thật xa với một câu hỏi.</span>
          </h1>
          <p className="math-home-lead">
            Chào {displayName}. Từ số học sơ cấp đến giải tích, đại số tuyến tính, xác suất, vật lý toán và những ý tưởng còn khó gọi tên —
            MathNexus được sắp lại để bạn có thể học, nhìn, thử, đọc, sáng tạo và khám phá toán theo cách mình muốn.
          </p>

          <div className="math-home-hero-actions">
            <Link to="/map" className="button button-dark">
              <Network size={17} /> Khám phá bản đồ toán học
            </Link>
            <Link to="/cosmos" className="button button-light">
              <CircleDot size={17} /> Bước vào Math Cosmos 3D
            </Link>
            <Link to="/canvas" className="math-home-text-action">
              Tạo không gian ý tưởng riêng <ArrowRight size={16} />
            </Link>
          </div>

          <div className="math-home-hero-facts" aria-label="Quy mô nội dung MathNexus">
            <span><strong>{MATH_CONCEPTS.length}</strong> khái niệm có liên kết</span>
            <span><strong>{LESSONS.length}</strong> bài học</span>
            <span><strong>{FORMS.length}</strong> công thức</span>
            <span><strong>{BOOKS.length}</strong> đầu sách gợi ý</span>
          </div>
        </div>

        <div className="math-home-orbit-card" aria-label="Các cách khám phá toán học">
          <div className="math-home-orbit-core">
            <span>∞</span>
            <strong>MATH</strong>
            <small>không có điểm kết thúc</small>
          </div>
          <span className="math-home-orbit orbit-one" />
          <span className="math-home-orbit orbit-two" />
          <span className="math-home-orbit orbit-three" />
          <span className="math-home-orbit-node node-a">π</span>
          <span className="math-home-orbit-node node-b">∫</span>
          <span className="math-home-orbit-node node-c">λ</span>
          <span className="math-home-orbit-node node-d">Σ</span>
          <span className="math-home-orbit-node node-e">e<sup>iπ</sup></span>
          <p>Đại số · Hình học · Giải tích · Xác suất · Logic · Vật lý toán · và còn nữa</p>
        </div>
      </div>

      <div className="math-home-intent">
        <div className="math-home-section-head">
          <div>
            <p className="eyebrow">BẮT ĐẦU TỪ HAM MUỐN, KHÔNG PHẢI TỪ BÀI TẬP</p>
            <h2>Hôm nay bạn muốn làm gì với toán học?</h2>
            <p>Không cần đi theo một lộ trình cố định. Chọn trạng thái tò mò phù hợp với bạn lúc này.</p>
          </div>
        </div>

        <div className="math-home-intent-grid">
          {CURIOSITY_PATHS.map(({ to, Icon, title, text }) => (
            <Link key={title} to={to} className="math-home-intent-card">
              <span className="math-home-intent-icon"><Icon size={21} /></span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      </div>

      <div className="math-home-section">
        <div className="math-home-section-head">
          <div>
            <p className="eyebrow">CÁC CỔNG KHÁM PHÁ</p>
            <h2>Một ý tưởng toán học có thể được nhìn bằng nhiều cách</h2>
            <p>Đọc nó, vẽ nó, mô phỏng nó, đặt câu hỏi cho nó hoặc xây một bản đồ quanh nó.</p>
          </div>
        </div>

        <div className="math-home-portal-grid">
          {EXPERIENCE_PORTALS.map(({ to, Icon, eyebrow, title, text, action, tone }) => (
            <Link key={to} to={to} className={`math-home-portal ${tone}`}>
              <div className="math-home-portal-top">
                <span className="math-home-portal-icon"><Icon size={23} /></span>
                <span>{eyebrow}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <strong>{action}<ArrowRight size={15} /></strong>
            </Link>
          ))}
        </div>
      </div>

      <div className="math-home-cosmos-band">
        <div className="math-home-cosmos-copy">
          <p className="eyebrow">VŨ TRỤ KIẾN THỨC</p>
          <h2>11 miền toán học, không phải 11 ngăn kéo tách biệt</h2>
          <p>
            Các miền dưới đây là những cửa vào. Bản đồ tri thức sẽ cho bạn thấy nơi chúng giao nhau,
            nơi một khái niệm trở thành điều kiện cho khái niệm khác và nơi toán học chạm vào thế giới thật.
          </p>
          <Link to="/map" className="math-home-text-action">Xem toàn bộ mạng tri thức <ArrowRight size={16} /></Link>
        </div>

        <div className="math-home-domain-grid">
          {domains.map(domain => (
            <Link key={domain.id} to={domain.to} className="math-home-domain">
              <span>{String(domain.order).padStart(2, '0')}</span>
              <div>
                <strong>{domain.name}</strong>
                <small>{domain.description}</small>
              </div>
              <em>{domain.count} nút</em>
            </Link>
          ))}
        </div>
      </div>

      <div className="math-home-discovery-grid">
        <article className="math-home-curiosity-card">
          <div className="math-home-card-label"><Lightbulb size={17} /> CỬA SỔ TÒ MÒ HÔM NAY</div>
          <h2>{curiosity.t}</h2>
          <p>{curiosity.q}</p>
          <Link to={`/think?item=${dayIndex % THINK.length}`} className="math-home-text-action">
            Đi theo câu hỏi này <ArrowRight size={16} />
          </Link>
          <span className="math-home-question-mark" aria-hidden="true">?</span>
        </article>

        <article className="math-home-feature-card">
          <div className="math-home-card-label"><Sparkles size={17} /> MỘT Ý TƯỞNG ĐỂ ĐI SÂU</div>
          <span className="math-home-feature-meta">{featuredLesson.lv} · {featuredLesson.cat} · {featuredLesson.m}</span>
          <h2>{featuredLesson.t}</h2>
          <p>
            Nếu bạn muốn bắt đầu từ một điểm cụ thể, đây là một cánh cửa hợp lý dựa trên nhịp khám phá hiện tại của bạn.
          </p>
          <Link to={`/lesson/${featuredLesson.id}`} className="button button-dark">
            Mở bài này <ArrowRight size={16} />
          </Link>
        </article>
      </div>

      <div className="math-home-personal">
        <div className="math-home-section-head">
          <div>
            <p className="eyebrow">DẤU VẾT CỦA RIÊNG BẠN</p>
            <h2>Tiến độ là bản ghi hành trình, không phải áp lực</h2>
            <p>Phần này giúp bạn nhớ mình đã đi qua đâu. Nó đứng sau sự tò mò, không đứng trước nó.</p>
          </div>
          <Link to="/progress" className="math-home-text-action">Xem toàn bộ dữ liệu <ArrowRight size={16} /></Link>
        </div>

        <div className="math-home-personal-grid">
          <Link to="/progress" className="math-home-stat">
            <BookOpen size={20} />
            <strong>{progress.lessonsRead.length}</strong>
            <span>bài đã đọc</span>
          </Link>
          <Link to="/progress" className="math-home-stat">
            <Brain size={20} />
            <strong>{progress.questionsDone}</strong>
            <span>câu đã thử</span>
          </Link>
          <Link to="/progress" className="math-home-stat">
            <Flame size={20} />
            <strong>{progress.streak}</strong>
            <span>ngày có hoạt động</span>
          </Link>
          <Link to="/map" className="math-home-stat">
            <Target size={20} />
            <strong>{focusGoal ? focusGoal.progressPercent + '%' : '—'}</strong>
            <span>{focusGoal ? 'mục tiêu dài hơi' : 'chưa cần đặt mục tiêu'}</span>
          </Link>
        </div>

        {focusGoal && (
          <div className="math-home-goal">
            <div>
              <span className="eyebrow">MỤC TIÊU ĐANG THEO</span>
              <h3>{focusGoal.target.title}</h3>
              <p>{focusGoal.satisfiedCount}/{focusGoal.totalCount} nút đã có bằng chứng học tập.</p>
            </div>
            <div className="math-home-goal-actions">
              <span>{focusGoal.progressPercent}%</span>
              <Link to={`/map?concept=${encodeURIComponent(focusGoal.target.id)}`} className="button button-light">
                Xem lộ trình <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="math-home-footer-idea">
        <div>
          <span>MathNexus không nên hỏi “bạn đã làm bao nhiêu bài?” trước tiên.</span>
          <h2>Nó nên hỏi: “Điều gì trong toán học đang khiến bạn tò mò?”</h2>
        </div>
        <Link to="/ai" className="button button-dark">
          <Sparkles size={17} /> Hỏi một điều bất kỳ
        </Link>
      </div>
    </section>
  );
}
