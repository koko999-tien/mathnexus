export type QuizDifficulty = 'Cơ bản' | 'Vừa' | 'Khó';

export interface Quiz {
  id: string;
  cat: string;
  difficulty: QuizDifficulty;
  q: string;
  a: string[];
  i: number;
  ex: string;
}

export const QUIZ: Quiz[] = [
  { id:"alg-discriminant", cat:"Đại số", difficulty:"Cơ bản", q:"Δ của x²−5x+6 bằng?", a:["1","0","25","−1"], i:0, ex:"Δ=b²−4ac=25−24=1." },
  { id:"geom-pythagoras-6-8", cat:"Hình học", difficulty:"Cơ bản", q:"Cạnh huyền tam giác vuông có hai cạnh góc vuông 6 và 8?", a:["9","10","12","14"], i:1, ex:"c=√(6²+8²)=√100=10." },
  { id:"calc-power-derivative", cat:"Giải tích", difficulty:"Cơ bản", q:"(x³)' bằng?", a:["x²","3x²","3x","x³/3"], i:1, ex:"Dùng (xⁿ)'=nxⁿ⁻¹ nên (x³)'=3x²." },
  { id:"calc-antiderivative-2x", cat:"Giải tích", difficulty:"Cơ bản", q:"∫ 2x dx bằng?", a:["x²+C","2x²+C","x+C","2+C"], i:0, ex:"Vì (x²)'=2x nên nguyên hàm là x²+C." },
  { id:"comb-5-2", cat:"Tổ hợp", difficulty:"Cơ bản", q:"C(5,2) bằng?", a:["10","20","5","25"], i:0, ex:"C(5,2)=5!/(2!3!)=10." },
  { id:"complex-i-square", cat:"Số phức", difficulty:"Cơ bản", q:"i² bằng?", a:["1","0","−1","i"], i:2, ex:"Theo định nghĩa đơn vị ảo, i²=−1." },
  { id:"complex-modulus-3-4", cat:"Số phức", difficulty:"Cơ bản", q:"|3+4i| bằng?", a:["5","7","12","25"], i:0, ex:"|3+4i|=√(3²+4²)=5." },
  { id:"trig-identity", cat:"Lượng giác", difficulty:"Cơ bản", q:"sin²x+cos²x bằng?", a:["0","x","1","2"], i:2, ex:"Đây là hệ thức lượng giác cơ bản: sin²x+cos²x=1." },
  { id:"alg-log-2-8", cat:"Đại số", difficulty:"Cơ bản", q:"log₂8 bằng?", a:["2","3","4","8"], i:1, ex:"Vì 2³=8 nên log₂8=3." },
  { id:"prob-two-coins", cat:"Xác suất", difficulty:"Vừa", q:"Tung 2 đồng xu cân đối, xác suất có ít nhất 1 mặt ngửa?", a:["1/4","1/2","3/4","1"], i:2, ex:"Dùng biến cố đối: 1−P(cả hai sấp)=1−1/4=3/4." },
  { id:"geom-circle-area-r3", cat:"Hình học", difficulty:"Cơ bản", q:"Diện tích hình tròn bán kính 3?", a:["6π","9π","3π","12π"], i:1, ex:"S=πr²=π·3²=9π." },
  { id:"calc-sin-derivative", cat:"Giải tích", difficulty:"Vừa", q:"(sin x)' bằng?", a:["cos x","−cos x","sin x","−sin x"], i:0, ex:"Đạo hàm của sin x là cos x." },
  { id:"comb-factorial-5", cat:"Tổ hợp", difficulty:"Cơ bản", q:"5! bằng?", a:["25","60","120","720"], i:2, ex:"5!=5·4·3·2·1=120." },
  { id:"alg-absolute-equation-count", cat:"Đại số", difficulty:"Vừa", q:"Phương trình |x−3|=5 có bao nhiêu nghiệm?", a:["0","1","2","3"], i:2, ex:"x−3=5 hoặc x−3=−5 nên x=8 hoặc x=−2." },
  { id:"number-prime-17", cat:"Lý thuyết số", difficulty:"Cơ bản", q:"17 có phải số nguyên tố không?", a:["Đúng","Sai"], i:0, ex:"17 chỉ có hai ước dương là 1 và 17." },
  { id:"calc-definite-integral", cat:"Giải tích", difficulty:"Vừa", q:"∫₀¹ x dx bằng?", a:["1/2","1","0","2"], i:0, ex:"Nguyên hàm là x²/2. Thế cận cho kết quả 1/2." },
  { id:"linear-matrix-det", cat:"Đại số tuyến tính", difficulty:"Vừa", q:"det([[2,1],[3,4]]) bằng?", a:["5","8","11","−5"], i:0, ex:"Định thức 2×2 là ad−bc=2·4−1·3=5." },
  { id:"stats-mean", cat:"Thống kê", difficulty:"Cơ bản", q:"Trung bình của 2, 4, 6, 8 bằng?", a:["4","5","6","20"], i:1, ex:"(2+4+6+8)/4=20/4=5." },
  { id:"ineq-amgm", cat:"Bất đẳng thức", difficulty:"Vừa", q:"Với x,y≥0 và x+y=10, giá trị lớn nhất của xy là?", a:["10","20","25","100"], i:2, ex:"AM–GM: √(xy)≤(x+y)/2=5 nên xy≤25, dấu bằng khi x=y=5." },
  { id:"prob-bayes-screening", cat:"Xác suất", difficulty:"Khó", q:"Một bệnh có tỷ lệ 1%. Test dương tính đúng 99% khi có bệnh và dương giả 5%. P(bệnh | dương tính) gần nhất?", a:["1%","16,7%","50%","95%"], i:1, ex:"Bayes: 0,99·0,01 /(0,99·0,01+0,05·0,99)≈0,167." },
  { id:"calc-chain-rule", cat:"Giải tích", difficulty:"Vừa", q:"Đạo hàm của (3x+1)² là?", a:["6x+2","6(3x+1)","2(3x+1)","9x²+1"], i:1, ex:"Quy tắc hàm hợp: 2(3x+1)·3=6(3x+1)." },
  { id:"number-congruence", cat:"Lý thuyết số", difficulty:"Vừa", q:"23 đồng dư với số nào modulo 5?", a:["1","2","3","4"], i:2, ex:"23 chia 5 dư 3 nên 23≡3 (mod 5)." },
  { id:"trig-radian", cat:"Lượng giác", difficulty:"Vừa", q:"180° bằng bao nhiêu radian?", a:["π/2","π","2π","180π"], i:1, ex:"180°=π radian." },
  { id:"complex-multiply", cat:"Số phức", difficulty:"Khó", q:"(1+i)(1−i) bằng?", a:["0","1","2","2i"], i:2, ex:"(1+i)(1−i)=1−i²=2." },
];
