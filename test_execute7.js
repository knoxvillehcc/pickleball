const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  try {
    const newOrderId = 557; // The one we just created
    console.log("Attempting to confirm Subscription Sale Order...");
    await odooCall(creds, uid, 'sale.order', 'action_confirm', [[newOrderId]]);
    console.log("Successfully confirmed SO:", newOrderId);
  } catch(e) {
    console.error("Failed:", e.message);
  }
}
test();