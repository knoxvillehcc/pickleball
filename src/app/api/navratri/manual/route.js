/**
 * ═══════════════════════════════════════════════════════════════════
 * POST /api/navratri/manual — Manual ticket issue (cash/check/comp)
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';
import { createTicketsForOrder } from '@/lib/navratri/tickets';
import { recordDailyPurchase, recordComboPurchase, lockPrices, getPrice } from '@/lib/navratri/entitlements';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      eventId, purchaserName, purchaserEmail, purchaserPhone,
      customerType, odooPartnerId, orderType,
      paymentMethod, // 'cash', 'check', 'complimentary'
      checkNumber, manualTicketType, reason,
      items, // [{ dateId, quantity }]
    } = body;

    const reqInfo = getRequestInfo(request);

    if (!eventId || !purchaserName || !purchaserPhone || !paymentMethod || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['cash', 'check', 'complimentary'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Manual issue only supports cash, check, or complimentary' }, { status: 400 });
    }

    const event = await db.getEventById(eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const prices = lockPrices(event);

    // Build order items
    const orderItems = [];
    let totalAmount = 0;

    if (orderType === 'combo') {
      const price = paymentMethod === 'complimentary' ? 0 : prices.combo;
      orderItems.push({ event_date_id: null, ticket_type: 'combo', quantity: 1, unit_price: price, total_price: price });
      totalAmount = price;
    } else if (items && items.length > 0) {
      for (const item of items) {
        let ticketType = customerType === 'general' ? 'daily_member' : customerType === 'pioneer' ? 'daily_guest' : 'daily_nonmember';
        const price = paymentMethod === 'complimentary' ? 0 : getPrice(event, ticketType);
        const lineTotal = price * item.quantity;
        orderItems.push({ event_date_id: item.dateId, ticket_type: ticketType, quantity: item.quantity, unit_price: price, total_price: lineTotal });
        totalAmount += lineTotal;
      }
    }

    const orderNumber = await db.getNextOrderNumber(event.membership_year);

    const order = await db.createOrder({
      event_id: eventId,
      order_number: orderNumber,
      purchaser_name: purchaserName,
      purchaser_email: purchaserEmail || '',
      purchaser_phone: purchaserPhone.replace(/\D/g, ''),
      customer_type: customerType || 'non_member',
      odoo_partner_id: odooPartnerId || null,
      order_type: orderType || 'manual',
      payment_method: paymentMethod,
      payment_status: 'paid',
      total_amount: totalAmount,
      check_number: checkNumber || null,
      manual_issue: true,
      manual_ticket_type: manualTicketType || null,
      manual_reason: reason,
      manual_issued_by: user.id,
      price_locked_at: new Date().toISOString(),
      price_lock_prices: prices,
      terms_version: event.terms_version,
      terms_accepted_at: new Date().toISOString(),
    });

    const savedItems = await db.createOrderItems(
      orderItems.map(item => ({ ...item, order_id: order.id }))
    );

    const ticketType = orderType === 'combo' ? 'combo_pickup' : 'daily_entry';
    const tickets = await createTicketsForOrder(order.id, savedItems, ticketType);

    // Activate immediately (manual = already paid)
    for (const ticket of tickets) {
      await db.updateTicket(ticket.id, { status: 'active' });
    }

    // Update entitlements
    if (odooPartnerId) {
      if (orderType === 'combo') {
        await recordComboPurchase(eventId, odooPartnerId, order.id);
      } else {
        for (const item of savedItems) {
          if (item.event_date_id) {
            await recordDailyPurchase(eventId, odooPartnerId, customerType, item.event_date_id, item.quantity);
          }
        }
      }
    }

    await logAudit({
      eventId,
      action: auditActions.MANUAL_ISSUE,
      entityType: 'order',
      entityId: order.id,
      userId: user.id,
      userEmail: user.email,
      newValue: { orderNumber, paymentMethod, totalAmount, reason, ticketType: manualTicketType },
      ...reqInfo,
    });

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: order.id,
      totalAmount,
      ticketsCreated: tickets.length,
    });
  } catch (err) {
    console.error('[navratri/manual] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
