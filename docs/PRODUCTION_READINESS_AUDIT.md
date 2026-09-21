# MathNexus Production Readiness Audit

Ngày baseline: 2026-09-22  
Phạm vi: `main` sau Learning Goal / Goal Diagnostic / Diagnostic Debrief.  
Mục tiêu: ưu tiên độ đúng, an toàn dữ liệu và khả năng vận hành trước khi tiếp tục mở rộng tính năng.

## Tóm tắt

| Lớp | Trạng thái | Nhận định hiện tại | Việc tiếp theo |
| --- | --- | --- | --- |
| Kiến trúc | Tốt, cần siết | Route đã lazy-load; Knowledge Graph, mastery, exploration, canvas tách module. TypeScript trước baseline chưa bật `strict`. | Bật strict và giữ build gate. |
| Tính đúng | Tốt | Có unit test + E2E đa trình duyệt; Numerical Trust Layer tách visual/standard/high precision. | Tăng test cho dữ liệu nhập/xuất và content math. |
| Dữ liệu | Cần xử lý sớm | Progress có normalize/migration an toàn. Backup hiện chỉ gồm progress + notes, chưa mang Learning Goal, Exploration và Math Canvas. | Backup schema v2 + restore transaction/best-effort rollback. |
| Bảo mật | Khá, còn lỗ vận hành | Gemini key chỉ ở server; message/context có giới hạn; AI text không render HTML; Canvas lọc URL http/https. Vercel trước baseline chưa khai báo security headers. | Headers/CSP; rate-limit API; dependency audit. |
| Hiệu năng | Khá | Route splitting hoạt động. Build gần nhất: entry ~105 KiB gzip; Math Cosmos ~35 KiB gzip; chunk Stars ~241 KiB gzip. PWA precache ~2.2 MiB. | Bundle budget; sau đó xem lại Three/Drei và font payload. |
| UX / mobile | Tốt | E2E desktop Chrome, Android Chrome, iPhone WebKit; có skip link, dialog native, responsive checks. | Thêm automated accessibility audit và reduced-motion coverage rộng hơn. |
| PWA / offline | Tốt | Service worker prompt update, offline state, offline E2E, cache cleanup. | Kiểm tra cache strategy khi dữ liệu/content tăng mạnh. |
| CI / release | Tốt, cần gate rõ | CI chạy lint → unit → build → Playwright. | Dependency audit, bundle budget, timeout/concurrency, production checklist. |
| Observability | Baseline đã có | Error Boundary + privacy-safe client error/performance telemetry vào structured Function logs; không thu nội dung học/chat. | Sau deploy xác minh log và đặt alert/retention phù hợp ở provider. |
| Backend/API | Cần siết | Validation, timeout, retry/fallback đã có; chưa có rate limiting/app-level abuse protection. | Rate limit + request correlation + health/diagnostic endpoint. |

## Các phát hiện ưu tiên

### P0 — Không được mất dữ liệu người học
Bản sao lưu hiện tại chỉ xuất `progress` và `notes`. Những dữ liệu local-first mới như Learning Goal, Exploration State và Infinite Math Canvas không đi theo backup. Khi người dùng đổi máy hoặc xóa storage, một phần hành trình học sẽ mất dù UI nói “Dữ liệu luôn trong tay bạn”.

**Hành động:** thiết kế backup schema v2, vẫn đọc được backup v1, normalize từng subsystem trước khi restore và rollback best-effort nếu một bước ghi thất bại.

### P0 — Type safety phải là build gate
`tsconfig.app.json` trước baseline có nhiều kiểm tra nhưng chưa bật `strict`. Với codebase đang tăng nhanh, nullability và implicit assumptions cần bị bắt ở compile time.

**Hành động:** bật `strict: true`, không hạ mức kiểm tra chỉ để build xanh.

### P1 — Security headers phải nằm trong source control
`vercel.json` trước baseline chưa mô tả CSP / nosniff / referrer policy / permissions policy / anti-framing.

**Hành động:** khai báo ở repo để môi trường production có cấu hình lặp lại được. CSP hiện cho phép inline style vì UI đang dùng React style props; script vẫn chỉ từ same-origin.

### P1 — Chặn tăng kích thước bundle ngoài ý muốn
Build gần nhất có:
- entry JS: ~105 KiB gzip;
- chunk `Stars`: ~241 KiB gzip;
- CSS: ~27.5 KiB gzip;
- PWA precache: ~2.2 MiB.

Chunk Stars lớn nhưng nằm sau route splitting, nên chưa phải P0. Rủi ro lớn hơn là bundle tiếp tục phình mà CI vẫn xanh.

**Hành động:** thêm budget có khoảng thở thay vì tối ưu mù quáng ngay lập tức.

### P1 — Dependency hygiene
Repo chưa có Dependabot config trong source tree.

**Hành động:** update npm và GitHub Actions hàng tuần; CI kiểm tra vulnerability production mức high trở lên.

### P1 — Gemini API abuse protection
Endpoint đã giới hạn message/context và request budget, nhưng một endpoint public không có rate limiting vẫn có thể bị spam làm tăng chi phí/quota.

**Hành động tiếp theo:** rate limit theo IP/session ở edge/provider layer; trả `429` rõ ràng; không đưa secret xuống client.

### P2 — Observability
Hiện tại lỗi React đi vào Error Boundary và console. Đây là đủ cho phát triển, chưa đủ cho public production.

**Hành động tiếp theo:** error events tối thiểu, Web Vitals, request correlation cho API; không thu nội dung học/chat nếu không thật sự cần.

### P2 — Accessibility automation
UI đã có nhiều nền tốt: skip link, native `dialog`, aria-label/progressbar, keyboard shortcut, focus route. Chưa có automated axe-style audit trong CI.

**Hành động tiếp theo:** thêm accessibility test riêng sau khi baseline ổn định.

## Quy tắc nâng cấp từ sau audit

1. Không merge feature nếu lint, unit, build, bundle budget hoặc E2E đỏ.
2. Không dùng exploration để suy diễn mastery.
3. Không đưa API secret vào frontend.
4. Không thay schema local storage mà thiếu normalize/migration.
5. Tính năng tạo dữ liệu người dùng phải được tính vào backup/restore.
6. Tính toán toán học phải công bố mức exactness/precision phù hợp.
7. Tính năng nặng phải route-split hoặc lazy-load.
8. Recommendation/AI phải chỉ rõ evidence hoặc nguồn ngữ cảnh khi có thể.
9. Không deploy production chỉ vì PR merge; deploy là bước release riêng.
10. Mỗi đợt production release cần smoke test sau deploy.

## Backlog sau baseline

- [x] Backup/restore schema v2 cho Progress + Notes + Learning Goal + Exploration + Math Canvas.
- [ ] Bật Vercel WAF rate limiting cho `/api/gemini` khi release; code-level guards + warm-instance throttle đã có.
- [x] Client/API structured observability tối thiểu.
- [x] Accessibility CI.
- [ ] Kiểm tra và tối ưu Three/Drei chunk nếu ảnh hưởng thiết bị thấp.
- [ ] Cache/version migration policy cho content và ontology.
- [ ] Release checklist + rollback notes cho lần deploy production tiếp theo.
