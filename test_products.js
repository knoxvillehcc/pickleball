const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const sessionId = await odooAuth(creds);

  const products = await odooCall(creds, sessionId, 'product.product', 'search_read', [
    ['&', ['recurring_invoice', '=', true], '|', ['name', 'ilike', 'trustee'], '|', ['name', 'ilike', 'sports'], '|', ['name', 'ilike', 'pioneer'], ['name', 'ilike', 'general']]
  ], { fields: ['id', 'name', 'recurring_invoice'] });
  
  console.log("Matching Products:");
  products.forEach(p => console.log(`ID: ${p.id}, Name: "${p.name}", Recurring: ${p.recurring_invoice}`));

  const pIds = products.map(p => p.id);

  const posLines = await odooCall(creds, sessionId, 'pos.order.line', 'search_read', [
    [['product_id', 'in', pIds]]
  ], { fields: ['order_id', 'product_id'] });

  const counts = {};
  for(const l of posLines) {
     const pName = l.product_id[1];
     counts[pName] = (counts[pName] || 0) + 1;
  }
  
  console.log("\nPOS Line Counts by Product:");
  console.table(counts);
}
test();