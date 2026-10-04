import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { ensureAnalyticAccount } from '@/lib/odooGeneralEntry';
import { updateExpense } from '@/lib/expensesDb';

export const dynamic = 'force-dynamic';

const BANK_ACCOUNT_CODE = '101401';
const CASH_ACCOUNT_CODE = '100100';
const PAYABLE_ACCOUNT_CODE = '201100';

async function findAccount(creds, uid, code, fallbackTypes = ['expense', 'bank', 'liability']) {
  const exact = await odooCall(creds, uid, 'account.account', 'search_read',
    [[['code', '=', String(code)]]], { fields: ['id', 'name', 'code'], limit: 1 });
  if (exact && exact.length > 0) return exact[0];

  const prefix = await odooCall(creds, uid, 'account.account', 'search_read',
    [[['code', '=like', `${code}%`]]], { fields: ['id', 'name', 'code'], limit: 1 });
  if (prefix && prefix.length > 0) return prefix[0];

  if (fallbackTypes && fallbackTypes.length > 0) {
    const fallback = await odooCall(creds, uid, 'account.account', 'search_read',
      [[['account_type', 'in', fallbackTypes]]], { fields: ['id', 'name', 'code'], limit: 1 });
    if (fallback && fallback.length > 0) return fallback[0];
  }
  return null;
}

export async function POST(request) {
  const auth = await getSessionAndPermissions('expenses');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { mode = 'batch_utilities', expenseIds = [], eventTag, analyticName } = body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No expenses selected to post to Odoo.' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const idList = expenseIds.join(',');

    const expRes = await fetch(`${SUPABASE_URL}/rest/v1/hcc_expenses?id=in.(${idList})&select=*`, {
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
      },
      cache: 'no-store',
    });

    if (!expRes.ok) throw new Error('Failed to retrieve selected expenses from database');
    const expenses = await expRes.json();

    if (expenses.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching expense records found.' }, { status: 400 });
    }

    // Connect to Odoo
    const creds = await getCredentials();
    const uid = await odooAuth(creds);
    if (!uid) throw new Error('Odoo authentication failed');

    // Find Misc Journal
    const journals = await odooCall(creds, uid, 'account.journal', 'search_read',
      [[['code', '=', 'MISC']]], { fields: ['id', 'name'], limit: 1 });
    const journalId = journals?.[0]?.id;
    if (!journalId) throw new Error('MISC journal not found in Odoo');

    // Accounts for payment credits
    const bankAcct = await findAccount(creds, uid, BANK_ACCOUNT_CODE, ['asset_cash', 'bank']);
    const cashAcct = await findAccount(creds, uid, CASH_ACCOUNT_CODE, ['asset_cash']);
    const payableAcct = await findAccount(creds, uid, PAYABLE_ACCOUNT_CODE, ['liability_payable', 'liability_current']);

    if (!bankAcct) throw new Error(`HCC Bank Account (${BANK_ACCOUNT_CODE}) not found in Odoo`);

    // Optional analytic account
    let analyticId = null;
    if (analyticName || (eventTag && eventTag !== 'general')) {
      const targetAnalytic = analyticName || eventTag;
      const analyticObj = await ensureAnalyticAccount(creds, uid, targetAnalytic);
      analyticId = analyticObj?.id || null;
    }
    const analyticDistribution = analyticId ? { [String(analyticId)]: 100 } : null;

    const todayStr = new Date().toISOString().split('T')[0];
    const sourceRef = mode === 'event_settlement'
      ? `${(eventTag || 'EVENT').toUpperCase().replace(/\s+/g, '-')}-EXPENSES-FINAL`
      : `OPERATING-BILLS-${todayStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const lineIds = [];
    let totalDebit = 0;
    const creditMap = {
      bank: 0,
      cash: 0,
      payable: 0,
    };

    // Build expense debits
    for (const exp of expenses) {
      const amt = Math.round(Number(exp.amount) * 100) / 100;
      if (amt <= 0) continue;

      const expAcct = await findAccount(creds, uid, exp.account_code, ['expense', 'expense_direct_cost']);
      if (!expAcct) throw new Error(`Expense account code ${exp.account_code} (${exp.account_name}) not found in Odoo`);

      const memo = `${exp.vendor_name} — ${exp.description || exp.account_name}${exp.payment_ref ? ` (${exp.payment_ref})` : ''}`;

      lineIds.push([0, 0, {
        account_id: expAcct.id,
        name: memo,
        debit: amt,
        credit: 0,
        ...(analyticDistribution ? { analytic_distribution: analyticDistribution } : {}),
      }]);

      totalDebit += amt;

      if (exp.payment_method === 'cash') {
        creditMap.cash += amt;
      } else if (exp.payment_method === 'reimbursable') {
        creditMap.payable += amt;
      } else {
        creditMap.bank += amt;
      }
    }

    if (lineIds.length === 0 || totalDebit <= 0) {
      return NextResponse.json({ success: false, error: 'No valid positive expense amounts to post.' }, { status: 400 });
    }

    // Balancing Credit Lines
    if (creditMap.bank > 0 && bankAcct) {
      lineIds.push([0, 0, {
        account_id: bankAcct.id,
        name: `${sourceRef} — Bank Disbursements`,
        debit: 0,
        credit: Math.round(creditMap.bank * 100) / 100,
        ...(analyticDistribution ? { analytic_distribution: analyticDistribution } : {}),
      }]);
    }

    if (creditMap.cash > 0 && cashAcct) {
      lineIds.push([0, 0, {
        account_id: cashAcct.id,
        name: `${sourceRef} — Cash Payments`,
        debit: 0,
        credit: Math.round(creditMap.cash * 100) / 100,
        ...(analyticDistribution ? { analytic_distribution: analyticDistribution } : {}),
      }]);
    }

    if (creditMap.payable > 0 && payableAcct) {
      lineIds.push([0, 0, {
        account_id: payableAcct.id,
        name: `${sourceRef} — Reimbursable Payables`,
        debit: 0,
        credit: Math.round(creditMap.payable * 100) / 100,
        ...(analyticDistribution ? { analytic_distribution: analyticDistribution } : {}),
      }]);
    }

    // Create journal entry
    const moveId = await odooCall(creds, uid, 'account.move', 'create', [{
      move_type: 'entry',
      journal_id: journalId,
      date: todayStr,
      ref: sourceRef,
      narration: `HCC Expense Batch (${expenses.length} bills/receipts)\nRef: ${sourceRef}\nPosted by: ${auth.user?.email || 'admin'}`,
      line_ids: lineIds,
    }]);

    // Post to Odoo
    await odooCall(creds, uid, 'account.move', 'action_post', [[moveId]]);

    // Read back posted move name
    const postedMove = await odooCall(creds, uid, 'account.move', 'search_read',
      [[['id', '=', moveId]]], { fields: ['id', 'name', 'date', 'state'], limit: 1 });

    const moveName = postedMove?.[0]?.name || `MISC/#${moveId}`;

    // Update each expense in database
    for (const exp of expenses) {
      await updateExpense(exp.id, {
        status: 'posted_odoo',
        odoo_move_id: moveId,
        odoo_move_name: moveName,
        posted_to_odoo_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      moveId,
      moveName,
      ref: sourceRef,
      totalAmount: totalDebit,
      count: expenses.length,
      message: `Successfully posted ${expenses.length} expense(s) totaling $${totalDebit.toFixed(2)} to Odoo under ${moveName}.`,
    });

  } catch (err) {
    console.error('[Expenses Sync-Odoo POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
