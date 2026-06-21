const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Fetch the products
  const products = await odooCall(creds, uid, 'product.product', 'search_read', [
    ['|', ['name', 'ilike', 'trustee'], '|', ['name', 'ilike', 'sports'], '|', ['name', 'ilike', 'pioneer'], ['name', 'ilike', 'general']]
  ], { limit: 5 });
  
  products.forEach(p => {
    const keys = Object.keys(p).filter(k => k.includes('plan'));
    console.log(`Product: ${p.name}`);
    keys.forEach(k => console.log(`  ${k} =`, p[k]));
  });
}
test();