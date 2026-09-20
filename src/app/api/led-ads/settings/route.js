import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const URL_ = () => process.env.SUPABASE_URL;
const KEY_ = () => process.env.SUPABASE_ANON_KEY;
const hdrs = () => ({
  'apikey': KEY_(),
  'Authorization': `Bearer ${KEY_()}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

const SETTINGS_KEY = 'led_ads_is_published';
let memoryFallback = 'false';

export async function GET() {
  try {
    const res = await fetch(
      `${URL_()}/rest/v1/indiafest_settings?key=eq.${encodeURIComponent(SETTINGS_KEY)}&select=key,value&limit=1`,
      { headers: hdrs(), cache: 'no-store' }
    );
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        memoryFallback = rows[0].value;
        return NextResponse.json({ success: true, is_published: rows[0].value === 'true' });
      }
    }
  } catch (e) {
    console.warn('[LED-Ads Settings] Supabase error:', e.message);
  }
  return NextResponse.json({ success: true, is_published: memoryFallback === 'true' });
}

export async function POST(request) {
  const auth = await getSessionAndPermissions('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { value } = await request.json();
    const strValue = value ? 'true' : 'false';
    memoryFallback = strValue;

    // Try upsert to Supabase indiafest_settings table
    try {
      await fetch(`${URL_()}/rest/v1/indiafest_settings?key=eq.${encodeURIComponent(SETTINGS_KEY)}`, {
        method: 'DELETE', headers: hdrs(),
      });
      await fetch(`${URL_()}/rest/v1/indiafest_settings`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ key: SETTINGS_KEY, value: strValue }),
      });
    } catch (e) {
      console.warn('[LED-Ads Settings] Supabase write failed:', e.message);
    }

    return NextResponse.json({ success: true, is_published: value });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
