import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
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
