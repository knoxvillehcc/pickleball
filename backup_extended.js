/**
 * Odoo Extended Backup — 9/9/26
 * Backs up: Invoices, Payments, POS, Pricelists, Bank Statements,
 *           Company, Users, Analytic Accounts, Website, Email Templates, Attachments
 * 
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

async function getFieldNames(uid, model) {
  const fields = await odooCall(uid, model, 'fields_get', [], { attributes: ['string', 'type'] });
  return Object.keys(fields);
}

async function fetchAll(uid, model, domain, fields, batchSize = 200) {
  let offset = 0, all = [];
  while (true) {
    const batch = await odooCall(uid, model, 'search_read', [domain], { fields, limit: batchSize, offset });
    if (!batch || batch.length === 0) break;
    all = all.concat(batch);
    if (all.length % 1000 === 0 || batch.length < batchSize) {
      console.log(`    ... ${all.length} ${model} records`);
    }
    if (batch.length < batchSize) break;
    offset += batchSize;
  }
  if (all.length > 0 && all.length % 1000 !== 0) {
    console.log(`    ... ${all.length} ${model} records`);
  }
  return all;
}

function saveJSON(filename, data) {
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  const sizeMB = (Buffer.byteLength(JSON.stringify(data, null, 2)) / 1024 / 1024).toFixed(1);
  console.log(`  ✅ ${filename} — ${data.length} records (${sizeMB} MB)\n`);
}

// Helper: filter a requested field list to only fields that exist
async function safeFields(uid, model, requestedFields) {
  const available = await getFieldNames(uid, model);
  return requestedFields.filter(f => available.includes(f));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  EXTENDED ODOO BACKUP — READ ONLY');
  console.log('  knoxvillemandir.odoo.com (Odoo 19.0 Enterprise)');
  console.log('  September 9, 2026');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  creds = await loadCredentials();
  JSONRPC_URL = creds.url.replace(/\/$/, '') + '/jsonrpc';
  const uid = await odooAuth();
  console.log(`✅ Authenticated (uid=${uid})\n`);

  const results = {};

  // ═══════════════════════════════════════════════════════════════
  // 🔴 CRITICAL
  // ═══════════════════════════════════════════════════════════════

  // 1. Invoices & Journal Entries (account.move)
  console.log('🔴 CRITICAL: Invoices & Journal Entries (account.move)...');
  try {
    const fields = await safeFields(uid, 'account.move', [
      'id', 'name', 'display_name', 'move_type', 'date', 'invoice_date', 'invoice_date_due',
      'partner_id', 'journal_id', 'currency_id',
      'amount_untaxed', 'amount_tax', 'amount_total', 'amount_residual',
      'amount_untaxed_signed', 'amount_tax_signed', 'amount_total_signed', 'amount_residual_signed',
      'payment_state', 'invoice_payment_term_id',
      'ref', 'narration', 'invoice_origin',
      'fiscal_position_id', 'invoice_line_ids', 'line_ids',
      'reversed_entry_id', 'reversal_move_id',
      'state', 'auto_post',
      'create_date', 'write_date'
    ]);
    const moves = await fetchAll(uid, 'account.move', [], fields);
    saveJSON('account_moves.json', moves);
    results['account.move'] = moves.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['account.move'] = 'FAILED';
  }

  // 2. Journal Entry Lines (account.move.line)
  console.log('🔴 CRITICAL: Journal Entry Lines (account.move.line)...');
  try {
    const fields = await safeFields(uid, 'account.move.line', [
      'id', 'move_id', 'move_name', 'date',
      'account_id', 'journal_id', 'partner_id',
      'name', 'ref',
      'debit', 'credit', 'balance',
      'amount_currency', 'currency_id',
      'product_id', 'product_uom_id', 'quantity',
      'price_unit', 'price_subtotal', 'price_total',
      'discount',
      'tax_ids', 'tax_line_id', 'tax_tag_ids',
      'analytic_distribution',
      'reconciled', 'full_reconcile_id',
      'matching_number',
      'parent_state',
      'create_date', 'write_date'
    ]);
    const lines = await fetchAll(uid, 'account.move.line', [], fields);
    saveJSON('account_move_lines.json', lines);
    results['account.move.line'] = lines.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['account.move.line'] = 'FAILED';
  }

  // 3. Payments (account.payment)
  console.log('🔴 CRITICAL: Payments (account.payment)...');
  try {
    const fields = await safeFields(uid, 'account.payment', [
      'id', 'name', 'move_id',
      'payment_type', 'partner_type', 'partner_id',
      'amount', 'currency_id', 'date',
      'journal_id', 'payment_method_id', 'payment_method_line_id',
      'ref', 'memo',
      'destination_account_id',
      'is_reconciled', 'is_matched',
      'state',
      'create_date', 'write_date'
    ]);
    const payments = await fetchAll(uid, 'account.payment', [], fields);
    saveJSON('payments.json', payments);
    results['account.payment'] = payments.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['account.payment'] = 'FAILED';
  }

  // 4. POS Orders
  console.log('🔴 CRITICAL: POS Orders (pos.order)...');
  try {
    const fields = await safeFields(uid, 'pos.order', [
      'id', 'name', 'pos_reference', 'date_order',
      'partner_id', 'session_id', 'config_id',
      'amount_total', 'amount_tax', 'amount_paid', 'amount_return',
      'lines', 'payment_ids',
      'state', 'note',
      'pricelist_id', 'fiscal_position_id',
      'employee_id', 'user_id',
      'account_move',
      'create_date', 'write_date'
    ]);
    const orders = await fetchAll(uid, 'pos.order', [], fields);
    saveJSON('pos_orders.json', orders);
    results['pos.order'] = orders.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['pos.order'] = 'FAILED';
  }

  // 5. POS Order Lines
  console.log('🔴 CRITICAL: POS Order Lines (pos.order.line)...');
  try {
    const fields = await safeFields(uid, 'pos.order.line', [
      'id', 'order_id', 'product_id', 'product_uom_id',
      'name', 'full_product_name',
      'qty', 'price_unit', 'price_subtotal', 'price_subtotal_incl',
      'discount', 'tax_ids',
      'create_date', 'write_date'
    ]);
    const lines = await fetchAll(uid, 'pos.order.line', [], fields);
    saveJSON('pos_order_lines.json', lines);
    results['pos.order.line'] = lines.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['pos.order.line'] = 'FAILED';
  }

  // 6. POS Sessions
  console.log('🔴 CRITICAL: POS Sessions (pos.session)...');
  try {
    const fields = await safeFields(uid, 'pos.session', [
      'id', 'name', 'config_id', 'user_id',
      'start_at', 'stop_at',
      'state', 'cash_register_balance_start', 'cash_register_balance_end_real',
      'total_payments_amount', 'order_count',
      'create_date', 'write_date'
    ]);
    const sessions = await fetchAll(uid, 'pos.session', [], fields);
    saveJSON('pos_sessions.json', sessions);
    results['pos.session'] = sessions.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['pos.session'] = 'FAILED';
  }

  // 7. POS Payments
  console.log('🔴 CRITICAL: POS Payments (pos.payment)...');
  try {
    const fields = await safeFields(uid, 'pos.payment', [
      'id', 'name', 'pos_order_id', 'session_id',
      'amount', 'payment_date', 'payment_method_id',
      'card_type', 'transaction_id',
      'create_date', 'write_date'
    ]);
    const posPay = await fetchAll(uid, 'pos.payment', [], fields);
    saveJSON('pos_payments.json', posPay);
    results['pos.payment'] = posPay.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['pos.payment'] = 'FAILED';
  }

  // ═══════════════════════════════════════════════════════════════
  // 🟡 IMPORTANT
  // ═══════════════════════════════════════════════════════════════

  // 8. Pricelists
  console.log('🟡 IMPORTANT: Pricelists (product.pricelist)...');
  try {
    const fields = await safeFields(uid, 'product.pricelist', [
      'id', 'name', 'active', 'currency_id',
      'item_ids', 'sequence',
      'create_date', 'write_date'
    ]);
    const pricelists = await fetchAll(uid, 'product.pricelist', [], fields);
    saveJSON('pricelists.json', pricelists);
    results['product.pricelist'] = pricelists.length;

    // Pricelist items/rules
    const ruleFields = await safeFields(uid, 'product.pricelist.item', [
      'id', 'pricelist_id', 'product_tmpl_id', 'product_id', 'categ_id',
      'applied_on', 'compute_price', 'fixed_price', 'percent_price',
      'base', 'min_quantity', 'date_start', 'date_end',
      'create_date', 'write_date'
    ]);
    const rules = await fetchAll(uid, 'product.pricelist.item', [], ruleFields);
    saveJSON('pricelist_rules.json', rules);
  } catch (e) {
    console.error('  ❌', e.message);
    results['product.pricelist'] = 'FAILED';
  }

  // 9. Bank Statement Lines
  console.log('🟡 IMPORTANT: Bank Statement Lines...');
  try {
    const fields = await safeFields(uid, 'account.bank.statement.line', [
      'id', 'date', 'amount', 'payment_ref', 'partner_id',
      'journal_id', 'move_id',
      'statement_id', 'is_reconciled',
      'create_date', 'write_date'
    ]);
    const stmtLines = await fetchAll(uid, 'account.bank.statement.line', [], fields);
    saveJSON('bank_statement_lines.json', stmtLines);
    results['account.bank.statement.line'] = stmtLines.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['account.bank.statement.line'] = 'FAILED';
  }

  // 10. Company Settings
  console.log('🟡 IMPORTANT: Company (res.company)...');
  try {
    const fields = await safeFields(uid, 'res.company', [
      'id', 'name', 'street', 'street2', 'city', 'state_id', 'zip', 'country_id',
      'email', 'phone', 'website', 'vat', 'logo',
      'currency_id', 'fiscalyear_last_day', 'fiscalyear_last_month',
      'account_opening_date',
      'create_date', 'write_date'
    ]);
    const companies = await fetchAll(uid, 'res.company', [], fields);
    saveJSON('company.json', companies);
    results['res.company'] = companies.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['res.company'] = 'FAILED';
  }

  // 11. Users
  console.log('🟡 IMPORTANT: Users (res.users)...');
  try {
    const fields = await safeFields(uid, 'res.users', [
      'id', 'name', 'login', 'email', 'partner_id',
      'active', 'groups_id',
      'share', 'lang', 'tz',
      'create_date', 'write_date'
    ]);
    const users = await fetchAll(uid, 'res.users', [['active', 'in', [true, false]]], fields);
    saveJSON('users.json', users);
    results['res.users'] = users.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['res.users'] = 'FAILED';
  }

  // 12. Analytic Accounts
  console.log('🟡 IMPORTANT: Analytic Accounts...');
  try {
    const fields = await safeFields(uid, 'account.analytic.account', [
      'id', 'name', 'code', 'plan_id', 'root_plan_id',
      'partner_id', 'active',
      'balance', 'debit', 'credit',
      'create_date', 'write_date'
    ]);
    const analytics = await fetchAll(uid, 'account.analytic.account', [['active', 'in', [true, false]]], fields);
    saveJSON('analytic_accounts.json', analytics);
    results['account.analytic.account'] = analytics.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['account.analytic.account'] = 'FAILED';
  }

  // ═══════════════════════════════════════════════════════════════
  // 🟢 NICE TO HAVE
  // ═══════════════════════════════════════════════════════════════

  // 13. Website Pages
  console.log('🟢 NICE TO HAVE: Website Pages...');
  try {
    const fields = await safeFields(uid, 'website.page', [
      'id', 'name', 'url', 'website_published',
      'website_id', 'view_id',
      'is_published', 'date_publish',
      'create_date', 'write_date'
    ]);
    const pages = await fetchAll(uid, 'website.page', [], fields);
    saveJSON('website_pages.json', pages);
    results['website.page'] = pages.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['website.page'] = 'FAILED';
  }

  // 14. Email Templates
  console.log('🟢 NICE TO HAVE: Email Templates...');
  try {
    const fields = await safeFields(uid, 'mail.template', [
      'id', 'name', 'model_id', 'model',
      'subject', 'body_html', 'email_from', 'email_to', 'email_cc',
      'reply_to', 'auto_delete',
      'create_date', 'write_date'
    ]);
    const templates = await fetchAll(uid, 'mail.template', [], fields);
    saveJSON('email_templates.json', templates);
    results['mail.template'] = templates.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['mail.template'] = 'FAILED';
  }

  // 15. Attachments (metadata only — not downloading binary content to keep size manageable)
  console.log('🟢 NICE TO HAVE: Attachments (metadata only)...');
  try {
    const fields = await safeFields(uid, 'ir.attachment', [
      'id', 'name', 'type', 'url',
      'res_model', 'res_id', 'res_name',
      'mimetype', 'file_size',
      'public', 'description',
      'create_date', 'write_date'
    ]);
    const attachments = await fetchAll(uid, 'ir.attachment', [], fields, 500);
    saveJSON('attachments_metadata.json', attachments);
    results['ir.attachment'] = attachments.length;
  } catch (e) {
    console.error('  ❌', e.message);
    results['ir.attachment'] = 'FAILED';
  }

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════

  const summaryPath = path.join(BACKUP_DIR, 'extended_backup_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    backupDate: new Date().toISOString(),
    source: creds.url,
    database: creds.db,
    odooVersion: '19.0 Enterprise',
    results
  }, null, 2));

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  EXTENDED BACKUP COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  for (const [model, count] of Object.entries(results)) {
    const icon = typeof count === 'number' ? '✅' : '❌';
    console.log(`  ${icon} ${model}: ${count}`);
  }
  const allFiles = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
  const totalSize = allFiles.reduce((sum, f) => sum + fs.statSync(path.join(BACKUP_DIR, f)).size, 0);
  console.log(`\n  📁 ${BACKUP_DIR}`);
  console.log(`  📄 ${allFiles.length} total files`);
  console.log(`  💾 ${(totalSize / 1024 / 1024).toFixed(1)} MB total`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n💥 FAILED:', err.message);
  process.exit(1);
});
