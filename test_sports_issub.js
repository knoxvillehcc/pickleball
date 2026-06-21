const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const activeSubs = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['state', 'in', ['sale', 'done']], ['product_id', '=', 15]]
  ], { fields: ['order_id'] });
  
  const orderIds = [...new Set(activeSubs.map(s => s.order_id[0]))];
  
  const orders = await odooCall(creds, uid, 'sale.order', 'search_read', [
    [['id', 'in', orderIds]]
  ], { fields: ['name', 'is_subscription'] });
  
  let trueCount = 0;
  let falseCount = 0;
  
  for(const o of orders) {
     if(o.is_subscription) trueCount++;
     else falseCount++;
  }
  
  console.log(`Active Sports SOs: ${orders.length}`);
  console.log(`is_subscription=true: ${trueCount}`);
  console.log(`is_subscription=false: ${falseCount}`);
}
test();