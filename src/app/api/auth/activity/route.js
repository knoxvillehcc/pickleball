import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Only super_admins (who have 'users' module access) can see login logs
  const auth = await getSessionAndPermissions('users');
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = searchParams.get('limit') || '100';

    let url = `${SUPABASE_URL}/rest/v1/hcc_login_activity?select=*&order=created_at.desc&limit=${limit}`;
    
    if (search) {
      const s = encodeURIComponent(`%${search}%`);
      url += `&or=(email.ilike.${s},name.ilike.${s},ip_address.ilike.${s},status.ilike.${s})`;
    }

    const res = await fetch(url, {
      headers: {
        'apikey':         SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text();
      // If table doesn't exist yet, return a clean state so UI displays sql prompt!
      if (res.status === 404 || body.includes('does not exist')) {
        return NextResponse.json({ success: true, activity: [], tableMissing: true });
      }
      throw new Error(`Database query failed: ${body}`);
    }

    const data = await res.json();
    return NextResponse.json({ success: true, activity: data });
  } catch (err) {
    console.error('[Auth Activity API ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
