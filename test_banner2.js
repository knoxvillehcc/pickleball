const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  try {
    const creds = await getCredentials();
    console.log("Connecting to:", creds.url);
    const uid = await odooAuth(creds);
    console.log("Auth uid:", uid);

    const invoices = await odooCall(creds, uid, 'account.move', 'search_read', [
      [['move_type', '=', 'out_invoice'], ['state', '=', 'posted'], ['payment_state', 'in', ['paid', 'in_payment']]]
    ], { fields: ['name', 'partner_id', 'invoice_date', 'amount_total', 'payment_state', 'invoice_line_ids'], limit: 3 });

    console.log("Sample invoices:", JSON.stringify(invoices, null, 2));

    // Also check count
    const count = await odooCall(creds, uid, 'account.move', 'search_count', [
      [['move_type', '=', 'out_invoice'], ['state', '=', 'posted'], ['payment_state', 'in', ['paid', 'in_payment']]]
    ]);
    console.log("Total paid invoices:", count);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
test();