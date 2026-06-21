import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export const dynamic = 'force-dynamic';

export async function GET(request) {
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
    const results = [];

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

           if (!grouped[typeName]) grouped[typeName] = { count: 0, revenue: 0 };
           grouped[typeName].count += 1;
           grouped[typeName].revenue += line.price_subtotal;

           results.push({
              id: `${sub.id}-${line.id}`,
              order: sub.name,
              customer: sub.partner_id ? sub.partner_id[1] : 'Unknown',
              type: typeName,
              date: sub.date_order ? sub.date_order.split(' ')[0] : 'Unknown',
              amount: line.price_subtotal || 0
           });
       }
    }

    results.sort((a,b) => a.type.localeCompare(b.type) || a.customer.localeCompare(b.customer));

    return NextResponse.json({ success: true, summary: grouped, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}