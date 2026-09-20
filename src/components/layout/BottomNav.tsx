import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PenTool, ChartSpline, NotebookPen } from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Trang chủ' },
  { to: '/library', icon: BookOpen, label: 'Thư viện' },
  { to: '/practice', icon: PenTool, label: 'Luyện tập' },
  { to: '/graph', icon: ChartSpline, label: 'Đồ thị' },
  { to: '/notebook', icon: NotebookPen, label: 'Sổ tay' },
];

export function BottomNav() {
  return <nav className="bottom-nav" aria-label="Điều hướng nhanh">{NAV.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'is-active' : ''}><Icon size={21} strokeWidth={1.7} /><span>{label}</span></NavLink>)}</nav>;
}
