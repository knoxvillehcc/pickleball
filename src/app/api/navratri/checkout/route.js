/**
 * ═══════════════════════════════════════════════════════════════════
 * POST /api/navratri/checkout — Create Stripe Checkout Session
 * ═══════════════════════════════════════════════════════════════════
 *
 * Flow:
 *   1. Validate customer type + entitlements
 *   2. Lock prices
 *   3. Place entitlement holds
 *   4. Create order (pending)
 *   5. Create tickets (inactive)
 *   6. Create Stripe Checkout Session
 *   7. Return checkout URL
 *
 * Metadata on Stripe session:
 *   source: 'navratri'
 *   orderId, orderNumber, eventId, customerType
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as db from '@/lib/navratri/db';
import { checkEntitlements, placeHold, lockPrices, getPrice } from '@/lib/navratri/entitlements';
import { createTicketsForOrder } from '@/lib/navratri/tickets';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      eventSlug,
      customerType,       // 'general', 'pioneer', 'non_member'
      odooPartnerId,      // null for non-member
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      items,              // [{ dateId, quantity, ticketType }]
      orderType,          // 'daily', 'combo', 'pioneer_claim'
      termsAccepted,
      consentMarketing,
    } = body;

    // ── Validation ───────────────────────────────────────────────────────────
    if (!eventSlug || !customerType || !purchaserName || !purchaserEmail || !purchaserPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!termsAccepted) {
      return NextResponse.json({ error: 'Terms must be accepted' }, { status: 400 });
    }

    const event = await db.getEventBySlug(eventSlug);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Check if sales are open
    if (orderType === 'daily' && !event.daily_sales_open) {
      return NextResponse.json({ error: 'Daily ticket sales are not currently open' }, { status: 400 });
    }
    if (orderType === 'combo' && !event.combo_sales_open) {
      return NextResponse.json({ error: 'Full Event Pass sales are not currently open' }, { status: 400 });
    }

    // ── Check Entitlements (for members) ──────────────────────────────────────
    if (customerType !== 'non_member' && odooPartnerId) {
      const ent = await checkEntitlements(event.id, odooPartnerId, customerType, event);

      if (orderType === 'combo' && !ent.combo.available) {
        return NextResponse.json({ error: 'Full Event Pass already purchased or held for this membership' }, { status: 400 });
      }

      if (orderType === 'pioneer_claim' && !ent.pioneer.available) {
        return NextResponse.json({ error: 'Pioneer pass already claimed or held' }, { status: 400 });
      }

      if (orderType === 'daily' && items) {
        for (const item of items) {
          const dateKey = String(item.dateId);
          const dateEnt = ent.daily[dateKey];
          if (dateEnt && item.quantity > dateEnt.available) {
            return NextResponse.json({
              error: `Only ${dateEnt.available} ticket(s) available for ${dateEnt.label}. You requested ${item.quantity}.`,
            }, { status: 400 });
          }
        }
      }
    }

    // ── Lock Prices ──────────────────────────────────────────────────────────
    const prices = lockPrices(event);

    // ── Build Order Items ────────────────────────────────────────────────────
    const orderItems = [];
    let totalAmount = 0;

    if (orderType === 'combo') {
      // Single line item for full event pass
      const price = prices.combo;
      orderItems.push({
        event_date_id: null, // Covers all dates
        ticket_type: 'combo',
        quantity: 1,
        unit_price: price,
        total_price: price,
      });
      totalAmount = price;

    } else if (orderType === 'pioneer_claim') {
      // Free claim — $0
      orderItems.push({
        event_date_id: null,
        ticket_type: 'pioneer_free',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      });
      totalAmount = 0;

    } else if (orderType === 'daily') {
      for (const item of items) {
        let ticketType;
        if (customerType === 'general') ticketType = 'daily_member';
        else if (customerType === 'pioneer') ticketType = 'daily_guest';
        else ticketType = 'daily_nonmember';

        const price = getPrice(event, ticketType);
        const lineTotal = price * item.quantity;

        orderItems.push({
          event_date_id: item.dateId,
          ticket_type: ticketType,
          quantity: item.quantity,
          unit_price: price,
          total_price: lineTotal,
        });
        totalAmount += lineTotal;
      }
    }

    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    // ── Pioneer free claim — skip Stripe ──────────────────────────────────────
    if (orderType === 'pioneer_claim') {
      const orderNumber = await db.getNextOrderNumber(event.membership_year);

      const order = await db.createOrder({
        event_id:           event.id,
        order_number:       orderNumber,
        purchaser_name:     purchaserName,
        purchaser_email:    purchaserEmail,
        purchaser_phone:    purchaserPhone.replace(/\D/g, ''),
        customer_type:      customerType,
        odoo_partner_id:    odooPartnerId,
        order_type:         'pioneer_claim',
        payment_method:     'complimentary',
        payment_status:     'paid',
        total_amount:       0,
        price_locked_at:    new Date().toISOString(),
        price_lock_prices:  prices,
        terms_version:      event.terms_version,
        terms_accepted_at:  new Date().toISOString(),
        consent_marketing:  consentMarketing || false,
        verified_phone:     purchaserPhone.replace(/\D/g, ''),
      });

      // Create order items
      const savedItems = await db.createOrderItems(
        orderItems.map(item => ({ ...item, order_id: order.id }))
      );

      // Create tickets (active immediately for free claim)
      const tickets = await createTicketsForOrder(order.id, savedItems, 'pioneer_pickup');
      // Activate immediately
      for (const ticket of tickets) {
        await db.updateTicket(ticket.id, { status: 'active' });
      }

      const reqInfo = getRequestInfo(request);
      await logAudit({
        eventId: event.id,
        action: auditActions.ORDER_CREATE,
        entityType: 'order',
        entityId: order.id,
        newValue: { orderNumber, type: 'pioneer_claim', amount: 0 },
        ...reqInfo,
      });

      return NextResponse.json({
        success: true,
        orderNumber,
        orderId: order.id,
        type: 'pioneer_claim',
        message: 'Pioneer pass claimed successfully',
      });
    }

    // ── Create Order (pending) ───────────────────────────────────────────────
    const orderNumber = await db.getNextOrderNumber(event.membership_year);

    const order = await db.createOrder({
      event_id:          event.id,
      order_number:      orderNumber,
      purchaser_name:    purchaserName,
      purchaser_email:   purchaserEmail,
      purchaser_phone:   purchaserPhone.replace(/\D/g, ''),
      customer_type:     customerType,
      odoo_partner_id:   odooPartnerId || null,
      order_type:        orderType,
      payment_method:    'stripe',
      payment_status:    'pending',
      total_amount:      totalAmount,
      price_locked_at:   new Date().toISOString(),
      price_lock_prices: prices,
      terms_version:     event.terms_version,
      terms_accepted_at: new Date().toISOString(),
      consent_marketing: consentMarketing || false,
      verified_phone:    purchaserPhone.replace(/\D/g, ''),
    });

    // Save order items
    const savedItems = await db.createOrderItems(
      orderItems.map(item => ({ ...item, order_id: order.id }))
    );

    // Create tickets (inactive until payment)
    const ticketType = orderType === 'combo' ? 'combo_pickup' : 'daily_entry';
    await createTicketsForOrder(order.id, savedItems, ticketType);

    // ── Place Entitlement Holds ──────────────────────────────────────────────
    if (odooPartnerId) {
      const holdMinutes = event.price_lock_minutes || 15;

      if (orderType === 'combo') {
        await placeHold({
          eventId: event.id, odooPartnerId, holdType: 'combo',
          holdMinutes, stripeSessionId: null, // Updated after Stripe session
        });
      } else if (orderType === 'daily') {
        for (const item of items) {
          await placeHold({
            eventId: event.id, odooPartnerId, holdType: 'daily_ticket',
            eventDateId: item.dateId, quantity: item.quantity,
            holdMinutes, stripeSessionId: null,
          });
        }
      }
    }

    // ── Create Stripe Checkout Session ────────────────────────────────────────
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const lineItems = orderItems.map(item => {
      let name;
      switch (item.ticket_type) {
        case 'combo': name = `Navratri 2026 — Full Event Pass`; break;
        case 'daily_member': name = `Navratri Day Ticket (Member)`; break;
        case 'daily_guest': name = `Navratri Day Ticket (Guest)`; break;
        case 'daily_nonmember': name = `Navratri Day Ticket`; break;
        default: name = 'Navratri Ticket';
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: { name },
          unit_amount: Math.round(item.unit_price * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: purchaserEmail,
      metadata: {
        source: 'navratri',
        order_id: String(order.id),
        order_number: orderNumber,
        event_id: String(event.id),
        customer_type: customerType,
      },
      success_url: `${baseUrl}/navratri-2026/success?order=${orderNumber}`,
      cancel_url:  `${baseUrl}/navratri-2026?cancelled=true`,
      expires_at:  Math.floor(Date.now() / 1000) + (event.stripe_session_minutes || 30) * 60,
    });

    // Update order with Stripe session ID
    await db.updateOrder(order.id, { stripe_session_id: session.id });

    // Update holds with Stripe session ID
    if (odooPartnerId) {
      const holds = await db.getActiveHolds(event.id, odooPartnerId);
      for (const hold of holds) {
        if (!hold.stripe_session_id) {
          await db.update('navratri_entitlement_holds', `id=eq.${hold.id}`, {
            stripe_session_id: session.id,
          });
        }
      }
    }

    const reqInfo = getRequestInfo(request);
    await logAudit({
      eventId: event.id,
      action: auditActions.ORDER_CREATE,
      entityType: 'order',
      entityId: order.id,
      newValue: { orderNumber, type: orderType, amount: totalAmount, stripeSession: session.id },
      ...reqInfo,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      orderNumber,
      orderId: order.id,
      sessionId: session.id,
    });

  } catch (err) {
    console.error('[navratri/checkout] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
