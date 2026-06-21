// HCC Dashboard — Next.js Edge Middleware
// Protects all admin routes. Public routes are always accessible.

import { NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

// ── Routes that are always public ────────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/login',
  '/register',                         // public registration pages
  '/api/auth/login',                   // login API
  '/api/auth/logout',                  // logout API
  '/api/pickleball/register',          // registration form submission
  '/api/pickleball/webhook',           // Stripe webhook
  '/api/pickleball/settings',          // publish/unpublish check (public)
  '/api/health',                       // health check
  '/_next',                            // Next.js internals
  '/favicon',
];

function isPublic(pathname) {
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublic(pathname)) return NextResponse.next();

  // Get token from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
    }
    // Page routes → redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session expired — please log in again' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('expired', '1');
    return NextResponse.redirect(loginUrl);
  }

  // Inject user info as headers for server components
  const headers = new Headers(request.headers);
  headers.set('x-user-email', payload.email);
  headers.set('x-user-role',  payload.role || 'admin');

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};
