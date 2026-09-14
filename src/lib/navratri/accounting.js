/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Accounting — Daily close & Odoo journal entry posting
 * ═══════════════════════════════════════════════════════════════════
 *
 * Workflow:
 *   1. CLOSE a day → Aggregate all orders/payments for that date
 *   2. REVIEW draft → Admin reviews the aggregated data
 *   3. POST to Odoo → Create journal entry via odooCall()
 *   4. REOPEN (before posting) → Allow corrections
 *   5. ADJUSTMENT (after posting) → Create correcting journal entry
 *
 * Reuses: odooClient.js for all Odoo operations
 */

import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import * as db from './db.js';

// ── Daily Close ──────────────────────────────────────────────────────────────

/**
 * Build the daily close data by aggregating all orders for a given date.
 *
 * @param {number} eventId
 * @param {string} closeDate - 'YYYY-MM-DD'
 * @returns {object} Aggregated close data
 */
export async function buildDailyCloseData(eventId, closeDate) {
  // Get all PAID orders for this event that were created on this date
  const orders = await db.query('navratri_orders',
    `event_id=eq.${eventId}&payment_status=in.(paid,partial_refund)&created_at=gte.${closeDate}T00:00:00&created_at=lt.${closeDate}T23:59:59`,
    { select: '*' }
  );

  // Get refunds for this date
  const refunds = await db.query('navratri_refunds',
    `order_id=in.(${orders.map(o => o.id).join(',') || '0'})`,
    { select: '*' }
  );

  let stripeGross = 0;
  let stripeFees = 0;
  let cashTotal = 0;
  let checkTotal = 0;
  let manualPaidTotal = 0;
  let complimentaryCount = 0;
  let ticketQuantity = 0;
  const pendingStripe = [];

  for (const order of orders) {
    const amount = parseFloat(order.total_amount) || 0;
    const fee = parseFloat(order.stripe_fee) || 0;

    switch (order.payment_method) {
      case 'stripe':
        stripeGross += amount;
        stripeFees += fee;
        if (order.payment_status === 'pending') {
          pendingStripe.push({
            order_number: order.order_number,
            amount,
            session_id: order.stripe_session_id,
          });
        }
        break;
      case 'cash':
        cashTotal += amount;
        break;
      case 'check':
        checkTotal += amount;
        break;
      case 'complimentary':
        complimentaryCount++;
        break;
    }

    if (order.manual_issue && order.payment_method !== 'complimentary') {
      manualPaidTotal += amount;
    }

    // Count tickets
    const items = await db.getOrderItems(order.id);
    ticketQuantity += items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Calculate refund total
  const refundTotal = refunds.reduce((sum, r) => sum + (parseFloat(r.refund_amount) || 0), 0);

  return {
    event_id:            eventId,
    close_date:          closeDate,
    order_count:         orders.length,
    ticket_quantity:     ticketQuantity,
    stripe_gross:        parseFloat(stripeGross.toFixed(2)),
    stripe_fees:         parseFloat(stripeFees.toFixed(2)),
    stripe_net:          parseFloat((stripeGross - stripeFees).toFixed(2)),
    cash_total:          parseFloat(cashTotal.toFixed(2)),
    check_total:         parseFloat(checkTotal.toFixed(2)),
    refund_total:        parseFloat(refundTotal.toFixed(2)),
    manual_paid_total:   parseFloat(manualPaidTotal.toFixed(2)),
    complimentary_count: complimentaryCount,
    pending_stripe:      pendingStripe,
    reconciliation_data: {
      orders: orders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        amount: o.total_amount,
        method: o.payment_method,
        status: o.payment_status,
      })),
      refunds: refunds.map(r => ({
        id: r.id,
        order_id: r.order_id,
        amount: r.refund_amount,
        reason: r.reason,
      })),
    },
  };
}

/**
 * Close a day — aggregate data and save to navratri_daily_close.
 */
export async function closeDay(eventId, closeDate, closedBy) {
  // Check if already closed
  const existing = await db.getDailyClose(eventId, closeDate);
  if (existing && existing.status === 'posted') {
    throw new Error('This day has already been posted to Odoo. Use adjustment instead.');
  }

  const closeData = await buildDailyCloseData(eventId, closeDate);

  const result = await db.upsertDailyClose({
    ...closeData,
    status:    'closed',
    closed_by: closedBy,
    closed_at: new Date().toISOString(),
  });

  return result;
}

/**
 * Reopen a closed day (before posting to Odoo).
 */
export async function reopenDay(eventId, closeDate, reopenedBy, reason) {
  const existing = await db.getDailyClose(eventId, closeDate);
  if (!existing) throw new Error('No close record found for this date.');
  if (existing.status === 'posted') {
    throw new Error('Cannot reopen a posted day. Use adjustment instead.');
  }

  return db.updateDailyClose(existing.id, {
    status:        'reopened',
    reopened_by:   reopenedBy,
    reopened_at:   new Date().toISOString(),
    reopen_reason: reason,
  });
}


// ── Odoo Journal Entry ───────────────────────────────────────────────────────

/**
 * Create a DRAFT journal entry in Odoo for a daily close.
 *
 * Journal entry structure:
 *   Debit:  Bank/Cash accounts (for revenue received)
 *   Credit: Revenue accounts (for ticket sales)
 *   Debit:  CC Processing Fee account (for Stripe fees)
 *
 * Uses the Navratri analytic account for all lines.
 */
export async function createOdooDraftEntry(closeRecord) {
  const creds = await getCredentials();
  const uid   = await odooAuth(creds);

  // Get the event for analytic account info
  const event = await db.getEventById(closeRecord.event_id);

  // Find accounts by code
  const findAccount = async (code) => {
    const accts = await odooCall(creds, uid, 'account.account', 'search_read',
      [[['code', '=', code]]], { fields: ['id', 'name'], limit: 1 });
    return accts?.[0] || null;
  };

  // Find journal
  const findJournal = async (code) => {
    const journals = await odooCall(creds, uid, 'account.journal', 'search_read',
      [[['code', '=', code]]], { fields: ['id', 'name'], limit: 1 });
    return journals?.[0] || null;
  };

  const miscJournal = await findJournal('MISC');
  if (!miscJournal) throw new Error('MISC journal not found in Odoo');

  // Build journal entry lines
  const lineIds = [];
  const ref = `Navratri ${closeRecord.close_date} — Daily Close`;
  const analyticId = event?.odoo_analytic_account_id || null;

  // Stripe revenue
  if (closeRecord.stripe_gross > 0) {
    const bankAcct = await findAccount('101401'); // Outstanding Receipts
    const revenueAcct = await findAccount('400000'); // Revenue (adjust code as needed)
    const feeAcct = await findAccount('950'); // CC Processing Fee

    if (bankAcct && revenueAcct) {
      // Debit: Bank (gross amount)
      lineIds.push([0, 0, {
        account_id: bankAcct.id,
        name: `${ref} — Stripe gross`,
        debit: closeRecord.stripe_gross,
        credit: 0,
        ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
      }]);

      // Credit: Revenue (net of fees)
      lineIds.push([0, 0, {
        account_id: revenueAcct.id,
        name: `${ref} — Stripe revenue`,
        debit: 0,
        credit: closeRecord.stripe_net,
        ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
      }]);

      // Debit/Credit: CC Fee if applicable
      if (closeRecord.stripe_fees > 0 && feeAcct) {
        lineIds.push([0, 0, {
          account_id: feeAcct.id,
          name: `${ref} — CC processing fees`,
          debit: closeRecord.stripe_fees,
          credit: 0,
          ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
        }]);
      }
    }
  }

  // Cash revenue
  if (closeRecord.cash_total > 0) {
    const cashAcct = await findAccount('100100'); // Cash on Hand (adjust)
    const revenueAcct = await findAccount('400000');

    if (cashAcct && revenueAcct) {
      lineIds.push([0, 0, {
        account_id: cashAcct.id,
        name: `${ref} — Cash collections`,
        debit: closeRecord.cash_total,
        credit: 0,
        ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
      }]);
      lineIds.push([0, 0, {
        account_id: revenueAcct.id,
        name: `${ref} — Cash revenue`,
        debit: 0,
        credit: closeRecord.cash_total,
        ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
      }]);
    }
  }

  // Check revenue
  if (closeRecord.check_total > 0) {
    const checkAcct = await findAccount('101200'); // Undeposited Funds (adjust)
    const revenueAcct = await findAccount('400000');

    if (checkAcct && revenueAcct) {
      lineIds.push([0, 0, {
        account_id: checkAcct.id,
        name: `${ref} — Check collections`,
        debit: closeRecord.check_total,
        credit: 0,
        ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
      }]);
      lineIds.push([0, 0, {
        account_id: revenueAcct.id,
        name: `${ref} — Check revenue`,
        debit: 0,
        credit: closeRecord.check_total,
        ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
      }]);
    }
  }

  // Refunds (reverse entries)
  if (closeRecord.refund_total > 0) {
    const bankAcct = await findAccount('101401');
    const revenueAcct = await findAccount('400000');

    if (bankAcct && revenueAcct) {
      lineIds.push([0, 0, {
        account_id: revenueAcct.id,
        name: `${ref} — Refunds`,
        debit: closeRecord.refund_total,
        credit: 0,
        ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
      }]);
      lineIds.push([0, 0, {
        account_id: bankAcct.id,
        name: `${ref} — Refunds`,
        debit: 0,
        credit: closeRecord.refund_total,
        ...(analyticId ? { analytic_distribution: { [analyticId]: 100 } } : {}),
      }]);
    }
  }

  if (lineIds.length === 0) {
    throw new Error('No journal lines to create — no revenue recorded.');
  }

  // Create the draft journal entry
  const moveId = await odooCall(creds, uid, 'account.move', 'create', [{
    journal_id: miscJournal.id,
    date: closeRecord.close_date,
    ref,
    line_ids: lineIds,
  }]);

  // Update close record with draft ID
  await db.updateDailyClose(closeRecord.id, {
    status: 'draft_created',
    odoo_draft_move_id: moveId,
  });

  return { moveId, lineCount: lineIds.length };
}

/**
 * Post a draft journal entry in Odoo (action_post).
 */
export async function postOdooEntry(closeRecordId, postedBy) {
  const closeRecord = await db.query('navratri_daily_close',
    `id=eq.${closeRecordId}`, { limit: 1 });

  if (!closeRecord || closeRecord.length === 0) {
    throw new Error('Close record not found');
  }

  const record = closeRecord[0];
  if (!record.odoo_draft_move_id) {
    throw new Error('No draft journal entry to post. Create draft first.');
  }

  const creds = await getCredentials();
  const uid   = await odooAuth(creds);

  await odooCall(creds, uid, 'account.move', 'action_post', [[record.odoo_draft_move_id]]);

  await db.updateDailyClose(record.id, {
    status: 'posted',
    odoo_posted_move_id: record.odoo_draft_move_id,
    posted_by: postedBy,
    posted_at: new Date().toISOString(),
  });

  return { posted: true, moveId: record.odoo_draft_move_id };
}

/**
 * Create a correcting journal entry AFTER posting (adjustment).
 */
export async function createAdjustment(closeRecordId, adjustmentData, reason, adjustedBy) {
  const closeRecord = await db.query('navratri_daily_close',
    `id=eq.${closeRecordId}`, { limit: 1 });

  if (!closeRecord || closeRecord.length === 0) {
    throw new Error('Close record not found');
  }

  const record = closeRecord[0];
  if (record.status !== 'posted') {
    throw new Error('Can only create adjustments for posted entries. Reopen the day instead.');
  }

  const creds = await getCredentials();
  const uid   = await odooAuth(creds);

  const event = await db.getEventById(record.event_id);
  const miscJournals = await odooCall(creds, uid, 'account.journal', 'search_read',
    [[['code', '=', 'MISC']]], { fields: ['id'], limit: 1 });

  if (!miscJournals.length) throw new Error('MISC journal not found');

  const ref = `Navratri ${record.close_date} — Adjustment: ${reason}`;

  const moveId = await odooCall(creds, uid, 'account.move', 'create', [{
    journal_id: miscJournals[0].id,
    date: record.close_date,
    ref,
    line_ids: adjustmentData.line_ids, // Caller provides the adjustment lines
  }]);

  // Post it
  await odooCall(creds, uid, 'account.move', 'action_post', [[moveId]]);

  return { moveId, reason, adjustedBy };
}


// ── Odoo Analytic Account ────────────────────────────────────────────────────

/**
 * Create or find the Navratri analytic account in Odoo.
 */
export async function ensureAnalyticAccount(eventName = 'Navratri 2026') {
  const creds = await getCredentials();
  const uid   = await odooAuth(creds);

  // Check if it already exists
  const existing = await odooCall(creds, uid, 'account.analytic.account', 'search_read',
    [[['name', '=', eventName]]], { fields: ['id', 'name'], limit: 1 });

  if (existing.length > 0) {
    return existing[0];
  }

  // Create it
  const id = await odooCall(creds, uid, 'account.analytic.account', 'create', [{
    name: eventName,
  }]);

  return { id, name: eventName };
}
