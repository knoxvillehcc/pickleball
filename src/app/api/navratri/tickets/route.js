/**
 * ═══════════════════════════════════════════════════════════════════
 * GET  /api/navratri/tickets — Public ticket lookup (for QR viewer)
 * POST /api/navratri/tickets — Admin actions (reissue, revoke, resend)
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';
import { reissueTicket, revokeTicket } from '@/lib/navratri/tickets';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

// GET — Public ticket lookup by order number + phone (for ticket viewer page)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('order');
    const phone       = searchParams.get('phone');

    if (!orderNumber || !phone) {
      return NextResponse.json({ error: 'order and phone required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const order = await db.getOrderByNumber(orderNumber);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Verify phone matches
    if (order.purchaser_phone !== cleanPhone) {
      return NextResponse.json({ error: 'Phone number does not match order' }, { status: 403 });
    }

    if (order.payment_status !== 'paid' && order.payment_status !== 'partial_refund') {
      return NextResponse.json({ error: 'Order is not active' }, { status: 400 });
    }

    // Get tickets with secrets (needed for client-side rolling QR generation)
    const tickets = await db.getTicketsByOrder(order.id);
    const items   = await db.getOrderItems(order.id);
    const dates   = await db.getEventDates(order.event_id);

    const dateMap = {};
    dates.forEach(d => { dateMap[d.id] = d; });

    const ticketData = tickets
      .filter(t => t.status === 'active')
      .map(t => {
        const date = t.event_date_id ? dateMap[t.event_date_id] : null;
        return {
          id:          t.id,
          token:       t.token,
          tokenSecret: t.token_secret, // Needed for client-side QR generation
          type:        t.ticket_type,
          quantity:    t.quantity,
          status:      t.status,
          date:        date?.event_date || null,
          dateLabel:   date?.label || 'All Dates',
          startTime:   date?.start_time || null,
          endTime:     date?.end_time || null,
        };
      });

    return NextResponse.json({
      order: {
        orderNumber:   order.order_number,
        purchaserName: order.purchaser_name,
        orderType:     order.order_type,
        customerType:  order.customer_type,
        totalAmount:   order.total_amount,
      },
      tickets: ticketData,
      venue: {
        name: 'Hindu Community Center Knoxville',
        address: '8580 Hickory Creek Rd, Lenoir City, TN',
      },
    });

  } catch (err) {
    console.error('[navratri/tickets] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Admin ticket actions
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, ticketId, reason } = body;
    const reqInfo = getRequestInfo(request);

    if (!action || !ticketId) {
      return NextResponse.json({ error: 'action and ticketId required' }, { status: 400 });
    }

    if (action === 'reissue') {
      if (!reason) return NextResponse.json({ error: 'reason required for reissue' }, { status: 400 });
      
      const result = await reissueTicket(ticketId, reason, user.id);

      await logAudit({
        action: auditActions.TICKET_REISSUE,
        entityType: 'ticket',
        entityId: ticketId,
        userId: user.id,
        userEmail: user.email,
        oldValue: { token: result.oldToken },
        newValue: { token: result.newToken },
        reason,
        ...reqInfo,
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'revoke') {
      await revokeTicket(ticketId);

      await logAudit({
        action: auditActions.TICKET_REVOKE,
        entityType: 'ticket',
        entityId: ticketId,
        userId: user.id,
        userEmail: user.email,
        reason: reason || 'Admin revocation',
        ...reqInfo,
      });

      return NextResponse.json({ success: true, message: 'Ticket revoked' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[navratri/tickets] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
