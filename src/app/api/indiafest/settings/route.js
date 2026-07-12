import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic  = 'force-dynamic';
export const revalidate = 0;

const SETTINGS_FILE = path.join(process.cwd(), '.indiafest_settings.json');

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
    console.warn(`[IndiafestSettings] Failed to write local settings file: ${err.message}`);
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
    console.warn(`[IndiafestSettings] Failed to read local settings file: ${err.message}`);
  }
  return defaultVal;
}

// ── In-memory fallback (resets on server restart) ─────────────────────────────
const memoryStore = new Map();

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
        writeLocalSetting(key, value); // Sync to local file fallback
        return NextResponse.json({ key, value, is_published: value === 'true' });
      }
    } else {
      console.warn(`[IndiafestSettings GET] Supabase ${res.status} — using file/memory fallback`);
    }
  } catch (err) {
    console.warn(`[IndiafestSettings GET] Supabase unreachable: ${err.message}`);
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
  // Require 'indiafest' or 'settings' permission
  const auth = await getSessionAndPermissions('indiafest');
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
    console.log(`[IndiafestSettings] Memory/File: ${key} = ${value}`);

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

    // Return success from local file/memory even if Supabase failed
    return NextResponse.json({ success: true, key, value, is_published: value === 'true', source: 'local_file' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
