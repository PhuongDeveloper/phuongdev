/* ==========================================================================
   Route Handler: Upload ảnh qua ImgBB API
   - Nhận file ảnh từ FormData (gửi từ Admin)
   - Chuyển đổi sang base64
   - Gọi ImgBB API để tải ảnh lên
   - Trả về URL ảnh tĩnh để lưu vào Supabase
   - API Key ImgBB được bảo mật hoàn toàn (chỉ có trên server)
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra xác thực - dựa vào cookie admin_auth thay vì Supabase Auth
    const adminAuthCookie = request.cookies.get('admin_auth');
    if (adminAuthCookie?.value !== 'phuongdev') {
      return NextResponse.json(
        { error: 'Chưa xác thực. Vui lòng đăng nhập.' },
        { status: 401 }
      );
    }

    // Lấy file ảnh từ FormData
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Không tìm thấy file ảnh trong yêu cầu.' },
        { status: 400 }
      );
    }

    // Kiểm tra loại file (chỉ cho phép ảnh)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Định dạng file không hợp lệ. Chỉ chấp nhận JPEG, PNG, GIF, WebP.' },
        { status: 400 }
      );
    }

    // Kiểm tra kích thước file (tối đa 32MB theo giới hạn ImgBB)
    const maxSize = 32 * 1024 * 1024; // 32MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File quá lớn. Kích thước tối đa là 32MB.' },
        { status: 400 }
      );
    }

    // Chuyển đổi file sang base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Lấy API Key từ biến môi trường
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      console.error('IMGBB_API_KEY chưa được cấu hình trong .env.local');
      return NextResponse.json(
        { error: 'Lỗi cấu hình server. Vui lòng liên hệ quản trị viên.' },
        { status: 500 }
      );
    }

    // Gọi ImgBB API để upload ảnh
    const imgbbFormData = new FormData();
    imgbbFormData.append('key', apiKey);
    imgbbFormData.append('image', base64Image);
    imgbbFormData.append('name', file.name.replace(/\.[^/.]+$/, '')); // Tên file không có đuôi

    const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: imgbbFormData,
    });

    if (!imgbbResponse.ok) {
      const errorData = await imgbbResponse.json();
      console.error('Lỗi ImgBB API:', errorData);
      return NextResponse.json(
        { error: 'Không thể upload ảnh lên ImgBB. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    const imgbbData = await imgbbResponse.json();

    // Trả về URL ảnh tĩnh
    return NextResponse.json({
      url: imgbbData.data.url,
      thumb_url: imgbbData.data.thumb?.url || imgbbData.data.url,
      delete_url: imgbbData.data.delete_url,
    });
  } catch (error) {
    console.error('Lỗi xử lý upload:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi không mong muốn khi upload ảnh.' },
      { status: 500 }
    );
  }
}
