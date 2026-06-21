const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  try {
    const newOrderId = 557; 
    console.log("Testing direct _create_invoices on SO:", newOrderId);
    
    const invoiceIds = await odooCall(creds, uid, 'sale.order', '_create_invoices', [[newOrderId]]);
    console.log("Invoice created successfully:", invoiceIds);
  } catch(e) {
    console.error("Failed:", e.message);
  }
}
test();