export interface Book {
  id: string;
  lv: string;
  t: string;
  why: string;
  ideas: string;
}

export const BOOKS: Book[] = [
  { id:"polya", lv:"Tư duy", t:"How to Solve It — G. Pólya", why:"Bốn bước: hiểu bài, lập kế hoạch, thực hiện, nhìn lại.", ideas:"Biến bài lạ thành bài đã biết." },
  { id:"velleman", lv:"Tư duy", t:"How to Prove It — D. Velleman", why:"Vào chứng minh: logic, lượng từ, quy nạp.", ideas:"Viết giả thiết–kết luận trước khi viết chứng minh." },
  { id:"euclid", lv:"Hình học", t:"Cơ sở — Euclid (tuyển)", why:"Toán xây từ tiên đề, không từ nhớ hình.", ideas:"Định nghĩa → tiên đề → mệnh đề." },
  { id:"thcs", lv:"THCS", t:"Toán 8–9 (hình + đại số)", why:"Nền Pythagoras, phương trình, y=ax+b.", ideas:"Vẽ hình trước khi tính." },
  { id:"thpt", lv:"THPT", t:"Giải tích 12 + Đại số 10", why:"Đạo hàm, mũ log, lượng giác.", ideas:"Mỗi công thức gắn một đồ thị." },
  { id:"aops", lv:"THPT", t:"Art of Problem Solving — Introduction", why:"Tổ hợp và bất đẳng thức theo kiểu giải bài.", ideas:"Đếm hai cách; bất đẳng thức từ bình phương." },
  { id:"hardy", lv:"ĐH", t:"A Mathematician's Apology — Hardy", why:"Vẻ đẹp toán, không chỉ thi.", ideas:"Toán thuần túy như nghệ thuật." },
  { id:"courant", lv:"ĐH", t:"What is Mathematics? — Courant & Robbins", why:"Toàn cảnh: số, hình, giải tích, ý tưởng.", ideas:"Đọc chậm từng chương, làm bài trong sách." },
  { id:"axler", lv:"ĐH", t:"Linear Algebra Done Right — Axler", why:"Không vội định thức; hiểu ánh xạ tuyến tính.", ideas:"Không gian vector trước ma trận." },
  { id:"needham", lv:"ĐH", t:"Visual Complex Analysis — Needham", why:"Số phức bằng hình: quay và co giãn.", ideas:"Nhân i là quay 90°." },
  { id:"rosen", lv:"ĐH", t:"Discrete Mathematics — K. Rosen", why:"Giáo trình rời rạc: logic, đồ thị, tổ hợp.", ideas:"Làm bài chứng minh ngắn mỗi ngày." },
  { id:"concrete", lv:"ĐH", t:"Concrete Mathematics — Graham, Knuth, Patashnik", why:"Tổng, hệ thức truy hồi, hàm sinh.", ideas:"Ký hiệu rõ; kiểm tra bằng số nhỏ." },
  { id:"proofsbook", lv:"ĐH", t:"Proofs from THE BOOK — Aigner & Ziegler", why:"Chứng minh đẹp: vô hạn nguyên tố, hội tụ…", ideas:"Một chứng minh tinh, không nhiều trang." },
  { id:"feynman", lv:"Đa ngành", t:"The Character of Physical Law — Feynman", why:"Toán như ngôn ngữ tự nhiên.", ideas:"Đối xứng, bảo toàn, cực trị." },
  { id:"tao", lv:"ĐH", t:"Analysis I — Terence Tao", why:"Giải tích từ số thực, ε–δ có kiểm soát.", ideas:"Đọc định nghĩa hai lần trước ví dụ." },
];
