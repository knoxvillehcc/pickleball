const creds = {
  url: "https://knoxvillemandir.odoo.com",
  db: "knoxvillemandir",
  username: "knoxvillehcc@gmail.com",
  password: "298ed0f3315f78cc107e39c4581ad88eb6012c1b"
};

async function test() {
  const url = creds.url + '/jsonrpc';
  
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'common',
      method: 'authenticate',
      args: [creds.db, creds.username, creds.password, {}]
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log("Common Auth Response:", text);
  } catch (e) {
    console.error(e);
  }
}

test();