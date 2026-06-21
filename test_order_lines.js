const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const lines = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['order_id', '=', 410]]
  ], { fields: ['product_id', 'price_unit', 'product_uom_qty'] });
  
  console.log(lines);
}
test();