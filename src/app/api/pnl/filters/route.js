import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/pnl/filters
// Returns filter options for the P&L report dropdowns.
export async function GET() {
  const auth = await getSessionAndPermissions('pnl');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const creds = await getCredentials();
    const uid   = await odooAuth(creds);

    // Fetch all data in parallel
    const [categories, companies, salespersons] = await Promise.all([
      // Product categories (full tree)
      odooCall(creds, uid, 'product.category', 'search_read', [[]], {
        fields: ['id', 'name', 'parent_id', 'complete_name'],
        order:  'complete_name asc',
      }),

      // Companies (only if multi-company)
      odooCall(creds, uid, 'res.company', 'search_read', [[]], {
        fields: ['id', 'name'],
        order:  'name asc',
      }),

      // Salespersons from posted invoices (users who have sold)
      odooCall(creds, uid, 'res.users', 'search_read', [
        [['share', '=', false], ['active', '=', true]]
      ], {
        fields: ['id', 'name'],
        order:  'name asc',
      }),
    ]);

    // Customers: fetch from recent posted invoices (limit 1000 for performance)
    const recentInvoices = await odooCall(creds, uid, 'account.move', 'search_read', [
      [['move_type', 'in', ['out_invoice', 'out_refund']], ['state', '=', 'posted']]
    ], {
      fields: ['partner_id'],
      limit:  2000,
    });

    // Extract unique customer IDs
    const customerMap = {};
    for (const inv of recentInvoices) {
      if (inv.partner_id) {
        customerMap[inv.partner_id[0]] = inv.partner_id[1];
      }
    }
    const customers = Object.entries(customerMap)
      .map(([id, name]) => ({ id: Number(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Products that have been invoiced
    const invoiceLines = await odooCall(creds, uid, 'account.move.line', 'search_read', [
      [
        ['move_id.move_type', 'in', ['out_invoice', 'out_refund']],
        ['move_id.state', '=', 'posted'],
        ['product_id', '!=', false],
        ['display_type', 'in', ['product', false]],
      ]
    ], {
      fields: ['product_id'],
      limit:  2000,
    });

    const productMap = {};
    for (const line of invoiceLines) {
      if (line.product_id) {
        productMap[line.product_id[0]] = line.product_id[1];
      }
    }
    const products = Object.entries(productMap)
      .map(([id, name]) => ({ id: Number(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      filters: {
        categories,
        companies,
        salespersons,
        customers,
        products,
        paymentStatuses: [
          { id: 'not_paid',         name: 'Not Paid'       },
          { id: 'in_payment',       name: 'In Payment'     },
          { id: 'paid',             name: 'Paid'           },
          { id: 'partial',          name: 'Partial'        },
          { id: 'reversed',         name: 'Reversed'       },
          { id: 'invoicing_legacy', name: 'Invoicing Legacy' },
        ],
      },
    });
  } catch (error) {
    console.error('[P&L Filters API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load filter options' },
      { status: 500 }
    );
  }
}
