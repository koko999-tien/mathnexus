import { NavLink } from 'react-router-dom';
import { Home, BookOpen, PenTool, Calculator, Brain } from 'lucide-react';

const NAV = [
  { to: '/', icon: Home, label: 'Tổng quan' },
  { to: '/library', icon: BookOpen, label: 'Thư viện' },
  { to: '/practice', icon: PenTool, label: 'Luyện' },
  { to: '/tools', icon: Calculator, label: 'Công cụ' },
  { to: '/think', icon: Brain, label: 'Tư duy' },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 z-10 bg-panel border-t border-line grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-[11px] no-underline transition-colors ${isActive ? 'text-forest font-bold' : 'text-muted'}`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
