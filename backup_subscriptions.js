/**
 * Odoo Subscription Backup — 9/9/26
 * Saves to: backup 9-9-26/ folder
 * READ-ONLY — does NOT modify any data
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JWT_SECRET = '8bc4a6a38ebbb420fde5e960d8077dec1e655304ab4f7b0c9cb2f014c77d80f1630927876711e8cb11a2224fa56051b27725d191721084fb7ed4200f9670b8db';
const BACKUP_DIR = path.join(__dirname, 'backup 9-9-26');

async function loadCredentials() {
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

let creds, JSONRPC_URL;

async function odooAuth() {
  const res = await fetch(JSONRPC_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service: 'common', method: 'authenticate', args: [creds.db, creds.username, creds.password, {}] } })
  });
  const data = await res.json();
  if (!data.result) throw new Error('Auth failed');
  return data.result;
}

async function odooCall(uid, model, method, args, kwargs = {}) {
  const res = await fetch(JSONRPC_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service: 'object', method: 'execute_kw', args: [creds.db, uid, creds.password, model, method, args, kwargs] } })
  });
  const data = await res.json();
  if (data.error) throw new Error(`[${model}] ${data.error.data?.message || 'RPC error'}`);
  return data.result;
}

async function fetchAll(uid, model, domain, fields, batchSize = 200) {
  let offset = 0, all = [];
  while (true) {
    const batch = await odooCall(uid, model, 'search_read', [domain], { fields, limit: batchSize, offset });
    if (!batch || batch.length === 0) break;
    all = all.concat(batch);
    console.log(`    ... fetched ${all.length} ${model} records`);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }
  return all;
}

function saveJSON(filename, data) {
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  ✅ Saved ${filename} (${data.length} records)\n`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SUBSCRIPTION BACKUP — READ ONLY');
  console.log('═══════════════════════════════════════════════════════\n');

  creds = await loadCredentials();
  JSONRPC_URL = creds.url.replace(/\/$/, '') + '/jsonrpc';
  const uid = await odooAuth();
  console.log(`✅ Authenticated as uid=${uid}\n`);

  // 1. Subscription Plans
  console.log('📋 Backing up Subscription Plans (sale.subscription.plan)...');
  try {
    const plans = await fetchAll(uid, 'sale.subscription.plan', [], [
      'id', 'name', 'active',
      'billing_period_unit', 'billing_period_value', 'billing_period_display',
      'billing_first_day', 'auto_close_limit',
      'user_closable', 'user_extend', 'user_quantity',
      'sequence', 'active_subs_count',
      'create_date', 'write_date'
    ]);
    saveJSON('subscription_plans.json', plans);
  } catch (e) {
    console.error('  ❌ Plans:', e.message);
  }

  // 2. Subscription Orders (sale.order where is_subscription = true)
  console.log('📋 Backing up Subscription Orders...');
  const subs = await fetchAll(uid, 'sale.order', [['is_subscription', '=', true]], [
    'id', 'name', 'display_name',
    'partner_id', 'partner_invoice_id', 'partner_shipping_id',
    'date_order', 'start_date', 'end_date', 'next_invoice_date',
    'subscription_state', 'plan_id',
    'recurring_monthly', 'recurring_total', 'non_recurring_total',
    'amount_untaxed', 'amount_tax', 'amount_total',
    'amount_invoiced', 'amount_paid', 'amount_unpaid',
    'order_line',
    'state', 'subscription_id', 'subscription_child_ids',
    'close_reason_id',
    'payment_term_id', 'pricelist_id',
    'team_id', 'user_id',
    'client_order_ref', 'note', 'internal_note',
    'first_contract_date', 'last_invoice_date',
    'renewal_count', 'invoice_count', 'invoice_ids',
    'tag_ids', 'origin',
    'create_date', 'write_date'
  ]);
  saveJSON('subscriptions.json', subs);

  // 3. Subscription Order Lines
  console.log('📋 Backing up Subscription Order Lines...');
  const subIds = subs.map(s => s.id);
  const lines = await fetchAll(uid, 'sale.order.line', [['order_id', 'in', subIds]], [
    'id', 'order_id', 'name',
    'product_id', 'product_template_id', 'product_uom_id',
    'product_uom_qty', 'price_unit', 'discount',
    'price_subtotal', 'price_tax', 'price_total',
    'qty_delivered', 'qty_invoiced', 'qty_to_invoice',
    'recurring_invoice', 'recurring_monthly',
    'subscription_start_date', 'subscription_end_date',
    'subscription_plan_id',
    'tax_ids',
    'state', 'invoice_status',
    'create_date', 'write_date'
  ]);
  saveJSON('subscription_lines.json', lines);

  // 4. Also backup ALL sale orders (not just subscriptions) for completeness
  console.log('📋 Backing up ALL Sale Orders...');
  const allOrders = await fetchAll(uid, 'sale.order', [], [
    'id', 'name', 'partner_id', 'date_order',
    'state', 'subscription_state', 'is_subscription',
    'amount_untaxed', 'amount_tax', 'amount_total',
    'amount_invoiced', 'amount_paid',
    'plan_id', 'recurring_monthly', 'recurring_total',
    'start_date', 'end_date', 'next_invoice_date',
    'order_line', 'invoice_ids',
    'payment_term_id', 'pricelist_id',
    'user_id', 'team_id',
    'create_date', 'write_date'
  ]);
  saveJSON('all_sale_orders.json', allOrders);

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SUBSCRIPTION BACKUP COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  📋 Subscription Orders: ${subs.length}`);
  console.log(`  📋 Subscription Lines:  ${lines.length}`);
  console.log(`  📋 All Sale Orders:     ${allOrders.length}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('💥 FAILED:', err.message);
  process.exit(1);
});
