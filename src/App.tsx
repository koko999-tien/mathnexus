import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Routes, Route } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BottomNav } from './components/layout/BottomNav';

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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const theme = useTheme();
  const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <BrowserRouter basename={routerBase || '/'}>
      <div className="flex min-h-screen bg-bg text-ink">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar dark={theme.dark} toggleTheme={theme.toggle} />
          <main className="flex-1 p-5 md:p-7 max-w-[1120px] w-full mx-auto pb-24 md:pb-12">
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
              </Routes>
            </Suspense>
          </main>
          <footer className="flex justify-between gap-3 py-4 px-5 text-muted text-[13px] border-t border-line">
            <span>MathNexus · Mỗi ngày, hiểu thêm một chút.</span>
            <Link to="/progress" className="hover:text-ink transition-colors">
              Dữ liệu của bạn
            </Link>
          </footer>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
