import { NextResponse } from 'next/server';

// Force every request to be dynamic — never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── In-memory fallback (used when Supabase table doesn't exist yet) ────────────
// This persists across requests in the same server process but resets on restart.
// Run supabase_settings.sql to make it permanent in Supabase.
const memoryStore = new Map([['is_published', 'false']]);

const SUPABASE_URL      = () => process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = () => process.env.SUPABASE_ANON_KEY;

const sbHeaders = () => ({
  'apikey':        SUPABASE_ANON_KEY(),
  'Authorization': `Bearer ${SUPABASE_ANON_KEY()}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
});

// ── GET: read a setting ────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || 'is_published';

  // 1. Try Supabase
  try {
    const res  = await fetch(
      `${SUPABASE_URL()}/rest/v1/pickleball_settings?key=eq.${encodeURIComponent(key)}&select=key,value&limit=1`,
      { headers: sbHeaders(), cache: 'no-store' }
    );

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const value = rows[0].value;
        // Also sync memory store
        memoryStore.set(key, value);
        return NextResponse.json({ key, value, is_published: value === 'true' });
      }
      // Table exists but row missing → use memory/default
    } else {
      console.warn(`[Settings GET] Supabase error ${res.status} — falling back to memory store. Run supabase_settings.sql to fix.`);
    }
  } catch (err) {
    console.warn(`[Settings GET] Supabase unreachable: ${err.message} — using memory store`);
  }

  // 2. Fallback: in-memory store
  const value = memoryStore.get(key) ?? 'false';
  return NextResponse.json(
    { key, value, is_published: value === 'true' },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}

// ── POST: update a setting ─────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body  = await request.json();
    const key   = body.key   ?? 'is_published';
    const value = String(body.value ?? 'false');

    // Always update memory store immediately
    memoryStore.set(key, value);
    console.log(`[Settings] Memory store: ${key} = ${value}`);

    // Try to persist to Supabase using PATCH (update existing row)
    try {
      // First try PATCH to update existing row
      const patchRes = await fetch(
        `${SUPABASE_URL()}/rest/v1/pickleball_settings?key=eq.${encodeURIComponent(key)}`,
        {
          method:  'PATCH',
          headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
          body:    JSON.stringify({ value }),
        }
      );

      if (patchRes.ok) {
        const data = await patchRes.json();
        console.log(`[Settings] Updated in Supabase via PATCH: ${key} = ${value}`);
        return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'supabase' });
      }

      // If PATCH found nothing (new key), fall back to POST insert
      const postRes = await fetch(
        `${SUPABASE_URL()}/rest/v1/pickleball_settings`,
        {
          method:  'POST',
          headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
          body:    JSON.stringify({ key, value }),
        }
      );

      if (postRes.ok) {
        console.log(`[Settings] Inserted in Supabase via POST: ${key} = ${value}`);
        return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'supabase' });
      }

      const errText = await postRes.text();
      console.warn(`[Settings POST] Supabase write failed (${postRes.status}): ${errText}`);
    } catch (sbErr) {
      console.warn(`[Settings POST] Supabase write failed: ${sbErr.message}`);
    }

    // Return success from memory store even if Supabase failed
    return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'memory' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
