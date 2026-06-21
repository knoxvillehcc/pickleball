// HCC Dashboard — Next.js 16 Proxy (formerly Middleware)
// NOTE: In Next.js 16, middleware.js is deprecated → renamed to proxy.js
// Function export must be named 'proxy' not 'middleware'

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'hcc_access';
const JWT_SECRET  = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod'
);

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ── Routes that skip auth entirely ────────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/login', '/access-denied', '/register',
  '/api/auth/login', '/api/auth/logout',
  '/api/pickleball/register', '/api/pickleball/webhook',
  '/api/pickleball/settings', '/api/health',
  '/_next', '/favicon',
];

function isPublic(pathname) {
  return PUBLIC_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  );
}

// ── Map pathname → page slug (for permission check) ──────────────────────────
function getPageSlug(pathname) {
  if (pathname === '/')                          return 'dashboard';
  if (pathname.startsWith('/reports/monthly'))  return 'monthly';
  if (pathname.startsWith('/reports'))          return 'reports';
  if (pathname.startsWith('/banner'))           return 'banner';
  if (pathname.startsWith('/pickleball'))       return 'pickleball';
  if (pathname.startsWith('/settings/users'))   return 'users';
  if (pathname.startsWith('/settings'))         return 'settings';
  if (pathname.startsWith('/api/auth/users'))   return 'users';
  return null;
}

function hasAccess(allowedPages, slug) {
  if (!allowedPages) return false;
  const pages = Array.isArray(allowedPages) ? allowedPages : JSON.parse(allowedPages);
  return pages.includes('*') || pages.includes(slug);
}

// ── Next.js 16: exported function MUST be named 'proxy' ──────────────────────
export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
    }
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }
    const url = new URL('/login', request.url);
    url.searchParams.set('expired', '1');
    return NextResponse.redirect(url);
  }

  // ── Page permission check ──────────────────────────────────────────────────
  // Super admin always has full access
  if (payload.role === 'super_admin') {
    const headers = new Headers(request.headers);
    headers.set('x-user-email',         payload.email  || '');
    headers.set('x-user-role',           'super_admin');
    headers.set('x-user-allowed-pages',  '["*"]');
    return NextResponse.next({ request: { headers } });
  }

  const slug = getPageSlug(pathname);
  if (slug) {
    const allowed = hasAccess(payload.allowedPages, slug);
    if (!allowed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Access denied to this resource' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  const headers = new Headers(request.headers);
  headers.set('x-user-email',         payload.email  || '');
  headers.set('x-user-role',           payload.role   || 'staff');
  headers.set('x-user-allowed-pages',  JSON.stringify(payload.allowedPages || []));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.png$).*)',
  ],
};
