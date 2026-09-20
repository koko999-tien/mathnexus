import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return <section className="empty-state not-found"><Compass size={52} /><p className="eyebrow">404 · LẠC MỘT NHỊP THÔI</p><h1>Chưa tìm thấy trang này</h1><p>Có thể đường dẫn đã thay đổi. Một bài học mới vẫn đang chờ bạn.</p><Link to="/" className="button button-dark">Về trang chủ</Link></section>;
}
