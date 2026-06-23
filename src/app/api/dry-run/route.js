import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await getSessionAndPermissions('dashboard');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const creds = await getCredentials();
    const sessionId = await odooAuth(creds);

    const activeSubs = await odooCall(creds, sessionId, 'sale.order.line', 'search_read', [
      [['state', 'in', ['sale', 'done']], ['order_id.is_subscription', '=', true]]
    ], {
      fields: ['order_partner_id', 'product_id', 'order_id']
    });

    const activeSubSet = new Set(activeSubs.filter(s => s.order_partner_id && s.product_id).map(s => `${s.order_partner_id[0]}-${s.product_id[0]}`));
    const totalActiveSubscriptions = new Set(activeSubs.map(s => s.order_id && s.order_id[0])).size;

    // Filter products: MUST be recurring AND name must contain "pioneer" OR "general" OR "sports" OR "trustee"
    const products = await odooCall(creds, sessionId, 'product.product', 'search_read', [
      ['&', ['recurring_invoice', '=', true], '|', ['name', 'ilike', 'trustee'], '|', ['name', 'ilike', 'sports'], '|', ['name', 'ilike', 'pioneer'], ['name', 'ilike', 'general']]
    ], { fields: ['id', 'name', 'display_name'], limit: 100 });
    
    const productIds = products.map(p => p.id);
    
    if (productIds.length === 0) {
      return NextResponse.json({ success: true, summary: { totalActiveSubscriptions, posOrdersWithSubs: 0, wouldFix: 0, skipped: 0 }, data: [] });
    }

    const posLines = await odooCall(creds, sessionId, 'pos.order.line', 'search_read', [[['product_id', 'in', productIds]]], {
      fields: ['order_id', 'product_id', 'price_subtotal_incl'], limit: 1000 
    });

    const orderIds = [...new Set(posLines.map(l => l.order_id[0]))];
    
    let posOrders = [];
    if (orderIds.length > 0) {
      posOrders = await odooCall(creds, sessionId, 'pos.order', 'search_read', [[['id', 'in', orderIds]]], {
        fields: ['id', 'name', 'partner_id', 'account_move', 'date_order']
      });
    }

    // find messages indicating it was fixed
    const messages = await odooCall(creds, sessionId, 'mail.message', 'search_read', [
      [['body', 'ilike', 'transfer from pos order to a correct flow by HP']]
    ], { fields: ['res_id', 'model'] });
    const fixedMoveIds = new Set(messages.filter(m => m.model === 'account.move').map(m => m.res_id));

    const results = [];
    for (const order of posOrders) {
      if (!order.account_move || !order.partner_id) continue;
      
      const lines = posLines.filter(l => l.order_id[0] === order.id);
      if (lines.length === 0) continue;

      const productInfo = lines[0].product_id;
      const amount = lines.reduce((sum, l) => sum + l.price_subtotal_incl, 0);

      const hasSubscription = activeSubSet.has(`${order.partner_id[0]}-${productInfo[0]}`);
      let status = hasSubscription ? 'skipped' : 'would_fix';
      
      if (fixedMoveIds.has(order.account_move[0])) {
          status = 'skipped';
      }
      
      results.push({
        id: "pos-" + order.id,
        dbId: order.id,
        invoiceId: order.account_move[0],
        partnerId: order.partner_id[0],
        productId: productInfo[0],
        customerName: order.partner_id[1],
        invoiceNo: order.account_move[1] || "INV-POS-" + order.id,
        posOrder: order.name,
        product: productInfo[1],
        amount: amount,
        invoiceDate: order.date_order.split(' ')[0],
        status
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalActiveSubscriptions,
        posOrdersWithSubs: posOrders.length,
        wouldFix: results.filter(r => r.status === 'would_fix').length,
        skipped: results.filter(r => r.status === 'skipped').length
      },
      data: results
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}