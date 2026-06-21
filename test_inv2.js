async function queryOdoo(params) {
  const creds = require('./credentials.json');
  const res = await fetch(creds.url.replace(/\/$/, '') + '/jsonrpc', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message);
  return data.result;
}

async function test() {
  const creds = require('./credentials.json');
  const uid = await queryOdoo({ service:'common', method:'authenticate', args:[creds.db, creds.username, creds.password, {}] });

  // Get ALL invoices with banner products (not just paid)
  const invLines = await queryOdoo({
    service:'object', method:'execute_kw',
    args: [creds.db, uid, creds.password, 'account.move.line', 'search_read',
      [[['product_id', 'in', [83, 84]], ['move_id.move_type', '=', 'out_invoice']]],
      { fields: ['move_id', 'product_id', 'quantity', 'price_total'], limit: 50 }
    ]
  });
  
  const moveIds = [...new Set(invLines.map(l => l.move_id[0]))];
  const invoices = await queryOdoo({
    service:'object', method:'execute_kw',
    args: [creds.db, uid, creds.password, 'account.move', 'search_read',
      [[['id', 'in', moveIds]]],
      { fields: ['name', 'partner_id', 'invoice_date', 'payment_state', 'amount_total', 'invoice_user_id'] }
    ]
  });
  
  console.log("Total invoices with banner:", invoices.length);
  invoices.forEach(inv => {
    console.log(`${inv.name} | ${inv.partner_id?.[1]} | ${inv.invoice_date} | ${inv.payment_state} | $${inv.amount_total}`);
  });
}
test();