import { NextResponse } from 'next/server';
import { getAllRegistrations } from '@/lib/supabaseClient';
import { getSessionAndPermissions } from '@/lib/auth';

export async function GET(request) {
  const auth = await getSessionAndPermissions('pickleball');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv'; // csv | excel | pdf

  try {
    const records = await getAllRegistrations(5000);

    // ── CSV ────────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const headers = [
        'Registration #', 'Full Name', 'Team Name', 'Partner Name', 'Email', 'Phone', 'Skill Level',
        'Registration Date', 'Payment Status', 'Amount Paid ($)',
        'Stripe Reference', 'Event Name', 'Event Date',
        'Gender', 'City', 'State',
      ];

      const rows = records.map(r => [
        r.registration_number || '',
        r.full_name            || '',
        r.team_name            || '',
        r.partner_name         || '',
        r.email                || '',
        r.phone                || '',
        r.skill_level          || '',
        r.registration_date ? r.registration_date.split('T')[0] : '',
        r.payment_status       || '',
        (r.amount_paid         || 0).toFixed(2),
        r.stripe_payment_ref   || '',
        r.event_name           || '',
        r.event_date           || '',
        r.gender               || '',
        r.city                 || '',
        r.state                || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`));

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const today = new Date().toISOString().split('T')[0];

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="pickleball-registrations-${today}.csv"`,
        },
      });
    }

    // ── Excel (XLSX via simple XML-based format) ────────────────────────
    if (format === 'excel') {
      const headers = [
        'Registration #', 'Full Name', 'Team Name', 'Partner Name', 'Email', 'Phone', 'Skill Level',
        'Registration Date', 'Payment Status', 'Amount Paid ($)',
        'Stripe Reference', 'Event Name', 'Event Date', 'Gender', 'City',
        'State',
      ];

      const escape = (v) =>
        String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

      const headerRow = headers.map(h => `<Cell><Data ss:Type="String">${escape(h)}</Data></Cell>`).join('');

      const dataRows = records.map(r => {
        const cells = [
          r.registration_number || '',
          r.full_name            || '',
          r.team_name            || '',
          r.partner_name         || '',
          r.email                || '',
          r.phone                || '',
          r.skill_level          || '',
          r.registration_date ? r.registration_date.split('T')[0] : '',
          r.payment_status       || '',
          (r.amount_paid || 0).toFixed(2),
          r.stripe_payment_ref   || '',
          r.event_name           || '',
          r.event_date           || '',
          r.gender               || '',
          r.city                 || '',
          r.state                || '',
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
      <Interior ss:Color="#7B1C1C" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Pickleball Registrations">
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
          'Content-Disposition': `attachment; filename="pickleball-registrations-${today}.xls"`,
        },
      });
    }

    // ── PDF (HTML → CSS print-styled) ─────────────────────────────────
    if (format === 'pdf') {
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const printTime = new Date().toLocaleTimeString('en-US');
      const userName = auth.user?.name || auth.user?.email || 'Admin';

      const tableRows = records.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#FFF8F0' : '#fff'}">
          <td style="font-family:monospace;font-weight:700;color:#7B1C1C">${r.registration_number || ''}</td>
          <td>${r.full_name || ''}</td>
          <td>${r.team_name || ''}</td>
          <td>${r.partner_name || ''}</td>
          <td>${r.email || ''}</td>
          <td>${r.phone || ''}</td>
          <td style="text-transform:capitalize">${r.skill_level || ''}</td>
          <td>${r.registration_date ? r.registration_date.split('T')[0] : ''}</td>
          <td>
            <span style="padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;
              background:${r.payment_status === 'paid' ? '#D1FAE5' : '#FEF3C7'};
              color:${r.payment_status === 'paid' ? '#065F46' : '#92400E'}">
              ${r.payment_status || ''}
            </span>
          </td>
          <td style="font-weight:700;color:#059669">$${(r.amount_paid || 0).toFixed(2)}</td>
        </tr>
      `).join('');

      const totalRevenue = records
        .filter(r => r.payment_status === 'paid')
        .reduce((s, r) => s + (r.amount_paid || 0), 0);

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>HCC Pickleball Registrations – ${today}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; font-size: 13px; }
    .header { background: #7B1C1C; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat-box { background: #FFF8F0; border: 2px solid #F4A40B; border-radius: 8px; padding: 12px 20px; flex: 1; min-width: 120px; }
    .stat-box .label { font-size: 11px; color: #7B1C1C; font-weight: 700; text-transform: uppercase; }
    .stat-box .value { font-size: 24px; font-weight: 900; color: #7B1C1C; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #7B1C1C; }
    thead th { color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 9px 8px; border-bottom: 1px solid #E5E7EB; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏓 HCC Pickleball Registrations</h1>
    <p>Knoxville Hindu Community Center &nbsp;|&nbsp; Printed by: ${userName} on ${today} at ${printTime}</p>
  </div>
  <div class="stats">
    <div class="stat-box"><div class="label">Total</div><div class="value">${records.length}</div></div>
    <div class="stat-box"><div class="label">Paid</div><div class="value">${records.filter(r=>r.payment_status==='paid').length}</div></div>
    <div class="stat-box"><div class="label">Pending</div><div class="value">${records.filter(r=>r.payment_status==='pending').length}</div></div>
    <div class="stat-box"><div class="label">Revenue</div><div class="value">$${totalRevenue.toFixed(2)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Reg #</th><th>Name</th><th>Team Name</th><th>Partner Name</th><th>Email</th><th>Phone</th>
        <th>Skill</th><th>Date</th><th>Status</th><th>Amount</th>
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
          'Content-Disposition': `attachment; filename="pickleball-registrations-${today2}.html"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid format. Use csv, excel, or pdf.' }, { status: 400 });

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
