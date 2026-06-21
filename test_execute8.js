const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Fetch the next broken POS record to test the whole flow and see the exact error
  const products = await odooCall(creds, uid, 'product.product', 'search_read', [
    ['|', ['name', 'ilike', 'trustee'], '|', ['name', 'ilike', 'sports'], '|', ['name', 'ilike', 'pioneer'], ['name', 'ilike', 'general']]
  ], { fields: ['id', 'name'] });
  const pIds = products.map(p => p.id);

  const posLines = await odooCall(creds, uid, 'pos.order.line', 'search_read', [
    [['product_id', 'in', pIds]]
  ], { fields: ['order_id', 'product_id', 'price_subtotal_incl'], limit: 1 });
  
  if(posLines.length === 0) return console.log("No POS lines found");
  
  const line = posLines[0];
  const orders = await odooCall(creds, uid, 'pos.order', 'search_read', [[['id', '=', line.order_id[0]]]], {
    fields: ['id', 'name', 'partner_id', 'account_move', 'date_order']
  });
  
  const order = orders[0];
  const record = {
    dbId: order.id,
    invoiceId: order.account_move ? order.account_move[0] : null,
    partnerId: order.partner_id ? order.partner_id[0] : null,
    productId: line.product_id[0],
    invoiceDate: order.date_order.split(' ')[0],
    amount: line.price_subtotal_incl
  };
  
  try {
    const newOrderId = 557; // From previous run that crashed halfway!
    console.log("Testing invoice creation on SO:", newOrderId);
    
    const newInvoiceWizard = await odooCall(creds, uid, 'sale.advance.payment.inv', 'create', [{
       advance_payment_method: 'delivered'
    }]);
    
    console.log("Wizard created:", newInvoiceWizard);
    await odooCall(creds, uid, 'sale.advance.payment.inv', 'create_invoices', [[newInvoiceWizard]], {
       context: { active_model: 'sale.order', active_ids: [newOrderId], active_id: newOrderId }
    });
    console.log("Invoice created successfully.");
  } catch(e) {
    console.error("Failed:", e.message);
  }
}
test();