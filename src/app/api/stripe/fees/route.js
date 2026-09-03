/**
 * ═══════════════════════════════════════════════════════════════════
 * Stripe Fees Report API
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET /api/stripe/fees?start=2026-08-01&end=2026-08-31
 *
 * Returns:
 *   - Total fees, gross, net for the period
 *   - Daily breakdown
 *   - Per-charge detail
 *
 * Auth: requires super_admin role
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Auth check
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json({
        error: 'Missing required params: start and end (YYYY-MM-DD format)',
        example: '/api/stripe/fees?start=2026-08-01&end=2026-08-31',
      }, { status: 400 });
    }

    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    };

    // Fetch all successful charges in the date range
    const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/stripe_sync_log`);
    url.searchParams.set('type', 'eq.charge');
    url.searchParams.set('status', 'eq.success');
    url.searchParams.set('stripe_created_at', `gte.${startDate}T00:00:00Z`);
    url.searchParams.set('select', 'stripe_id,amount,fee,net,currency,stripe_created_at,customer_name,customer_email,description');
    url.searchParams.set('order', 'stripe_created_at.desc');
    url.searchParams.set('limit', '1000');

    // Add end date filter separately  
    const endFilter = `lte.${endDate}T23:59:59Z`;

    const fetchUrl = `${process.env.SUPABASE_URL}/rest/v1/stripe_sync_log?type=eq.charge&status=eq.success&stripe_created_at=gte.${startDate}T00:00:00Z&stripe_created_at=lte.${endDate}T23:59:59Z&select=stripe_id,amount,fee,net,currency,stripe_created_at,customer_name,customer_email,description&order=stripe_created_at.desc&limit=1000`;

    const res = await fetch(fetchUrl, { headers, cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Supabase query failed: ${text}` }, { status: 500 });
    }

    const charges = await res.json();

    // Calculate totals
    let totalGross = 0;
    let totalFees = 0;
    let totalNet = 0;
    const dailyMap = {};

    for (const charge of charges) {
      const gross = parseFloat(charge.amount) || 0;
      const fee = parseFloat(charge.fee) || 0;
      const net = parseFloat(charge.net) || 0;

      totalGross += gross;
      totalFees += fee;
      totalNet += net;

      // Group by date
      const date = charge.stripe_created_at
        ? charge.stripe_created_at.split('T')[0]
        : 'unknown';

      if (!dailyMap[date]) {
        dailyMap[date] = { date, charges: 0, gross: 0, fees: 0, net: 0 };
      }
      dailyMap[date].charges++;
      dailyMap[date].gross += gross;
      dailyMap[date].fees += fee;
      dailyMap[date].net += net;
    }

    // Sort daily breakdown by date
    const dailyBreakdown = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        gross: Math.round(d.gross * 100) / 100,
        fees: Math.round(d.fees * 100) / 100,
        net: Math.round(d.net * 100) / 100,
      }));

    return NextResponse.json({
      success: true,
      period: { start: startDate, end: endDate },
      summary: {
        totalCharges: charges.length,
        totalGross: Math.round(totalGross * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        effectiveRate: charges.length > 0
          ? `${((totalFees / totalGross) * 100).toFixed(2)}%`
          : '0%',
      },
      dailyBreakdown,
      charges: charges.map(c => ({
        ...c,
        amount: parseFloat(c.amount),
        fee: parseFloat(c.fee),
        net: parseFloat(c.net),
      })),
    });

  } catch (err) {
    console.error('[stripe/fees] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
