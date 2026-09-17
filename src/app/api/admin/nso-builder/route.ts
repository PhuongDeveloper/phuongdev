import { NextRequest, NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

type VersionInput = {
  code?: string;
  name?: string;
  description?: string;
  price?: number;
  clone_bundle_price?: number;
  is_active?: boolean;
  sort_order?: number;
};

type ConfigPayload = {
  settings?: Record<string, unknown>;
  versions?: VersionInput[];
  channels?: Array<Record<string, unknown>>;
  offers?: Array<Record<string, unknown>>;
};

async function requireAdmin() {
  const session = await getAdminSession();
  return session ? createAdminClient() : null;
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });

  let payload: ConfigPayload;
  try {
    payload = (await request.json()) as ConfigPayload;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không đúng định dạng.' }, { status: 400 });
  }

  const settings = payload.settings || {};
  const settingValue = {
    title: String(settings.title || '').trim(),
    description: String(settings.description || '').trim(),
    content: String(settings.content || '').trim(),
    banner_url: settings.banner_url ? String(settings.banner_url).trim() : null,
    badge: String(settings.badge || 'TẠO TỨC THÌ').trim(),
    default_port: Math.min(65535, Math.max(1, Math.round(Number(settings.default_port) || 14444))),
    is_active: settings.is_active !== false,
  };
  if (!settingValue.title || !settingValue.description) {
    return NextResponse.json({ error: 'Cần nhập tiêu đề và mô tả sản phẩm.' }, { status: 422 });
  }

  const versions = payload.versions || [];
  if (!versions.length) return NextResponse.json({ error: 'Cần có ít nhất một phiên bản.' }, { status: 422 });

  const normalized = versions.map((version, index) => ({
    code: String(version.code || '').trim(),
    name: String(version.name || '').trim(),
    description: String(version.description || '').trim(),
    price: Math.max(0, Math.round(Number(version.price) || 0)),
    clone_bundle_price: Math.max(0, Math.round(Number(version.clone_bundle_price) || 0)),
    is_active: version.is_active !== false,
    sort_order: index,
  }));
  if (normalized.some((version) => !['148', '217'].includes(version.code) || !version.name)) {
    return NextResponse.json({ error: 'Chỉ hai template JAR 148 và 217 đã đóng gói sẵn được hỗ trợ.' }, { status: 422 });
  }
  if (new Set(normalized.map((version) => version.code)).size !== normalized.length) {
    return NextResponse.json({ error: 'Mã phiên bản không được trùng nhau.' }, { status: 422 });
  }

  const { error: settingsError } = await admin.from('nso_builder_settings').update(settingValue).eq('id', true);
  if (settingsError) {
    console.error('[NSO Builder Admin] Settings update failed', settingsError);
    return NextResponse.json({ error: 'Không thể lưu nội dung sản phẩm.' }, { status: 500 });
  }

  for (const version of normalized) {
    const { code, ...changes } = version;
    const { error } = await admin.from('nso_build_versions').update(changes).eq('code', code);
    if (error) {
      console.error('[NSO Builder Admin] Version update failed', error);
      return NextResponse.json({ error: `Không thể lưu phiên bản ${version.code}.` }, { status: 500 });
    }
  }

  for (const channel of payload.channels || []) {
    const id = String(channel.id || '').trim();
    const downloadUrl = channel.download_url ? String(channel.download_url).trim() : null;
    if (!/^(apk|pc|ios)[a-zA-Z0-9._-]{1,24}$/.test(id)) {
      return NextResponse.json({ error: `Mã kênh ${id || '(trống)'} không hợp lệ.` }, { status: 422 });
    }
    if (downloadUrl) {
      try {
        const parsed = new URL(downloadUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
      } catch {
        return NextResponse.json({ error: `Link tải của ${id} không hợp lệ.` }, { status: 422 });
      }
    }
    if (channel.is_active !== false && !downloadUrl) {
      return NextResponse.json({ error: `Cần nhập link tải trước khi mở bán ${id}.` }, { status: 422 });
    }
    const { error } = await admin.from('nso_platform_channels').update({
      name: String(channel.name || '').trim(),
      description: String(channel.description || '').trim(),
      download_url: downloadUrl,
      is_active: channel.is_active !== false,
      sort_order: Math.round(Number(channel.sort_order) || 0),
    }).eq('id', id);
    if (error) {
      console.error('[NSO Builder Admin] Channel update failed', error);
      return NextResponse.json({ error: `Không thể lưu kênh ${id}.` }, { status: 500 });
    }
  }

  for (const offer of payload.offers || []) {
    const id = String(offer.id || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Mã gói APK/PC/iOS không hợp lệ.' }, { status: 422 });
    }
    const { error } = await admin.from('nso_platform_offers').update({
      name: String(offer.name || '').trim(),
      price: Math.max(0, Math.round(Number(offer.price) || 0)),
      is_active: offer.is_active !== false,
      sort_order: Math.round(Number(offer.sort_order) || 0),
    }).eq('id', id);
    if (error) {
      console.error('[NSO Builder Admin] Offer update failed', error);
      return NextResponse.json({ error: 'Không thể lưu bảng giá APK/PC/iOS.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
