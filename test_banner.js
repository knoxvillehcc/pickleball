const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Get a sample paid invoice to see available fields
  const invoices = await odooCall(creds, uid, 'account.move', 'search_read', [
    [['move_type', '=', 'out_invoice'], ['state', '=', 'posted'], ['payment_state', 'in', ['paid', 'in_payment']]]
  ], { fields: ['name', 'partner_id', 'invoice_date', 'invoice_date_due', 'amount_total', 'payment_state', 'invoice_line_ids'], limit: 3 });

  console.log(JSON.stringify(invoices, null, 2));
}
test();