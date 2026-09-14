/**
 * ═══════════════════════════════════════════════════════════════════
 * DRY RUN: Match Active Members → Invoices + Membership Info
 * ═══════════════════════════════════════════════════════════════════
 * READ-ONLY — Searches Odoo for each member by name/email, finds
 * their invoices and membership (subscription) information.
 * ═══════════════════════════════════════════════════════════════════
 */
const crypto = require('crypto');
const fs = require('fs');

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

function fmt(n) { return '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function pad(s, n) { return (s || '').toString().substring(0, n).padEnd(n); }
function padR(s, n) { return (s || '').toString().substring(0, n).padStart(n); }

// Parse the members file
function parseMembers(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const members = [];

  for (const line of lines) {
    // Skip header
    if (line.startsWith('#,')) continue;

    // Format: #,Name,Email,Phone?,Membership Status,POS Order Linked
    const parts = line.split(',');
    if (parts.length < 3) continue;

    const num = parseInt(parts[0]);
    if (isNaN(num)) continue;

    const name = parts[1].trim();
    const email = parts[2].trim();
    const phone = parts.length > 3 ? parts[3].trim() : '';

    members.push({ num, name, email, phone });
  }
  return members;
}

async function main() {
  const membersFile = process.argv[2] || 'C:\\Users\\HITESHPATIDAR\\Downloads\\active_members_no_pos_order.txt';

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   DRY RUN: Match Active Members → Invoices + Membership Info               ║');
  console.log('║   READ-ONLY — No changes will be made                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // ── Parse members file ──
  const members = parseMembers(membersFile);
  console.log(`📋 Loaded ${members.length} members from file\n`);

  // ── Connect to Odoo ──
  creds = await getCredentials();
  uid = await odooRPC('common', 'authenticate', [creds.db, creds.username, creds.password, {}]);
  console.log('✅ Authenticated to Odoo\n');

  // ── Step 1: Discover available fields on key models ──
  console.log('══ STEP 1: Discovering available models & fields ══\n');

  // Check sale.order subscription fields
  let hasSubscription = false;
  let subscriptionFields = [];
  try {
    const soFields = await call('sale.order', 'fields_get', [], { attributes: ['string', 'type'] });
    subscriptionFields = Object.keys(soFields).filter(f =>
      f.includes('subscri') || f.includes('recur') || f.includes('plan') ||
      f.includes('renewal') || f.includes('membership')
    );
    hasSubscription = subscriptionFields.includes('is_subscription');
    console.log(`  sale.order subscription fields: ${subscriptionFields.join(', ') || '(none)'}`);
    console.log(`  has is_subscription: ${hasSubscription}`);
  } catch (e) {
    console.log(`  sale.order fields check: ${e.message}`);
  }

  // Check res.partner membership fields
  let partnerMemberFields = [];
  try {
    const pFields = await call('res.partner', 'fields_get', [], { attributes: ['string', 'type'] });
    partnerMemberFields = Object.keys(pFields).filter(f =>
      f.includes('member') || f.includes('subscri') || f.includes('membership')
    );
    console.log(`  res.partner membership fields: ${partnerMemberFields.join(', ') || '(none)'}`);
  } catch (e) {
    console.log(`  res.partner fields check: ${e.message}`);
  }

  // Check account.move fields
  let invoiceFields = [];
  try {
    const invFields = await call('account.move', 'fields_get', [], { attributes: ['string', 'type'] });
    invoiceFields = Object.keys(invFields);
    console.log(`  account.move total fields: ${invoiceFields.length}`);
  } catch (e) {
    console.log(`  account.move fields check: ${e.message}`);
  }

  // ── Step 2: Search for each member in Odoo ──
  console.log('\n══ STEP 2: Searching for members in Odoo (res.partner) ══\n');

  const results = [];
  let matched = 0;
  let unmatched = 0;
  let multiMatch = 0;

  for (const member of members) {
    process.stdout.write(`  [${member.num}/${members.length}] ${pad(member.name, 35)} `);

    // Search by email first (most reliable)
    let partners = [];
    if (member.email && member.email !== 'N/A') {
      partners = await call('res.partner', 'search_read', [
        [['email', '=ilike', member.email]]
      ], {
        fields: ['id', 'name', 'email', 'phone',
                 ...partnerMemberFields,
                 'customer_rank', 'active', 'company_type'],
        limit: 10,
      });
    }

    // If no email match, try name search
    if (partners.length === 0) {
      // Clean name: remove business suffixes, special chars
      const cleanName = member.name
        .replace(/\s*-\s*.*$/, '')  // Remove " - Business Name" suffixes
        .replace(/\s+(inc\.|llc|corp|group)\.?$/i, '')
        .trim();

      partners = await call('res.partner', 'search_read', [
        [['name', '=ilike', cleanName]]
      ], {
        fields: ['id', 'name', 'email', 'phone',
                 ...partnerMemberFields,
                 'customer_rank', 'active', 'company_type'],
        limit: 10,
      });

      // Try partial match if exact fails
      if (partners.length === 0) {
        partners = await call('res.partner', 'search_read', [
          [['name', 'ilike', cleanName]]
        ], {
          fields: ['id', 'name', 'email', 'phone',
                   ...partnerMemberFields,
                   'customer_rank', 'active', 'company_type'],
          limit: 10,
        });
      }
    }

    if (partners.length === 0) {
      console.log('❌ NOT FOUND');
      results.push({ member, status: 'NOT_FOUND', partners: [], invoices: [], subscriptions: [] });
      unmatched++;
      continue;
    }

    if (partners.length > 1) {
      console.log(`⚠️  MULTIPLE (${partners.length} matches)`);
      multiMatch++;
    } else {
      console.log(`✅ ID=${partners[0].id}`);
      matched++;
    }

    // ── Get invoices for matched partner(s) ──
    const partnerIds = partners.map(p => p.id);
    let invoices = [];
    try {
      invoices = await call('account.move', 'search_read', [
        [
          ['partner_id', 'in', partnerIds],
          ['move_type', 'in', ['out_invoice', 'out_refund']],
          ['state', '=', 'posted'],
        ]
      ], {
        fields: ['id', 'name', 'amount_total', 'amount_residual', 'invoice_date',
                 'partner_id', 'payment_state', 'invoice_origin', 'journal_id',
                 'invoice_line_ids', 'ref'],
        order: 'invoice_date desc',
        limit: 50,
      });
    } catch (e) {
      console.log(`    ⚠️  Invoice search error: ${e.message}`);
    }

    // ── Get subscription/sale orders for matched partner(s) ──
    let subscriptions = [];
    if (hasSubscription) {
      try {
        subscriptions = await call('sale.order', 'search_read', [
          [
            ['partner_id', 'in', partnerIds],
            ['is_subscription', '=', true],
          ]
        ], {
          fields: ['id', 'name', 'amount_total', 'date_order', 'partner_id',
                   'state', 'subscription_state', 'start_date', 'next_invoice_date',
                   'end_date', 'plan_id', 'invoice_ids'],
          order: 'date_order desc',
          limit: 20,
        });
      } catch (e) {
        // Some fields may not exist, try minimal
        try {
          subscriptions = await call('sale.order', 'search_read', [
            [
              ['partner_id', 'in', partnerIds],
              ['is_subscription', '=', true],
            ]
          ], {
            fields: ['id', 'name', 'amount_total', 'date_order', 'partner_id', 'state'],
            order: 'date_order desc',
            limit: 20,
          });
        } catch (e2) {
          console.log(`    ⚠️  Subscription search error: ${e2.message}`);
        }
      }
    }

    results.push({ member, status: partners.length > 1 ? 'MULTI_MATCH' : 'FOUND', partners, invoices, subscriptions });
  }

  // ── Step 3: Summary Report ──
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         MATCH SUMMARY                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log(`  Total members in file:    ${members.length}`);
  console.log(`  ├─ Matched (single):      ${matched}`);
  console.log(`  ├─ Multiple matches:      ${multiMatch}`);
  console.log(`  └─ Not found:             ${unmatched}\n`);

  // ── Step 4: Detailed per-member report ──
  console.log('══════════════════════════════════════════════════════════════════════════════════');
  console.log('                      DETAILED MEMBER REPORT');
  console.log('══════════════════════════════════════════════════════════════════════════════════\n');

  for (const r of results) {
    const m = r.member;
    console.log(`─── [${m.num}] ${m.name} (${m.email}) ───`);
    console.log(`  Status: ${r.status}`);

    if (r.partners.length > 0) {
      for (const p of r.partners) {
        console.log(`  Partner: ID=${p.id}, "${p.name}", email=${p.email || '(none)'}`);
        if (p.membership_state) console.log(`    Membership State: ${p.membership_state}`);
        // Print any discovered membership fields
        for (const mf of partnerMemberFields) {
          if (mf !== 'membership_state' && mf !== 'channel_member_ids' && p[mf] !== undefined && p[mf] !== false) {
            console.log(`    ${mf}: ${JSON.stringify(p[mf])}`);
          }
        }
      }
    }

    if (r.invoices.length > 0) {
      console.log(`  Invoices: ${r.invoices.length} found`);
      for (const inv of r.invoices.slice(0, 10)) {
        const origin = (inv.invoice_origin || '').substring(0, 20);
        console.log(`    ${pad(inv.name, 16)} | ${inv.invoice_date || 'N/A'} | ${padR(fmt(inv.amount_total), 10)} | ${pad(inv.payment_state, 12)} | origin: ${origin || '(none)'}`);
      }
      if (r.invoices.length > 10) console.log(`    ... and ${r.invoices.length - 10} more`);
    } else {
      console.log(`  Invoices: NONE`);
    }

    if (r.subscriptions.length > 0) {
      console.log(`  Subscriptions: ${r.subscriptions.length} found`);
      for (const sub of r.subscriptions) {
        const planName = sub.plan_id ? sub.plan_id[1] : '(no plan)';
        const subState = sub.subscription_state || sub.state;
        console.log(`    ${pad(sub.name, 12)} | ${subState} | ${fmt(sub.amount_total)} | ordered: ${sub.date_order ? sub.date_order.split(' ')[0] : 'N/A'} | plan: ${planName}`);
        if (sub.start_date) console.log(`      start: ${sub.start_date}, next_invoice: ${sub.next_invoice_date || 'N/A'}, end: ${sub.end_date || 'N/A'}`);
      }
    } else if (hasSubscription) {
      console.log(`  Subscriptions: NONE`);
    }

    console.log('');
  }

  // ── Step 5: Aggregated stats ──
  const withInvoices = results.filter(r => r.invoices.length > 0);
  const withSubscriptions = results.filter(r => r.subscriptions.length > 0);
  const totalInvoiceAmount = results.reduce((s, r) => s + r.invoices.reduce((s2, i) => s2 + i.amount_total, 0), 0);

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       AGGREGATE STATISTICS                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  console.log(`  Members with invoices:      ${withInvoices.length} / ${members.length}`);
  console.log(`  Members with subscriptions: ${withSubscriptions.length} / ${members.length}`);
  console.log(`  Total invoice amount:       ${fmt(totalInvoiceAmount)}`);
  console.log(`  Members with NO invoices:   ${results.filter(r => r.invoices.length === 0 && r.status !== 'NOT_FOUND').length}`);
  console.log(`  Members NOT FOUND at all:   ${results.filter(r => r.status === 'NOT_FOUND').length}`);

  // List members not found
  const notFound = results.filter(r => r.status === 'NOT_FOUND');
  if (notFound.length > 0) {
    console.log('\n  ⚠️  Members NOT FOUND in Odoo:');
    for (const r of notFound) {
      console.log(`    ${r.member.num}. ${r.member.name} (${r.member.email})`);
    }
  }

  // List members found but with zero invoices
  const foundNoInv = results.filter(r => r.status !== 'NOT_FOUND' && r.invoices.length === 0);
  if (foundNoInv.length > 0) {
    console.log('\n  ⚠️  Members FOUND but with NO invoices:');
    for (const r of foundNoInv) {
      console.log(`    ${r.member.num}. ${r.member.name} (Partner ID: ${r.partners[0]?.id})`);
    }
  }

  console.log('\n✅ Dry run complete — no changes were made\n');
}

main().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
