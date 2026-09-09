/**
 * ═══════════════════════════════════════════════════════════════════
 * Non-POS Invoice Report API
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET /api/reports/invoices?start=2026-08-01&end=2026-08-31
 *
 * Returns invoices from account.move that are NOT auto-generated
 * by POS sessions. These are sale orders, manual invoices,
 * rental income, etc.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
    }

    // ── 1. Authenticate ─────────────────────────────────────────────────────
    const creds = await getCredentials();
    const uid = await odooAuth(creds);

    // ── 2. Get POS order invoice IDs to exclude ─────────────────────────────
    // POS orders with state=invoiced have auto-generated invoices
    const posOrders = await odooCall(creds, uid, 'pos.order', 'search_read', [
      [
        ['date_order', '>=', startDate + ' 00:00:00'],
        ['date_order', '<=', endDate + ' 23:59:59'],
        ['state', '=', 'invoiced'],
      ]
    ], {
      fields: ['id', 'account_move'],
      limit: 10000,
    });

    const posInvoiceIds = new Set();
    for (const po of posOrders) {
      if (po.account_move) posInvoiceIds.add(po.account_move[0]);
    }

    // ── 3. Get ALL invoices in date range ────────────────────────────────────
    const allInvoices = await odooCall(creds, uid, 'account.move', 'search_read', [
      [
        ['move_type', 'in', ['out_invoice', 'out_refund']],
        ['invoice_date', '>=', startDate],
        ['invoice_date', '<=', endDate],
        ['state', '=', 'posted'],
      ]
    ], {
      fields: ['id', 'name', 'amount_total', 'amount_residual', 'invoice_date',
               'partner_id', 'payment_state', 'invoice_origin', 'journal_id',
               'move_type', 'invoice_line_ids'],
      order: 'invoice_date desc, amount_total desc',
      limit: 10000,
    });

    // ── 4. Filter: exclude POS-auto-generated invoices ──────────────────────
    // POS auto-generates invoices with origins like "2619-1-000xxx" (POS session refs)
    const nonPosInvoices = allInvoices.filter(inv => {
      // Exclude if directly linked to POS order
      if (posInvoiceIds.has(inv.id)) return false;

      // Check origin pattern — POS session refs look like "2619-1-000xxx" or "2622-1-000xxx"
      const origin = (inv.invoice_origin || '').trim();
      if (/^\d{4}-\d+-\d+$/.test(origin)) return false;

      return true;
    });

    // ── 5. Get invoice lines for category info ──────────────────────────────
    const invoiceLineIds = [];
    for (const inv of nonPosInvoices) {
      if (inv.invoice_line_ids) invoiceLineIds.push(...inv.invoice_line_ids);
    }

    // Fetch invoice lines in batches
    const linesByInvoice = {};
    for (let i = 0; i < invoiceLineIds.length; i += 200) {
      const batch = invoiceLineIds.slice(i, i + 200);
      const lines = await odooCall(creds, uid, 'account.move.line', 'search_read', [
        [['id', 'in', batch], ['display_type', '=', 'product']]
      ], {
        fields: ['id', 'move_id', 'product_id', 'name', 'price_total', 'account_id'],
      });
      for (const line of lines) {
        const invId = line.move_id[0];
        if (!linesByInvoice[invId]) linesByInvoice[invId] = [];
        linesByInvoice[invId].push(line);
      }
    }

    // ── 6. Build response ───────────────────────────────────────────────────
    let totalPaid = 0, totalUnpaid = 0, totalPartial = 0, totalAll = 0;
    let countPaid = 0, countUnpaid = 0, countPartial = 0;

    const invoices = [];
    const byMonth = {};
    const byCategory = {};

    for (const inv of nonPosInvoices) {
      const amount = inv.amount_total;
      const status = inv.payment_state || 'unknown';
      const dateStr = inv.invoice_date || '';
      const monthKey = dateStr.substring(0, 7);
      const customer = inv.partner_id ? inv.partner_id[1] : '';
      const origin = inv.invoice_origin || '';
      const isRefund = inv.move_type === 'out_refund';

      // Determine category from invoice lines or origin
      let category = 'Uncategorized';
      const lines = linesByInvoice[inv.id] || [];
      if (lines.length > 0) {
        // Use account name or product name as category hint
        const lineCats = {};
        for (const line of lines) {
          const acctName = line.account_id ? line.account_id[1] : '';
          const prodName = line.product_id ? line.product_id[1] : line.name || '';
          const catKey = acctName || prodName || 'Uncategorized';
          lineCats[catKey] = (lineCats[catKey] || 0) + Math.abs(line.price_total || 0);
        }
        category = Object.entries(lineCats).sort(([,a], [,b]) => b - a)[0][0];
      } else if (origin.startsWith('S0')) {
        category = 'Sale Order';
      }

      totalAll += amount;
      if (['paid', 'in_payment'].includes(status)) { totalPaid += amount; countPaid++; }
      else if (status === 'partial') { totalPartial += amount; countPartial++; }
      else { totalUnpaid += amount; countUnpaid++; }

      // Monthly grouping
      if (!byMonth[monthKey]) {
        const dt = new Date(dateStr + 'T12:00:00');
        byMonth[monthKey] = {
          label: dt.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          paid: 0, unpaid: 0, total: 0, count: 0,
        };
      }
      byMonth[monthKey].total += amount;
      byMonth[monthKey].count++;
      if (['paid', 'in_payment'].includes(status)) byMonth[monthKey].paid += amount;
      else byMonth[monthKey].unpaid += amount;

      // Category grouping
      if (!byCategory[category]) byCategory[category] = { paid: 0, unpaid: 0, total: 0, count: 0 };
      byCategory[category].total += amount;
      byCategory[category].count++;
      if (['paid', 'in_payment'].includes(status)) byCategory[category].paid += amount;
      else byCategory[category].unpaid += amount;

      invoices.push({
        id: inv.id,
        number: inv.name,
        date: dateStr,
        customer,
        amount: Math.round(amount * 100) / 100,
        residual: Math.round((inv.amount_residual || 0) * 100) / 100,
        status,
        origin,
        category,
        isRefund,
      });
    }

    // Format category summary
    const categorySummary = Object.entries(byCategory)
      .map(([cat, d]) => ({
        category: cat,
        count: d.count,
        paid: Math.round(d.paid * 100) / 100,
        unpaid: Math.round(d.unpaid * 100) / 100,
        total: Math.round(d.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);

    // Format monthly summary
    const monthlySummary = Object.entries(byMonth)
      .map(([key, d]) => ({
        month: key,
        label: d.label,
        count: d.count,
        paid: Math.round(d.paid * 100) / 100,
        unpaid: Math.round(d.unpaid * 100) / 100,
        total: Math.round(d.total * 100) / 100,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return NextResponse.json({
      success: true,
      dateRange: { start: startDate, end: endDate },
      totals: {
        all: Math.round(totalAll * 100) / 100,
        paid: Math.round(totalPaid * 100) / 100,
        unpaid: Math.round((totalUnpaid + totalPartial) * 100) / 100,
        countAll: nonPosInvoices.length,
        countPaid,
        countUnpaid: countUnpaid + countPartial,
      },
      excluded: {
        posInvoices: allInvoices.length - nonPosInvoices.length,
        posTotal: Math.round(allInvoices.filter(i => !nonPosInvoices.includes(i)).reduce((s, i) => s + i.amount_total, 0) * 100) / 100,
      },
      categorySummary,
      monthlySummary,
      invoices,
    });

  } catch (error) {
    console.error('[invoices] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
