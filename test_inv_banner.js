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

  // Find invoice lines for both banner products (83, 84)
  const invLines = await queryOdoo({
    service:'object', method:'execute_kw',
    args: [creds.db, uid, creds.password, 'account.move.line', 'search_read',
      [[['product_id', 'in', [83, 84]], ['move_id.move_type', '=', 'out_invoice'], ['move_id.state', '=', 'posted']]],
      { fields: ['move_id', 'product_id', 'quantity', 'price_subtotal', 'price_total'], limit: 20 }
    ]
  });
  
  console.log("Invoice lines count:", invLines.length);
  console.log("Sample:", JSON.stringify(invLines.slice(0,2), null, 2));

  // Now get parent invoices
  if (invLines.length > 0) {
    const moveIds = [...new Set(invLines.map(l => l.move_id[0]))];
    const invoices = await queryOdoo({
      service:'object', method:'execute_kw',
      args: [creds.db, uid, creds.password, 'account.move', 'search_read',
        [[['id', 'in', moveIds]]],
        { fields: ['name', 'partner_id', 'invoice_date', 'invoice_date_due', 'payment_state', 'amount_total', 'invoice_user_id', 'user_id'], limit: 5 }
      ]
    });
    console.log("\nSample invoices:", JSON.stringify(invoices.slice(0,3), null, 2));
  }
}
test();