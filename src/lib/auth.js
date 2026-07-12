import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'hcc_access';
const JWT_SECRET  = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod');
const EXPIRES_IN  = '8h'; // session lasts 8 hours

// ── PIN helpers ────────────────────────────────────────────────────────────────
export async function hashPin(pin) {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash);
}

// ── JWT helpers ────────────────────────────────────────────────────────────────
export async function generateToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────
export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8, // 8 hours
    path:     '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function getTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export async function getSessionAndPermissions(requiredSlug) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return { success: false, error: 'Unauthorized — please log in', status: 401 };

  const payload = await verifyToken(token);
  if (!payload) return { success: false, error: 'Session expired', status: 401 };

  if (payload.role === 'super_admin') {
    return { success: true, user: payload };
  }

  if (requiredSlug) {
    const allowed = payload.allowedPages?.includes('*') || payload.allowedPages?.includes(requiredSlug);
    if (!allowed) {
      return { success: false, error: 'Forbidden — insufficient permissions', status: 403 };
    }
  }

  return { success: true, user: payload };
}

export async function logLoginActivity(email, name, status, reason = '', request) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

    const ip = request.headers.get('x-forwarded-for') || request.ip || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await fetch(`${SUPABASE_URL}/rest/v1/hcc_login_activity`, {
      method: 'POST',
      headers: {
        'apikey':         SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        name: name || '',
        status,
        reason,
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[logLoginActivity] Failed to write login activity to Supabase:', err.message);
  }
}

export { COOKIE_NAME };
