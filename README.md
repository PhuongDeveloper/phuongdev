This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Tự động nhập và đăng bài từ RSS

1. Chạy migration `supabase/migrations/014_content_growth_automation.sql` trong Supabase SQL Editor.
2. Thêm biến môi trường `CRON_SECRET` (chuỗi ngẫu nhiên tối thiểu 16 ký tự) và `NEXT_PUBLIC_SITE_URL=https://phuongdev.io.vn` trên Vercel.
3. Vào **Admin → Blog → Tự Động Đăng**, thêm URL RSS/Atom của nguồn được phép sử dụng và chọn **Lưu nháp** hoặc **Đăng ngay**.

Cron được khai báo tại `vercel.json`, mặc định quét lúc 02:00 UTC (09:00 giờ Việt Nam) mỗi ngày. Có thể bấm **Đồng bộ ngay** trong admin để kiểm tra nguồn mà không cần chờ cron.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
