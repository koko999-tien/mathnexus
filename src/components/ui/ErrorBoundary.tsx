import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { reportReactError } from '../../utils/observability';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    reportReactError(error);
    console.error('MathNexus:', error, info);
  }
  render() {
    if (this.state.failed) return <div className="empty-state"><h1>Trang chưa tải được</h1><p>Hãy tải lại để tiếp tục. Bài học và ghi chú đã lưu vẫn ở trên trình duyệt.</p><button className="button button-dark" onClick={() => window.location.reload()}>Tải lại trang</button></div>;
    return this.props.children;
  }
}
