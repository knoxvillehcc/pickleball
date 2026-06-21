import { NextResponse } from 'next/server';
import { generateToken, setAuthCookie, verifyPin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// In-memory lockout
const failedAttempts = new Map();
const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 15 * 60 * 1000;

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
    const lock = failedAttempts.get(emailLower);
    if (lock?.lockedUntil && lock.lockedUntil > Date.now()) {
      return NextResponse.json({
        error: 'Account locked due to too many attempts.',
        lockedUntil: new Date(lock.lockedUntil).toISOString(),
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
      const attempts = (lock?.count || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        failedAttempts.set(emailLower, { count: attempts, lockedUntil: Date.now() + LOCKOUT_MS });
        return NextResponse.json({
          error: 'Account locked for 15 minutes.',
          lockedUntil: new Date(Date.now() + LOCKOUT_MS).toISOString(),
        }, { status: 429 });
      }
      failedAttempts.set(emailLower, { count: attempts, lockedUntil: null });
      return NextResponse.json({
        error: `Invalid PIN. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`,
      }, { status: 401 });
    }

    // Success — clear lockout
    failedAttempts.delete(emailLower);

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
