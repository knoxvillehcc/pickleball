'use server';
import { NextResponse } from 'next/server';

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

    // Convert dates to Unix timestamps
    const startTs = Math.floor(new Date(startDate + 'T00:00:00').getTime() / 1000);
    const endTs = Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000);

    // Fetch all charges in date range
    const charges = [];
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
        description: ch.description || '',
        customer: ch.billing_details?.name || ch.receipt_email || '',
        email: ch.billing_details?.email || ch.receipt_email || '',
        payment_method: ch.payment_method_details?.type || '',
        card_brand: ch.payment_method_details?.card?.brand || '',
        card_last4: ch.payment_method_details?.card?.last4 || '',
        receipt_url: ch.receipt_url || '',
      });
    }

    // Group by date for daily summary
    const dailySummary = {};
    for (const ch of charges) {
      if (!dailySummary[ch.date]) {
        dailySummary[ch.date] = { gross: 0, fee: 0, net: 0, count: 0 };
      }
      dailySummary[ch.date].gross += ch.amount;
      dailySummary[ch.date].fee += ch.fee;
      dailySummary[ch.date].net += ch.net;
      dailySummary[ch.date].count++;
    }

    const totals = charges.reduce((acc, ch) => ({
      gross: acc.gross + ch.amount,
      fee: acc.fee + ch.fee,
      net: acc.net + ch.net,
      count: acc.count + 1,
    }), { gross: 0, fee: 0, net: 0, count: 0 });

    return NextResponse.json({
      success: true,
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
