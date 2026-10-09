import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { getSessionAndPermissions } from '@/lib/auth';
import { getSnapshot } from '@/lib/membershipSync';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await getSessionAndPermissions('reports');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const snap = await getSnapshot();
    if (!snap.missing && snap.rows.length > 0) {
      const summary = {};
      // Revenue: every payment received for that level (including earlier memberships that were upgraded)
      for (const r of snap.rows) {
        if (!r.counts_toward_revenue) continue;
        if (!summary[r.level]) summary[r.level] = { count: 0, revenue: 0 };
        summary[r.level].revenue += Number(r.amount || 0);
      }
      const results = [];
      for (const r of snap.rows) {
        if (!r.is_current) continue;
        if (!summary[r.level]) summary[r.level] = { count: 0, revenue: 0 };
        summary[r.level].count += 1;
        results.push({
          id: String(r.history_id),
          order: r.order_name || r.pos_order_name || '',
          customerId: r.partner_id,
          customer: r.partner_name || 'Unknown',
          phone: r.phone || null,
          type: r.level,
          status: r.status,
          date: r.start_date || 'Unknown',
          endDate: r.end_date || null,
          amount: Number(r.amount || 0),
          invoice: r.invoice_name || null,
          invoicePaymentState: r.invoice_payment_state || null,
          refunded: !!r.refunded,
          odooUpdatedAt: r.odoo_updated_at || null,
          history: Array.isArray(r.history) ? r.history : [],
        });
      }
      results.sort((a, b) => a.type.localeCompare(b.type) || a.customer.localeCompare(b.customer));
      return NextResponse.json({
        success: true, source: 'snapshot', summary, results,
        lastSyncedAt: snap.log?.last_synced_at || null,
        syncedBy: snap.log?.synced_by || null,
        meta: snap.log?.meta || null,
      });
    }
  } catch (e) {
    console.warn('[reports] snapshot unavailable, using live Odoo:', e.message);
  }
  return legacyGet(request);
}

async function legacyGet(request) {
  const auth = await getSessionAndPermissions('reports');
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
       return NextResponse.json({ success: true, summary: {}, results: [] });
    }

    const orderIds = subscriptions.map(s => s.id);
    const orderLines = await odooCall(creds, sessionId, 'sale.order.line', 'search_read', [
       [['order_id', 'in', orderIds]]
    ], {
       fields: ['id', 'order_id', 'product_id', 'price_subtotal']
    });

    const grouped = {};
    const allEntries = [];

    for (const sub of subscriptions) {
       const lines = orderLines.filter(l => l.order_id[0] === sub.id);
       if (lines.length === 0) continue;
       
       for (const line of lines) {
           const productInfo = line.product_id;
           if (!productInfo) continue;
           
           const typeName = productInfo[1];
           
           // Only include target memberships
           if (!typeName.toLowerCase().includes('general') && !typeName.toLowerCase().includes('pioneer') && !typeName.toLowerCase().includes('sports')) {
               continue;
           }

           allEntries.push({
              id: `${sub.id}-${line.id}`,
              order: sub.name,
              customerId: sub.partner_id ? sub.partner_id[0] : 0,
              customer: sub.partner_id ? sub.partner_id[1] : 'Unknown',
              type: typeName,
              date: sub.date_order ? sub.date_order.split(' ')[0] : 'Unknown',
              amount: line.price_subtotal || 0
           });
       }
    }

    // Deduplicate renewals: keep only the latest entry per customer per product type
    const seen = {};
    const deduped = [];
    // Sort by date descending so we keep the newest first
    allEntries.sort((a, b) => b.date.localeCompare(a.date));
    for (const entry of allEntries) {
       const key = `${entry.customerId}::${entry.type}`;
       if (seen[key]) continue; // Skip older renewal
       seen[key] = true;
       deduped.push(entry);

       if (!grouped[entry.type]) grouped[entry.type] = { count: 0, revenue: 0 };
       grouped[entry.type].count += 1;
       grouped[entry.type].revenue += entry.amount;
    }

    const results = deduped;
    results.sort((a,b) => a.type.localeCompare(b.type) || a.customer.localeCompare(b.customer));

    return NextResponse.json({ success: true, summary: grouped, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}