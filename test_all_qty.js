const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const lines = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['product_id', '=', 15]]
  ], { fields: ['id', 'order_id', 'product_uom_qty', 'state'] });

  let totalQty = 0;
  for(const l of lines) {
     console.log(`SO Line ${l.id} (SO: ${l.order_id[1]}) qty: ${l.product_uom_qty} state: ${l.state}`);
     if (l.state === 'sale' || l.state === 'done') totalQty += l.product_uom_qty;
  }
  console.log("Total Active Qty in SO:", totalQty);
}
test();