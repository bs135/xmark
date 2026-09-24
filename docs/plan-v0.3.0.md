# Kế hoạch phát triển chi tiết `xMark` v0.3.0

## 1. Đánh giá tính khả thi (Feasibility)

Tất cả yêu cầu đều khả thi với kiến trúc hiện tại (Tauri v2 + React + Rust). Điều chỉnh nhỏ:

- **CI/CD**: Tauri v2 hỗ trợ build đa nền tảng qua `tauri-action` (GitHub Action chính thức của tauri-apps) chạy trên runner `macos-14` (Apple Silicon ARM64), `windows-latest`, `ubuntu-22.04` (đã bỏ runner `macos-13` Intel x64). Semver tag tự động cần một bước "bump version + tạo tag" trước khi gọi `tauri-action` (action này tự tạo GitHub Release khi có tag `v*`). Thêm mẫu `assetNamePattern` để bổ sung platform vào tên file release asset. Gộp luồng `workflow_dispatch` trực tiếp vào `release.yml`.
- **Chặn F5 / Context menu**: Đây là hành vi mặc định của WebView2 (Windows)/WKWebView (macOS)/WebKitGTK (Linux). Cách xử lý chuẩn nhất và nhất quán trên cả 3 nền tảng là chặn ở tầng JavaScript (frontend): lắng nghe sự kiện `keydown` (chặn F5, Ctrl+R, Cmd+R) và `contextmenu` (chặn menu chuột phải mặc định) ở cấp `window`, không cần code Rust riêng cho từng nền tảng.
- **App icon**: Cần cài thêm `@tauri-apps/cli` đã có sẵn `tauri icon` command để sinh toàn bộ icon set (png/ico/icns đủ kích thước) từ 1 file nguồn (khuyến nghị PNG nguồn ≥1024x1024, nhưng CLI hỗ trợ nhận input SVG qua rendering thư viện `resvg` tích hợp sẵn). Sẽ dùng lệnh `npx tauri icon .tmp/icon.svg` để tạo lại toàn bộ `src-tauri/icons/`.
- **Title bar icon**: Hiện tại `Header.tsx` đang dùng icon `Layers` (lucide-react) trong khối vuông màu sky-500 làm logo hiển thị trên custom titlebar → thay bằng ảnh PNG xuất ra từ icon mới.
- **README chuẩn hoá + MIT License**: Không có rủi ro kỹ thuật, chỉ là công việc biên tập/tài liệu.

Không có yêu cầu nào cần điều chỉnh phạm vi; giữ nguyên như đề xuất.

---

## 2. Phương án kỹ thuật

### 2.1. CI/CD — GitHub Actions release & artifact workflow

File: `.github/workflows/release.yml`

**Trigger 1 — `push` to `main`:**
1. Job `bump-tag`: chạy trên `ubuntu-latest`.
   - Đọc version hiện tại từ `src-tauri/tauri.conf.json` (hoặc `package.json`).
   - Nếu commit message theo Conventional Commits (`feat:`, `fix:`, `BREAKING CHANGE`) → tự tính version tiếp theo theo semver (dùng action `googleapis/release-please-action` **hoặc** cách đơn giản hơn dùng `mathieudutour/github-tag-action` để tự tăng patch/minor/major dựa trên conventional commits và tạo tag `vX.Y.Z`).
   - Sinh changelog tự động từ commit log (dùng `mikepenz/release-changelog-builder-action` hoặc changelog do `release-please`/`mathieudutour` xuất kèm).
   - Output: tag mới + changelog body (dùng cho bước release).
   - Nếu không có thay đổi đáng release (không commit nào match convention) → job kết thúc sớm, không tạo tag.
2. Job `build-and-release` (matrix, cần `bump-tag` xong và có tag mới khi push, hoặc chạy trực tiếp khi dispatch):
   - Matrix (hỗ trợ 3 nền tảng chính sau khi lược bỏ macOS Intel):
     | OS runner | Target | Platform |
     |---|---|---|
     | `macos-14` | `aarch64-apple-darwin` | macOS ARM64 (M1/M2/M3) |
     | `windows-latest` | `x86_64-pc-windows-msvc` | Windows x64 |
     | `ubuntu-22.04` | `x86_64-unknown-linux-gnu` | Linux x64 |
   - Steps mỗi job: checkout → cài Node (`actions/setup-node`) + cài Rust (`dtolnay/rust-toolchain` với target tương ứng) → cài dependency hệ thống cho Linux (`webkit2gtk`, `libayatana-appindicator3-dev`, v.v. qua `apt-get`) → `npm ci` → dùng `tauri-apps/tauri-action@v0` với:
     - `assetNamePattern: "[name]_[version]_[platform]_[arch][setup][ext]"` và `releaseAssetNamePattern` để đưa định danh platform (`darwin`, `windows`, `linux`) cùng kiến trúc vào tên file artifact trên GitHub Release (ví dụ: `xMark_0.3.0_darwin_aarch64.dmg`, `xMark_0.3.0_windows_x64-setup.exe`, `xMark_0.3.0_linux_amd64.deb`).
     - Khi `push`: tự động tạo/cập nhật GitHub Release với các asset đã được đặt tên theo pattern.
     - Khi `workflow_dispatch`: chỉ build bundle và upload artifacts qua `actions/upload-artifact@v4`, không tạo release/tag.

**Trigger 2 — `workflow_dispatch` (hợp nhất trong `release.yml`):**
- Sử dụng chung matrix trong `.github/workflows/release.yml`, kích hoạt thủ công từ giao diện GitHub Actions (chạy trên nhánh được chọn).
- Chỉ chạy các bước build bundle và tải lên GitHub Actions Artifacts mà không chạy các bước tạo tag/release. Không cần duy trì file workflow riêng `build-artifact.yml`.

**Version source of truth**: đồng bộ version giữa `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` (workflow bump sẽ cập nhật cả 3 file rồi commit lại `chore(release): vX.Y.Z` trước khi tạo tag).

### 2.2. UX fixes — chặn F5 reload & context menu mặc định

File mới: `src/hooks/useDisableWebviewDefaults.ts` (hoặc thêm trực tiếp trong `src/main.tsx`).

- `window.addEventListener('contextmenu', (e) => e.preventDefault())` — chặn toàn bộ menu chuột phải mặc định của WebView (Back/Forward/Reload/Save as/Print/Inspect...). App hiện chưa có context menu tuỳ biến, nên chặn hẳn là phù hợp; có thể cân nhắc mở lại menu tuỳ biến sau này (không nằm trong scope v0.3.0).
- `window.addEventListener('keydown', ...)` chặn:
  - `F5` và `Ctrl+R` / `Cmd+R` (reload).
  - `Ctrl+Shift+R` / `Cmd+Shift+R` (hard reload).
  - Giữ nguyên các phím tắt khác (copy/paste, devtools trong dev mode nếu cần) — chỉ chặn đúng các tổ hợp reload để tránh ảnh hưởng UX khác.
- Đăng ký sớm nhất có thể (trong `main.tsx`, trước khi render React) để đảm bảo áp dụng toàn bộ vòng đời app, không phụ thuộc component nào.

### 2.3. App icon

1. Sinh icon set: `npx @tauri-apps/cli icon .tmp/icon.svg --output src-tauri/icons` — ghi đè toàn bộ file trong `src-tauri/icons/` (32x32, 128x128, 128x128@2x, icon.ico, icon.icns, các Square*Logo cho Windows Store, StoreLogo.png).
2. Cập nhật `public/favicon.svg` bằng nội dung `.tmp/icon.svg` (icon tab/website khi chạy dev server qua trình duyệt).
3. Cập nhật `src/components/layout/Header.tsx`: thay khối `<Layers />` bằng `<img src="/favicon.svg" className="w-7 h-7" />` (hoặc import trực tiếp asset) để icon hiển thị trên custom title bar đồng nhất với icon app thật.
4. Giữ nguyên cấu hình `bundle.icon` trong `tauri.conf.json` (đã trỏ đúng các file sẽ được ghi đè).

### 2.4. README.md chuẩn hoá

- Viết lại hoàn toàn bằng English (Anh-Mỹ), giọng văn kỹ thuật, chuẩn README OSS phổ biến (badges, mục lục, sections rõ ràng).
- Cấu trúc đề xuất: Overview → Features → Prerequisites (theo từng platform) → Development → Build → Usage → Contributing → License.
- Mục **Prerequisites** tách theo tab/heading từng OS:
  - **Windows**: Node.js 18+ (winget: `winget install OpenJS.NodeJS.LTS`), Rust (`winget install Rustlang.Rustup` hoặc https://rustup.rs), Visual Studio Build Tools (workload *Desktop development with C++*, link tải cụ thể), WebView2 Runtime (đã có sẵn Win10/11, link tải cho trường hợp thiếu).
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`), Rust (`brew install rustup` hoặc rustup.rs), Node.js (`brew install node`).
  - **Linux (Ubuntu/Debian)**: gói hệ thống cần cho Tauri v2 (`sudo apt update && sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`), Rust qua rustup, Node.js qua `nvm` hoặc `apt`.
  - Trích dẫn đúng theo tài liệu chính thức Tauri v2 prerequisites cho từng OS.
- Thêm mục **Download** trỏ tới GitHub Releases (sau khi có CI/CD).
- Thêm badge build status trỏ tới workflow release.

### 2.5. MIT License

- Thêm file `LICENSE` ở root, nội dung chuẩn MIT License, copyright năm hiện tại + tên chủ sở hữu (sẽ hỏi tên/tổ chức cụ thể nếu cần, mặc định dùng tên tác giả trong `Cargo.toml`/GitHub owner `bs135` nếu không có chỉ định khác).
- Thêm dòng license badge + section "License" trong README trỏ tới file này.

---

## 3. Các bước thực hiện (từng bước, mỗi bước 1 commit riêng theo semver)

1. `docs: add plan document for v0.3.0` — thêm `plan-v0.3.0.md` vào repo.
2. `feat(ci): add release workflow for tagged builds on main` — thêm `.github/workflows/release.yml`.
3. `feat(ci): add manual workflow_dispatch artifact build` — thêm `.github/workflows/build-artifact.yml`.
4. `fix(ui): disable webview reload shortcuts and default context menu` — thêm hook chặn F5/context menu.
5. `feat(assets): regenerate app icons from new source svg` — chạy `tauri icon`, cập nhật `src-tauri/icons/*`, `public/favicon.svg`.
6. `feat(ui): use new app icon in custom titlebar` — sửa `Header.tsx`.
7. `docs: rewrite README in English with per-platform prerequisites` — viết lại `README.md`.
8. `chore: add MIT license` — thêm `LICENSE`, cập nhật README license section.
9. (Tuỳ chọn, cuối cùng) `chore: bump version to 0.3.0` — cập nhật version trong `package.json`, `Cargo.toml`, `tauri.conf.json`.

Tất cả thực hiện trên branch `develop` hiện tại (đã checked out), **không push origin**, **không tạo pull request** — đúng theo yêu cầu git rules.

---

## 4. Ghi chú / Rủi ro

- `tauri icon` cần chạy được trên máy hiện tại (Windows) — kiểm tra `@tauri-apps/cli` đã có trong `devDependencies`, dùng `npx tauri icon`.
- Không có runner thật để test CI (chỉ có thể kiểm tra YAML syntax + logic bằng `actionlint`/đọc kỹ, không chạy thử thực tế trong phiên làm việc này trừ khi được yêu cầu).
- Semver auto-tag dựa trên Conventional Commits — cần các commit sau này tuân thủ convention (`feat:`, `fix:`, `chore:`...) để hoạt động đúng; sẽ ghi chú trong README/CONTRIBUTING nếu cần (không bắt buộc theo scope).
- Việc chặn context menu hoàn toàn có thể ảnh hưởng khả năng right-click để mở DevTools khi debug — sẽ cân nhắc chỉ chặn trong bản release (production build) và giữ nguyên trong dev mode nếu người dùng muốn (sẽ xác nhận qua ask_user).
