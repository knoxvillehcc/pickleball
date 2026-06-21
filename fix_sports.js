const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function fix() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Find the 2 draft sports subscriptions
  const draftSubs = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['state', 'in', ['draft', 'sent']], ['order_id.is_subscription', '=', true], ['product_id', '=', 15]]
  ], { fields: ['id', 'order_id'] });

  for (const line of draftSubs) {
      console.log("Confirming order:", line.order_id[0]);
      await odooCall(creds, uid, 'sale.order', 'write', [[line.order_id[0]], { plan_id: 8 }]);
      await odooCall(creds, uid, 'sale.order', 'action_confirm', [[line.order_id[0]]]);
  }
}
fix();