/**
 * ═══════════════════════════════════════════════════════════════════
 * POST /api/navratri/webhook — Separate Stripe webhook for Navratri
 * ═══════════════════════════════════════════════════════════════════
 *
 * Handles: checkout.session.completed (source = 'navratri')
 *
 * Flow:
 *   1. Verify signature (STRIPE_NAVRATRI_WEBHOOK_SECRET)
 *   2. Idempotency check (webhook_logs)
 *   3. Update order → paid
 *   4. Activate tickets
 *   5. Commit entitlement holds
 *   6. Update entitlement ledger
 *   7. Send confirmation email + SMS with ticket links
 *   8. Log webhook
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as db from '@/lib/navratri/db';
import { activateOrderTickets } from '@/lib/navratri/tickets';
import { commitSessionHolds, recordDailyPurchase, recordComboPurchase } from '@/lib/navratri/entitlements';
import { logAudit, auditActions } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

// ── Supabase helpers (webhook log) ───────────────────────────────────────────
function getHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

async function isProcessed(webhookId) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/webhook_logs?webhook_id=eq.${encodeURIComponent(webhookId)}&select=id&limit=1`;
  const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
  if (!res.ok) return false;
  const rows = await res.json();
  return rows && rows.length > 0;
}

async function logWebhook(webhookId, orderNumber, result) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/webhook_logs`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      webhook_id: webhookId,
      registration_number: orderNumber || '',
      result: result || '',
    }),
  });
}

// ── Main webhook handler ──────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.text();
    const sig  = request.headers.get('stripe-signature');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event;

    // Verify signature — use NAVRATRI-specific secret, fall back to general
    const webhookSecret = process.env.STRIPE_NAVRATRI_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('[navratri/webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[navratri/webhook] Received: ${event.type} (${event.id})`);

    // ── Handle checkout.session.completed ──────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};

      // Only process navratri events
      if (meta.source !== 'navratri') {
        return NextResponse.json({ received: true, status: 'not_navratri' });
      }

      const orderId     = parseInt(meta.order_id, 10);
      const orderNumber = meta.order_number;
      const eventId     = parseInt(meta.event_id, 10);
      const amountPaid  = (session.amount_total || 0) / 100;

      // Idempotency check
      if (await isProcessed(event.id)) {
        console.log(`[navratri/webhook] Duplicate event ${event.id} — skipping`);
        return NextResponse.json({ received: true, status: 'already_processed' });
      }

      // 1. Update order to PAID
      const order = await db.getOrderById(orderId);
      if (!order) {
        console.error(`[navratri/webhook] Order ${orderId} not found`);
        await logWebhook(event.id, orderNumber, 'failed: order not found');
        return NextResponse.json({ received: true, status: 'order_not_found' });
      }

      if (order.payment_status === 'paid') {
        await logWebhook(event.id, orderNumber, 'skipped: already paid');
        return NextResponse.json({ received: true, status: 'already_paid' });
      }

      // Get Stripe fee
      let stripeFee = 0;
      if (session.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
          if (pi.latest_charge) {
            const charge = await stripe.charges.retrieve(pi.latest_charge);
            if (charge.balance_transaction) {
              const bt = typeof charge.balance_transaction === 'object'
                ? charge.balance_transaction
                : await stripe.balanceTransactions.retrieve(charge.balance_transaction);
              stripeFee = bt.fee / 100;
            }
          }
        } catch (feeErr) {
          console.warn('[navratri/webhook] Fee retrieval failed:', feeErr.message);
        }
      }

      await db.updateOrder(orderId, {
        payment_status:      'paid',
        stripe_payment_intent: session.payment_intent,
        stripe_charge_id:    session.payment_intent ? undefined : null,
        stripe_fee:          stripeFee,
        total_amount:        amountPaid,
      });

      // 2. Activate tickets
      const tickets = await activateOrderTickets(orderId);
      console.log(`[navratri/webhook] Activated ${tickets.length} ticket(s) for ${orderNumber}`);

      // 3. Commit entitlement holds
      await commitSessionHolds(session.id);

      // 4. Update entitlement ledger
      if (order.odoo_partner_id) {
        const orderItems = await db.getOrderItems(orderId);

        if (order.order_type === 'combo') {
          await recordComboPurchase(eventId, order.odoo_partner_id, orderId);
        } else if (order.order_type === 'daily') {
          for (const item of orderItems) {
            if (item.event_date_id) {
              await recordDailyPurchase(
                eventId, order.odoo_partner_id, order.customer_type,
                item.event_date_id, item.quantity
              );
            }
          }
        }
      }

      // 5. Send confirmation (email + SMS with ticket link)
      try {
        const { sendTicketConfirmation } = await import('@/lib/navratri/communications');

        // Build ticket data for the email template
        const orderItems = order.order_type !== 'combo' ? await db.getOrderItems(orderId) : [];
        const dates = await db.getEventDates(parseInt(eventId, 10));
        const dateMap = {};
        dates.forEach(d => { dateMap[d.id] = d; });

        const ticketData = tickets.map(t => ({
          ...t,
          dateLabel: t.event_date_id ? dateMap[t.event_date_id]?.label || 'Event Day' : 'All Dates',
        }));

        const updatedOrder = { ...order, total_amount: amountPaid };
        const result = await sendTicketConfirmation(updatedOrder, ticketData);
        console.log(`[navratri/webhook] Confirmation sent: email=${result.emailSent}, sms=${result.smsSent}`);

        // Mark tickets as delivered
        for (const ticket of tickets) {
          await db.updateTicket(ticket.id || ticket[0]?.id, {
            email_sent: result.emailSent,
            sms_sent: result.smsSent,
            email_sent_at: result.emailSent ? new Date().toISOString() : null,
            sms_sent_at: result.smsSent ? new Date().toISOString() : null,
          });
        }
      } catch (emailErr) {
        console.error('[navratri/webhook] Email/SMS delivery failed:', emailErr.message);
        // Don't fail the webhook — tickets are still activated
      }

      // 6. Audit log
      await logAudit({
        eventId,
        action: auditActions.ORDER_PAID,
        entityType: 'order',
        entityId: orderId,
        newValue: {
          orderNumber,
          amount: amountPaid,
          stripeFee,
          ticketsActivated: tickets.length,
          stripeSession: session.id,
        },
      });

      await logWebhook(event.id, orderNumber, `processed: paid $${amountPaid}, ${tickets.length} tickets activated`);

      console.log(`[navratri/webhook] ✅ ${orderNumber} — $${amountPaid}, ${tickets.length} tickets`);
      return NextResponse.json({ received: true, status: 'processed' });
    }

    // ── Handle checkout.session.expired ────────────────────────────────────
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const meta = session.metadata || {};

      if (meta.source !== 'navratri') {
        return NextResponse.json({ received: true, status: 'not_navratri' });
      }

      const orderId = parseInt(meta.order_id, 10);
      if (orderId) {
        // Release holds
        const { releaseSessionHolds } = await import('@/lib/navratri/entitlements');
        await releaseSessionHolds(session.id);

        // Cancel the order
        await db.updateOrder(orderId, { payment_status: 'cancelled' });

        await logAudit({
          eventId: parseInt(meta.event_id, 10),
          action: auditActions.ORDER_CANCELLED,
          entityType: 'order',
          entityId: orderId,
          reason: 'Stripe checkout session expired',
        });
      }

      return NextResponse.json({ received: true, status: 'session_expired' });
    }

    return NextResponse.json({ received: true, status: 'event_ignored' });

  } catch (err) {
    console.error('[navratri/webhook] Fatal error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── Email HTML builder ───────────────────────────────────────────────────────
function buildConfirmationEmailHtml(order, amount, ticketUrl) {
  return `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0d13;color:#F8FAFC;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#FF6B35,#8B1E3F);padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;font-weight:900;color:white;">🎉 Navratri 2026</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Ticket Confirmation</p>
      </div>
      <div style="padding:32px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#94A3B8;font-size:14px;">Order</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${order.order_number}</td></tr>
          <tr><td style="padding:8px 0;color:#94A3B8;font-size:14px;">Name</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${order.purchaser_name}</td></tr>
          <tr><td style="padding:8px 0;color:#94A3B8;font-size:14px;">Amount Paid</td><td style="padding:8px 0;font-weight:700;font-size:14px;color:#34D399;">$${amount.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0;color:#94A3B8;font-size:14px;">Type</td><td style="padding:8px 0;font-weight:700;font-size:14px;text-transform:capitalize;">${order.order_type.replace('_', ' ')}</td></tr>
        </table>
        <div style="text-align:center;margin:32px 0;">
          <a href="${ticketUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#FF6B35,#FF9933);color:white;font-weight:800;font-size:16px;text-decoration:none;border-radius:12px;">
            View Your Tickets
          </a>
        </div>
        <p style="color:#94A3B8;font-size:13px;text-align:center;margin-top:24px;">
          Please open the ticket link on your phone at the gate. The QR code refreshes every 30 seconds for your security.
        </p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid rgba(139,30,63,0.3);text-align:center;">
        <p style="color:#64748B;font-size:12px;margin:0;">Hindu Community Center Knoxville • 8580 Hickory Creek Rd, Lenoir City, TN</p>
      </div>
    </div>
  `;
}
