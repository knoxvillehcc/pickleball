const http = require('http');

async function queryOdoo(method, params) {
  const creds = require('./credentials.json');
  const payload = { jsonrpc: '2.0', method: 'call', params };
  const res = await fetch(creds.url.replace(/\/$/, '') + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || 'RPC failed');
  return data.result;
}

async function test() {
  try {
    const creds = require('./credentials.json');
    
    // Auth
    const uid = await queryOdoo('call', {
      service: 'common', method: 'authenticate',
      args: [creds.db, creds.username, creds.password, {}]
    });
    console.log("UID:", uid);
    
    // Find banner products
    const products = await queryOdoo('call', {
      service: 'object', method: 'execute_kw',
      args: [creds.db, uid, creds.password, 'product.product', 'search_read',
        [[['name', 'ilike', 'banner']]],
        { fields: ['id', 'name', 'display_name'], limit: 20 }
      ]
    });
    console.log("Banner products:", JSON.stringify(products, null, 2));
  } catch(e) {
    console.error("Error:", e.message);
  }
}
test();