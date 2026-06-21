import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export const dynamic = 'force-dynamic';

// Product IDs: 83 = Yearly Banner 2026, 84 = Yearly Banner 2026 (Any$)
const BANNER_PRODUCT_IDS = [83, 84];

export async function GET(request) {
  try {
    const creds     = await getCredentials();
    const sessionId = await odooAuth(creds);
    const { searchParams } = new URL(request.url);

    const search   = searchParams.get('search')   || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo   = searchParams.get('dateTo')   || '';

    // â”€â”€ Account Invoices only (all payment states) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const invLineDomain = [
      ['product_id', 'in', BANNER_PRODUCT_IDS],
      ['move_id.move_type', '=', 'out_invoice'],
      ['move_id.state', '=', 'posted'],
    ];
    if (dateFrom) invLineDomain.push(['move_id.invoice_date', '>=', dateFrom]);
    if (dateTo)   invLineDomain.push(['move_id.invoice_date', '<=', dateTo]);

    const invLines = await odooCall(creds, sessionId, 'account.move.line', 'search_read', [invLineDomain], {
      fields: ['move_id', 'product_id', 'quantity', 'price_total'],
    });

    if (invLines.length === 0) {
      return NextResponse.json({ success: true, results: [], stats: { total: 0, totalRevenue: 0, uniqueCustomers: 0, paidCount: 0, unpaidCount: 0 } });
    }

    const moveIds = [...new Set(invLines.map(l => l.move_id[0]))];
    const invoices = await odooCall(creds, sessionId, 'account.move', 'search_read', [
      [['id', 'in', moveIds]]
    ], {
      fields: ['name', 'partner_id', 'invoice_date', 'payment_state', 'amount_total', 'invoice_user_id', 'user_id'],
      order: 'invoice_date desc',
    });

    const invoiceMap = {};
    for (const inv of invoices) invoiceMap[inv.id] = inv;

    const results = [];
    for (const line of invLines) {
      const inv = invoiceMap[line.move_id[0]];
      if (!inv) continue;

      const customerName = inv.partner_id ? inv.partner_id[1] : 'Unknown';
      if (search && !customerName.toLowerCase().includes(search.toLowerCase())) continue;

      const takenBy = inv.invoice_user_id
        ? inv.invoice_user_id[1]
        : (inv.user_id ? inv.user_id[1] : 'Unknown');

      // Treat in_payment same as paid (no bank reconciliation needed)
      let statusLabel = 'Unpaid';
      let statusColor = 'red';
      if (inv.payment_state === 'paid' || inv.payment_state === 'in_payment') { statusLabel = 'Paid'; statusColor = 'green'; }
      else if (inv.payment_state === 'partial') { statusLabel = 'Partial'; statusColor = 'yellow'; }

      results.push({
        orderId:      inv.name,
        customerName: customerName,
        date:         inv.invoice_date || '',
        product:      line.product_id ? line.product_id[1] : 'Unknown',
        amount:       line.price_total || 0,
        takenBy:      takenBy,
        paymentState: inv.payment_state,
        statusLabel:  statusLabel,
        statusColor:  statusColor,
      });
    }

    results.sort((a, b) => b.date.localeCompare(a.date) || a.customerName.localeCompare(b.customerName));

    const stats = {
      total:           results.length,
      totalRevenue:    results.filter(r => r.statusColor !== 'red').reduce((s, r) => s + (r.amount || 0), 0),
      totalOutstanding: results.filter(r => r.paymentState === 'not_paid' || r.paymentState === 'partial').reduce((s, r) => s + (r.amount || 0), 0),
      uniqueCustomers: new Set(results.map(r => r.customerName)).size,
      paidCount:       results.filter(r => r.paymentState === 'paid' || r.paymentState === 'in_payment').length,
      unpaidCount:     results.filter(r => r.paymentState === 'not_paid').length,
    };

    return NextResponse.json({ success: true, results, stats });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}