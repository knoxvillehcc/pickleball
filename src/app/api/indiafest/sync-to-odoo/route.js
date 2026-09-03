import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Account mapping
const ACCOUNT_MAP = {
  vendor: 2007,    // Event Vendor / Booth Income (account code)
  sponsor: 2005,   // Event Sponsorship Income (account code)
};
const FEE_ACCOUNT_CODE = '950';       // CC Processing Fees
const BANK_ACCOUNT_CODE = '101401';   // HCC Bank

// ── Find or create Odoo product ──────────────────────────────────────────────
async function ensureProduct(creds, uid, name, accountCode) {
  const existing = await odooCall(creds, uid, 'product.product', 'search_read', [
    [['name', '=', name]]
  ], { fields: ['id'], limit: 1 });

  if (existing.length) return existing[0].id;

  // Find the revenue account
  const acct = await odooCall(creds, uid, 'account.account', 'search_read', [
    [['code', '=', String(accountCode)]]
  ], { fields: ['id'], limit: 1 });

  const prodTmplId = await odooCall(creds, uid, 'product.template', 'create', [{
    name,
    type: 'service',
    list_price: 0,
    sale_ok: true,
    purchase_ok: false,
    ...(acct.length ? {
      property_account_income_id: acct[0].id,
    } : {}),
  }]);

  const prod = await odooCall(creds, uid, 'product.product', 'search_read', [
    [['product_tmpl_id', '=', prodTmplId]]
  ], { fields: ['id'], limit: 1 });

  return prod[0].id;
}

// ── Find or create partner ───────────────────────────────────────────────────
async function ensurePartner(creds, uid, reg) {
  const name = reg.company_name || `${reg.first_name} ${reg.last_name}`;
  const existing = await odooCall(creds, uid, 'res.partner', 'search_read', [
    [['email', '=', reg.email]]
  ], { fields: ['id'], limit: 1 });

  const vals = {
    name,
    email: reg.email,
    phone: reg.phone || '',
    street: reg.address || '',
    city: reg.city || '',
    state_id: false,
    zip: reg.zip || '',
    country_id: 233, // US
    is_company: !!reg.company_name,
  };

  if (existing.length) {
    await odooCall(creds, uid, 'res.partner', 'write', [[existing[0].id], vals]);
    return existing[0].id;
  }
  return await odooCall(creds, uid, 'res.partner', 'create', [vals]);
}

// ── Create Invoice + Payment ─────────────────────────────────────────────────
async function createInvoiceAndPayment(creds, uid, reg, partnerId, productId, journalId) {
  const amount = reg.amount_paid / 100; // cents to dollars

  // Check if invoice already exists (by ref)
  const ref = `IF2026-${reg.registration_number}`;
  const existingInv = await odooCall(creds, uid, 'account.move', 'search_read', [
    [['ref', '=', ref], ['move_type', '=', 'out_invoice']]
  ], { fields: ['id', 'state', 'payment_state'], limit: 1 });

  if (existingInv.length) {
    return { invoiceId: existingInv[0].id, status: 'already_exists', state: existingInv[0].state, payment: existingInv[0].payment_state };
  }

  // Find revenue account
  const type = reg.space_type === 'sponsor' ? 'sponsor' : 'vendor';
  const acctCode = ACCOUNT_MAP[type];
  const acct = await odooCall(creds, uid, 'account.account', 'search_read', [
    [['code', '=', String(acctCode)]]
  ], { fields: ['id'], limit: 1 });

  // Create invoice
  const spaceLabel = reg.space_type === 'home_business' ? 'Home Business' :
                     reg.space_type === 'established_business' ? 'Established Business' :
                     reg.space_type === 'sponsor' ? 'Sponsor' : reg.space_type;

  const invoiceId = await odooCall(creds, uid, 'account.move', 'create', [{
    move_type: 'out_invoice',
    partner_id: partnerId,
    journal_id: journalId,
    ref,
    invoice_date: reg.registration_date ? reg.registration_date.split('T')[0] : new Date().toISOString().split('T')[0],
    narration: `India Fest 2026 - ${spaceLabel} Registration\nReg#: ${reg.registration_number}\nStripe: ${reg.stripe_payment_ref || 'N/A'}`,
    invoice_line_ids: [[0, 0, {
      product_id: productId,
      name: `India Fest 2026 ${spaceLabel} Fee - ${reg.company_name || reg.first_name + ' ' + reg.last_name}`,
      quantity: reg.quantity || 1,
      price_unit: amount / (reg.quantity || 1),
      ...(acct.length ? { account_id: acct[0].id } : {}),
    }]],
  }]);

  // Confirm invoice
  await odooCall(creds, uid, 'account.move', 'action_post', [[invoiceId]]);

  // Register payment with Stripe ref
  let paymentId = null;
  try {
    const payResult = await odooCall(creds, uid, 'account.payment.register', 'create', [{
      payment_date: reg.registration_date ? reg.registration_date.split('T')[0] : new Date().toISOString().split('T')[0],
      communication: ref,
    }]);

    // Use the wizard with the invoice context
    const wizardId = await odooCall(creds, uid, 'account.payment.register', 'create', [{
      payment_date: reg.registration_date ? reg.registration_date.split('T')[0] : new Date().toISOString().split('T')[0],
    }], { context: { active_model: 'account.move', active_ids: [invoiceId] } });

    const result = await odooCall(creds, uid, 'account.payment.register', 'action_create_payments', [[wizardId]], {
      context: { active_model: 'account.move', active_ids: [invoiceId] }
    });

    // Find the payment and set the Stripe ref
    const payments = await odooCall(creds, uid, 'account.payment', 'search_read', [
      [['ref', 'ilike', ref]]
    ], { fields: ['id'], limit: 1 });

    if (payments.length) {
      paymentId = payments[0].id;
      await odooCall(creds, uid, 'account.payment', 'write', [[paymentId], {
        ref: `${ref} | Stripe: ${reg.stripe_payment_ref || ''}`,
      }]);
    }
  } catch (payErr) {
    console.error('[indiafest/sync] Payment error:', payErr.message);
    // Invoice is still created and confirmed — payment can be added later
  }

  return { invoiceId, status: 'created', paymentId };
}

// ── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  const auth = await getSessionAndPermissions('indiafest');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { registrationIds, dryRun = false } = body;

    // Fetch registrations from Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    let url = `${SUPABASE_URL}/rest/v1/vendor_registrations?payment_status=eq.paid`;
    if (registrationIds?.length) {
      url += `&id=in.(${registrationIds.join(',')})`;
    }

    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    const registrations = await res.json();

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        count: registrations.length,
        registrations: registrations.map(r => ({
          id: r.id,
          reg_number: r.registration_number,
          company: r.company_name || `${r.first_name} ${r.last_name}`,
          type: r.space_type,
          amount: (r.amount_paid / 100).toFixed(2),
          stripe_ref: r.stripe_payment_ref,
        })),
      });
    }

    // Connect to Odoo
    const creds = await getCredentials();
    const uid = await odooAuth(creds);

    // Ensure products exist
    const vendorProductId = await ensureProduct(creds, uid, 'India Fest 2026 Vendor Fee', ACCOUNT_MAP.vendor);
    const sponsorProductId = await ensureProduct(creds, uid, 'India Fest 2026 Sponsor Fee', ACCOUNT_MAP.sponsor);

    // Find Sales journal
    const journals = await odooCall(creds, uid, 'account.journal', 'search_read', [
      [['code', '=', 'INV']]
    ], { fields: ['id'], limit: 1 });
    const journalId = journals[0]?.id;

    // Process each registration
    const results = [];
    for (const reg of registrations) {
      try {
        const partnerId = await ensurePartner(creds, uid, reg);
        const productId = reg.space_type === 'sponsor' ? sponsorProductId : vendorProductId;
        const result = await createInvoiceAndPayment(creds, uid, reg, partnerId, productId, journalId);

        results.push({
          id: reg.id,
          reg_number: reg.registration_number,
          company: reg.company_name || `${reg.first_name} ${reg.last_name}`,
          amount: (reg.amount_paid / 100).toFixed(2),
          ...result,
        });
      } catch (err) {
        results.push({
          id: reg.id,
          reg_number: reg.registration_number,
          status: 'error',
          error: err.message,
        });
      }
    }

    // Also create CC fee entries for each charge
    let feeResults = [];
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const feeAcct = await odooCall(creds, uid, 'account.account', 'search_read', [
        [['code', '=', FEE_ACCOUNT_CODE]]
      ], { fields: ['id'], limit: 1 });
      const bankAcct = await odooCall(creds, uid, 'account.account', 'search_read', [
        [['code', '=', BANK_ACCOUNT_CODE]]
      ], { fields: ['id'], limit: 1 });
      const miscJournal = await odooCall(creds, uid, 'account.journal', 'search_read', [
        [['code', '=', 'MISC']]
      ], { fields: ['id'], limit: 1 });

      if (feeAcct.length && bankAcct.length && miscJournal.length) {
        for (const reg of registrations) {
          if (!reg.stripe_payment_ref) continue;
          try {
            // Get checkout session to find the charge
            const session = await stripe.checkout.sessions.retrieve(reg.stripe_payment_ref, {
              expand: ['payment_intent.latest_charge.balance_transaction'],
            });
            const fee = session.payment_intent?.latest_charge?.balance_transaction?.fee;
            if (fee && fee > 0) {
              const feeAmt = fee / 100;
              const ref = `Stripe fee — IF2026 ${reg.registration_number}`;

              // Check if fee already exists
              const existing = await odooCall(creds, uid, 'account.move', 'search_read', [
                [['ref', '=', ref]]
              ], { fields: ['id'], limit: 1 });

              if (!existing.length) {
                const moveId = await odooCall(creds, uid, 'account.move', 'create', [{
                  journal_id: miscJournal[0].id,
                  date: reg.registration_date ? reg.registration_date.split('T')[0] : new Date().toISOString().split('T')[0],
                  ref,
                  line_ids: [
                    [0, 0, { account_id: feeAcct[0].id, name: ref, debit: feeAmt, credit: 0 }],
                    [0, 0, { account_id: bankAcct[0].id, name: ref, debit: 0, credit: feeAmt }],
                  ],
                }]);
                try { await odooCall(creds, uid, 'account.move', 'action_post', [[moveId]]); } catch {}
                feeResults.push({ reg: reg.registration_number, fee: feeAmt, status: 'created' });
              } else {
                feeResults.push({ reg: reg.registration_number, fee: 0, status: 'exists' });
              }
            }
          } catch {}
        }
      }
    } catch (feeErr) {
      console.error('[indiafest/sync] Fee tracking error:', feeErr.message);
    }

    return NextResponse.json({
      success: true,
      results,
      feeResults,
      summary: {
        total: results.length,
        created: results.filter(r => r.status === 'created').length,
        existing: results.filter(r => r.status === 'already_exists').length,
        errors: results.filter(r => r.status === 'error').length,
      },
    });

  } catch (err) {
    console.error('[indiafest/sync] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
