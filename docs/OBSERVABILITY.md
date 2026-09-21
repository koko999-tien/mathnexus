# MathNexus Privacy-Safe Observability

Mục tiêu: biết ứng dụng đang lỗi hoặc chậm ở đâu mà không biến telemetry thành nơi lưu dữ liệu học tập của người dùng.

## Dữ liệu được phép gửi

### Client error
- loại sự kiện: `client_error`
- route template, ví dụ `/lesson/:id`, không gửi lesson id hay query string
- nguồn lỗi: window / unhandled rejection / React Error Boundary / storage
- tên lớp lỗi, ví dụ `TypeError`
- tên file bundle và line/column nếu có

### Performance
- route template
- LCP
- CLS
- TTFB
- DOMContentLoaded

## Dữ liệu không được gửi

Không gửi:
- câu hỏi hoặc câu trả lời AI
- nội dung sổ tay
- đáp án luyện tập
- tên hiển thị
- Learning Goal cụ thể
- concept/lesson/formula id từ dynamic URL
- query string
- localStorage/sessionStorage
- nội dung Error.message hoặc stack đầy đủ
- pointer path, camera path hay telemetry hành vi chi tiết

Unknown URL được ghi thành `/:unknown`.

## Pipeline

Browser
→ `POST /api/telemetry`
→ schema whitelist + size/origin/rate guards
→ structured `console.info`
→ Vercel Function logs / Observability

Không có database telemetry riêng trong codebase.

## Bảo vệ endpoint

- POST only
- body tối đa 16 KiB
- browser cross-origin bị từ chối
- warm-instance throttle 120 event/phút/IP
- payload được dựng lại từ whitelist trước khi log
- request có `X-Request-Id`

Warm-instance throttle chỉ là defense-in-depth, không thay thế edge WAF nếu traffic tăng mạnh.

## Client behavior

Telemetry chỉ bật khi:
- Vite production build
- không phải localhost / 127.0.0.1
- không phải GitHub Pages static host

Vì GitHub Pages không có serverless `/api/telemetry`, client không gửi telemetry ở đó.

Performance được gửi tối đa một lần cho initial page load. Lỗi giống hệt nhau trong vòng 5 giây được de-duplicate để tránh log storm.

## Release verification

Sau deploy Vercel:
1. tải trang production và xác nhận một performance event xuất hiện trong Function logs;
2. request log chỉ có route template + numeric metrics;
3. tạo một lỗi kiểm thử có kiểm soát ở preview nếu cần và xác nhận không có Error.message/user content;
4. kiểm tra `X-Request-Id` ở response endpoint;
5. kiểm tra endpoint từ origin khác trả 403;
6. kiểm tra query string không bao giờ xuất hiện trong telemetry log.

## Privacy rule

Nếu một metric mới cần nội dung người dùng để hoạt động, metric đó không được thêm vào pipeline mặc định. Cần một thiết kế/consent riêng trước.
