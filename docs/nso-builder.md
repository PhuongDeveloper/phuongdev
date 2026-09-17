# Tạo JAR Ninja School tức thì

Tính năng nằm trực tiếp trong `/store`. Hệ thống không dùng worker, máy Windows,
JDK hay quy trình build lại mã nguồn khi khách mua.

## Cách hoạt động

1. Hai JAR đã build và kiểm thử nằm trong `private/nso-templates`.
2. API tìm hằng cấu hình server trong Java class bên trong JAR và thay bằng
   `Tên server:host:port:0:0` ngay trong bộ nhớ.
3. File hoàn tất được upload vào bucket Supabase riêng tư `nso-builds`.
4. RPC trong migration `015_nso_jar_builder.sql` khóa ví, kiểm tra giá hiện tại,
   trừ tiền và ghi lịch sử trong cùng một transaction.
5. Khách tải file qua signed URL ngắn hạn. Bucket không public.

Nếu tạo hoặc upload JAR thất bại, RPC chưa chạy nên khách không bị trừ tiền. Nếu
giao dịch cơ sở dữ liệu thất bại, API xóa file vừa upload.

## Đưa lên môi trường chạy thật

- Commit cả `private/nso-templates/148.jar` và `217.jar` cùng mã nguồn.
- Chạy migration `supabase/migrations/015_nso_jar_builder.sql` một lần trên
  Supabase của website.
- Deploy website như bình thường. Không cần thêm biến môi trường hay bật máy riêng.

## Kiểm tra JAR mẫu

Chạy `npm run test:nso-jar`. Bài kiểm tra sửa cấu hình hai lần, mở lại file ZIP/JAR
và xác nhận cả phiên bản 148 lẫn 217 vẫn đọc được.

## Thêm phiên bản sau này

Mỗi phiên bản mới cần một JAR mẫu đã build, một tên file được thêm vào allow-list
trong `src/lib/nso-builder/jar.ts`, cấu hình output tracing trong `next.config.ts`,
và một dòng tương ứng trong bảng `nso_build_versions`. APK/iOS/PC nên được triển
khai bằng bộ xử lý riêng vì định dạng và cơ chế ký file khác JAR.

