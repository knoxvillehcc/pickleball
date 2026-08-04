import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SB_URL = () => process.env.SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
function sbHeaders() {
  return {
    apikey:         SB_KEY(),
    Authorization:  `Bearer ${SB_KEY()}`,
    'Content-Type': 'application/json',
    Prefer:         'return=representation',
  };
}

// GET /api/pnl/settings
export async function GET() {
  const auth = await getSessionAndPermissions('pnl');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const res  = await fetch(`${SB_URL()}/rest/v1/hcc_pnl_settings?select=key,value`, {
      headers: sbHeaders(), cache: 'no-store',
    });
    const rows = await res.json();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/pnl/settings — admin only
export async function POST(request) {
  const auth = await getSessionAndPermissions('pnl-settings');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    // Upsert single setting
    const res = await fetch(`${SB_URL()}/rest/v1/hcc_pnl_settings`, {
      method:  'POST',
      headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=representation' },
      body:    JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: 500 });
    }

    const result = await res.json();
    return NextResponse.json({ success: true, setting: Array.isArray(result) ? result[0] : result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/pnl/settings — bulk save all settings (admin only)
export async function PUT(request) {
  const auth = await getSessionAndPermissions('pnl-settings');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { settings } = await request.json();
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ success: false, error: 'Settings object required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value, updated_at: now }));

    const res = await fetch(`${SB_URL()}/rest/v1/hcc_pnl_settings`, {
      method:  'POST',
      headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=representation' },
      body:    JSON.stringify(rows),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
