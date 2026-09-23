# `xmark` - Cross-Platform Image Watermark Tool

`xmark` là ứng dụng desktop chạy đa nền tảng (Windows, macOS, Linux) hỗ trợ đóng dấu bản quyền (watermark hình ảnh logo hoặc văn bản) lên hàng loạt ảnh với hiệu năng cao nhờ Rust và giao diện trực quan bằng React + Tailwind CSS.

---

## 🚀 Hướng dẫn chạy ứng dụng

### 1. Yêu cầu môi trường (Prerequisites)
- **Node.js**: Phiên bản 18+ (đã có sẵn trên máy của bạn: `v24.18.0`).
- **Rust & Cargo**: Phiên bản 1.77+ (đã có sẵn trên máy của bạn: `1.90.0`).
- **C++ Build Tools**: Đã cài đặt qua Visual Studio (workload *Desktop development with C++*).
- **WebView2 Runtime**: Có sẵn mặc định trên Windows 10/11.

---

### 2. Chế độ Phát triển (Development Mode)

Chạy lệnh sau trong PowerShell tại thư mục dự án:

```powershell
npm run tauri dev
```

*Lệnh này sẽ:*
1. Khởi chạy Vite dev server tại cổng `5173` (hỗ trợ Hot Module Replacement - HMR).
2. Tự động biên dịch mã nguồn Rust backend.
3. Khởi chạy cửa sổ ứng dụng desktop `xmark`.

---

### 3. Đóng gói bản cài đặt (Build Production)

Khi muốn đóng gói thành file cài đặt `.exe` / `.msi`:

```powershell
npm run tauri build
```

File cài đặt hoàn chỉnh sẽ nằm ở:
```text
src-tauri\target\release\bundle\msi\
hoặc
src-tauri\target\release\bundle\nsis\
```

---

## 🛠️ Hướng dẫn sử dụng các tính năng

1. **Thêm ảnh nguồn (Cột bên trái)**:
   - Nhấn **Add Images** để chọn một hoặc nhiều file ảnh lẻ.
   - Nhấn **Add Folder** để chọn thư mục; chương trình sẽ tự động quét các file định dạng `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`.
   - Bấm vào từng ảnh trong danh sách để xem trước hoặc bấm biểu tượng thùng rác để xóa ảnh khỏi danh sách.

2. **Cấu hình Watermark (Cột bên phải)**:
   - **Text Watermark**: Tích bật ô chọn, nhập nội dung chữ, chỉnh cỡ chữ (font size) và chọn màu chữ.
   - **Logo / Image**: Tích bật ô chọn, bấm chọn file logo từ máy tính và kéo thanh trượt chỉnh kích thước (scale).
   - **Opacity (Độ mờ)**: Điều chỉnh từ 5% đến 100% (mặc định 50%).
   - **Repeat (Mẫu lặp)**:
     - *Single Position*: Đóng dấu tại 1 vị trí cố định theo lưới 9 điểm (Góc trên-trái, giữa, góc dưới-phải,...).
     - *Tile Repeat*: Lặp lại watermark đều khắp toàn bộ ảnh dạng lưới chống sao chép trái phép.
   - **Padding / Margin**: Tùy chỉnh khoảng cách viền.

3. **Live Preview (Khung ở giữa)**:
   - Hiển thị kết quả watermark thời gian thực trên Canvas trước khi quyết định xuất file.

4. **Xuất file hàng loạt (Thanh Footer phía dưới)**:
   - Nhấn **Choose Output Folder** để chọn thư mục lưu ảnh mới.
   - Nhấn **Apply & Export All** để bắt đầu xử lý đa luồng siêu tốc bằng Rayon trong Rust.
   - Theo dõi tiến độ xử lý và thông báo hoàn thành trên thanh trạng thái.
