/**
 * ═══════════════════════════════════════════════════════════════════
 * Cash & Check Transaction Report API (v2 — with caching & detail)
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET /api/reports/cash-check?start=2026-08-01&end=2026-08-31
 * GET /api/reports/cash-check?start=...&end=...&refresh=true
 *
 * Returns POS cash and check payments with:
 *   - Category summary (monthly + grand totals)
 *   - Daily summary (date-level aggregation)
 *   - Individual transactions (all payments with customer/order info)
 *
 * Caches resolved categories in Supabase `pos_cash_check_categories`
 * so subsequent loads only query Odoo for new/uncached payments.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
async function getCachedPayments(paymentIds) {
  if (!paymentIds.length) return {};
  const SUPABASE_URL = process.env.SUPABASE_URL;
  if (!SUPABASE_URL) return {};

  const map = {};
  for (let i = 0; i < paymentIds.length; i += 50) {
    const batch = paymentIds.slice(i, i + 50);
    const filter = batch.join(',');
    const url = `${SUPABASE_URL}/rest/v1/pos_cash_check_categories?payment_id=in.(${filter})&select=*`;
    try {
      const res = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' });
      if (res.ok) {
        const rows = await res.json();
        for (const row of rows) {
          map[row.payment_id] = row;
        }
      }
    } catch (err) {
      console.warn('[cash-check] Cache read error:', err.message);
    }
  }
  return map;
}

// ── Cache: write (upsert) ─────────────────────────────────────────────────────
async function cachePayments(entries) {
  if (!entries.length) return;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  if (!SUPABASE_URL) return;

  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/pos_cash_check_categories`, {
        method: 'POST',
        headers: {
          ...supabaseHeaders(),
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(batch),
      });
    } catch (err) {
      console.warn('[cash-check] Cache write error:', err.message);
    }
  }
}

// ── Discover cash/check POS payment methods ───────────────────────────────────
async function discoverPaymentMethods(creds, uid) {
  const allMethods = await odooCall(creds, uid, 'pos.payment.method', 'search_read', [
    []
  ], {
    fields: ['id', 'name', 'journal_id', 'is_cash_count'],
  });

  const cashMethodIds = [];
  const checkMethodIds = [];
  const methodNameMap = {};

  for (const pm of allMethods) {
    const name = (pm.name || '').toLowerCase();
    const jName = pm.journal_id ? pm.journal_id[1].toLowerCase() : '';

    // Skip Stripe / card terminal methods — these are captured by Stripe Statement tab
    if (name.includes('stripe') || name.includes('credit card') || name.includes('square')) {
      continue;
    }

    if (name.includes('check') || jName.includes('check')) {
      checkMethodIds.push(pm.id);
      methodNameMap[pm.id] = 'Check';
    } else if (pm.is_cash_count || name.includes('cash') || name.includes('dan peti')) {
      cashMethodIds.push(pm.id);
      methodNameMap[pm.id] = 'Cash';
    }
  }

  return { cashMethodIds, checkMethodIds, methodNameMap };
}

// ── Resolve category for a POS order ──────────────────────────────────────────
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
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
    }

    // ── 1. Authenticate to Odoo ─────────────────────────────────────────────
    const creds = await getCredentials();
    const uid = await odooAuth(creds);

    // ── 2. Discover cash/check payment methods ──────────────────────────────
    const { cashMethodIds, checkMethodIds, methodNameMap } = await discoverPaymentMethods(creds, uid);
    const allMethodIds = [...cashMethodIds, ...checkMethodIds];

    const emptyResponse = {
      success: true,
      source: 'live',
      totals: { cash: 0, check: 0, total: 0, cashCount: 0, checkCount: 0, totalCount: 0 },
      months: {},
      summary: [],
      dailySummary: [],
      transactions: [],
    };

    if (allMethodIds.length === 0) {
      return NextResponse.json(emptyResponse);
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
      return NextResponse.json(emptyResponse);
    }

    // ── 4. Check cache ──────────────────────────────────────────────────────
    const paymentIds = posPayments.map(pp => pp.id);
    let cached = {};
    let source = 'live';

    if (!forceRefresh) {
      cached = await getCachedPayments(paymentIds);
      const cachedCount = Object.keys(cached).length;
      if (cachedCount === posPayments.length) {
        source = 'cache';
        console.log(`[cash-check] All ${cachedCount} payments found in cache`);
      } else {
        console.log(`[cash-check] ${cachedCount} cached, ${posPayments.length - cachedCount} to resolve`);
      }
    }

    const uncachedPayments = forceRefresh
      ? posPayments
      : posPayments.filter(pp => !cached[pp.id]);

    // ── 5. Resolve uncached: fetch order lines, products, customers ─────────
    let orderLinesMap = {};
    let productMap = {};
    let orderMap = {};

    if (uncachedPayments.length > 0) {
      // Get unique order IDs from uncached
      const orderIds = [...new Set(uncachedPayments.map(pp => pp.pos_order_id?.[0]).filter(Boolean))];

      // Fetch POS orders for customer names
      for (let i = 0; i < orderIds.length; i += 100) {
        const batch = orderIds.slice(i, i + 100);
        const orders = await odooCall(creds, uid, 'pos.order', 'search_read', [
          [['id', 'in', batch]]
        ], {
          fields: ['id', 'name', 'partner_id'],
        });
        for (const o of orders) {
          orderMap[o.id] = o;
        }
      }

      // Fetch order lines
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

      // Fetch products with categories
      const productIds = new Set();
      for (const lines of Object.values(orderLinesMap)) {
        for (const line of lines) {
          if (line.product_id?.[0]) productIds.add(line.product_id[0]);
        }
      }
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
    }

    // ── 6. Build transaction list + cache new entries ────────────────────────
    const transactions = [];
    const toCache = [];

    for (const pp of posPayments) {
      const cachedEntry = cached[pp.id];

      if (cachedEntry && !forceRefresh) {
        // Use cached data
        transactions.push({
          id: pp.id,
          date: cachedEntry.payment_date,
          time: cachedEntry.payment_time || '',
          amount: parseFloat(cachedEntry.amount) || pp.amount,
          method: cachedEntry.payment_method,
          category: cachedEntry.category,
          customer: cachedEntry.customer || '',
          orderRef: cachedEntry.order_ref || '',
        });
      } else {
        // Resolve from Odoo data
        const orderId = pp.pos_order_id?.[0];
        const mId = pp.payment_method_id?.[0];
        const method = methodNameMap[mId] || 'Cash';
        const category = orderId ? resolveOrderCategory(orderId, orderLinesMap, productMap) : 'Uncategorized';
        const order = orderId ? orderMap[orderId] : null;
        const customer = order?.partner_id ? order.partner_id[1] : '';
        const orderRef = order?.name || '';

        const dateStr = pp.payment_date ? pp.payment_date.split(' ')[0] : '';
        const timeStr = pp.payment_date && pp.payment_date.includes(' ')
          ? pp.payment_date.split(' ')[1] || ''
          : '';

        transactions.push({
          id: pp.id,
          date: dateStr,
          time: timeStr,
          amount: pp.amount,
          method,
          category,
          customer,
          orderRef,
        });

        toCache.push({
          payment_id: pp.id,
          payment_method: method,
          category,
          amount: pp.amount,
          payment_date: dateStr,
          payment_time: timeStr,
          customer,
          order_ref: orderRef,
          order_id: orderId || null,
        });
      }
    }

    // Write new entries to cache
    if (toCache.length > 0) {
      await cachePayments(toCache);
      console.log(`[cash-check] Cached ${toCache.length} new payments`);
    }

    // ── 7. Build daily summary ──────────────────────────────────────────────
    const dailyMap = {};
    for (const tx of transactions) {
      const d = tx.date || 'Unknown';
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, cashCount: 0, cashAmount: 0, checkCount: 0, checkAmount: 0 };
      }
      if (tx.method === 'Cash') {
        dailyMap[d].cashCount++;
        dailyMap[d].cashAmount += tx.amount;
      } else {
        dailyMap[d].checkCount++;
        dailyMap[d].checkAmount += tx.amount;
      }
    }

    const dailySummary = Object.values(dailyMap)
      .map(d => ({
        ...d,
        cashAmount: Math.round(d.cashAmount * 100) / 100,
        checkAmount: Math.round(d.checkAmount * 100) / 100,
        total: Math.round((d.cashAmount + d.checkAmount) * 100) / 100,
        totalCount: d.cashCount + d.checkCount,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // ── 8. Build monthly breakdown ──────────────────────────────────────────
    const months = {};
    let totalCash = 0, totalCheck = 0, cashCount = 0, checkCount = 0;

    for (const tx of transactions) {
      const monthKey = (tx.date || 'Unknown').substring(0, 7);
      const monthDate = new Date(tx.date + 'T12:00:00');
      const monthLabel = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      if (!months[monthKey]) {
        months[monthKey] = { label: monthLabel, cash: {}, check: {} };
      }

      const payType = tx.method === 'Cash' ? 'cash' : 'check';
      if (payType === 'cash') { totalCash += tx.amount; cashCount++; }
      else { totalCheck += tx.amount; checkCount++; }

      const bucket = months[monthKey][payType];
      if (!bucket[tx.category]) bucket[tx.category] = { count: 0, amount: 0 };
      bucket[tx.category].count++;
      bucket[tx.category].amount += tx.amount;
    }

    // Format months
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

      formattedMonths[key] = {
        label: data.label,
        cashCategories: cashEntries,
        checkCategories: checkEntries,
        cashTotal: Math.round(mCashTotal * 100) / 100,
        checkTotal: Math.round(mCheckTotal * 100) / 100,
        cashCount: cashEntries.reduce((s, e) => s + e.count, 0),
        checkCount: checkEntries.reduce((s, e) => s + e.count, 0),
        total: Math.round((mCashTotal + mCheckTotal) * 100) / 100,
        totalCount: cashEntries.reduce((s, e) => s + e.count, 0) + checkEntries.reduce((s, e) => s + e.count, 0),
      };
    }

    // ── 9. Grand category summary ───────────────────────────────────────────
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
      source,
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
      dailySummary,
      transactions,
    });

  } catch (error) {
    console.error('[cash-check] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
