# GD Toolkit · Windows v0.2

Ứng dụng desktop offline dành cho game designer. Tool đầu tiên: Gacha Tool, gồm Setup / Calculate / Simulate và History bên trong Simulate.

## Chạy ứng dụng

Tải **GD-Toolkit-Setup-0.2.0-x64.exe** từ [GitHub Releases](https://github.com/longnguy3n/GD-Toolkit/releases/latest), chạy bộ cài, rồi mở **GD Toolkit** từ Start Menu hoặc shortcut desktop. Bản dành cho Windows x64, không cần Node.js hay Unity để dùng Custom random. Bộ cài cài cho tài khoản Windows hiện tại; chưa có chữ ký số thương mại.

Nếu đang dùng bản portable v0.1, cài bản v0.2 **một lần** để có chức năng cập nhật. Bản v0.1 cũ không thể tự có chức năng mới. Cấu hình/history vẫn được đọc từ cùng thư mục `%APPDATA%/GD Toolkit`, không cần nhập lại. Có thể giữ bản portable cũ làm dự phòng, nhưng không mở đồng thời hai phiên bản.

Dữ liệu lưu ở `%APPDATA%/GD Toolkit/workspace.json`. Nút ↗ cạnh “Local workspace” mở thư mục dữ liệu thực tế. Cấu hình tự lưu sau mỗi thay đổi hợp lệ; kết quả mô phỏng được lưu khi bấm **Lưu history**. Đóng cửa sổ là thoát app. Các chức năng gacha hoạt động offline; kết nối GitHub chỉ phục vụ cập nhật. Không gửi cấu hình hoặc history lên mạng, không có đồng bộ đám mây.

## Theme và cập nhật

- Nút **☀ Sáng / ☾ Tối** ở góc trên bên phải đổi theme ngay lập tức. Lựa chọn được lưu cùng workspace và khôi phục khi mở lại. Đổi theme không thay cấu hình gacha hay kết quả mô phỏng.
- **↻ Cập nhật** mở thông tin phiên bản và nút **Kiểm tra ngay**. App cũng kiểm tra một lần sau khi mở; mất mạng vẫn dùng gacha bình thường.
- Khi có release stable mới: **Tải bản mới → Cài và mở lại**. App không tự tải/cài nếu bạn chưa chọn. Trước khi chạy bộ cài, app lưu workspace và kết quả mô phỏng chưa lưu nếu history còn chỗ; nếu history đầy hoặc đang tính toán, app yêu cầu xử lý trước.
- Nguồn duy nhất: [longnguy3n/GD-Toolkit](https://github.com/longnguy3n/GD-Toolkit), repository public. Không cần GitHub token. Dữ liệu update gồm bộ cài `.exe`, `.blockmap`, `latest.yml`; thư viện kiểm tra SHA-512 trước khi chấp nhận bản tải. Không cập nhật xuống phiên bản cũ hoặc tự lấy prerelease.
- **Commit mới chưa phải bản cập nhật.** Bản cập nhật là release stable mới nhất. Workflow tạo bộ cài và phát hành khi maintainer push tag `vX.Y.Z` khớp version trong package.json.
- Bản chạy bằng `npm start` không cài cập nhật. Bộ cài mới giữ cấu hình, history và theme; gỡ cài đặt cũng không tự xóa dữ liệu người dùng.

## Setup

- Chọn node trong cây để đổi tên hoặc thiết lập pity. Sửa weight trực tiếp trong bảng.
- **+ Item / + Pool** thêm vào pool đang chọn; nếu chọn item cuối cùng thì thêm cạnh item đó trong pool cha.
- Pool có thể lồng tối đa 8 tầng; tối đa 200 node. Mỗi pool có ít nhất 1 con và tổng weight phải lớn hơn 0. Item có weight 0 có thể nhận qua pity nếu là mục tiêu pity.
- Mỗi pool có **một** mục tiêu pity là một con trực tiếp. Có thể là item hoặc pool con.
- **Hard pity H:** lượt thứ H kể từ lần trúng mục tiêu gần nhất được bảo đảm. Trúng mục tiêu reset counter về 0.
- **Soft pity S:** từ lượt S, cộng `step` điểm phần trăm mỗi lượt, chặn ở 100%. S=0 tắt soft pity. Ví dụ rate 0,6%, S=74, step=6 điểm % → lượt 74 là 6,6%, lượt 75 là 12,6%.
- **Đã trượt liên tiếp:** counter khởi đầu trong mọi phép tính và mô phỏng. Phải nhỏ hơn H.
- Các item còn lại được phân bổ phần xác suất còn lại theo tỷ trọng weight ban đầu. Pool con chỉ tăng counter khi được gọi. Trúng ở cha không reset các pool con chưa được gọi.
- Xuất/nhập JSON để chuyển cấu hình. Nhập cấu hình không xóa history. Có nút nạp lại mẫu.

Mẫu ban đầu: pool 5★ có rate gốc 0,6%, soft pity từ 74, tăng 6 điểm %, hard pity 90; bên trong là 50/50 giữa Featured và Standard, hard pity 2 cho Featured. Thua 50/50 thì lần vào pool 5★ tiếp theo được Featured. Mẫu này minh họa phong cách gacha, **không phải thông số chính thức hoặc bản sao đầy đủ của game HoYoverse**. Không có bộ đếm 4★ mỗi 10 lượt trong mẫu. V0.1 chưa có nhiều bộ đếm pity song song trong cùng pool, chuyển pity giữa banner hay các cơ chế như Epitomized Path/Capturing Radiance.

## Calculate

Chọn một item cuối cùng, số bản sao K, số lượt N, horizon tìm mốc tin cậy, rồi bấm **Tính xác suất**.

- Rate gốc: tích weight / tổng weight của từng cạnh trên đường đi.
- Rate lượt kế tiếp: tích xác suất có điều kiện tại counter khởi đầu của từng pool.
- Rate thực: tần suất dài hạn sau pity. Được tính bằng chu kỳ tái sinh của từng mục tiêu pity, rồi nhân tỷ lệ có điều kiện trên đường đi.
- `P(X_N = K)` và `P(X_N ≥ K)` được tính riêng bằng quy hoạch động Markov với các counter trên đường tới item. Đây là tính giải tích số, không phải ước lượng từ mô phỏng.
- Biểu đồ là xác suất nhận ít nhất K bản sao theo số lượt. Các mốc 50/90/95/99% là số lượt đầu đạt ngưỡng trong horizon. `> horizon` nghĩa là chưa đạt trong khoảng đã tính; không mặc nhiên là bất khả thi.
- Thời gian chờ trung bình chính xác được hiển thị khi tất cả các pool có pity trên đường đi đều bảo đảm đúng nhánh đang xét. Khi đó, sau mỗi lần nhận mục tiêu, các counter liên quan tái sinh về 0. Tính từ counter hiện tại, không dùng rate dài hạn thay cho xác suất lượt đầu.
- Mốc bảo đảm hữu hạn chỉ hiển thị khi mọi cạnh trên đường đi có bảo đảm hoặc xác suất bằng 1. `E[min(T,horizon)]` luôn hiển thị dưới dạng **cận dưới**, kèm phần xác suất còn chưa đạt để tránh hiểu nhầm là kỳ vọng đầy đủ.
- **Rate ↔ Hard pity** là bộ tính riêng cho rate p cố định trước hard pity H: `rate thực = p / (1 - (1-p)^H)`. Với p=0, rate thực là 1/H. Tìm H nguyên gần nhất từ 1–10.000 cho rate thực mong muốn; đồng thời tính N đạt 95% nếu không có pity. Không áp dụng công thức này cho soft pity, không tự thay Setup.

Giới hạn tính chính xác: K≤50, N≤10.000, horizon≤10.000, tối đa 250.000 trạng thái và 40 triệu bước. Tác vụ chạy ở worker, có nút hủy. Vượt giới hạn sẽ báo lỗi rõ ràng; dùng Simulate cho hệ thống lớn. Mô hình giả định các mẫu RNG độc lập đều; sai số làm tròn số thực và lượng tử hóa của nguồn RNG không được mô hình hóa riêng.

## Simulate & History

- Từ 1 đến 1.000.000 lượt mỗi lần chạy. Mỗi lượt đi từ gốc đến đúng 1 item cuối cùng; vì vậy tổng số item bằng tổng số lượt.
- Mỗi lần chạy bắt đầu từ counter trong Setup, cùng seed hoặc cùng đầu file Unity RNG. Chạy lại cùng thông số cho cùng kết quả. Không tự nối counter hay seed của lần trước.
- Bảng hiển thị **tất cả** item cuối cùng kể cả số lượng 0, số lượng nhận, tỷ lệ quan sát, rate thực dài hạn và chênh lệch theo điểm phần trăm.
- Pull log lưu đầy đủ thứ tự từng item; giao diện phân trang 48 lượt. JSON xuất chứa toàn bộ thứ tự, counts, cấu hình, seed, các counter cuối và thống kê mỗi pool.
- Lưu tối đa 30 lần chạy; workspace tối đa 100 MB. Khi đầy, xuất kết quả và xóa bớt history. Dữ liệu lưu trên ổ đĩa; phép ghi dùng file tạm rồi đổi tên. Không có tự xóa lịch sử cũ.
- History giữ bản chụp cấu hình của lần chạy, xem lại đúng tên/rate cũ dù Setup hiện tại đã đổi. Có thể lấy cấu hình từ history về Setup.

## Hai nguồn random

**Custom:** xoshiro128** 1.1 của Blackman & Vigna, seed uint32 qua bộ trộn xác định được ghi trong `core/engine.mjs`. Không dùng `Math.random`. Thuật toán phù hợp mô phỏng, không dùng cho mật mã. Cùng seed/config/phiên bản engine tái tạo được kết quả.

**Unity:** sử dụng các giá trị thực của `UnityEngine.Random.value`, xuất bằng script đi kèm. Không gắn nhãn một bản xorshift JS là Unity. Unity không được nhúng trong exe.

1. Setup → Unity random → **Script Unity** để lưu `GDToolkitRandomExporter.cs`.
2. Thêm script vào `Assets/Editor` của dự án Unity.
3. Trong Unity mở **Tools → GD Toolkit → Export Random**. Chọn seed và số mẫu (tối đa 3 triệu), xuất JSON.
4. Trong GD Toolkit chọn **Nhập RNG JSON**, sau đó Simulate.

Mỗi pool được ghé tiêu thụ 1 mẫu, kể cả lượt bảo đảm. Một pull nhiều tầng cần nhiều mẫu. Hết mẫu thì báo lỗi và không trả về kết quả chưa hoàn tất, không quay vòng. Mẫu `1.0` được đưa vào khoảng cuối cùng có xác suất dương. Exporter khôi phục trạng thái random của Unity sau khi chạy. File Unity được giữ trong bộ nhớ phiên; mở app lại cần nhập lại. History vẫn xem được mà không cần file đó; muốn replay cần giữ file RNG gốc. Seed Unity do Unity quyết định và được lưu trong metadata.

Script exporter được cung cấp theo API Unity Editor; **chưa chạy kiểm thử trong Unity Editor trên máy này**. Định dạng JSON, các giá trị biên 0/1, hết mẫu và đầu ra của nhánh Unity đã được kiểm thử bằng dữ liệu mẫu.

Nguồn kỹ thuật:
- Unity Random: https://docs.unity3d.com/ScriptReference/Random.html
- xoshiro128** (public domain): https://prng.di.unimi.it/xoshiro128starstar.c

## Phát triển & kiểm thử

```
npm ci
npm start
npm test
npm run test:desktop
npm run package
```

Node 22.12+ để phát triển (CI dùng Node 24). Electron 42 tải runtime theo nhu cầu; nếu cần tải trước: `node node_modules/electron/install.js`. `npm run package` dùng electron-builder tạo bộ cài NSIS Windows x64 và manifest cập nhật trong `releases/`. Mã nguồn nằm ở `desktop/` (cửa sổ, IPC, lưu file, updater), `core/` (toán và RNG), `ui/` (giao diện, worker, theme), `unity/` (exporter).

Kiểm thử bao gồm phân phối nhị thức, đối chiếu liệt kê tất cả nhánh của một cấu hình nhỏ, mốc pity, bảo đảm 50/50, counter khởi đầu, kỳ vọng, hạt giống lặp lại, vector chuẩn xoshiro, Monte Carlo 200.000 lượt và các trường hợp nhập sai. Kiểm thử Electron chạy trên hồ sơ tạm trong `test-output/profile`, không dùng dữ liệu của người dùng; kiểm tra thêm/xóa, worker, persistence sau reload, history, phân trang và bố cục 1020px. Ảnh QA được lưu ở `test-output/`.

Updater có kiểm thử trạng thái cho kiểm tra/tải/cài, mất mạng, lỗi file tải, lỗi ghi dữ liệu, chống thao tác trùng, không tải/cài ngoài ý muốn. Kiểm thử desktop xác nhận theme sáng và tối, giữ theme sau reload, và hộp cập nhật. Kiểm thử live release (chạy riêng sau khi phát hành) xác minh nguồn GitHub và tải checksum hợp lệ, không tự cài lên máy kiểm thử.

## Phát hành phiên bản tiếp theo

1. Sửa mã nguồn, chạy `npm test` và `npm run test:desktop`.
2. Tăng version: `npm version patch --no-git-tag-version` (hoặc minor/major), cập nhật release notes, rồi commit.
3. Push branch main, tạo và push tag trùng version, ví dụ `git tag v0.2.1` rồi `git push origin v0.2.1`.
4. Workflow `.github/workflows/release.yml` chạy trên Windows, kiểm thử, build, tải asset vào draft, rồi publish stable release. Token CI do GitHub cung cấp; không đưa token vào source hoặc exe.
5. App đang cài phiên bản cũ sẽ nhận phiên bản mới khi kiểm tra cập nhật. Release có lỗi build/test sẽ không được phát hành.

Có thể phát hành thủ công bằng `tools/github-release.cjs publish` sau khi đã push đúng commit/tag và build. Helper dùng Git credential manager trong bộ nhớ, không ghi token ra file. Không ghi đè asset của release đã publish; sửa lỗi bằng version mới.
