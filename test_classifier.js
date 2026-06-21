const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const sportsLines = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['state', 'in', ['sale', 'done']], ['order_id.is_subscription', '=', true], ['product_id', '=', 15]]
  ], { fields: ['order_id'] });
  
  const orderIds = sportsLines.map(l => l.order_id[0]);
  
  const orderLines = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
       [['order_id', 'in', orderIds]]
  ], { fields: ['order_id', 'product_id', 'price_subtotal'] });
  
  for(const oid of orderIds) {
      const lines = orderLines.filter(l => l.order_id[0] === oid);
      if(lines.length > 0) {
          console.log(`Order ${oid} classified as: ${lines[0].product_id[1]} (Has ${lines.length} lines)`);
      }
  }
}
test();