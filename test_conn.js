async function test() {
  const creds = require('./credentials.json');
  console.log("URL:", creds.url, "DB:", creds.db, "User:", creds.username);
  
  // Test raw auth
  const payload = {
    jsonrpc: '2.0', method: 'call',
    params: { service: 'common', method: 'authenticate', args: [creds.db, creds.username, creds.password, {}] }
  };
  const res = await fetch(creds.url.replace(/\/$/, '') + '/jsonrpc', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const text = await res.text();
  console.log("Auth response (first 300 chars):", text.substring(0, 300));
}
test();