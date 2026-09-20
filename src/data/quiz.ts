export interface Quiz {
  cat: string;
  q: string;
  a: string[];
  i: number;
  ex: string;
}

export const QUIZ: Quiz[] = [
  { cat:"Đại số", q:"Δ của x²−5x+6 bằng?", a:["1","0","25","−1"], i:0, ex:"25−24=1." },
  { cat:"Hình học", q:"Cạnh huyền tam giác 6 và 8?", a:["9","10","12","14"], i:1, ex:"36+64=100." },
  { cat:"Giải tích", q:"(x³)' bằng?", a:["x²","3x²","3x","x³/3"], i:1, ex:"n x^{n−1}." },
  { cat:"Giải tích", q:"∫ 2x dx?", a:["x²+C","2x²+C","x+C","2+C"], i:0, ex:"Nguyên hàm x²." },
  { cat:"Tổ hợp", q:"C(5,2) bằng?", a:["10","20","5","25"], i:0, ex:"5!/(2!3!)=10." },
  { cat:"Số phức", q:"i² bằng?", a:["1","0","−1","i"], i:2, ex:"Định nghĩa i." },
  { cat:"Số phức", q:"|3+4i| bằng?", a:["5","7","12","25"], i:0, ex:"√(9+16)=5." },
  { cat:"Lượng giác", q:"sin²x+cos²x bằng?", a:["0","x","1","2"], i:2, ex:"Hệ thức cơ bản." },
  { cat:"Đại số", q:"log₂8 bằng?", a:["2","3","4","8"], i:1, ex:"2³=8." },
  { cat:"Xác suất", q:"Tung 2 đồng xu, ít nhất 1 mặt ngửa?", a:["1/4","1/2","3/4","1"], i:2, ex:"1−1/4=3/4." },
  { cat:"Hình học", q:"Diện tích hình tròn bán kính 3?", a:["6π","9π","3π","12π"], i:1, ex:"πr²=9π." },
  { cat:"Giải tích", q:"(sin x)' bằng?", a:["cos x","−cos x","sin x","−sin x"], i:0, ex:"Đạo hàm sin." },
  { cat:"Tổ hợp", q:"5! bằng?", a:["25","60","120","720"], i:2, ex:"5·4·3·2·1=120." },
  { cat:"Đại số", q:"Phương trình |x−3|=5 có bao nhiêu nghiệm?", a:["0","1","2","3"], i:2, ex:"x=8 hoặc x=−2." },
  { cat:"Lý thuyết số", q:"17 nguyên tố?", a:["Đúng","Sai"], i:0, ex:"Chỉ chia hết cho 1 và 17." },
  { cat:"Giải tích", q:"∫₀¹ x dx?", a:["1/2","1","0","2"], i:0, ex:"x²/2 từ 0 đến 1." },
];
