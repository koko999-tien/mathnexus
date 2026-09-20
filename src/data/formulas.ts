export interface Formula {
  id: string;
  cat: string;
  q: string[];
  name: string;
  expr: string;
  what: string;
  why: string;
  use: string;
  ex: string;
}

export const FORMS: Formula[] = [
  { id:"delta", cat:"Đại số", q:["bậc hai","delta","nghiệm"], name:"Nghiệm phương trình bậc hai", expr:"x = (-b \\pm \\sqrt{\\Delta}) / (2a), \\quad \\Delta = b^2 - 4ac", what:"Nghiệm của ax²+bx+c=0 khi a≠0.", why:"Biết parabol cắt Ox bao nhiêu lần.", use:"Quỹ đạo, tối ưu bậc hai, hình học tọa độ.", ex:"x²−5x+6=0 → Δ=1 → x=2 hoặc 3." },
  { id:"py", cat:"Hình học", q:["pythagoras","huyền"], name:"Định lý Pythagoras", expr:"a^2 + b^2 = c^2", what:"Hệ thức ba cạnh tam giác vuông.", why:"Tính cạnh, kiểm tra vuông.", use:"Xây dựng, GPS, đồ họa.", ex:"3-4-5: 9+16=25." },
  { id:"cos", cat:"Hình học", q:["cosine","cosin"], name:"Định lý cosine", expr:"c^2 = a^2 + b^2 - 2ab \\cos C", what:"Pythagoras cho mọi tam giác.", why:"Hai cạnh và góc xen → cạnh thứ ba.", use:"Trắc địa, lực hợp.", ex:"C=90° thì cosC=0, về Pythagoras." },
  { id:"sina", cat:"Lượng giác", q:["sin","cộng góc"], name:"sin(a+b)", expr:"\\sin(a+b) = \\sin a \\cos b + \\cos a \\sin b", what:"Khai triển sin tổng hai góc.", why:"Hạ bậc, phương trình lượng giác.", use:"Sóng, pha, điều hòa.", ex:"sin(π/2+x)=cos x." },
  { id:"loglaw", cat:"Đại số", q:["log","logarit"], name:"Phép tính logarit", expr:"\\log(xy)=\\log x+\\log y, \\quad \\log(x^k)=k \\log x", what:"Log đưa tích thành tổng.", why:"Giải mũ, tuyến tính hóa.", use:"pH, decibel, lãi kép.", ex:"log 100=2 (cơ số 10)." },
  { id:"ncr", cat:"Tổ hợp", q:["tổ hợp","nck","chỉnh hợp"], name:"Tổ hợp", expr:"C(n,k) = \\frac{n!}{k!(n-k)!}", what:"Số tập con k phần tử từ n.", why:"Đếm không kể thứ tự.", use:"Xác suất, nhị thức, thiết kế thí nghiệm.", ex:"C(5,2)=10." },
  { id:"derp", cat:"Giải tích", q:["đạo hàm","lũy thừa"], name:"Đạo hàm lũy thừa", expr:"(x^n)' = n x^{n-1}", what:"Tốc độ thay đổi hàm lũy thừa.", why:"Tiếp tuyến, cực trị đa thức.", use:"Vận tốc–gia tốc.", ex:"(x³)'=3x²." },
  { id:"chain", cat:"Giải tích", q:["hàm hợp","chain"], name:"Quy tắc hàm hợp", expr:"(f(g(x)))' = f'(g(x)) \\cdot g'(x)", what:"Đạo hàm hàm lồng nhau.", why:"Hầu hết hàm thực tế là hàm hợp.", use:"e^{kx}, sin(ωt).", ex:"(sin x²)'=2x cos x²." },
  { id:"intp", cat:"Giải tích", q:["tích phân","nguyên hàm"], name:"Nguyên hàm lũy thừa", expr:"\\int x^n \\, dx = \\frac{x^{n+1}}{n+1}+C \\quad (n \\neq -1)", what:"Phép ngược đạo hàm lũy thừa.", why:"Diện tích, tổng liên tục.", use:"Công, xác suất mật độ.", ex:"∫x² dx = x³/3+C." },
  { id:"parts", cat:"Giải tích", q:["từng phần","parts"], name:"Tích phân từng phần", expr:"\\int u \\, dv = uv - \\int v \\, du", what:"Đổi tích phân khi có tích hai hàm.", why:"∫ x e^x, ∫ ln x.", use:"Vật lý, xác suất (kỳ vọng).", ex:"∫ x e^x dx = e^x(x−1)+C." },
  { id:"exp", cat:"Giải tích", q:["e","mũ"], name:"Đạo hàm hàm mũ tự nhiên", expr:"(e^x)' = e^x", what:"Hàm trùng đạo hàm của chính nó.", why:"Tăng trưởng, phóng xạ.", use:"PTVP, tài chính.", ex:"y'=ky ⇒ y=Ce^{kx}." },
  { id:"euler", cat:"Số phức", q:["euler","e^{i}","số phức"], name:"Công thức Euler", expr:"e^{i\\theta} = \\cos \\theta + i \\sin \\theta", what:"Nối mũ phức với lượng giác.", why:"Quay trên mặt phẳng phức.", use:"Fourier, mạch AC.", ex:"e^{iπ}+1=0." },
  { id:"deMoivre", cat:"Số phức", q:["de moivre","căn phức"], name:"De Moivre", expr:"[r(\\cos\\theta+i\\sin\\theta)]^n = r^n(\\cos n\\theta+i\\sin n\\theta)", what:"Lũy thừa dạng cực.", why:"Khai căn n của số phức.", use:"Đa thức, tín hiệu.", ex:"i = cis(π/2) ⇒ i²=cis π=−1." },
  { id:"det2", cat:"Đại số tuyến tính", q:["định thức","det","ma trận"], name:"Định thức 2×2", expr:"\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad-bc", what:"Độ co giãn có hướng của biến đổi.", why:"Khả nghịch khi det≠0.", use:"Diện tích song song lực, Cramer.", ex:"[[1,2],[3,4]] → −2." },
  { id:"mod", cat:"Lý thuyết số", q:["mod","đồng dư","chia"], name:"Đồng dư", expr:"a \\equiv b \\pmod{m} \\Leftrightarrow m \\mid (a-b)", what:"Hai số cùng dư khi chia m.", why:"Lịch, mật mã, checksum.", use:"RSA sơ cấp, ISBN.", ex:"17≡2 (mod 5)." },
  { id:"indep", cat:"Xác suất", q:["độc lập","xác suất"], name:"Xác suất độc lập", expr:"P(A \\cap B) = P(A) \\cdot P(B)", what:"Hai biến cố không ảnh hưởng nhau.", why:"Tính đồng thời.", use:"Tung đồng xu, kiểm thử.", ex:"Hai mặt ngửa: 1/4." },
  { id:"bayesf", cat:"Xác suất", q:["bayes","hậu nghiệm"], name:"Bayes", expr:"P(H|D) = \\frac{P(D|H) \\cdot P(H)}{P(D)}", what:"Cập nhật xác suất giả thuyết.", why:"Suy diễn khi có bằng chứng.", use:"Chẩn đoán, spam.", ex:"False positive làm P(bệnh|dương tính) thấp nếu bệnh hiếm." },
  { id:"amgmf", cat:"Bất đẳng thức", q:["am-gm","trung bình"], name:"AM–GM", expr:"\\frac{x_1+\\cdots+x_n}{n} \\geq (x_1 \\cdots x_n)^{1/n}", what:"Trung bình cộng ≥ trung bình nhân (số dương).", why:"Cực trị có ràng buộc tích/tổng.", use:"Tối ưu sơ cấp, bất đẳng thức thi.", ex:"x+y≥2√(xy)." },
  { id:"geo", cat:"Đại số", q:["cấp số nhân","tổng vô hạn"], name:"Tổng cấp số nhân vô hạn", expr:"\\sum_{k=0}^{\\infty} ar^k = \\frac{a}{1-r} \\quad (|r|<1)", what:"Tổng vô hạn hội tụ khi |công bội|<1.", why:"Chuỗi, lãi, fractal.", use:"Kinh tế chiết khấu, xác suất hình học.", ex:"1+1/2+1/4+…=2." },
];
