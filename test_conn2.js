async function test() {
  const creds = require('./credentials.json');
  
  // Try with the correct hosting URL
  const urls = [
    "https://am623a.odoo.com",
    "https://knoxsub.odoo.com",
    creds.url.replace(/\/$/, '')
  ];
  
  for (const baseUrl of urls) {
    const payload = {
      jsonrpc: '2.0', method: 'call',
      params: { service: 'common', method: 'authenticate', args: [creds.db, creds.username, creds.password, {}] }
    };
    try {
      const res = await fetch(baseUrl + '/jsonrpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const text = await res.text();
      console.log(`URL: ${baseUrl} -> Status: ${res.status} -> Response (150): ${text.substring(0, 150)}`);
    } catch(e) {
      console.log(`URL: ${baseUrl} -> ERROR: ${e.message}`);
    }
  }
}
test();