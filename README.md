# GD Toolkit · Windows v0.7

Ứng dụng desktop offline dành cho game designer. Gacha Tool gồm Setup / Calculate / Simulate / Compare / Players; Simulate và Players có lịch sử riêng.

## Cài đặt và cập nhật

Tải **GD-Toolkit-Setup-0.7.0-x64.exe** từ [GitHub Releases](https://github.com/longnguy3n/GD-Toolkit/releases/latest). Windows x64, không cần Node.js hay Unity để chạy Custom hoặc Unity giả lập. Bộ cài dành cho tài khoản Windows hiện tại, chưa có chữ ký số thương mại.

Nếu đã cài v0.2 trở lên: **Cập nhật → Kiểm tra ngay → Tải bản mới → Cài và mở lại**. Bản portable v0.1 cần chạy bộ cài mới một lần. App tự kiểm tra khi mở nhưng chỉ tải/cài khi bạn chọn; mất mạng vẫn dùng gacha bình thường. Nguồn cập nhật là repository public longnguy3n/GD-Toolkit, không cần token. Updater kiểm tra SHA-512 của bộ cài và không tự hạ phiên bản.

Nút **Sáng / Tối** đổi theme và lưu lựa chọn. Dữ liệu nằm ở `%APPDATA%/GD Toolkit/workspace.json`; nút ↗ cạnh Local workspace mở thư mục này. App không gửi cấu hình/history lên mạng. Bộ cài giữ dữ liệu; gỡ cài đặt không tự xóa dữ liệu người dùng.

## Profile → Banner → Pool → Item

- **Profile** là cấp lớn nhất, có tên và chứa nhiều banner. Tạo, nhân bản toàn bộ, đổi tên, chuyển và xóa profile bằng hàng PROFILE.
- Mỗi profile có **nhiều banner**. Hàng BANNER phía dưới dùng để tạo, nhân bản, đổi tên, chuyển và xóa banner trong profile đang chọn. Mỗi banner giữ cây pool/item, counter khởi đầu, quy tắc reset và currency riêng. Banner mới bắt đầu trống; mẫu 90 pity chỉ được nạp khi chọn Nạp cấu hình mẫu.
- Tối đa 50 profile, 50 banner/profile. Luôn giữ ít nhất một profile và một banner/profile để có chỗ làm việc.
- Pool chứa các item cuối cùng hoặc pool con. Banner chọn nhánh đầu tiên; mỗi lượt tiếp tục random cho tới đúng một item cuối cùng. Tối đa 200 node/banner và 8 tầng pool.
- Nút tam giác mở/thu gọn pool; **Mở tất cả / Thu gọn tất cả** áp dụng toàn cây, giữ trạng thái riêng theo banner. Thu gọn không loại item khỏi phép tính.
- **Shift + click checkbox** chọn/bỏ chọn dải giữa mục neo và mục vừa bấm, theo thứ tự đang hiển thị. Bấm thường đặt lại neo; các mục trong pool thu gọn không tự được chọn. Mọi cập nhật giao diện giữ vị trí cuộn trang và danh sách: chọn item, tick, sửa thông số, mở/thu gọn pool, đổi theme, thêm/xóa, lưu history và phân trang. Giữ các chi tiết đang mở và không cuộn theo focus khi dựng lại form. Nếu nội dung bị xóa/thu gọn ngắn hơn vị trí đang xem, trình duyệt giữ vị trí gần nhất còn hợp lệ.
- Checkbox chọn nhiều item/pool rồi **Xóa đã chọn**. Xóa cha gồm tất cả con, kể cả đang ẩn; chọn cha và con không đếm trùng. Xóa mục tiêu pity sẽ tắt pity tương ứng. Có thể xóa toàn bộ pool/item để làm trống banner. Pool con còn tồn tại phải có ít nhất một item và tổng weight dương; xóa pool đó nếu không cần nữa. Banner trống vẫn lưu/mở lại được, nhưng chưa chạy Calculate/Simulate.
- **Nhập cấu hình** tạo banner mới trong profile hiện tại. **Xuất JSON** xuất banner hiện tại, kèm currency và quy tắc pity. Random engine chung không bị thay bởi import/history.
- Xóa banner/profile không xóa history đã lưu. Kết quả chưa lưu được giữ trong bộ nhớ khi chuyển banner/profile; bấm **Lưu history** trước khi thoát nếu muốn giữ.

Dữ liệu v0.2/v0.3 tự chuyển sang schema workspace v3: mọi banner cũ được đặt trong một **Profile mặc định**, giữ banner đang chọn, currency, thu gọn, theme và history. Trước khi ghi, app sao lưu một lần thành `workspace.json.v1.backup` hoặc `workspace.json.v2.backup`. Bản app cũ không đọc workspace mới. Banner dùng nhiều pity được lưu bằng schema cấu hình v3; app cũ từ chối đọc để tránh bỏ qua quy tắc mới. Banner một pity cũ và history cũ vẫn đọc được. Workspace vẫn dùng schema v3.

## Setup và currency

Cây hiển thị trực tiếp các pool/item của banner, không có dòng ROOT. Chọn node để đổi tên, weight hoặc cấu hình pity. Nút **Pity banner** mở thiết lập pity chung. **+ Item vào banner / + Pool vào banner** luôn thêm trực tiếp vào banner, không phụ thuộc node đang chọn. Trong thiết lập pool, **+ Item vào pool này / + Pool con** thêm bên trong pool; **+ Item ngang hàng / + Pool ngang hàng** thêm vào cùng cha với node đang chọn. Hộp thoại luôn ghi tên nơi nhận. ID vẫn lưu nội bộ để nối pity/history nhưng không hiển thị trong form.

Mở **Thiết lập banner · Currency & reset pity** để nhập:

- Tên currency, số currency cho một lượt gacha, số dư đang có.
- Giá tiền của một currency và đơn vị tiền, ví dụ VND. Giá 0 = chưa định giá, không được hiểu là mọi lượt miễn phí.
- Chi phí chỉ đặt ở banner, không nhập ở pool hoặc item. Giá tuyến tính, chưa mô hình hóa gói nạp/khuyến mãi.

Calculate/Simulate hiển thị tổng currency, tổng giá trị và số tiền cần nạp thêm sau khi trừ số dư. Mô phỏng không tự trừ currency. History giữ chi phí theo cấu hình lúc chạy.

## Nhân bản, nhập nhiều và chỉnh sửa nhiều item

Chọn pool rồi bấm **Nhân bản pool này · cùng cấp**. Bản sao được đặt ngay sau pool gốc trong cùng cha, giữ toàn bộ cây con, tier, weight, pity và counter khởi đầu. Mọi node trong bản sao có ID riêng; mục tiêu pity bên trong trỏ vào bản sao. Weight được giữ nguyên nên rate của các mục cùng cha sẽ thay đổi.

Bấm **+ Nhiều item** tại banner, trong pool hoặc ngang hàng với mục đang chọn. Dán danh sách, mỗi dòng một item; hoặc dán 3 cột từ bảng tính: **Tên → Weight → Tier**, phân cách bằng Tab, không có dòng tiêu đề. Dòng trống được bỏ qua, tên trùng vẫn tạo item riêng. Weight trống dùng giá trị mặc định; dòng chỉ có tên dùng cả weight và tier mặc định. Cột tier trống có nghĩa không gán tier. Bản xem trước ghi rõ nơi nhận, số lượng và giá trị trước khi tạo. Dán nhiều dòng vào ô tên trong **Thêm item** cũng tự mở bản xem trước này. Giới hạn toàn banner vẫn là 200 node; lỗi sẽ chặn toàn bộ lần nhập.

Tick từ hai mục để mở **Inspector chỉnh sửa nhiều mục**. Weight/tier giống nhau được hiển thị bình thường; khác nhau hiển thị **Nhiều giá trị**. Chỉ trường được sửa mới thay đổi. Weight áp dụng cho mọi mục đã chọn, tier chỉ áp dụng cho item cuối đã chọn; chọn pool không tự chọn các con. Có nút bỏ tier chung. Thay đổi không hợp lệ bị hủy toàn bộ; history đã lưu giữ nguyên. Bấm **Bỏ chọn** để trở lại chỉnh từng mục.

## Tier của item

Mỗi item cuối cùng có trường **Tier** tùy chọn, tối đa 40 ký tự, ví dụ Common, Rare, Epic hoặc SSR. Nhập khi tạo item hoặc chỉnh trong thiết lập item. Tier là nhãn phân loại, không tự đổi weight/rate. Bảng kết quả và từng lượt trong Pull log ghi rõ tier. History và JSON giữ tier tại thời điểm chạy; đổi tier hiện tại không sửa history. Item/history chưa có tier hiển thị **Chưa gán tier**.

## Tổng weight và rate toàn banner

Hàng **Tổng banner** cộng weight của các item/pool trực tiếp trong banner, không cộng lẫn weight từ pool con. **Rate trong pool** là weight chia tổng weight cùng cha. **Rate toàn banner** nhân tất cả rate trên đường đi; ví dụ pool có 10% và item chiếm 20% trong pool thì item có 2% trên banner. Dòng **Pity** là rate dài hạn gồm pity của các pool cha. Tổng rate chỉ cộng các item cuối cùng (100% khi có item, 0% khi trống), không phụ thuộc thu gọn. Số hiển thị làm tròn tối đa 10 chữ số có nghĩa; di chuột cột rate toàn banner để xem giá trị chi tiết.

## Quy tắc pity

Banner hỗ trợ tối đa **8 quy tắc pity**, mỗi quy tắc có tên, mục tiêu, hard/soft pity và counter khởi đầu riêng. Mở **Pity banner → Thêm pity**, dùng ↑/↓ để đổi ưu tiên, bật/tắt hoặc xóa từng quy tắc. Các mục tiêu là con trực tiếp của banner, có thể là item hoặc pool. Mỗi pool con vẫn có một pity riêng và chỉ tăng counter khi được gọi.

Khi nhiều hard pity đến hạn, quy tắc đứng trước được ưu tiên. Quy tắc khác mục tiêu giữ counter tại H−1, chờ lần gọi sau; có thể bị chặn tiếp nếu quy tắc trên lại đến hạn. Nhiều quy tắc cùng mục tiêu đến hạn hoàn thành cùng lượt. Mỗi lượt gacha vẫn trả đúng một item cuối cùng. Khi không có hard pity, soft pity giữ phần rate đã tăng theo thứ tự ưu tiên; nhánh còn lại chia phần dư theo weight. Nếu cùng mục tiêu thì dùng mức tăng lớn nhất, không cộng dồn.

- **Hard pity H:** lần gọi thứ H kể từ khi reset đạt ngưỡng yêu cầu mục tiêu, có xét ưu tiên nếu có nhiều pity. **Hard pity luôn reset counter pool đó về 0.**
- **Reset khi trúng mục tiêu trước hard pity** là tùy chọn của banner, áp dụng mọi pool. Bật: trúng tự nhiên hoặc trong vùng soft pity sẽ reset pool đó. Tắt: counter tiếp tục tăng dù trúng sớm; hard pity vẫn reset, nếu chỉ có một pity thì các lần hard pity cách nhau H lần gọi; nhiều pity có thể bị trì hoãn bởi ưu tiên.
- **Soft pity S:** từ lần gọi S, cộng step điểm phần trăm mỗi lần, chặn ở 100%. S=0 tắt. Rate các nhánh khác giảm theo tỷ trọng weight. Ví dụ rate 0,6%, S=74, step=6 → lần 74 là 6,6%, lần 75 là 12,6%.
- **Counter khởi đầu:** số lần gọi đã tích lũy trong chu kỳ hiện tại, từ 0 đến H−1. Nút **Reset mọi counter khởi đầu** đặt tất cả về 0. Mỗi lần Calculate/Simulate bắt đầu từ các counter này, không nối với lần chạy trước.

Mẫu 90 pity + 50/50 minh họa hệ thống gacha, không phải thông số chính thức hoặc bản sao đầy đủ của game HoYoverse. Chưa có nhiều pity trên cùng pool con, chuyển pity giữa banner, hay Epitomized Path/Capturing Radiance.

## Calculate và dự báo số lượt

Chọn item cuối, số bản sao K và số lượt N dự định quay. App chỉ tính mục tiêu **ít nhất K bản sao**, nhận nhiều hơn vẫn đạt. Không cần nhập horizon.

App tự tìm số lượt đầu tiên đạt hoặc vượt **50%, 90%, 95%, 99% cơ hội nhận ít nhất K bản sao**, có xét pity và counter khởi đầu. Ví dụ 50% tại 1.320 lượt nghĩa là quay 1.320 lượt có ít nhất 50% cơ hội nhận đủ K bản sao. Mốc 99% không phải bảo đảm tuyệt đối. Các mốc này không phải khoảng tin cậy thống kê.

N từ 1 đến 10.000 chỉ dùng để xem xác suất, thống kê pity và chi phí tại số lượt dự định quay. Các mốc dự báo được tìm độc lập và có thể lớn hơn N; chi phí tại từng mốc cũng hiển thị riêng.

- Tính xác suất nhận ít nhất K bản sao theo Markov; dừng theo dõi nhánh đã đủ K bản sao khi tìm các mốc. Mô hình nhiều pity tính cả các counter cạnh tranh ưu tiên.
- So sánh **có pity** với **tắt tất cả pity**: rate dài hạn, rate trung bình trong N lượt từ counter khởi đầu, số item mục tiêu kỳ vọng.
- Đếm **số lần hard pity kỳ vọng toàn banner**, số lượt có ít nhất một hard pity, và thống kê từng pool: số lần gọi, hard pity, lần tăng rate soft, trúng vùng soft, reset và chờ ưu tiên. Các số kỳ vọng có thể là số thập phân, khác số lần thực tế của từng lần mô phỏng. Vẫn đếm sự kiện sau khi đã đủ K bản sao.
- Một lượt gacha có thể kích hoạt nhiều pool pity, nên tổng số sự kiện có thể lớn hơn số lượt có pity.
- Rate không pity là tích weight/tổng weight trên đường đi. Rate dài hạn có pity dùng phân phối dừng của counter tại mỗi pool. Với một pity và tắt reset trúng sớm, chu kỳ dài H lần gọi. Với nhiều pity, giải phân phối dừng bằng số: tối đa 4.096 trạng thái, 20.000 vòng lặp, 8 triệu bước chuyển; sai số thay đổi phân phối dưới 1e-12. Đây là giá trị xấp xỉ số, không phải chứng minh sai số tuyệt đối; không hội tụ trong giới hạn thì hiện —.
- Chi phí trung bình = E[T] × giá mỗi lượt. Không suy diễn tiền nạp trung bình bằng cách trừ số dư khỏi E[T].
- Thời gian chờ trung bình chỉ hiển thị khi mô hình chu kỳ cho phép tính, hoặc khi đã xét đầy đủ đến một cận bảo đảm hữu hạn. Không dùng số lượt đã xét làm thời gian chờ trung bình.

Giới hạn phép tính mục tiêu: K≤50, N≤10.000; tự tìm đến tối đa 1.000.000 lượt, 250.000 trạng thái, 50.000 trạng thái counter được lưu, 250.000 nhánh và 40 triệu bước. Khi chạm giới hạn, giữ các mốc đã tìm được và ghi **Chưa tìm được** cho mốc còn lại; không suy diễn thành không thể đạt. Nếu chứng minh item không thể xuất hiện từ trạng thái khởi đầu, ghi **Không thể đạt**. Thống kê pity toàn banner dùng bộ đếm riêng, tối đa 50.000 trạng thái, 250.000 nhánh và 40 triệu bước; vượt giới hạn thì phần pity báo không khả dụng và hướng dẫn dùng Simulate. Worker có thể hủy.

**Rate ↔ Hard pity** là bộ tính độc lập cho rate cố định trước hard pity và reset sau mỗi hit: rate thực = p / (1 − (1 − p)^H), p=0 thì 1/H. Không áp dụng công thức này cho soft pity hay chế độ không reset khi trúng sớm.

## Simulate, log pity và History

Mô phỏng 1–1.000.000 lượt, mỗi lượt trả đúng một item cuối. Bảng liệt kê mọi item kể cả số lượng 0; tổng item bằng số lượt. Cùng seed/config/phiên bản engine cho cùng chuỗi.

- Tổng kết số lần pity đến hạn phải **chờ ưu tiên**, số hard pity kích hoạt, số lượt có hard pity, số lần tăng rate soft và số lần trúng trong vùng soft.
- **Pull log** đánh dấu HARD PITY hoặc TRÚNG VÙNG SOFT. Mỗi dòng ghi số lần gọi còn lại đến hard pity của mọi pool đang bật pity.
- Bấm mở dòng để xem từng pool: được gọi hay giữ nguyên, rate mục tiêu tại thời điểm đó, counter trước → sau, còn bao nhiêu lần gọi, có reset hay không.
- “Còn 1 lần gọi” nghĩa là lần gọi pool kế tiếp đủ ngưỡng hard pity; quy tắc thấp vẫn có thể phải chờ ưu tiên. Sau hard pity H=90, còn 90 lần gọi đến hard tiếp theo. Đây là lần gọi của pool, không phải luôn bằng số lượt quay banner.
- Hard pity bảo đảm nhánh mục tiêu tại pool đó, không nhất thiết bảo đảm item cuối bên trong các pool con. Trúng trong vùng soft pity không có nghĩa item chỉ xuất hiện nhờ pity; không gán nhân quả chắc chắn cho một mẫu random.
- Log phân trang 48 lượt; nhập số ở **Tới lượt** để nhảy trang. JSON xuất chứa đủ sequence, counts, cấu hình, seed, tổng kết và log pity.
- Log dùng định dạng thưa: mỗi pool có mảng rolls/after/flags, chỉ lưu lần pool được gọi. Các bit flags: 1=hard, 2=rate được soft boost, 4=trúng mục tiêu, 8=reset. Pool không được gọi được phục hồi bằng counter gần nhất.
- Lưu tối đa 30 history toàn workspace, tổng workspace tối đa 100 MB. Nếu đầy, xuất rồi xóa bớt; app không tự xóa history.
- History cũ vẫn mở được nhưng không có log counter chi tiết chưa từng được lưu. **Dùng cấu hình** tạo banner mới trong profile hiện tại. History vẫn giữ tên profile/banner cũ và snapshot ngay cả khi đã xóa chúng.

## Random engine chung

**Cài đặt chung** chứa RNG và seed áp dụng mọi profile/banner. Calculate dùng mô hình mẫu độc lập đều, không phụ thuộc seed; chỉ Simulate dùng chuỗi RNG. Mỗi lần mô phỏng bắt đầu từ đầu chuỗi, không nối qua banner khác.

- **Custom:** xoshiro128** 1.1, seed uint32 qua bộ trộn xác định trong core/engine.mjs; không dùng Math.random và không dành cho mật mã.
- **Unity giả lập:** Xorshift128 (11/8/19), mở rộng seed bằng 4 đầu ra xoshiro rồi chia uint32 cho 2^32. Không bảo đảm trùng Unity InitState/Random.value. Vector trạng thái [1,2,3,4] cho [2061,6175,4,8224]. [Unity xác nhận dùng họ Xorshift128](https://docs.unity3d.com/ScriptReference/Random.html).
- **Unity · mẫu thực:** lưu Script Unity vào Assets/Editor, mở Tools → GD Toolkit → Export Random trong Unity, xuất JSON rồi nhập RNG JSON vào app. Exporter khôi phục Random.state sau khi chạy. Unity không được nhúng trong exe.

Mỗi pool được gọi tiêu thụ một mẫu, kể cả lượt bảo đảm. File Unity tối đa 3 triệu mẫu; hết mẫu báo lỗi và không trả kết quả thiếu, không lặp lại. Mẫu 1.0 ánh xạ vào nhánh cuối có xác suất dương. Mẫu chỉ giữ trong phiên, cần nhập lại khi mở app; history xem được không cần file RNG. Exporter chưa được kiểm thử trong Unity Editor trên máy phát triển này.

## Phát triển và phát hành

```
npm ci
npm start
npm test
npm run test:desktop
npm run package
```

Node 22.12+ (CI dùng 24), Electron 42, electron-builder tạo NSIS x64. Source: desktop/ (IPC, persistence, updater), core/ (toán, RNG, profile/banner), ui/ (giao diện/worker), unity/ (exporter).

Tests kiểm tra xác suất bằng liệt kê nhánh độc lập, Monte Carlo, pity/reset, reward Markov sau K bản sao, log các pool không được gọi, seed, migration v1/v2 → v3, profile/banner độc lập, currency và updater. Test Electron dùng test-output/profile, không dùng dữ liệu người dùng, và chụp ảnh QA ở test-output/.

Tăng version bằng npm version --no-git-tag-version, cập nhật RELEASE_NOTES.md, chạy tests/build, commit/push main rồi push tag vX.Y.Z. Workflow Windows kiểm thử, đóng gói, phát hành exe/blockmap/latest.yml. Commit chưa phải cập nhật; chỉ stable release mới được updater nhận. Helper tools/github-release.cjs dùng Git Credential Manager trong bộ nhớ; không ghi token vào source/installer. Test live-update kiểm tra feed, tải bộ cài và SHA-512, không chạy installer.

## Màu tier và nhận diện pity

Chọn item trong Setup → nhập tên Tier → **Màu tier**. Chọn một trong sáu màu nhanh hoặc mở bộ chọn màu tùy ý; **Màu mặc định** bỏ màu tùy chỉnh. Các item có cùng tên tier trong một banner dùng chung màu, các banner độc lập. Khi chọn nhiều item, có thể đổi màu chung cho các tier xuất hiện trong nhóm; việc đổi màu cũng áp dụng cho item cùng tier ngoài nhóm đó.

Màu hiển thị trong cây Setup, bảng kết quả và pull log. Chữ tự chọn đen/trắng theo màu nền để dễ đọc. History, export/import và nhân bản banner giữ bảng màu; thay màu hiện tại không đổi history đã lưu hoặc xác suất/chuỗi gacha. History cũ chưa có màu dùng giao diện mặc định.

**Hard pity** có nền vàng, dải màu dày, nhãn ★ TRÚNG HARD PITY và tên quy tắc đã kích hoạt. Lượt trúng trong vùng **soft pity** có nền xanh ngọc và nhãn riêng; đây là trúng khi rate đã tăng, không phải bảo đảm chắc chắn. Chi tiết quy tắc hard/soft cũng được tô màu khi mở từng lượt. Áp dụng cho cả theme sáng và tối.

## Compare · So sánh banner

Chọn 2–6 banner trong profile hiện tại, chọn item mục tiêu riêng cho từng banner, rồi nhập số bản sao tối thiểu K (1–50) và số lượt chung N (1–10.000). Banner trống không chọn được. App không tự suy ra rằng các item cùng tên là cùng một mục tiêu.

So sánh xác suất nhận ít nhất K sau N lượt, rate gốc/dài hạn, pity banner và reset, số lần hard pity kỳ vọng toàn banner, các mốc 50/90/95/99%, currency và chi phí. Biểu đồ vẽ các đường tích lũy trên cùng trục số lượt; từng đường kết thúc ở phạm vi thực sự đã tính. Pity trong pool con vẫn được tính theo mô hình hiện tại.

Các banner giữ currency, số dư và đơn vị tiền riêng; không quy đổi hoặc xếp hạng giá giữa VND, USD hay các currency khác nhau. Giá 0 vẫn là chưa định giá. Kết quả là snapshot có thể xuất JSON; đổi cấu hình hoặc mục tiêu sẽ bỏ kết quả so sánh cũ. Chạm giới hạn tính toán vẫn giữ các mốc đã tìm được. Không cần nhập horizon. Compare dùng mô hình xác suất, không phụ thuộc RNG/seed.

## Players · Nhiều người chơi

Chọn item mục tiêu trong banner hiện tại, số bản sao tối thiểu, số người (1–10.000) và lượt mỗi người (1–10.000). Giới hạn cả nhóm là 2.000.000 lượt. Tất cả người chơi bắt đầu với kho item trống và counter pity giống Setup. Mỗi người quay đủ N lượt; sau khi đạt mục tiêu vẫn tiếp tục quay để ghi số bản sao cuối cùng.

- RNG dùng cài đặt chung: Custom, Unity giả lập hoặc mẫu Unity thực. Một chuỗi RNG tiếp tục xuyên suốt nhóm, không khởi tạo lại cùng seed cho mỗi người; counter và kho item được reset riêng. Cùng seed/mẫu và thông số tái hiện cùng kết quả.
- Mẫu Unity tiêu thụ liên tiếp một mẫu cho mỗi pool được gọi. Hết mẫu báo lỗi, không vòng lại hay trả kết quả một phần.
- Kết quả gồm tỷ lệ nhận ít nhất K, số người đạt/chưa đạt, trung bình/trung vị/min/max bản sao, histogram, tổng item cuối kèm tier, số hard pity và lượt có hard pity, thống kê từng quy tắc. Bảng từng người phân trang 50 người, ghi bản sao, lượt đầu nhận đủ và hard pity.
- Các mốc 50/90/95/99% thực nghiệm tính trên toàn nhóm, kể cả người chưa thành công. Chưa đạt trong N lượt ghi rõ Chưa đạt; không ngoại suy. Đây là lấy mẫu Monte Carlo, không phải kết quả chính xác của Calculate.
- Phân bố thời gian và chi phí đạt mục tiêu trong phần mở rộng chỉ xét người đã thành công. Trung bình cần nạp tính riêng từng người rồi lấy trung bình, không lấy chi phí tại thời gian trung bình trừ số dư. Nhóm chưa thành công không được coi là mất 0 lượt hoặc 0 tiền.
- Chi phí chạy đủ N lượt hiển thị riêng mỗi người và cả nhóm. Số dư banner áp dụng riêng cho mỗi người, không tự trừ Setup.
- Lưu tối đa 20 lịch sử Players toàn workspace, độc lập với 30 history Simulate. Snapshot giữ cấu hình, tier/màu, RNG, thông số, từng người và thống kê; xuất JSON hoặc xóa từng lịch sử. Thay form/banner không sửa snapshot kết quả. Kết quả chưa lưu chỉ giữ trong phiên; cập nhật app sẽ lưu lần chạy Players hiện tại nếu còn chỗ.

Workspace vẫn dùng schema v3, thêm trường tùy chọn playerHistory; workspace cũ không cần chuyển đổi. Tổng giới hạn file vẫn 100 MB. Worker có thể hủy để không khóa giao diện.
