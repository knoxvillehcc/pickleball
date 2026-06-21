const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const posLines = await odooCall(creds, uid, 'pos.order.line', 'search_read', [
    [['product_id', '=', 15]]
  ], { fields: ['id', 'order_id', 'qty'] });

  let totalQty = 0;
  for(const l of posLines) {
     console.log(`Line ${l.id} qty: ${l.qty}`);
     totalQty += l.qty;
  }
  console.log("Total POS Qty:", totalQty);
}
test();