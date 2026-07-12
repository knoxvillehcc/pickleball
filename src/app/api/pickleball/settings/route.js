import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Force every request to be dynamic — never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SETTINGS_FILE = path.join(process.cwd(), '.pickleball_settings.json');

// Helper to write local settings
function writeLocalSetting(key, val) {
  try {
    let data = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      } catch (e) {}
    }
    data[key] = val;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[PickleballSettings] Failed to write local settings file: ${err.message}`);
  }
}

// Helper to read local settings
function readLocalSetting(key, defaultVal = 'false') {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return data[key] ?? defaultVal;
    }
  } catch (err) {
    console.warn(`[PickleballSettings] Failed to read local settings file: ${err.message}`);
  }
  return defaultVal;
}

// ── In-memory fallback (used when Supabase table doesn't exist yet) ────────────
const memoryStore = new Map();

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
        // Sync memory store and local file
        memoryStore.set(key, value);
        writeLocalSetting(key, value);
        return NextResponse.json({ key, value, is_published: value === 'true' });
      }
    } else {
      console.warn(`[Settings GET] Supabase error ${res.status} — using file/memory fallback.`);
    }
  } catch (err) {
    console.warn(`[Settings GET] Supabase unreachable: ${err.message} — using file/memory fallback`);
  }

  // 2. Fallback: local file, then memory store, then default
  const localVal = readLocalSetting(key, null);
  const value = localVal ?? memoryStore.get(key) ?? 'false';
  
  // Sync map
  memoryStore.set(key, value);

  return NextResponse.json(
    { key, value, is_published: value === 'true' },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}

// ── POST: update a setting ─────────────────────────────────────────────────────
export async function POST(request) {
  const auth = await getSessionAndPermissions('settings');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body  = await request.json();
    const key   = body.key   ?? 'is_published';
    const value = String(body.value ?? 'false');

    // Always update memory store and local file immediately
    memoryStore.set(key, value);
    writeLocalSetting(key, value);
    console.log(`[Settings] Memory/File: ${key} = ${value}`);

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
        return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'supabase' });
      }

      const errText = await postRes.text();
      console.warn(`[Settings POST] Supabase write failed (${postRes.status}): ${errText}`);
    } catch (sbErr) {
      console.warn(`[Settings POST] Supabase write failed: ${sbErr.message}`);
    }

    // Return success from local file/memory store even if Supabase failed
    return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'local_file' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
