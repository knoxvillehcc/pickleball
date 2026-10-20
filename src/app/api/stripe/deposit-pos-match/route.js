/**
 * ═══════════════════════════════════════════════════════════════════
 * Stripe Deposit vs POS Product Sales Matching API
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET /api/stripe/deposit-pos-match?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Reconciles each Stripe bank deposit (payout) to:
 * 1. Specific in-person POS Register Product Sales (e.g. Daily Passes,
 *    Aarti, Cleaning, Uchamni) with exact item quantities and amounts.
 * 2. Online / Web Transactions (Festival passes, memberships, donations).
 * 3. Odoo Bank Feed clearance status (Account 101401).
 *
 * Strict date standard: MM-DD-YYYY for user-facing outputs.
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function fmtDate(isoDateStr) {
  if (!isoDateStr) return '';
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return isoDateStr;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${m}-${day}-${y}`;
}

function fmtDateFromUnix(unixSecs) {
  if (!unixSecs) return '';
  return fmtDate(new Date(unixSecs * 1000).toISOString());
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ success: false, error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);

    // Default to last 30 days if not provided
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];

    const start = startStr || defaultStart;
    const end = endStr || defaultEnd;

    const startTs = Math.floor(new Date(`${start}T00:00:00Z`).getTime() / 1000);
    const endTs = Math.floor(new Date(`${end}T23:59:59Z`).getTime() / 1000);

    // 1. Fetch Stripe Payouts
    const payoutsList = await stripe.payouts.list({
      created: { gte: startTs, lte: endTs },
      limit: 100,
    });

    const payouts = payoutsList.data;

    // 2. Connect to Odoo (optional gracefully fallback)
    let creds = null, uid = null;
    try {
      creds = await getCredentials();
      uid = await odooAuth(creds);
    } catch (err) {
      console.warn('[deposit-pos-match] Odoo authentication skipped:', err.message);
    }

    const matchedPayouts = [];
    let grandGross = 0;
    let grandFees = 0;
    let grandNet = 0;
    let grandPosOrdersCount = 0;
    let grandPosItemsCount = 0;

    for (const po of payouts) {
      const netAmount = po.amount / 100;
      grandNet += netAmount;

      // Fetch balance transactions for this payout
      const bTxns = await stripe.balanceTransactions.list({
        payout: po.id,
        limit: 100,
      });

      const chargeTxns = bTxns.data.filter(t => t.type === 'charge');
      const grossAmount = chargeTxns.reduce((s, t) => s + (t.amount / 100), 0);
      const feeAmount = chargeTxns.reduce((s, t) => s + (t.fee / 100), 0);
      grandGross += grossAmount;
      grandFees += feeAmount;

      const chargeIds = chargeTxns.map(t => t.source);

      // Collect PaymentIntent IDs for POS matching
      // Fetch details for these charges from Stripe
      const chargeDetails = [];
      const piIds = [];

      for (let i = 0; i < chargeIds.length; i += 25) {
        const batch = chargeIds.slice(i, i + 25);
        const fetched = await Promise.all(
          batch.map(cid => stripe.charges.retrieve(cid).catch(() => null))
        );
        for (const ch of fetched) {
          if (!ch) continue;
          chargeDetails.push(ch);
          if (ch.payment_intent) piIds.push(ch.payment_intent);
        }
      }

      // Query Odoo POS Payments
      let posPayments = [];
      let orderMap = {};
      let orderLinesMap = {};
      let bankLinesMap = {};

      if (creds && uid && (piIds.length > 0 || chargeIds.length > 0)) {
        try {
          // A. Search pos.payment
          const searchDomain = [];
          if (piIds.length > 0 && chargeIds.length > 0) {
            searchDomain.push('|', ['transaction_id', 'in', piIds], ['transaction_id', 'in', chargeIds]);
          } else if (piIds.length > 0) {
            searchDomain.push(['transaction_id', 'in', piIds]);
          } else {
            searchDomain.push(['transaction_id', 'in', chargeIds]);
          }

          posPayments = await odooCall(creds, uid, 'pos.payment', 'search_read', [
            searchDomain
          ], { fields: ['id', 'pos_order_id', 'amount', 'transaction_id', 'payment_date', 'card_type', 'cardholder_name'] });

          const matchedOrderIds = [...new Set(posPayments.map(p => p.pos_order_id[0]))];

          if (matchedOrderIds.length > 0) {
            // B. Fetch pos.order details
            const orders = await odooCall(creds, uid, 'pos.order', 'read', [matchedOrderIds], {
              fields: ['id', 'name', 'pos_reference', 'partner_id', 'date_order', 'session_id', 'lines']
            });
            orders.forEach(o => { orderMap[o.id] = o; });

            // C. Fetch pos.order.line items
            const allLineIds = orders.flatMap(o => o.lines || []);
            if (allLineIds.length > 0) {
              const lines = await odooCall(creds, uid, 'pos.order.line', 'read', [allLineIds], {
                fields: ['id', 'order_id', 'product_id', 'qty', 'price_unit', 'price_subtotal_incl']
              });
              lines.forEach(l => {
                const oid = l.order_id[0];
                orderLinesMap[oid] = orderLinesMap[oid] || [];
                orderLinesMap[oid].push(l);
              });
            }
          }

          // D. Check Odoo Bank Statement lines for this payout / charges
          const chargeRefQueries = chargeIds.map(c => `Stripe ${c}`);
          const bsl = await odooCall(creds, uid, 'account.bank.statement.line', 'search_read', [
            ['|', ['payment_ref', 'in', chargeRefQueries], ['payment_ref', 'ilike', po.id]]
          ], { fields: ['id', 'payment_ref', 'amount', 'is_reconciled', 'move_id'] });
          bsl.forEach(b => {
            bankLinesMap[b.payment_ref] = b;
          });

        } catch (err) {
          console.warn('[deposit-pos-match] Odoo lookup warning:', err.message);
        }
      }

      // Group into POS Product Sales vs Online Web Transactions
      const posProductTotals = {};
      const posTransactions = [];
      const onlineSummaryMap = {};
      const onlineTransactions = [];

      let odooReconciledCharges = 0;

      for (const ch of chargeDetails) {
        const bTxn = chargeTxns.find(t => t.source === ch.id);
        const chGross = ch.amount / 100;
        const chFee = bTxn ? bTxn.fee / 100 : 0;
        const chNet = chGross - chFee;

        // Check Odoo bank match
        const bslMatch = bankLinesMap[`Stripe ${ch.id}`];
        if (bslMatch && bslMatch.is_reconciled) odooReconciledCharges++;

        // Find POS payment
        const posPay = posPayments.find(p => p.transaction_id === ch.payment_intent || p.transaction_id === ch.id);

        if (posPay && orderMap[posPay.pos_order_id[0]]) {
          // POS Register Transaction!
          const ord = orderMap[posPay.pos_order_id[0]];
          const oLines = orderLinesMap[ord.id] || [];

          const itemDetails = [];
          for (const l of oLines) {
            const pId = l.product_id ? l.product_id[0] : 0;
            const pName = l.product_id ? l.product_id[1] : 'Unidentified Product';
            const qty = l.qty || 1;
            const lineAmt = l.price_subtotal_incl || 0;

            posProductTotals[pId] = posProductTotals[pId] || { productId: pId, productName: pName, qty: 0, amount: 0 };
            posProductTotals[pId].qty += qty;
            posProductTotals[pId].amount += lineAmt;
            grandPosItemsCount += qty;

            itemDetails.push({
              productName: pName,
              qty,
              amount: lineAmt,
            });
          }

          grandPosOrdersCount++;
          posTransactions.push({
            orderId: ord.id,
            orderName: ord.name,
            sessionName: ord.session_id ? ord.session_id[1] : 'POS Register',
            customer: ord.partner_id ? ord.partner_id[1] : (ch.billing_details?.name || 'Walk-in Guest'),
            cardBrand: (ch.payment_method_details?.card?.brand || posPay.card_type || 'card').toUpperCase(),
            last4: ch.payment_method_details?.card?.last4 || '••••',
            amount: chGross,
            fee: chFee,
            net: chNet,
            date: fmtDateFromUnix(ch.created),
            time: new Date(ch.created * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }),
            items: itemDetails,
            isReconciled: !!(bslMatch?.is_reconciled),
          });

        } else {
          // Online / Web Checkout / Donation / Membership
          let desc = ch.description || 'Online Web Transaction';
          if (desc.startsWith('Order #')) desc = 'Online Festival / Event Order';
          else if (/^S\d{4,}/i.test(desc)) desc = `Membership / Donor Order (${desc})`;

          onlineSummaryMap[desc] = onlineSummaryMap[desc] || { name: desc, count: 0, amount: 0 };
          onlineSummaryMap[desc].count += 1;
          onlineSummaryMap[desc].amount += chGross;

          onlineTransactions.push({
            id: ch.id,
            customer: ch.billing_details?.name || 'Online Donor',
            email: ch.billing_details?.email || ch.receipt_email || '',
            description: desc,
            cardBrand: (ch.payment_method_details?.card?.brand || 'card').toUpperCase(),
            last4: ch.payment_method_details?.card?.last4 || '••••',
            amount: chGross,
            fee: chFee,
            net: chNet,
            date: fmtDateFromUnix(ch.created),
            time: new Date(ch.created * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }),
            isReconciled: !!(bslMatch?.is_reconciled),
          });
        }
      }

      const posSummary = Object.values(posProductTotals).sort((a, b) => b.amount - a.amount);
      const onlineSummary = Object.values(onlineSummaryMap).sort((a, b) => b.amount - a.amount);

      matchedPayouts.push({
        id: po.id,
        payoutDate: fmtDateFromUnix(po.created),
        arrivalDate: fmtDateFromUnix(po.arrival_date),
        status: po.status,
        destination: po.destination ? `Bank ••••${po.destination.slice(-4)}` : 'HCC Bank',
        gross: grossAmount,
        fees: feeAmount,
        net: netAmount,
        chargeCount: chargeTxns.length,
        odooReconciledCount: odooReconciledCharges,
        isOdooCleared: odooReconciledCharges > 0 && odooReconciledCharges >= chargeTxns.length,
        posProductSummary: posSummary,
        posTransactions,
        onlineSummary,
        onlineTransactions,
      });
    }

    return NextResponse.json({
      success: true,
      startDate: fmtDate(start),
      endDate: fmtDate(end),
      kpis: {
        totalNet: grandNet,
        totalGross: grandGross,
        totalFees: grandFees,
        payoutsCount: payouts.length,
        totalPosOrders: grandPosOrdersCount,
        totalPosItems: grandPosItemsCount,
      },
      payouts: matchedPayouts,
    });

  } catch (error) {
    console.error('[deposit-pos-match] API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
