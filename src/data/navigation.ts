import { LayoutDashboard, BookOpen, Library, Brain, PenTool, ChartSpline, Calculator, Sigma, Sparkles, NotebookPen, ChartNoAxesCombined, Activity, Network, CircleDot, Layers3 } from 'lucide-react';

export const NAVIGATION = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan', group: 'Khám phá' },
  { to: '/library', icon: BookOpen, label: 'Thư viện kiến thức', group: 'Khám phá' },
  { to: '/map', icon: Network, label: 'Bản đồ toán học', group: 'Khám phá' },
  { to: '/cosmos', icon: CircleDot, label: 'Bản đồ 3D', group: 'Khám phá' },
  { to: '/books', icon: Library, label: 'Tủ sách', group: 'Khám phá' },
  { to: '/practice', icon: PenTool, label: 'Luyện tập', group: 'Khám phá' },
  { to: '/think', icon: Brain, label: 'Phát triển tư duy', group: 'Khám phá' },
  { to: '/graph', icon: ChartSpline, label: 'Đồ thị hàm số', group: 'Công cụ học tập' },
  { to: '/tools', icon: Calculator, label: 'Công cụ toán học', group: 'Công cụ học tập' },
  { to: '/calculus', icon: Activity, label: 'Phòng giải tích', group: 'Công cụ học tập' },
  { to: '/simulations/gravity', icon: CircleDot, label: 'Mô phỏng hấp dẫn', group: 'Công cụ học tập' },
  { to: '/formulas', icon: Sigma, label: 'Công thức', group: 'Công cụ học tập' },
  { to: '/ai', icon: Sparkles, label: 'Trợ lý toán học', group: 'Công cụ học tập' },
  { to: '/notebook', icon: NotebookPen, label: 'Sổ tay của tôi', group: 'Cá nhân' },
  { to: '/canvas', icon: Layers3, label: 'Math Canvas', group: 'Cá nhân' },
  { to: '/progress', icon: ChartNoAxesCombined, label: 'Tiến độ học tập', group: 'Cá nhân' },
];

/** Keep detail routes attached to their section without loading page content. */
export function getRouteNavigation(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const exact = NAVIGATION.find(item => item.to === path);
  if (exact) return { title: exact.label, section: exact };

  const details = [
    { prefix: '/lesson/', title: 'Bài học', parent: '/library' },
    { prefix: '/book/', title: 'Chi tiết sách', parent: '/books' },
    { prefix: '/formula/', title: 'Chi tiết công thức', parent: '/formulas' },
    { prefix: '/library/', title: 'Không gian đọc', parent: '/library' },
  ];
  const detail = details.find(item => path.startsWith(item.prefix));
  return { title: detail?.title || 'Không tìm thấy trang', section: NAVIGATION.find(item => item.to === detail?.parent) };
}
