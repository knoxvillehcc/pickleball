const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function fixMarkers() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  // Find all Credit Notes created today that are reversals
  const today = new Date().toISOString().split('T')[0];
  const creditNotes = await odooCall(creds, uid, 'account.move', 'search_read', [
    [['move_type', '=', 'out_refund'], ['create_date', '>=', today + ' 00:00:00']]
  ], { fields: ['id', 'name', 'reversed_entry_id'] });
  
  console.log(`Found ${creditNotes.length} credit notes created today.`);
  
  // Find which ones belong to our script (they reverse a POS invoice)
  let fixedCount = 0;
  for (const cn of creditNotes) {
     if (cn.reversed_entry_id) {
        const originalInvoiceId = cn.reversed_entry_id[0];
        // Check if it already has the marker
        const messages = await odooCall(creds, uid, 'mail.message', 'search_read', [
          [['res_id', '=', originalInvoiceId], ['model', '=', 'account.move'], ['body', 'ilike', 'transfer from pos order']]
        ], { limit: 1 });
        
        if (messages.length === 0) {
           console.log(`Adding marker to original invoice ${originalInvoiceId} (Reversed by ${cn.name})`);
           await odooCall(creds, uid, 'mail.message', 'create', [{
               model: 'account.move', res_id: originalInvoiceId, 
               body: 'transfer from pos order to a correct flow by HP', 
               message_type: 'comment'
           }]);
           fixedCount++;
        }
     }
  }
  console.log(`Fixed ${fixedCount} markers!`);
}
fixMarkers();