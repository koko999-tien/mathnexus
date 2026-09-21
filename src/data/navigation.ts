import { LayoutDashboard, BookOpen, Library, Brain, PenTool, ChartSpline, Calculator, Sigma, Sparkles, NotebookPen, ChartNoAxesCombined, Activity, Network, CircleDot } from 'lucide-react';

export const NAVIGATION = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan', group: 'Khám phá' },
  { to: '/library', icon: BookOpen, label: 'Thư viện kiến thức', group: 'Khám phá' },
  { to: '/map', icon: Network, label: 'Bản đồ toán học', group: 'Khám phá' },
  { to: '/cosmos', icon: CircleDot, label: 'Math Cosmos 3D', group: 'Khám phá' },
  { to: '/books', icon: Library, label: 'Tủ sách', group: 'Khám phá' },
  { to: '/practice', icon: PenTool, label: 'Luyện tập', group: 'Khám phá' },
  { to: '/think', icon: Brain, label: 'Phát triển tư duy', group: 'Khám phá' },
  { to: '/graph', icon: ChartSpline, label: 'Đồ thị hàm số', group: 'Công cụ học tập' },
  { to: '/tools', icon: Calculator, label: 'Công cụ toán học', group: 'Công cụ học tập' },
  { to: '/calculus', icon: Activity, label: 'Phòng giải tích', group: 'Công cụ học tập' },
  { to: '/simulations/gravity', icon: CircleDot, label: 'Mô phỏng hấp dẫn', group: 'Công cụ học tập' },
  { to: '/formulas', icon: Sigma, label: 'Công thức', group: 'Công cụ học tập' },
  { to: '/ai', icon: Sparkles, label: 'Trợ lý AI', group: 'Công cụ học tập' },
  { to: '/notebook', icon: NotebookPen, label: 'Sổ tay của tôi', group: 'Cá nhân' },
  { to: '/progress', icon: ChartNoAxesCombined, label: 'Tiến độ học tập', group: 'Cá nhân' },
];
