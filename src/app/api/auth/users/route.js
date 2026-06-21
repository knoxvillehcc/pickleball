import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SB_URL = () => process.env.SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

function sbHeaders() {
  return {
    'apikey':         SB_KEY(),
    'Authorization': `Bearer ${SB_KEY()}`,
    'Content-Type':  'application/json',
    'Prefer':         'return=representation',
  };
}

async function getCurrentUser(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload;
}

// GET /api/auth/users  — list all users (super_admin only)
export async function GET(request) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const res = await fetch(`${SB_URL()}/rest/v1/hcc_users?select=id,email,name,role,allowed_pages,active,created_at&order=created_at.asc`, {
    headers: sbHeaders(),
  });
  const data = await res.json();
  return NextResponse.json({ users: data });
}

// POST /api/auth/users  — create a new user (super_admin only)
export async function POST(request) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, pin, name, role, allowedPages } = await request.json();

  if (!email || !pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'Valid email and 6-digit PIN required' }, { status: 400 });
  }

  const pinHash = await bcrypt.hash(pin, 12);

  const res = await fetch(`${SB_URL()}/rest/v1/hcc_users`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify({
      email:         email.toLowerCase().trim(),
      name:          name || email.split('@')[0],
      pin_hash:      pinHash,
      role:          role || 'staff',
      allowed_pages: allowedPages || [],
      active:        true,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    const msg = err?.[0]?.message || 'Failed to create user';
    if (msg.includes('unique')) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const [user] = await res.json();
  return NextResponse.json({ success: true, user });
}
