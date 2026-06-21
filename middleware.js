// HCC Dashboard — Next.js Edge Middleware
// IMPORTANT: This file runs on the Edge runtime.
// Do NOT import from @/lib/auth — it uses bcryptjs + next/headers (Node-only).
// JWT verification is inlined here using jose directly.

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
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/pickleball/register',
  '/api/pickleball/webhook',
  '/api/pickleball/settings',
  '/api/health',
  '/_next',
  '/favicon',
];

function isPublic(pathname) {
  return PUBLIC_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  );
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublic(pathname)) return NextResponse.next();

  // Get JWT from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
    }
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Verify JWT
  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    url.searchParams.set('expired', '1');
    return NextResponse.redirect(url);
  }

  // Pass user info to server via headers
  const headers = new Headers(request.headers);
  headers.set('x-user-email', payload.email);
  headers.set('x-user-role',  payload.role || 'admin');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};
