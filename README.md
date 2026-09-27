# Fluent — English for UI/UX

Ứng dụng web nội bộ giúp người mất gốc học lại tiếng Anh, tiến tới IELTS 6.5 và dùng tiếng Anh tự tin trong công việc UI/UX.

## Bản public

Phiên bản flashcard tối giản được tự động triển khai bằng GitHub Pages tại:

https://soainq.github.io/english-flashcards/simple/

GitHub Pages lưu tiến trình trong trình duyệt của từng thiết bị. Tính năng đồng bộ bằng hồ sơ/PIN cần máy chủ Node.js và không khả dụng trên bản Pages tĩnh.

## Chạy ngay

Yêu cầu Node.js 18 trở lên. Dự án không cần cài thư viện ngoài.

```bash
npm start
```

Mở `http://localhost:4173`. Trên thiết bị khác cùng mạng, mở `http://IP-CỦA-MÁY-CHỦ:4173`.

Phiên bản tối giản mới nằm tại `http://localhost:4173/simple/`: 10 từ mới mỗi ngày, ôn lũy tiến, flashcards hai mặt và tổng hợp theo tuần.

## Kho từ mở, không phụ thuộc API

Phiên bản tối giản hiện có 6 chủ đề tuần (420 từ): đồ vật, động vật, hoạt động, UI/UX, đồ ăn và du lịch. Trong đó 140 từ mới nhất được biên tập tự động từ bản trích tiếng Việt của Wiktionary do Kaikki cung cấp. Mỗi từ có nghĩa Việt, IPA, 3 câu mẫu và voice MP3 cục bộ.

- Wiktionary/Kaikki: CC BY-SA và GFDL.
- Open English WordNet: CC BY 4.0, được bộ nhập hỗ trợ bổ sung định nghĩa/câu ví dụ khi có gói JSON.
- Dữ liệu sau khi biên tập nằm trong `public/simple/open-vocabulary.js`; lúc học không gọi API, nên không có quota hằng ngày.

Để tạo lại kho từ sau khi tải các bản dữ liệu mở:

```bash
npm run vocabulary
npm run audio
```

Có thể chỉ định tệp nguồn khác bằng `--wiktionary`, `--wordnet` và `--output` khi chạy trực tiếp `scripts/build-open-vocabulary.js`.

Giao diện học tập tham khảo các nguyên tắc component rõ ràng, accessible của shadcn/ui và cách thể hiện trạng thái gọn của Mantine; mã ứng dụng vẫn là HTML/CSS/JavaScript thuần để tải nhanh và dùng offline.

## Đồng bộ nhiều thiết bị

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
