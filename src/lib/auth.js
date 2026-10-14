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

// ── Per-Page Permission Helpers (View-Only vs Edit) ───────────────────────────

/**
 * Evaluates access and edit rights for a specific page slug.
 * Supports legacy bare slugs ('slug'), explicit edit ('slug:edit'), and view-only ('slug:view').
 */
export function checkPagePermission(userOrPages, slug) {
  if (!userOrPages) return { canAccess: false, canEdit: false, isViewOnly: false };

  // If user object passed
  if (typeof userOrPages === 'object' && !Array.isArray(userOrPages)) {
    if (userOrPages.role === 'super_admin') {
      return { canAccess: true, canEdit: true, isViewOnly: false };
    }
    userOrPages = userOrPages.allowedPages || userOrPages.allowed_pages || [];
  }

  let pages = [];
  if (Array.isArray(userOrPages)) {
    pages = userOrPages;
  } else if (typeof userOrPages === 'string') {
    try { pages = JSON.parse(userOrPages); } catch { pages = [userOrPages]; }
  }

  if (pages.includes('*')) {
    return { canAccess: true, canEdit: true, isViewOnly: false };
  }

  // Check direct matches
  const hasDirectView = pages.includes(`${slug}:view`);
  const hasDirectEdit = pages.includes(`${slug}:edit`) || pages.includes(slug);

  // Check parent mappings (e.g. navratri_vendors or navratri_aarti mapped from navratri)
  const isNavratriSub = slug === 'navratri_vendors' || slug === 'navratri_aarti';
  const hasParentView = isNavratriSub && pages.includes('navratri:view');
  const hasParentEdit = isNavratriSub && (pages.includes('navratri:edit') || pages.includes('navratri'));

  // Support stripe vs bank-statement alias
  const isStripe = slug === 'stripe' || slug === 'bank-statement';
  const hasStripeView = isStripe && (pages.includes('stripe:view') || pages.includes('bank-statement:view'));
  const hasStripeEdit = isStripe && (pages.includes('stripe:edit') || pages.includes('bank-statement:edit') || pages.includes('stripe') || pages.includes('bank-statement'));

  // Direct rule takes precedence over parent rule
  if (hasDirectView || hasStripeView) {
    return { canAccess: true, canEdit: false, isViewOnly: true };
  }
  if (hasDirectEdit || hasStripeEdit) {
    return { canAccess: true, canEdit: true, isViewOnly: false };
  }

  if (hasParentView) {
    return { canAccess: true, canEdit: false, isViewOnly: true };
  }
  if (hasParentEdit) {
    return { canAccess: true, canEdit: true, isViewOnly: false };
  }

  return { canAccess: false, canEdit: false, isViewOnly: false };
}

export function canUserEdit(userOrPages, slug) {
  return checkPagePermission(userOrPages, slug).canEdit;
}

export function isPageViewOnly(userOrPages, slug) {
  return checkPagePermission(userOrPages, slug).isViewOnly;
}

export function canUserAccess(userOrPages, slug) {
  return checkPagePermission(userOrPages, slug).canAccess;
}

export async function getSessionAndPermissions(requiredSlug, options = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return { success: false, error: 'Unauthorized — please log in', status: 401 };

  const payload = await verifyToken(token);
  if (!payload) return { success: false, error: 'Session expired', status: 401 };

  if (payload.role === 'super_admin') {
    return { success: true, user: payload, canEdit: true, isViewOnly: false };
  }

  if (requiredSlug) {
    const slugs = Array.isArray(requiredSlug) ? requiredSlug : [requiredSlug];
    
    // Check if user has access to at least one of the required slugs
    const match = slugs.map(slug => ({ slug, ...checkPagePermission(payload, slug) })).find(m => m.canAccess);
    
    if (!match) {
      return { success: false, error: 'Forbidden — insufficient permissions', status: 403 };
    }

    // If edit/write permission is explicitly required for this API
    if (options.requireEdit) {
      if (!match.canEdit) {
        return {
          success: false,
          error: 'Forbidden — You have View-Only access to this page. Edits, additions, and deletions are disabled.',
          status: 403,
          isViewOnly: true,
        };
      }
    }

    return { success: true, user: payload, canEdit: match.canEdit, isViewOnly: match.isViewOnly };
  }

  return { success: true, user: payload, canEdit: true, isViewOnly: false };
}

/**
 * Shorthand helper for mutation APIs (POST, PUT, DELETE, PATCH).
 * Enforces that View-Only users are strictly blocked with 403 Forbidden.
 */
export async function requireEditPermission(requiredSlug) {
  return getSessionAndPermissions(requiredSlug, { requireEdit: true });
}

// Users flagged 'reports-view-only' may view and search the Membership page only
// (no PDF/CSV exports, no Odoo sync). Super admins and full-access ('*') users are never restricted.
export function isMembershipViewOnly(user) {
  if (!user || user.role === 'super_admin') return false;
  const pages = Array.isArray(user.allowedPages) ? user.allowedPages : [];
  if (pages.includes('*')) return false;
  return pages.includes('reports-view-only') || pages.includes('reports:view');
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
