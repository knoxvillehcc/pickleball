import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, generateToken, setAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ user: null }, { status: 401 });

    // Fetch the absolute latest user permissions from database in real-time
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const url = `${process.env.SUPABASE_URL}/rest/v1/hcc_users?id=eq.${payload.id}&select=*&limit=1`;
    const res = await fetch(url, {
      headers: {
        'apikey':         key,
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const rows = await res.json();
      const dbUser = rows?.[0];
      
      // If user was deleted or deactivated, revoke session
      if (!dbUser || !dbUser.active) {
        cookieStore.delete(COOKIE_NAME);
        return NextResponse.json({ user: null }, { status: 401 });
      }

      // Parse db allowed pages
      let allowedPages = dbUser.allowed_pages;
      if (typeof allowedPages === 'string') {
        try { allowedPages = JSON.parse(allowedPages); } catch { allowedPages = []; }
      }
      if (!Array.isArray(allowedPages)) allowedPages = [];

      // Super admin always gets wildcard
      if (dbUser.role === 'super_admin') allowedPages = ['*'];

      // Refresh JWT cookie so middleware (proxy.js) gets the updated permission list
      const freshToken = await generateToken({
        id:           dbUser.id,
        email:        dbUser.email,
        name:         dbUser.name || 'Admin',
        role:         dbUser.role || 'staff',
        allowedPages,
      });
      await setAuthCookie(freshToken);

      return NextResponse.json({
        user: {
          id:           dbUser.id,
          email:        dbUser.email,
          name:         dbUser.name,
          role:         dbUser.role,
          allowedPages,
        },
      });
    }

    // Fallback to JWT payload in case database is temporarily down
    let allowedPages = payload.allowedPages;
    if (typeof allowedPages === 'string') {
      try { allowedPages = JSON.parse(allowedPages); } catch { allowedPages = []; }
    }
    if (!Array.isArray(allowedPages)) allowedPages = [];

    // Super admin always gets wildcard — defensive override
    if (payload.role === 'super_admin') allowedPages = ['*'];

    return NextResponse.json({
      user: {
        id:           payload.id,
        email:        payload.email,
        name:         payload.name,
        role:         payload.role,
        allowedPages,
      },
    });
  } catch (err) {
    console.error('[Auth Me ERROR]', err);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
