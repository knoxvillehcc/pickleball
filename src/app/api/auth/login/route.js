import { NextResponse } from 'next/server';
import { hashPin, generateToken, setAuthCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// Admin users are stored in environment variables (no DB needed)
// Format: ADMIN_USERS = JSON array of {email, pinHash, name}
// Or use the simple single-admin env vars:
//   ADMIN_EMAIL, ADMIN_PIN_HASH

function getAdminUsers() {
  // Support multiple admins via ADMIN_USERS JSON env var
  if (process.env.ADMIN_USERS) {
    try { return JSON.parse(process.env.ADMIN_USERS); } catch {}
  }
  // Fallback to single admin env vars
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PIN_HASH) {
    return [{ email: process.env.ADMIN_EMAIL, pinHash: process.env.ADMIN_PIN_HASH, name: 'Admin', role: 'admin' }];
  }
  return [];
}

// Simple in-memory lockout (resets on server restart — good enough for low-traffic admin)
const failedAttempts = new Map(); // email → { count, lockedUntil }
const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 15 * 60 * 1000; // 15 minutes

export async function POST(request) {
  try {
    const { email, pin } = await request.json();

    if (!email || !pin) {
      return NextResponse.json({ error: 'Email and PIN are required' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Check lockout
    const lock = failedAttempts.get(emailLower);
    if (lock?.lockedUntil && lock.lockedUntil > Date.now()) {
      return NextResponse.json({
        error: 'Too many failed attempts. Account locked.',
        lockedUntil: new Date(lock.lockedUntil).toISOString(),
      }, { status: 429 });
    }

    // Find admin user
    const admins = getAdminUsers();
    const user   = admins.find(u => u.email.toLowerCase() === emailLower);

    if (!user) {
      // Don't reveal whether email exists
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify PIN
    const valid = await bcrypt.compare(pin, user.pinHash);

    if (!valid) {
      const attempts = (lock?.count || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        failedAttempts.set(emailLower, { count: attempts, lockedUntil: Date.now() + LOCKOUT_MS });
        return NextResponse.json({
          error: 'Account locked for 15 minutes due to too many failed attempts.',
          lockedUntil: new Date(Date.now() + LOCKOUT_MS).toISOString(),
        }, { status: 429 });
      }
      failedAttempts.set(emailLower, { count: attempts, lockedUntil: null });
      return NextResponse.json({
        error: `Invalid PIN. ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining.`,
      }, { status: 401 });
    }

    // PIN correct — clear lockout
    failedAttempts.delete(emailLower);

    // Generate JWT
    const token = await generateToken({ email: emailLower, name: user.name, role: user.role || 'admin' });
    await setAuthCookie(token);

    return NextResponse.json({ success: true, user: { email: emailLower, name: user.name, role: user.role } });
  } catch (err) {
    console.error('[Auth Login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
