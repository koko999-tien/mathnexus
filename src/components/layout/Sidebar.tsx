import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Library as LibraryIcon, Brain, PenTool, BarChart3, Calculator, Hash, Bot, StickyNote, TrendingUp } from 'lucide-react';

const NAV = [
  { to: '/', icon: Home, label: 'Tổng quan' },
  { to: '/library', icon: BookOpen, label: 'Thư viện' },
  { to: '/books', icon: LibraryIcon, label: 'Tủ sách' },
  { to: '/think', icon: Brain, label: 'Tư duy' },
  { to: '/practice', icon: PenTool, label: 'Luyện tập' },
  { to: '/graph', icon: BarChart3, label: 'Đồ thị' },
  { to: '/tools', icon: Calculator, label: 'Công cụ' },
  { to: '/formulas', icon: Hash, label: 'Công thức' },
  { to: '/ai', icon: Bot, label: 'Trợ lý AI' },
  { to: '/notebook', icon: StickyNote, label: 'Sổ tay' },
  { to: '/progress', icon: TrendingUp, label: 'Tiến độ' },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-[260px] bg-sidebar text-side-text flex-col sticky top-0 h-screen shrink-0">
      <NavLink to="/" className="flex gap-3 items-center px-5 pt-6 pb-4 no-underline text-inherit">
        <span className="w-9 h-9 rounded-xl bg-lime text-lime-ink grid place-items-center font-extrabold text-lg">M<span className="opacity-55">·</span></span>
        <span className="font-semibold text-sm">MathNexus<small className="block text-[10px] tracking-[.14em] text-[#6b8a72] mt-0.5">KHÔNG GIAN HỌC TOÁN</small></span>
      </NavLink>
      <div className="px-5 py-2 text-[10px] tracking-[.16em] text-[#6b8a72]">HỌC MỖI NGÀY</div>
      <nav className="flex flex-col gap-0.5 px-2 overflow-auto flex-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-xl no-underline text-ink text-[14px] transition-colors ${isActive ? 'bg-[#d8efc8] font-semibold' : 'hover:bg-[#d8efc8]/50'}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-5 py-4 border-t border-line">
        <div className="flex items-center gap-2 text-xs text-[#3d6b5c]">
          <span className="w-[7px] h-[7px] rounded-full bg-lime" />
          Không gian cá nhân
        </div>
        <p className="text-xs text-muted mt-2">Tiến độ lưu trên trình duyệt.</p>
      </div>
    </aside>
  );
}
