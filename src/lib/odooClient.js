import fs from 'fs/promises';
import path from 'path';
import { decrypt } from './encryption';

const credFilePath = path.join(process.cwd(), 'credentials.json');

export async function getCredentials() {
  // 1. Try to fetch from Supabase pickleball_settings first (cloud persistence)
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/pickleball_settings?key=eq.odoo_creds&select=value&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey':         SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const decrypted = decrypt(rows[0].value);
          if (decrypted) {
            return JSON.parse(decrypted);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[getCredentials] Failed to load from Supabase settings:', err.message);
  }

  // 2. Fall back to local credentials.json file (local development fallback)
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