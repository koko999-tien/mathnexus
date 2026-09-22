# MathNexus

MathNexus là workspace học tập và khám phá toán học xây bằng React + TypeScript + Tailwind CSS + KaTeX.

## Xem trên trình duyệt

Bản GitHub Pages:

**https://koko999-tien.github.io/mathnexus/**

> GitHub Pages chỉ phục vụ frontend tĩnh. Các tính năng dùng API key, gồm trợ lý Gemini và Discovery Search, cần backend/serverless trên Vercel.

## Development

```bash
npm install
npm run dev
```

Frontend vẫn chạy khi chưa có backend. Các khu vực phụ thuộc dữ liệu trực tuyến sẽ dùng fallback cục bộ hoặc OpenAlex khi khả dụng.

## Gemini API

Serverless endpoint:

```
api/gemini.js
```

Biến môi trường bắt buộc:

```
GEMINI_API_KEY=...
```

Biến tùy chọn:

```
GEMINI_MODEL=gemini-3.8-flash
```

Không đặt API key trong biến có tiền tố `VITE_`, vì giá trị đó sẽ bị đóng gói xuống trình duyệt.

## Mathematics Discovery

Trang Tổng quan dùng endpoint:

```
api/discovery.js
```

Discovery được thiết kế để chạy mà không cần dịch vụ tìm kiếm trả phí. Dashboard hiện có thêm lịch sử truy vấn, chủ đề lưu cục bộ, bộ lọc theo loại kết quả, sắp xếp paper và lọc Open Access:

- **GDELT DOC API**: nguồn web/tin tức toàn cầu, dùng cho Radar và truy vấn nội dung gần đây.
- **Quanta Mathematics RSS + arXiv Mathematics RSS**: nguồn biên tập/chuyên ngành cập nhật, dùng làm lớp fallback ổn định cho Radar.
- **OpenAlex**: metadata paper, preprint, tác giả, nguồn xuất bản và open-access status.
- **Crossref REST API**: DOI và metadata từ các nhà xuất bản/thành viên Crossref.
- **Semantic Scholar Academic Graph API**: tìm paper theo độ liên quan, citation count và open-access PDF khi endpoint công khai chưa bị throttling.
- **YouTube RSS**: theo dõi video mới từ một tập kênh toán học được chọn sẵn, không cần YouTube API key.

Không cần `BRAVE_SEARCH_API_KEY`, thẻ thanh toán hoặc tài khoản Search API.

Biến môi trường tùy chọn:

```
# Chỉ dùng nếu muốn tăng quota/polite access của OpenAlex
OPENALEX_API_KEY=...
```

Trợ lý AI ở `/ai` vẫn là tính năng riêng và tiếp tục dùng `GEMINI_API_KEY`. Discovery trên trang Tổng quan không phụ thuộc Gemini.

## Deploy bằng Vercel

1. Import repository `koko999-tien/mathnexus` vào Vercel.
2. Trong **Project Settings → Environment Variables**, thêm các key cần dùng.
3. Deploy.
4. Mở trang `/` để dùng Discovery Workspace hoặc `/ai` để dùng trợ lý MathNexus.

Vite dùng base `/` trên Vercel và base `/mathnexus/` khi build GitHub Pages.

## Build

```bash
npm run build
```

Output: `dist/`

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- KaTeX
- React Router
- Gemini Generate Content API
- GDELT DOC API
- Quanta/arXiv RSS feeds
- OpenAlex API
- Crossref REST API
- Semantic Scholar Academic Graph API
- YouTube RSS feeds
- PWA-ready

## Features

- Dashboard theo ba tác vụ: theo dõi nội dung mới, tìm tài liệu theo ý tưởng, học/tra cứu.
- Research Search có lịch sử truy vấn, chủ đề lưu, lọc Paper/Nguồn/Video, sắp xếp citation/ngày và Open Access.
- Cửa sổ YouTube Search độc lập trên trang chính, dùng tìm kiếm trực tiếp của YouTube và RSS công khai.
- Bài học toán từ THCS đến Đại học.
- Knowledge Graph và Math Cosmos 3D.
- Tủ sách và công thức có giải thích.
- Luyện tập theo chuyên đề.
- Đồ thị hàm số và công cụ toán học.
- Trợ lý Gemini có ngữ cảnh MathNexus.
- Math Canvas.
- Sổ tay và tiến độ lưu cục bộ.
- Dark mode.
- Responsive mobile-first.
- PWA offline-ready.

## GitHub Pages

Workflow `.github/workflows/pages.yml` deploy frontend tĩnh khi được chạy thủ công.
