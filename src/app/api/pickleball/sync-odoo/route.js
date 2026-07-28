import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getAllRegistrations } from '@/lib/supabaseClient';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export const dynamic = 'force-dynamic';

const SUPABASE_URL      = () => process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = () => process.env.SUPABASE_ANON_KEY;

const sbHeaders = () => ({
  'apikey':        SUPABASE_ANON_KEY(),
  'Authorization': `Bearer ${SUPABASE_ANON_KEY()}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
});

// Helper to load current sync setting
async function getSyncSetting() {
  try {
    const res = await fetch(
      `${SUPABASE_URL()}/rest/v1/pickleball_settings?key=eq.odoo_sync_info&select=key,value&limit=1`,
      { headers: sbHeaders(), cache: 'no-store' }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return JSON.parse(rows[0].value);
      }
    }
  } catch (err) {
    console.warn('[SyncOdoo GET] Supabase read failed:', err.message);
  }
  return null;
}

// Helper to save sync setting
async function saveSyncSetting(data) {
  const value = JSON.stringify(data);
  try {
    const patchRes = await fetch(
      `${SUPABASE_URL()}/rest/v1/pickleball_settings?key=eq.odoo_sync_info`,
      {
        method:  'PATCH',
        headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
        body:    JSON.stringify({ value }),
      }
    );
    if (patchRes.ok) return;

    await fetch(
      `${SUPABASE_URL()}/rest/v1/pickleball_settings`,
      {
        method:  'POST',
        headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
        body:    JSON.stringify({ key: 'odoo_sync_info', value }),
      }
    );
  } catch (err) {
    console.warn('[SyncOdoo POST] Supabase write failed:', err.message);
  }
}

// ── GET: Return current sync status ───────────────────────────────────────────
export async function GET(request) {
  const auth = await getSessionAndPermissions('pickleball');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const syncData = await getSyncSetting();
  return NextResponse.json({
    success: true,
    isSynced: !!syncData,
    syncInfo: syncData || null,
  });
}

// ── POST: Sync tournament revenue to Odoo ──────────────────────────────────────
export async function POST(request) {
  const auth = await getSessionAndPermissions('pickleball');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const forceReSync = body.force === true;

    // Check if already synced unless force is true
    const existingSync = await getSyncSetting();
    if (existingSync && !forceReSync) {
      return NextResponse.json({
        success: false,
        alreadySynced: true,
        message: `Revenue already synced under invoice reference ${existingSync.invoiceName} on ${new Date(existingSync.syncedAt).toLocaleDateString()}.`,
        syncInfo: existingSync,
      }, { status: 409 });
    }

    // 1. Fetch all paid Pickleball registrations
    const allRecords = await getAllRegistrations(1000);
    const paidRecords = allRecords.filter(r => r.payment_status === 'paid');

    const totalCount = paidRecords.length;
    const totalAmount = paidRecords.reduce((sum, r) => sum + (r.amount_paid || 50), 0);

    if (totalCount === 0 || totalAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'No paid registrations found to sync to Odoo.',
      }, { status: 400 });
    }

    // 2. Connect to Odoo
    const creds = await getCredentials();
    const uid = await odooAuth(creds);
    if (!uid) throw new Error('Odoo authentication failed.');

    // 3. Find or Create Partner "HCC ADMIN"
    let partnerId = null;
    const partners = await odooCall(creds, uid, 'res.partner', 'search_read', [
      [['name', 'ilike', 'HCC ADMIN']]
    ], { fields: ['id', 'name'], limit: 1 });

    if (partners && partners.length > 0) {
      partnerId = partners[0].id;
    } else {
      partnerId = await odooCall(creds, uid, 'res.partner', 'create', [{
        name: 'HCC ADMIN',
        comment: 'Hindu Community Center Admin - Event Collections'
      }]);
    }

    // 4. Find or Create Income & Expense Accounts
    let incomeAccountId = null;
    let expenseAccountId = null;

    // Search or create Income Account
    try {
      const incAccs = await odooCall(creds, uid, 'account.account', 'search_read', [
        ['|', ['account_type', 'in', ['income', 'income_other']], ['name', 'ilike', 'Income']]
      ], { fields: ['id', 'name', 'code'], limit: 1 });

      if (incAccs && incAccs.length > 0) {
        incomeAccountId = incAccs[0].id;
      } else {
        incomeAccountId = await odooCall(creds, uid, 'account.account', 'create', [{
          name: 'Event & Tournament Income',
          code: '400100',
          account_type: 'income',
        }]);
      }
    } catch (eInc) {
      console.warn('[SyncOdoo] Income account lookup/creation notice:', eInc.message);
    }

    // Search or create Expense Account
    try {
      const expAccs = await odooCall(creds, uid, 'account.account', 'search_read', [
        ['|', ['account_type', 'in', ['expense', 'expense_depreciation', 'expense_direct_cost']], ['name', 'ilike', 'Expense']]
      ], { fields: ['id', 'name', 'code'], limit: 1 });

      if (expAccs && expAccs.length > 0) {
        expenseAccountId = expAccs[0].id;
      } else {
        expenseAccountId = await odooCall(creds, uid, 'account.account', 'create', [{
          name: 'Event & Tournament Expenses',
          code: '500100',
          account_type: 'expense',
        }]);
      }
    } catch (eExp) {
      console.warn('[SyncOdoo] Expense account lookup/creation notice:', eExp.message);
    }

    // 5. Find or Create Product "Pickleball Tournament Fee" (mapped to Income & Expense Accounts)
    let productId = null;
    const products = await odooCall(creds, uid, 'product.product', 'search_read', [
      [['name', 'ilike', 'Pickleball Tournament Fee']]
    ], { fields: ['id', 'name'], limit: 1 });

    if (products && products.length > 0) {
      productId = products[0].id;
    } else {
      const productPayload = {
        name: 'Pickleball Tournament Fee',
        type: 'service',
        list_price: 50.00,
      };
      if (incomeAccountId) productPayload.property_account_income_id = incomeAccountId;
      if (expenseAccountId) productPayload.property_account_expense_id = expenseAccountId;

      productId = await odooCall(creds, uid, 'product.product', 'create', [productPayload]);
    }

    // 5. Find Bank / Credit Card / Cash Payment Journal
    const journals = await odooCall(creds, uid, 'account.journal', 'search_read', [
      [['type', 'in', ['bank', 'cash']]]
    ], { fields: ['id', 'name', 'type'], limit: 5 });

    const journalId = journals && journals.length > 0 ? journals[0].id : null;

    // 6. Create Customer Invoice (out_invoice)
    const todayStr = new Date().toISOString().split('T')[0];
    const unitPrice = totalAmount / totalCount;

    const invoiceId = await odooCall(creds, uid, 'account.move', 'create', [{
      move_type: 'out_invoice',
      partner_id: partnerId,
      invoice_date: todayStr,
      ref: 'HCC Pickleball Tournament 2026 - Stripe Collection Sync',
      invoice_line_ids: [
        [0, 0, {
          name: `HCC Pickleball Tournament 2026 Entry Fees (${totalCount} paid registrations)`,
          quantity: totalCount,
          price_unit: unitPrice,
          product_id: productId,
        }]
      ]
    }]);

    // 7. Post / Validate Invoice in Odoo
    await odooCall(creds, uid, 'account.move', 'action_post', [[invoiceId]]);

    // Read posted invoice name (e.g. INV/2026/00142)
    const invoiceRecords = await odooCall(creds, uid, 'account.move', 'search_read', [
      [['id', '=', invoiceId]]
    ], { fields: ['name', 'amount_total', 'state', 'payment_state'] });

    const invoiceName = (invoiceRecords && invoiceRecords[0]) ? invoiceRecords[0].name : `INV-#${invoiceId}`;

    // 8. Register Payment (Mark Invoice as Paid via Credit Card / Bank Journal)
    let paymentRegistered = false;
    if (journalId) {
      try {
        // Attempt using account.payment.register wizard
        const wizardId = await odooCall(creds, uid, 'account.payment.register', 'create', [{
          amount: totalAmount,
          journal_id: journalId,
          payment_date: todayStr,
        }], {
          context: {
            active_model: 'account.move',
            active_ids: [invoiceId],
          }
        });

        if (wizardId) {
          await odooCall(creds, uid, 'account.payment.register', 'action_create_payments', [[wizardId]], {
            context: {
              active_model: 'account.move',
              active_ids: [invoiceId],
            }
          });
          paymentRegistered = true;
        }
      } catch (payErr) {
        console.warn('[SyncOdoo] Payment register wizard fallback:', payErr.message);
        // Fallback: direct account.payment creation
        try {
          const paymentId = await odooCall(creds, uid, 'account.payment', 'create', [{
            payment_type: 'inbound',
            partner_type: 'customer',
            partner_id: partnerId,
            amount: totalAmount,
            journal_id: journalId,
            ref: `Stripe Credit Card payment for ${invoiceName}`,
          }]);
          if (paymentId) {
            await odooCall(creds, uid, 'account.payment', 'action_post', [[paymentId]]);
            paymentRegistered = true;
          }
        } catch (e2) {
          console.warn('[SyncOdoo] Direct payment creation warning:', e2.message);
        }
      }
    }

    // 9. Store Sync Result in Database
    const syncData = {
      invoiceId,
      invoiceName,
      totalAmount,
      totalCount,
      paymentRegistered,
      syncedAt: new Date().toISOString(),
      syncedBy: auth.user?.name || auth.user?.email || 'Admin',
    };

    await saveSyncSetting(syncData);

    return NextResponse.json({
      success: true,
      message: `Successfully posted tournament revenue to Odoo under invoice reference ${invoiceName}.`,
      syncInfo: syncData,
    });

  } catch (err) {
    console.error('[SyncOdoo Error]:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to sync revenue to Odoo',
    }, { status: 500 });
  }
}
