export interface PageSeo {
  title: string;
  description: string;
  robots?: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
}

export const SITE_URL = 'https://mathnexus-three.vercel.app';
export const SITE_NAME = 'MathNexus';

export const STATIC_PAGE_SEO: Record<string, PageSeo> = {
  '/': {
    title: 'MathNexus · Học toán có lộ trình, luyện tập và tra cứu',
    description: 'Học toán từ nền tảng đến đại học: bài học ngắn, bản đồ tri thức, luyện tập thích ứng, công thức, đồ thị, sổ tay và trợ lý AI.',
  },
  '/library': {
    title: 'Thư viện bài học toán · MathNexus',
    description: 'Bài học toán từ THCS đến đại học, sắp theo chủ đề và trình độ, kèm ví dụ, lỗi thường gặp và liên kết luyện tập.',
  },
  '/map': {
    title: 'Bản đồ tri thức toán học · MathNexus',
    description: 'Khám phá quan hệ tiên quyết giữa các khái niệm toán, tìm lộ trình học phù hợp và mở bài học, công cụ liên quan.',
  },
  '/cosmos': {
    title: 'Bản đồ toán học 3D · MathNexus',
    description: 'Khám phá mạng khái niệm toán học trong không gian 3D: lĩnh vực, tiên quyết, định nghĩa và nội dung liên quan.',
  },
  '/books': {
    title: 'Tủ sách toán học · MathNexus',
    description: 'Danh sách sách toán theo trình độ, kèm lý do nên đọc, ý tưởng chính và liên kết tìm bản đọc mở.',
  },
  '/practice': {
    title: 'Luyện tập toán thích ứng · MathNexus',
    description: 'Luyện câu hỏi toán theo chủ đề và độ khó, ưu tiên nội dung từng làm sai và theo dõi tiến bộ qua từng lượt.',
  },
  '/think': {
    title: 'Phát triển tư duy toán · MathNexus',
    description: 'Bài tập và gợi ý rèn tư duy toán: phân tích đề, phản ví dụ, lập luận và kiểm tra lời giải.',
  },
  '/graph': {
    title: 'Đồ thị hàm số tương tác · MathNexus',
    description: 'Vẽ và khảo sát đồ thị hàm số, thay đổi hệ số, xem nghiệm, cực trị và giao điểm trực quan.',
  },
  '/tools': {
    title: 'Công cụ toán học · MathNexus',
    description: 'Bộ công cụ tính toán, kiểm chứng và phân tích: số học, đại số, giải tích, xác suất và đại số tuyến tính.',
  },
  '/calculus': {
    title: 'Phòng giải tích · MathNexus',
    description: 'Tính đạo hàm, tích phân, giới hạn và khảo sát hàm với lời giải từng bước và kiểm tra trực quan.',
  },
  '/simulations/gravity': {
    title: 'Mô phỏng hấp dẫn N-body · MathNexus',
    description: 'Mô phỏng tương tác hấp dẫn N-body, thay đổi tham số và quan sát quỹ đạo bằng tích phân số.',
  },
  '/formulas': {
    title: 'Công thức toán học · MathNexus',
    description: 'Tra cứu công thức toán kèm ý nghĩa, điều kiện áp dụng, ví dụ và ứng dụng thực tế.',
  },
  '/ai': {
    title: 'Trợ lý học toán AI · MathNexus',
    description: 'Hỏi trợ lý toán bằng tiếng Việt, nhận gợi ý theo kiểu Socratic hoặc lời giải đầy đủ khi cần.',
  },
  '/privacy': {
    title: 'Quyền riêng tư · MathNexus',
    description: 'MathNexus lưu dữ liệu học tập trên trình duyệt, chỉ gửi nội dung cần thiết tới dịch vụ AI và tra cứu khi bạn sử dụng.',
    robots: 'index,follow',
  },
  '/terms': {
    title: 'Điều khoản sử dụng · MathNexus',
    description: 'Điều khoản sử dụng MathNexus: phạm vi học tập, nội dung do AI tạo, giới hạn trách nhiệm và quyền với dữ liệu của bạn.',
    robots: 'index,follow',
  },
  '/notebook': { title: 'Sổ tay toán học · MathNexus', description: 'Sổ tay cá nhân để ghi chú, lưu công thức và gắn ghi chú với bài học.', robots: 'noindex,nofollow' },
  '/canvas': { title: 'Math Canvas · MathNexus', description: 'Không gian ghi chú và công thức trực quan.', robots: 'noindex,nofollow' },
  '/progress': { title: 'Tiến độ học tập · MathNexus', description: 'Theo dõi tiến độ, mục tiêu và dữ liệu học tập được lưu trên thiết bị.', robots: 'noindex,nofollow' },
  '/library/read': { title: 'Đọc bài trên MathNexus', description: 'Chế độ đọc bài viết trong Thư viện.', robots: 'noindex,nofollow' },
  '/library/book': { title: 'Đọc sách mở · MathNexus', description: 'Trình đọc sách mở liên kết với Internet Archive.', robots: 'noindex,nofollow' },
  '/library/book-info': { title: 'Chi tiết sách · MathNexus', description: 'Thông tin sách, ghi chú và liên kết đọc mở.', robots: 'noindex,nofollow' },
};
