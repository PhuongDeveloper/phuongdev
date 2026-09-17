# Tạo JAR Ninja School tức thì

Tính năng nằm trực tiếp trong `/store`. Hệ thống không dùng worker, máy Windows,
JDK hay quy trình build lại mã nguồn khi khách mua.

## Cách hoạt động

1. Hai JAR x1 và tám template nhiều tab nằm trong `private/nso-templates`.
2. API tìm hằng cấu hình server trong Java class bên trong JAR và thay bằng
   `Tên server:host:port:0:0` ngay trong bộ nhớ.
3. File hoàn tất được upload vào bucket Supabase riêng tư `nso-builds`.
4. RPC trong migration `015_nso_jar_builder.sql` khóa ví, kiểm tra giá hiện tại,
   trừ tiền và ghi lịch sử trong cùng một transaction.
5. Khách tải file qua signed URL ngắn hạn. Bản thường là một JAR; bản nhiều tab
   là ZIP giao hàng chứa đủ x1, x3, x6, x12 và x24. Bucket không public.

Nếu tạo hoặc upload JAR thất bại, RPC chưa chạy nên khách không bị trừ tiền. Nếu
giao dịch cơ sở dữ liệu thất bại, API xóa file vừa upload.

## Đưa lên môi trường chạy thật

- Commit `private/nso-templates/148.jar`, `217.jar` và thư mục `clones` cùng mã nguồn.
- Chạy toàn bộ migration `supabase/migrations/015_nso_jar_builder.sql` trên
  Supabase của website. File có thể chạy lại an toàn nếu lần trước dừng giữa chừng.
- Deploy website như bình thường. Không cần thêm biến môi trường hay bật máy riêng.

## Kiểm tra JAR mẫu

Chạy `npm run test:nso-jar`. Bài kiểm tra vá cấu hình vào từng tab, xác nhận các
bản x3/x6/x12/x24 có đúng số class server và ZIP giao hàng chứa đủ năm JAR.

## Thêm phiên bản sau này

Mỗi phiên bản mới cần một JAR mẫu đã build, một tên file được thêm vào allow-list
trong `src/lib/nso-builder/jar.ts`, cấu hình output tracing trong `next.config.ts`,
và một dòng tương ứng trong bảng `nso_build_versions`. APK/iOS/PC nên được triển
khai bằng bộ xử lý riêng vì định dạng và cơ chế ký file khác JAR.

## APK, PC và iOS build sẵn

Các client build sẵn đọc chuỗi server từ sáu endpoint công khai:

- `/apk148.txt`, `/apk217.txt`
- `/pc148.txt`, `/pc217.txt`
- `/ios148.txt`, `/ios217.txt`

Mỗi endpoint trả nội dung `Tên:host:port:0:0` và dùng dấu phẩy để ngăn cách
nhiều server. Dữ liệu được dựng trực tiếp từ `nso_server_access`, không phải file
TXT vật lý nên không có thao tác ghi đè dễ xung đột.

APK và PC dùng gói vĩnh viễn. iOS có các gói 7, 30 và 90 ngày; endpoint chỉ lấy
bản ghi chưa hết hạn nên server tự biến mất đúng thời điểm mà không cần cron.
Admin có thể đổi link Drive/TestFlight, giá, trạng thái mở bán và tạm dừng từng
server trong `/admin/nso-builder`.

## Nhân bản JAR

Logic biến đổi bytecode thật của `EmbedAdvMenu.jar` đã được gọi qua adapter
headless `tools/nso-cloner/NsoCloneGenerator.java`. Adapter tạo namespace class,
`Static.class`, RecordStore và launcher riêng cho từng tab giống công cụ gốc.
Java chỉ dùng khi tạo hoặc thay template; lúc khách mua, Vercel chỉ vá toàn bộ
hằng server rồi đóng gói nên không cần JVM hay máy Windows chạy nền.

Admin cấu hình `Giá JAR x1` và `Phụ phí bộ 5 JAR` riêng cho từng phiên bản.
Khách tích “Bộ nhân bản nhiều tab” sẽ nhận ZIP gồm x1/x3/x6/x12/x24. ZIP này chỉ
là gói tải về, chưa phải bản Android do AngelChip convert; bước convert được để
dành cho giai đoạn sau.
