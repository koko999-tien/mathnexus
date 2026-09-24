import { Fragment } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Sprout } from 'lucide-react';
import { NAVIGATION, getRouteNavigation } from '../../data/navigation';
import { useProgress } from '../../hooks/useProgress';

export function Brand() {
  return <Link to="/" className="brand" aria-label="MathNexus - Trang chủ"><span className="brand-mark">m<span>·</span></span><span>MathNexus<small>MỖI NGÀY, HIỂU THÊM MỘT CHÚT.</small></span></Link>;
}

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const { section } = getRouteNavigation(pathname);
  return <nav className="sidebar-nav" aria-label="Điều hướng chính">{NAVIGATION.map(({ to, icon: Icon, label, group }, index) => (
    <Fragment key={to}>
      {(index === 0 || NAVIGATION[index - 1].group !== group) && <p className="nav-group">{group}</p>}
      <NavLink to={to} end={to === '/'} aria-current={section?.to === to ? 'page' : undefined} onClick={onNavigate} className={`nav-link ${section?.to === to ? 'is-active' : ''}`}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></NavLink>
    </Fragment>
  ))}</nav>;
}

export function Sidebar() {
  const p = useProgress();
  return (
    <aside className="desktop-sidebar">
      <Brand />
      <Navigation />
      <div className="sidebar-bottom">
        <div className="grow-card"><Sprout size={24} /><strong>Một chút mỗi ngày.<br />Một bước tiến xa.</strong><p>Dành vài phút hôm nay cho một ý tưởng mới.</p><Link to="/practice">Bắt đầu luyện tập <ArrowUpRight size={16} /></Link></div>
        <Link to="/progress" className="profile-link"><span className="avatar">{p.displayName.charAt(0).toUpperCase()}</span><span><strong>{p.displayName}</strong><small>Góc học tập cá nhân</small></span><ArrowUpRight size={16} /></Link>
      </div>
    </aside>
  );
}
