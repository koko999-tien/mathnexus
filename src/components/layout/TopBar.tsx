import { Moon, Sun, Menu, Search, ChevronRight } from 'lucide-react';
import { lazy, Suspense, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navigation } from './Sidebar';
import { getRouteNavigation } from '../../data/navigation';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Modal } from '../ui/Modal';
import { useProgress } from '../../hooks/useProgress';

const SearchDialog = lazy(() => import('../ui/SearchDialog').then(module => ({ default: module.SearchDialog })));

export function TopBar({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const p = useProgress();
  const { title, section } = getRouteNavigation(pathname);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setSearchOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return <>
    <header className="topbar">
      <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Mở menu" aria-expanded={menuOpen}><Menu size={22} /></button>
      <Link to="/" className="mobile-brand">MathNexus<span>·</span></Link>
      <nav className="breadcrumb" aria-label="Vị trí hiện tại">{section && section.to !== pathname ? <Link to={section.to}>{section.label}</Link> : <span>Không gian học tập</span>}<ChevronRight size={14} aria-hidden="true" /><strong aria-current="page">{title}</strong></nav>
      <button className="topbar-search" onClick={() => setSearchOpen(true)} aria-label="Tìm kiếm"><Search size={18} /><span>Tìm kiếm kiến thức…</span><kbd>Ctrl K</kbd></button>
      <button onClick={toggleTheme} className="icon-button" aria-label={dark ? 'Bật giao diện sáng' : 'Bật giao diện tối'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
      <span className="topbar-divider" />
      <Link to="/progress" className="avatar topbar-avatar" aria-label="Tiến độ cá nhân">{p.displayName.charAt(0).toUpperCase()}</Link>
    </header>
    {menuOpen && <Modal title="MathNexus" className="drawer" onClose={() => setMenuOpen(false)}><Navigation onNavigate={() => setMenuOpen(false)} /></Modal>}
    {searchOpen && (
      <ErrorBoundary fallback={
        <Modal title="Chưa mở được tìm kiếm" onClose={() => setSearchOpen(false)}>
          <div className="empty-state">
            <p role="alert">Kiểm tra kết nối rồi tải lại trang để tìm kiếm. Bạn vẫn có thể dùng menu để mở các mục khác.</p>
            <button className="button button-dark" onClick={() => window.location.reload()}>Tải lại trang</button>
          </div>
        </Modal>
      }>
        <Suspense fallback={
          <Modal title="Tìm kiếm MathNexus" onClose={() => setSearchOpen(false)}>
            <p className="dialog-hint" role="status">Đang mở tìm kiếm…</p>
          </Modal>
        }>
          <SearchDialog onClose={() => setSearchOpen(false)} />
        </Suspense>
      </ErrorBoundary>
    )}
  </>;
}
