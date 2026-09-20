# MathNexus

Không gian học toán — bài học ngắn, tủ sách, công thức có lời giải thích, luyện tập, đồ thị hàm số, công cụ và trợ lý Gemini. React + TypeScript + Tailwind CSS + KaTeX.

## Xem trên trình duyệt

Bản GitHub Pages hiện tại:

**https://koko999-tien.github.io/mathnexus/**

> GitHub Pages chỉ phục vụ frontend tĩnh. Trợ lý Gemini cần backend/serverless để giữ API key an toàn. Repo đã được chuẩn bị để deploy trên Vercel.

## Development

```bash
npm install
npm run dev
```

Frontend vẫn chạy bình thường khi chưa có Gemini backend; trang AI sẽ fallback sang dữ liệu cục bộ.

## Gemini API

Serverless endpoint nằm tại:

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

## Deploy Gemini bằng Vercel

1. Import repository `koko999-tien/mathnexus` vào Vercel.
2. Trong Project Settings → Environment Variables, thêm `GEMINI_API_KEY`.
3. Deploy.
4. Mở `/ai` trên domain Vercel và đặt câu hỏi.

Vite tự dùng base `/` trên Vercel và vẫn giữ base `/mathnexus/` khi build GitHub Pages.

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
- PWA-ready

## Features

- 📚 Bài học toán từ THCS đến Đại học
- 📖 Tủ sách chọn lọc
- 🔢 Công thức có giải thích
- 🧪 Luyện tập theo chuyên đề
- 📊 Đồ thị hàm số
- 🧮 Công cụ toán
- 🤖 Trợ lý Gemini có ngữ cảnh MathNexus
- 📝 Sổ tay + tiến độ (localStorage)
- 🌙 Dark mode
- 📱 Responsive mobile-first
- ⚡ PWA offline-ready

## GitHub Pages

Workflow `.github/workflows/pages.yml` vẫn tiếp tục deploy bản frontend tĩnh khi push vào `main`.
