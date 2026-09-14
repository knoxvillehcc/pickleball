const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = '8bc4a6a38ebbb420fde5e960d8077dec1e655304ab4f7b0c9cb2f014c77d80f1630927876711e8cb11a2224fa56051b27725d191721084fb7ed4200f9670b8db';

async function loadCreds() {
  const SUPABASE_URL = 'https://wkyzejotrcraluextvpc.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreXplam90cmNyYWx1ZXh0dnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk5ODU1MywiZXhwIjoyMDk3NTc0NTUzfQ.VMMXPaH5fb4x5H5YEPsNT9_ekxA1dKLFK8nHyQDjE-A';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pickleball_settings?key=eq.odoo_creds&select=value&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const rows = await res.json();
  const text = rows[0].value;
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const enc = Buffer.from(parts.join(':'), 'hex');
  const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let d = decipher.update(enc, 'hex', 'utf8');
  d += decipher.final('utf8');
  return JSON.parse(d);
}

async function main() {
  const c = await loadCreds();
  const url = c.url.replace(/\/$/, '') + '/jsonrpc';

  // Auth
  const authRes = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service: 'common', method: 'authenticate', args: [c.db, c.username, c.password, {}] } })
  });
  const uid = (await authRes.json()).result;
  console.log('uid:', uid);

  async function getFields(model) {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service: 'object', method: 'execute_kw', args: [c.db, uid, c.password, model, 'fields_get', [], { attributes: ['string', 'type', 'relation'] }] } })
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.data?.message || 'fields_get failed');
    return d.result;
  }

  async function searchCount(model, domain = []) {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service: 'object', method: 'execute_kw', args: [c.db, uid, c.password, model, 'search_count', [domain]] } })
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.data?.message);
    return d.result;
  }

  // Check subscription-related models
  const subModels = [
    'sale.subscription',
    'sale.order',
    'sale.order.line',
    'sale.subscription.plan',
    'sale.subscription.pricing',
    'sale.subscription.alert',
    'sale.subscription.log',
    'sale.subscription.close.reason'
  ];

  for (const model of subModels) {
    try {
      const fields = await getFields(model);
      const fieldNames = Object.keys(fields).sort();
      const count = await searchCount(model);
      console.log(`\n=== ${model} (${fieldNames.length} fields, ${count} records) ===`);
      console.log(fieldNames.join(', '));
    } catch (e) {
      console.log(`\n=== ${model} === NOT FOUND: ${e.message}`);
    }
  }

  // Also check if sale.order has subscription fields
  try {
    const fields = await getFields('sale.order');
    const subFields = Object.keys(fields).filter(f =>
      f.includes('subscri') || f.includes('recur') || f.includes('plan') || f.includes('renewal')
    );
    console.log('\n=== sale.order subscription-related fields ===');
    console.log(subFields.join(', '));

    // Count subscription orders
    const subCount = await searchCount('sale.order', [['is_subscription', '=', true]]);
    console.log(`\nSubscription orders count: ${subCount}`);
  } catch (e) {
    console.log('sale.order sub fields error:', e.message);
  }
}

main().catch(e => console.error(e));
