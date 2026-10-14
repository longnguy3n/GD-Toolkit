# GD Toolkit v0.3.0

- Tạo, nhân bản, đổi tên, xóa và chuyển giữa tối đa 50 profile/banner gacha.
- Mỗi banner có currency mỗi lượt, số dư, giá tiền mỗi currency và đơn vị tiền. Calculate và Simulate hiển thị dự toán, tổng giá trị và tiền cần nạp thêm.
- Mở/thu gọn từng pool; mở/thu gọn tất cả. Giữ trạng thái riêng theo banner sau khi mở lại app.
- Chọn và xóa nhiều item/pool cùng lúc, bao gồm con đang thu gọn. Không xóa một phần nếu thao tác làm cấu hình mất hợp lệ.
- Đưa random engine và seed vào **Cài đặt chung**. Thêm **Unity giả lập · Xorshift128** chạy ngay, giữ **Custom · xoshiro128** và **Unity · mẫu thực**.
- History giữ snapshot cả banner, RNG, seed và chi phí. Xóa banner vẫn giữ history đã lưu; dùng cấu hình history tạo banner mới.
- Tự chuyển dữ liệu cũ sang banner đầu tiên, giữ theme/history và tạo bản sao `workspace.json.v1.backup` trước khi ghi định dạng mới.

**Unity giả lập** dùng cùng họ thuật toán, không bảo đảm chuỗi trùng Unity `InitState/Random.value`. Chế độ **Unity · mẫu thực** tiếp tục hỗ trợ JSON xuất từ Unity để đối chiếu chính xác.

**Đang dùng v0.2:** chọn **Cập nhật → Kiểm tra ngay → Tải bản mới → Cài và mở lại**.

**Cài lần đầu:** tải `GD-Toolkit-Setup-0.3.0-x64.exe`. Các file `.blockmap` và `latest.yml` dành cho updater.
