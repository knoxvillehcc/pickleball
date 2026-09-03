/**
 * ═══════════════════════════════════════════════════════════════════
 * Stripe Daily Sync API Route
 * ═══════════════════════════════════════════════════════════════════
 *
 * POST /api/stripe/sync
 *
 * Body (all optional):
 *   {
 *     "startDate": "2026-08-01",     // defaults to yesterday
 *     "endDate": "2026-08-31",       // defaults to today
 *     "dryRun": true,                // DEFAULT true — set false to actually write
 *     "syncCharges": true,           // sync charge → bank statement lines
 *     "syncFees": true,              // sync payout fees → journal entries
 *   }
 *
 * Auth: Requires super_admin role (or valid cron secret)
 *
 * Safety:
 *   - dryRun=true by default — NEVER writes unless explicitly told
 *   - Every charge checked against stripe_sync_log for idempotency
 *   - Full audit trail logged to stripe_sync_log
 *   - Errors per-charge are non-fatal (logged and skipped)
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import {
  getStripeClient,
  fetchStripeCharges,
  fetchStripePayouts,
  fetchPayoutTransactions,
  summarizeCharge,
  buildStatementLineData,
  buildFeeEntryData,
  isAlreadyProcessed,
  logSyncEntry,
  createStatementLineInOdoo,
  createFeeEntryInOdoo,
  generateBatchId,
} from '@/lib/stripeSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for large syncs

// ── Auth: either logged-in super_admin or cron secret ─────────────────────────
function isAuthorized(request) {
  // Check for cron secret (for automated daily runs)
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret && cronSecret === process.env.STRIPE_SYNC_CRON_SECRET) {
    return true;
  }

  // Check for logged-in super_admin
  const role = request.headers.get('x-user-role');
  return role === 'super_admin';
}

export async function POST(request) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — requires super_admin or valid cron secret' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    // ── Parse options with SAFE DEFAULTS ───────────────────────────────────────
    const dryRun      = body.dryRun !== false;  // DEFAULT TRUE — must explicitly set false
    const syncCharges = body.syncCharges !== false;
    const syncFees    = body.syncFees !== false;

    // Default date range: yesterday → today
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startDate = body.startDate || yesterday.toISOString().split('T')[0];
    const endDate   = body.endDate   || now.toISOString().split('T')[0];

    const batchId = generateBatchId();

    const result = {
      success: true,
      dryRun,
      batchId,
      dateRange: { startDate, endDate },
      charges: { found: 0, new: 0, skipped: 0, processed: 0, errors: 0, details: [] },
      fees: { payoutsFound: 0, totalFee: 0, entriesCreated: 0, details: [] },
      odooStatus: { accounts: {}, journals: {} },
    };

    // ── Connect to Odoo (read-only initially) ─────────────────────────────────
    let creds, uid;
    try {
      creds = await getCredentials();
      uid   = await odooAuth(creds);
      result.odooStatus.connected = true;
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Odoo connection failed: ${err.message}`,
        dryRun,
      }, { status: 500 });
    }

    // ── Verify required accounts/journals exist ───────────────────────────────
    const feeAccounts = await odooCall(creds, uid, 'account.account', 'search_read', [
      [['code', '=', '950']]
    ], { fields: ['id', 'name', 'code'], limit: 1 });
    result.odooStatus.accounts.feeAccount = feeAccounts.length > 0
      ? { id: feeAccounts[0].id, name: feeAccounts[0].name, code: feeAccounts[0].code }
      : null;

    const bankJournal = await odooCall(creds, uid, 'account.journal', 'search_read', [
      [['code', '=', 'BNK1']]
    ], { fields: ['id', 'name', 'default_account_id'], limit: 1 });
    result.odooStatus.journals.bank = bankJournal.length > 0
      ? { id: bankJournal[0].id, name: bankJournal[0].name }
      : null;

    if (!dryRun && (!feeAccounts.length || !bankJournal.length)) {
      return NextResponse.json({
        success: false,
        error: 'Required Odoo accounts/journals missing. Run with dryRun=true first.',
        odooStatus: result.odooStatus,
      }, { status: 400 });
    }

    // ── Phase 1: Process charges ──────────────────────────────────────────────
    if (syncCharges) {
      const charges = await fetchStripeCharges(startDate, endDate);
      result.charges.found = charges.length;

      for (const charge of charges) {
        const summary = summarizeCharge(charge);

        // Check if already processed
        const alreadyDone = await isAlreadyProcessed(charge.id);
        if (alreadyDone) {
          result.charges.skipped++;
          result.charges.details.push({
            chargeId: charge.id,
            amount: summary.amount,
            status: 'skipped',
            reason: 'Already processed',
          });
          continue;
        }

        result.charges.new++;

        const lineData = buildStatementLineData(summary, bankJournal[0]?.id || 6);

        if (dryRun) {
          // Dry run — just record what WOULD happen
          result.charges.details.push({
            chargeId: charge.id,
            amount: summary.amount,
            fee: summary.fee,
            net: summary.net,
            date: summary.created.toISOString().split('T')[0],
            customer: summary.customerName,
            email: summary.customerEmail,
            status: 'dry_run',
            wouldCreate: {
              model: 'account.bank.statement.line',
              journal: 'BNK1',
              data: lineData,
            },
          });
          result.charges.processed++;
        } else {
          // LIVE — actually create in Odoo
          try {
            const lineId = await createStatementLineInOdoo(odooCall, creds, uid, lineData);

            // Log success to Supabase
            await logSyncEntry({
              stripe_id: charge.id,
              type: 'charge',
              amount: summary.amount,
              fee: summary.fee,
              net: summary.net,
              currency: summary.currency,
              stripe_created_at: summary.created.toISOString(),
              customer_name: summary.customerName,
              customer_email: summary.customerEmail,
              description: summary.description,
              odoo_statement_line_id: lineId,
              status: 'success',
              sync_batch_id: batchId,
            });

            result.charges.details.push({
              chargeId: charge.id,
              amount: summary.amount,
              status: 'success',
              odooLineId: lineId,
            });
            result.charges.processed++;
          } catch (err) {
            // Log error but continue with other charges
            await logSyncEntry({
              stripe_id: charge.id,
              type: 'charge',
              amount: summary.amount,
              fee: summary.fee,
              net: summary.net,
              status: 'error',
              error_message: err.message,
              sync_batch_id: batchId,
            });

            result.charges.details.push({
              chargeId: charge.id,
              amount: summary.amount,
              status: 'error',
              error: err.message,
            });
            result.charges.errors++;
          }
        }
      }
    }

    // ── Phase 2: Process payout fees ──────────────────────────────────────────
    if (syncFees) {
      const payouts = await fetchStripePayouts(startDate, endDate);
      result.fees.payoutsFound = payouts.length;

      for (const payout of payouts) {
        // Check if already processed
        const alreadyDone = await isAlreadyProcessed(payout.id);
        if (alreadyDone) {
          result.fees.details.push({
            payoutId: payout.id,
            status: 'skipped',
            reason: 'Already processed',
          });
          continue;
        }

        // Get the fee for this payout from balance transactions
        const transactions = await fetchPayoutTransactions(payout.id);
        let totalFee = 0;
        for (const txn of transactions) {
          if (txn.fee > 0) totalFee += txn.fee;
        }
        totalFee = totalFee / 100; // Convert cents to dollars

        if (totalFee === 0) {
          result.fees.details.push({
            payoutId: payout.id,
            status: 'skipped',
            reason: 'No fees',
          });
          continue;
        }

        result.fees.totalFee += totalFee;

        const payoutDate = new Date(payout.created * 1000);
        const feeData = buildFeeEntryData(payout.id, totalFee, payoutDate);

        if (dryRun) {
          result.fees.details.push({
            payoutId: payout.id,
            amount: payout.amount / 100,
            fee: totalFee,
            date: payoutDate.toISOString().split('T')[0],
            status: 'dry_run',
            wouldCreate: {
              model: 'account.move',
              journal: 'MISC',
              data: feeData,
            },
          });
        } else {
          // LIVE — create fee journal entry
          try {
            const moveId = await createFeeEntryInOdoo(odooCall, creds, uid, feeData);

            await logSyncEntry({
              stripe_id: payout.id,
              type: 'payout',
              amount: payout.amount / 100,
              fee: totalFee,
              net: (payout.amount / 100) - totalFee,
              stripe_created_at: payoutDate.toISOString(),
              odoo_move_id: moveId,
              status: 'success',
              sync_batch_id: batchId,
            });

            result.fees.details.push({
              payoutId: payout.id,
              fee: totalFee,
              status: 'success',
              odooMoveId: moveId,
            });
            result.fees.entriesCreated++;
          } catch (err) {
            await logSyncEntry({
              stripe_id: payout.id,
              type: 'payout',
              amount: payout.amount / 100,
              fee: totalFee,
              status: 'error',
              error_message: err.message,
              sync_batch_id: batchId,
            });

            result.fees.details.push({
              payoutId: payout.id,
              fee: totalFee,
              status: 'error',
              error: err.message,
            });
          }
        }
      }
    }

    return NextResponse.json(result);

  } catch (err) {
    console.error('[stripe/sync] Fatal error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ── GET handler — quick status check ──────────────────────────────────────────
export async function GET(request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Return recent sync log entries
    const url = `${process.env.SUPABASE_URL}/rest/v1/stripe_sync_log?order=processed_at.desc&limit=20`;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        status: 'stripe_sync_log table may not exist yet',
        hint: 'Run supabase_stripe_sync.sql first',
      });
    }

    const logs = await res.json();
    return NextResponse.json({
      status: 'ok',
      recentEntries: logs.length,
      entries: logs,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
