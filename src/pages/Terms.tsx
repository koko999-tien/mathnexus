import { Link } from 'react-router-dom';
import { PageMeta } from '../components/seo/PageMeta';

export default function Terms() {
  return (
    <section className="legal-page">
      <PageMeta
        title="Điều khoản sử dụng · MathNexus"
        description="Điều khoản sử dụng MathNexus: mục đích học tập, giới hạn của nội dung AI, sử dụng hợp lý và quyền với dữ liệu của bạn."
        path="/terms"
      />
      <p className="eyebrow">ĐIỀU KHOẢN</p>
      <h1>Điều khoản sử dụng</h1>
      <p className="legal-lead">MathNexus là công cụ hỗ trợ học toán. Bằng việc sử dụng ứng dụng, bạn đồng ý với các điều khoản dưới đây.</p>
      <p className="helper-text">Cập nhật lần cuối: 22/10/2026</p>

      <h2>1. Mục đích học tập</h2>
      <p>Nội dung bài học, công thức, công cụ và gợi ý được cung cấp để hỗ trợ việc học. MathNexus không thay thế giáo viên, chuyên gia, chẩn đoán y khoa, tư vấn tài chính hay quyết định chuyên môn. Hãy kiểm tra kết quả quan trọng bằng nguồn độc lập.</p>

      <h2>2. Nội dung do AI tạo</h2>
      <p>Trợ lý AI có thể hiểu sai đề, bỏ sót điều kiện hoặc tạo ra lời giải không chính xác. Bạn chịu trách nhiệm đánh giá và kiểm chứng câu trả lời trước khi dùng cho bài kiểm tra, công việc hoặc quyết định thực tế. Không dùng AI để thay thế việc hiểu bài.</p>

      <h2>3. Sử dụng hợp lý</h2>
      <p>Không dùng MathNexus để tấn công, dò quét, spam endpoint, vượt giới hạn truy cập, phát tán mã độc, xâm phạm quyền của người khác hoặc gửi nội dung trái pháp luật. Các giới hạn kỹ thuật và rate limit có thể được áp dụng để bảo vệ dịch vụ.</p>

      <h2>4. Tài khoản và dữ liệu</h2>
      <p>MathNexus hiện không cung cấp tài khoản đồng bộ. Dữ liệu học tập được lưu local và bạn tự quản lý bản sao lưu. Bạn chịu trách nhiệm giữ thiết bị và tệp backup an toàn. Xem <Link to="/privacy">Quyền riêng tư</Link> để biết cách dữ liệu được xử lý.</p>

      <h2>5. Nội dung và quyền sở hữu</h2>
      <p>Giao diện, mã nguồn và nội dung do MathNexus biên soạn thuộc quyền của dự án hoặc được sử dụng với giấy phép phù hợp. Tên sách, bài báo và nhãn hiệu của bên thứ ba thuộc chủ sở hữu tương ứng. Bạn được dùng nội dung cho việc học cá nhân; không sao chép thương mại quy mô lớn khi chưa có phép.</p>

      <h2>6. Dịch vụ bên thứ ba</h2>
      <p>Một số tính năng phụ thuộc vào Google Gemini, Vercel, Wikipedia, Open Library, Internet Archive, arXiv và các nguồn khác. Chúng tôi không kiểm soát tính sẵn sàng, độ chính xác hay chính sách của các dịch vụ này. Liên kết ngoài chỉ mang tính tham khảo.</p>

      <h2>7. Giới hạn trách nhiệm</h2>
      <p>Dịch vụ được cung cấp “nguyên trạng” và có thể thay đổi, gián đoạn hoặc ngừng cung cấp. Trong phạm vi pháp luật cho phép, MathNexus không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc dùng nội dung, kết quả tính toán hoặc câu trả lời AI.</p>

      <h2>8. Thay đổi điều khoản</h2>
      <p>Điều khoản có thể được cập nhật khi sản phẩm thay đổi. Ngày cập nhật sẽ được ghi ở đầu trang. Nếu bạn không đồng ý với thay đổi, hãy ngừng sử dụng ứng dụng và xóa dữ liệu local.</p>
    </section>
  );
}
