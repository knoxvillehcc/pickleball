/**
 * ═══════════════════════════════════════════════════════════════════
 * Stripe Deposit Against POS Transactions API (with Full Refund Tracking)
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET /api/stripe/deposit-pos-match?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Hierarchy:
 * 1. Stripe Payout (Bank Deposit)
 * 2. Balance Transactions (Charges & Refunds)
 * 3. Charge / Refund details linked to:
 *    - In-Person POS Orders: pos.payment -> pos.order -> pos.order.line (Product, Qty, Amount)
 *    - Online / Web Transactions: Checkout Sessions, Donations, Memberships
 * 4. Odoo Bank Feed (Account 101401) clearance status
 * 5. Full Refund Attribution:
 *    - Captures refund balance transactions (negative amounts)
 *    - Resolves exact product/service name via Stripe Checkout line items, Odoo sale order/invoice, or POS order
 *    - Deducts refunds from gross/net so bank deposits tie out to the exact penny
 *
 * Strictly follows HCC standard: MM-DD-YYYY dates, no cartoon emojis.
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function fmtDate(isoDateStr) {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}-${parts[0]}`;
  }
  return isoDateStr;
}

function fmtDateFromUnix(unixSec) {
  if (!unixSec) return '';
  const d = new Date(unixSec * 1000);
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const y = d.getUTCFullYear();
  return `${m}-${day}-${y}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ success: false, error: 'Start and end date required' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const startTs = Math.floor(new Date(`${start}T00:00:00Z`).getTime() / 1000);
    const endTs = Math.floor(new Date(`${end}T23:59:59Z`).getTime() / 1000);

    // 1. Fetch Stripe Payouts
    const payoutsList = await stripe.payouts.list({
      created: { gte: startTs, lte: endTs },
      limit: 100,
    });

    const payouts = payoutsList.data;

    // 2. Connect to Odoo (graceful fallback)
    let creds = null, uid = null;
    try {
      creds = await getCredentials();
      uid = await odooAuth(creds);
    } catch (err) {
      console.warn('[deposit-pos-match] Odoo authentication skipped:', err.message);
    }

    const matchedPayouts = [];
    let grandGross = 0;
    let grandRefunds = 0;
    let grandFees = 0;
    let grandNet = 0;
    let grandPosOrdersCount = 0;
    let grandPosItemsCount = 0;
    let grandRefundsCount = 0;

    for (const po of payouts) {
      const netAmount = po.amount / 100;
      grandNet += netAmount;

      // Fetch balance transactions for this payout
      const bTxns = await stripe.balanceTransactions.list({
        payout: po.id,
        limit: 100,
      });

      const chargeTxns = bTxns.data.filter(t => t.type === 'charge');
      const refundTxns = bTxns.data.filter(t => t.type === 'refund');

      const grossAmount = chargeTxns.reduce((s, t) => s + (t.amount / 100), 0);
      const refundAmount = refundTxns.reduce((s, t) => s + (t.amount / 100), 0); // negative number (e.g. -1001.00)
      const feeAmount = bTxns.data.reduce((s, t) => s + (t.fee / 100), 0);

      grandGross += grossAmount;
      grandRefunds += refundAmount;
      grandFees += feeAmount;
      grandRefundsCount += refundTxns.length;

      const chargeIds = chargeTxns.map(t => t.source);

      // Collect PaymentIntent IDs for POS matching
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
          if (ch.payment_intent) piIds.push(typeof ch.payment_intent === 'object' ? ch.payment_intent.id : ch.payment_intent);
        }
      }

      // Collect Refund details
      const refundDetails = [];
      for (const rt of refundTxns) {
        try {
          const ref = await stripe.refunds.retrieve(rt.source, {
            expand: ['charge', 'charge.payment_intent'],
          });
          if (ref) {
            refundDetails.push({
              ref,
              balanceTxn: rt,
            });
            const ch = ref.charge;
            const pi = ch?.payment_intent?.id || ch?.payment_intent;
            if (pi && !piIds.includes(pi)) piIds.push(pi);
          }
        } catch (err) {
          console.warn('[deposit-pos-match] Failed to retrieve refund:', rt.source, err.message);
        }
      }

      // Query Odoo POS Payments
      let posPayments = [];
      let orderMap = {};
      let orderLinesMap = {};
      let bankLinesMap = {};

      if (creds && uid && (piIds.length > 0 || chargeIds.length > 0)) {
        try {
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
            const orders = await odooCall(creds, uid, 'pos.order', 'read', [matchedOrderIds], {
              fields: ['id', 'name', 'pos_reference', 'partner_id', 'date_order', 'session_id', 'lines']
            });
            orders.forEach(o => { orderMap[o.id] = o; });

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

          // Check Odoo Bank Statement lines for this payout / charges
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

      // A. Process standard successful charges
      for (const ch of chargeDetails) {
        const bTxn = chargeTxns.find(t => t.source === ch.id);
        const chGross = ch.amount / 100;
        const chFee = bTxn ? bTxn.fee / 100 : 0;
        const chNet = chGross - chFee;

        const bslMatch = bankLinesMap[`Stripe ${ch.id}`];
        if (bslMatch && bslMatch.is_reconciled) odooReconciledCharges++;

        const chPi = typeof ch.payment_intent === 'object' ? ch.payment_intent?.id : ch.payment_intent;
        const posPay = posPayments.find(p => p.transaction_id === chPi || p.transaction_id === ch.id);

        if (posPay && orderMap[posPay.pos_order_id[0]]) {
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
            id: ch.id,
            isRefund: false,
            type: 'charge',
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
          let desc = ch.description || 'Online Web Transaction';
          if (desc.startsWith('Order #')) desc = 'Online Festival / Event Order';
          else if (/^S\d{4,}/i.test(desc)) desc = `Membership / Donor Order (${desc})`;

          onlineSummaryMap[desc] = onlineSummaryMap[desc] || { name: desc, count: 0, amount: 0 };
          onlineSummaryMap[desc].count += 1;
          onlineSummaryMap[desc].amount += chGross;

          onlineTransactions.push({
            id: ch.id,
            isRefund: false,
            type: 'charge',
            customer: ch.billing_details?.name || 'Online Donor',
            email: ch.billing_details?.email || ch.receipt_email || '',
            description: desc,
            productName: desc,
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

      // B. Process Refunds
      for (const { ref, balanceTxn } of refundDetails) {
        const refAmount = -(ref.amount / 100); // e.g. -1001.00
        const refFee = balanceTxn ? balanceTxn.fee / 100 : 0;
        const refNet = refAmount - refFee;
        const refDate = fmtDateFromUnix(ref.created);
        const refTime = new Date(ref.created * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
        const refReason = ref.reason ? (ref.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : 'Requested by Customer';

        const ch = ref.charge;
        const chPi = ch?.payment_intent?.id || ch?.payment_intent;
        const origDate = ch?.created ? fmtDateFromUnix(ch.created) : '';

        // Check if refund belongs to POS
        const posPay = posPayments.find(p => p.transaction_id === chPi || p.transaction_id === ch?.id);

        if (posPay && orderMap[posPay.pos_order_id[0]]) {
          const ord = orderMap[posPay.pos_order_id[0]];
          const oLines = orderLinesMap[ord.id] || [];

          const itemDetails = [];
          for (const l of oLines) {
            const pId = l.product_id ? l.product_id[0] : 0;
            const pName = l.product_id ? l.product_id[1] : 'Refunded Product';
            const qty = -(Math.abs(l.qty || 1));
            const lineAmt = -(Math.abs(l.price_subtotal_incl || 0));

            posProductTotals[`ref_${pId}`] = posProductTotals[`ref_${pId}`] || { productId: pId, productName: `[REFUND] ${pName}`, qty: 0, amount: 0, isRefund: true };
            posProductTotals[`ref_${pId}`].qty += qty;
            posProductTotals[`ref_${pId}`].amount += lineAmt;

            itemDetails.push({
              productName: `[REFUND] ${pName}`,
              qty,
              amount: lineAmt,
            });
          }

          posTransactions.push({
            id: ref.id,
            isRefund: true,
            type: 'refund',
            refundReason: refReason,
            originalDate: origDate,
            orderId: ord.id,
            orderName: `REFUND: ${ord.name}`,
            sessionName: ord.session_id ? ord.session_id[1] : 'POS Register',
            customer: ord.partner_id ? ord.partner_id[1] : (ch?.billing_details?.name || 'Customer'),
            cardBrand: (ch?.payment_method_details?.card?.brand || posPay.card_type || 'card').toUpperCase(),
            last4: ch?.payment_method_details?.card?.last4 || '••••',
            amount: refAmount,
            fee: refFee,
            net: refNet,
            date: refDate,
            time: refTime,
            items: itemDetails,
            isReconciled: false,
          });

        } else {
          // Resolve product name for online / invoice refund
          let resolvedProduct = ch?.description || 'Refunded Online Transaction';

          // 1. Check if checkout session exists
          if (chPi) {
            try {
              const sess = await stripe.checkout.sessions.list({ payment_intent: chPi, expand: ['data.line_items'] });
              if (sess.data[0]?.line_items?.data?.length) {
                resolvedProduct = sess.data[0].line_items.data.map(i => i.description || i.price?.product).join(', ');
              }
            } catch (sessErr) {
              // Ignore session lookup errors
            }
          }

          // 2. Check if Odoo Sale Order (e.g., S00288) or Invoice
          if (creds && uid && resolvedProduct.match(/^S\d{4,}/i)) {
            const soName = resolvedProduct.match(/^S\d{4,}/i)[0];
            try {
              const soList = await odooCall(creds, uid, 'sale.order', 'search_read', [[['name', '=', soName]]], { fields: ['order_line'] });
              if (soList.length > 0 && soList[0].order_line?.length) {
                const soLines = await odooCall(creds, uid, 'sale.order.line', 'read', [soList[0].order_line], ['name', 'product_id']);
                if (soLines.length > 0) {
                  resolvedProduct = soLines.map(sl => sl.product_id ? sl.product_id[1] : sl.name).join(', ');
                }
              }
            } catch (soErr) {
              // Ignore Odoo SO lookup error
            }
          }

          const desc = `[REFUND] ${resolvedProduct}`;
          onlineSummaryMap[desc] = onlineSummaryMap[desc] || { name: desc, count: 0, amount: 0, isRefund: true };
          onlineSummaryMap[desc].count += 1;
          onlineSummaryMap[desc].amount += refAmount;

          onlineTransactions.push({
            id: ref.id,
            isRefund: true,
            type: 'refund',
            refundReason: refReason,
            originalDate: origDate,
            customer: ch?.billing_details?.name || ch?.receipt_email || 'Customer',
            email: ch?.billing_details?.email || ch?.receipt_email || '',
            description: desc,
            productName: resolvedProduct,
            cardBrand: (ch?.payment_method_details?.card?.brand || 'card').toUpperCase(),
            last4: ch?.payment_method_details?.card?.last4 || '••••',
            amount: refAmount,
            fee: refFee,
            net: refNet,
            date: refDate,
            time: refTime,
            isReconciled: false,
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
        refunds: refundAmount,
        fees: feeAmount,
        net: netAmount,
        chargeCount: chargeTxns.length,
        refundCount: refundTxns.length,
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
        totalRefunds: grandRefunds,
        totalFees: grandFees,
        payoutsCount: payouts.length,
        totalPosOrders: grandPosOrdersCount,
        totalPosItems: grandPosItemsCount,
        totalRefundsCount: grandRefundsCount,
      },
      payouts: matchedPayouts,
    });

  } catch (error) {
    console.error('[deposit-pos-match] API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
