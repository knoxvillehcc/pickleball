/**
 * ═══════════════════════════════════════════════════════════════════
 * Stripe Deposit Breakdown API
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET /api/stripe/deposit-breakdown?start=2026-08-01&end=2026-08-31
 *
 * Returns each Stripe payout (bank deposit) broken down by product
 * category — e.g. Snacks $500, Hall Rental $2900, IndiaFest $351.
 *
 * Data chain:
 *   Payout → Balance Transactions → Charges →
 *     → Checkout Session (online)  → product name → category
 *     → Odoo POS (in-store)        → pos.order → product → category
 *
 * Caches resolved categories in Supabase `stripe_charge_categories`
 * so subsequent loads are instant.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 min for large date ranges

// ── Supabase helpers ──────────────────────────────────────────────────────────
function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

// ── Cache: read ───────────────────────────────────────────────────────────────
async function getCachedCategories(chargeIds) {
  if (!chargeIds.length) return {};
  const SUPABASE_URL = process.env.SUPABASE_URL;
  if (!SUPABASE_URL) return {};

  // Supabase has URL length limits, so batch in groups of 50
  const map = {};
  for (let i = 0; i < chargeIds.length; i += 50) {
    const batch = chargeIds.slice(i, i + 50);
    const filter = batch.map(id => `"${id}"`).join(',');
    const url = `${SUPABASE_URL}/rest/v1/stripe_charge_categories?charge_id=in.(${filter})&select=charge_id,category,source,pos_order`;
    try {
      const res = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' });
      if (res.ok) {
        const rows = await res.json();
        for (const row of rows) {
          map[row.charge_id] = row;
        }
      }
    } catch (err) {
      console.warn('[deposit-breakdown] Cache read error:', err.message);
    }
  }
  return map;
}

// ── Cache: write (upsert) ─────────────────────────────────────────────────────
async function cacheCategories(entries) {
  if (!entries.length) return;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  if (!SUPABASE_URL) return;

  // Batch upsert in groups of 50
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/stripe_charge_categories`, {
        method: 'POST',
        headers: {
          ...supabaseHeaders(),
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(batch),
      });
    } catch (err) {
      console.warn('[deposit-breakdown] Cache write error:', err.message);
    }
  }
}

// ── Resolve category via Stripe Checkout Session ──────────────────────────────
async function resolveViaCheckout(stripe, paymentIntentId) {
  if (!paymentIntentId) return null;
  try {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
      expand: ['data.line_items'],
    });
    if (sessions.data.length > 0) {
      const items = sessions.data[0].line_items?.data || [];
      if (items.length > 0) {
        const productName = items[0].description || 'Online Payment';
        // Categorize based on product name patterns
        if (productName.toLowerCase().includes('pickleball')) return 'Pickleball Registration';
        if (productName.toLowerCase().includes('india fest') && productName.toLowerCase().includes('vendor')) return 'IndiaFest Vendor';
        if (productName.toLowerCase().includes('india fest') && productName.toLowerCase().includes('sponsor')) return 'IndiaFest Sponsor';
        if (productName.toLowerCase().includes('india fest')) return 'IndiaFest Registration';
        return productName; // Use the actual product name as category
      }
    }
  } catch {
    // No checkout session — this is a POS charge
  }
  return null;
}

// ── Resolve category via Odoo POS ─────────────────────────────────────────────
async function resolveViaPOS(creds, uid, paymentIntentId) {
  if (!paymentIntentId) return null;
  try {
    // 1. Find POS payment by transaction_id
    const posPayments = await odooCall(creds, uid, 'pos.payment', 'search_read', [
      [['transaction_id', 'ilike', paymentIntentId]]
    ], { fields: ['id', 'pos_order_id'], limit: 1 });

    if (!posPayments.length || !posPayments[0].pos_order_id) return null;

    const orderId = posPayments[0].pos_order_id[0];
    const orderName = posPayments[0].pos_order_id[1];

    // 2. Get order lines with products
    const orderLines = await odooCall(creds, uid, 'pos.order.line', 'search_read', [
      [['order_id', '=', orderId]]
    ], { fields: ['product_id', 'price_subtotal_incl'] });

    if (!orderLines.length) return { category: 'POS Sale', orderName };

    // 3. Get product IDs → categories
    const productIds = [...new Set(orderLines.map(l => l.product_id?.[0]).filter(Boolean))];
    if (!productIds.length) return { category: 'POS Sale', orderName };

    const products = await odooCall(creds, uid, 'product.product', 'search_read', [
      [['id', 'in', productIds]]
    ], { fields: ['id', 'categ_id'] });

    // 4. Collect unique categories
    const categoryNames = new Set();
    for (const prod of products) {
      if (prod.categ_id) categoryNames.add(prod.categ_id[1]);
    }

    if (categoryNames.size === 0) return { category: 'POS Sale', orderName };
    if (categoryNames.size === 1) return { category: [...categoryNames][0], orderName };

    // Multiple categories in one order — use the one with the highest dollar value
    const categoryTotals = {};
    for (const line of orderLines) {
      const prod = products.find(p => p.id === line.product_id?.[0]);
      const cat = prod?.categ_id?.[1] || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (line.price_subtotal_incl || 0);
    }
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][0];
    return { category: topCategory, orderName };

  } catch (err) {
    console.warn(`[deposit-breakdown] POS lookup failed for ${paymentIntentId}: ${err.message}`);
    return null;
  }
}

// ── Resolve category via Odoo Website Payment (payment.transaction) ───────────
// Handles charges made through Odoo's website (knoxvillemandir.org) which use
// payment.transaction with a "tx-" reference instead of POS or Checkout Sessions.
async function resolveViaOdooWebsite(creds, uid, charge) {
  // These charges have description like "tx-20260828104800" or metadata with webhook_url
  const desc = charge.description || '';
  const hasWebhook = charge.metadata?.webhook_url?.includes('knoxvillemandir');
  if (!desc.startsWith('tx-') && !hasWebhook) return null;

  try {
    // 1. Look up payment.transaction by provider_reference (payment_intent)
    const txns = await odooCall(creds, uid, 'payment.transaction', 'search_read', [
      [['provider_reference', 'ilike', charge.payment_intent]]
    ], { fields: ['id', 'reference', 'sale_order_ids', 'invoice_ids'], limit: 1 });

    if (!txns.length) {
      // Fallback: search by the tx- reference in the description
      const txnsByRef = await odooCall(creds, uid, 'payment.transaction', 'search_read', [
        [['reference', 'ilike', desc]]
      ], { fields: ['id', 'reference', 'sale_order_ids', 'invoice_ids'], limit: 1 });
      if (!txnsByRef.length) return null;
      txns.push(txnsByRef[0]);
    }

    const txn = txns[0];
    const refName = txn.reference || desc;

    // 2. Get sale order lines → products → categories
    if (txn.sale_order_ids?.length) {
      const orderLines = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
        [['order_id', 'in', txn.sale_order_ids]]
      ], { fields: ['product_id', 'price_subtotal'] });

      if (orderLines.length) {
        const productIds = [...new Set(orderLines.map(l => l.product_id?.[0]).filter(Boolean))];
        if (productIds.length) {
          const products = await odooCall(creds, uid, 'product.product', 'search_read', [
            [['id', 'in', productIds]]
          ], { fields: ['id', 'categ_id'] });

          const categoryNames = new Set();
          for (const prod of products) {
            if (prod.categ_id) categoryNames.add(prod.categ_id[1]);
          }
          if (categoryNames.size === 1) return { category: [...categoryNames][0], orderName: refName };
          if (categoryNames.size > 1) {
            // Pick highest-value category
            const catTotals = {};
            for (const line of orderLines) {
              const prod = products.find(p => p.id === line.product_id?.[0]);
              const cat = prod?.categ_id?.[1] || 'Uncategorized';
              catTotals[cat] = (catTotals[cat] || 0) + (line.price_subtotal || 0);
            }
            const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0][0];
            return { category: top, orderName: refName };
          }
        }
      }
    }

    // 3. Fallback: no sale order linked = donation (website donations don't create sale orders)
    return { category: 'Donation', orderName: refName };

  } catch (err) {
    console.warn(`[deposit-breakdown] Odoo website lookup failed for ${charge.id}: ${err.message}`);
    return null;
  }
}

// ── Batch resolve categories for charges ──────────────────────────────────────
async function resolveCategories(stripe, charges, creds, uid) {
  const results = {};
  const toCache = [];

  // Check cache first
  const chargeIds = charges.map(c => c.id);
  const cached = await getCachedCategories(chargeIds);

  const uncached = charges.filter(c => !cached[c.id]);
  console.log(`[deposit-breakdown] ${Object.keys(cached).length} cached, ${uncached.length} to resolve`);

  // Use cached values
  for (const [id, data] of Object.entries(cached)) {
    results[id] = { category: data.category, source: data.source, posOrder: data.pos_order };
  }

  // Resolve uncached charges
  for (let i = 0; i < uncached.length; i++) {
    const ch = uncached[i];
    const pi = ch.payment_intent;

    // Try checkout session first (fast, no Odoo needed)
    const checkoutCategory = await resolveViaCheckout(stripe, pi);
    if (checkoutCategory) {
      results[ch.id] = { category: checkoutCategory, source: 'checkout', posOrder: null };
      toCache.push({
        charge_id: ch.id,
        payout_id: ch._payoutId || null,
        category: checkoutCategory,
        source: 'checkout',
        amount: ch.amount / 100,
        fee: ch._fee || 0,
        net: (ch.amount / 100) - (ch._fee || 0),
        charge_date: new Date(ch.created * 1000).toISOString().split('T')[0],
        customer: ch.billing_details?.name || '',
        pos_order: null,
      });
      continue;
    }

    // Try Odoo POS
    if (creds && uid) {
      const posResult = await resolveViaPOS(creds, uid, pi);
      if (posResult) {
        results[ch.id] = { category: posResult.category, source: 'pos', posOrder: posResult.orderName };
        toCache.push({
          charge_id: ch.id,
          payout_id: ch._payoutId || null,
          category: posResult.category,
          source: 'pos',
          amount: ch.amount / 100,
          fee: ch._fee || 0,
          net: (ch.amount / 100) - (ch._fee || 0),
          charge_date: new Date(ch.created * 1000).toISOString().split('T')[0],
          customer: ch.billing_details?.name || '',
          pos_order: posResult.orderName || null,
        });
        continue;
      }

      // Try Odoo Website Payment (payment.transaction with tx- reference)
      const webResult = await resolveViaOdooWebsite(creds, uid, ch);
      if (webResult) {
        results[ch.id] = { category: webResult.category, source: 'pos', posOrder: webResult.orderName };
        toCache.push({
          charge_id: ch.id,
          payout_id: ch._payoutId || null,
          category: webResult.category,
          source: 'pos',
          amount: ch.amount / 100,
          fee: ch._fee || 0,
          net: (ch.amount / 100) - (ch._fee || 0),
          charge_date: new Date(ch.created * 1000).toISOString().split('T')[0],
          customer: ch.billing_details?.name || ch.receipt_email || '',
          pos_order: webResult.orderName || null,
        });
        continue;
      }
    }

    // Unmatched
    results[ch.id] = { category: 'Unmatched', source: 'unmatched', posOrder: null };
    toCache.push({
      charge_id: ch.id,
      payout_id: ch._payoutId || null,
      category: 'Unmatched',
      source: 'unmatched',
      amount: ch.amount / 100,
      fee: ch._fee || 0,
      net: (ch.amount / 100) - (ch._fee || 0),
      charge_date: new Date(ch.created * 1000).toISOString().split('T')[0],
      customer: ch.billing_details?.name || '',
      pos_order: null,
    });
  }

  // Save newly resolved to cache
  if (toCache.length > 0) {
    await cacheCategories(toCache);
    console.log(`[deposit-breakdown] Cached ${toCache.length} new resolutions`);
  }

  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// Main GET handler
// ══════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const startTs = Math.floor(new Date(startDate + 'T00:00:00').getTime() / 1000);
    const endTs = Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000);

    // ── 1. Fetch Stripe payouts ─────────────────────────────────────────────
    const payouts = [];
    for await (const po of stripe.payouts.list({
      limit: 100,
      created: { gte: startTs, lte: endTs },
    })) {
      if (po.status === 'paid' || po.status === 'in_transit') {
        payouts.push(po);
      }
    }

    // ── 2. Fetch balance transactions for each payout ───────────────────────
    const allCharges = [];
    const payoutDetails = [];

    for (const po of payouts) {
      const poDate = new Date(po.created * 1000).toISOString().split('T')[0];
      const arrivalDate = po.arrival_date
        ? new Date(po.arrival_date * 1000).toISOString().split('T')[0]
        : poDate;

      let poCharges = 0, poGross = 0, poFees = 0;
      const chargeIds = [];

      for await (const txn of stripe.balanceTransactions.list({
        payout: po.id,
        limit: 100,
        expand: ['data.source'],
      })) {
        if (txn.type === 'charge' && txn.source) {
          const ch = txn.source;
          ch._payoutId = po.id;
          ch._fee = txn.fee / 100;
          allCharges.push(ch);
          chargeIds.push(ch.id);
          poCharges++;
          poGross += txn.amount / 100;
          poFees += txn.fee / 100;
        }
      }

      payoutDetails.push({
        payoutId: po.id,
        date: poDate,
        arrivalDate,
        amount: po.amount / 100,
        status: po.status,
        chargeCount: poCharges,
        gross: poGross,
        fees: poFees,
        net: po.amount / 100,
        chargeIds,
        categories: {}, // Filled in step 4
      });
    }

    // ── 3. Resolve categories (Odoo + Checkout + Cache) ─────────────────────
    let creds = null, uid = null;
    try {
      creds = await getCredentials();
      uid = await odooAuth(creds);
    } catch (err) {
      console.warn('[deposit-breakdown] Odoo connection failed, POS lookup disabled:', err.message);
    }

    // If force refresh, we skip cache
    let categoryMap;
    if (forceRefresh) {
      // Clear cache for these charges and re-resolve
      categoryMap = {};
      const toCache = [];
      for (const ch of allCharges) {
        const pi = ch.payment_intent;

        const checkoutCat = await resolveViaCheckout(stripe, pi);
        if (checkoutCat) {
          categoryMap[ch.id] = { category: checkoutCat, source: 'checkout', posOrder: null };
          toCache.push({
            charge_id: ch.id, payout_id: ch._payoutId, category: checkoutCat,
            source: 'checkout', amount: ch.amount / 100, fee: ch._fee || 0,
            net: (ch.amount / 100) - (ch._fee || 0),
            charge_date: new Date(ch.created * 1000).toISOString().split('T')[0],
            customer: ch.billing_details?.name || '', pos_order: null,
          });
          continue;
        }

        if (creds && uid) {
          const posResult = await resolveViaPOS(creds, uid, pi);
          if (posResult) {
            categoryMap[ch.id] = { category: posResult.category, source: 'pos', posOrder: posResult.orderName };
            toCache.push({
              charge_id: ch.id, payout_id: ch._payoutId, category: posResult.category,
              source: 'pos', amount: ch.amount / 100, fee: ch._fee || 0,
              net: (ch.amount / 100) - (ch._fee || 0),
              charge_date: new Date(ch.created * 1000).toISOString().split('T')[0],
              customer: ch.billing_details?.name || '', pos_order: posResult.orderName || null,
            });
            continue;
          }

          // Try Odoo Website Payment (payment.transaction with tx- reference)
          const webResult = await resolveViaOdooWebsite(creds, uid, ch);
          if (webResult) {
            categoryMap[ch.id] = { category: webResult.category, source: 'pos', posOrder: webResult.orderName };
            toCache.push({
              charge_id: ch.id, payout_id: ch._payoutId, category: webResult.category,
              source: 'pos', amount: ch.amount / 100, fee: ch._fee || 0,
              net: (ch.amount / 100) - (ch._fee || 0),
              charge_date: new Date(ch.created * 1000).toISOString().split('T')[0],
              customer: ch.billing_details?.name || ch.receipt_email || '', pos_order: webResult.orderName || null,
            });
            continue;
          }
        }

        categoryMap[ch.id] = { category: 'Unmatched', source: 'unmatched', posOrder: null };
        toCache.push({
          charge_id: ch.id, payout_id: ch._payoutId, category: 'Unmatched',
          source: 'unmatched', amount: ch.amount / 100, fee: ch._fee || 0,
          net: (ch.amount / 100) - (ch._fee || 0),
          charge_date: new Date(ch.created * 1000).toISOString().split('T')[0],
          customer: ch.billing_details?.name || '', pos_order: null,
        });
      }
      if (toCache.length) await cacheCategories(toCache);
    } else {
      categoryMap = await resolveCategories(stripe, allCharges, creds, uid);
    }

    // ── 4. Group by payout + category ───────────────────────────────────────
    const unmatchedCharges = [];

    for (const po of payoutDetails) {
      const cats = {};
      for (const chId of po.chargeIds) {
        const resolved = categoryMap[chId] || { category: 'Unmatched', source: 'unmatched' };
        const ch = allCharges.find(c => c.id === chId);
        if (!ch) continue;

        const cat = resolved.category;
        if (!cats[cat]) {
          cats[cat] = { category: cat, source: resolved.source, charges: 0, gross: 0, fees: 0, net: 0 };
        }
        cats[cat].charges++;
        cats[cat].gross += ch.amount / 100;
        cats[cat].fees += ch._fee || 0;
        cats[cat].net += (ch.amount / 100) - (ch._fee || 0);

        if (resolved.source === 'unmatched') {
          unmatchedCharges.push({
            chargeId: chId,
            payoutId: po.payoutId,
            date: new Date(ch.created * 1000).toISOString().split('T')[0],
            amount: ch.amount / 100,
            fee: ch._fee || 0,
            customer: ch.billing_details?.name || ch.receipt_email || '',
            description: ch.description || '',
            paymentIntent: ch.payment_intent || '',
          });
        }
      }

      // Round values and sort categories by gross desc
      po.categories = Object.values(cats)
        .map(c => ({
          ...c,
          gross: Math.round(c.gross * 100) / 100,
          fees: Math.round(c.fees * 100) / 100,
          net: Math.round(c.net * 100) / 100,
        }))
        .sort((a, b) => b.gross - a.gross);

      // Clean up
      delete po.chargeIds;
    }

    // ── 5. Overall summary ──────────────────────────────────────────────────
    const allCategories = {};
    for (const po of payoutDetails) {
      for (const cat of po.categories) {
        if (!allCategories[cat.category]) {
          allCategories[cat.category] = { charges: 0, gross: 0, fees: 0, net: 0, source: cat.source };
        }
        allCategories[cat.category].charges += cat.charges;
        allCategories[cat.category].gross += cat.gross;
        allCategories[cat.category].fees += cat.fees;
        allCategories[cat.category].net += cat.net;
      }
    }

    const summary = Object.entries(allCategories)
      .map(([category, data]) => ({
        category,
        ...data,
        gross: Math.round(data.gross * 100) / 100,
        fees: Math.round(data.fees * 100) / 100,
        net: Math.round(data.net * 100) / 100,
      }))
      .sort((a, b) => b.gross - a.gross);

    const totals = {
      payouts: payoutDetails.length,
      charges: allCharges.length,
      gross: Math.round(payoutDetails.reduce((s, p) => s + p.gross, 0) * 100) / 100,
      fees: Math.round(payoutDetails.reduce((s, p) => s + p.fees, 0) * 100) / 100,
      deposited: Math.round(payoutDetails.reduce((s, p) => s + p.net, 0) * 100) / 100,
      resolved: allCharges.length - unmatchedCharges.length,
      unmatched: unmatchedCharges.length,
    };

    return NextResponse.json({
      success: true,
      dateRange: { start: startDate, end: endDate },
      totals,
      summary,
      payouts: payoutDetails.sort((a, b) => b.date.localeCompare(a.date)),
      unmatchedCharges: unmatchedCharges.length > 0 ? unmatchedCharges : undefined,
    });

  } catch (error) {
    console.error('[deposit-breakdown] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
