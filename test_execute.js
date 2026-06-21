const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // 1. Find a sample POS order to test
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
  
  if(orders.length === 0) return console.log("No POS order found");
  const order = orders[0];
  
  const record = {
    dbId: order.id,
    invoiceId: order.account_move ? order.account_move[0] : null,
    partnerId: order.partner_id ? order.partner_id[0] : null,
    productId: line.product_id[0],
    invoiceDate: order.date_order.split(' ')[0],
    amount: line.price_subtotal_incl
  };
  
  console.log("Attempting execution for record:", record);
  if(!record.invoiceId) return console.log("No invoice ID to reverse!");

  try {
    console.log("Step 1: Create Reversal Wizard...");
    const reverseMoves = await odooCall(creds, uid, 'account.move.reversal', 'create', [{
      move_ids: [record.invoiceId],
      journal_id: false, 
      reason: 'Correcting POS flow to Subscription flow',
      date_mode: 'custom',
      date: record.invoiceDate,
    }]);
    
    console.log("Step 2: Execute Reversal...", reverseMoves);
    await odooCall(creds, uid, 'account.move.reversal', 'reverse_moves', [[reverseMoves]]);
    
    console.log("Reversal successful. Stopping test to avoid full side-effects, or we can continue.");
  } catch(e) {
    console.error("Failed at some step:", e.message);
  }
}
test();