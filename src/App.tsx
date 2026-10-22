import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Link, Routes, Route, useLocation } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BottomNav } from './components/layout/BottomNav';
import { AppStatus } from './components/layout/AppStatus';
import { WebAnalytics } from './components/layout/WebAnalytics';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PageMeta } from './components/seo/PageMeta';
import { STATIC_PAGE_SEO } from './data/seo';
import NotFound from './pages/NotFound';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Library = lazy(() => import('./pages/Library'));
const LibraryReader = lazy(() => import('./pages/LibraryReader'));
const LibraryBookReader = lazy(() => import('./pages/LibraryBookReader'));
const LibraryBookDetail = lazy(() => import('./pages/LibraryBookDetail'));
const KnowledgeMap = lazy(() => import('./pages/KnowledgeMap'));
const MathCosmos = lazy(() => import('./pages/MathCosmos'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Books = lazy(() => import('./pages/Books'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Think = lazy(() => import('./pages/Think'));
const Practice = lazy(() => import('./pages/Practice'));
const Graph = lazy(() => import('./pages/Graph'));
const Tools = lazy(() => import('./pages/Tools'));
const Calculus = lazy(() => import('./pages/Calculus'));
const GravityLab = lazy(() => import('./pages/GravityLab'));
const Formulas = lazy(() => import('./pages/Formulas'));
const FormulaDetail = lazy(() => import('./pages/FormulaDetail'));
const AI = lazy(() => import('./pages/AI'));
const Notebook = lazy(() => import('./pages/Notebook'));
const MathCanvas = lazy(() => import('./pages/MathCanvas'));
const Progress = lazy(() => import('./pages/Progress'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

function Loader() {
  return (
    <div className="page-skeleton" role="status" aria-label="Đang tải nội dung">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <span className="skeleton-live">Đang mở góc học tập…</span>
    </div>
  );
}

function RouteEffects() {
  const { pathname } = useLocation();
  const initialPathRef = useRef(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (initialPathRef.current) {
      initialPathRef.current = false;
    } else {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
  }, [pathname]);

  return null;
}

function RouteMeta() {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
  if (/^\/(lesson|formula|book)\//.test(path)) return null;
  const seo = STATIC_PAGE_SEO[path];
  if (!seo) return null;
  return <PageMeta {...seo} path={path} />;
}

export default function App() {
  const theme = useTheme();
  const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <BrowserRouter basename={routerBase || '/'}>
      <RouteEffects />
      <RouteMeta />
      <WebAnalytics />
      <a href="#main-content" className="skip-link">Đi đến nội dung chính</a>
      <div className="app-shell">
        <Sidebar />
        <div className="app-content">
          <TopBar dark={theme.dark} toggleTheme={theme.toggle} />
          <main id="main-content" tabIndex={-1} className="main-content">
            <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/library" element={<Library />} />
                <Route path="/library/read" element={<LibraryReader />} />
                <Route path="/library/book" element={<LibraryBookReader />} />
                <Route path="/library/book-info" element={<LibraryBookDetail />} />
                <Route path="/map" element={<KnowledgeMap />} />
                <Route path="/cosmos" element={<MathCosmos />} />
                <Route path="/lesson/:id" element={<Lesson />} />
                <Route path="/books" element={<Books />} />
                <Route path="/book/:id" element={<BookDetail />} />
                <Route path="/think" element={<Think />} />
                <Route path="/practice" element={<Practice />} />
                <Route path="/graph" element={<Graph />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/calculus" element={<Calculus />} />
                <Route path="/simulations/gravity" element={<GravityLab />} />
                <Route path="/formulas" element={<Formulas />} />
                <Route path="/formula/:id" element={<FormulaDetail />} />
                <Route path="/ai" element={<AI />} />
                <Route path="/notebook" element={<Notebook />} />
                <Route path="/canvas" element={<MathCanvas />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </main>
          <footer className="app-footer">
            <div><span className="footer-brand">MathNexus<span>·</span></span><span>Mỗi ngày, hiểu thêm một chút.</span><Link to="/progress">Dữ liệu của bạn</Link><Link to="/privacy">Quyền riêng tư</Link><Link to="/terms">Điều khoản</Link></div>
            <AppStatus />
          </footer>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
