'use server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    let charges = [];
    let source = 'cache';

    // ── Try Supabase cache first ────────────────────────────────────────────
    if (!forceRefresh && SUPABASE_URL && SUPABASE_KEY) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/stripe_charges?charge_date=gte.${startDate}&charge_date=lte.${endDate}&order=charge_date.desc,created_at.desc&limit=5000`;
        const res = await fetch(url, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
          cache: 'no-store',
        });

        if (res.ok) {
          const cached = await res.json();
          if (cached?.length > 0) {
            charges = cached.map(c => ({
              id: c.charge_id || c.id,
              date: c.charge_date,
              time: c.created_at ? new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
              amount: (c.amount || 0) / 100,
              fee: (c.fee || 0) / 100,
              net: ((c.amount || 0) - (c.fee || 0)) / 100,
              description: c.description || '',
              customer: c.customer_name || '',
              email: c.customer_email || '',
              payment_method: '',
              card_brand: '',
              card_last4: '',
              receipt_url: '',
            }));
            source = 'cache';
          }
        }
      } catch (cacheErr) {
        console.log('[stripe/statement] Cache miss, falling back to Stripe API');
      }
    }

    // ── Fallback to Stripe API if no cache ──────────────────────────────────
    if (charges.length === 0 || forceRefresh) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const startTs = Math.floor(new Date(startDate + 'T00:00:00').getTime() / 1000);
      const endTs = Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000);

      charges = [];
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
      source = 'stripe';
    }

    // ── Group by date for daily summary ─────────────────────────────────────
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
      source,
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
