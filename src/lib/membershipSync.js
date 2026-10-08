/**
 * membershipSync.js
 * Builds a membership snapshot from the HCC Odoo custom module (sh.membership.history),
 * stores it in Supabase, and reads it back. Dates are stored ISO (YYYY-MM-DD) and
 * formatted MM-DD-YYYY by the UI.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const LEVEL_RANK = { trustee: 5, pioneer: 4, 'sport membership w/general': 3, 'sport membership': 2, general: 1 };
const rankOf = (name) => {
  const n = String(name || '').toLowerCase();
  if (LEVEL_RANK[n] != null) return LEVEL_RANK[n];
  if (n.includes('trustee')) return 5;
  if (n.includes('pioneer')) return 4;
  if (n.includes('sport')) return n.includes('general') ? 3 : 2;
  if (n.includes('general')) return 1;
  return 0;
};

const odooUtcToIso = (s) => (s ? String(s).replace(' ', 'T') + 'Z' : null);
const m2oId = (v) => (Array.isArray(v) ? v[0] : v || null);
const m2oName = (v) => (Array.isArray(v) ? v[1] : null);

function headers(extra = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function tableMissing(status, body) {
  return status === 404 || /PGRST205|PGRST204|does not exist|schema cache/i.test(body || '');
}

/**
 * Pure builder. `odoo(model, method, args, kwargs)` must return the RPC result.
 * Returns { rows, meta }.
 */
export async function buildMembershipSnapshot(odoo) {
  const history = await odoo('sh.membership.history', 'search_read', [[]], {
    fields: ['id', 'partner_id', 'grade_id', 'grade_name', 'start_date', 'end_date', 'status',
             'pos_order_id', 'invoice_id', 'write_date'],
    context: { active_test: false },
  });

  const histIds = history.map((h) => h.id);
  const orders = histIds.length
    ? await odoo('sale.order', 'search_read', [[['sh_membership_history_id', 'in', histIds]]], {
        fields: ['id', 'name', 'state', 'amount_total', 'sh_membership_history_id'],
      })
    : [];
  const orderByHist = {};
  for (const o of orders) {
    const hid = m2oId(o.sh_membership_history_id);
    if (!hid) continue;
    // Prefer a confirmed order if several link to the same history row
    if (!orderByHist[hid] || (orderByHist[hid].state !== 'sale' && o.state === 'sale')) orderByHist[hid] = o;
  }

  const invIds = [...new Set(history.map((h) => m2oId(h.invoice_id)).filter(Boolean))];
  const invoices = invIds.length
    ? await odoo('account.move', 'read', [invIds], { fields: ['id', 'name', 'payment_state', 'state', 'amount_total'] })
    : [];
  const invById = Object.fromEntries(invoices.map((i) => [i.id, i]));

  // Completed online payments (Stripe etc.) recorded against the order. These prove money was
  // received even when the invoice was later cancelled (for example during a membership upgrade).
  const soIds = orders.map((o) => o.id);
  const txs = soIds.length
    ? await odoo('payment.transaction', 'search_read', [[['sale_order_ids', 'in', soIds], ['state', '=', 'done']]], {
        fields: ['sale_order_ids', 'amount', 'provider_reference'],
      })
    : [];
  const paidTxBySo = {};
  for (const t of txs) for (const sid of t.sale_order_ids || []) paidTxBySo[sid] = t;

  const rows = history.map((h) => {
    const inv = invById[m2oId(h.invoice_id)] || null;
    const so = orderByHist[h.id] || null;
    const amount = so && so.state !== 'cancel' ? so.amount_total : inv ? inv.amount_total : so ? so.amount_total : 0;
    const paidTx = so ? paidTxBySo[so.id] : null;
    const refunded = !!inv && !paidTx && (inv.payment_state === 'reversed' || inv.state === 'cancel');
    // Revenue counts money actually received: not refunded, and invoice (if any) is paid/in payment,
    // or a completed online payment exists on the order.
    const invPaid = !inv || !!paidTx || ['paid', 'in_payment', 'partial'].includes(inv.payment_state);
    const soOk = !so || so.state !== 'cancel' || (inv && invPaid);
    const counts = !refunded && invPaid && soOk;
    return {
      history_id: h.id,
      partner_id: m2oId(h.partner_id),
      partner_name: m2oName(h.partner_id),
      level: h.grade_name || m2oName(h.grade_id) || 'Unknown',
      level_id: m2oId(h.grade_id),
      status: h.status,
      start_date: h.start_date || null,
      end_date: h.end_date || null,
      order_name: so ? so.name : null,
      order_state: so ? so.state : null,
      invoice_name: inv ? inv.name : null,
      invoice_payment_state: inv ? (paidTx && !['paid', 'in_payment', 'partial'].includes(inv.payment_state) ? 'paid_online' : inv.payment_state) : null,
      invoice_state: inv ? inv.state : null,
      pos_order_name: m2oName(h.pos_order_id),
      amount: Number(amount || 0),
      counts_toward_revenue: counts,
      refunded,
      odoo_updated_at: odooUtcToIso(h.write_date),
      is_current: false,
      history: [],
    };
  });

  // One "current" row per partner among active rows; the rest become that member's history.
  const byPartner = {};
  for (const r of rows) (byPartner[r.partner_id] ||= []).push(r);
  let activeMembers = 0;
  for (const list of Object.values(byPartner)) {
    const active = list.filter((r) => r.status === 'active');
    if (!active.length) continue;
    active.sort((a, b) => rankOf(b.level) - rankOf(a.level) || String(b.start_date).localeCompare(String(a.start_date)));
    const current = active[0];
    current.is_current = true;
    activeMembers += 1;
    current.history = list
      .filter((r) => r !== current)
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
      .map((r) => ({
        level: r.level, status: r.status, start_date: r.start_date, end_date: r.end_date,
        amount: r.amount, order_name: r.order_name, invoice_name: r.invoice_name,
        invoice_payment_state: r.invoice_payment_state, counts_toward_revenue: r.counts_toward_revenue,
      }));
  }

  const unpaid = rows.filter((r) => r.invoice_payment_state === 'not_paid');
  const meta = {
    total_rows: rows.length,
    active_members: activeMembers,
    revenue_total: rows.filter((r) => r.counts_toward_revenue).reduce((s, r) => s + r.amount, 0),
    unpaid_invoice_count: unpaid.length,
    unpaid_invoice_amount: unpaid.reduce((s, r) => s + r.amount, 0),
    refunded_active_count: rows.filter((r) => r.refunded && r.status === 'active').length,
    no_invoice_count: rows.filter((r) => !r.invoice_name).length,
  };
  return { rows, meta };
}

export async function saveSnapshot(rows, meta, syncedBy) {
  const runId = `run-${Date.now()}`;
  const syncedAt = new Date().toISOString();
  const payload = rows.map((r) => ({ ...r, sync_run_id: runId, synced_at: syncedAt }));

  for (let i = 0; i < payload.length; i += 200) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_membership_snapshot?on_conflict=history_id`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(payload.slice(i, i + 200)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text();
      if (tableMissing(res.status, body)) { const e = new Error('Snapshot tables are not created yet'); e.code = 'TABLE_MISSING'; throw e; }
      throw new Error(`Snapshot save failed: ${body}`);
    }
  }
  // Remove rows no longer in Odoo
  await fetch(`${SUPABASE_URL}/rest/v1/hcc_membership_snapshot?sync_run_id=neq.${runId}`, {
    method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }), cache: 'no-store',
  });
  await writeSyncLog('membership', { synced_by: syncedBy, record_count: rows.length, active_count: meta.active_members, meta }, syncedAt);
  return { syncedAt };
}

export async function writeSyncLog(key, fields, at = new Date().toISOString()) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_sync_log?on_conflict=key`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ key, last_synced_at: at, ...fields }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    if (tableMissing(res.status, body)) { const e = new Error('Snapshot tables are not created yet'); e.code = 'TABLE_MISSING'; throw e; }
    throw new Error(`Sync log failed: ${body}`);
  }
  return at;
}

export async function getSyncLog(key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_sync_log?key=eq.${key}&select=*&limit=1`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    if (tableMissing(res.status, body)) return { missing: true };
    return { missing: false, log: null };
  }
  const rows = await res.json();
  return { missing: false, log: rows[0] || null };
}

/** Returns { missing, rows, log } — rows are ALL snapshot rows. */
export async function getSnapshot() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_membership_snapshot?select=*&limit=5000`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    if (tableMissing(res.status, body)) return { missing: true, rows: [], log: null };
    throw new Error(`Snapshot read failed: ${body}`);
  }
  const rows = await res.json();
  const { log } = await getSyncLog('membership');
  return { missing: false, rows, log };
}
