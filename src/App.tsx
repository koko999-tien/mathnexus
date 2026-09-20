import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BottomNav } from './components/layout/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import { Lesson } from './pages/Lesson';
import { Books } from './pages/Books';
import { BookDetail } from './pages/BookDetail';
import { Think } from './pages/Think';
import { Practice } from './pages/Practice';
import { Graph } from './pages/Graph';
import { Tools } from './pages/Tools';
import { Formulas } from './pages/Formulas';
import { FormulaDetail } from './pages/FormulaDetail';
import { AI } from './pages/AI';
import { Notebook } from './pages/Notebook';
import { Progress } from './pages/Progress';

export default function App() {
  const theme = useTheme();

  return (
    <BrowserRouter basename="/mathnexus">
      <div className="flex min-h-screen bg-bg text-ink">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar dark={theme.dark} toggleTheme={theme.toggle} />
          <main className="flex-1 p-5 md:p-7 max-w-[1120px] w-full mx-auto pb-24 md:pb-12">
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
          </main>
          <footer className="flex justify-between gap-3 py-4 px-5 text-muted text-[13px] border-t border-line">
            <span>MathNexus · Mỗi ngày, hiểu thêm một chút.</span>
            <a href="/mathnexus/progress" className="hover:text-ink transition-colors">Dữ liệu của bạn</a>
          </footer>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
