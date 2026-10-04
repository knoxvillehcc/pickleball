import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getVendorSettings, setVendorSetting } from '@/lib/navratriVendorDb';

export const dynamic = 'force-dynamic';

// ── GET: Fetch settings (supports public reading of is_published) ───────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    const settings = await getVendorSettings();

    if (key) {
      return NextResponse.json({
        success: true,
        key,
        value: settings[key],
        is_published: settings[key] === 'true',
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error('[Vendor Settings GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── POST: Update setting (admin only) ──────────────────────────────────────────
export async function POST(request) {
  const auth = await getSessionAndPermissions('navratri');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: 'Setting key is required' }, { status: 400 });
    }

    await setVendorSetting(key, value, description);
    return NextResponse.json({ success: true, key, value });

  } catch (err) {
    console.error('[Vendor Settings POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
