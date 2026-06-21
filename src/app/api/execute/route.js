import { NextResponse } from 'next/server';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';

export async function POST(request) {
  try {
    const { records, environment } = await request.json();
    
    if (!records || records.length === 0) {
      return NextResponse.json({ success: false, error: 'No records provided for execution' }, { status: 400 });
    }

    const creds = await getCredentials();
    const sessionId = await odooAuth(creds);

    const logs = [];

    for (const record of records) {
      if (!record.dbId || !record.invoiceId || !record.partnerId || !record.productId) {
         logs.push({ id: record.id, status: 'failed', error: 'Missing critical IDs for execution' });
         continue;
      }

      try {
        const invoice = await odooCall(creds, sessionId, 'account.move', 'read', [[record.invoiceId]], { fields: ['journal_id'] });
        const journalId = invoice[0] && invoice[0].journal_id ? invoice[0].journal_id[0] : false;

        const reverseMoves = await odooCall(creds, sessionId, 'account.move.reversal', 'create', [{
          move_ids: [record.invoiceId],
          journal_id: journalId, 
          reason: 'Correcting POS flow to Subscription flow',
          date: record.invoiceDate,
        }], {
          context: { active_model: 'account.move', active_ids: [record.invoiceId] }
        });
        
        const reversalId = reverseMoves; 
        await odooCall(creds, sessionId, 'account.move.reversal', 'reverse_moves', [[reversalId]]);
        
        const creditNotes = await odooCall(creds, sessionId, 'account.move', 'search_read', [
            [['reversed_entry_id', '=', record.invoiceId], ['move_type', '=', 'out_refund']]
        ], { fields: ['id', 'name'], limit: 1 });
        
        const creditNoteId = creditNotes.length > 0 ? creditNotes[0].id : null;

        let planId = 5; // Default General
        const prodName = (record.product || "").toLowerCase();
        if (prodName.includes('pioneer')) planId = 6;
        else if (prodName.includes('sport')) planId = 8;

        const newOrderId = await odooCall(creds, sessionId, 'sale.order', 'create', [{
           partner_id: record.partnerId,
           date_order: record.invoiceDate,
           is_subscription: true,
           plan_id: planId,
           order_line: [
             [0, 0, {
                 product_id: record.productId,
                 product_uom_qty: 1, 
                 price_unit: record.amount
             }]
           ]
        }]);

        await odooCall(creds, sessionId, 'sale.order', 'action_confirm', [[newOrderId]]);

        // Intentionally skipping manual invoice generation here because Odoo Subscriptions handles it natively based on the Plan.
        
        const messageBody = 'transfer from pos order to a correct flow by HP';
        
        await odooCall(creds, sessionId, 'mail.message', 'create', [{
           model: 'account.move', res_id: record.invoiceId, body: messageBody, message_type: 'comment'
        }]);
        
        if (creditNoteId) {
            await odooCall(creds, sessionId, 'mail.message', 'create', [{
               model: 'account.move', res_id: creditNoteId, body: messageBody, message_type: 'comment'
            }]);
        }
        
        await odooCall(creds, sessionId, 'mail.message', 'create', [{
           model: 'sale.order', res_id: newOrderId, body: messageBody, message_type: 'comment'
        }]);

        logs.push({ id: record.id, status: 'fixed', message: 'Successfully remediated' });

      } catch (err) {
        logs.push({ id: record.id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ success: true, logs });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}