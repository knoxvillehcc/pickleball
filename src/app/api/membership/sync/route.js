import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { getSessionAndPermissions } from '@/lib/auth';
import { buildMembershipSnapshot, saveSnapshot, writeSyncLog, getSyncLog } from '@/lib/membershipSync';

export const dynamic = 'force-dynamic';

const SCOPES = { membership: 'reports', monthly: 'monthly', pnl: 'pnl' };

// GET /api/membership/sync?scope=membership|monthly|pnl  -> last sync info
export async function GET(request) {
  const scope = new URL(request.url).searchParams.get('scope') || 'membership';
  if (!SCOPES[scope]) return NextResponse.json({ success: false, error: 'Unknown scope' }, { status: 400 });
  const auth = await getSessionAndPermissions(SCOPES[scope]);
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const key = scope === 'pnl' ? 'pnl' : 'membership';
  const { missing, log } = await getSyncLog(key);
  return NextResponse.json({
    success: true,
    tablesMissing: missing,
    lastSyncedAt: log?.last_synced_at || null,
    syncedBy: log?.synced_by || null,
    meta: log?.meta || null,
  });
}

// POST { scope } -> rebuild membership snapshot (or stamp P&L refresh)
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch {}
  const scope = body.scope || 'membership';
  if (!SCOPES[scope]) return NextResponse.json({ success: false, error: 'Unknown scope' }, { status: 400 });
  const auth = await getSessionAndPermissions(SCOPES[scope]);
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const by = auth.user?.name || auth.user?.email || 'Admin';
  const started = Date.now();
  try {
    if (scope === 'pnl') {
      const at = await writeSyncLog('pnl', { synced_by: by, record_count: 0, active_count: 0, meta: {} });
      return NextResponse.json({ success: true, lastSyncedAt: at, syncedBy: by });
    }

    const creds = await getCredentials();
    const uid = await odooAuth(creds);
    const odoo = (model, method, args, kwargs) => odooCall(creds, uid, model, method, args, kwargs);
    const { rows, meta } = await buildMembershipSnapshot(odoo);
    meta.duration_ms = Date.now() - started;
    const { syncedAt } = await saveSnapshot(rows, meta, by);
    return NextResponse.json({ success: true, lastSyncedAt: syncedAt, syncedBy: by, meta });
  } catch (error) {
    if (error.code === 'TABLE_MISSING') {
      return NextResponse.json({ success: false, tablesMissing: true, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
