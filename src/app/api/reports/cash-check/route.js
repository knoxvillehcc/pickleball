/**
 * ═══════════════════════════════════════════════════════════════════
 * Cash & Check Transaction Report API
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET /api/reports/cash-check?start=2026-08-01&end=2026-08-31
 *
 * Returns POS cash and check payments grouped by month and product
 * category — e.g. Temple Puja $3,000, Snacks $1,200, Donation $800.
 *
 * Data chain:
 *   pos.payment (Cash/Check methods)
 *     → pos.order → pos.order.line
 *       → product.product → categ_id (product category)
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ── Discover cash/check POS payment methods ───────────────────────────────────
async function discoverPaymentMethods(creds, uid) {
  const allMethods = await odooCall(creds, uid, 'pos.payment.method', 'search_read', [
    []
  ], {
    fields: ['id', 'name', 'journal_id', 'is_cash_count'],
  });

  const cashMethodIds = [];
  const checkMethodIds = [];

  for (const pm of allMethods) {
    const name = (pm.name || '').toLowerCase();
    const jName = pm.journal_id ? pm.journal_id[1].toLowerCase() : '';

    if (name.includes('check') || jName.includes('check')) {
      checkMethodIds.push(pm.id);
    } else if (pm.is_cash_count || name.includes('cash') || name.includes('dan peti')) {
      cashMethodIds.push(pm.id);
    }
    // Skip stripe, credit card, square, etc.
  }

  return { cashMethodIds, checkMethodIds, allMethods };
}

// ── Resolve product category for a POS order ──────────────────────────────────
function resolveOrderCategory(orderId, orderLinesMap, productMap) {
  const lines = orderLinesMap[orderId] || [];
  if (lines.length === 0) return 'Uncategorized';

  const catTotals = {};
  for (const line of lines) {
    const prodId = line.product_id?.[0];
    const prod = prodId ? productMap[prodId] : null;
    const catName = prod?.categ_id?.[1] || 'Uncategorized';
    catTotals[catName] = (catTotals[catName] || 0) + Math.abs(line.price_subtotal_incl || 0);
  }

  // Pick the category with the highest dollar value
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

// ══════════════════════════════════════════════════════════════════════════════
// Main GET handler
// ══════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
    }

    // ── 1. Authenticate to Odoo ─────────────────────────────────────────────
    const creds = await getCredentials();
    const uid = await odooAuth(creds);

    // ── 2. Discover cash/check payment methods ──────────────────────────────
    const { cashMethodIds, checkMethodIds } = await discoverPaymentMethods(creds, uid);
    const allMethodIds = [...cashMethodIds, ...checkMethodIds];

    if (allMethodIds.length === 0) {
      return NextResponse.json({
        success: true,
        totals: { cash: 0, check: 0, total: 0, cashCount: 0, checkCount: 0, totalCount: 0 },
        months: {},
        summary: [],
      });
    }

    // ── 3. Fetch POS payments in date range ─────────────────────────────────
    const startDt = startDate + ' 00:00:00';
    const endDt = endDate + ' 23:59:59';

    const posPayments = await odooCall(creds, uid, 'pos.payment', 'search_read', [
      [
        ['payment_method_id', 'in', allMethodIds],
        ['payment_date', '>=', startDt],
        ['payment_date', '<=', endDt],
      ]
    ], {
      fields: ['id', 'amount', 'payment_date', 'payment_method_id', 'pos_order_id'],
      order: 'payment_date desc',
      limit: 10000,
    });

    if (posPayments.length === 0) {
      return NextResponse.json({
        success: true,
        totals: { cash: 0, check: 0, total: 0, cashCount: 0, checkCount: 0, totalCount: 0 },
        months: {},
        summary: [],
      });
    }

    // ── 4. Batch-fetch POS order lines ──────────────────────────────────────
    const orderIds = [...new Set(posPayments.map(pp => pp.pos_order_id?.[0]).filter(Boolean))];

    const orderLinesMap = {}; // orderId → [lines]
    for (let i = 0; i < orderIds.length; i += 100) {
      const batch = orderIds.slice(i, i + 100);
      const lines = await odooCall(creds, uid, 'pos.order.line', 'search_read', [
        [['order_id', 'in', batch]]
      ], {
        fields: ['id', 'order_id', 'product_id', 'price_subtotal_incl', 'qty'],
      });
      for (const line of lines) {
        const oid = line.order_id[0];
        if (!orderLinesMap[oid]) orderLinesMap[oid] = [];
        orderLinesMap[oid].push(line);
      }
    }

    // ── 5. Batch-fetch products with categories ─────────────────────────────
    const productIds = new Set();
    for (const lines of Object.values(orderLinesMap)) {
      for (const line of lines) {
        if (line.product_id?.[0]) productIds.add(line.product_id[0]);
      }
    }

    const productMap = {};
    const pidArray = [...productIds];
    for (let i = 0; i < pidArray.length; i += 100) {
      const batch = pidArray.slice(i, i + 100);
      const prods = await odooCall(creds, uid, 'product.product', 'search_read', [
        [['id', 'in', batch]]
      ], {
        fields: ['id', 'name', 'categ_id'],
      });
      for (const p of prods) {
        productMap[p.id] = p;
      }
    }

    // ── 6. Build report structure ───────────────────────────────────────────
    // months: { 'YYYY-MM': { label, cash: { cat: {count, amount} }, check: { cat: {count, amount} } } }
    const months = {};
    let totalCash = 0, totalCheck = 0, cashCount = 0, checkCount = 0;

    for (const pp of posPayments) {
      const orderId = pp.pos_order_id?.[0];
      const dateStr = pp.payment_date ? pp.payment_date.split(' ')[0] : 'Unknown';
      const monthKey = dateStr.substring(0, 7);
      const monthDate = new Date(dateStr + 'T12:00:00');
      const monthLabel = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      if (!months[monthKey]) {
        months[monthKey] = { label: monthLabel, cash: {}, check: {} };
      }

      const mId = pp.payment_method_id?.[0];
      const payType = cashMethodIds.includes(mId) ? 'cash' : 'check';

      if (payType === 'cash') { totalCash += pp.amount; cashCount++; }
      else { totalCheck += pp.amount; checkCount++; }

      // Resolve category
      const category = orderId ? resolveOrderCategory(orderId, orderLinesMap, productMap) : 'Uncategorized';

      const bucket = months[monthKey][payType];
      if (!bucket[category]) bucket[category] = { count: 0, amount: 0 };
      bucket[category].count++;
      bucket[category].amount += pp.amount;
    }

    // ── 7. Format months for response ───────────────────────────────────────
    const formattedMonths = {};
    for (const [key, data] of Object.entries(months)) {
      const cashEntries = Object.entries(data.cash)
        .map(([cat, v]) => ({ category: cat, count: v.count, amount: Math.round(v.amount * 100) / 100 }))
        .sort((a, b) => b.amount - a.amount);
      const checkEntries = Object.entries(data.check)
        .map(([cat, v]) => ({ category: cat, count: v.count, amount: Math.round(v.amount * 100) / 100 }))
        .sort((a, b) => b.amount - a.amount);

      const mCashTotal = cashEntries.reduce((s, e) => s + e.amount, 0);
      const mCheckTotal = checkEntries.reduce((s, e) => s + e.amount, 0);
      const mCashCount = cashEntries.reduce((s, e) => s + e.count, 0);
      const mCheckCount = checkEntries.reduce((s, e) => s + e.count, 0);

      formattedMonths[key] = {
        label: data.label,
        cashCategories: cashEntries,
        checkCategories: checkEntries,
        cashTotal: Math.round(mCashTotal * 100) / 100,
        checkTotal: Math.round(mCheckTotal * 100) / 100,
        cashCount: mCashCount,
        checkCount: mCheckCount,
        total: Math.round((mCashTotal + mCheckTotal) * 100) / 100,
        totalCount: mCashCount + mCheckCount,
      };
    }

    // ── 8. Grand category summary ───────────────────────────────────────────
    const grandCategories = {};
    for (const data of Object.values(months)) {
      for (const payType of ['cash', 'check']) {
        for (const [cat, vals] of Object.entries(data[payType])) {
          if (!grandCategories[cat]) {
            grandCategories[cat] = { category: cat, cashCount: 0, cashAmount: 0, checkCount: 0, checkAmount: 0 };
          }
          if (payType === 'cash') {
            grandCategories[cat].cashCount += vals.count;
            grandCategories[cat].cashAmount += vals.amount;
          } else {
            grandCategories[cat].checkCount += vals.count;
            grandCategories[cat].checkAmount += vals.amount;
          }
        }
      }
    }

    const summary = Object.values(grandCategories)
      .map(c => ({
        ...c,
        cashAmount: Math.round(c.cashAmount * 100) / 100,
        checkAmount: Math.round(c.checkAmount * 100) / 100,
        totalAmount: Math.round((c.cashAmount + c.checkAmount) * 100) / 100,
        totalCount: c.cashCount + c.checkCount,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      success: true,
      dateRange: { start: startDate, end: endDate },
      totals: {
        cash: Math.round(totalCash * 100) / 100,
        check: Math.round(totalCheck * 100) / 100,
        total: Math.round((totalCash + totalCheck) * 100) / 100,
        cashCount,
        checkCount,
        totalCount: cashCount + checkCount,
      },
      months: formattedMonths,
      summary,
    });

  } catch (error) {
    console.error('[cash-check] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
