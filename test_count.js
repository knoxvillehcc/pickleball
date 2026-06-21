const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const genCount = await odooCall(creds, uid, 'pos.order.line', 'search_count', [
    [['product_id.name', 'ilike', 'general']]
  ]);
  
  const pioneerCount = await odooCall(creds, uid, 'pos.order.line', 'search_count', [
    [['product_id.name', 'ilike', 'pioneer']]
  ]);

  const sportsCount = await odooCall(creds, uid, 'pos.order.line', 'search_count', [
    [['product_id.name', 'ilike', 'sports']]
  ]);

  const trusteeCount = await odooCall(creds, uid, 'pos.order.line', 'search_count', [
    [['product_id.name', 'ilike', 'trustee']]
  ]);

  console.log("Direct search_count via product_id.name:");
  console.log("General:", genCount);
  console.log("Pioneer:", pioneerCount);
  console.log("Sports:", sportsCount);
  console.log("Trustee:", trusteeCount);
}
test();