export interface ThinkItem {
  t: string;
  q: string;
  h: string;
}

export const THINK: ThinkItem[] = [
  { t:"Bình đong nước", q:"Hai bình 3 lít và 5 lít, không vạch. Làm sao đong đúng 4 lít?", h:"Đầy 5 → sang 3 (còn 2) → đổ 3 → 2 sang 3 → đầy 5 → đổ vào 3 (còn 1 chỗ) → còn 4 trong bình 5." },
  { t:"Chẵn lẻ", q:"Tổng 3 số lẻ liên tiếp có luôn chia hết cho 3?", h:"(2k−1)+(2k+1)+(2k+3)=6k+3=3(2k+1). Luôn chia hết cho 3." },
  { t:"Phản ví dụ", q:"Mọi số nguyên tố đều lẻ. Đúng hay sai?", h:"Sai. 2 là nguyên tố chẵn." },
  { t:"Cầu và đèn", q:"Bốn người cần 1,2,5,10 phút qua cầu; tối đa hai người, phải mang đèn. Tối thiểu bao lâu?", h:"17 phút: 1&2 sang, 1 về, 5&10 sang, 2 về, 1&2 sang." },
  { t:"Đếm những cái bắt tay", q:"Có 10 cái bắt tay trong một phòng. Mỗi cặp người chỉ bắt tay tối đa một lần. Có thể có đúng 3 người không?", h:"Không. Với 3 người, số cặp tối đa là C(3,2)=3, nên chỉ có tối đa 3 cái bắt tay. Để có 10 cái bắt tay cần ít nhất 5 người vì C(5,2)=10." },
  { t:"Mod 9", q:"Tại sao 'tổng chữ số chia hết 9 thì số chia hết 9'?", h:"10≡1 (mod 9) nên 10^k≡1, số ≡ tổng chữ số (mod 9)." },
  { t:"Vô hạn khách sạn", q:"Khách sạn Hilbert đầy. Làm sao nhận thêm 1 khách?", h:"Chuyển phòng n → n+1. Phòng 1 trống. Vô hạn đếm được vẫn 'còn chỗ'." },
  { t:"Xác suất hai con", q:"Một gia đình có hai con, ít nhất một trai. Xác suất cả hai trai?", h:"Không gian {TT,TG,GT} đồng khả năng nếu 'ít nhất một trai' — 1/3, không phải 1/2." },
  { t:"Bất biến", q:"Bàn cờ 8×8 mất hai góc đối. Phủ được bằng quân 1×2 không?", h:"Hai góc cùng màu. Còn 30 đen 32 trắng (hoặc ngược). Mỗi quân phủ 1–1. Không phủ được." },
  { t:"Quy nạp sai", q:"'Mọi ngựa cùng màu' — lỗ hổng ở đâu?", h:"Bước n=1→2: giao hai nhóm rỗng khi n=1. Quy nạp gãy ở bước đầu." },
];
