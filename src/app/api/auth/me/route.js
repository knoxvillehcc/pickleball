import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ user: null }, { status: 401 });

    // Parse allowedPages — stored as array or JSON string in JWT
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
        allowedPages, // ← was missing — this is why sidebar was empty!
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
