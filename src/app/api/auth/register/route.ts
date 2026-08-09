import { NextRequest, NextResponse } from 'next/server';

import { ensureUserProfile } from '@/lib/auth/ensure-user-profile';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type RegisterPayload = {
  email?: string;
  password?: string;
  display_name?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const REGISTER_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_LIMIT = 5;
const registerAttempts = new Map<string, RateLimitEntry>();

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}

function consumeRegistrationAttempt(clientKey: string) {
  const now = Date.now();
  const current = registerAttempts.get(clientKey);
  if (!current || current.resetAt <= now) {
    registerAttempts.set(clientKey, { count: 1, resetAt: now + REGISTER_WINDOW_MS });
    return true;
  }
  if (current.count >= REGISTER_LIMIT) return false;
  current.count += 1;
  return true;
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
  }

  const clientKey = getClientKey(request);
  if (!consumeRegistrationAttempt(clientKey)) {
    return NextResponse.json(
      { error: 'Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
      { status: 429 },
    );
  }

  let payload: RegisterPayload;
  try {
    payload = (await request.json()) as RegisterPayload;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu đăng ký không hợp lệ.' }, { status: 400 });
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const displayName = String(payload.display_name || '').trim().slice(0, 80);

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 422 });
  }
  if (password.length < 6 || password.length > 72) {
    return NextResponse.json({ error: 'Mật khẩu phải có từ 6 đến 72 ký tự.' }, { status: 422 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName || email.split('@')[0],
      },
    });

    if (error || !data.user) {
      const code = error && 'code' in error ? error.code : undefined;
      const duplicate = code === 'email_exists'
        || code === 'user_already_exists'
        || /already registered|already exists/i.test(error?.message || '');

      if (duplicate) {
        return NextResponse.json(
          { error: 'Email này đã được đăng ký. Vui lòng đăng nhập.' },
          { status: 409 },
        );
      }

      console.error('[Register] Không thể tạo tài khoản:', {
        code,
        status: error?.status,
        message: error?.message,
      });
      return NextResponse.json({ error: 'Không thể tạo tài khoản lúc này.' }, { status: 500 });
    }

    try {
      await ensureUserProfile(admin, data.user);
    } catch (profileError) {
      const { error: rollbackError } = await admin.auth.admin.deleteUser(data.user.id);
      console.error('[Register] Không thể khởi tạo hồ sơ người dùng:', {
        profileError,
        rollbackError,
      });
      return NextResponse.json({ error: 'Không thể khởi tạo hồ sơ tài khoản.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (unexpectedError) {
    console.error('[Register] Lỗi kết nối dịch vụ xác thực:', unexpectedError);
    return NextResponse.json({ error: 'Không thể tạo tài khoản lúc này.' }, { status: 500 });
  }
}
