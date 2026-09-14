/**
 * ═══════════════════════════════════════════════════════════════════
 * GET /api/navratri/reports — Dashboard stats, sales, check-in data
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const type    = searchParams.get('type') || 'overview';

    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const eid = parseInt(eventId, 10);

    // ── Overview Stats ───────────────────────────────────────────────────────
    if (type === 'overview') {
      const orders = await db.query('navratri_orders', `event_id=eq.${eid}`, { select: 'id,payment_status,total_amount,stripe_fee,payment_method,order_type,customer_type,created_at' });
      const paidOrders = orders.filter(o => o.payment_status === 'paid' || o.payment_status === 'partial_refund');
      
      const totalRevenue = paidOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
      const totalFees = paidOrders.reduce((s, o) => s + (parseFloat(o.stripe_fee) || 0), 0);
      const netRevenue = totalRevenue - totalFees;

      // Revenue by method
      const byMethod = { stripe: 0, cash: 0, check: 0, complimentary: 0 };
      paidOrders.forEach(o => { byMethod[o.payment_method] = (byMethod[o.payment_method] || 0) + parseFloat(o.total_amount || 0); });

      // Revenue by type
      const byType = { daily: 0, combo: 0, pioneer_claim: 0, manual: 0 };
      paidOrders.forEach(o => { byType[o.order_type] = (byType[o.order_type] || 0) + parseFloat(o.total_amount || 0); });

      // Revenue by customer type
      const byCustomer = { general: 0, pioneer: 0, non_member: 0 };
      paidOrders.forEach(o => { byCustomer[o.customer_type] = (byCustomer[o.customer_type] || 0) + parseFloat(o.total_amount || 0); });

      // Check-in stats
      const checkins = await db.query('navratri_checkins', `scan_result=eq.valid`, { select: 'event_date_id,quantity_checked_in' });
      const totalCheckins = checkins.reduce((s, c) => s + (c.quantity_checked_in || 0), 0);

      // Refund stats
      const refunds = await db.query('navratri_refunds', `order_id=in.(${paidOrders.map(o=>o.id).join(',')||'0'})`, { select: 'refund_amount' });
      const totalRefunds = refunds.reduce((s, r) => s + (parseFloat(r.refund_amount) || 0), 0);

      // Members synced
      const members = await db.query('navratri_members_cache', `event_id=eq.${eid}`, { select: 'id,membership_type' });
      const generalCount = members.filter(m => m.membership_type === 'general').length;
      const pioneerCount = members.filter(m => m.membership_type === 'pioneer').length;

      return NextResponse.json({
        overview: {
          totalOrders:     paidOrders.length,
          pendingOrders:   orders.filter(o => o.payment_status === 'pending').length,
          totalRevenue:    parseFloat(totalRevenue.toFixed(2)),
          totalFees:       parseFloat(totalFees.toFixed(2)),
          netRevenue:      parseFloat(netRevenue.toFixed(2)),
          totalRefunds:    parseFloat(totalRefunds.toFixed(2)),
          totalCheckins,
          membersSynced:   members.length,
          generalMembers:  generalCount,
          pioneerMembers:  pioneerCount,
          revenueByMethod:   byMethod,
          revenueByType:     byType,
          revenueByCustomer: byCustomer,
        },
      });
    }

    // ── Per-Date Stats ───────────────────────────────────────────────────────
    if (type === 'by_date') {
      const dates = await db.getEventDates(eid);
      const dateStats = [];

      for (const date of dates) {
        const items = await db.query('navratri_order_items',
          `event_date_id=eq.${date.id}`,
          { select: 'quantity,total_price,refunded_qty' });
        
        const totalTickets = items.reduce((s, i) => s + i.quantity, 0);
        const totalRevenue = items.reduce((s, i) => s + parseFloat(i.total_price || 0), 0);
        const totalRefunded = items.reduce((s, i) => s + (i.refunded_qty || 0), 0);

        const checkins = await db.query('navratri_checkins',
          `event_date_id=eq.${date.id}&scan_result=eq.valid`,
          { select: 'quantity_checked_in' });
        const checkedIn = checkins.reduce((s, c) => s + (c.quantity_checked_in || 0), 0);

        dateStats.push({
          dateId:      date.id,
          date:        date.event_date,
          label:       date.label,
          totalTickets,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalRefunded,
          checkedIn,
          attendanceRate: totalTickets > 0 ? parseFloat(((checkedIn / totalTickets) * 100).toFixed(1)) : 0,
        });
      }

      return NextResponse.json({ dateStats });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (err) {
    console.error('[navratri/reports] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
