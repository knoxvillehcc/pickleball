const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const activeSubs = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['state', 'in', ['sale', 'done']], ['order_id.is_subscription', '=', true], ['product_id', '=', 15]]
  ], { fields: ['order_id', 'product_uom_qty'] });
  
  console.log(activeSubs);
}
test();