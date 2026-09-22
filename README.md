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

Endpoint này kết hợp nhiều nguồn thay vì phụ thuộc vào một nhà cung cấp duy nhất:

- **Google Search grounding qua Gemini**: tổng hợp và dẫn nguồn trực tuyến.
- **OpenAlex**: metadata paper, preprint và công trình nghiên cứu.
- **Brave Search**: web search và video search độc lập, dùng làm nguồn trực tiếp và fallback khi Gemini Search không khả dụng.
- **YouTube Data API**: tùy chọn để lấy metadata video trực tiếp.

Các biến môi trường:

```
# Có thể dùng chung với trợ lý AI
GEMINI_API_KEY=...

# Khuyến nghị cho web/video discovery độc lập
BRAVE_SEARCH_API_KEY=...

# Tùy chọn: tăng quota OpenAlex
OPENALEX_API_KEY=...

# Tùy chọn: kết quả video YouTube trực tiếp
YOUTUBE_API_KEY=...

# Tùy chọn: model riêng cho Search grounding
GEMINI_SEARCH_MODEL=gemini-3.8-flash
```

Không có `BRAVE_SEARCH_API_KEY` hoặc khi quota Gemini hết, trang vẫn có thể hiển thị research feed và tìm paper qua OpenAlex. Để có tìm kiếm web/video đầy đủ, cấu hình ít nhất một web-search provider trên Vercel.

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
- Google Search grounding
- OpenAlex API
- Brave Search API (optional)
- YouTube Data API (optional)
- PWA-ready

## Features

- Dashboard theo ba tác vụ: theo dõi nội dung mới, tìm tài liệu theo ý tưởng, học/tra cứu.
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
