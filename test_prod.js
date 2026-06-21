const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');
async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);
  const p = await odooCall(creds, uid, 'product.product', 'read', [[12]], { fields: ['name', 'invoice_policy'] });
  console.log(p);
}
test();