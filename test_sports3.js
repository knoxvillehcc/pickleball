const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Sports Membership is product ID 65
  const activeSubs = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['state', 'in', ['sale', 'done']], ['order_id.is_subscription', '=', true], ['product_id', '=', 65]]
  ], { fields: ['id', 'order_id'] });
  
  console.log(`Active Subscriptions for Product 65: ${activeSubs.length}`);
}
test();