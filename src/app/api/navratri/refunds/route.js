/**
 * ═══════════════════════════════════════════════════════════════════
 * POST /api/navratri/refunds — Process refunds via Stripe
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';
import { recordDailyRefund } from '@/lib/navratri/entitlements';
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
    const { orderId, orderItemId, refundQty, reason, isOverride, overrideReason } = body;
    const reqInfo = getRequestInfo(request);

    if (!orderId || !reason) {
      return NextResponse.json({ error: 'orderId and reason are required' }, { status: 400 });
    }

    const order = await db.getOrderById(orderId);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.payment_status !== 'paid' && order.payment_status !== 'partial_refund') {
      return NextResponse.json({ error: 'Order is not eligible for refund' }, { status: 400 });
    }

    // Check refund cutoff (72h by default)
    const event = await db.getEventById(order.event_id);
    const cutoffHours = event?.refund_cutoff_hours || 72;
    const orderAge = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);

    if (orderAge > cutoffHours && !isOverride) {
      return NextResponse.json({
        error: `Refund window has expired (${cutoffHours}h). Use admin override if needed.`,
      }, { status: 400 });
    }

    // Calculate refund amount
    let refundAmount = 0;
    let qty = refundQty || 1;

    if (orderItemId) {
      const items = await db.getOrderItems(orderId);
      const item = items.find(i => i.id === orderItemId);
      if (!item) return NextResponse.json({ error: 'Order item not found' }, { status: 404 });

      const availableQty = item.quantity - (item.refunded_qty || 0);
      if (qty > availableQty) {
        return NextResponse.json({ error: `Only ${availableQty} item(s) available for refund` }, { status: 400 });
      }

      refundAmount = item.unit_price * qty;
    } else {
      refundAmount = parseFloat(order.total_amount) || 0;
      qty = 1; // Full order refund
    }

    // Process Stripe refund
    let stripeRefundId = null;
    if (order.payment_method === 'stripe' && order.stripe_payment_intent) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent,
        amount: Math.round(refundAmount * 100), // cents
        reason: 'requested_by_customer',
        metadata: {
          source: 'navratri',
          order_number: order.order_number,
          reason,
        },
      });
      stripeRefundId = refund.id;
    }

    // Record refund
    await db.createRefund({
      order_id:       orderId,
      order_item_id:  orderItemId || null,
      refund_qty:     qty,
      refund_amount:  refundAmount,
      stripe_refund_id: stripeRefundId,
      reason,
      is_override:    isOverride || false,
      override_reason: overrideReason || null,
      refunded_by:    user.id,
    });

    // Update order item refunded_qty
    if (orderItemId) {
      const items = await db.getOrderItems(orderId);
      const item = items.find(i => i.id === orderItemId);
      await db.updateOrderItem(orderItemId, {
        refunded_qty: (item.refunded_qty || 0) + qty,
      });
    }

    // Update order status
    const allItems = await db.getOrderItems(orderId);
    const totalQty = allItems.reduce((s, i) => s + i.quantity, 0);
    const totalRefunded = allItems.reduce((s, i) => s + (i.refunded_qty || 0), 0);

    const newStatus = totalRefunded >= totalQty ? 'refunded' : 'partial_refund';
    await db.updateOrder(orderId, { payment_status: newStatus });

    // Update entitlement
    if (order.odoo_partner_id && orderItemId) {
      const item = allItems.find(i => i.id === orderItemId);
      if (item?.event_date_id) {
        await recordDailyRefund(order.event_id, order.odoo_partner_id, item.event_date_id, qty);
      }
    }

    // Revoke associated tickets
    const tickets = await db.getTicketsByOrder(orderId);
    for (const ticket of tickets) {
      if (ticket.order_item_id === orderItemId && ticket.status === 'active') {
        await db.updateTicket(ticket.id, { status: 'refunded' });
      }
    }

    await logAudit({
      eventId: order.event_id,
      action: isOverride ? auditActions.REFUND_OVERRIDE : auditActions.REFUND_ISSUE,
      entityType: 'refund',
      entityId: orderId,
      userId: user.id,
      userEmail: user.email,
      newValue: { orderId, refundAmount, qty, stripeRefundId, reason },
      ...reqInfo,
    });

    return NextResponse.json({
      success: true,
      refundAmount,
      stripeRefundId,
      newOrderStatus: newStatus,
    });

  } catch (err) {
    console.error('[navratri/refunds] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
