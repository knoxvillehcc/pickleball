const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const products = await odooCall(creds, uid, 'product.product', 'search_read', [
    ['active', 'in', [true, false]],
    '|', ['name', 'ilike', 'trustee'], '|', ['name', 'ilike', 'sports'], '|', ['name', 'ilike', 'pioneer'], ['name', 'ilike', 'general']
  ], { fields: ['id', 'name', 'active'] });
  
  const pIds = products.map(p => p.id);

  const posLines = await odooCall(creds, uid, 'pos.order.line', 'search_read', [
    [['product_id', 'in', pIds]]
  ], { fields: ['order_id', 'product_id'] });

  const counts = {};
  for(const l of posLines) {
     const pName = l.product_id[1];
     counts[pName] = (counts[pName] || 0) + 1;
  }
  
  console.log("POS Line Counts including ARCHIVED products:");
  console.table(counts);
}
test();