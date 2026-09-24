import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { reportReactError } from '../../utils/observability';

type ErrorBoundaryProps = { children: ReactNode; fallback?: ReactNode; resetKey?: string };

export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    reportReactError(error);
    console.error('MathNexus:', error, info);
  }
  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }
  render() {
    if (this.state.failed && this.props.fallback) return this.props.fallback;
    if (this.state.failed) return <div className="empty-state" role="alert"><h1>Trang chưa tải được</h1><p>Bạn có thể tải lại hoặc mở một mục khác. Bài học và ghi chú đã lưu vẫn ở trên trình duyệt.</p><div className="recovery-actions"><button className="button button-dark" onClick={() => window.location.reload()}>Tải lại trang</button><Link to="/" className="button button-light">Về trang chủ</Link></div></div>;
    return this.props.children;
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  return <ErrorBoundary resetKey={`${pathname}${search}`}>{children}</ErrorBoundary>;
}
