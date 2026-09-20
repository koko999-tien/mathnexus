import { Moon, Sun, Menu, Search, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navigation } from './Sidebar';
import { NAVIGATION } from '../../data/navigation';
import { SearchDialog } from '../ui/SearchDialog';
import { Modal } from '../ui/Modal';
import { useProgress } from '../../hooks/useProgress';

export function TopBar({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const p = useProgress();
  const title = NAVIGATION.find(n => n.to === pathname)?.label || 'Khám phá kiến thức';

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
      <div className="breadcrumb"><span>Không gian học tập</span><ChevronRight size={14} /><strong>{title}</strong></div>
      <button className="topbar-search" onClick={() => setSearchOpen(true)} aria-label="Tìm kiếm"><Search size={18} /><span>Tìm kiếm kiến thức…</span><kbd>Ctrl K</kbd></button>
      <button onClick={toggleTheme} className="icon-button" aria-label={dark ? 'Bật giao diện sáng' : 'Bật giao diện tối'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
      <span className="topbar-divider" />
      <Link to="/progress" className="avatar topbar-avatar" aria-label="Tiến độ cá nhân">{p.displayName.charAt(0).toUpperCase()}</Link>
    </header>
    {menuOpen && <Modal title="MathNexus" className="drawer" onClose={() => setMenuOpen(false)}><Navigation onNavigate={() => setMenuOpen(false)} /></Modal>}
    {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
  </>;
}
