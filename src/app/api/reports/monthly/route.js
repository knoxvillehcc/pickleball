import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { getSessionAndPermissions } from '@/lib/auth';
import { getSnapshot } from '@/lib/membershipSync';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await getSessionAndPermissions('monthly');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const snap = await getSnapshot();
    if (!snap.missing && snap.rows.length > 0) {
      const byPartner = {};
      for (const r of snap.rows) (byPartner[r.partner_id] ||= []).push(r);

      const months = {};
      const summary = {};
      const results = [];
      for (const r of snap.rows) {
        if (!r.counts_toward_revenue) continue;
        const rawDate = r.start_date || null;
        const monthKey = rawDate ? rawDate.slice(0, 7) : 'Unknown';
        const monthLabel = rawDate
          ? new Date(rawDate + 'T12:00:00').toLocaleString('en-US', { month: 'long', year: 'numeric' })
          : 'Unknown';
        const earlier = (byPartner[r.partner_id] || [])
          .filter((o) => o.history_id !== r.history_id && o.level !== r.level &&
            (String(o.start_date) < String(r.start_date) || (o.start_date === r.start_date && o.history_id < r.history_id)))
          .sort((a, b) => b.history_id - a.history_id)[0];
        const note = earlier ? `Upgraded from ${earlier.level}` : '';
        const amount = Number(r.amount || 0);

        if (!months[monthKey]) months[monthKey] = { label: monthLabel, count: 0, revenue: 0, members: [] };
        months[monthKey].count += 1;
        months[monthKey].revenue += amount;
        months[monthKey].members.push({
          id: String(r.history_id), customer: r.partner_name || 'Unknown', type: r.level,
          order: r.order_name || r.pos_order_name || '', date: rawDate || 'Unknown', amount, note,
          status: r.status,
        });
        if (!summary[r.level]) summary[r.level] = { count: 0, revenue: 0 };
        summary[r.level].count += 1;
        summary[r.level].revenue += amount;
        results.push({
          id: String(r.history_id), order: r.order_name || '', customer: r.partner_name || 'Unknown',
          type: r.level, date: rawDate || 'Unknown', amount, month: monthKey, monthLabel, note,
        });
      }
      const sortedMonths = Object.fromEntries(Object.entries(months).sort(([a], [b]) => b.localeCompare(a)));
      for (const mk of Object.keys(sortedMonths)) {
        sortedMonths[mk].members.sort((a, b) => a.customer.localeCompare(b.customer));
      }
      return NextResponse.json({
        success: true, source: 'snapshot', months: sortedMonths, summary, results,
        lastSyncedAt: snap.log?.last_synced_at || null,
        syncedBy: snap.log?.synced_by || null,
      });
    }
  } catch (e) {
    console.warn('[monthly] snapshot unavailable, using live Odoo:', e.message);
  }
  return legacyGet(request);
}

async function legacyGet(request) {
  const auth = await getSessionAndPermissions('monthly');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const creds = await getCredentials();
    const sessionId = await odooAuth(creds);

    const subscriptions = await odooCall(creds, sessionId, 'sale.order', 'search_read', [
      [['state', 'in', ['sale', 'done']], ['is_subscription', '=', true]]
    ], {
      fields: ['id', 'name', 'partner_id', 'order_line', 'amount_total', 'date_order']
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, months: {}, results: [], summary: {} });
    }

    const orderIds = subscriptions.map(s => s.id);
    const orderLines = await odooCall(creds, sessionId, 'sale.order.line', 'search_read', [
      [['order_id', 'in', orderIds]]
    ], {
      fields: ['id', 'order_id', 'product_id', 'price_subtotal']
    });

    // months: { 'YYYY-MM': { label, count, revenue, members: [] } }
    const months = {};
    // summary by subscription type
    const summary = {};
    const results = [];

    for (const sub of subscriptions) {
      const lines = orderLines.filter(l => l.order_id[0] === sub.id);
      if (lines.length === 0) continue;

      for (const line of lines) {
        const productInfo = line.product_id;
        if (!productInfo) continue;

        const typeName = productInfo[1];

        // Only include target memberships
        if (
          !typeName.toLowerCase().includes('general') &&
          !typeName.toLowerCase().includes('pioneer') &&
          !typeName.toLowerCase().includes('sports')
        ) {
          continue;
        }

        const rawDate = sub.date_order ? sub.date_order.split(' ')[0] : null;
        const dateObj  = rawDate ? new Date(rawDate) : null;
        const monthKey = dateObj
          ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
          : 'Unknown';
        const monthLabel = dateObj
          ? dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' })
          : 'Unknown';

        // Group by month
        if (!months[monthKey]) {
          months[monthKey] = { label: monthLabel, count: 0, revenue: 0, members: [] };
        }
        months[monthKey].count   += 1;
        months[monthKey].revenue += line.price_subtotal;
        months[monthKey].members.push({
          id:       `${sub.id}-${line.id}`,
          customer: sub.partner_id ? sub.partner_id[1] : 'Unknown',
          type:     typeName,
          order:    sub.name,
          date:     rawDate || 'Unknown',
          amount:   line.price_subtotal || 0,
        });

        // Overall type summary
        if (!summary[typeName]) summary[typeName] = { count: 0, revenue: 0 };
        summary[typeName].count   += 1;
        summary[typeName].revenue += line.price_subtotal;

        results.push({
          id:       `${sub.id}-${line.id}`,
          order:    sub.name,
          customer: sub.partner_id ? sub.partner_id[1] : 'Unknown',
          type:     typeName,
          date:     rawDate || 'Unknown',
          amount:   line.price_subtotal || 0,
          month:    monthKey,
          monthLabel,
        });
      }
    }

    // Sort months descending (newest first)
    const sortedMonths = Object.fromEntries(
      Object.entries(months).sort(([a], [b]) => b.localeCompare(a))
    );

    // Sort members within each month by customer name
    for (const mk of Object.keys(sortedMonths)) {
      sortedMonths[mk].members.sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return NextResponse.json({ success: true, months: sortedMonths, summary, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
