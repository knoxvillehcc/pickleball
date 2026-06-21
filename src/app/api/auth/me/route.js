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
    return NextResponse.json({ user: { email: payload.email, name: payload.name, role: payload.role } });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
