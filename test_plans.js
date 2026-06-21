const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Fetch all subscription plans
  const plans = await odooCall(creds, uid, 'sale.subscription.plan', 'search_read', [], { fields: ['id', 'name'] });
  
  console.log("All Subscription Plans:");
  plans.forEach(p => console.log(`ID: ${p.id}, Name: ${p.name}`));
}
test();