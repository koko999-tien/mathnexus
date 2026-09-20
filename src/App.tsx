import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Routes, Route, useLocation } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BottomNav } from './components/layout/BottomNav';
import { AppStatus } from './components/layout/AppStatus';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { NAVIGATION } from './data/navigation';
import NotFound from './pages/NotFound';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Library = lazy(() => import('./pages/Library'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Books = lazy(() => import('./pages/Books'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Think = lazy(() => import('./pages/Think'));
const Practice = lazy(() => import('./pages/Practice'));
const Graph = lazy(() => import('./pages/Graph'));
const Tools = lazy(() => import('./pages/Tools'));
const Formulas = lazy(() => import('./pages/Formulas'));
const FormulaDetail = lazy(() => import('./pages/FormulaDetail'));
const AI = lazy(() => import('./pages/AI'));
const Notebook = lazy(() => import('./pages/Notebook'));
const Progress = lazy(() => import('./pages/Progress'));

function Loader() {
  return (
    <div className="flex items-center justify-center gap-3 h-64" role="status">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-muted text-sm">Đang mở góc học tập…</span>
    </div>
  );
}

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
    document.title = `${NAVIGATION.find(item => item.to === pathname)?.label || 'Khám phá'} · MathNexus`;
  }, [pathname]);
  return null;
}

export default function App() {
  const theme = useTheme();
  const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <BrowserRouter basename={routerBase || '/'}>
      <RouteEffects />
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
                <Route path="/lesson/:id" element={<Lesson />} />
                <Route path="/books" element={<Books />} />
                <Route path="/book/:id" element={<BookDetail />} />
                <Route path="/think" element={<Think />} />
                <Route path="/practice" element={<Practice />} />
                <Route path="/graph" element={<Graph />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/formulas" element={<Formulas />} />
                <Route path="/formula/:id" element={<FormulaDetail />} />
                <Route path="/ai" element={<AI />} />
                <Route path="/notebook" element={<Notebook />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </main>
          <footer className="app-footer">
            <div><span className="footer-brand">MathNexus<span>·</span></span><span>Mỗi ngày, hiểu thêm một chút.</span><Link to="/progress">Dữ liệu của bạn</Link></div>
            <AppStatus />
          </footer>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
