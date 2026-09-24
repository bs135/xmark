# Kế hoạch phát triển chi tiết `xMark` v0.2.0 (Watermark Tool)

## 1. Đánh giá tính khả thi (Feasibility)
Tất cả các yêu cầu cải tiến và sửa lỗi trong phiên bản v0.2.0 đều hoàn toàn khả thi với kiến trúc công nghệ hiện tại (React 19 + Zustand + Tailwind CSS ở Frontend, Tauri v2 + Rust + image/imageproc/ab_glyph ở Backend):
- **Lưu cấu hình lần dùng trước**: Sử dụng `tauri-plugin-store` lưu vào tệp `settings.json` trong thư mục App Data của hệ điều hành, đảm bảo an toàn, độc lập và bền vững hơn `localStorage` của WebView.
- **Đa ngôn ngữ**: Tích hợp `react-i18next` và `i18next` chuẩn hóa quản lý bản dịch (Tiếng Việt & English), dễ bảo trì và mở rộng thêm ngôn ngữ.
- **Custom Titlebar**: Thiết lập `"decorations": false` trong `tauri.conf.json`, tự render thanh điều khiển (Minimize, Maximize/Restore, Close) qua `@tauri-apps/api/window` kết hợp thuộc tính `data-tauri-drag-region` trên `Header`.
- **Nguyên nhân bug text căn giữa (Center) bị lệch trái**: Hàm `render_text_as_image` trước đây ước lượng chiều rộng chữ bằng công thức thô `font_size * 0.6 * số_ký_tự` thay vì đo đạc thực tế, dẫn đến canvas ảnh chữ bị thừa một khoảng trống trong suốt bên phải. Khi định vị trung tâm, cả khối canvas được căn giữa nhưng phần glyph hiển thị lại lệch trái. Giải pháp: đo glyph thực tế bằng `imageproc::drawing::text_size` kết hợp hàm `trim_transparent` cắt sát biên chữ thực.
- **Nguyên nhân bug Live Preview không hiển thị ảnh**: Tauri v2 mặc định chặn nạp tài nguyên từ hệ thống tệp cục bộ vào WebView nếu giao thức asset protocol chưa được cấp phép. Khi kích hoạt `protocol-asset` trên Rust backend và cấu hình `app.security.assetProtocol.enable: true` với `scope: ["**"]`, canvas Live Preview nạp được ảnh mượt mà qua `convertFileSrc()`.

---

## 2. Phương án kỹ thuật chi tiết

### 2.1. Nhớ lại cấu hình lần dùng trước (Settings Persistence)
- **Plugin**: Bổ sung `tauri-plugin-store` (Rust crate) và `@tauri-apps/plugin-store` (npm package), đăng ký quyền trong `capabilities/default.json`.
- **Cơ chế lưu trữ (`src/store/persist.ts`)**:
  - Tự động lưu `outputDir`, `config` (cài đặt watermark), `theme` ('dark' | 'light'), `language` ('en' | 'vi') vào file `settings.json`.
  - Tích hợp debounce (~300ms) khi người dùng kéo slider cấu hình để tránh ghi đĩa liên tục.
  - Khi khởi động ứng dụng, hydrate các giá trị đã lưu vào Zustand store; nếu chưa có sẽ dùng `defaultConfig`.
  - Nút **Reset** khôi phục cấu hình watermark về mặc định mà không làm mất thư mục xuất (`outputDir`) đã chọn.

### 2.2. Cải tiến Text Watermark
- **Đơn vị kích thước chữ**:
  - Hỗ trợ 2 chế độ: Pixel (`px`) và Phần trăm (`%`).
  - Phạm vi: `12px - 250px` cho chế độ pixel; `1% - 80%` cho chế độ phần trăm.
  - Ý nghĩa chế độ `%`: Chiều ngang của toàn bộ dòng text chiếm bao nhiêu phần trăm so với chiều ngang của ảnh gốc input.
- **Kỹ thuật chuyển text thành ảnh theo tỉ lệ**:
  - Khi ở chế độ `%`, backend render text ra ảnh tạm với kích thước chuẩn (120px) để lấy đúng tỉ lệ khung hình (aspect ratio) của chữ sau khi đã đo đạc glyph.
  - Sau đó resize ảnh text theo chiều rộng mục tiêu `desired_w = base_image_width * (percent / 100)` bằng bộ lọc Lanczos3, giữ chất lượng chữ sắc nét và chính xác theo độ phân giải ảnh gốc.
- **Tùy chọn Font Family & Kiểu chữ Bold / Italic**:
  - Nhúng sẵn 5 bộ font mã nguồn mở chuẩn OFL (SIL Open Font License):
    1. **Inter** (mặc định - hiện đại, đa dụng)
    2. **Roboto** (sans-serif)
    3. **Roboto Mono** (đơn cách - monospace)
    4. **Arvo** (serif - có chân)
    5. **Pacifico** (viết tay nghệ thuật - script/cursive)
  - Hỗ trợ công tắc **In đậm (Bold)** (sử dụng thuật toán alpha dilation mô phỏng độ dày nét) và **In nghiêng (Italic)** (mô phỏng shear biến dạng ngang góc nghiêng), hoạt động đồng nhất giữa Rust engine và canvas Live Preview.

### 2.3. Chống chồng lấn Logo và Text Watermark (Stacked Layout)
- Khi người dùng bật đồng thời cả **Logo / Image** và **Text Watermark**:
  - Thuật toán `apply_stacked_watermark` trong `engine.rs` sẽ gom logo và text thành một "khối đơn vị liên hợp" (composite unit).
  - Logo luôn được đặt ở trên, text nằm ngay phía dưới với khoảng cách đệm an toàn (`STACK_SPACING_PX = 12px` tương ứng trên ảnh chuẩn).
  - Cả hai được căn giữa theo trục ngang của phần tử rộng hơn.
  - Khối liên hợp này sau đó được định vị theo lưới 9 điểm (Single position) hoặc lặp ma trận (Tile repeat) mà không bao giờ bị đè lên nhau.
  - Canvas trên Frontend (`LivePreview.tsx`) áp dụng cùng quy tắc tính toạ độ để hình ảnh xem trước khớp hoàn toàn với kết quả xuất.

### 2.4. Cải tiến UI / UX
- **Ẩn thanh Title Bar hệ thống (Frameless Window)**:
  - Ẩn thanh title bar mặc định của Windows.
  - Header của ứng dụng trở thành thanh tiêu đề tùy chỉnh: hỗ trợ kéo thả cửa sổ (`data-tauri-drag-region`) và các nút thao tác thu nhỏ, phóng to/phục hồi, đóng ứng dụng.
- **Hỗ trợ Dark / Light Mode**:
  - Cấu hình Tailwind CSS với `darkMode: 'class'`.
  - Tự động gắn class `dark` vào thẻ gốc và lưu lựa chọn của người dùng.
  - Bổ sung nút chuyển đổi giao diện Sun/Moon trên Header.
  - Tinh chỉnh màu nền, border và chữ trên tất cả 3 cột giao diện đảm bảo độ tương phản cao ở cả 2 chế độ.
- **Hỗ trợ Đa ngôn ngữ (Tiếng Việt / English)**:
  - Tích hợp `react-i18next`.
  - Bộ từ điển song ngữ hoàn chỉnh đặt tại `src/i18n/locales/vi.json` và `src/i18n/locales/en.json`.
  - Bổ sung nút chuyển đổi nhanh ngôn ngữ trên thanh Header.
- **Chuẩn hóa Display Name**:
  - Hiển thị thống nhất tên thương hiệu thành **xMark** trên toàn bộ giao diện (Title, Header, Placeholder), giữ nguyên định danh mã nguồn `xmark`.

### 2.5. Sửa lỗi (Bug Fixes)
- **Khắc phục lỗi căn giữa bị lệch**:
  - Thay thế ước lượng chiều rộng thô bằng `imageproc::drawing::text_size`.
  - Áp dụng thuật toán quét biên pixel thực tế `trim_transparent` để loại bỏ viền trong suốt thừa xung quanh chữ, giúp việc định vị theo toạ độ tuyệt đối và tương đối luôn chính xác từng pixel.
- **Khắc phục lỗi Live Preview**:
  - Cấu hình mở quyền cho giao thức `assetProtocol` trong `tauri.conf.json` và thêm feature `protocol-asset` vào crate `tauri` trong `Cargo.toml`.
  - Bổ sung cờ `cancelled` trong hook `useEffect` của `LivePreview.tsx` để loại bỏ hiện tượng race-condition khi người dùng chọn đổi ảnh liên tục.
  - Áp dụng kỹ thuật debounce (~80ms) khi thay đổi giá trị watermark settings giúp preview phản hồi mượt mà, không bị giật lag khi kéo thanh trượt.

---

## 3. Danh sách các bước triển khai (Todos & Commit History)

Các bước đã được thực hiện và kiểm thử trên branch `develop` tuân theo chuẩn **Conventional Commits**:

1. `0af562e` — **feat**: add tauri-plugin-store for persisting app settings
2. `2c3557d` — **feat**: persist output folder and watermark settings via tauri-plugin-store
3. `cc7eceb` — **feat**: add percent-based text sizing, fix text centering, and stack logo/text watermarks
4. `ffafd8f` — **feat**: add custom titlebar with window controls
5. `a989ced` — **feat**: add dark/light theme support
6. `762da81` — **feat**: add Vietnamese/English i18n support
7. `d7d57af` — **chore**: bump version to 0.2.0
8. `0536541` — **fix**: stack Font Size and Text Color onto separate rows in watermark panel
9. `c3a7e69` — **fix**: enable Tauri asset protocol so Live Preview can load local images
10. `66995b6` — **feat**: add font family selection and bold/italic styles for text watermark
11. `bc95ac4` — **chore**: remove fontSize percent hint
12. `39af618` — **chore**: update UI display name to xMark

---

## 4. Kết quả kiểm thử & Nghiệm thu
- **Frontend**: `npm run build` (`tsc -b && vite build`) hoàn thành thành công không có lỗi type. `npm run lint` (`oxlint`) kiểm tra sạch lỗi.
- **Backend**: `cargo check` và `cargo build` trên Rust hoàn thành trơn tru, nạp đủ 5 embedded font family.
- **Đóng gói Bundle**: `npx tauri build --debug` tạo gói cài đặt MSI và NSIS thành công cho phiên bản v0.2.0.
