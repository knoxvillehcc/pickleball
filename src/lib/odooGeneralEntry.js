/**
 * ═══════════════════════════════════════════════════════════════════
 * odooGeneralEntry.js — Post balanced general entries to Odoo with
 * analytic account tagging and strict duplicate prevention.
 * ═══════════════════════════════════════════════════════════════════
 */

import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

const BANK_ACCOUNT_CODE = '101401'; // HCC Bank / Outstanding Receipts
const FEE_ACCOUNT_CODE  = '950';    // CC Processing Fees

/**
 * Find or create the analytic account in Odoo (e.g., 'Navratri 2026').
 */
export async function ensureAnalyticAccount(creds, uid, eventName = 'Navratri 2026') {
  const existing = await odooCall(creds, uid, 'account.analytic.account', 'search_read',
    [[['name', '=', eventName]]], { fields: ['id', 'name'], limit: 1 });

  if (existing && existing.length > 0) {
    return existing[0];
  }

  const id = await odooCall(creds, uid, 'account.analytic.account', 'create', [{
    name: eventName,
  }]);

  return { id, name: eventName };
}

/**
 * Helper to locate an account by code or type
 */
async function findAccount(creds, uid, code, fallbackTypes = ['income', 'expense', 'bank']) {
  // First search by exact code
  const exact = await odooCall(creds, uid, 'account.account', 'search_read',
    [[['code', '=', String(code)]]], { fields: ['id', 'name', 'code'], limit: 1 });
  if (exact && exact.length > 0) return exact[0];

  // Try prefix search
  const prefix = await odooCall(creds, uid, 'account.account', 'search_read',
    [[['code', '=like', `${code}%`]]], { fields: ['id', 'name', 'code'], limit: 1 });
  if (prefix && prefix.length > 0) return prefix[0];

  // Fallback by account_type or name
  if (fallbackTypes && fallbackTypes.length > 0) {
    const fallback = await odooCall(creds, uid, 'account.account', 'search_read',
      [[['account_type', 'in', fallbackTypes]]], { fields: ['id', 'name', 'code'], limit: 1 });
    if (fallback && fallback.length > 0) return fallback[0];
  }

  return null;
}

/**
 * Check if a General Entry with sourceRef already exists in Odoo.
 */
export async function checkOdooGeneralEntry(sourceRef) {
  try {
    const creds = await getCredentials();
    const uid = await odooAuth(creds);
    if (!uid) return { exists: false, error: 'Odoo auth failed' };

    const moves = await odooCall(creds, uid, 'account.move', 'search_read',
      [[['ref', '=', sourceRef], ['state', '!=', 'cancel']]],
      { fields: ['id', 'name', 'date', 'state', 'amount_total', 'ref'], limit: 1 }
    );

    if (moves && moves.length > 0) {
      return { exists: true, entry: moves[0] };
    }
    return { exists: false };
  } catch (err) {
    console.warn('[checkOdooGeneralEntry] Warning:', err.message);
    return { exists: false, error: err.message };
  }
}

/**
 * Create and post a balanced General Journal Entry in Odoo.
 *
 * @param {object} params
 * @param {string} params.eventName          e.g. 'Navratri 2026'
 * @param {string} params.sourceRef          e.g. 'NAVRATRI-2026-VENDORS-FINAL'
 * @param {string|number} params.revenueAccountCode  e.g. 2007 (Vendors) or 2005 (Ads)
 * @param {string} params.lineDescription    e.g. 'Navratri 2026 Vendor Booth Collections'
 * @param {number} params.totalGross         Total gross revenue in dollars
 * @param {number} params.totalFees          Total CC processing fees in dollars
 * @param {number} params.registrationsCount Total count of registrations
 * @param {boolean} [params.forceReSync=false] Allow re-posting if already exists
 */
export async function postEventGeneralEntry({
  eventName = 'Navratri 2026',
  sourceRef,
  revenueAccountCode = 2007,
  lineDescription = 'Event Revenue General Entry',
  totalGross = 0,
  totalFees = 0,
  registrationsCount = 0,
  forceReSync = false,
}) {
  if (!sourceRef) throw new Error('sourceRef is required for general entry');
  if (totalGross <= 0) throw new Error('Total gross revenue must be greater than zero');

  const creds = await getCredentials();
  const uid = await odooAuth(creds);
  if (!uid) throw new Error('Failed to authenticate with Odoo');

  // 1. Strict Duplicate Prevention: Check existing entry in Odoo
  const existingMoves = await odooCall(creds, uid, 'account.move', 'search_read',
    [[['ref', '=', sourceRef], ['state', '!=', 'cancel']]],
    { fields: ['id', 'name', 'date', 'state', 'amount_total', 'ref'], limit: 1 }
  );

  if (existingMoves && existingMoves.length > 0 && !forceReSync) {
    const existing = existingMoves[0];
    return {
      success: false,
      alreadyExists: true,
      message: `A General Entry with reference "${sourceRef}" is already posted in Odoo (${existing.name} on ${existing.date}). Duplicate submissions are blocked.`,
      entry: existing,
    };
  }

  // 2. Locate or ensure Analytic Account
  const analytic = await ensureAnalyticAccount(creds, uid, eventName);
  const analyticDistribution = analytic?.id ? { [String(analytic.id)]: 100 } : null;

  // 3. Locate Accounts
  const bankAcct = await findAccount(creds, uid, BANK_ACCOUNT_CODE, ['asset_cash', 'bank']);
  if (!bankAcct) throw new Error(`HCC Bank Account (${BANK_ACCOUNT_CODE}) not found in Odoo`);

  const revenueAcct = await findAccount(creds, uid, revenueAccountCode, ['income', 'income_other']);
  if (!revenueAcct) throw new Error(`Revenue Account (${revenueAccountCode}) not found in Odoo`);

  const feeAcct = await findAccount(creds, uid, FEE_ACCOUNT_CODE, ['expense', 'expense_direct_cost']);

  // 4. Locate Journal (MISC or general)
  let journal = null;
  const miscJournals = await odooCall(creds, uid, 'account.journal', 'search_read',
    [[['code', '=', 'MISC']]], { fields: ['id', 'name', 'code'], limit: 1 });

  if (miscJournals && miscJournals.length > 0) {
    journal = miscJournals[0];
  } else {
    const genJournals = await odooCall(creds, uid, 'account.journal', 'search_read',
      [[['type', '=', 'general']]], { fields: ['id', 'name', 'code'], limit: 1 });
    if (genJournals && genJournals.length > 0) journal = genJournals[0];
  }

  if (!journal) throw new Error('Miscellaneous / General Journal not found in Odoo');

  // 5. Calculate line amounts (Net Bank + Fee = Gross Revenue)
  const safeGross = Math.round(totalGross * 100) / 100;
  const safeFee = feeAcct ? Math.round(Math.min(totalFees, safeGross) * 100) / 100 : 0;
  const safeNetBank = Math.round((safeGross - safeFee) * 100) / 100;

  const todayStr = new Date().toISOString().split('T')[0];
  const lineIds = [];

  // Line 1 (Debit): Bank Account (Net proceeds)
  lineIds.push([0, 0, {
    account_id: bankAcct.id,
    name: `${lineDescription} — Net Collection (${registrationsCount} paid)`,
    debit: safeNetBank,
    credit: 0,
    ...(analyticDistribution ? { analytic_distribution: analyticDistribution } : {}),
  }]);

  // Line 2 (Debit): CC Processing Fees (if any)
  if (safeFee > 0 && feeAcct) {
    lineIds.push([0, 0, {
      account_id: feeAcct.id,
      name: `${lineDescription} — Stripe Processing Fees`,
      debit: safeFee,
      credit: 0,
      ...(analyticDistribution ? { analytic_distribution: analyticDistribution } : {}),
    }]);
  }

  // Line 3 (Credit): Revenue Account (Gross Revenue)
  lineIds.push([0, 0, {
    account_id: revenueAcct.id,
    name: `${lineDescription} — Gross Revenue (Acct ${revenueAccountCode})`,
    debit: 0,
    credit: safeGross,
    ...(analyticDistribution ? { analytic_distribution: analyticDistribution } : {}),
  }]);

  // 6. Create General Entry (account.move with move_type: 'entry')
  const moveId = await odooCall(creds, uid, 'account.move', 'create', [{
    move_type: 'entry',
    journal_id: journal.id,
    date: todayStr,
    ref: sourceRef,
    narration: `${lineDescription}\nRegistrations: ${registrationsCount}\nGross: $${safeGross.toFixed(2)}\nFees: $${safeFee.toFixed(2)}\nNet Bank: $${safeNetBank.toFixed(2)}\nAnalytic: ${eventName}`,
    line_ids: lineIds,
  }]);

  // 7. Post the General Entry (action_post)
  await odooCall(creds, uid, 'account.move', 'action_post', [[moveId]]);

  // 8. Fetch confirmed move details
  const moves = await odooCall(creds, uid, 'account.move', 'search_read',
    [[['id', '=', moveId]]],
    { fields: ['id', 'name', 'date', 'state', 'amount_total', 'ref'], limit: 1 }
  );

  const moveRecord = moves?.[0] || { id: moveId, name: `ENTRY-#${moveId}`, date: todayStr };

  return {
    success: true,
    moveId: moveRecord.id,
    moveName: moveRecord.name,
    date: moveRecord.date || todayStr,
    state: moveRecord.state || 'posted',
    ref: sourceRef,
    totalGross: safeGross,
    totalFees: safeFee,
    netBank: safeNetBank,
    registrationsCount,
    analyticAccount: { id: analytic.id, name: eventName },
    accounts: {
      bank: { id: bankAcct.id, code: bankAcct.code, name: bankAcct.name },
      revenue: { id: revenueAcct.id, code: revenueAcct.code, name: revenueAcct.name },
      fee: feeAcct ? { id: feeAcct.id, code: feeAcct.code, name: feeAcct.name } : null,
    },
  };
}
