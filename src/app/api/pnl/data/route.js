import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ── Permission helpers ────────────────────────────────────────────────────────
function hasPerm(user, slug) {
  if (user.role === 'super_admin') return true;
  const pages = Array.isArray(user.allowedPages) ? user.allowedPages : [];
  return pages.includes('*') || pages.includes(slug);
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function toOdooDate(dateStr) {
  // Returns YYYY-MM-DD HH:MM:SS strings Odoo expects
  return dateStr; // already ISO
}

function formatOdooDateFilter(startDate, endDate, field = 'invoice_date') {
  const domain = [];
  if (startDate) domain.push([field, '>=', startDate]);
  if (endDate)   domain.push([field, '<=', endDate]);
  return domain;
}

// ── Main GET handler ──────────────────────────────────────────────────────────
export async function GET(request) {
  // 1. Auth check — user must have 'pnl' permission
  const auth = await getSessionAndPermissions('pnl');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
  }
  const user = auth.user;

  const canViewCosts   = hasPerm(user, 'pnl-costs');
  const canViewInvoice = hasPerm(user, 'pnl-invoice-detail');
  const canViewProduct = hasPerm(user, 'pnl-product-detail');

  // 2. Parse query params
  const { searchParams } = new URL(request.url);
  const startDate      = searchParams.get('startDate') || null;
  const endDate        = searchParams.get('endDate')   || null;
  const basis          = searchParams.get('basis')     || 'accrual';
  const page           = parseInt(searchParams.get('page')     || '1', 10);
  const pageSize       = parseInt(searchParams.get('pageSize') || '50', 10);
  const includeDetail  = searchParams.get('includeDetail') === 'true';

  // Multi-value filters
  const categoryIds    = searchParams.getAll('categoryId').map(Number).filter(Boolean);
  const productIds     = searchParams.getAll('productId').map(Number).filter(Boolean);
  const customerIds    = searchParams.getAll('customerId').map(Number).filter(Boolean);
  const salespersonIds = searchParams.getAll('salespersonId').map(Number).filter(Boolean);
  const companyIds     = searchParams.getAll('companyId').map(Number).filter(Boolean);
  const paymentStatus  = searchParams.getAll('paymentStatus'); // 'paid', 'partial', 'not_paid'

  try {
    const creds = await getCredentials();
    const uid   = await odooAuth(creds);

    // ── 3. Build Odoo domain ─────────────────────────────────────────────────
    // Base: posted invoices + credit notes only
    const dateField = basis === 'cash' ? 'invoice_date' : 'invoice_date';
    let moveDomain = [
      ['move_type', 'in', ['out_invoice', 'out_refund']],
      ['state', '=', 'posted'],
    ];
    if (startDate)           moveDomain.push([dateField, '>=', startDate]);
    if (endDate)             moveDomain.push([dateField, '<=', endDate]);
    if (companyIds.length)   moveDomain.push(['company_id', 'in', companyIds]);
    if (customerIds.length)  moveDomain.push(['partner_id', 'in', customerIds]);
    if (salespersonIds.length) moveDomain.push(['invoice_user_id', 'in', salespersonIds]);
    if (paymentStatus.length) moveDomain.push(['payment_state', 'in', paymentStatus]);

    // ── 4. Fetch invoice moves in batches ─────────────────────────────────────
    const moveFields = [
      'id', 'name', 'move_type', 'state', 'invoice_date',
      'partner_id', 'invoice_user_id', 'payment_state',
      'company_id', 'currency_id',
    ];

    // Count total first for pagination
    const moveCount = await odooCall(creds, uid, 'account.move', 'search_count', [moveDomain]);

    // Batch fetch moves (limit 500 per batch to handle large datasets)
    const BATCH = 500;
    let allMoves = [];
    for (let offset = 0; offset < moveCount; offset += BATCH) {
      const batch = await odooCall(creds, uid, 'account.move', 'search_read', [moveDomain], {
        fields: moveFields,
        limit:  BATCH,
        offset,
      });
      allMoves = allMoves.concat(batch);
    }

    if (allMoves.length === 0) {
      return NextResponse.json({
        success: true,
        summary: buildEmptySummary(),
        categories: [],
        warnings: [],
        totalCategories: 0,
        page,
        pageSize,
        lastSync: new Date().toISOString(),
        cached: false,
      });
    }

    const moveIds = allMoves.map(m => m.id);

    // ── 5. Fetch invoice lines ─────────────────────────────────────────────────
    let lineDomain = [
      ['move_id', 'in', moveIds],
      ['display_type', '=', false],        // exclude section/note lines
      ['product_id', '!=', false],         // only product lines
      ['exclude_from_invoice_tab', '=', false],
    ];
    if (productIds.length)  lineDomain.push(['product_id', 'in', productIds]);

    const lineFields = [
      'id', 'move_id', 'product_id', 'product_uom_id',
      'quantity', 'price_unit', 'discount', 'price_subtotal',
      'price_total', 'tax_ids', 'name',
    ];

    let allLines = [];
    const lineCount = await odooCall(creds, uid, 'account.move.line', 'search_count', [lineDomain]);
    for (let offset = 0; offset < lineCount; offset += BATCH) {
      const batch = await odooCall(creds, uid, 'account.move.line', 'search_read', [lineDomain], {
        fields: lineFields,
        limit:  BATCH,
        offset,
      });
      allLines = allLines.concat(batch);
    }

    // ── 6. Fetch products and categories ─────────────────────────────────────
    const productIdsFromLines = [...new Set(allLines.map(l => l.product_id?.[0]).filter(Boolean))];

    let productsMap = {};
    if (productIdsFromLines.length) {
      const products = await odooCall(creds, uid, 'product.product', 'search_read', [
        [['id', 'in', productIdsFromLines]]
      ], {
        fields: ['id', 'name', 'default_code', 'categ_id', 'standard_price', 'uom_id'],
      });
      for (const p of products) productsMap[p.id] = p;
    }

    // Filter by category if needed
    if (categoryIds.length) {
      const allowedProductIds = Object.values(productsMap)
        .filter(p => p.categ_id && categoryIds.includes(p.categ_id[0]))
        .map(p => p.id);
      allLines = allLines.filter(l => allowedProductIds.includes(l.product_id?.[0]));
    }

    // ── 7. Fetch all relevant product categories ───────────────────────────────
    const catIdsFromProducts = [...new Set(
      Object.values(productsMap).map(p => p.categ_id?.[0]).filter(Boolean)
    )];
    let categoriesMap = {};
    if (catIdsFromProducts.length) {
      const cats = await odooCall(creds, uid, 'product.category', 'search_read', [
        [['id', 'in', catIdsFromProducts]]
      ], {
        fields: ['id', 'name', 'parent_id', 'complete_name'],
      });
      for (const c of cats) categoriesMap[c.id] = c;
    }

    // Fetch parent categories if not already loaded
    const parentCatIds = [...new Set(
      Object.values(categoriesMap).map(c => c.parent_id?.[0]).filter(Boolean)
    )].filter(id => !categoriesMap[id]);
    if (parentCatIds.length) {
      const parentCats = await odooCall(creds, uid, 'product.category', 'search_read', [
        [['id', 'in', parentCatIds]]
      ], {
        fields: ['id', 'name', 'parent_id', 'complete_name'],
      });
      for (const c of parentCats) categoriesMap[c.id] = c;
    }

    // ── 8. Build move lookup map ───────────────────────────────────────────────
    const movesMap = {};
    for (const m of allMoves) movesMap[m.id] = m;

    // ── 9. Compute P&L by category ────────────────────────────────────────────
    // categoryData: { [catId]: { invoiceLines: [], creditNoteLines: [] } }
    const categoryData = {};

    for (const line of allLines) {
      const move    = movesMap[line.move_id?.[0]];
      if (!move) continue;

      const prodId  = line.product_id?.[0];
      const product = productsMap[prodId];
      if (!product) continue;

      const catId   = product.categ_id?.[0] || 'uncategorized';
      if (!categoryData[catId]) {
        categoryData[catId] = { invoiceLines: [], creditNoteLines: [] };
      }

      const enrichedLine = {
        ...line,
        move,
        product,
        catId,
      };

      if (move.move_type === 'out_invoice') {
        categoryData[catId].invoiceLines.push(enrichedLine);
      } else {
        categoryData[catId].creditNoteLines.push(enrichedLine);
      }
    }

    // ── 10. Calculate per-category P&L metrics ─────────────────────────────────
    const warnings = [];
    const categoryResults = [];

    for (const [catId, data] of Object.entries(categoryData)) {
      const cat       = categoriesMap[catId];
      const catName   = cat?.name || 'Uncategorized';
      const parentCat = cat?.parent_id ? categoriesMap[cat.parent_id[0]] : null;

      let grossSales    = 0; // sum of (price_unit * qty) before discount
      let discounts     = 0; // sum of discount amounts
      let netSales      = 0; // price_subtotal on invoices
      let refunds       = 0; // price_subtotal on credit notes (positive number)
      let cogs          = 0;
      let taxes         = 0; // price_total - price_subtotal
      let qtySold       = 0;
      let qtyReturned   = 0;
      let invoiceCount  = new Set();
      let productMetrics = {}; // productId -> metrics

      // Process invoice lines
      for (const line of data.invoiceLines) {
        const unitPrice = line.price_unit || 0;
        const qty       = line.quantity   || 0;
        const disc      = line.discount   || 0; // %
        const subtotal  = line.price_subtotal || 0;
        const lineGross = unitPrice * qty;
        const lineDisc  = lineGross * (disc / 100);

        grossSales += lineGross;
        discounts  += lineDisc;
        netSales   += subtotal;
        taxes      += (line.price_total || 0) - subtotal;
        qtySold    += qty;

        invoiceCount.add(line.move_id?.[0]);

        // COGS
        const prodId  = line.product_id?.[0];
        const product = productsMap[prodId];
        const unitCost = product?.standard_price || 0;

        if (!unitCost && product) {
          warnings.push({
            type:    'no_cost',
            message: `Product "${product.name}" has no cost. COGS may be understated.`,
            productId: prodId,
            productName: product.name,
          });
        }

        cogs += qty * unitCost;

        // Product level
        if (!productMetrics[prodId]) {
          productMetrics[prodId] = {
            productId:    prodId,
            productName:  product?.name || 'Unknown',
            sku:          product?.default_code || '',
            qtySold:      0, qtyReturned: 0,
            grossSales:   0, discounts:   0,
            netSales:     0, refunds:     0,
            cogs:         0, taxes:       0,
            invoiceCount: new Set(),
            unitCost:     unitCost,
            invoiceLines: [],
            currentCostFlag: !!(product && unitCost > 0),
          };
        }
        const pm = productMetrics[prodId];
        pm.qtySold    += qty;
        pm.grossSales += lineGross;
        pm.discounts  += lineDisc;
        pm.netSales   += subtotal;
        pm.taxes      += (line.price_total || 0) - subtotal;
        pm.cogs       += qty * unitCost;
        pm.invoiceCount.add(line.move_id?.[0]);

        if (canViewInvoice) {
          pm.invoiceLines.push({
            invoiceDate:   line.move?.invoice_date || '',
            invoiceNumber: line.move?.name         || '',
            customer:      line.move?.partner_id?.[1] || '',
            salesperson:   line.move?.invoice_user_id?.[1] || '',
            productName:   product?.name || '',
            qty,
            unitPrice,
            discount:      disc,
            netRevenue:    subtotal,
            unitCost:      canViewCosts ? unitCost : undefined,
            lineCogs:      canViewCosts ? qty * unitCost : undefined,
            grossProfit:   canViewCosts ? subtotal - (qty * unitCost) : undefined,
            paymentStatus: line.move?.payment_state || '',
            moveType:      'invoice',
          });
        }
      }

      // Process credit note lines (refunds)
      for (const line of data.creditNoteLines) {
        const subtotal  = line.price_subtotal || 0;
        const qty       = line.quantity   || 0;
        const prodId    = line.product_id?.[0];
        const product   = productsMap[prodId];
        const unitCost  = product?.standard_price || 0;

        refunds      += subtotal;
        qtyReturned  += qty;
        cogs         -= qty * unitCost; // refunds reduce COGS

        invoiceCount.add(line.move_id?.[0]);

        if (productMetrics[prodId]) {
          productMetrics[prodId].refunds      += subtotal;
          productMetrics[prodId].qtyReturned  += qty;
          productMetrics[prodId].cogs         -= qty * unitCost;
          productMetrics[prodId].invoiceCount.add(line.move_id?.[0]);
        } else if (prodId) {
          // Refund-only product (no invoice in range)
          if (!productMetrics[prodId]) {
            productMetrics[prodId] = {
              productId: prodId, productName: product?.name || 'Unknown',
              sku: product?.default_code || '',
              qtySold: 0, qtyReturned: qty,
              grossSales: 0, discounts: 0, netSales: 0,
              refunds: subtotal, cogs: -(qty * unitCost), taxes: 0,
              invoiceCount: new Set([line.move_id?.[0]]),
              unitCost, currentCostFlag: true, invoiceLines: [],
            };
          }
        }

        if (canViewInvoice && productMetrics[prodId]) {
          productMetrics[prodId].invoiceLines.push({
            invoiceDate:   line.move?.invoice_date || '',
            invoiceNumber: line.move?.name         || '',
            customer:      line.move?.partner_id?.[1] || '',
            salesperson:   line.move?.invoice_user_id?.[1] || '',
            productName:   product?.name || '',
            qty:           -qty,
            unitPrice:     line.price_unit || 0,
            discount:      line.discount   || 0,
            netRevenue:    -subtotal,
            unitCost:      canViewCosts ? unitCost : undefined,
            lineCogs:      canViewCosts ? -(qty * unitCost) : undefined,
            grossProfit:   canViewCosts ? -(subtotal - qty * unitCost) : undefined,
            paymentStatus: line.move?.payment_state || '',
            moveType:      'credit_note',
            isCreditNote:  true,
          });
        }
      }

      const netQty     = qtySold - qtyReturned;
      const actualNetSales = netSales - refunds;
      const grossProfit    = actualNetSales - cogs;
      const grossMargin    = actualNetSales !== 0 ? (grossProfit / actualNetSales) * 100 : null;

      // Warnings
      if (actualNetSales > 0 && cogs === 0 && canViewCosts) {
        warnings.push({
          type:    'no_cogs',
          message: `Category "${catName}" has revenue but zero COGS. Check product costs.`,
          catId,
          catName,
        });
      }

      // Build products array
      const productsArray = canViewProduct
        ? Object.values(productMetrics).map(pm => {
            const pmNetSales   = pm.netSales - pm.refunds;
            const pmNetQty     = pm.qtySold  - pm.qtyReturned;
            const pmGP         = canViewCosts ? pmNetSales - pm.cogs : undefined;
            const pmGM         = canViewCosts && pmNetSales !== 0 ? (pmGP / pmNetSales) * 100 : null;
            const avgPrice     = pmNetQty !== 0 ? pmNetSales / pmNetQty : 0;
            const avgCost      = canViewCosts && pmNetQty !== 0 ? pm.cogs / pmNetQty : undefined;
            return {
              productId:        pm.productId,
              productName:      pm.productName,
              sku:              pm.sku,
              qtySold:          pm.qtySold,
              qtyReturned:      pm.qtyReturned,
              netQty:           pmNetQty,
              avgSellingPrice:  avgPrice,
              grossSales:       pm.grossSales,
              discounts:        pm.discounts,
              refunds:          pm.refunds,
              netSales:         pmNetSales,
              avgUnitCost:      canViewCosts ? avgCost : undefined,
              cogs:             canViewCosts ? pm.cogs : undefined,
              grossProfit:      canViewCosts ? pmGP   : undefined,
              grossMargin:      canViewCosts ? pmGM   : undefined,
              taxes:            pm.taxes,
              invoiceCount:     pm.invoiceCount.size,
              currentCostFlag:  pm.currentCostFlag,
              invoiceLines:     canViewInvoice ? pm.invoiceLines : undefined,
            };
          })
        : undefined;

      categoryResults.push({
        catId,
        catName,
        parentCatId:   cat?.parent_id?.[0]  || null,
        parentCatName: parentCat?.name       || null,
        qtySold,
        qtyReturned,
        netQty,
        grossSales,
        discounts,
        refunds,
        netSales:      actualNetSales,
        cogs:          canViewCosts ? cogs        : undefined,
        grossProfit:   canViewCosts ? grossProfit : undefined,
        grossMargin:   canViewCosts ? grossMargin : undefined,
        taxes,
        invoiceCount:  invoiceCount.size,
        products:      productsArray,
      });
    }

    // ── 11. Paginate categories ────────────────────────────────────────────────
    const totalCategories = categoryResults.length;
    const startIdx = (page - 1) * pageSize;
    const pageCategories = categoryResults.slice(startIdx, startIdx + pageSize);

    // ── 12. Grand totals ──────────────────────────────────────────────────────
    const totals = categoryResults.reduce((acc, cat) => {
      acc.grossSales  += cat.grossSales;
      acc.discounts   += cat.discounts;
      acc.refunds     += cat.refunds;
      acc.netSales    += cat.netSales;
      acc.taxes       += cat.taxes;
      acc.qtySold     += cat.qtySold;
      acc.qtyReturned += cat.qtyReturned;
      acc.netQty      += cat.netQty;
      acc.invoiceCount = new Set([...acc._invoiceIds]);
      if (canViewCosts) {
        acc.cogs        += cat.cogs       || 0;
        acc.grossProfit += cat.grossProfit || 0;
      }
      return acc;
    }, {
      grossSales: 0, discounts: 0, refunds: 0, netSales: 0,
      taxes: 0, qtySold: 0, qtyReturned: 0, netQty: 0,
      cogs: 0, grossProfit: 0, _invoiceIds: new Set(),
    });

    // Count unique invoices across all moves processed
    const uniqueInvoiceIds = new Set(allMoves.map(m => m.id));
    totals.invoiceCount = uniqueInvoiceIds.size;
    totals.grossMargin  = canViewCosts && totals.netSales !== 0
      ? (totals.grossProfit / totals.netSales) * 100
      : null;

    // ── 13. Add % of total to each category ──────────────────────────────────
    for (const cat of pageCategories) {
      cat.pctOfTotalSales  = totals.netSales  !== 0 ? (cat.netSales  / totals.netSales)  * 100 : 0;
      cat.pctOfTotalProfit = canViewCosts && totals.grossProfit !== 0
        ? ((cat.grossProfit || 0) / totals.grossProfit) * 100
        : null;
    }

    // Deduplicate warnings
    const seenWarnings = new Set();
    const dedupedWarnings = warnings.filter(w => {
      const key = `${w.type}-${w.productId || w.catId}`;
      if (seenWarnings.has(key)) return false;
      seenWarnings.add(key);
      return true;
    });

    return NextResponse.json({
      success: true,
      summary: {
        grossSales:  totals.grossSales,
        discounts:   totals.discounts,
        refunds:     totals.refunds,
        netSales:    totals.netSales,
        cogs:        canViewCosts ? totals.cogs        : undefined,
        grossProfit: canViewCosts ? totals.grossProfit : undefined,
        grossMargin: canViewCosts ? totals.grossMargin : undefined,
        taxes:       totals.taxes,
        netQty:      totals.netQty,
        invoiceCount: totals.invoiceCount,
      },
      categories:       pageCategories,
      totalCategories,
      page,
      pageSize,
      warnings:         dedupedWarnings,
      lastSync:         new Date().toISOString(),
      cached:           false,
      permissions: {
        canViewCosts,
        canViewProduct,
        canViewInvoice,
      },
    });

  } catch (error) {
    console.error('[P&L Data API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load P&L data' },
      { status: 500 }
    );
  }
}

function buildEmptySummary() {
  return {
    grossSales: 0, discounts: 0, refunds: 0, netSales: 0,
    cogs: 0, grossProfit: 0, grossMargin: null,
    taxes: 0, netQty: 0, invoiceCount: 0,
  };
}
