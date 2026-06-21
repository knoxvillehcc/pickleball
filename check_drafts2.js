const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function checkDrafts() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const today = new Date().toISOString().split('T')[0];
  const drafts = await odooCall(creds, uid, 'sale.order', 'search_read', [
    [['state', 'in', ['draft', 'sent']], ['create_date', '>=', today + ' 00:00:00']]
  ], { fields: ['id', 'name', 'state', 'order_line'] });
  
  console.log(`Found ${drafts.length} Draft Quotations created today.`);
  
  if (drafts.length > 0) {
      console.log("Sample:", drafts[0]);
  }
}
checkDrafts();