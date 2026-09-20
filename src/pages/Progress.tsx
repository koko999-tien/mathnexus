import { getProgress, saveProgress, DEFAULT_PROGRESS, type Progress } from '../utils/storage';
import { LESSONS } from '../data/lessons';
import { Download, RotateCcw } from 'lucide-react';

const ROADMAP = [
  { phase: 'Tháng 1-2', status: 'done', title: 'Web MVP', desc: 'Bài học, tủ sách, công thức, luyện tập, đồ thị' },
  { phase: 'Tháng 3', status: 'active', title: 'Công cụ nâng cao', desc: 'Sổ tay, AI, theo dõi tiến độ' },
  { phase: 'Tháng 4', status: 'future', title: 'PWA + Offline', desc: 'Service worker, cài như app trên điện thoại' },
  { phase: 'Tháng 5', status: 'future', title: 'App mobile', desc: 'React Native hoặc Capacitor' },
  { phase: 'Tháng 6+', status: 'future', title: 'Cộng đồng', desc: 'Đăng bài, chia sẻ, thi đua' },
];

export function Progress() {
  const p = getProgress();

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mathnexus-progress.json';
    a.click();
  };

  const reset = () => {
    if (confirm('Xóa tất cả tiến độ?')) {
      saveProgress(DEFAULT_PROGRESS);
      window.location.reload();
    }
  };

  const readPct = Math.round((p.lessonsRead.length / LESSONS.length) * 100);

  return (
    <section>
      <div className="mb-5">
        <div className="text-[11px] tracking-[.14em] font-bold text-[#3d6b5c]">LỘ TRÌNH</div>
        <h1 className="text-3xl tracking-tight mt-1 mb-2 font-bold">Tiến độ học tập</h1>
        <p className="text-muted max-w-lg">Bây giờ: không gian cá nhân. Sau 5 tháng: app cho cộng đồng.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="text-xl font-bold">{p.lessonsRead.length}/{LESSONS.length}</div>
          <div className="text-[13px] text-muted">Bài đã đọc</div>
          <div className="h-2 bg-bg rounded-full mt-2 overflow-hidden"><div className="h-full bg-lime rounded-full" style={{ width: `${readPct}%` }} /></div>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="text-xl font-bold">{p.questionsDone}</div>
          <div className="text-[13px] text-muted">Câu hỏi</div>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="text-xl font-bold">{p.booksOpened.length}</div>
          <div className="text-[13px] text-muted">Sách đã mở</div>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-4">
          <div className="text-xl font-bold">{p.streak}</div>
          <div className="text-[13px] text-muted">Ngày liên tiếp</div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Lộ trình phát triển</h2>
      <div className="space-y-2 mb-6">
        {ROADMAP.map(r => (
          <div key={r.phase} className="grid grid-cols-[92px_1fr] gap-3 p-3 border border-line rounded-xl bg-panel">
            <div className={`text-xs font-bold ${r.status === 'done' ? 'text-forest' : r.status === 'active' ? 'text-warm' : 'text-muted'}`}>{r.phase}</div>
            <div>
              <div className="font-semibold text-sm">{r.title}</div>
              <div className="text-[13px] text-muted">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={exportJSON} className="inline-flex items-center gap-2 border border-line bg-transparent px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-bg transition-colors">
          <Download size={16} /> Tải tiến độ JSON
        </button>
        <button onClick={reset} className="inline-flex items-center gap-2 border border-line bg-transparent px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-red-50 text-red-600 transition-colors">
          <RotateCcw size={16} /> Đặt lại
        </button>
      </div>
    </section>
  );
}
