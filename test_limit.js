const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const subscriptions = await odooCall(creds, uid, 'sale.order', 'search_read', [
      [['state', 'in', ['sale', 'done']], ['is_subscription', '=', true]]
  ], { fields: ['id'] });
  
  const orderIds = subscriptions.map(s => s.id);
  const orderLines = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
       [['order_id', 'in', orderIds]]
  ], { fields: ['order_id'] });
  
  console.log(`Subscriptions: ${subscriptions.length}`);
  console.log(`Order Lines: ${orderLines.length}`);
}
test();