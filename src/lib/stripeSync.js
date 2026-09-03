/**
 * ═══════════════════════════════════════════════════════════════════
 * Stripe Sync Library — Shared logic for Stripe ↔ Odoo reconciliation
 * ═══════════════════════════════════════════════════════════════════
 *
 * Used by:
 *   - stripe_sync_dryrun.js  (read-only investigation)
 *   - /api/stripe/sync       (daily cron route)
 *   - /api/stripe/webhook    (real-time webhook)
 *
 * Key design decisions:
 *   - Uses GROSS charge amount for bank statement lines (matches Odoo outstanding receipts)
 *   - Fees recorded per-payout as expense journal entries
 *   - Idempotent — checks stripe_sync_log before processing
 *   - dryRun mode by default — never writes to Odoo unless explicitly told to
 * ═══════════════════════════════════════════════════════════════════
 */

import Stripe from 'stripe';

// ── Odoo defaults ─────────────────────────────────────────────────────────────
// Default partner when no match found — "0HCC WALKING" (walk-in customer)
export const DEFAULT_PARTNER_ID = 356;
export const DEFAULT_PARTNER_NAME = '0HCC WALKING';

// ── Stripe client ─────────────────────────────────────────────────────────────
let _stripe = null;
export function getStripeClient() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function getSupabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

/**
 * Check if a Stripe ID has already been processed
 */
export async function isAlreadyProcessed(stripeId) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/stripe_sync_log?stripe_id=eq.${stripeId}&status=eq.success&select=id&limit=1`;
  const res = await fetch(url, { headers: getSupabaseHeaders(), cache: 'no-store' });
  if (!res.ok) return false;
  const rows = await res.json();
  return rows && rows.length > 0;
}

/**
 * Log a sync entry to Supabase
 */
export async function logSyncEntry(entry) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/stripe_sync_log`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[logSyncEntry] Failed to log: ${text}`);
  }
  return res.ok;
}

// ── Stripe data fetchers ──────────────────────────────────────────────────────

/**
 * Fetch Stripe charges for a date range
 * Returns array of charge objects with balance_transaction expanded
 */
export async function fetchStripeCharges(startDate, endDate) {
  const stripe = getStripeClient();
  const charges = [];

  const params = {
    limit: 100,
    created: {},
    expand: ['data.balance_transaction'],
  };
  if (startDate) params.created.gte = Math.floor(new Date(startDate).getTime() / 1000);
  if (endDate)   params.created.lte = Math.floor(new Date(endDate).getTime() / 1000);

  for await (const charge of stripe.charges.list(params)) {
    // Only successful charges
    if (charge.status === 'succeeded') {
      charges.push(charge);
    }
  }

  return charges;
}

/**
 * Fetch Stripe payouts for a date range
 */
export async function fetchStripePayouts(startDate, endDate) {
  const stripe = getStripeClient();
  const payouts = [];

  const params = { limit: 100 };
  if (startDate || endDate) {
    params.created = {};
    if (startDate) params.created.gte = Math.floor(new Date(startDate).getTime() / 1000);
    if (endDate)   params.created.lte = Math.floor(new Date(endDate).getTime() / 1000);
  }

  for await (const payout of stripe.payouts.list(params)) {
    if (payout.status === 'paid') {
      payouts.push(payout);
    }
  }

  return payouts;
}

/**
 * Get balance transactions for a specific payout (to calculate fees)
 */
export async function fetchPayoutTransactions(payoutId) {
  const stripe = getStripeClient();
  const transactions = [];

  for await (const txn of stripe.balanceTransactions.list({
    payout: payoutId,
    limit: 100,
  })) {
    transactions.push(txn);
  }

  return transactions;
}

// ── Charge processing helpers ─────────────────────────────────────────────────

/**
 * Extract useful info from a Stripe charge for display/logging
 */
export function summarizeCharge(charge) {
  const bt = charge.balance_transaction;
  const fee = typeof bt === 'object' && bt ? bt.fee / 100 : 0;
  const net = typeof bt === 'object' && bt ? bt.net / 100 : (charge.amount / 100) - fee;

  return {
    chargeId:      charge.id,
    amount:        charge.amount / 100,
    fee,
    net,
    currency:      charge.currency,
    description:   charge.description || '',
    customerName:  charge.billing_details?.name || charge.metadata?.customer_name || '',
    customerEmail: charge.billing_details?.email || charge.receipt_email || '',
    created:       new Date(charge.created * 1000),
    paymentIntent: charge.payment_intent,
    receiptUrl:    charge.receipt_url,
  };
}

/**
 * Build the Odoo bank statement line data for a charge.
 * This is what WOULD be created — used for both dry-run display and actual creation.
 *
 * Odoo model: account.bank.statement.line
 * Journal: BNK1 (ID: 6)
 * Amount: GROSS (the full charge amount, not net) — matches the outstanding receipt
 */
export function buildStatementLineData(chargeSummary, journalId = 6, partnerId = null) {
  const dateStr = chargeSummary.created.toISOString().split('T')[0];
  const data = {
    journal_id: journalId,
    date: dateStr,
    payment_ref: `Stripe ${chargeSummary.chargeId}`,
    amount: chargeSummary.amount,  // GROSS amount — matches outstanding receipt
    // Always set partner — use matched partner or default to 0HCC WALKING
    partner_id: partnerId || DEFAULT_PARTNER_ID,
    narration: [
      `Stripe charge: ${chargeSummary.chargeId}`,
      chargeSummary.description ? `Description: ${chargeSummary.description}` : '',
      chargeSummary.customerEmail ? `Email: ${chargeSummary.customerEmail}` : '',
      `Fee: $${chargeSummary.fee.toFixed(2)} | Net: $${chargeSummary.net.toFixed(2)}`,
    ].filter(Boolean).join('\n'),
  };

  return data;
}

/**
 * Find the correct partner for a Stripe charge.
 *
 * Priority order:
 *   1. POS order partner (pos.payment → pos.order → partner_id)
 *   2. Outstanding receipt partner (account.move.line matching payment_intent)
 *   3. Amount+date matching on outstanding receipts
 *   4. Default: 0HCC WALKING (ID: 356)
 *
 * Returns { partnerId, partnerName, matchMethod, outstandingLineId }
 */
export async function findMatchingPartner(odooCallFn, creds, uid, chargeSummary) {
  const paymentIntent = chargeSummary.paymentIntent;
  const amount = chargeSummary.amount;
  const dateStr = chargeSummary.created.toISOString().split('T')[0];

  // Strategy 1: Look up the POS order via pos.payment transaction_id
  if (paymentIntent) {
    try {
      const posPayments = await odooCallFn(creds, uid, 'pos.payment', 'search_read', [
        [['transaction_id', 'ilike', paymentIntent]]
      ], { fields: ['id', 'pos_order_id'], limit: 1 });

      if (posPayments.length > 0 && posPayments[0].pos_order_id) {
        const orderId = posPayments[0].pos_order_id[0];
        const orders = await odooCallFn(creds, uid, 'pos.order', 'read', [orderId], {
          fields: ['id', 'name', 'partner_id'],
        });

        if (orders.length > 0 && orders[0].partner_id) {
          return {
            partnerId: orders[0].partner_id[0],
            partnerName: orders[0].partner_id[1],
            matchMethod: 'pos_order',
            posOrderName: orders[0].name,
          };
        }
      }
    } catch (err) {
      // pos.payment model might not exist — continue to fallbacks
    }
  }

  // Strategy 2: Search outstanding receipts by payment_intent reference
  if (paymentIntent) {
    try {
      const lines = await odooCallFn(creds, uid, 'account.move.line', 'search_read', [
        [
          ['journal_id', '=', 6],  // BNK1
          ['reconciled', '=', false],
          ['debit', '>', 0],
          ['name', 'ilike', paymentIntent],
        ]
      ], {
        fields: ['id', 'name', 'debit', 'partner_id', 'move_id'],
        limit: 1,
      });

      if (lines.length > 0 && lines[0].partner_id) {
        return {
          partnerId: lines[0].partner_id[0],
          partnerName: lines[0].partner_id[1],
          outstandingLineId: lines[0].id,
          matchMethod: 'payment_intent',
        };
      }
    } catch (err) {
      console.warn(`[findMatch] payment_intent search failed: ${err.message}`);
    }
  }

  // Strategy 3: Search by exact amount + date (unique match only)
  try {
    const lines = await odooCallFn(creds, uid, 'account.move.line', 'search_read', [
      [
        ['journal_id', '=', 6],
        ['reconciled', '=', false],
        ['debit', '>=', amount - 0.01],
        ['debit', '<=', amount + 0.01],
        ['date', '=', dateStr],
        ['partner_id', '!=', false],
      ]
    ], {
      fields: ['id', 'name', 'debit', 'partner_id', 'move_id'],
      limit: 5,
    });

    if (lines.length === 1) {
      return {
        partnerId: lines[0].partner_id[0],
        partnerName: lines[0].partner_id[1],
        outstandingLineId: lines[0].id,
        matchMethod: 'amount_date',
      };
    }
  } catch (err) {
    console.warn(`[findMatch] amount+date search failed: ${err.message}`);
  }

  // Strategy 4: Default to 0HCC WALKING
  return {
    partnerId: DEFAULT_PARTNER_ID,
    partnerName: DEFAULT_PARTNER_NAME,
    matchMethod: 'default',
  };
}

/**
 * Build the Odoo fee journal entry data for a payout.
 * 
 * Journal entry:
 *   Debit  950 CC Processing Fee    $X.XX
 *   Credit 101403 Outstanding Receipts $X.XX
 *
 * Account IDs (from investigation):
 *   - 950: CC Processing Fee (expense)
 *   - Bank journal default account
 */
export function buildFeeEntryData(payoutId, totalFee, payoutDate, feeAccountCode = '950') {
  const dateStr = typeof payoutDate === 'string' 
    ? payoutDate 
    : payoutDate.toISOString().split('T')[0];

  return {
    journal_code: 'MISC',  // Miscellaneous journal for fee entries
    date: dateStr,
    ref: `Stripe fees — payout ${payoutId} (${dateStr})`,
    fee_account_code: feeAccountCode,
    amount: totalFee,
  };
}

// ── Odoo write operations (only used in live mode) ────────────────────────────

/**
 * Create a bank statement line in Odoo
 * ONLY called when dryRun=false
 */
export async function createStatementLineInOdoo(odooCall, creds, uid, lineData) {
  // Create the bank statement line
  const lineId = await odooCall(creds, uid, 'account.bank.statement.line', 'create', [lineData]);
  return lineId;
}

/**
 * Create a fee journal entry in Odoo
 * ONLY called when dryRun=false
 */
export async function createFeeEntryInOdoo(odooCall, creds, uid, feeData) {
  // First, find the account IDs by code
  const feeAccounts = await odooCall(creds, uid, 'account.account', 'search_read', [
    [['code', '=', feeData.fee_account_code]]
  ], { fields: ['id', 'name', 'code'], limit: 1 });

  if (feeAccounts.length === 0) {
    throw new Error(`Fee account ${feeData.fee_account_code} not found in Odoo`);
  }

  // Find the MISC journal
  const miscJournals = await odooCall(creds, uid, 'account.journal', 'search_read', [
    [['code', '=', feeData.journal_code]]
  ], { fields: ['id', 'name'], limit: 1 });

  if (miscJournals.length === 0) {
    throw new Error(`Journal ${feeData.journal_code} not found in Odoo`);
  }

  // Find the bank journal's default account for the credit side
  const bankJournal = await odooCall(creds, uid, 'account.journal', 'search_read', [
    [['code', '=', 'BNK1']]
  ], { fields: ['id', 'default_account_id'], limit: 1 });

  if (bankJournal.length === 0 || !bankJournal[0].default_account_id) {
    throw new Error('Bank journal BNK1 not found or has no default account');
  }

  const feeAccountId = feeAccounts[0].id;
  const bankAccountId = bankJournal[0].default_account_id[0];
  const journalId = miscJournals[0].id;

  // Create the journal entry
  const moveData = {
    journal_id: journalId,
    date: feeData.date,
    ref: feeData.ref,
    line_ids: [
      [0, 0, {
        account_id: feeAccountId,
        name: feeData.ref,
        debit: feeData.amount,
        credit: 0,
      }],
      [0, 0, {
        account_id: bankAccountId,
        name: feeData.ref,
        debit: 0,
        credit: feeData.amount,
      }],
    ],
  };

  const moveId = await odooCall(creds, uid, 'account.move', 'create', [moveData]);
  return moveId;
}

// ── Batch ID generator ────────────────────────────────────────────────────────
export function generateBatchId() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `sync_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
