import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic  = 'force-dynamic';
export const revalidate = 0;

// ── In-memory fallback (resets on server restart) ─────────────────────────────
// Run the SQL below to persist in Supabase:
//   INSERT INTO indiafest_settings (key, value) VALUES ('is_published', 'false')
//   ON CONFLICT (key) DO NOTHING;
const memoryStore = new Map([['is_published', 'false']]);

const URL_  = () => process.env.SUPABASE_URL;
const KEY_  = () => process.env.SUPABASE_ANON_KEY;
const hdrs  = () => ({
  'apikey':        KEY_(),
  'Authorization': `Bearer ${KEY_()}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
});

// ── GET: read a setting ────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || 'is_published';

  // 1. Try Supabase indiafest_settings table
  try {
    const res = await fetch(
      `${URL_()}/rest/v1/indiafest_settings?key=eq.${encodeURIComponent(key)}&select=key,value&limit=1`,
      { headers: hdrs(), cache: 'no-store' }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const value = rows[0].value;
        memoryStore.set(key, value);
        return NextResponse.json({ key, value, is_published: value === 'true' });
      }
    } else {
      console.warn(`[IndiafestSettings GET] Supabase ${res.status} — using memory store`);
    }
  } catch (err) {
    console.warn(`[IndiafestSettings GET] Supabase unreachable: ${err.message}`);
  }

  // 2. Fallback: memory store
  const value = memoryStore.get(key) ?? 'false';
  return NextResponse.json(
    { key, value, is_published: value === 'true' },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}

// ── POST: update a setting ─────────────────────────────────────────────────────
export async function POST(request) {
  // Require 'indiafest' or 'settings' permission
  const auth = await getSessionAndPermissions('indiafest');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body  = await request.json();
    const key   = body.key   ?? 'is_published';
    const value = String(body.value ?? 'false');

    // Always update memory store immediately
    memoryStore.set(key, value);
    console.log(`[IndiafestSettings] Memory: ${key} = ${value}`);

    // Try Supabase PATCH first, then POST insert
    try {
      const patchRes = await fetch(
        `${URL_()}/rest/v1/indiafest_settings?key=eq.${encodeURIComponent(key)}`,
        { method: 'PATCH', headers: hdrs(), body: JSON.stringify({ value }) }
      );
      if (patchRes.ok) {
        return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'supabase' });
      }

      const postRes = await fetch(
        `${URL_()}/rest/v1/indiafest_settings`,
        { method: 'POST', headers: hdrs(), body: JSON.stringify({ key, value }) }
      );
      if (postRes.ok) {
        return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'supabase' });
      }
      console.warn(`[IndiafestSettings POST] Supabase write failed: ${await postRes.text()}`);
    } catch (sbErr) {
      console.warn(`[IndiafestSettings POST] Supabase error: ${sbErr.message}`);
    }

    // Return success from memory even if Supabase failed
    return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'memory' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
