const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Sports Membership is product ID 15
  const activeSubs = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['state', 'in', ['sale', 'done']], ['order_id.is_subscription', '=', true], ['product_id', '=', 15]]
  ], { fields: ['id', 'order_id'] });
  
  const draftSubs = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['state', 'in', ['draft', 'sent']], ['order_id.is_subscription', '=', true], ['product_id', '=', 15]]
  ], { fields: ['id', 'order_id'] });

  console.log(`Active Sports Subscriptions: ${activeSubs.length}`);
  console.log(`Draft Sports Subscriptions: ${draftSubs.length}`);
}
test();