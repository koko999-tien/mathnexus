# Gemini API Production Firewall Checklist

Mục đích: bảo vệ endpoint tốn quota `POST /api/gemini` trước abuse ở lớp edge, trước khi request chạy vào Vercel Function.

## Lớp bảo vệ trong code

`api/gemini.js` đã có:
- chỉ nhận `POST`;
- giới hạn request body 128 KiB;
- từ chối browser request có `Origin` khác host hiện tại;
- giới hạn message/context/history;
- timeout + request budget + model fallback;
- request correlation qua `X-Request-Id`;
- throttle best-effort 20 request/phút/IP trên từng warm function instance.

Throttle trong memory **không phải rate limit phân tán đáng tin cậy** vì serverless có nhiều instance và instance có thể bị tái tạo. Nó chỉ là lớp giảm tải thứ hai.

## Firewall cần bật khi release production

Vercel WAF nên là rate limiter chính cho endpoint này.

Đề xuất ban đầu:
- path: chính xác `/api/gemini`
- method: `POST`
- key: IP
- threshold: 20 request / 60 giây
- action: rate limit → HTTP 429
- các API khác không dùng chung bucket này

Có thể tạo bằng Dashboard hoặc Vercel CLI hiện hành. Trước khi publish, kiểm tra plan/cost hiện tại của project và chạy rule ở chế độ quan sát nếu môi trường hỗ trợ.

## Verify sau khi publish rule

1. Một request bình thường tới `POST /api/gemini` không bị 403/429.
2. Browser frontend cùng origin vẫn gọi được.
3. Request browser từ origin khác bị code-level 403.
4. Gửi liên tiếp quá threshold từ cùng IP phải xuất hiện 429 ở edge.
5. Sau cửa sổ rate limit, request hợp lệ hoạt động lại.
6. Kiểm tra log theo `X-Request-Id` khi điều tra lỗi upstream.

## Rollback

Nếu rule chặn nhầm người dùng thật:
1. rollback/pause rule ở Vercel Firewall;
2. giữ code-level request guards;
3. xem lại threshold và điều kiện path/method trước khi publish lại.

Không nới giới hạn bằng cách đưa Gemini API key xuống frontend.
