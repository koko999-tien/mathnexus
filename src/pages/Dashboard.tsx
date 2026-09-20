import { Link } from 'react-router-dom';
import { LESSONS } from '../data/lessons';
import { getProgress } from '../utils/storage';
import { BookOpen, PenTool, Library as LibIcon, Flame, ArrowRight } from 'lucide-react';

const DAILY_PROMPTS = [
  "Mọi số nguyên tố đều lẻ. Đúng hay sai?",
  "Tổng 3 số lẻ liên tiếp luôn chia hết cho 3?",
  "Tại sao log₂8 = 3?",
  "C(5,2) = ? Vì sao?",
  "i² = −1 có nghĩa gì?",
];

export function Dashboard() {
  const p = getProgress();
  const today = new Date().toLocaleDateString('vi-VI', { weekday: 'long', day: 'numeric', month: 'long' });
  const prompt = DAILY_PROMPTS[new Date().getDate() % DAILY_PROMPTS.length];
  const featured = LESSONS.filter(l => ['pyth', 'quad', 'der', 'euler', 'cplx', 'prob'].includes(l.id));

  return (
    <section>
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-5">
        <div>
          <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">KHÔNG GIAN CỦA BẠN</div>
          <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Học · Đọc · Tư duy</h1>
          <p className="text-muted max-w-lg">Bài học ngắn, tủ sách chọn lọc, công thức có lời giải thích, và trợ lý AI trên máy.</p>
        </div>
        <span className="flex items-center gap-2 px-3 py-2 border border-line rounded-full bg-panel text-muted text-[13px] whitespace-nowrap h-fit">
          📅 {today}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.55fr_.85fr] gap-4 mb-5">
        <section className="bg-gradient-to-br from-[#dcefd4] to-[#eef6e8] text-ink rounded-2xl p-6 grid grid-cols-1 md:grid-cols-[1.2fr_.8fr] gap-2 min-h-[220px] overflow-hidden">
          <div>
            <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">HÀNH TRÌNH TRI THỨC</div>
            <h2 className="text-2xl mt-2 mb-2 font-bold leading-tight">Từ những con số đầu tiên<br/>đến những câu hỏi lớn.</h2>
            <p className="text-muted mb-4">Hiểu công thức trước khi nhớ. Đọc sách trước khi luyện nhiều.</p>
            <Link to="/library" className="inline-flex items-center gap-2 bg-lime text-lime-ink px-4 py-2.5 rounded-xl font-bold text-sm no-underline hover:opacity-90 transition">
              Khám phá thư viện <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section className="bg-panel border border-line rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] tracking-[.12em] font-bold text-[#3d6b5c]">THỬ THÁCH HÔM NAY</span>
            <span className="text-warm">🔥</span>
          </div>
          <p className="text-sm mb-3">{prompt}</p>
          <Link to="/think" className="inline-flex items-center gap-1.5 text-[#3d6b5c] font-semibold text-sm no-underline">
            Thử sức ngay <ArrowRight size={14} />
          </Link>
        </section>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        {[
          { icon: <LibIcon size={18} />, value: p.lessonsRead.length, label: 'Bài học hoàn thành' },
          { icon: <PenTool size={18} />, value: p.questionsDone, label: 'Câu hỏi đã làm' },
          { icon: <BookOpen size={18} />, value: p.booksOpened.length, label: 'Sách đã mở' },
          { icon: <Flame size={18} />, value: p.streak, label: 'Ngày liên tiếp' },
        ].map(({ icon, value, label }) => (
          <div key={label} className="flex gap-3 items-center p-4 bg-panel border border-line rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-[#eef8d8] text-[#3d6b5c] grid place-items-center">{icon}</div>
            <div>
              <div className="text-xl font-bold">{value}</div>
              <div className="text-[13px] text-muted">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-end gap-3 mb-3">
        <div><h2 className="text-xl font-bold m-0">Hôm nay, bạn muốn khám phá gì?</h2><p className="text-muted text-sm mt-1">Một vài điểm bắt đầu dành cho bạn.</p></div>
        <Link to="/library" className="inline-flex items-center gap-1.5 text-[#3d6b5c] font-semibold text-sm no-underline shrink-0">
          Tất cả bài học <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {featured.map(l => (
          <Link key={l.id} to={`/lesson/${l.id}`} className="bg-panel border border-line rounded-2xl p-4 no-underline text-ink hover:border-sage transition-colors">
            <div className="flex justify-between items-center mb-2">
              <span className={`w-9 h-9 rounded-xl grid place-items-center font-[Georgia] text-xl ${l.icon === 'algebra' ? 'bg-[#e8f1ec] text-[#3d6b5c]' : l.icon === 'geometry' ? 'bg-[#fbebde] text-warm' : l.icon === 'analysis' ? 'bg-[#e5f2fc] text-[#2783de]' : 'bg-[#f4eef8] text-[#6b4e8a]'}`}>
                {l.sym}
              </span>
              <span className="text-[12px] text-muted">{l.lv}</span>
            </div>
            <div className="font-semibold text-sm mb-1">{l.t}</div>
            <div className="text-muted text-[13px]">{l.cat} · {l.m}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
