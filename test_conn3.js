async function test() {
  const db = "knoxsub";
  const username = "knoxvillehcc@gmail.com";
  const password = "022ccf11d653f68dc8a369c6b2b76964c96b6f31";
  
  const baseUrl = "https://am623a.odoo.com";
  
  const payload = {
    jsonrpc: '2.0', method: 'call',
    params: { service: 'common', method: 'authenticate', args: [db, username, password, {}] }
  };
  
  const res = await fetch(baseUrl + '/jsonrpc', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Host': 'knoxsub.odoo.com' }, body: JSON.stringify(payload)
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text.substring(0, 400));
}
test();