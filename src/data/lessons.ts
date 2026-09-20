export interface Lesson {
  id: string;
  lv: string;
  cat: string;
  icon: string;
  sym: string;
  t: string;
  m: string;
  txt: string;
}

export const LESSONS: Lesson[] = [
  { id:"frac", lv:"THCS", cat:"Đại số", icon:"algebra", sym:"ƒ", t:"Phân số", m:"8 phút", txt:`<p>Phân số a/b là a phần của đơn vị chia thành b phần bằng nhau (b≠0).</p><p><b>Để làm gì?</b> So sánh phần, tỷ lệ, xác suất sơ cấp.</p><p><b>Ví dụ:</b> 3/4 + 1/2 = 5/4.</p>` },
  { id:"quad", lv:"THPT", cat:"Đại số", icon:"algebra", sym:"ƒ", t:"Phương trình bậc hai", m:"12 phút", txt:`<p>ax²+bx+c=0 (a≠0). Biệt thức Δ=b²−4ac quyết định số nghiệm thực.</p><p><b>Tư duy:</b> Δ đo việc parabol cắt trục Ox, không chỉ "công thức nhớ".</p>` },
  { id:"pyth", lv:"THCS", cat:"Hình học", icon:"geometry", sym:"△", t:"Định lý Pythagoras", m:"10 phút", txt:`<p>Tam giác vuông: a²+b²=c² với c là cạnh huyền.</p><p><b>Ứng dụng:</b> khoảng cách, vector, GPS, đồ họa.</p>` },
  { id:"trig", lv:"THPT", cat:"Lượng giác", icon:"geometry", sym:"∠", t:"Đường tròn lượng giác", m:"14 phút", txt:`<p>sin, cos, tan gắn với điểm trên đường tròn đơn vị. Góc tính bằng radian khi làm giải tích.</p><p><b>Hệ thức:</b> sin²x+cos²x=1. Dời pha và chu kỳ 2π.</p>` },
  { id:"log", lv:"THPT", cat:"Đại số", icon:"algebra", sym:"ƒ", t:"Hàm mũ và logarit", m:"14 phút", txt:`<p>log_b a là số mũ cần để b mũ lên ra a. log và mũ là hai phép ngược.</p><p><b>Ứng dụng:</b> pH, Richter, lãi kép, bán rã.</p>` },
  { id:"seq", lv:"THPT", cat:"Đại số", icon:"algebra", sym:"…", t:"Cấp số cộng và nhân", m:"12 phút", txt:`<p>Cấp số cộng: u_{n+1}=u_n+d. Cấp số nhân: u_{n+1}=u_n·q.</p><p><b>Tổng:</b> CSC: n(u1+un)/2. CSN (q≠1): u1(q^n−1)/(q−1).</p>` },
  { id:"binom", lv:"THPT", cat:"Tổ hợp", icon:"algebra", sym:"C", t:"Nhị thức Newton", m:"12 phút", txt:`<p>(x+y)^n = Σ C(n,k) x^{n−k} y^k. C(n,k)=n!/(k!(n−k)!).</p><p><b>Ý nghĩa:</b> hệ số là số cách chọn k phần tử từ n.</p>` },
  { id:"comb", lv:"THPT", cat:"Tổ hợp", icon:"logic", sym:"C", t:"Chỉnh hợp, tổ hợp, hoán vị", m:"12 phút", txt:`<p>P(n,k)=n!/(n−k)! — sắp thứ tự. C(n,k) — không thứ tự. n! — hoán vị.</p><p><b>Lỗi thường gặp:</b> nhầm "có thứ tự" với "không thứ tự".</p>` },
  { id:"lim", lv:"THPT", cat:"Giải tích", icon:"analysis", sym:"∫", t:"Giới hạn", m:"14 phút", txt:`<p>lim x→a f(x)=L nghĩa là f tiến sát L khi x tiến sát a, không bắt buộc f(a)=L.</p><p><b>Để làm gì?</b> Đạo hàm, tiệm cận, liên tục.</p>` },
  { id:"der", lv:"THPT", cat:"Giải tích", icon:"analysis", sym:"∫", t:"Đạo hàm", m:"15 phút", txt:`<p>f'(x)=lim h→0 [f(x+h)−f(x)]/h — tốc độ thay đổi tức thời.</p><p><b>Để làm gì?</b> Tiếp tuyến, cực trị, tối ưu.</p>` },
  { id:"intg", lv:"THPT", cat:"Giải tích", icon:"analysis", sym:"∫", t:"Tích phân", m:"15 phút", txt:`<p>Tích phân xác định là diện tích có dấu. Nguyên hàm F'=f.</p><p><b>Ứng dụng:</b> diện tích, công, xác suất liên tục.</p>` },
  { id:"vec", lv:"THPT", cat:"Hình học", icon:"geometry", sym:"→", t:"Vectơ", m:"12 phút", txt:`<p>Vectơ có hướng và độ lớn. Cộng theo hình bình hành; tích vô hướng a·b=|a||b|cosθ.</p><p><b>Ứng dụng:</b> lực, vận tốc, hình học tọa độ.</p>` },
  { id:"prob", lv:"THPT", cat:"Xác suất", icon:"logic", sym:"P", t:"Xác suất cổ điển", m:"12 phút", txt:`<p>P(A)=|A|/|Ω| khi các kết quả đồng khả năng. 0≤P≤1, P(Ω)=1.</p><p><b>Công thức:</b> P(A∪B)=P(A)+P(B)−P(A∩B).</p>` },
  { id:"stat", lv:"THPT", cat:"Thống kê", icon:"analysis", sym:"μ", t:"Trung bình, phương sai", m:"12 phút", txt:`<p>Trung bình mô tả tâm. Phương sai/độ lệch chuẩn mô tả độ phân tán.</p><p><b>Ý nghĩa:</b> hai mẫu cùng trung bình có thể khác hẳn về độ lệch.</p>` },
  { id:"amgm", lv:"THPT", cat:"Bất đẳng thức", icon:"algebra", sym:"≥", t:"Bất đẳng thức AM–GM", m:"10 phút", txt:`<p>Với số thực dương, trung bình cộng ≥ trung bình nhân. Dấu bằng khi các số bằng nhau.</p><p><b>Dùng:</b> cực tiểu tích khi tổng cố định.</p>` },
  { id:"proof", lv:"Tư duy", cat:"Logic", icon:"logic", sym:"∴", t:"Chứng minh là gì", m:"10 phút", txt:`<p>Chứng minh: chuỗi suy luận từ giả thiết đến kết luận. Phản ví dụ đủ để bác bỏ mệnh đề "mọi".</p>` },
  { id:"set", lv:"ĐH", cat:"Cơ sở", icon:"logic", sym:"∈", t:"Tập hợp và ánh xạ", m:"14 phút", txt:`<p>Tập hợp, phần tử, hàm như quy tắc gán. Đây là ngôn ngữ của toán hiện đại.</p>` },
  { id:"cplx", lv:"ĐH", cat:"Số phức", icon:"algebra", sym:"ℂ", t:"Số phức", m:"16 phút", txt:`<p>z=a+bi, i²=−1. Mặt phẳng phức: modulus |z|, argument arg z.</p><p><b>Dạng cực:</b> z=r(cosθ+i sinθ). Công thức Euler: e^{iθ}=cosθ+i sinθ.</p><p><b>Ứng dụng:</b> mạch điện xoay chiều, biến đổi Fourier, hình học quay.</p>` },
  { id:"demoivre", lv:"ĐH", cat:"Số phức", icon:"algebra", sym:"ℂ", t:"Công thức De Moivre", m:"10 phút", txt:`<p>[r(cosθ+i sinθ)]^n = r^n (cos nθ + i sin nθ). Dùng để khai căn và lũy thừa số phức.</p>` },
  { id:"disc", lv:"ĐH", cat:"Toán rời rạc", icon:"logic", sym:"Σ", t:"Toán rời rạc — bản đồ", m:"14 phút", txt:`<p>Toán rời rạc làm việc với đối tượng đếm được: logic, tập, quan hệ, đồ thị, tổ hợp, độ quy.</p><p><b>Để làm gì?</b> Khoa học máy tính, thuật toán, mật mã sơ cấp.</p>` },
  { id:"graphth", lv:"ĐH", cat:"Toán rời rạc", icon:"logic", sym:"Σ", t:"Đồ thị (lý thuyết đồ thị)", m:"14 phút", txt:`<p>Đồ thị G=(V,E): đỉnh và cạnh. Bậc, đường đi, chu trình, liên thông, Euler, Hamilton.</p><p><b>Ứng dụng:</b> mạng, lịch, luồng, định tuyến.</p>` },
  { id:"ntheory", lv:"ĐH", cat:"Lý thuyết số", icon:"algebra", sym:"ℤ", t:"Số nguyên tố và đồng dư", m:"14 phút", txt:`<p>p nguyên tố khi chỉ chia hết cho 1 và p. Đồng dư a≡b (mod m) khi m | (a−b).</p><p><b>Định lý:</b> Fermat nhỏ, Euclid (vô hạn nguyên tố), thuật toán Euclid cho UCLN.</p>` },
  { id:"matrix", lv:"ĐH", cat:"Đại số tuyến tính", icon:"algebra", sym:"A", t:"Ma trận và hệ phương trình", m:"16 phút", txt:`<p>Ma trận mã hóa biến đổi tuyến tính. Giải Ax=b bằng khử Gauss. det A≠0 ⇔ khả nghịch ⇔ nghiệm duy nhất.</p><p><b>Ứng dụng:</b> đồ họa 3D, mạng, thống kê đa biến.</p>` },
  { id:"eigen", lv:"ĐH", cat:"Đại số tuyến tính", icon:"algebra", sym:"λ", t:"Trị riêng và vectơ riêng", m:"14 phút", txt:`<p>Av=λv, v≠0. λ là hệ số giãn trên phương v. Chéo hóa giúp lũy thừa ma trận.</p><p><b>Ứng dụng:</b> PCA, ổn định hệ động lực, PageRank.</p>` },
  { id:"de", lv:"ĐH", cat:"Phương trình vi phân", icon:"analysis", sym:"∫", t:"PTVP cấp một", m:"14 phút", txt:`<p>y'=ky có nghiệm y=Ce^{kx}. Tách biến, hệ số bất định, nhân tử tích phân.</p><p><b>Mô hình:</b> tăng trưởng, phóng xạ, mạch RC, dịch tễ SIR sơ cấp.</p>` },
  { id:"series", lv:"ĐH", cat:"Giải tích", icon:"analysis", sym:"Σ", t:"Chuỗi số và chuỗi Taylor", m:"16 phút", txt:`<p>Chuỗi Σa_n hội tụ khi tổng riêng tiến tới hữu hạn. Taylor khai triển hàm quanh một điểm.</p><p><b>Ví dụ:</b> e^x = Σ x^n/n!.</p>` },
  { id:"bayes", lv:"ĐH", cat:"Xác suất", icon:"logic", sym:"P", t:"Công thức Bayes", m:"12 phút", txt:`<p>P(H|D)=P(D|H)P(H)/P(D). Cập nhật niềm tin khi có dữ liệu.</p><p><b>Ứng dụng:</b> y học chẩn đoán, lọc thư rác, học máy.</p>` },
  { id:"finance", lv:"THPT", cat:"Toán ứng dụng", icon:"algebra", sym:"%", t:"Lãi suất và giá trị hiện tại", m:"10 phút", txt:`<p>Lãi kép: A=P(1+r)^n. Giá trị hiện tại chiết khấu dòng tiền tương lai.</p>` },
];
