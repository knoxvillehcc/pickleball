async function test() {
  const url = "https://knoxvillemandir.odoo.com/web/database/list";
  const payload = { jsonrpc: '2.0', method: 'call', params: {} };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log("DB List Response:", text);
  } catch(e) {
    console.error(e);
  }
}
test();