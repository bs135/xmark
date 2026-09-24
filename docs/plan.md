# Kế hoạch phát triển ứng dụng `xmark` (Watermark Tool)

## 1. Tổng quan dự án
`xmark` là ứng dụng desktop cross-platform (Windows, macOS, Linux) cho phép đóng dấu watermark (hình ảnh logo và/hoặc text) lên hàng loạt ảnh với hiệu năng cao, giao diện trực quan và cấu hình linh hoạt.

---

## 2. Công nghệ & Kiến trúc đề xuất

### 2.1 Backend (Tauri v2 + Rust)
- **Framework**: Tauri v2 (`@tauri-apps/cli`, `@tauri-apps/api`)
  - Nhẹ, bảo mật, tiêu tốn ít RAM hơn Electron.
  - Hỗ trợ tốt cross-platform (Windows WebView2, macOS WebKit, Linux WebKitGTK).
- **Xử lý ảnh & Song song (Rust)**:
  - `image` crate: Đọc, ghi và xử lý pixel (PNG, JPEG, WebP, BMP, v.v.).
  - `imageproc` & `ab_glyph`: Render chữ lên ảnh kèm font tùy chỉnh (hỗ trợ Tiếng Việt / Unicode).
  - `rayon`: Xử lý batch watermark song song tận dụng tối đa đa nhân CPU.
- **Tauri Plugins**:
  - `@tauri-apps/plugin-dialog`: Hộp thoại chọn file/thư mục gốc và thư mục output.
  - `@tauri-apps/plugin-fs`: Đọc ghi tệp tin.
  - `@tauri-apps/plugin-opener`: Mở thư mục kết quả khi hoàn thành.

### 2.2 Frontend (React + TypeScript)
- **Bundler & Framework**: Vite + React 19 + TypeScript.
- **Styling**: Tailwind CSS v3 + `lucide-react` (icons).
- **State Management**: `zustand` (quản lý danh sách file, cài đặt watermark, trạng thái export).
- **Virtualization**: Danh sách ảnh ảo hóa tối ưu hiệu năng.
- **Preview**: Canvas preview tức thì thời gian thực.

---

## 3. Cấu trúc thư mục dự án

```text
xmark/
├── src-tauri/                # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json       # Cấu hình cửa sổ, permissions, plugins
│   ├── capabilities/         # Quyền hạn API (dialog, fs, opener)
│   └── src/
│       ├── main.rs           # Entry point
│       ├── lib.rs            # Khởi tạo Tauri app, đăng ký commands
│       ├── commands.rs       # Tauri commands gọi từ Frontend
│       ├── engine.rs         # Core xử lý ảnh và chèn watermark
│       └── models.rs         # Data types chia sẻ giữa Rust & TS
├── src/                      # React Frontend
│   ├── assets/               # Fonts và static assets
│   ├── components/
│   │   ├── layout/           # Header, FooterBar
│   │   ├── watermark/        # WatermarkConfigPanel (vị trí 9 điểm, opacity, repeat, color)
│   │   ├── preview/          # LivePreview Canvas
│   │   └── file-list/        # FileListPanel (danh sách ảnh)
│   ├── store/
│   │   └── useAppStore.ts    # Zustand store trung tâm
│   ├── types/
│   │   └── watermark.ts      # TypeScript interfaces
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 4. Các tính năng chính

1. **Quản lý Nguồn ảnh**:
   - Thêm từng file ảnh hoặc duyệt cả thư mục (tự động lọc `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`).
   - Hiển thị danh sách ảnh kèm kích thước, phân giải và nút xóa tiện lợi.
2. **Cấu hình Watermark**:
   - **Text Watermark**: Nhập text tùy ý, điều chỉnh cỡ chữ (font-size) và bảng chọn màu (color picker).
   - **Logo / Image Watermark**: Chọn file ảnh logo từ máy tính, điều chỉnh tỉ lệ kích thước (scale).
   - **Độ mờ (Opacity)**: Kéo thanh trượt từ 5% đến 100%.
   - **Vị trí (Position)**: Lưới 9 điểm (Top-Left, Center, Bottom-Right, v.v.).
   - **Lặp lại (Repeat Mode)**: Tùy chọn chèn đơn lẻ hoặc lặp lại dạng lưới (Tile) toàn màn hình.
   - **Padding / Margin**: Tùy chỉnh khoảng cách viền.
3. **Live Preview trực tiếp**:
   - Khung Canvas hiển thị thời gian thực theo cấu hình đang chọn.
4. **Xử lý Xuất file hàng loạt (Rayon Multi-threading)**:
   - Chọn thư mục Output lưu file.
   - Chạy đa luồng song song trên CPU, báo tiến độ thời gian thực.
