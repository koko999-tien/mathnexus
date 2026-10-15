import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PenTool, NotebookPen, Sparkles, type LucideIcon } from 'lucide-react';

const NAV: Array<{ to: string; icon: LucideIcon; label: string; center?: boolean }> = [
  { to: '/', icon: LayoutDashboard, label: 'Trang chủ' },
  { to: '/practice', icon: PenTool, label: 'Luyện tập' },
  { to: '/ai', icon: Sparkles, label: 'Hỏi AI', center: true },
  { to: '/library', icon: BookOpen, label: 'Thư viện' },
  { to: '/notebook', icon: NotebookPen, label: 'Sổ tay' },
];

export function BottomNav() {
  return <nav className="bottom-nav" aria-label="Điều hướng nhanh">{NAV.map(({ to, icon: Icon, label, center }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'is-active' : '') + (center ? ' is-center' : '')}><Icon size={center ? 23 : 21} strokeWidth={center ? 2 : 1.7} /><span>{label}</span></NavLink>)}</nav>;
}
