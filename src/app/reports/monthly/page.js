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

const MONTH_COLORS = [
  ['#6366F1', '#818CF8'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#FCD34D'],
  ['#EF4444', '#F87171'],
  ['#8B5CF6', '#A78BFA'],
  ['#0EA5E9', '#38BDF8'],
  ['#EC4899', '#F472B6'],
  ['#14B8A6', '#2DD4BF'],
];

function getColor(idx) {
  return MONTH_COLORS[idx % MONTH_COLORS.length];
}

export default function MonthlyReportPage() {
  const [data, setData]         = useState({ months: {}, summary: {}, results: [] });
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch('/api/reports/monthly')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData({ months: d.months, summary: d.summary, results: d.results });
          // Expand the first (newest) month by default
          const first = Object.keys(d.months)[0];
          if (first) setExpanded({ [first]: true });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleMonth = (key) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const expandAll  = () => setExpanded(Object.fromEntries(Object.keys(data.months).map(k => [k, true])));
  const collapseAll = () => setExpanded({});

  const totalMembers = Object.values(data.summary).reduce((s, x) => s + x.count,   0);
  const totalRevenue = Object.values(data.summary).reduce((s, x) => s + x.revenue, 0);
  const monthCount   = Object.keys(data.months).length;

  const downloadPDF = () => {
    try {
      const doc     = new jsPDF('landscape');
      const dateStr = new Date().toLocaleDateString();

      doc.setFontSize(20);
      doc.text('Monthly Subscription Report', 10, 15);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('Generated on: ' + dateStr, 10, 22);

      // Summary table
      let totalCount = 0, totalRev = 0;
      const summaryBody = Object.entries(data.summary).map(([type, stats]) => {
        totalCount += stats.count;
        totalRev   += stats.revenue;
        return [type, stats.count.toString(), '$' + stats.revenue.toFixed(2)];
      });
      summaryBody.push(['TOTAL', totalCount.toString(), '$' + totalRev.toFixed(2)]);

      autoTable(doc, {
        startY: 30,
        head: [['Subscription Type', 'Members', 'Revenue']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
        margin: { left: 10, right: 10 },
        didParseCell: (d) => {
          if (d.section === 'body' && d.row.index === summaryBody.length - 1) {
            d.cell.styles.fillColor = [240, 240, 240];
            d.cell.styles.fontStyle = 'bold';
            d.cell.styles.textColor = [15, 23, 42];
          }
        },
      });

      // Monthly detail tables
      let startY = doc.lastAutoTable.finalY + 12;
      for (const [key, month] of Object.entries(data.months)) {
        if (startY > 175) { doc.addPage(); startY = 15; }

        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text(`${month.label}  —  ${month.count} member(s)  |  $${month.revenue.toFixed(2)}`, 10, startY);
        startY += 4;

        autoTable(doc, {
          startY,
          head: [['Customer Name', 'Subscription Type', 'Order Ref', 'Date', 'Amount']],
          body: month.members.map(m => [m.customer, m.type, m.order, m.date, '$' + m.amount.toFixed(2)]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42] },
          styles: { fontSize: 8, cellPadding: 1.2 },
          alternateRowStyles: { fillColor: [230, 235, 240] },
          margin: { left: 10, right: 10 },
          columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 100 },
            2: { cellWidth: 38 },
            3: { cellWidth: 32 },
            4: { cellWidth: 30, halign: 'right' },
          },
        });
        startY = doc.lastAutoTable.finalY + 10;
      }

      doc.save('Monthly_Report_' + dateStr.replace(/\//g, '-') + '.pdf');
    } catch (err) { alert('PDF error: ' + err.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>

      {/* Hero */}
      <div style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(13,20,38,0.95) 0%, rgba(6,30,50,0.4) 100%)',
        borderColor: 'rgba(16,185,129,0.2)',
        padding: '48px', position: 'relative', overflow: 'hidden',
        boxShadow: '0 0 80px -20px rgba(16,185,129,0.12)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16,185,129,0.1), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: '900', color: 'white', lineHeight: 1.1, letterSpacing: '-1px' }}>
            Monthly{' '}
            <span style={{ background: 'linear-gradient(135deg, #10B981, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Report</span>
          </h1>
          <p style={{ margin: '12px 0 0', color: '#64748B', fontSize: '15px', lineHeight: 1.6, maxWidth: '480px' }}>
            Members grouped by the month they subscribed — track growth over time.
          </p>
        </div>
        {!loading && data.results.length > 0 && (
          <button onClick={downloadPDF} style={{
            background: 'linear-gradient(135deg, #10B981, #0EA5E9)',
            color: 'white', fontWeight: '700', fontSize: '15px',
            padding: '14px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: '0 0 40px -10px rgba(16,185,129,0.5)',
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
          <div style={{ width: '48px', height: '48px', border: '3px solid rgba(16,185,129,0.2)', borderTop: '3px solid #10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#475569', fontWeight: '600', fontSize: '16px' }}>Loading Monthly Data...</div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Total Members */}
            <div style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: '20px', borderTop: '2px solid #6366F1' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Total Members</div>
                <div style={{ fontSize: '40px', fontWeight: '900', color: 'white', lineHeight: 1 }}>{totalMembers}</div>
              </div>
            </div>

            {/* Total Revenue */}
            <div style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: '20px', borderTop: '2px solid #10B981' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Total Revenue</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#10B981', lineHeight: 1 }}>${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Active Months */}
            <div style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: '20px', borderTop: '2px solid #F59E0B' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Months Active</div>
                <div style={{ fontSize: '40px', fontWeight: '900', color: '#FCD34D', lineHeight: 1 }}>{monthCount}</div>
              </div>
            </div>

            {/* Avg per Month */}
            <div style={{ ...card, padding: '28px', display: 'flex', alignItems: 'center', gap: '20px', borderTop: '2px solid #8B5CF6' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Avg / Month</div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#A78BFA', lineHeight: 1 }}>
                  {monthCount > 0 ? (totalMembers / monthCount).toFixed(1) : '0'}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly breakdown header with expand/collapse */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'white' }}>
              Members by Month
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={expandAll} style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(51,65,85,0.6)', backgroundColor: 'rgba(13,20,38,0.8)', color: '#94A3B8', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Expand All
              </button>
              <button onClick={collapseAll} style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(51,65,85,0.6)', backgroundColor: 'rgba(13,20,38,0.8)', color: '#94A3B8', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Collapse All
              </button>
            </div>
          </div>

          {/* Month accordion cards */}
          {Object.keys(data.months).length === 0 ? (
            <div style={{ ...card, padding: '80px 24px', textAlign: 'center', color: '#334155', fontWeight: '600' }}>
              No subscription data found.
            </div>
          ) : (
            Object.entries(data.months).map(([key, month], idx) => {
              const [c1, c2] = getColor(idx);
              const isOpen = !!expanded[key];
              const avgPerMember = month.count > 0 ? (month.revenue / month.count).toFixed(2) : '0.00';

              return (
                <div key={key} style={{ ...card, overflow: 'hidden' }}>
                  {/* Month header row */}
                  <button
                    onClick={() => toggleMonth(key)}
                    style={{
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      padding: '20px 28px',
                      borderBottom: isOpen ? '1px solid rgba(51,65,85,0.4)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    }}
                  >
                    {/* Left: color bar + month name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '4px', height: '44px', borderRadius: '4px',
                        background: `linear-gradient(180deg, ${c1}, ${c2})`,
                        flexShrink: 0,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                          {month.label}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>
                          {month.count} member{month.count !== 1 ? 's' : ''} subscribed this month
                        </div>
                      </div>
                    </div>

                    {/* Right: stats + chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Members</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'white', lineHeight: 1.1 }}>{month.count}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Revenue</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: c2, lineHeight: 1.1 }}>${month.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Avg / Member</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#94A3B8', lineHeight: 1.1 }}>${avgPerMember}</div>
                      </div>
                      <svg
                        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </button>

                  {/* Expandable member table */}
                  {isOpen && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'rgba(8,12,20,0.4)', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                            {[['#','center'],['Customer Name','left'],['Subscription Type','left'],['Order Ref','left'],['Date','left'],['Amount','right']].map(([h, align]) => (
                              <th key={h} style={{ padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: align }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {month.members.map((row, i) => (
                            <tr
                              key={row.id}
                              style={{ borderBottom: '1px solid rgba(51,65,85,0.2)', backgroundColor: i % 2 !== 0 ? 'rgba(15,23,42,0.45)' : 'transparent', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = `rgba(${hexToRgb(c1)},0.06)`}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 !== 0 ? 'rgba(15,23,42,0.45)' : 'transparent'}
                            >
                              <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '12px' }}>{i + 1}</td>
                              <td style={{ padding: '12px 20px', fontWeight: '700', color: 'white' }}>{row.customer}</td>
                              <td style={{ padding: '12px 20px', fontWeight: '600' }}>
                                <span style={{ backgroundColor: `rgba(${hexToRgb(c1)},0.12)`, color: c2, fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px', border: `1px solid rgba(${hexToRgb(c1)},0.25)` }}>
                                  {row.type}
                                </span>
                              </td>
                              <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>{row.order}</td>
                              <td style={{ padding: '12px 20px', color: '#94A3B8' }}>{row.date}</td>
                              <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '800', color: '#10B981' }}>${(row.amount || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                          {/* Month total row */}
                          <tr style={{ backgroundColor: 'rgba(8,12,20,0.6)', borderTop: '1px solid rgba(51,65,85,0.4)' }}>
                            <td colSpan={5} style={{ padding: '12px 20px', fontWeight: '800', color: '#CBD5E1', fontSize: '13px', textAlign: 'right' }}>
                              {month.label} Total ({month.count} members)
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '900', color: c2, fontSize: '15px' }}>
                              ${month.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Helper: convert hex color to "r,g,b" string for rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
