import fs from 'fs/promises';
import path from 'path';

const credFilePath = path.join(process.cwd(), 'credentials.json');

export async function getCredentials() {
  try {
    const data = await fs.readFile(credFilePath, 'utf8');
    return JSON.parse(data);
  } catch(e) {
    throw new Error('Credentials not found. Please configure settings first.');
  }
}

// Authenticates via the External API and returns the user ID (uid)
export async function odooAuth(creds) {
  const { url, db, username, password } = creds;
  const callUrl = url.replace(/\/$/, '') + '/jsonrpc';
  
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'common',
      method: 'authenticate',
      args: [db, username, password, {}]
    }
  };

  const res = await fetch(callUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Odoo server returned HTTP status ${res.status}. Please verify your Odoo instance is online.`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Odoo returned HTML/text instead of JSON. The database URL "${url}" or database name "${db}" might be incorrect or expired.`);
  }

  const data = await res.json();
  
  if (data.error) throw new Error(data.error.data?.message || 'Authentication failed');
  if (data.result === false) throw new Error('Access Denied: Invalid Username or API Key');
  if (!data.result) throw new Error('Authentication failed to return a valid User ID');
  
  // result is the uid (integer)
  return data.result;
}

// Executes an RPC method via the External API
export async function odooCall(creds, uid, model, method, args, kwargs = {}) {
  const { url, db, password } = creds;
  const callUrl = url.replace(/\/$/, '') + '/jsonrpc';
  
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'object',
      method: 'execute_kw',
      args: [db, uid, password, model, method, args, kwargs]
    }
  };

  const res = await fetch(callUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Odoo call failed with HTTP status ${res.status}.`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Odoo returned HTML/text instead of JSON during data fetch.');
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || 'Odoo RPC Call failed');
  
  return data.result;
}