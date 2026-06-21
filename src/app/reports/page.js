'use client';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const card = {
  backgroundColor: 'rgba(13, 20, 38, 0.8)',
  border: '1px solid rgba(51,65,85,0.6)',
  borderRadius: '16px',
  transition: 'all 0.3s',
};

export default function ReportsPage() {
  const [data,    setData]    = useState({ summary: {}, results: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { if (d.success) setData({ summary: d.summary, results: d.results }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const downloadPDF = () => {
    try {
      const doc     = new jsPDF('landscape');
      const dateStr = new Date().toLocaleDateString();

      doc.setFontSize(20);
      doc.text('Active Subscription Report', 10, 15);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('Generated on: ' + dateStr, 10, 22);

      let totalCount = 0, totalRevenue = 0;
      const summaryBody = Object.entries(data.summary).map(([type, stats]) => {
        totalCount   += stats.count;
        totalRevenue += stats.revenue;
        return [type, stats.count.toString(), '$' + stats.revenue.toFixed(2)];
      });
      summaryBody.push(['TOTAL MEMBERSHIP COLLECTED', totalCount.toString(), '$' + totalRevenue.toFixed(2)]);

      autoTable(doc, {
        startY: 35,
        head: [['Subscription Type', 'Active Members', 'Total Value']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
        margin: { top: 10, bottom: 10, left: 10, right: 10 },
        didParseCell: (d) => {
          if (d.section === 'body' && d.row.index === summaryBody.length - 1) {
            d.cell.styles.fillColor   = [240, 240, 240];
            d.cell.styles.fontStyle   = 'bold';
            d.cell.styles.textColor   = [15, 23, 42];
          }
        },
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Customer Name', 'Subscription Type', 'Order Ref', 'Start Date', 'Amount']],
        body: data.results.map(r => [r.customer, r.type, r.order, r.date, '$' + (r.amount||0).toFixed(2)]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8, cellPadding: 1.2 },
        alternateRowStyles: { fillColor: [230, 235, 240] },
        margin: { top: 10, bottom: 8, left: 10, right: 10 },
        columnStyles: { 0:{cellWidth:60}, 1:{cellWidth:100}, 2:{cellWidth:40}, 3:{cellWidth:35}, 4:{cellWidth:30,halign:'right'} },
      });

      doc.save('Membership_Report_' + dateStr.replace(/\//g, '-') + '.pdf');
    } catch (err) { alert('PDF error: ' + err.message); }
  };

  const totalMembers  = Object.values(data.summary).reduce((s, x) => s + x.count,   0);
  const totalRevenue  = Object.values(data.summary).reduce((s, x) => s + x.revenue, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>

      {/* Hero */}
      <div style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(13,20,38,0.95) 0%, rgba(6,30,50,0.4) 100%)',
        borderColor: 'rgba(99,102,241,0.2)',
        padding: '48px', position: 'relative', overflow: 'hidden',
        boxShadow: '0 0 80px -20px rgba(99,102,241,0.12)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
      }}>
        <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'300px', height:'300px', background:'radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}></div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: '900', color: 'white', lineHeight: 1.1, letterSpacing: '-1px' }}>
            Membership{' '}
            <span style={{ background: 'linear-gradient(135deg, #818CF8, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Reports</span>
          </h1>
          <p style={{ margin: '12px 0 0', color: '#64748B', fontSize: '15px', lineHeight: 1.6, maxWidth: '480px' }}>
            Complete overview of all active memberships, revenue, and subscription details.
          </p>
        </div>
        {!loading && data.results.length > 0 && (
          <button onClick={downloadPDF} style={{
            background: 'linear-gradient(135deg, #6366F1, #22D3EE)',
            color: 'white', fontWeight: '700', fontSize: '15px',
            padding: '14px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: '0 0 40px -10px rgba(99,102,241,0.5)',
            position: 'relative', zIndex: 1,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Download PDF Report
          </button>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <div style={{ color: '#475569', fontWeight: '600', fontSize: '16px' }}>Loading Membership Data...</div>
        </div>
      ) : (
        <>
          {/* Global Totals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: '20px', borderTop: '2px solid #6366F1' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Total Active Members</div>
                <div style={{ fontSize: '40px', fontWeight: '900', color: 'white', lineHeight: 1 }}>{totalMembers}</div>
              </div>
            </div>

            <div style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: '20px', borderTop: '2px solid #10B981' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Total Revenue Collected</div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#10B981', lineHeight: 1 }}>${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Summary Cards per Type */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {Object.entries(data.summary).map(([type, stats]) => (
              <div key={type} style={{ ...card, padding: '28px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 'auto 0 auto 0', top: 0, height: '2px', background: 'linear-gradient(90deg, #6366F1, #38BDF8 60%, transparent)' }}></div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#CBD5E1', marginBottom: '24px', lineHeight: 1.4 }}>{type}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Active Members</div>
                    <div style={{ fontSize: '44px', fontWeight: '900', color: 'white', lineHeight: 1 }}>{stats.count}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Revenue</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#818CF8' }}>${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detail Table */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(51,65,85,0.5)', backgroundColor: 'rgba(8,12,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'white' }}>Member Detail</h2>
                <span style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818CF8', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px', border: '1px solid rgba(99,102,241,0.25)' }}>
                  {data.results.length} records
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(8,12,20,0.4)', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                    {[['Customer Name','left'],['Subscription Type','left'],['Order Ref','left'],['Start Date','left'],['Amount','right']].map(([h, align]) => (
                      <th key={h} style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: align }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((row, i) => (
                    <tr key={row.id || i}
                      style={{ borderBottom: '1px solid rgba(51,65,85,0.25)', backgroundColor: i % 2 !== 0 ? 'rgba(15,23,42,0.45)' : 'transparent', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 !== 0 ? 'rgba(15,23,42,0.45)' : 'transparent'}
                    >
                      <td style={{ padding: '14px 24px', fontWeight: '700', color: 'white' }}>{row.customer}</td>
                      <td style={{ padding: '14px 24px', color: '#818CF8', fontWeight: '600' }}>{row.type}</td>
                      <td style={{ padding: '14px 24px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>{row.order}</td>
                      <td style={{ padding: '14px 24px', color: '#94A3B8' }}>{row.date}</td>
                      <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: '800', color: '#10B981' }}>${(row.amount||0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.results.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '80px 24px', textAlign: 'center', color: '#334155', fontWeight: '600' }}>No active subscriptions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}