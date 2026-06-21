const { getCredentials, odooAuth, odooCall } = require('./src/lib/odooClient.js');

async function test() {
  const creds = await getCredentials();
  const uid = await odooAuth(creds);

  const record = {
    dbId: 11,
    invoiceId: 1277,
    partnerId: 126,
    productId: 12,
    invoiceDate: '2026-02-07',
    amount: 301
  };
  
  try {
    console.log("Step 1: Create Reversal Wizard without date_mode and journal_id...");
    const reverseMoves = await odooCall(creds, uid, 'account.move.reversal', 'create', [{
      move_ids: [record.invoiceId],
      reason: 'Correcting POS flow to Subscription flow',
      date: record.invoiceDate,
    }]);
    
    console.log("Step 2: Execute Reversal...", reverseMoves);
    await odooCall(creds, uid, 'account.move.reversal', 'reverse_moves', [[reverseMoves]]);
    
    console.log("Reversal successful! Checking for credit notes...");
    const creditNotes = await odooCall(creds, uid, 'account.move', 'search_read', [
        [['reversed_entry_id', '=', record.invoiceId], ['move_type', '=', 'out_refund']]
    ], { fields: ['id', 'name'], limit: 1 });
    console.log("Credit Notes found:", creditNotes);

    console.log("Stopping test successfully.");
  } catch(e) {
    console.error("Failed at some step:", e.message);
  }
}
test();