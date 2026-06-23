import { NextResponse } from 'next/server';
import { generateToken, setAuthCookie, verifyPin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 15 * 60 * 1000;

async function getLockoutState(email) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const url = `${SUPABASE_URL}/rest/v1/login_lockouts?email=eq.${encodeURIComponent(email)}&select=*&limit=1`;
  
  const res = await fetch(url, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

async function setLockoutState(email, failedCount, lockedUntil) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  
  const patchUrl = `${SUPABASE_URL}/rest/v1/login_lockouts?email=eq.${encodeURIComponent(email)}`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'apikey':         KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type':  'application/json',
      'Prefer':         'return=representation',
    },
    body: JSON.stringify({
      failed_count: failedCount,
      locked_until: lockedUntil ? new Date(lockedUntil).toISOString() : null,
      updated_at:   new Date().toISOString(),
    }),
  });

  if (patchRes.ok) {
    const rows = await patchRes.json();
    if (rows && rows.length > 0) return;
  }

  const postUrl = `${SUPABASE_URL}/rest/v1/login_lockouts`;
  await fetch(postUrl, {
    method: 'POST',
    headers: {
      'apikey':         KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      email:        email,
      failed_count: failedCount,
      locked_until: lockedUntil ? new Date(lockedUntil).toISOString() : null,
    }),
  });
}

async function getUserFromSupabase(email) {
  const key  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const url  = `${process.env.SUPABASE_URL}/rest/v1/hcc_users?email=eq.${encodeURIComponent(email)}&select=*&limit=1`;
  const res  = await fetch(url, {
    headers: {
      'apikey':         key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

export async function POST(request) {
  try {
    const { email, pin } = await request.json();
    if (!email || !pin) return NextResponse.json({ error: 'Email and PIN required' }, { status: 400 });
    if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: 'PIN must be 6 digits' }, { status: 400 });

    const emailLower = email.toLowerCase().trim();

    // Lockout check
    const lock = await getLockoutState(emailLower);
    if (lock?.locked_until && new Date(lock.locked_until).getTime() > Date.now()) {
      return NextResponse.json({
        error: 'Account locked due to too many attempts.',
        lockedUntil: new Date(lock.locked_until).toISOString(),
      }, { status: 429 });
    }

    // Look up user in Supabase
    const user = await getUserFromSupabase(emailLower);

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Account is deactivated. Contact admin.' }, { status: 403 });
    }

    // Verify PIN
    const valid = await bcrypt.compare(pin, user.pin_hash);

    if (!valid) {
      const attempts = (lock?.failed_count || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_MS;
        await setLockoutState(emailLower, attempts, lockedUntil);
        return NextResponse.json({
          error: 'Account locked for 15 minutes.',
          lockedUntil: new Date(lockedUntil).toISOString(),
        }, { status: 429 });
      }
      await setLockoutState(emailLower, attempts, null);
      return NextResponse.json({
        error: `Invalid PIN. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`,
      }, { status: 401 });
    }

    // Success — clear lockout
    await setLockoutState(emailLower, 0, null);

    // Parse allowed pages
    const allowedPages = Array.isArray(user.allowed_pages)
      ? user.allowed_pages
      : (typeof user.allowed_pages === 'string' ? JSON.parse(user.allowed_pages) : ['*']);

    // Issue JWT with full profile + permissions
    const token = await generateToken({
      id:           user.id,
      email:        emailLower,
      name:         user.name || 'Admin',
      role:         user.role || 'staff',
      allowedPages,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: { email: emailLower, name: user.name, role: user.role, allowedPages },
    });
  } catch (err) {
    console.error('[Auth Login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
