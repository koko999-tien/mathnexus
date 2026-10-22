import { Link } from 'react-router-dom';
import { PageMeta } from '../components/seo/PageMeta';

export default function Privacy() {
  return (
    <section className="legal-page">
      <PageMeta
        title="Quyền riêng tư · MathNexus"
        description="Cách MathNexus lưu dữ liệu học tập trên trình duyệt, xử lý yêu cầu AI, tra cứu tài liệu và đo lường ẩn danh."
        path="/privacy"
      />
      <p className="eyebrow">QUYỀN RIÊNG TƯ</p>
      <h1>Dữ liệu học tập của bạn</h1>
      <p className="legal-lead">MathNexus được thiết kế local-first: dữ liệu học tập chính nằm trên trình duyệt của bạn. Chúng tôi không yêu cầu tài khoản và không bán dữ liệu cá nhân.</p>
      <p className="helper-text">Cập nhật lần cuối: 22/10/2026</p>

      <h2>1. Dữ liệu được lưu trên thiết bị</h2>
      <p>Tiến độ bài học, câu trả luyện tập, mục tiêu học, ghi chú, Math Canvas, lịch sử công cụ, sách đang đọc và kệ nghiên cứu được lưu trong <code>localStorage</code> của trình duyệt. Những dữ liệu này không tự động gửi lên máy chủ MathNexus.</p>
      <p>Bạn có thể tải bản sao lưu, khôi phục hoặc đặt lại dữ liệu trong trang <Link to="/progress">Tiến độ học tập</Link>. Xóa dữ liệu trang web trong trình duyệt cũng xóa toàn bộ dữ liệu local.</p>

      <h2>2. Khi bạn dùng trợ lý AI</h2>
      <p>Câu hỏi, ngữ cảnh học tập có giới hạn và tệp ảnh bạn chủ động gửi được chuyển tới máy chủ MathNexus, sau đó tới Google Gemini để tạo câu trả lời. MathNexus không lưu nội dung cuộc trò chuyện vào cơ sở dữ liệu của ứng dụng. Google có thể xử lý và lưu log theo chính sách của Google.</p>
      <p>Không gửi thông tin nhạy cảm, dữ liệu cá nhân hoặc tài liệu mật vào ô chat. Câu trả lời do AI tạo có thể sai; hãy kiểm tra lại với nguồn và giáo viên.</p>

      <h2>3. Tra cứu thư viện và tài liệu</h2>
      <p>Khi tìm bài viết, sách hoặc công trình, MathNexus gửi truy vấn tới các dịch vụ bên thứ ba như Wikipedia, Open Library, Internet Archive, arXiv, OpenAlex, Crossref, Semantic Scholar và nguồn RSS công khai. Các dịch vụ này nhận truy vấn và có thể ghi log theo chính sách riêng của họ.</p>

      <h2>4. Đo lường và cookie</h2>
      <p>Trên bản production, MathNexus dùng Vercel Web Analytics và Speed Insights để đo lượt xem và hiệu năng. Dữ liệu này được thiết kế để không chứa nội dung học tập, địa chỉ email hay query string; chỉ tên route và chỉ số kỹ thuật. MathNexus không dùng cookie quảng cáo và không có mạng quảng cáo.</p>

      <h2>5. Lưu trữ và kiểm soát</h2>
      <p>Dữ liệu local tồn tại cho tới khi bạn xóa hoặc trình duyệt xóa. Bản sao lưu do bạn tự giữ. Nếu bạn gửi phản hồi qua GitHub, nội dung phản hồi công khai theo nền tảng GitHub; không đính kèm dữ liệu học tập riêng tư.</p>

      <h2>6. Thay đổi chính sách</h2>
      <p>Khi cách xử lý dữ liệu thay đổi đáng kể, trang này sẽ được cập nhật và ghi ngày mới. Tiếp tục dùng MathNexus sau thay đổi nghĩa là bạn chấp nhận chính sách đã cập nhật.</p>
      <p>Xem thêm <Link to="/terms">Điều khoản sử dụng</Link>.</p>
    </section>
  );
}
