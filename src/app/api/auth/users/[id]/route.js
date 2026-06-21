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

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// PUT /api/auth/users/[id] — update user pages/active/reset PIN
export async function PUT(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const updates = {};

  if (body.allowedPages !== undefined) updates.allowed_pages = body.allowedPages;
  if (body.active       !== undefined) updates.active        = body.active;
  if (body.role         !== undefined) updates.role          = body.role;
  if (body.name         !== undefined) updates.name          = body.name;
  if (body.pin) {
    if (!/^\d{6}$/.test(body.pin)) {
      return NextResponse.json({ error: 'PIN must be 6 digits' }, { status: 400 });
    }
    updates.pin_hash = await bcrypt.hash(body.pin, 12);
  }

  const res = await fetch(`${SB_URL()}/rest/v1/hcc_users?id=eq.${id}`, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify(updates),
  });

  if (!res.ok) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  const [user] = await res.json();
  return NextResponse.json({ success: true, user });
}

// DELETE /api/auth/users/[id] — delete user (cannot delete self)
export async function DELETE(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Prevent self-deletion
  if (String(id) === String(me.id)) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const res = await fetch(`${SB_URL()}/rest/v1/hcc_users?id=eq.${id}`, {
    method: 'DELETE',
    headers: sbHeaders(),
  });

  if (!res.ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  return NextResponse.json({ success: true });
}
