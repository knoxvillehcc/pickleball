import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SB_URL = () => process.env.SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

function sbHeaders() {
  return {
    apikey:        SB_KEY(),
    Authorization: `Bearer ${SB_KEY()}`,
    'Content-Type': 'application/json',
    Prefer:         'return=representation',
  };
}

// POST /api/pnl/audit — write an audit log entry
export async function POST(request) {
  const auth = await getSessionAndPermissions('pnl');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
  }

  const user = auth.user;
  const ip   = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const ua   = request.headers.get('user-agent') || 'Unknown';

  try {
    const body = await request.json();
    const {
      action,         // 'view_report' | 'export_excel' | 'export_csv' | 'export_pdf' | 'refresh_data' | 'view_invoice_detail' | 'change_date_range' | 'change_permissions' | 'change_settings'
      dateRangeStart,
      dateRangeEnd,
      filters,        // object of active filters
      exportType,     // 'excel' | 'csv' | 'pdf' | null
      fileName,       // exported file name
      detailLevel,    // 'summary' | 'category' | 'product' | 'full'
      accountingBasis,
    } = body;

    const logEntry = {
      user_id:          user.id         || null,
      user_email:       user.email      || null,
      user_name:        user.name       || null,
      action:           action          || 'unknown',
      date_range_start: dateRangeStart  || null,
      date_range_end:   dateRangeEnd    || null,
      filters:          filters         || null,
      export_type:      exportType      || null,
      file_name:        fileName        || null,
      detail_level:     detailLevel     || null,
      accounting_basis: accountingBasis || null,
      ip_address:       ip,
      session_info:     ua,
      created_at:       new Date().toISOString(),
    };

    const res = await fetch(`${SB_URL()}/rest/v1/hcc_pnl_audit_log`, {
      method:  'POST',
      headers: sbHeaders(),
      body:    JSON.stringify(logEntry),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[P&L Audit] Failed to write log:', errText);
      // Don't fail the request — audit is best-effort
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn('[P&L Audit Error]', error.message);
    // Audit failures are non-fatal
    return NextResponse.json({ success: true });
  }
}

// GET /api/pnl/audit — read audit log (pnl-settings permission required)
export async function GET(request) {
  const auth = await getSessionAndPermissions('pnl-settings');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit  = parseInt(searchParams.get('limit')  || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const action = searchParams.get('action') || null;

    let url = `${SB_URL()}/rest/v1/hcc_pnl_audit_log?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (action) url += `&action=eq.${encodeURIComponent(action)}`;

    const res = await fetch(url, { headers: sbHeaders(), cache: 'no-store' });
    const data = await res.json();

    return NextResponse.json({ success: true, logs: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
