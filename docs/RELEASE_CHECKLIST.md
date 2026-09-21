# MathNexus Production Release & Rollback Checklist

Checklist này dùng cho release production, tách biệt với việc merge PR vào `main`.

## 1. Trước release

- [ ] `main` là commit dự định deploy, không deploy từ feature branch.
- [ ] CI của commit đó xanh: dependency audit, lint, unit, strict build, bundle budget, E2E/accessibility.
- [ ] Không còn migration/schema PR đang dở có thể làm release nửa vời.
- [ ] Nếu release thay durable data: backup parser/migration fixtures đã pass.
- [ ] Xác nhận `GEMINI_API_KEY` và model env ở production, không có secret trong frontend bundle.
- [ ] Bật/kiểm tra Vercel WAF cho `POST /api/gemini`: rate limit theo IP, threshold ban đầu 20 request / 60 giây.
- [ ] Ghi lại production deployment hiện tại để làm rollback target.
- [ ] Ghi lại commit SHA sẽ deploy.
- [ ] Kiểm tra domain/HTTPS và environment đúng project.

## 2. Deploy

- [ ] Deploy đúng commit SHA từ `main`.
- [ ] Nếu dùng GitHub Pages, chạy workflow `Deploy to GitHub Pages` thủ công; merge vào `main` không tự deploy.
- [ ] Không thay nhiều biến môi trường không liên quan trong cùng release.
- [ ] Chờ deployment hoàn tất trước smoke test; không kết luận từ trạng thái build GitHub alone.

## 3. Smoke test ngay sau deploy

### Shell / routing
- [ ] Mở `/`, reload trực tiếp một deep route như `/map?concept=taylor`.
- [ ] Desktop và mobile menu hoạt động.
- [ ] Skip-link/focus không regress.

### Learning
- [ ] Mở một lesson.
- [ ] Làm một câu Practice.
- [ ] Kiểm tra Progress cập nhật.
- [ ] Đặt một Learning Goal và xác nhận Dashboard thấy mục tiêu.

### Data integrity
- [ ] Export backup v2.
- [ ] Kiểm tra file có progress, notes, learningGoal, exploration, canvas.
- [ ] Không thử restore lên dữ liệu production quan trọng nếu chưa có bản backup riêng.

### AI/API
- [ ] Gửi một prompt Gemini bình thường.
- [ ] Response có `X-Request-Id` ở API.
- [ ] Cross-origin browser request vẫn bị 403.
- [ ] WAF rate limit trả 429 khi vượt threshold kiểm thử có kiểm soát.

### PWA/offline
- [ ] PWA đăng ký service worker bình thường.
- [ ] Một lesson chưa mở trước đó vẫn có offline behavior theo contract hiện tại.
- [ ] Math Cosmos không bị tải trước khi truy cập.
- [ ] Mở Cosmos online một lần rồi reload offline vẫn dùng được.

### Observability
- [ ] Có performance telemetry trong Vercel Function logs.
- [ ] Log chỉ chứa route template + numeric metrics/whitelisted error metadata.
- [ ] Không xuất hiện AI prompt, notes, displayName, localStorage hay query string.

## 4. Tiêu chí rollback

Rollback ngay nếu có một trong các dấu hiệu:
- app shell trắng/crash trên route chính;
- restore/backup làm mất hoặc ghi sai durable data;
- Practice/Learning Goal ghi sai evidence;
- Gemini endpoint lộ secret hoặc abuse tăng bất thường;
- CSP/security header chặn app chính;
- service worker khiến phần lớn người dùng mắc ở asset lỗi;
- lỗi nghiêm trọng không thể hotfix an toàn trong thời gian ngắn.

## 5. Cách rollback

1. Chọn deployment production ổn định gần nhất trên Vercel và promote/rollback về deployment đó.
2. Giữ nguyên log/request IDs của release lỗi để điều tra.
3. Nếu lỗi liên quan WAF, có thể pause rule riêng trước khi rollback app nếu rule là nguyên nhân.
4. Không xóa localStorage của người dùng như một “cách sửa”.
5. Không hạ schema dữ liệu bằng cách ghi đè. Progress có downgrade guard; các subsystem versioned-key phải được giữ nguyên.
6. Sau rollback, chạy lại smoke test shell + practice + backup + AI.
7. Mở issue/PR ghi nguyên nhân, commit lỗi và điều kiện tái hiện trước khi redeploy.

## 6. Sau release ổn định

- [ ] Theo dõi error/performance telemetry trong thời gian đầu.
- [ ] Kiểm tra WAF 429 có chặn nhầm traffic thật không.
- [ ] Kiểm tra bundle/PWA size không vượt baseline ngoài dự kiến.
- [ ] Chỉ đóng release task khi backup, offline và AI đều đã smoke-test.
