# Fluent — English for UI/UX

Ứng dụng web nội bộ giúp người mất gốc học lại tiếng Anh, tiến tới IELTS 6.5 và dùng tiếng Anh tự tin trong công việc UI/UX.

## Bản public

Phiên bản flashcard tối giản được tự động triển khai bằng GitHub Pages tại:

https://soainq.github.io/english-flashcards/simple/

GitHub Pages lưu tiến trình ngay trên từng thiết bị và có thể tự động hợp nhất qua Firebase khi đăng nhập cùng một tài khoản Google. Bản Pages cũng hỗ trợ xuất/nhập tệp sao lưu.

## Chạy ngay

Yêu cầu Node.js 18 trở lên. Dự án không cần cài thư viện ngoài.

```bash
npm start
```

Mở `http://localhost:4173`. Trên thiết bị khác cùng mạng, mở `http://IP-CỦA-MÁY-CHỦ:4173`.

Phiên bản tối giản mới nằm tại `http://localhost:4173/simple/`: 10 từ mới mỗi ngày, ôn lũy tiến, flashcards hai mặt và tổng hợp theo tuần.

## Kho từ mở, không phụ thuộc API

Phiên bản tối giản hiện có 6 chủ đề tuần (420 từ): đồ vật, động vật, hoạt động, UI/UX, đồ ăn và du lịch. Trong đó 140 từ mới nhất được biên tập tự động từ bản trích tiếng Việt của Wiktionary do Kaikki cung cấp. Mỗi từ có nghĩa Việt, IPA và voice MP3 cục bộ. Câu mẫu mới lấy từ Tatoeba, kèm nguồn dự phòng và lịch sử chống lặp (xem bên dưới).

- Wiktionary/Kaikki: CC BY-SA và GFDL.
- Open English WordNet: CC BY 4.0, được bộ nhập hỗ trợ bổ sung định nghĩa/câu ví dụ khi có gói JSON.
- Dữ liệu sau khi biên tập nằm trong `public/simple/open-vocabulary.js`; từ vựng không phụ thuộc API; câu mẫu mới dùng Tatoeba và bộ nhớ đệm.

Để tạo lại kho từ sau khi tải các bản dữ liệu mở:

```bash
npm run vocabulary
npm run audio
```

Có thể chỉ định tệp nguồn khác bằng `--wiktionary`, `--wordnet` và `--output` khi chạy trực tiếp `scripts/build-open-vocabulary.js`.

Giao diện học tập tham khảo các nguyên tắc component rõ ràng, accessible của shadcn/ui và cách thể hiện trạng thái gọn của Mantine; mã ứng dụng vẫn là HTML/CSS/JavaScript thuần để tải nhanh và dùng offline.

## Đồng bộ nhiều thiết bị bằng Firebase

Đây là phương án nên dùng cho nhu cầu cá nhân: trang vẫn chạy miễn phí trên GitHub Pages, không cần để máy tính ở nhà hoạt động như máy chủ. Firebase Authentication nhận diện cùng một tài khoản Google và Realtime Database lưu một bản tiến độ riêng theo `uid`. Gói Spark hiện có hạn mức miễn phí đủ lớn cho một người học.

Thiết lập một lần:

1. Tạo project tại [Firebase Console](https://console.firebase.google.com/) và giữ gói **Spark**.
2. Vào **Authentication → Sign-in method**, bật **Google**.
3. Trong **Authentication → Settings → Authorized domains**, thêm `soainq.github.io`. Nếu kiểm thử cục bộ, thêm `localhost`.
4. Vào **Realtime Database → Create database**. Chọn khu vực gần bạn, chẳng hạn Singapore. Không chọn chế độ công khai.
5. Mở tab **Rules**, dán toàn bộ nội dung [database.rules.json](./database.rules.json) và bấm Publish. Rule chỉ cho tài khoản đã đăng nhập đọc/ghi đường dẫn mang đúng `uid` của mình.
6. Vào **Project settings → Your apps → Web app**, tạo một web app và sao chép object `firebaseConfig`.
7. Mở [public/firebase-config.js](./public/firebase-config.js), thay `null` bằng object vừa sao chép. Đây là định danh công khai của web app, không phải mật khẩu hay service-account key; quyền truy cập vẫn do Authentication và Database Rules kiểm soát.
8. Commit và push lên `main`. GitHub Actions sẽ cập nhật Pages. Trên mỗi thiết bị, mở **Trên máy → Đăng nhập Google** và chọn cùng một tài khoản.

Mỗi thay đổi được ghi vào `localStorage` trước, nên đóng trình duyệt hay mất mạng không làm mất buổi học. Khi có mạng, ứng dụng dùng transaction để đọc bản Firebase mới nhất, hợp nhất từng ngày, từng thẻ, trạng thái bài test và lịch sử câu mẫu, rồi ghi kết quả chung. Mở lại tab, đưa tab lên trước hoặc kết nối lại mạng đều kích hoạt đồng bộ. Không xóa dữ liệu trình duyệt trước lần đăng nhập Firebase đầu tiên; sau lần đầu, bản cục bộ hiện tại sẽ được đẩy lên và hợp nhất.

Firebase Realtime Database Web SDK không cam kết giữ hàng đợi ghi qua việc đóng hẳn trang khi đang offline. Ứng dụng giải quyết điểm này bằng bản `localStorage` riêng và thử lại ở lần mở sau. Vẫn nên tải tệp sao lưu định kỳ ở **Đồng bộ thiết bị → Tải bản sao lưu**.

## Máy chủ đồng bộ riêng (tùy chọn)

Nếu không muốn dùng Firebase, bạn vẫn có thể chạy API Node.js có sẵn:

1. Chạy ứng dụng trên một máy chủ luôn hoạt động hoặc triển khai container lên hạ tầng nội bộ.
2. Trong ứng dụng, mở **Hồ sơ học tập**, nhập tên, mã hồ sơ và PIN.
3. Trên thiết bị khác, truy cập cùng địa chỉ web và đăng nhập bằng đúng mã hồ sơ + PIN.

Tiến độ được lưu hai lớp:

- `localStorage` trên từng thiết bị, nên vẫn học được khi mất mạng.
- File JSON phía máy chủ tại `data/store.json`, dùng để đồng bộ giữa các thiết bị.

Có thể đặt biến môi trường `DATA_DIR` để chuyển nơi lưu dữ liệu sang persistent volume. Khi triển khai thật, nên đặt ứng dụng sau HTTPS để micro, PWA và cookie bảo mật hoạt động ổn định.

Ví dụ Docker:

```bash
docker build -t fluent-uiux .
docker run -p 4173:4173 -v fluent-data:/app/data fluent-uiux
```

## Nội dung hiện có

- Lộ trình 24 tuần: A0 → A1 → A2 → English for UI/UX → IELTS 6.5.
- 34 bài học khởi động, 170 từ/cụm từ; mỗi ngày 5 từ.
- Mỗi từ có IPA, nghĩa, câu ví dụ, IPA của câu và bản dịch tiếng Việt.
- 340 tệp phát âm từ và câu được tạo sẵn bằng giọng Mỹ Samantha, nghe nhất quán trên mọi thiết bị.
- Ba tốc độ nghe, shadowing và nhận diện giọng nói nếu trình duyệt hỗ trợ.
- Ôn tập ngắt quãng theo mức: chưa nhớ (1 ngày), hơi khó (3 ngày), đã nhớ (7–30 ngày).
- Theo dõi streak, số từ đã học, bài hoàn thành và lịch hoạt động 28 ngày.
- PWA và service worker lưu cả nội dung lẫn âm thanh để tiếp tục học khi mất mạng.

## Nhịp học đề xuất

- 10 phút: học 5 từ mới bằng nghe → nhìn IPA → tự nói.
- 10 phút: shadowing 3 câu mẫu, mỗi câu 3–5 lượt.
- 10–15 phút: kỹ năng chính trong ngày (ngữ pháp, nghe, UI/UX, đọc hoặc viết).
- 5 phút: ôn các thẻ đến hạn.

Chủ nhật nên làm bài kiểm tra ngắn và thu âm một đoạn nói 2–3 phút để theo dõi phát âm thực tế.

## Kiểm tra dự án

```bash
npm run check
```

Lưu ý: đây là ứng dụng học tập nội bộ gọn nhẹ. Nếu mở công khai cho nhiều người dùng, nên thay file JSON bằng cơ sở dữ liệu, thêm sao lưu định kỳ và lớp xác thực mạnh hơn.

### Tạo lại tệp phát âm trên macOS

Máy cần có lệnh `say` và `ffmpeg`. Các tệp hiện tại đã được tạo sẵn; chỉ cần chạy lại khi thay đổi nội dung:

```bash
FORCE_AUDIO=1 npm run audio
```

## Cập nhật flashcard và kiểm tra ghi nhớ

- Màn Hôm nay và Thẻ đã học dùng chiều cao cửa sổ trên desktop, thay cho thẻ cao cố định. Các tab ẩn thanh cuộn nhưng vẫn cuộn được bằng chuột, cảm ứng và bàn phím; màn hình rất thấp hoặc phóng to vẫn có thể cuộn để đọc đủ nội dung.
- Nút **Kiểm tra ghi nhớ** / **Kiểm tra ôn tập** chỉ cho hoàn tất từ khi nhập đúng từ tiếng Anh từ nghĩa Việt. Một gạch tương ứng một ký tự, giữ khoảng cách giữa các từ. Không phân biệt hoa/thường, bỏ khoảng trắng thừa; vẫn yêu cầu đúng chính tả.
- Sai ba lần ở một từ sẽ bắt buộc xem lại từ rồi làm lại bài test. Số lần sai và trạng thái học lại được lưu qua tải lại trang, sao lưu và đồng bộ.
- **Thẻ đã học → Kiểm tra … từ** kiểm tra bộ thẻ đang được lọc theo tuần/ngày/trạng thái. Kết quả cập nhật lịch ôn; sai ba lần đưa từ về trạng thái cần ôn.

### Câu mẫu mới

Ứng dụng dùng [Tatoeba API v1](https://api.tatoeba.org/) công khai, không cần khóa API. Mỗi lượt chọn ngẫu nhiên tối đa ba câu ngắn chứa đúng từ/cụm từ, bỏ câu chưa được duyệt và câu không có người sở hữu. Các câu cũ sinh bằng cách thay từ vào cùng khuôn đã bị loại khỏi nguồn dự phòng.

- Lưu lịch sử theo nội dung câu đã chuẩn hóa, dùng chung giữa các từ, các buổi học và ôn tập. Lật lại cùng thẻ vẫn giữ câu hiện tại; **Đổi câu mẫu** lấy lượt mới.
- Lưu đệm câu chưa dùng cho tối đa 30 từ để hỗ trợ mất mạng. Kho câu là hữu hạn: khi hết câu, API lỗi hoặc không có đủ câu phù hợp, giao diện thông báo thay vì tái sử dụng câu đã xem. Không thể cam kết có vô hạn câu cho mọi cụm từ.
- Ưu tiên nguồn có bản dịch Việt; bản dịch chỉ hiện khi nguồn cung cấp. Câu mới được đọc bằng giọng tiếng Anh của thiết bị; không phát MP3 của câu cũ cho nội dung mới.
- Mỗi câu và bản dịch có liên kết về Tatoeba, người đóng góp và giấy phép theo dữ liệu API (thường CC BY 2.0 FR). Nội dung cộng đồng có thể có nghĩa khác của từ đa nghĩa.
- Lịch sử nằm trong dữ liệu tiến độ: giữ bản sao lưu để tránh mất lịch sử khi xóa dữ liệu trình duyệt. Nhiều thiết bị chỉ chia sẻ lịch sử sau khi hợp nhất/đồng bộ; hai thiết bị cùng học khi mất mạng vẫn có thể gặp cùng câu.

### Các phương án dự phòng trên GitHub Pages

GitHub Pages chỉ phục vụ tệp tĩnh, nên mã hồ sơ/PIN chỉ dùng được khi bạn có máy chủ Node.js riêng. Firebase hoạt động trực tiếp từ Pages và là lựa chọn mặc định. Luồng máy chủ riêng vẫn kiểm tra API trước khi gửi PIN, nhận diện phản hồi HTML và hiển thị hướng dẫn thay vì lỗi `Unexpected token '<'`.

**Dùng ngay, không cần máy chủ:** mở **Trên máy → Tải bản sao lưu**, chuyển tệp JSON sang thiết bị khác, chọn **Nhập bản sao lưu**. Dữ liệu được hợp nhất, không thay toàn bộ tiến độ. Tệp không chứa PIN hoặc token đăng nhập.

**Tự động đồng bộ:** triển khai máy chủ Node.js của repo trên một địa chỉ HTTPS có ổ lưu trữ bền vững, rồi đặt:

```bash
SYNC_ALLOWED_ORIGINS=https://soainq.github.io DATA_DIR=/persistent/vocab NODE_ENV=production npm start
```

Trong hộp Đồng bộ của bản Pages, nhập địa chỉ gốc của máy chủ vào **Địa chỉ máy chủ đồng bộ**, ví dụ `https://vocab.example.com`, rồi đăng nhập bằng cùng mã hồ sơ/PIN trên từng thiết bị. Danh sách `SYNC_ALLOWED_ORIGINS` có thể chứa nhiều origin, phân cách bằng dấu phẩy; không thêm đường dẫn `/english-flashcards` vào origin.

Kết nối từ Pages dùng token giới hạn phiên để không phụ thuộc cookie bên thứ ba; PIN không được lưu trên trình duyệt. Máy chủ chỉ cho các origin được cấu hình truy cập API. Phiên hiện nằm trong bộ nhớ máy chủ, nên cần đăng nhập lại sau khi máy chủ khởi động lại. Chạy trực tiếp giao diện và API trên cùng máy chủ vẫn dùng cookie HttpOnly như trước.

### Kiểm thử giao diện (tùy chọn)

```bash
npm run check
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

Bộ kiểm thử trình duyệt dùng câu mẫu giả lập để không phụ thuộc mạng. Bao gồm nhập đúng/sai, khóa sau ba lần sai, tải lại trang, ôn tập, kiểm tra từ thư viện, xử lý HTML khi đồng bộ và đo phần tràn ở desktop/mobile. `PLAYWRIGHT_MODULE` và `BROWSER_EXECUTABLE` có thể trỏ đến thư viện/trình duyệt đã cài sẵn.
