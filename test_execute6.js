const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Use a different record or just try to create a dummy sale.order
  const record = {
    dbId: 11,
    partnerId: 126,
    productId: 12,
    invoiceDate: '2026-02-07',
    amount: 301
  };
  
  try {
    console.log("Attempting to create Subscription Sale Order...");
    const newOrderId = await odooCall(creds, uid, 'sale.order', 'create', [{
        partner_id: record.partnerId,
        date_order: record.invoiceDate,
        is_subscription: true,
        order_line: [
            [0, 0, {
                product_id: record.productId,
                product_uom_qty: 1, 
                price_unit: record.amount
            }]
        ]
    }]);
    
    console.log("Successfully created SO:", newOrderId);
  } catch(e) {
    console.error("Failed:", e.message);
  }
}
test();