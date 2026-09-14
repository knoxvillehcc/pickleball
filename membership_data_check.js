/**
 * Check membership-data-request CSV against Odoo
 * For each member: find partner, check for subscription + invoice
 * Output: Excel with clean data + status columns
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

// Parse CSV properly (handles quoted fields with commas)
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const members = [];

  for (let i = 1; i < lines.length; i++) { // skip header
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 5) continue;

    // Normalize membership type
    let rawType = parts[0].trim();
    let membershipType;
    if (rawType.toUpperCase().includes('PIONEER')) {
      membershipType = 'Pioneer Membership';
    } else if (rawType.toUpperCase().includes('GENERAL')) {
      membershipType = 'General Membership';
    } else {
      membershipType = rawType;
    }

    const amountStr = (parts[10] || '').replace(/[$",]/g, '').trim();

    members.push({
      num: i,
      membershipType,
      name: parts[1].trim(),
      paymentDate: parts[2].trim(),
      email: parts[3].trim(),
      phone: parts[4].trim(),
      address: [parts[5], parts[6], parts[7], parts[8], parts[9]].filter(Boolean).join(', ').trim(),
      amountPaid: amountStr ? parseFloat(amountStr) : 0,
    });
  }
  return members;
}

async function main() {
  const inputFile = 'C:\\Users\\HITESHPATIDAR\\Downloads\\membership-data-request-2026-09-09.csv';
  const outputFile = 'C:\\Users\\HITESHPATIDAR\\Downloads\\Membership_Data_Odoo_Check.xlsx';

  console.log('📋 Loading membership data...');
  const members = parseCSV(inputFile);
  console.log(`  ${members.length} members loaded\n`);

  console.log('🔌 Connecting to Odoo...');
  creds = await getCredentials();
  uid = await odooRPC('common', 'authenticate', [creds.db, creds.username, creds.password, {}]);
  console.log('✅ Connected\n');

  const rows = [];
  let hasSubAndInv = 0, hasSub = 0, hasInv = 0, hasNeither = 0, notFound = 0;

  for (const member of members) {
    process.stdout.write(`  [${member.num}/${members.length}] ${member.name.padEnd(40)} `);

    // Search by email
    let partners = [];
    if (member.email) {
      partners = await call('res.partner', 'search_read', [
        [['email', '=ilike', member.email]]
      ], {
        fields: ['id', 'name', 'email', 'phone', 'subscription_count'],
        limit: 10,
      });
    }

    // Fallback: name search
    if (partners.length === 0) {
      const cleanName = member.name
        .replace(/\s*&\s*/g, ' & ')
        .replace(/\s*-\s*.*$/, '')
        .trim();
      partners = await call('res.partner', 'search_read', [
        [['name', 'ilike', cleanName]]
      ], {
        fields: ['id', 'name', 'email', 'phone', 'subscription_count'],
        limit: 10,
      });
    }

    if (partners.length === 0) {
      console.log('❌ NOT FOUND');
      notFound++;
      rows.push({
        num: member.num,
        name: member.name,
        email: member.email,
        phone: member.phone,
        paymentDate: member.paymentDate,
        amountPaid: member.amountPaid,
        partnerId: '',
        odooPartnerName: '',
        hasSubscription: 'NO',
        subscriptionOrder: '',
        subscriptionPlan: '',
        subscriptionState: '',
        hasInvoice: 'NO',
        invoiceNumber: '',
        invoiceDate: '',
        invoiceAmount: '',
        invoicePaymentStatus: '',
        status: '❌ NOT FOUND IN ODOO',
        membershipType: member.membershipType,
      });
      continue;
    }

    // Pick the primary partner (subscription holder)
    const primary = partners.find(p => p.subscription_count > 0) || partners[0];
    const partnerIds = partners.map(p => p.id);

    // Check subscription
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

    const activeSub = subscriptions.find(s => s.subscription_state === '3_progress') || subscriptions[0];

    // Check invoices (only membership-related: General or Pioneer)
    let invoices = [];
    try {
      invoices = await call('account.move', 'search_read', [
        [
          ['partner_id', 'in', partnerIds],
          ['move_type', '=', 'out_invoice'],
          ['state', '=', 'posted'],
        ]
      ], {
        fields: ['id', 'name', 'amount_total', 'invoice_date', 'payment_state', 'invoice_origin'],
        order: 'invoice_date desc',
        limit: 50,
      });
    } catch (e) { /* ignore */ }

    // Find the membership invoice (linked to subscription or matching amount)
    let membershipInvoice = null;
    if (activeSub) {
      membershipInvoice = invoices.find(inv => inv.invoice_origin === activeSub.name);
    }
    if (!membershipInvoice) {
      // Try to find by amount match
      const targetAmounts = member.membershipType === 'Pioneer Membership' ? [1001, 1001.00] : [301, 301.00, 251, 251.00, 351, 351.00];
      membershipInvoice = invoices.find(inv => targetAmounts.includes(inv.amount_total));
    }

    const foundSub = !!activeSub;
    const foundInv = !!membershipInvoice;

    let status;
    if (foundSub && foundInv) {
      status = '✅ Has Both';
      hasSubAndInv++;
    } else if (foundSub && !foundInv) {
      status = '⚠️ Subscription Only - NO INVOICE';
      hasSub++;
    } else if (!foundSub && foundInv) {
      status = '⚠️ Invoice Only - NO SUBSCRIPTION';
      hasInv++;
    } else {
      status = '❌ NO Subscription & NO Invoice';
      hasNeither++;
    }

    const subPlan = activeSub?.plan_id ? activeSub.plan_id[1] : '';
    const subState = activeSub?.subscription_state || activeSub?.state || '';

    console.log(status);

    rows.push({
      num: member.num,
      name: member.name,
      email: member.email,
      phone: member.phone,
      paymentDate: member.paymentDate,
      amountPaid: member.amountPaid,
      partnerId: primary.id,
      odooPartnerName: primary.name,
      hasSubscription: foundSub ? 'YES' : 'NO',
      subscriptionOrder: activeSub ? activeSub.name : '',
      subscriptionPlan: subPlan,
      subscriptionState: subState === '3_progress' ? 'Active' : subState || '',
      hasInvoice: foundInv ? 'YES' : 'NO',
      invoiceNumber: membershipInvoice ? membershipInvoice.name : '',
      invoiceDate: membershipInvoice ? membershipInvoice.invoice_date : '',
      invoiceAmount: membershipInvoice ? membershipInvoice.amount_total : '',
      invoicePaymentStatus: membershipInvoice ? membershipInvoice.payment_state : '',
      status,
      membershipType: member.membershipType,
    });
  }

  // ── Summary ──
  console.log('\n══ SUMMARY ══');
  console.log(`  Total members:                ${members.length}`);
  console.log(`  ✅ Has Subscription + Invoice: ${hasSubAndInv}`);
  console.log(`  ⚠️  Subscription Only:         ${hasSub}`);
  console.log(`  ⚠️  Invoice Only:              ${hasInv}`);
  console.log(`  ❌ Neither:                    ${hasNeither}`);
  console.log(`  ❌ Not Found in Odoo:          ${notFound}`);

  // ── Generate Excel ──
  console.log('\n📊 Generating Excel...');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HCC Admin';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Membership Odoo Check');

  sheet.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Member Name', key: 'name', width: 38 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Payment Date', key: 'paymentDate', width: 14 },
    { header: 'Amount Paid', key: 'amountPaid', width: 13 },
    { header: 'Odoo Partner ID', key: 'partnerId', width: 14 },
    { header: 'Has Subscription', key: 'hasSubscription', width: 16 },
    { header: 'Subscription Order', key: 'subscriptionOrder', width: 18 },
    { header: 'Subscription Plan', key: 'subscriptionPlan', width: 28 },
    { header: 'Subscription Status', key: 'subscriptionState', width: 16 },
    { header: 'Has Invoice', key: 'hasInvoice', width: 12 },
    { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
    { header: 'Invoice Date', key: 'invoiceDate', width: 14 },
    { header: 'Invoice Amount', key: 'invoiceAmount', width: 14 },
    { header: 'Payment Status', key: 'invoicePaymentStatus', width: 14 },
    { header: 'Status', key: 'status', width: 36 },
    { header: 'Membership Purchased', key: 'membershipType', width: 24 },
  ];

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4057' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 24;

  // Add data
  for (const row of rows) {
    const dataRow = sheet.addRow(row);

    // Format currency
    const amtPaidCell = dataRow.getCell('amountPaid');
    if (row.amountPaid) amtPaidCell.numFmt = '$#,##0.00';
    const invAmtCell = dataRow.getCell('invoiceAmount');
    if (row.invoiceAmount) invAmtCell.numFmt = '$#,##0.00';

    // Color-code status
    if (row.status.includes('❌')) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } }; // red
      });
    } else if (row.status.includes('⚠️')) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }; // yellow
      });
    }

    // Color YES/NO cells
    const subCell = dataRow.getCell('hasSubscription');
    subCell.font = { bold: true, color: { argb: row.hasSubscription === 'YES' ? 'FF198754' : 'FFDC3545' } };
    const invCell = dataRow.getCell('hasInvoice');
    invCell.font = { bold: true, color: { argb: row.hasInvoice === 'YES' ? 'FF198754' : 'FFDC3545' } };
  }

  // Borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });
  });

  // Freeze + filter
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: 18 } };

  await workbook.xlsx.writeFile(outputFile);
  console.log(`\n✅ Excel saved to: ${outputFile}`);
  console.log(`   Total rows: ${rows.length}`);
}

main().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
