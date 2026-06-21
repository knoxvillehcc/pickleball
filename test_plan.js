const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Fetch a valid subscription
  const subs = await odooCall(creds, uid, 'sale.order', 'search_read', [
    [['state', 'in', ['sale', 'done']], ['is_subscription', '=', true]]
  ], { limit: 1 });
  
  if(subs.length > 0) {
    const sub = subs[0];
    console.log("Found Subscription ID:", sub.id);
    
    // Look for fields with "plan" in their name
    const keys = Object.keys(sub).filter(k => k.includes('plan'));
    console.log("Fields containing 'plan':", keys);
    keys.forEach(k => console.log(k, "=", sub[k]));
  }
}
test();