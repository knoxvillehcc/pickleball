async function test() {
  const db = "knoxsub";
  const username = "knoxvillehcc@gmail.com";
  const password = "022ccf11d653f68dc8a369c6b2b76964c96b6f31";

  // Try alternate Odoo SaaS URLs 
  const urls = [
    "https://knoxsub.odoo.com",
    "https://knoxsub.odoo.sh",
  ];
  
  for (const u of urls) {
    try {
      const payload = { jsonrpc:'2.0', method:'call', params:{ service:'common', method:'version', args:[] } };
      const res = await fetch(u + '/jsonrpc', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      const text = await res.text();
      console.log(`${u}: status=${res.status} body(100)=${text.substring(0,100)}`);
    } catch(e) { console.log(`${u}: ERROR ${e.message}`); }
  }
}
test();