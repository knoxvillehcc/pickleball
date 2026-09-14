/**
 * Odoo Full Backup Script — 9/9/26
 * 
 * Backs up: Contacts, Products, Product Categories, Chart of Accounts, Events
 * Saves to: backup 9-9-26/ folder in the project root
 * 
 * Compatible with Odoo 19.0 Enterprise
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JWT_SECRET = '8bc4a6a38ebbb420fde5e960d8077dec1e655304ab4f7b0c9cb2f014c77d80f1630927876711e8cb11a2224fa56051b27725d191721084fb7ed4200f9670b8db';

async function loadCredentials() {
  const SUPABASE_URL = 'https://wkyzejotrcraluextvpc.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreXplam90cmNyYWx1ZXh0dnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk5ODU1MywiZXhwIjoyMDk3NTc0NTUzfQ.VMMXPaH5fb4x5H5YEPsNT9_ekxA1dKLFK8nHyQDjE-A';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pickleball_settings?key=eq.odoo_creds&select=value&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const rows = await res.json();
  if (!rows || !rows.length) throw new Error('No credentials found in Supabase');
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
const BACKUP_DIR = path.join(__dirname, 'backup 9-9-26');

// ─── Odoo JSON-RPC helpers ──────────────────────────────────────────────────

async function odooAuth() {
  const payload = {
    jsonrpc: '2.0', method: 'call',
    params: { service: 'common', method: 'authenticate', args: [creds.db, creds.username, creds.password, {}] }
  };
  const res = await fetch(JSONRPC_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || 'Auth failed');
  if (!data.result) throw new Error('Auth returned false — check credentials');
  return data.result;
}

async function odooCall(uid, model, method, args, kwargs = {}) {
  const payload = {
    jsonrpc: '2.0', method: 'call',
    params: { service: 'object', method: 'execute_kw', args: [creds.db, uid, creds.password, model, method, args, kwargs] }
  };
  const res = await fetch(JSONRPC_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(`[${model}] ${data.error.data?.message || 'RPC error'}`);
  return data.result;
}

async function fetchAll(uid, model, domain, fields, batchSize = 200) {
  let offset = 0;
  let allRecords = [];
  while (true) {
    const batch = await odooCall(uid, model, 'search_read', [domain], { fields, limit: batchSize, offset });
    if (!batch || batch.length === 0) break;
    allRecords = allRecords.concat(batch);
    console.log(`    ... fetched ${allRecords.length} ${model} records`);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }
  return allRecords;
}

function saveJSON(filename, data) {
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  ✅ Saved ${filename} (${data.length} records)\n`);
}

// ─── Backup Functions (Odoo 19.0 Enterprise compatible) ─────────────────────

async function backupContacts(uid) {
  console.log('📇 Backing up Contacts (res.partner)...');
  const contacts = await fetchAll(uid, 'res.partner', [['active', 'in', [true, false]]], [
    'id', 'name', 'display_name', 'is_company', 'type', 'parent_id',
    'street', 'street2', 'city', 'state_id', 'zip', 'country_id',
    'email', 'phone', 'website',
    'vat', 'company_name', 'function',
    'category_id', 'comment', 'lang',
    'customer_rank', 'supplier_rank',
    'active', 'create_date', 'write_date',
    'property_account_receivable_id', 'property_account_payable_id',
    'ref', 'barcode', 'image_1920',
    'child_ids', 'bank_ids', 'commercial_partner_id'
  ]);
  saveJSON('contacts.json', contacts);
  return contacts.length;
}

async function backupProducts(uid) {
  console.log('📦 Backing up Products (product.template)...');
  const templates = await fetchAll(uid, 'product.template', [['active', 'in', [true, false]]], [
    'id', 'name', 'display_name', 'default_code', 'barcode',
    'type', 'categ_id', 'list_price', 'standard_price',
    'sale_ok', 'purchase_ok', 'active',
    'description', 'description_sale',
    'uom_id', 'taxes_id', 'supplier_taxes_id',
    'image_1920', 'website_published',
    'product_variant_ids', 'product_variant_count',
    'attribute_line_ids',
    'create_date', 'write_date'
  ]);
  saveJSON('products_templates.json', templates);

  console.log('📦 Backing up Product Variants (product.product)...');
  const variants = await fetchAll(uid, 'product.product', [['active', 'in', [true, false]]], [
    'id', 'name', 'display_name', 'default_code', 'barcode',
    'product_tmpl_id', 'list_price', 'standard_price',
    'active', 'type', 'categ_id', 'code',
    'create_date', 'write_date'
  ]);
  saveJSON('products_variants.json', variants);

  console.log('📦 Backing up Product Attributes...');
  try {
    const attrs = await fetchAll(uid, 'product.attribute', [], [
      'id', 'name', 'display_type', 'create_variant', 'value_ids'
    ]);
    saveJSON('product_attributes.json', attrs);
    const vals = await fetchAll(uid, 'product.attribute.value', [], [
      'id', 'name', 'attribute_id', 'sequence', 'is_custom', 'html_color'
    ]);
    saveJSON('product_attribute_values.json', vals);
  } catch (e) {
    console.log('  ⚠️  Product attributes:', e.message);
  }

  return templates.length;
}

async function backupProductCategories(uid) {
  console.log('🏷️  Backing up Product Categories (product.category)...');
  const categories = await fetchAll(uid, 'product.category', [], [
    'id', 'name', 'complete_name', 'parent_id', 'child_id',
    'parent_path', 'product_count',
    'property_account_income_categ_id', 'property_account_expense_categ_id',
    'create_date', 'write_date'
  ]);
  saveJSON('product_categories.json', categories);
  return categories.length;
}

async function backupChartOfAccounts(uid) {
  console.log('📊 Backing up Chart of Accounts (account.account)...');
  const accounts = await fetchAll(uid, 'account.account', [], [
    'id', 'name', 'code', 'account_type',
    'reconcile', 'active', 'description',
    'tax_ids', 'group_id', 'currency_id',
    'create_date', 'write_date'
  ]);
  saveJSON('chart_of_accounts.json', accounts);

  console.log('📊 Backing up Taxes (account.tax)...');
  const taxes = await fetchAll(uid, 'account.tax', [['active', 'in', [true, false]]], [
    'id', 'name', 'type_tax_use', 'amount_type', 'amount',
    'description', 'tax_group_id', 'active',
    'price_include', 'include_base_amount',
    'company_id', 'sequence',
    'invoice_repartition_line_ids', 'refund_repartition_line_ids'
  ]);
  saveJSON('taxes.json', taxes);

  console.log('📊 Backing up Journals (account.journal)...');
  const journals = await fetchAll(uid, 'account.journal', [], [
    'id', 'name', 'code', 'type',
    'default_account_id', 'suspense_account_id',
    'company_id', 'currency_id',
    'bank_account_id', 'sequence', 'active'
  ]);
  saveJSON('journals.json', journals);

  console.log('📊 Backing up Account Groups...');
  try {
    const groups = await fetchAll(uid, 'account.group', [], [
      'id', 'name', 'code_prefix_start', 'code_prefix_end', 'parent_id'
    ]);
    saveJSON('account_groups.json', groups);
  } catch (e) {
    console.log('  ⚠️  Account groups:', e.message);
  }

  console.log('📊 Backing up Fiscal Positions...');
  try {
    const fp = await fetchAll(uid, 'account.fiscal.position', [], [
      'id', 'name', 'auto_apply', 'country_id', 'country_group_id',
      'tax_ids', 'account_ids', 'note'
    ]);
    saveJSON('fiscal_positions.json', fp);
  } catch (e) {
    console.log('  ⚠️  Fiscal positions:', e.message);
  }

  return accounts.length;
}

async function backupEvents(uid) {
  console.log('🎉 Backing up Events (event.event)...');
  const events = await fetchAll(uid, 'event.event', [['active', 'in', [true, false]]], [
    'id', 'name', 'display_name',
    'event_type_id', 'tag_ids',
    'date_begin', 'date_end', 'date_tz',
    'address_id', 'organizer_id',
    'seats_max', 'seats_limited', 'seats_reserved',
    'seats_available', 'seats_used', 'seats_taken',
    'stage_id',
    'description', 'note',
    'website_published', 'website_url',
    'registration_ids', 'event_ticket_ids',
    'active', 'create_date', 'write_date'
  ]);
  saveJSON('events.json', events);

  console.log('🎉 Backing up Event Types...');
  try {
    const types = await fetchAll(uid, 'event.type', [], [
      'id', 'name', 'default_timezone',
      'seats_max', 'auto_confirm',
      'has_seats_limitation', 'note'
    ]);
    saveJSON('event_types.json', types);
  } catch (e) {
    console.log('  ⚠️  Event types:', e.message);
  }

  console.log('🎉 Backing up Event Tickets...');
  try {
    const tickets = await fetchAll(uid, 'event.event.ticket', [], [
      'id', 'name', 'event_id', 'event_type_id',
      'product_id', 'price', 'description',
      'seats_max', 'seats_reserved', 'seats_available', 'seats_used',
      'registration_ids'
    ]);
    saveJSON('event_tickets.json', tickets);
  } catch (e) {
    console.log('  ⚠️  Event tickets:', e.message);
  }

  console.log('🎉 Backing up Event Registrations...');
  try {
    const regs = await fetchAll(uid, 'event.registration', [['active', 'in', [true, false]]], [
      'id', 'event_id', 'event_ticket_id',
      'partner_id', 'name', 'email', 'phone',
      'state', 'date_closed', 'company_name',
      'sale_order_id', 'sale_order_line_id',
      'create_date', 'write_date'
    ]);
    saveJSON('event_registrations.json', regs);
  } catch (e) {
    console.log('  ⚠️  Event registrations:', e.message);
  }

  return events.length;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ODOO FULL BACKUP — knoxvillemandir.odoo.com');
  console.log('  Odoo 19.0 Enterprise');
  console.log('  Date: September 9, 2026');
  console.log(`  Backup folder: ${BACKUP_DIR}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory\n`);
  }

  console.log('🔑 Loading credentials...');
  creds = await loadCredentials();
  JSONRPC_URL = creds.url.replace(/\/$/, '') + '/jsonrpc';
  console.log(`  ✅ Loaded for ${creds.url}\n`);

  console.log('🔐 Authenticating...');
  const uid = await odooAuth();
  console.log(`  ✅ uid=${uid}\n`);

  const summary = {};

  for (const [key, fn] of [
    ['contacts', backupContacts],
    ['products', backupProducts],
    ['productCategories', backupProductCategories],
    ['chartOfAccounts', backupChartOfAccounts],
    ['events', backupEvents]
  ]) {
    try {
      summary[key] = await fn(uid);
    } catch (e) {
      console.error(`  ❌ ${key} failed:`, e.message);
      summary[key] = 'FAILED: ' + e.message;
    }
  }

  // Save summary
  const meta = {
    backupDate: new Date().toISOString(),
    odooVersion: '19.0 Enterprise',
    source: creds.url,
    database: creds.db,
    summary,
    files: fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json') && f !== 'backup_summary.json')
  };
  fs.writeFileSync(path.join(BACKUP_DIR, 'backup_summary.json'), JSON.stringify(meta, null, 2));

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  BACKUP COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  for (const [k, v] of Object.entries(summary)) {
    const icon = typeof v === 'number' ? '✅' : '❌';
    console.log(`  ${icon} ${k}: ${v}`);
  }
  console.log(`\n  📁 ${BACKUP_DIR}`);
  console.log(`  📄 ${meta.files.length} files saved`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n💥 BACKUP FAILED:', err.message);
  process.exit(1);
});
