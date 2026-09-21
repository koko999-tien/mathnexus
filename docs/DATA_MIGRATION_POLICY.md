# MathNexus Data Migration Policy

Mục tiêu: mọi thay đổi schema hoặc ID kiến thức phải có đường nâng cấp rõ ràng, không làm mất dữ liệu local-first và không biến rollback code thành thao tác ghi đè dữ liệu mới.

## Các dữ liệu bền vững hiện tại

| Subsystem | Storage | Schema hiện tại | Backup |
| --- | --- | ---: | --- |
| Progress / practice evidence | `mathnexus_progress` | 1 | v1 + v2 |
| Notes | `mathnexus_notes` | chuỗi text | v1 + v2 |
| Learning Goal | `mathnexus_learning_goal_v1` | 1 | v2 |
| Exploration | `mathnexus_exploration_state_v1` | 1 | v2 |
| Math Canvas | `mathnexus_canvas_v1_*` | 1 | v2 |
| Backup envelope | file JSON | 2 | n/a |

Theme, transient UI state và AI conversation session không được coi là durable learning data mặc định.

## Quy tắc schema

1. Mỗi object bền vững có cấu trúc phức tạp phải có version explicit hoặc version nằm trong storage key.
2. Normalizer phải:
   - chấp nhận schema cũ đã biết;
   - bỏ/giới hạn dữ liệu sai kiểu;
   - không phát minh mastery/evidence;
   - luôn trả về schema hiện tại.
3. Không được silently downgrade một schema tương lai. Nếu app cũ nhìn thấy `progress.version > current`, write phải bị chặn thay vì ghi đè.
4. Migration phải idempotent: chạy nhiều lần cho cùng input phải cho cùng output.
5. Migration không được phụ thuộc network hoặc AI.
6. Backup parser phải normalize trước restore.
7. Restore nhiều subsystem phải có best-effort rollback nếu một bước ghi lỗi.

## Quy tắc ID tri thức

Các ID sau là durable identifiers vì chúng xuất hiện trong local data hoặc backup:
- lesson id
- question id
- book id
- concept id
- ontology atom id
- simulation id khi được ghi vào exploration

Vì vậy:
- không tái sử dụng một ID cũ cho ý nghĩa mới;
- không đổi ID chỉ để “đẹp tên”;
- nếu buộc phải rename, phải có alias map/migration trong ít nhất một release;
- migration alias phải có unit test với dữ liệu thật của schema trước;
- nếu xóa content, ưu tiên giữ tombstone/alias đủ lâu để backup cũ vẫn khôi phục được có chủ đích.

## Quy trình khi tăng schema version

Ví dụ Progress v1 → v2:

1. thêm type cho v2 và hàm `migrateProgressV1ToV2`;
2. `normalizeProgress` phân nhánh theo version đã biết;
3. thêm unit test cho:
   - legacy không version;
   - v1 hợp lệ;
   - v1 corrupt;
   - v2;
   - future version;
4. backup hiện tại phải đọc được dữ liệu cũ;
5. trước merge, test restore từ fixture của release trước;
6. chỉ sau ít nhất một release ổn định mới cân nhắc bỏ đường migration cũ.

## Rollback safety

Code rollback có thể cũ hơn dữ liệu localStorage mà người dùng vừa ghi bằng release mới. Vì vậy:
- schema dùng key versioned thì app cũ không được đụng key mới;
- schema dùng key cố định như `mathnexus_progress` phải có explicit version và downgrade write guard;
- rollback production **không đồng nghĩa rollback dữ liệu local của người dùng**;
- không thêm migration phá hủy dữ liệu nếu không có backup/export path.

## Cache/service worker

Asset build dùng content hash nên asset cũ/mới có thể cùng tồn tại tạm thời. Workbox cleanup chịu trách nhiệm dọn cache cũ.

Math Cosmos runtime không nằm trong install precache; nó được cache sau lần mở đầu. Khi đổi cache policy:
- đổi `cacheName` nếu semantics không tương thích;
- giữ offline E2E;
- không dùng service worker để migrate localStorage schema.

## Definition of done cho thay đổi dữ liệu

Một PR thay schema/ID chưa được coi là xong nếu thiếu một trong các mục:
- normalizer/migration;
- backward compatibility test;
- future-version/downgrade behavior;
- backup/restore impact;
- cập nhật tài liệu policy nếu contract thay đổi.
