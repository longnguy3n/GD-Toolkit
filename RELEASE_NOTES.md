# GD Toolkit v0.4.0

- Sửa cấu trúc thành **Profile → nhiều Banner → Pool → Item**. Tạo, nhân bản, đổi tên, xóa profile và banner riêng biệt.
- Currency, số dư và giá tiền chỉ nằm trong **Thiết lập banner**, cùng quy tắc reset pity.
- Thêm bật/tắt **reset khi trúng mục tiêu trước hard pity**. **Hard pity luôn reset** counter về 0.
- Simulate đánh dấu từng lượt có hard pity/trúng trong vùng soft, ghi counter trước/sau, số lần gọi còn lại đến hard pity và trạng thái reset cho mọi pool.
- Tổng kết số hard pity, số lượt có hard pity và soft pity. History/JSON giữ đầy đủ log mới; history cũ vẫn xem được.
- Calculate so sánh tỷ lệ có/không pity, rate trung bình trong N lượt và số lần pity kỳ vọng toàn banner, kèm chi tiết từng pool.
- Giải thích horizon ngay cạnh ô nhập: giới hạn tìm mốc 50/90/95/99%, không thay đổi pity hay số lượt N.
- Tự chuyển dữ liệu cũ vào Profile mặc định và sao lưu workspace trước khi đổi định dạng.

**Cập nhật:** Cập nhật → Kiểm tra ngay → Tải bản mới → Cài và mở lại.

**Cài lần đầu:** tải GD-Toolkit-Setup-0.4.0-x64.exe. File blockmap/latest.yml phục vụ updater.
