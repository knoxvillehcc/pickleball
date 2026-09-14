/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Entitlements — Member ticket/pass entitlement logic
 * ═══════════════════════════════════════════════════════════════════
 *
 * Entitlement rules:
 *   General Member:
 *     - Daily: up to 2 tickets per date at member price ($20)
 *     - Full Event Pass: 1 combo per membership → 2 wristbands (all 11 days)
 *
 *   Pioneer Member:
 *     - Free: 2 wristbands for all 11 days (claim once)
 *     - Daily guests: 2 guest tickets per date at guest price ($20)
 *     - Parking: 1 pass per Pioneer (committee gets +1 extra)
 *
 *   Non-Member:
 *     - Daily: unlimited at non-member price ($30)
 *     - No combo/pioneer entitlements
 *
 * Hold system:
 *   - When customer starts checkout, a HOLD is placed (30 min)
 *   - Hold prevents overselling during concurrent checkouts
 *   - Hold is COMMITTED on successful payment or RELEASED/EXPIRED
 */

import * as db from './db.js';

// ── Check Entitlement ────────────────────────────────────────────────────────

/**
 * Check what a member is entitled to purchase/claim.
 *
 * @param {number} eventId
 * @param {number} odooPartnerId
 * @param {string} membershipType  - 'general' or 'pioneer'
 * @param {object} event           - The event config (for limits & pricing)
 * @returns {object} Available entitlements
 */
export async function checkEntitlements(eventId, odooPartnerId, membershipType, event) {
  // Get existing entitlement record (or null if first purchase)
  const ent = await db.getEntitlement(eventId, odooPartnerId);

  // Get active holds (pending checkouts)
  const holds = await db.getActiveHolds(eventId, odooPartnerId);

  // Get event dates
  const dates = await db.getEventDates(eventId);

  // Check committee status for extra parking
  const committee = await db.getCommitteeMembers(eventId);
  const isCommittee = committee.some(c => 
    c.odoo_partner_id === odooPartnerId && !c.removed_at
  );

  const result = {
    membershipType,
    odooPartnerId,
    isCommittee,
    combo: { eligible: false, purchased: false, available: false },
    pioneer: { eligible: false, claimed: false, available: false },
    parking: { eligible: 0, pickedUp: 0, available: 0 },
    daily: {},       // keyed by event_date_id
    holds: holds,    // current active holds
  };

  if (membershipType === 'general') {
    // Combo pass
    result.combo.eligible = true;
    result.combo.purchased = ent?.combo_purchased || false;
    result.combo.available = !result.combo.purchased;

    // Check if there's an active hold for combo
    const comboHold = holds.find(h => h.hold_type === 'combo');
    if (comboHold) result.combo.available = false;

    // Daily tickets per date
    const dailyData = ent?.daily_tickets || {};
    for (const date of dates) {
      const dateKey = String(date.id);
      const purchased = dailyData[dateKey]?.purchased || 0;
      const refunded = dailyData[dateKey]?.refunded || 0;
      const net = purchased - refunded;
      const limit = event.daily_member_limit || 2;

      // Count active holds for this date
      const dateHolds = holds.filter(h => 
        h.hold_type === 'daily_ticket' && h.event_date_id === date.id
      );
      const heldQty = dateHolds.reduce((s, h) => s + h.quantity, 0);

      result.daily[dateKey] = {
        dateId: date.id,
        date: date.event_date,
        label: date.label,
        purchased: net,
        held: heldQty,
        limit,
        available: Math.max(0, limit - net - heldQty),
        // If combo is purchased, daily is still available (for extra guests)
        comboCovers: result.combo.purchased,
      };
    }

  } else if (membershipType === 'pioneer') {
    // Free pioneer pass claim
    result.pioneer.eligible = true;
    result.pioneer.claimed = ent?.pioneer_claimed || false;
    result.pioneer.available = !result.pioneer.claimed;

    const pioneerHold = holds.find(h => h.hold_type === 'pioneer_claim');
    if (pioneerHold) result.pioneer.available = false;

    // Parking
    const baseParkingQty = event.pioneer_parking_qty || 1;
    const extraParking = isCommittee ? (event.committee_extra_parking || 1) : 0;
    const totalParkingEligible = baseParkingQty + extraParking;
    const pickedUp = ent?.parking_picked_up || 0;

    result.parking.eligible = totalParkingEligible;
    result.parking.pickedUp = pickedUp;
    result.parking.available = Math.max(0, totalParkingEligible - pickedUp);

    // Daily guest tickets per date
    const dailyData = ent?.daily_tickets || {};
    for (const date of dates) {
      const dateKey = String(date.id);
      const purchased = dailyData[dateKey]?.purchased || 0;
      const refunded = dailyData[dateKey]?.refunded || 0;
      const net = purchased - refunded;
      const limit = event.daily_pioneer_guest_limit || 2;

      const dateHolds = holds.filter(h =>
        h.hold_type === 'daily_ticket' && h.event_date_id === date.id
      );
      const heldQty = dateHolds.reduce((s, h) => s + h.quantity, 0);

      result.daily[dateKey] = {
        dateId: date.id,
        date: date.event_date,
        label: date.label,
        purchased: net,
        held: heldQty,
        limit,
        available: Math.max(0, limit - net - heldQty),
        comboCovers: false, // Pioneer doesn't buy combo
      };
    }
  }

  return result;
}


// ── Holds ────────────────────────────────────────────────────────────────────

/**
 * Place a hold on entitlements during checkout.
 * Expires after `holdMinutes` (default: 30 min).
 *
 * @param {object} params
 * @param {number} params.eventId
 * @param {number} params.odooPartnerId
 * @param {string} params.holdType       - 'daily_ticket', 'combo', 'pioneer_claim'
 * @param {number} [params.eventDateId]  - Required for daily_ticket
 * @param {number} [params.quantity]     - Number of tickets held (default: 1)
 * @param {string} [params.stripeSessionId]
 * @param {number} [params.holdMinutes]  - Default: 30
 */
export async function placeHold(params) {
  const {
    eventId, odooPartnerId, holdType,
    eventDateId, quantity = 1, stripeSessionId,
    holdMinutes = 30,
  } = params;

  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

  return db.createHold({
    event_id:         eventId,
    odoo_partner_id:  odooPartnerId,
    hold_type:        holdType,
    event_date_id:    eventDateId || null,
    quantity,
    stripe_session_id: stripeSessionId || null,
    expires_at:       expiresAt,
    status:           'active',
  });
}

/**
 * Commit all holds for a Stripe session (after successful payment).
 */
export async function commitSessionHolds(stripeSessionId) {
  const holds = await db.query('navratri_entitlement_holds',
    `stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}&status=eq.active`);

  for (const hold of holds) {
    await db.commitHold(hold.id);
  }

  return holds;
}

/**
 * Release all holds for a Stripe session (after failed/cancelled payment).
 */
export async function releaseSessionHolds(stripeSessionId) {
  const holds = await db.query('navratri_entitlement_holds',
    `stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}&status=eq.active`);

  for (const hold of holds) {
    await db.releaseHold(hold.id);
  }

  return holds;
}


// ── Entitlement Updates ──────────────────────────────────────────────────────

/**
 * Record a daily ticket purchase in the entitlement ledger.
 */
export async function recordDailyPurchase(eventId, odooPartnerId, membershipType, eventDateId, quantity) {
  let ent = await db.getEntitlement(eventId, odooPartnerId);

  if (!ent) {
    // Create initial entitlement record
    ent = await db.upsertEntitlement({
      event_id: eventId,
      odoo_partner_id: odooPartnerId,
      membership_type: membershipType,
      daily_tickets: {},
    });
  }

  const dailyTickets = ent.daily_tickets || {};
  const dateKey = String(eventDateId);

  if (!dailyTickets[dateKey]) {
    dailyTickets[dateKey] = { purchased: 0, refunded: 0 };
  }
  dailyTickets[dateKey].purchased += quantity;

  return db.updateEntitlement(ent.id, { daily_tickets: dailyTickets });
}

/**
 * Record a combo pass purchase.
 */
export async function recordComboPurchase(eventId, odooPartnerId, orderId) {
  const ent = await db.getEntitlement(eventId, odooPartnerId);

  if (ent) {
    return db.updateEntitlement(ent.id, {
      combo_purchased: true,
      combo_order_id: orderId,
    });
  }

  return db.upsertEntitlement({
    event_id: eventId,
    odoo_partner_id: odooPartnerId,
    membership_type: 'general',
    combo_purchased: true,
    combo_order_id: orderId,
  });
}

/**
 * Record a pioneer free pass claim.
 */
export async function recordPioneerClaim(eventId, odooPartnerId, orderId) {
  const ent = await db.getEntitlement(eventId, odooPartnerId);

  if (ent) {
    return db.updateEntitlement(ent.id, {
      pioneer_claimed: true,
      pioneer_claim_order_id: orderId,
    });
  }

  return db.upsertEntitlement({
    event_id: eventId,
    odoo_partner_id: odooPartnerId,
    membership_type: 'pioneer',
    pioneer_claimed: true,
    pioneer_claim_order_id: orderId,
  });
}

/**
 * Record a refund against a daily ticket.
 */
export async function recordDailyRefund(eventId, odooPartnerId, eventDateId, quantity) {
  const ent = await db.getEntitlement(eventId, odooPartnerId);
  if (!ent) throw new Error('No entitlement record found for this member');

  const dailyTickets = ent.daily_tickets || {};
  const dateKey = String(eventDateId);

  if (!dailyTickets[dateKey]) {
    dailyTickets[dateKey] = { purchased: 0, refunded: 0 };
  }
  dailyTickets[dateKey].refunded += quantity;

  return db.updateEntitlement(ent.id, { daily_tickets: dailyTickets });
}

/**
 * Record parking pass pickup.
 */
export async function recordParkingPickup(eventId, odooPartnerId, quantity = 1) {
  const ent = await db.getEntitlement(eventId, odooPartnerId);
  if (!ent) throw new Error('No entitlement record found for this member');

  const newPickedUp = (ent.parking_picked_up || 0) + quantity;
  return db.updateEntitlement(ent.id, { parking_picked_up: newPickedUp });
}

/**
 * Manual admin adjustment to entitlements.
 */
export async function manualAdjustment(eventId, odooPartnerId, adjustment, reason, adminId) {
  const ent = await db.getEntitlement(eventId, odooPartnerId);
  if (!ent) throw new Error('No entitlement record found for this member');

  const adjustments = ent.manual_adjustments || [];
  adjustments.push({
    ...adjustment,
    reason,
    admin_id: adminId,
    timestamp: new Date().toISOString(),
  });

  // Apply the adjustment to the relevant field
  const updates = { manual_adjustments: adjustments };

  if (adjustment.field === 'parking_eligible') {
    updates.parking_eligible = (ent.parking_eligible || 0) + (adjustment.delta || 0);
  }
  if (adjustment.field === 'combo_purchased') {
    updates.combo_purchased = adjustment.value;
  }
  if (adjustment.field === 'pioneer_claimed') {
    updates.pioneer_claimed = adjustment.value;
  }
  if (adjustment.field === 'daily_tickets' && adjustment.dateId) {
    const dailyTickets = ent.daily_tickets || {};
    const dateKey = String(adjustment.dateId);
    if (!dailyTickets[dateKey]) dailyTickets[dateKey] = { purchased: 0, refunded: 0 };
    dailyTickets[dateKey].purchased += (adjustment.delta || 0);
    updates.daily_tickets = dailyTickets;
  }

  return db.updateEntitlement(ent.id, updates);
}


// ── Pricing ──────────────────────────────────────────────────────────────────

/**
 * Get the price for a ticket type (from event config, in dollars).
 */
export function getPrice(event, ticketType) {
  const prices = {
    daily_member:    (event.price_general_daily || 2000) / 100,
    daily_guest:     (event.price_pioneer_guest_daily || 2000) / 100,
    daily_nonmember: (event.price_nonmember_daily || 3000) / 100,
    combo:           (event.price_combo || 35000) / 100,
    pioneer_free:    0,
  };
  return prices[ticketType] ?? 0;
}

/**
 * Lock current prices into a snapshot (stored with the order for audit).
 */
export function lockPrices(event) {
  return {
    locked_at: new Date().toISOString(),
    daily_member:    (event.price_general_daily || 2000) / 100,
    daily_guest:     (event.price_pioneer_guest_daily || 2000) / 100,
    daily_nonmember: (event.price_nonmember_daily || 3000) / 100,
    combo:           (event.price_combo || 35000) / 100,
    pioneer_free:    0,
  };
}
