async function queryOdoo(method, params) {
  const creds = require('./credentials.json');
  const payload = { jsonrpc: '2.0', method: 'call', params };
  const res = await fetch(creds.url.replace(/\/$/, '') + '/jsonrpc', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || 'RPC failed');
  return data.result;
}

async function test() {
  const creds = require('./credentials.json');
  const uid = await queryOdoo('call', { service:'common', method:'authenticate', args:[creds.db, creds.username, creds.password, {}] });
  
  // Find POS order lines for banner products (IDs 83 and 84)
  const lines = await queryOdoo('call', {
    service:'object', method:'execute_kw',
    args: [creds.db, uid, creds.password, 'pos.order.line', 'search_read',
      [[['product_id', 'in', [83, 84]]]],
      { fields: ['order_id', 'product_id', 'qty', 'price_unit', 'price_subtotal_incl'], limit: 10 }
    ]
  });
  
  console.log("Banner lines:", JSON.stringify(lines, null, 2));
  
  // Now get the order details to see what fields are available for payment info
  if (lines.length > 0) {
    const orderIds = lines.map(l => l.order_id[0]);
    const orders = await queryOdoo('call', {
      service:'object', method:'execute_kw',
      args: [creds.db, uid, creds.password, 'pos.order', 'search_read',
        [[['id', 'in', orderIds]]],
        { fields: ['name', 'partner_id', 'date_order', 'user_id', 'employee_id', 'amount_total', 'state', 'payment_ids'], limit: 10 }
      ]
    });
    console.log("\nSample orders:", JSON.stringify(orders.slice(0,3), null, 2));
  }
}
test();