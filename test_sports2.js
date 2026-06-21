const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const pId = 15; // Sports Membership
  
  // Fetch POS lines for Sports
  const posLines = await odooCall(creds, uid, 'pos.order.line', 'search_read', [
    [['product_id', '=', pId]]
  ], { fields: ['order_id', 'product_id'] });
  
  console.log(`Found ${posLines.length} POS lines for Sports Membership.`);
  
  const orderIds = [...new Set(posLines.map(l => l.order_id[0]))];
  const orders = await odooCall(creds, uid, 'pos.order', 'search_read', [
      [['id', 'in', orderIds]]
  ], { fields: ['partner_id'] });
  
  // Fetch Active Subscriptions for Sports
  const activeSubs = await odooCall(creds, uid, 'sale.order.line', 'search_read', [
      [['state', 'in', ['sale', 'done']], ['is_subscription', '=', true], ['product_id', '=', pId]]
  ], { fields: ['order_partner_id', 'product_id'] });
  
  console.log(`Found ${activeSubs.length} Active Subscriptions for Sports Membership.`);
  
  let wouldFix = 0;
  let skipped = 0;
  
  for (const order of orders) {
      if(!order.partner_id) {
          skipped++; continue;
      }
      const hasSub = activeSubs.some(sub => sub.order_partner_id[0] === order.partner_id[0]);
      if (hasSub) {
          skipped++;
      } else {
          wouldFix++;
      }
  }
  
  console.log(`Would Fix: ${wouldFix}, Skipped: ${skipped}`);
}
test();