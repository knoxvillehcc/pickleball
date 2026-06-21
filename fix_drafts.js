const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function fixDrafts() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const today = new Date().toISOString().split('T')[0];
  // Fetch draft quotations created today
  const drafts = await odooCall(creds, uid, 'sale.order', 'search_read', [
    [['state', 'in', ['draft', 'sent']], ['create_date', '>=', today + ' 00:00:00']]
  ], { fields: ['id', 'name', 'order_line'] });
  
  console.log(`Found ${drafts.length} Draft Quotations to process.`);
  
  let fixedCount = 0;
  for (const draft of drafts) {
     if (!draft.order_line || draft.order_line.length === 0) continue;
     
     // Fetch the line to get the product
     const lines = await odooCall(creds, uid, 'sale.order.line', 'read', [[draft.order_line[0]]], { fields: ['product_id'] });
     if (lines.length === 0) continue;
     
     const prodName = (lines[0].product_id[1] || "").toLowerCase();
     
     // Assign plan based on product
     let planId = 5; // Default General
     if (prodName.includes('pioneer')) planId = 6;
     else if (prodName.includes('sport')) planId = 8;
     
     try {
         // Update the sale order with the plan_id
         await odooCall(creds, uid, 'sale.order', 'write', [[draft.id], { plan_id: planId }]);
         // Confirm it!
         await odooCall(creds, uid, 'sale.order', 'action_confirm', [[draft.id]]);
         console.log(`Confirmed SO ${draft.id} (${draft.name}) with plan ${planId}`);
         fixedCount++;
     } catch (e) {
         console.error(`Failed to confirm SO ${draft.id}:`, e.message);
     }
  }
  console.log(`Successfully activated ${fixedCount} subscriptions!`);
}
fixDrafts();