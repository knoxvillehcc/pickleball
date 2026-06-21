const creds = {
  url: "https://knoxvillemandir.odoo.com",
  db: "knoxvillemandir",
  username: "knoxvillehcc@gmail.com",
  password: "298ed0f3315f78cc107e39c4581ad88eb6012c1b"
};

async function test() {
  const authUrl = creds.url + '/web/session/authenticate';
  console.log("Sending POST to:", authUrl);
  
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      db: creds.db,
      login: creds.username,
      password: creds.password
    }
  };

  try {
    const res = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response Text:", text);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

test();