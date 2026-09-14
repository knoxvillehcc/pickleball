/**
 * Generate clean Excel sheet for IT team
 * Maps active members → their invoice + membership data from Odoo
 */
const crypto = require('crypto');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SUPABASE_URL = 'https://wkyzejotrcraluextvpc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreXplam90cmNyYWx1ZXh0dnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk5ODU1MywiZXhwIjoyMDk3NTc0NTUzfQ.VMMXPaH5fb4x5H5YEPsNT9_ekxA1dKLFK8nHyQDjE-A';
const JWT_SECRET = '8bc4a6a38ebbb420fde5e960d8077dec1e655304ab4f7b0c9cb2f014c77d80f1630927876711e8cb11a2224fa56051b27725d191721084fb7ed4200f9670b8db';

function decrypt(text) {
  if (!text) return '';
  try {
    const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const enc = Buffer.from(parts.join(':'), 'hex');
    const d = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let r = d.update(enc, 'hex', 'utf8'); r += d.final('utf8'); return r;
  } catch { return ''; }
}

async function getCredentials() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/pickleball_settings?key=eq.odoo_creds&select=value&limit=1`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  const rows = await r.json();
  if (rows?.length > 0) { const d = decrypt(rows[0].value); if (d) return JSON.parse(d); }
  return require('./credentials.json');
}

let creds, uid;
async function odooRPC(s, m, a) {
  const r = await fetch(creds.url.replace(/\/$/, '') + '/jsonrpc', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service: s, method: m, args: a } })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.data?.message || JSON.stringify(d.error));
  return d.result;
}
async function call(model, method, args, kwargs = {}) {
  return odooRPC('object', 'execute_kw', [creds.db, uid, creds.password, model, method, args, kwargs]);
}

function parseMembers(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const members = [];
  for (const line of lines) {
    if (line.startsWith('#,')) continue;
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const num = parseInt(parts[0]);
    if (isNaN(num)) continue;
    members.push({
      num,
      name: parts[1].trim(),
      email: parts[2].trim(),
      phone: parts.length > 3 ? parts[3].trim() : '',
    });
  }
  return members;
}

async function main() {
  const membersFile = 'C:\\Users\\HITESHPATIDAR\\Downloads\\active_members_no_pos_order.txt';
  const outputFile = 'C:\\Users\\HITESHPATIDAR\\Downloads\\Active_Members_Invoice_Report.xlsx';

  console.log('📋 Loading members...');
  const members = parseMembers(membersFile);
  console.log(`  ${members.length} members loaded\n`);

  console.log('🔌 Connecting to Odoo...');
  creds = await getCredentials();
  uid = await odooRPC('common', 'authenticate', [creds.db, creds.username, creds.password, {}]);
  console.log('✅ Connected\n');

  // Collect rows for Excel
  const rows = [];

  for (const member of members) {
    process.stdout.write(`  [${member.num}/${members.length}] ${member.name.padEnd(35)} `);

    // Search by email
    let partners = [];
    if (member.email && member.email !== 'N/A') {
      partners = await call('res.partner', 'search_read', [
        [['email', '=ilike', member.email]]
      ], {
        fields: ['id', 'name', 'email', 'phone', 'subscription_count'],
        limit: 10,
      });
    }

    // Fallback: name search
    if (partners.length === 0) {
      const cleanName = member.name.replace(/\s*-\s*.*$/, '').replace(/\s+(inc\.|llc|corp|group)\.?$/i, '').trim();
      partners = await call('res.partner', 'search_read', [
        [['name', 'ilike', cleanName]]
      ], {
        fields: ['id', 'name', 'email', 'phone', 'subscription_count'],
        limit: 10,
      });
    }

    if (partners.length === 0) {
      console.log('❌ NOT FOUND');
      rows.push({
        num: member.num,
        name: member.name,
        email: member.email,
        phone: member.phone,
        partnerId: '',
        invoiceNumber: '',
        invoiceDate: '',
        invoiceAmount: '',
        paymentStatus: '',
        subscriptionOrder: '',
        membershipPlan: 'NOT FOUND IN ODOO',
      });
      continue;
    }

    // Pick the primary partner (the one with subscription_count > 0)
    const primary = partners.find(p => p.subscription_count > 0) || partners[0];
    const partnerIds = partners.map(p => p.id);

    // Get invoices
    let invoices = [];
    try {
      invoices = await call('account.move', 'search_read', [
        [
          ['partner_id', 'in', partnerIds],
          ['move_type', 'in', ['out_invoice']],
          ['state', '=', 'posted'],
        ]
      ], {
        fields: ['id', 'name', 'amount_total', 'invoice_date', 'payment_state', 'invoice_origin'],
        order: 'invoice_date desc',
        limit: 50,
      });
    } catch (e) { /* ignore */ }

    // Get subscription
    let subscriptions = [];
    try {
      subscriptions = await call('sale.order', 'search_read', [
        [
          ['partner_id', 'in', partnerIds],
          ['is_subscription', '=', true],
        ]
      ], {
        fields: ['id', 'name', 'amount_total', 'date_order', 'state', 'subscription_state', 'plan_id'],
        order: 'date_order desc',
        limit: 10,
      });
    } catch (e) { /* ignore */ }

    // Find the active subscription
    const activeSub = subscriptions.find(s => s.subscription_state === '3_progress') || subscriptions[0];
    const planName = activeSub?.plan_id ? activeSub.plan_id[1] : '';

    // Find the membership invoice (linked to subscription via origin)
    let membershipInvoice = null;
    if (activeSub) {
      membershipInvoice = invoices.find(inv =>
        inv.invoice_origin && inv.invoice_origin === activeSub.name
      );
    }
    // If no membership invoice found, use the first invoice
    if (!membershipInvoice && invoices.length > 0) {
      membershipInvoice = invoices[0];
    }

    const row = {
      num: member.num,
      name: primary.name,
      email: primary.email || member.email,
      phone: (primary.phone || member.phone || '').replace(/\s+/g, ' ').trim(),
      partnerId: primary.id,
      invoiceNumber: membershipInvoice ? membershipInvoice.name : 'No Invoice',
      invoiceDate: membershipInvoice ? membershipInvoice.invoice_date : '',
      invoiceAmount: membershipInvoice ? membershipInvoice.amount_total : '',
      paymentStatus: membershipInvoice ? membershipInvoice.payment_state : '',
      subscriptionOrder: activeSub ? activeSub.name : '',
      membershipPlan: planName || 'No Subscription Found',
    };

    rows.push(row);
    console.log(`✅ ${planName}`);
  }

  // ── Generate Excel ──
  console.log('\n📊 Generating Excel...');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HCC Admin';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Active Members - No POS Order');

  // Define columns
  sheet.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Member Name', key: 'name', width: 35 },
    { header: 'Email', key: 'email', width: 35 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Odoo Partner ID', key: 'partnerId', width: 15 },
    { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
    { header: 'Invoice Date', key: 'invoiceDate', width: 14 },
    { header: 'Invoice Amount', key: 'invoiceAmount', width: 15 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Subscription Order', key: 'subscriptionOrder', width: 18 },
    { header: 'Membership Plan', key: 'membershipPlan', width: 30 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4057' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  // Add data rows
  for (const row of rows) {
    const dataRow = sheet.addRow(row);

    // Format amount as currency
    if (row.invoiceAmount !== '' && row.invoiceAmount !== undefined) {
      const amountCell = dataRow.getCell('invoiceAmount');
      amountCell.numFmt = '$#,##0.00';
    }

    // Highlight rows with no invoice in light yellow
    if (row.invoiceNumber === 'No Invoice') {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      });
    }

    // Color payment status
    const statusCell = dataRow.getCell('paymentStatus');
    if (row.paymentStatus === 'paid') {
      statusCell.font = { color: { argb: 'FF198754' }, bold: true };
    } else if (row.paymentStatus === 'in_payment') {
      statusCell.font = { color: { argb: 'FFFD7E14' }, bold: true };
    } else if (row.paymentStatus === 'not_paid') {
      statusCell.font = { color: { argb: 'FFDC3545' }, bold: true };
    }
  }

  // Add borders to all cells
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });
  });

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rows.length + 1, column: 11 },
  };

  await workbook.xlsx.writeFile(outputFile);
  console.log(`\n✅ Excel saved to: ${outputFile}`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Members with invoices: ${rows.filter(r => r.invoiceNumber !== 'No Invoice').length}`);
  console.log(`   Members without invoices: ${rows.filter(r => r.invoiceNumber === 'No Invoice').length}`);
}

main().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
