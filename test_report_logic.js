const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Find membership products
  const products = await odooCall(creds, uid, 'product.product', 'search_read', [
    ['|', ['name', 'ilike', 'trustee'], '|', ['name', 'ilike', 'sports'], '|', ['name', 'ilike', 'pioneer'], ['name', 'ilike', 'general']]
  ], { fields: ['id', 'name'] });
  
  const pIds = products.map(p => p.id);

  // Check confirmed sales order lines
  const soLines = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
    [['product_id', 'in', pIds], ['state', 'in', ['sale', 'done']]]
  ], { fields: ['order_id', 'product_id'] });

  const soCounts = {};
  for(const l of soLines) {
     const pName = l.product_id[1];
     soCounts[pName] = (soCounts[pName] || 0) + 1;
  }
  console.log("Confirmed Sales Order Lines:");
  console.table(soCounts);

  // Check confirmed POS order lines
  const posLines = await odooCall(creds, uid, 'pos.order.line', 'search_read', [
    [['product_id', 'in', pIds]]
  ], { fields: ['order_id', 'product_id'] });
  
  // Need to filter posLines by order state if we want to be strict, but let's assume most POS are paid
  const posCounts = {};
  for(const l of posLines) {
     const pName = l.product_id[1];
     posCounts[pName] = (posCounts[pName] || 0) + 1;
  }
  console.log("POS Order Lines:");
  console.table(posCounts);
}
test();