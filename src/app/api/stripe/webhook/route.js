/**
 * ═══════════════════════════════════════════════════════════════════
 * Stripe Webhook — Real-time charge processing
 * ═══════════════════════════════════════════════════════════════════
 *
 * POST /api/stripe/webhook
 *
 * Listens for Stripe events and automatically:
 *   1. Creates bank statement line in Odoo (with correct POS partner)
 *   2. Logs to stripe_sync_log
 *   3. Creates fee journal entry
 *
 * Events handled:
 *   - charge.succeeded → create bank statement line + fee entry
 *
 * Auth: Stripe webhook signature verification
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export const dynamic = 'force-dynamic';

// Need raw body for signature verification
export const config = {
  api: { bodyParser: false },
};

const DEFAULT_PARTNER_ID = 356;  // 0HCC WALKING

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

async function isAlreadyProcessed(stripeId) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/stripe_sync_log?stripe_id=eq.${stripeId}&status=eq.success&select=id&limit=1`;
  const res = await fetch(url, { headers: getSupabaseHeaders(), cache: 'no-store' });
  if (!res.ok) return false;
  const rows = await res.json();
  return rows && rows.length > 0;
}

async function logSync(entry) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/stripe_sync_log`, {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify(entry),
  });
}

// ── Partner lookup ────────────────────────────────────────────────────────────
async function findPartner(callFn, creds, uid, paymentIntent, amount, date) {
  // Strategy 1: POS order
  if (paymentIntent) {
    try {
      const posPayments = await callFn(creds, uid, 'pos.payment', 'search_read', [
        [['transaction_id', 'ilike', paymentIntent]]
      ], { fields: ['id', 'pos_order_id'], limit: 1 });

      if (posPayments.length > 0 && posPayments[0].pos_order_id) {
        const orders = await callFn(creds, uid, 'pos.order', 'read', [posPayments[0].pos_order_id[0]], {
          fields: ['id', 'name', 'partner_id'],
        });
        if (orders.length > 0 && orders[0].partner_id) {
          return { id: orders[0].partner_id[0], name: orders[0].partner_id[1] };
        }
      }
    } catch {}
  }

  // Strategy 2: outstanding receipt
  if (paymentIntent) {
    try {
      const lines = await callFn(creds, uid, 'account.move.line', 'search_read', [
        [['journal_id', '=', 6], ['reconciled', '=', false], ['debit', '>', 0], ['name', 'ilike', paymentIntent]]
      ], { fields: ['id', 'partner_id'], limit: 1 });
      if (lines.length > 0 && lines[0].partner_id) {
        return { id: lines[0].partner_id[0], name: lines[0].partner_id[1] };
      }
    } catch {}
  }

  // Default: 0HCC WALKING
  return { id: DEFAULT_PARTNER_ID, name: '0HCC WALKING' };
}

// ── Main webhook handler ──────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    // Verify webhook signature
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_CHARGE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[stripe/webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[stripe/webhook] Received: ${event.type} (${event.id})`);

    // ── Handle charge.succeeded ───────────────────────────────────────────────
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;

      // Skip if already processed
      if (await isAlreadyProcessed(charge.id)) {
        console.log(`[stripe/webhook] ${charge.id} already processed — skipping`);
        return NextResponse.json({ received: true, status: 'already_processed' });
      }

      const gross = charge.amount / 100;
      const bt = charge.balance_transaction;
      // balance_transaction may not be expanded in webhook — fetch fee later if needed
      let fee = 0;
      if (typeof bt === 'object' && bt) {
        fee = bt.fee / 100;
      } else if (typeof bt === 'string') {
        // Fetch the balance transaction to get the fee
        try {
          const btObj = await stripe.balanceTransactions.retrieve(bt);
          fee = btObj.fee / 100;
        } catch {}
      }
      const net = gross - fee;
      const date = new Date(charge.created * 1000).toISOString().split('T')[0];
      const customer = charge.billing_details?.name || charge.receipt_email || '';
      const email = charge.billing_details?.email || charge.receipt_email || '';

      // Connect to Odoo
      let creds, uid;
      try {
        creds = await getCredentials();
        uid = await odooAuth(creds);
      } catch (err) {
        console.error('[stripe/webhook] Odoo connection failed:', err.message);
        await logSync({
          stripe_id: charge.id, type: 'charge', amount: gross, fee, net,
          status: 'error', error_message: `Odoo connection failed: ${err.message}`,
          sync_batch_id: 'webhook',
        });
        return NextResponse.json({ received: true, status: 'odoo_error' });
      }

      // Find partner
      const partner = await findPartner(odooCall, creds, uid, charge.payment_intent, gross, date);

      // Create bank statement line
      try {
        const lineData = {
          journal_id: 6,  // BNK1
          date: date,
          payment_ref: `Stripe ${charge.id}`,
          amount: gross,
          partner_id: partner.id,
          narration: [
            `Stripe charge: ${charge.id}`,
            `Payment Intent: ${charge.payment_intent}`,
            email ? `Email: ${email}` : '',
            fee > 0 ? `Fee: $${fee.toFixed(2)} | Net: $${net.toFixed(2)}` : '',
            `[Auto-synced via webhook]`,
          ].filter(Boolean).join('\n'),
        };

        const lineId = await odooCall(creds, uid, 'account.bank.statement.line', 'create', [lineData]);

        // Create fee journal entry if fee > 0
        let feeEntryId = null;
        if (fee > 0) {
          try {
            const feeAccounts = await odooCall(creds, uid, 'account.account', 'search_read', [
              [['code', '=', '950']]
            ], { fields: ['id'], limit: 1 });
            const bankAccounts = await odooCall(creds, uid, 'account.account', 'search_read', [
              [['code', '=', '101401']]
            ], { fields: ['id'], limit: 1 });
            const miscJournals = await odooCall(creds, uid, 'account.journal', 'search_read', [
              [['code', '=', 'MISC']]
            ], { fields: ['id'], limit: 1 });

            if (feeAccounts.length && bankAccounts.length && miscJournals.length) {
              const ref = `Stripe fee — ${charge.id} ($${gross} charge on ${date})`;
              feeEntryId = await odooCall(creds, uid, 'account.move', 'create', [{
                journal_id: miscJournals[0].id,
                date: date,
                ref: ref,
                line_ids: [
                  [0, 0, { account_id: feeAccounts[0].id, name: ref, debit: fee, credit: 0 }],
                  [0, 0, { account_id: bankAccounts[0].id, name: ref, debit: 0, credit: fee }],
                ],
              }]);
              // Post the entry
              try { await odooCall(creds, uid, 'account.move', 'action_post', [[feeEntryId]]); } catch {}
            }
          } catch (feeErr) {
            console.warn(`[stripe/webhook] Fee entry failed: ${feeErr.message}`);
          }
        }

        // Log success
        await logSync({
          stripe_id: charge.id,
          type: 'charge',
          amount: gross,
          fee: fee,
          net: net,
          currency: charge.currency,
          stripe_created_at: new Date(charge.created * 1000).toISOString(),
          customer_name: customer || partner.name,
          customer_email: email,
          description: charge.description || '',
          odoo_statement_line_id: lineId,
          odoo_move_id: feeEntryId,
          status: 'success',
          sync_batch_id: 'webhook',
        });

        console.log(`[stripe/webhook] ✅ ${charge.id} → Line ${lineId}, Fee entry ${feeEntryId || 'N/A'}, Partner: ${partner.name}`);
        return NextResponse.json({ received: true, status: 'processed', lineId });

      } catch (err) {
        console.error(`[stripe/webhook] ❌ ${charge.id} error:`, err.message);
        await logSync({
          stripe_id: charge.id, type: 'charge', amount: gross, fee, net,
          status: 'error', error_message: err.message, sync_batch_id: 'webhook',
        });
        return NextResponse.json({ received: true, status: 'error' });
      }
    }

    // ── Other events — acknowledge but don't process ──────────────────────────
    return NextResponse.json({ received: true, status: 'event_ignored' });

  } catch (err) {
    console.error('[stripe/webhook] Fatal error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
