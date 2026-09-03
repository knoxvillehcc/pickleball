'use client';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const card = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  transition: 'all 0.3s',
};

const kpiCard = {
  ...card,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const inputStyle = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
};

const btnPrimary = {
  background: 'linear-gradient(135deg, #FF9933, #e6852e)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 28px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  letterSpacing: '0.3px',
};

const btnSecondary = {
  backgroundColor: 'var(--bg-button-secondary)',
  border: '1px solid var(--border-button-secondary)',
  borderRadius: '10px',
  color: 'var(--text-button-secondary)',
  padding: '10px 20px',
  fontWeight: '500',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

export default function StripeStatementPage() {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('daily'); // 'daily' | 'transactions'

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe/statement?start=${startDate}&end=${endDate}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF('landscape');
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(20);
    doc.text('Stripe CC Payment Statement', 10, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${startDate} to ${endDate}  |  Generated: ${dateStr}`, 10, 22);

    // Summary
    autoTable(doc, {
      startY: 30,
      head: [['Total Charges', 'Gross Amount', 'Processing Fees', 'Net Amount']],
      body: [[
        data.totals.count.toString(),
        fmt(data.totals.gross),
        fmt(data.totals.fee),
        fmt(data.totals.net),
      ]],
      theme: 'grid',
      headStyles: { fillColor: [255, 153, 51] },
    });

    // Daily breakdown
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Date', 'Charges', 'Gross', 'Fees', 'Net']],
      body: data.dailySummary.map(d => [
        d.date,
        d.count.toString(),
        fmt(d.gross),
        fmt(d.fee),
        fmt(d.net),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`stripe-statement-${startDate}-to-${endDate}.pdf`);
  };

  const downloadCSV = () => {
    if (!data) return;
    const rows = view === 'daily'
      ? [['Date', 'Charges', 'Gross', 'Fees', 'Net'],
         ...data.dailySummary.map(d => [d.date, d.count, d.gross.toFixed(2), d.fee.toFixed(2), d.net.toFixed(2)])]
      : [['Date', 'Time', 'ID', 'Customer', 'Amount', 'Fee', 'Net', 'Card', 'Description'],
         ...data.charges.map(c => [c.date, c.time, c.id, c.customer, c.amount.toFixed(2), c.fee.toFixed(2), c.net.toFixed(2), `${c.card_brand} ${c.card_last4}`, c.description])];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stripe-${view}-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          💳 Stripe Statement
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px' }}>
          View charges, fees, and daily breakdown by date range
        </p>
      </div>

      {/* Date Range Picker */}
      <div style={{ ...card, padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
              Start Date
            </label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
              End Date
            </label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={fetchStatement} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1, minWidth: '140px' }}>
            {loading ? '⏳ Loading...' : '🔍 Generate'}
          </button>
          {data && (
            <>
              <button onClick={downloadPDF} style={btnSecondary}>📄 PDF</button>
              <button onClick={downloadCSV} style={btnSecondary}>📊 CSV</button>
            </>
          )}
        </div>

        {/* Quick Ranges */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Today', start: today, end: today },
            { label: 'Last 7 Days', start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], end: today },
            { label: 'Last 30 Days', start: monthAgo, end: today },
            { label: 'This Month', start: `${today.slice(0, 7)}-01`, end: today },
            { label: 'Last Month', start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.toISOString().slice(0, 7)}-01`; })(), end: (() => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]; })() },
          ].map(r => (
            <button key={r.label} onClick={() => { setStartDate(r.start); setEndDate(r.end); }}
              style={{ ...btnSecondary, padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>💳</div>
          <p style={{ color: 'var(--text-muted)' }}>Fetching charges from Stripe...</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={kpiCard}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Charges</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: '700' }}>{data.totals.count}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{data.dailySummary.length} days</span>
            </div>
            <div style={kpiCard}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross Amount</span>
              <span style={{ color: '#4ade80', fontSize: '28px', fontWeight: '700' }}>{fmt(data.totals.gross)}</span>
            </div>
            <div style={kpiCard}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Processing Fees</span>
              <span style={{ color: '#f87171', fontSize: '28px', fontWeight: '700' }}>{fmt(data.totals.fee)}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                {data.totals.gross > 0 ? ((data.totals.fee / data.totals.gross) * 100).toFixed(2) : '0'}% effective rate
              </span>
            </div>
            <div style={kpiCard}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Deposited</span>
              <span style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: '700' }}>{fmt(data.totals.net)}</span>
            </div>
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', ...card, padding: '4px', width: 'fit-content' }}>
            <button onClick={() => setView('daily')}
              style={{ ...btnSecondary, padding: '8px 20px', fontSize: '13px', borderRadius: '10px',
                backgroundColor: view === 'daily' ? 'var(--accent)' : 'transparent',
                color: view === 'daily' ? '#fff' : 'var(--text-muted)', border: 'none' }}>
              📅 Daily Summary
            </button>
            <button onClick={() => setView('transactions')}
              style={{ ...btnSecondary, padding: '8px 20px', fontSize: '13px', borderRadius: '10px',
                backgroundColor: view === 'transactions' ? 'var(--accent)' : 'transparent',
                color: view === 'transactions' ? '#fff' : 'var(--text-muted)', border: 'none' }}>
              💳 All Transactions
            </button>
          </div>

          {/* Daily Summary Table */}
          {view === 'daily' && (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                      {['Date', 'Charges', 'Gross', 'Fees', 'Net'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Date' ? 'left' : 'right', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailySummary.map((d, i) => (
                      <tr key={d.date} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>
                          {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '14px', borderBottom: '1px solid var(--border-table)' }}>{d.count}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(d.gross)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f87171', fontSize: '14px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(d.fee)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(d.net)}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr style={{ backgroundColor: 'rgba(255, 153, 51, 0.08)' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--accent)', fontSize: '14px', fontWeight: '700' }}>TOTAL</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: '700', fontSize: '14px' }}>{data.totals.count}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#4ade80', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(data.totals.gross)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#f87171', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(data.totals.fee)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent)', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{fmt(data.totals.net)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Transactions Table */}
          {view === 'transactions' && (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-table-header)' }}>
                      {['Date', 'Time', 'Customer', 'Card', 'Amount', 'Fee', 'Net', 'Description'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: ['Amount', 'Fee', 'Net'].includes(h) ? 'right' : 'left', color: 'var(--text-table-header)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.charges.map((c, i) => (
                      <tr key={c.id} style={{ backgroundColor: i % 2 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? 'var(--bg-table-stripe)' : 'transparent'}>
                        <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                          {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)' }}>{c.time}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customer || '—'}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '13px', borderBottom: '1px solid var(--border-table)', whiteSpace: 'nowrap' }}>
                          {c.card_brand ? `${c.card_brand.toUpperCase()} ••${c.card_last4}` : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#4ade80', fontSize: '13px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.amount)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#f87171', fontSize: '13px', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.fee)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', fontFamily: 'monospace', borderBottom: '1px solid var(--border-table)' }}>{fmt(c.net)}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '12px', borderBottom: '1px solid var(--border-table)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!data && !loading && (
        <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Select a date range</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Choose start and end dates, then click Generate to view your Stripe statement</p>
        </div>
      )}
    </div>
  );
}
