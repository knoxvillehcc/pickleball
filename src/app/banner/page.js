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
const inputStyle = {
  width: '100%', padding: '11px 16px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: '10px', color: 'var(--text-primary)',
  fontSize: '14px', fontWeight: '500',
  outline: 'none', fontFamily: 'inherit',
};
const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: '700',
  color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px',
};
const STATUS_STYLES = {
  green:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  color: '#10B981' },
  yellow: { bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)', color: '#D97706' },
  red:    { bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.3)',  color: '#F43F5E' },
};

export default function BannerPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '' });

  const fetchData = async () => {
    setLoading(true); setError(''); setResults(null); setStats(null);
    try {
      const params = new URLSearchParams();
      if (filters.search)   params.set('search',   filters.search);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo)   params.set('dateTo',   filters.dateTo);
      const res  = await fetch('/api/banner?' + params.toString());
      const data = await res.json();
      if (data.success) { setResults(data.results); setStats(data.stats); }
      else setError(data.error || 'Failed to load');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const downloadPDF = () => {
    if (!results || !results.length) return;
    try {
      const doc     = new jsPDF('landscape');
      const dateStr = new Date().toLocaleDateString();

      doc.setFontSize(20);
      doc.text('Banner Check-In Report', 10, 15);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('Generated on: ' + dateStr, 10, 22);

      const banner2026    = results.filter(r => !r.product.includes('Any'));
      const bannerAnyStar = results.filter(r =>  r.product.includes('Any'));
      const totalRev      = results.reduce((s, r) => s + (r.amount || 0), 0);

      autoTable(doc, {
        startY: 30,
        head: [['Product', 'Count', 'Total Amount']],
        body: [
          ['Yearly Banner 2026',        banner2026.length.toString(),    '$' + banner2026.reduce((s,r)    => s+(r.amount||0),0).toFixed(2)],
          ['Yearly Banner 2026 (Any$)', bannerAnyStar.length.toString(), '$' + bannerAnyStar.reduce((s,r) => s+(r.amount||0),0).toFixed(2)],
          ['TOTAL COLLECTED',           results.length.toString(),       '$' + totalRev.toFixed(2)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
        margin: { left: 10, right: 10 },
        didParseCell: (d) => {
          if (d.section === 'body' && d.row.index === 2) {
            d.cell.styles.fillColor = [240, 240, 240];
            d.cell.styles.fontStyle = 'bold';
            d.cell.styles.textColor = [15, 23, 42];
          }
        },
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Customer Name', 'Date', 'Product', 'Amount', 'Payment Taken By', 'Status', 'Invoice Ref']],
        body: results.map(r => [
          r.customerName, r.date, r.product,
          '$' + (r.amount||0).toFixed(2),
          r.takenBy, r.statusLabel, r.orderId
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8, cellPadding: 1.5 },
        alternateRowStyles: { fillColor: [230, 235, 240] },
        margin: { top: 10, bottom: 8, left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 28 },
          2: { cellWidth: 60 },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 35 },
          5: { cellWidth: 22 },
          6: { cellWidth: 45 },
        },
      });

      doc.save('Banner_Report_' + dateStr.replace(/\//g, '-') + '.pdf');
    } catch (err) { alert('PDF error: ' + err.message); }
  };

  const downloadCSV = () => {
    if (!results || !results.length) return;
    const headers = ['Customer Name', 'Date', 'Product', 'Amount', 'Payment Taken By', 'Status', 'Invoice Ref'];
    const rows    = results.map(r => [r.customerName, r.date, r.product, (r.amount||0).toFixed(2), r.takenBy, r.statusLabel, r.orderId]);
    const csv     = [headers, ...rows].map(r => r.map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob    = new Blob([csv], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = Object.assign(document.createElement('a'), { href: url, download: 'banner_invoices_' + new Date().toISOString().split('T')[0] + '.csv' });
    a.click(); URL.revokeObjectURL(url);
  };

  const statCards = stats ? [
    { label: 'Total Invoices',    value: stats.total,           color: '#6366F1' },
    { label: 'Unique Customers',  value: stats.uniqueCustomers, color: '#38BDF8' },
    { label: 'Revenue Collected', value: '$' + (stats.totalRevenue||0).toLocaleString('en-US', { minimumFractionDigits: 2 }), color: '#10B981' },
    { label: 'Outstanding',       value: '$' + (stats.totalOutstanding||0).toLocaleString('en-US', { minimumFractionDigits: 2 }), color: '#F43F5E' },
    { label: 'Paid',              value: stats.paidCount,   color: '#10B981' },
    { label: 'Unpaid',            value: stats.unpaidCount, color: '#F43F5E' },
  ] : [];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'28px', paddingBottom:'60px' }}>

      {/* Hero */}
      <div style={{
        ...card,
        background: 'var(--bg-banner-grad)',
        borderColor: 'var(--border-hover)',
        padding: '48px', position: 'relative', overflow: 'hidden',
        boxShadow: '0 0 80px -20px var(--accent-glow)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
      }}>
        <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'300px', height:'300px', background:'radial-gradient(circle, var(--accent-glow), transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}></div>
        <div style={{ position:'relative' }}>
          <h1 style={{ margin:0, fontSize:'42px', fontWeight:'900', color:'var(--text-primary)', lineHeight:1.1, letterSpacing:'-1px' }}>
            Banner{' '}
            <span style={{ background:'linear-gradient(135deg, #38BDF8, #818CF8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Check-In</span>
          </h1>
          <p style={{ margin:'12px 0 0', color:'var(--text-secondary)', fontSize:'15px', lineHeight:1.6, maxWidth:'500px' }}>
            Customer invoices for <strong style={{ color:'var(--accent)' }}>Yearly Banner 2026</strong> and <strong style={{ color:'var(--accent)' }}>Yearly Banner 2026 (Any$)</strong> with payment status.
          </p>
        </div>

        {results && results.length > 0 && (
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', position:'relative', zIndex:1 }}>
            <button onClick={downloadPDF} style={{
              background: 'linear-gradient(135deg, #6366F1, #22D3EE)',
              color:'white', fontWeight:'700', fontSize:'14px',
              padding:'13px 26px', borderRadius:'12px', border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', gap:'8px',
              boxShadow:'0 0 30px -8px rgba(99,102,241,0.5)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Download PDF
            </button>
            <button onClick={downloadCSV} style={{
              background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)',
              color:'#10B981', fontWeight:'700', fontSize:'14px',
              padding:'13px 26px', borderRadius:'12px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:'8px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ ...card, padding:'28px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px', marginBottom:'20px' }}>
          <div>
            <label style={labelStyle}>Customer Name</label>
            <input style={inputStyle} placeholder="Search customer..." value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && fetchData()} />
          </div>
          <div>
            <label style={labelStyle}>Date From</label>
            <input type="date" style={inputStyle} value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Date To</label>
            <input type="date" style={inputStyle} value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
          </div>
        </div>
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
          <button onClick={fetchData} disabled={loading} style={{
            background: loading ? 'rgba(56,189,248,0.3)' : 'linear-gradient(135deg, #0EA5E9, #6366F1)',
            color:'white', fontWeight:'700', fontSize:'14px',
            padding:'12px 28px', borderRadius:'10px', border:'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', gap:'8px',
            boxShadow:'0 0 30px -8px rgba(56,189,248,0.4)', transition:'all 0.3s',
          }}>
            {loading
              ? <><span style={{ display:'inline-block', width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></span> Loading...</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Pull Report</>
            }
          </button>
          {(filters.search || filters.dateFrom || filters.dateTo) && (
            <button onClick={() => { setFilters({ search:'', dateFrom:'', dateTo:'' }); setResults(null); setStats(null); }} style={{
              background:'transparent', border:'1px solid var(--border)', color:'var(--text-secondary)',
              fontWeight:'600', fontSize:'14px', padding:'12px 20px', borderRadius:'10px', cursor:'pointer',
            }}>Clear</button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding:'16px 20px', borderRadius:'12px', backgroundColor:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)', color:'#F43F5E', fontWeight:'600' }}>
          Error: {error}
        </div>
      )}

      {/* Stat Cards */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px' }}>
          {statCards.map(({ label, value, color }) => (
            <div key={label} style={{ ...card, padding:'22px', borderTop:'2px solid '+color }}>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'8px' }}>{label}</div>
              <div style={{ fontSize:'30px', fontWeight:'900', color:'var(--text-primary)', lineHeight:1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {results && (
        <div style={{ ...card, padding:0, overflow:'hidden' }}>
          <div style={{ padding:'20px 28px', borderBottom:'1px solid var(--border-table)', backgroundColor:'var(--bg-table-header)', display:'flex', alignItems:'center', gap:'12px' }}>
            <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'var(--text-primary)' }}>Banner Invoices</h2>
            <span style={{ backgroundColor:'var(--bg-badge-pill)', color:'var(--text-badge-pill)', fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'9999px', border:'1px solid var(--border-badge-pill)' }}>
              {results.length} records
            </span>
          </div>

          {results.length === 0 ? (
            <div style={{ padding:'80px 24px', textAlign:'center', color:'var(--text-muted)', fontSize:'16px', fontWeight:'600' }}>No invoices found.</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', whiteSpace:'nowrap', fontSize:'14px' }}>
                <thead>
                  <tr style={{ backgroundColor:'var(--bg-table-header)', borderBottom:'1px solid var(--border-table)' }}>
                    {[['Customer Name','left'],['Date','left'],['Product','left'],['Amount','right'],['Payment Taken By','left'],['Status','center'],['Invoice Ref','left']].map(([h,align]) => (
                      <th key={h} style={{ padding:'14px 20px', fontSize:'11px', fontWeight:'700', color:'var(--text-table-header)', textTransform:'uppercase', letterSpacing:'1.5px', textAlign:align }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const st = STATUS_STYLES[r.statusColor] || STATUS_STYLES.red;
                    return (
                      <tr key={i}
                        style={{ borderBottom:'1px solid var(--border-table)', backgroundColor: i%2!==0 ? 'var(--bg-table-stripe)' : 'transparent', transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i%2!==0 ? 'var(--bg-table-stripe)' : 'transparent'}
                      >
                        <td style={{ padding:'14px 20px', fontWeight:'700', color:'var(--text-primary)' }}>{r.customerName}</td>
                        <td style={{ padding:'14px 20px', color:'var(--text-secondary)' }}>{r.date}</td>
                        <td style={{ padding:'14px 20px' }}>
                          <span style={{
                            display:'inline-block', padding:'3px 10px', borderRadius:'9999px', fontSize:'12px', fontWeight:'700',
                            backgroundColor: r.product.includes('Any') ? 'rgba(129,140,248,0.12)' : 'rgba(56,189,248,0.12)',
                            color:           r.product.includes('Any') ? '#818CF8' : '#38BDF8',
                            border:          '1px solid ' + (r.product.includes('Any') ? 'rgba(129,140,248,0.25)' : 'rgba(56,189,248,0.25)'),
                          }}>{r.product}</span>
                        </td>
                        <td style={{ padding:'14px 20px', textAlign:'right', fontWeight:'800', color:'#10B981', fontSize:'15px' }}>
                          ${(r.amount||0).toLocaleString('en-US',{minimumFractionDigits:2})}
                        </td>
                        <td style={{ padding:'14px 20px', color:'var(--text-secondary)', fontWeight:'600' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'6px' }}>
                            <span style={{ width:'26px', height:'26px', borderRadius:'50%', backgroundColor:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'800', color:'#818CF8', flexShrink:0 }}>
                              {(r.takenBy||'?').charAt(0).toUpperCase()}
                            </span>
                            {r.takenBy}
                          </span>
                        </td>
                        <td style={{ padding:'14px 20px', textAlign:'center' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 12px', borderRadius:'9999px', fontSize:'11px', fontWeight:'700', backgroundColor:st.bg, color:st.color, border:'1px solid '+st.border }}>
                            <span style={{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor:st.color, display:'inline-block' }}></span>
                            {r.statusLabel}
                          </span>
                        </td>
                        <td style={{ padding:'14px 20px', fontFamily:'monospace', fontSize:'12px', color:'var(--text-muted)' }}>{r.orderId}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:'2px solid var(--border)', backgroundColor:'var(--bg-table-header)' }}>
                    <td colSpan={3} style={{ padding:'15px 20px', fontWeight:'800', color:'var(--text-primary)', fontSize:'13px', textTransform:'uppercase', letterSpacing:'1px' }}>GRAND TOTAL</td>
                    <td style={{ padding:'15px 20px', textAlign:'right', fontWeight:'900', color:'#10B981', fontSize:'18px' }}>
                      ${results.reduce((s,r) => s+(r.amount||0), 0).toLocaleString('en-US',{minimumFractionDigits:2})}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}