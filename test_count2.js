const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const genCount = await odooCall(creds, uid, 'sale.order.line', 'search_count', [
    [['product_id.name', 'ilike', 'general']]
  ]);
  
  const pioneerCount = await odooCall(creds, uid, 'sale.order.line', 'search_count', [
    [['product_id.name', 'ilike', 'pioneer']]
  ]);

  console.log("Direct search_count on sale.order.line:");
  console.log("General:", genCount);
  console.log("Pioneer:", pioneerCount);
}
test();