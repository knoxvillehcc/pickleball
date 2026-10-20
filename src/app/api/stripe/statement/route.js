'use server';
import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const startTs = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
    const endTs = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);

    const charges = [];

    // 1. Fetch Succeeded Charges
    for await (const ch of stripe.charges.list({
      limit: 100,
      created: { gte: startTs, lte: endTs },
      expand: ['data.balance_transaction'],
    })) {
      if (ch.status !== 'succeeded') continue;

      const gross = ch.amount / 100;
      const fee = ch.balance_transaction?.fee ? ch.balance_transaction.fee / 100 : 0;
      const net = gross - fee;
      const date = new Date(ch.created * 1000).toISOString().split('T')[0];
      const time = new Date(ch.created * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      charges.push({
        id: ch.id,
        date,
        time,
        amount: gross,
        fee,
        net,
        is_refund: false,
        type: 'charge',
        refund_reason: '',
        original_date: '',
        product_name: ch.description || 'Online Payment',
        description: ch.description || '',
        customer: ch.billing_details?.name || ch.receipt_email || '',
        email: ch.billing_details?.email || ch.receipt_email || '',
        payment_method: ch.payment_method_details?.type || '',
        card_brand: ch.payment_method_details?.card?.brand || '',
        card_last4: ch.payment_method_details?.card?.last4 || '',
        receipt_url: ch.receipt_url || '',
      });
    }

    // 2. Fetch Refunds that occurred in this date range
    let refundsList = [];
    try {
      const rfRes = await stripe.refunds.list({
        limit: 100,
        created: { gte: startTs, lte: endTs },
        expand: ['data.charge', 'data.charge.payment_intent', 'data.balance_transaction'],
      });
      refundsList = rfRes.data || [];
    } catch (refErr) {
      console.warn('[stripe/statement] Refunds fetch warning:', refErr.message);
    }

    // Connect to Odoo for invoice/SO resolution if needed
    let creds = null, uid = null;
    try {
      creds = await getCredentials();
      uid = await odooAuth(creds);
    } catch (oErr) {
      // Graceful fallback
    }

    for (const ref of refundsList) {
      const ch = ref.charge;
      const chPi = ch?.payment_intent?.id || ch?.payment_intent;
      const refAmount = -(ref.amount / 100); // negative amount
      const refFee = ref.balance_transaction?.fee ? (ref.balance_transaction.fee / 100) : 0;
      const refNet = refAmount - refFee;
      const refDate = new Date(ref.created * 1000).toISOString().split('T')[0];
      const refTime = new Date(ref.created * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const origDate = ch?.created ? new Date(ch.created * 1000).toISOString().split('T')[0] : '';
      const refReason = ref.reason ? (ref.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : 'Requested by Customer';

      // Resolve product/service
      let resolvedProduct = ch?.description || 'Refunded Payment';

      // A. Check Stripe Checkout Session
      if (chPi) {
        try {
          const sess = await stripe.checkout.sessions.list({ payment_intent: chPi, expand: ['data.line_items'] });
          if (sess.data[0]?.line_items?.data?.length) {
            resolvedProduct = sess.data[0].line_items.data.map(i => i.description || i.price?.product).join(', ');
          }
        } catch (sErr) {}
      }

      // B. Check Odoo Sale Order / Invoice if starts with S0...
      if (creds && uid && resolvedProduct.match(/^S\d{4,}/i)) {
        const soName = resolvedProduct.match(/^S\d{4,}/i)[0];
        try {
          const soList = await odooCall(creds, uid, 'sale.order', 'search_read', [[['name', '=', soName]]], { fields: ['order_line'] });
          if (soList.length > 0 && soList[0].order_line?.length) {
            const soLines = await odooCall(creds, uid, 'sale.order.line', 'read', [soList[0].order_line], ['name', 'product_id']);
            if (soLines.length > 0) {
              resolvedProduct = soLines.map(sl => sl.product_id ? sl.product_id[1] : sl.name).join(', ');
            }
          }
        } catch (soErr) {}
      }

      charges.push({
        id: ref.id,
        date: refDate,
        time: refTime,
        amount: refAmount,
        fee: refFee,
        net: refNet,
        is_refund: true,
        type: 'refund',
        refund_reason: refReason,
        original_date: origDate,
        product_name: resolvedProduct,
        description: `[REFUND] ${resolvedProduct}`,
        customer: ch?.billing_details?.name || ch?.receipt_email || 'Customer',
        email: ch?.billing_details?.email || ch?.receipt_email || '',
        payment_method: ch?.payment_method_details?.type || '',
        card_brand: ch?.payment_method_details?.card?.brand || '',
        card_last4: ch?.payment_method_details?.card?.last4 || '',
        receipt_url: ch?.receipt_url || '',
      });
    }

    // Sort all charges and refunds by date descending, then time descending
    charges.sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return cmpDate;
      return (b.time || '').localeCompare(a.time || '');
    });

    // ── Group by date for daily summary ─────────────────────────────────────
    const dailySummary = {};
    for (const ch of charges) {
      if (!dailySummary[ch.date]) {
        dailySummary[ch.date] = { gross: 0, refunds: 0, fee: 0, net: 0, count: 0, refundsCount: 0 };
      }
      if (ch.is_refund) {
        dailySummary[ch.date].refunds += ch.amount; // negative
        dailySummary[ch.date].refundsCount++;
      } else {
        dailySummary[ch.date].gross += ch.amount;
      }
      dailySummary[ch.date].fee += ch.fee;
      dailySummary[ch.date].net += ch.net;
      dailySummary[ch.date].count++;
    }

    let totalGross = 0;
    let totalRefunds = 0;
    let totalFees = 0;
    let totalNet = 0;
    let chargesCount = 0;
    let refundsCount = 0;

    for (const ch of charges) {
      if (ch.is_refund) {
        totalRefunds += ch.amount;
        refundsCount++;
      } else {
        totalGross += ch.amount;
        chargesCount++;
      }
      totalFees += ch.fee;
      totalNet += ch.net;
    }

    const totals = {
      gross: totalGross,
      refunds: totalRefunds,
      fee: totalFees,
      net: totalNet,
      chargesCount,
      refundsCount,
      count: charges.length,
    };

    return NextResponse.json({
      success: true,
      source: 'stripe',
      charges,
      dailySummary: Object.entries(dailySummary)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
      totals,
      dateRange: { start: startDate, end: endDate },
    });
  } catch (error) {
    console.error('[stripe/statement] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
