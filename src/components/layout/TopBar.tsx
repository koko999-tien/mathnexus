import { Moon, Sun, Menu } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

interface TopBarProps {
  dark: boolean;
  toggleTheme: () => void;
}

const NAV = [
  { to: '/', label: 'Tổng quan' },
  { to: '/library', label: 'Thư viện' },
  { to: '/practice', label: 'Luyện tập' },
  { to: '/tools', label: 'Công cụ' },
  { to: '/think', label: 'Tư duy' },
];

export function TopBar({ dark, toggleTheme }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="h-16 flex items-center gap-3 px-5 border-b border-line bg-panel sticky top-0 z-10">
        <button
          className="md:hidden w-10 h-10 border border-line rounded-xl bg-panel grid place-items-center shrink-0"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Mở menu"
        >
          <Menu size={18} />
        </button>
        <div className="hidden md:block text-[13px] text-muted">
          Không gian học tập <span className="mx-1">/</span> <strong className="text-ink font-semibold">MathNexus</strong>
        </div>
        <button
          onClick={toggleTheme}
          className="ml-auto w-10 h-10 border border-line rounded-xl bg-panel grid place-items-center"
          aria-label="Đổi giao diện"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-20" onClick={() => setMenuOpen(false)}>
          <div className="w-64 h-full bg-sidebar p-4 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
            <div className="font-bold text-lg mb-4 px-3">MathNexus</div>
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-xl text-sm no-underline text-ink ${isActive ? 'bg-[#d8efc8] font-semibold' : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
