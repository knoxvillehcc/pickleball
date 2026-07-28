import { NextResponse } from 'next/server';
import { getAllVendorRegistrations } from '@/lib/supabaseClient';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await getSessionAndPermissions('indiafest');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv'; // csv | excel | pdf

  try {
    const records = await getAllVendorRegistrations(5000);

    // ── CSV ────────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const headers = [
        'Registration #', 'First Name', 'Last Name', 'Company Name',
        'Email', 'Phone', 'Address', 'City', 'State', 'ZIP',
        'Vendor Type', 'Quantity', 'Amount Due ($)', 'Amount Paid ($)',
        'Payment Status', 'Stripe Reference', 'Registration Date',
      ];

      const rows = records.map(r => [
        r.registration_number || '',
        r.first_name           || '',
        r.last_name            || '',
        r.company_name         || '',
        r.email                || '',
        r.phone                || '',
        r.address              || '',
        r.city                 || '',
        r.state                || '',
        r.zip                  || '',
        r.space_type           || '',
        r.quantity             || 1,
        ((r.amount_due  || 0) / 100).toFixed(2),
        ((r.amount_paid || 0) / 100).toFixed(2),
        r.payment_status       || '',
        r.stripe_payment_ref   || '',
        r.registration_date ? r.registration_date.split('T')[0] : '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`));

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const today = new Date().toISOString().split('T')[0];

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="indiafest-vendors-${today}.csv"`,
        },
      });
    }

    // ── Excel (XML-based) ──────────────────────────────────────────────────
    if (format === 'excel') {
      const headers = [
        'Registration #', 'First Name', 'Last Name', 'Company Name',
        'Email', 'Phone', 'Address', 'City', 'State', 'ZIP',
        'Vendor Type', 'Quantity', 'Amount Due ($)', 'Amount Paid ($)',
        'Payment Status', 'Stripe Reference', 'Registration Date',
      ];

      const escape = (v) =>
        String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

      const headerRow = headers.map(h => `<Cell><Data ss:Type="String">${escape(h)}</Data></Cell>`).join('');

      const dataRows = records.map(r => {
        const cells = [
          r.registration_number || '',
          r.first_name           || '',
          r.last_name            || '',
          r.company_name         || '',
          r.email                || '',
          r.phone                || '',
          r.address              || '',
          r.city                 || '',
          r.state                || '',
          r.zip                  || '',
          r.space_type           || '',
          r.quantity             || 1,
          ((r.amount_due  || 0) / 100).toFixed(2),
          ((r.amount_paid || 0) / 100).toFixed(2),
          r.payment_status       || '',
          r.stripe_payment_ref   || '',
          r.registration_date ? r.registration_date.split('T')[0] : '',
        ].map(v => `<Cell><Data ss:Type="String">${escape(v)}</Data></Cell>`).join('');
        return `<Row>${cells}</Row>`;
      }).join('');

      const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/>
      <Interior ss:Color="#FF9933" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="India Fest 2026 Vendors">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

      const today = new Date().toISOString().split('T')[0];
      return new Response(xml, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="indiafest-vendors-${today}.xls"`,
        },
      });
    }

    // ── PDF (print-styled HTML) ────────────────────────────────────────────
    if (format === 'pdf') {
      const today     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const printTime = new Date().toLocaleTimeString('en-US');
      const userName  = auth.user?.name || auth.user?.email || 'Admin';

      const tableRows = records.map((r, i) => {
        const amountPaid = ((r.amount_paid || 0) / 100).toFixed(2);
        const vendorLabel = r.space_type === 'home_business'
          ? 'Small Business from Home'
          : r.space_type === 'established_business'
          ? 'Established Business/Stores'
          : r.space_type || '';

        return `
        <tr style="background:${i % 2 === 0 ? '#FFF8F0' : '#fff'}">
          <td style="font-family:monospace;font-weight:700;color:#E07C1A">${r.registration_number || ''}</td>
          <td>${(r.first_name || '') + ' ' + (r.last_name || '')}</td>
          <td>${r.company_name || ''}</td>
          <td>${r.email || ''}</td>
          <td>${r.phone || ''}</td>
          <td>${vendorLabel}</td>
          <td style="text-align:center">${r.quantity || 1}</td>
          <td>${r.registration_date ? r.registration_date.split('T')[0] : ''}</td>
          <td>
            <span style="padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;
              background:${r.payment_status === 'paid' ? '#D1FAE5' : '#FEF3C7'};
              color:${r.payment_status === 'paid' ? '#065F46' : '#92400E'}">
              ${r.payment_status || ''}
            </span>
          </td>
          <td style="font-weight:700;color:#059669">$${amountPaid}</td>
        </tr>`;
      }).join('');

      const totalRevenue = records
        .filter(r => r.payment_status === 'paid')
        .reduce((s, r) => s + ((r.amount_paid || 0) / 100), 0);

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>India Fest 2026 Vendor Registrations – ${today}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; font-size: 13px; }
    .header { background: linear-gradient(135deg, #FF9933, #E07C1A); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; opacity: 0.85; font-size: 13px; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat-box { background: #FFF8F0; border: 2px solid #FF9933; border-radius: 8px; padding: 12px 20px; flex: 1; min-width: 120px; }
    .stat-box .label { font-size: 11px; color: #E07C1A; font-weight: 700; text-transform: uppercase; }
    .stat-box .value { font-size: 24px; font-weight: 900; color: #E07C1A; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #FF9933; }
    thead th { color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 9px 8px; border-bottom: 1px solid #E5E7EB; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🇮🇳 India Fest 2026 — Vendor Registrations</h1>
    <p>Knoxville Hindu Community Center &nbsp;|&nbsp; Printed by: ${userName} on ${today} at ${printTime}</p>
  </div>
  <div class="stats">
    <div class="stat-box"><div class="label">Total Vendors</div><div class="value">${records.length}</div></div>
    <div class="stat-box"><div class="label">Paid</div><div class="value">${records.filter(r => r.payment_status === 'paid').length}</div></div>
    <div class="stat-box"><div class="label">Pending</div><div class="value">${records.filter(r => r.payment_status === 'pending').length}</div></div>
    <div class="stat-box"><div class="label">Revenue</div><div class="value">$${totalRevenue.toFixed(2)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Reg #</th><th>Name</th><th>Company</th><th>Email</th><th>Phone</th>
        <th>Vendor Type</th><th>Qty</th><th>Date</th><th>Status</th><th>Amount Paid</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

      const today2 = new Date().toISOString().split('T')[0];
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="indiafest-vendors-${today2}.html"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid format. Use csv, excel, or pdf.' }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
