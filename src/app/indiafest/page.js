'use client';
import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  saffron: 'var(--accent)',
  gold:    '#FF9933',
  bg:      'var(--bg-card)',
  border:  'var(--border)',
};

const SPACE_LABELS = {
  home_business:        { label: 'Home Business',        size: '1 Spot', price: '$351' },
  established_business: { label: 'Established Store',    size: '1 Spot', price: '$1001' },
};

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    paid:     { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: 'var(--text-success)', label: '✓ Paid' },
    pending:  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: 'var(--accent)', label: '⏳ Pending' },
    failed:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: 'var(--text-error)', label: '✗ Failed' },
    refunded: { bg: 'rgba(148,163,184,0.15)',border: 'rgba(148,163,184,0.4)',color: 'var(--text-muted)', label: '↩ Refunded' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '800',
      backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ── Space badge ────────────────────────────────────────────────────────────────
function SpaceBadge({ type }) {
  const s = SPACE_LABELS[type] || { label: type, size: '', price: '' };
  const colors = {
    home_business:        { bg: 'rgba(255,153,51,0.12)', border: 'rgba(255,153,51,0.3)', color: '#FF9933' },
    established_business: { bg: 'rgba(139,30,63,0.12)',  border: 'rgba(139,30,63,0.3)',  color: '#8B1E3F' },
  };
  const c = colors[type] || { bg: 'var(--accent-glow)', border: 'var(--border)', color: 'var(--accent)' };
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '800',
      backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}>
      🏪 {s.label} ({s.price})
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      backgroundColor: C.bg, border: `1px solid ${C.border}`,
      borderRadius: '16px', padding: '24px', borderTop: `3.5px solid ${accent}`,
      width: '100%', boxShadow: 'var(--shadow)',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>
        {label}
      </div>
      <div style={{ fontSize: '36px', fontWeight: '950', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '600' }}>{sub}</div>}
    </div>
  );
}

// ── Filter button ──────────────────────────────────────────────────────────────
function FilterBtn({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: '8px',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      backgroundColor: active ? 'var(--accent-glow)' : 'var(--bg-card)',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontWeight: '800', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
      fontFamily: 'inherit',
    }}>
      {children}
    </button>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function IndiafestVendorDashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [filter,        setFilter]        = useState('all');
  const [spaceFilter,   setSpaceFilter]   = useState('all');
  const [expanded,      setExpanded]      = useState(null);
  const [isPublished,   setIsPublished]   = useState(false);
  const [publishing,    setPublishing]    = useState(false);
  const [urlCopied,     setUrlCopied]     = useState(false);
  const [currentUser,   setCurrentUser]   = useState(null);
  const [exporting,     setExporting]     = useState('');
  const [editingReg,    setEditingReg]    = useState(null);
  const [resendingId,   setResendingId]   = useState(null);
  const [resendDone,    setResendDone]    = useState({});

  const PUBLIC_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/register/indiafest/vendor`
    : '/register/indiafest/vendor';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/indiafest/registrations');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load');
      setRegistrations(data.registrations || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetch('/api/indiafest/settings?key=is_published')
      .then(r => r.json())
      .then(d => setIsPublished(d.is_published === true || d.value === 'true'))
      .catch(() => {});
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setCurrentUser(d.user || null))
      .catch(() => {});
  }, [load]);

  const handlePublishToggle = async () => {
    setPublishing(true);
    const next = !isPublished;
    try {
      const res  = await fetch('/api/indiafest/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'is_published', value: String(next) }),
      });
      const data = await res.json();
      if (data.success) setIsPublished(next);
    } catch (e) { console.error(e); }
    finally { setPublishing(false); }
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(PUBLIC_URL);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleResendEmail = async (reg) => {
    setResendingId(reg.registration_number);
    try {
      const res = await fetch('/api/indiafest/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_number: reg.registration_number }),
      });
      const data = await res.json();
      if (data.success) {
        setResendDone(prev => ({ ...prev, [reg.registration_number]: true }));
        setTimeout(() => setResendDone(prev => ({ ...prev, [reg.registration_number]: false })), 3000);
      } else {
        alert('Resend failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Resend failed: ' + e.message);
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteReg = async (reg) => {
    if (!confirm(`Are you sure you want to delete vendor registration ${reg.registration_number} for ${reg.first_name} ${reg.last_name} (${reg.company_name})? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/indiafest/registrations?id=${reg.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete registration');
      
      setRegistrations(prev => prev.filter(r => r.id !== reg.id));
      setExpanded(null);
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  const handleSaveRegistration = (updatedRecord) => {
    setRegistrations(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const paid     = registrations.filter(r => r.payment_status === 'paid');
  const pending  = registrations.filter(r => r.payment_status === 'pending');
  const revenue  = paid.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
  const smallCt  = paid.filter(r => r.space_type === 'small').length;
  const mediumCt = paid.filter(r => r.space_type === 'medium').length;
  const largeCt  = paid.filter(r => r.space_type === 'large').length;

  // ── Filter + search ────────────────────────────────────────────────────────
  const filtered = registrations.filter(r => {
    const matchStatus = filter === 'all' || r.payment_status === filter;
    const matchSpace  = spaceFilter === 'all' || r.space_type === spaceFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || [
      r.first_name, r.last_name, r.company_name, r.email,
      r.registration_number, r.city,
    ].some(f => f?.toLowerCase().includes(q));
    return matchStatus && matchSpace && matchSearch;
  });

  // ── CSV export ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = ['Reg #', 'First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 'Space', 'Amount', 'Status', 'Date'];
    const rows = filtered.map(r => [
      r.registration_number, r.first_name, r.last_name, r.company_name,
      r.email, r.phone, r.address, r.city, r.state, r.zip,
      r.space_type, `$${((r.amount_paid || 0) / 100).toFixed(2)}`,
      r.payment_status,
      r.registration_date ? new Date(r.registration_date).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `indiafest-vendors-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  // ── PDF export (client-side) ──────────────────────────────────────────────
  const downloadPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      const dateStr = new Date().toLocaleDateString();
      const timeStr = new Date().toLocaleTimeString();
      const userName = currentUser?.name || currentUser?.email || 'Admin';

      doc.setFontSize(18);
      doc.setTextColor(224, 124, 26); // Saffron (#E07C1A)
      doc.text('India Fest 2026 — Vendor Space Registrations', 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Printed by: ${userName}  |  Date: ${dateStr}  |  Time: ${timeStr}  |  Total Vendors: ${filtered.length}`, 14, 22);

      const tableBody = filtered.map(r => {
        const vendorLabel = r.space_type === 'home_business'
          ? 'Home Business'
          : r.space_type === 'established_business'
          ? 'Established Store'
          : r.space_type || '';

        return [
          r.registration_number || '',
          `${r.first_name || ''} ${r.last_name || ''}`.trim(),
          r.company_name || '',
          r.email || '',
          r.phone || '',
          vendorLabel,
          r.quantity || 1,
          r.registration_date ? r.registration_date.split('T')[0] : '',
          (r.payment_status || '').toUpperCase(),
          '$' + ((r.amount_paid || 0) / 100).toFixed(2),
        ];
      });

      autoTable(doc, {
        startY: 28,
        head: [['Reg #', 'Name', 'Company', 'Email', 'Phone', 'Vendor Type', 'Qty', 'Date', 'Status', 'Amount Paid']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [224, 124, 26] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { top: 10, bottom: 10, left: 14, right: 14 },
      });

      doc.save(`IndiaFest_Vendors_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    }
  };

  // ── Export handler (API fallback for CSV / Excel) ──────────────────────────
  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = await fetch(`/api/indiafest/export?format=${format}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `Export failed (${res.status})`;
        if (res.status === 401) {
          alert('Session expired or unauthorized. Please log in again.');
          window.location.href = '/login?redirect=/indiafest';
          return;
        }
        alert(msg);
        return;
      }
      const blob = await res.blob();
      const ext = { csv: 'csv', excel: 'xls', pdf: 'html' }[format];
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url;
      a.download = `indiafest-vendors-${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setExporting('');
    }
  };

  const tdStyle = { padding: '14px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── Publish Banner — super_admin only ────────────────────────────── */}
      {currentUser?.role === 'super_admin' && (
        <div style={{
          borderRadius: '16px', padding: '18px 24px', marginBottom: '24px',
          background: isPublished
            ? 'rgba(16,185,129,0.08)'
            : 'rgba(245,158,11,0.08)',
          border: `1px solid ${isPublished ? 'var(--text-success)' : 'var(--accent)'}`,
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          boxShadow: 'var(--shadow)',
        }}>
          {/* Status dot + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, display: 'inline-block',
              backgroundColor: isPublished ? 'var(--text-success)' : 'var(--accent)',
              boxShadow: isPublished ? '0 0 8px var(--text-success)' : '0 0 8px var(--accent)',
            }}/>
            <span style={{ fontWeight: '800', fontSize: '15px', color: isPublished ? 'var(--text-success)' : 'var(--accent)' }}>
              Registration Page: {isPublished ? '🌐 LIVE' : '🔒 CLOSED'}
            </span>
          </div>

          {/* URL + Copy + Preview — only when live */}
          {isPublished && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {PUBLIC_URL}
              </span>
              <button onClick={copyPublicUrl} style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                background: urlCopied ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: 'var(--text-success)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {urlCopied ? '✅ Copied!' : '📋 Copy URL'}
              </button>
              <a href={PUBLIC_URL} target="_blank" rel="noreferrer" style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-success)', fontSize: '12px',
                fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap',
              }}>↗ Preview</a>
            </div>
          )}

          {/* Publish / Unpublish button */}
          <button onClick={handlePublishToggle} disabled={publishing} style={{
            marginLeft: 'auto', padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: publishing ? 'rgba(51,65,85,0.5)' : isPublished
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'var(--accent)',
            color: publishing ? '#475569' : 'white',
            fontWeight: '800', fontSize: '14px', cursor: publishing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
            boxShadow: publishing ? 'none' : isPublished ? '0 0 20px rgba(239,68,68,0.3)' : '0 4px 14px var(--accent-glow)',
            transition: 'all 0.3s', fontFamily: 'inherit',
          }}>
            {publishing ? '⏳ Saving...' : isPublished ? '🔒 Unpublish Page' : '🌐 Publish Page'}
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '950', letterSpacing: '-0.5px' }}>
              IndiaFest{' '}
              <span style={{ background: 'linear-gradient(135deg, var(--accent) 30%, #D4AF37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Booth Manager
              </span>
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13.5px', fontWeight: '500' }}>Vendor Space Registrations Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={load} style={{
            background: loading ? 'rgba(255,153,51,0.3)' : 'var(--accent)',
            color: 'white', fontWeight: '800', fontSize: '14px', padding: '12px 24px',
            borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            boxShadow: '0 4px 12px var(--accent-glow)',
          }}>
            {loading
              ? <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/> Loading...</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.09-4.82"/></svg> Refresh</>
            }
          </button>

          {/* Export buttons */}
          {['csv', 'excel', 'pdf'].map(fmt => (
            <button key={fmt} onClick={() => fmt === 'pdf' ? downloadPDF() : handleExport(fmt)} disabled={!!exporting} style={{
              background: 'transparent',
              border: `1px solid rgba(255,153,51,0.4)`,
              color: C.saffron, fontWeight: '600', fontSize: '13px',
              padding: '12px 18px', borderRadius: '10px', cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}>
              {exporting === fmt
                ? <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,153,51,0.3)', borderTop: `2px solid ${C.saffron}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/> Exporting...</>
                : <>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '🖨️'} {fmt.toUpperCase()}</>
              }
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Total Vendors"    value={registrations.length} accent={C.saffron} sub="all registrations" />
        <StatCard label="Confirmed (Paid)" value={paid.length}          accent="#10B981"   sub={`${pending.length} pending`} />
        <StatCard label="Revenue Collected" value={`$${(revenue / 100).toFixed(0)}`} accent={C.gold} sub="from paid vendors" />
        <StatCard label="Home Business"    value={paid.filter(r => r.space_type === 'home_business').length}        accent="#FF9933" sub="$351/spot" />
        <StatCard label="Established Biz"  value={paid.filter(r => r.space_type === 'established_business').length} accent="#FFD700" sub="$1,001/spot" />
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', color: '#F87171', fontSize: '14px' }}>
          ❌ {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        {/* Search */}
        <input
          type="text" placeholder="🔍  Search name, company, email, reg #..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 260px', padding: '9px 14px', borderRadius: '10px',
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
          }}
        />
        {/* Status */}
        {['all','paid','pending','failed'].map(s => (
          <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All Status' : s === 'paid' ? 'Paid' : s === 'pending' ? 'Pending' : 'Failed'}
          </FilterBtn>
        ))}
        {/* Space Categories */}
        {['all','home_business','established_business'].map(s => (
          <FilterBtn key={s} active={spaceFilter === s} onClick={() => setSpaceFilter(s)}>
            {s === 'all' ? 'All Categories' : s === 'home_business' ? 'Home Business' : 'Established Store'}
          </FilterBtn>
        ))}
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginLeft: '4px', fontWeight: '750' }}>
          {filtered.length} of {registrations.length}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading vendors…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
            {registrations.length === 0 ? 'No vendor registrations yet.' : 'No results match your filters.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,153,51,0.06)' }}>
                  {['Reg #', 'Vendor', 'Company', 'Space', 'Amount', 'Status', 'Date', ''].map(h => (
                    <th key={h} style={{ ...tdStyle, fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <>
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                      <td style={tdStyle}>
                        <code style={{ fontSize: '12px', color: C.saffron, fontWeight: '700', background: 'rgba(255,153,51,0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                          {r.registration_number}
                        </code>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{r.first_name} {r.last_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{r.email}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '600' }}>{r.company_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{r.city}, {r.state}</div>
                      </td>
                      <td style={tdStyle}><SpaceBadge type={r.space_type} /></td>
                      <td style={{ ...tdStyle, fontWeight: '800', color: r.payment_status === 'paid' ? '#10B981' : '#64748B' }}>
                        ${((r.amount_paid || 0) / 100).toFixed(2)}
                      </td>
                      <td style={tdStyle}><Badge status={r.payment_status} /></td>
                      <td style={{ ...tdStyle, color: '#64748B', fontSize: '12px' }}>
                        {r.registration_date ? new Date(r.registration_date).toLocaleDateString() : '—'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: '#64748B', fontSize: '16px' }}>{expanded === r.id ? '▲' : '▼'}</span>
                      </td>
                    </tr>
                    {/* Expanded detail row */}
                    {expanded === r.id && (
                      <tr key={`${r.id}-detail`}>
                        <td colSpan={8} style={{ padding: '0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ background: 'rgba(255,153,51,0.04)', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {[
                              { label: 'Full Address', value: `${r.address}, ${r.city}, ${r.state} ${r.zip}` },
                              { label: 'Phone',        value: r.phone || '—' },
                              { label: 'Stripe Ref',   value: r.stripe_payment_ref || '—' },
                              { label: 'Disclaimer',   value: r.disclaimer_accepted ? '✅ Accepted' : '❌ Not accepted' },
                              { label: 'Reg Date',     value: r.registration_date ? new Date(r.registration_date).toLocaleString() : '—' },
                              { label: 'Amount Due',   value: `$${((r.amount_due || 0) / 100).toFixed(2)}` },
                            ].map((item, i) => (
                              <div key={i}>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{item.label}</div>
                                <div style={{ fontSize: '13px', fontWeight: '600', wordBreak: 'break-all' }}>{item.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Row Actions */}
                          <div style={{ background: 'rgba(255,153,51,0.04)', padding: '0 24px 20px 24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setEditingReg(r)}
                              style={{
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)',
                                fontWeight: '700', fontSize: '12.5px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                              }}
                            >
                              ✏️ Edit Details
                            </button>
                            <button
                              onClick={() => handleResendEmail(r)}
                              disabled={resendingId === r.registration_number}
                              style={{
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)',
                                fontWeight: '700', fontSize: '12.5px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                              }}
                            >
                              {resendingId === r.registration_number
                                ? '⏳ Resending...'
                                : resendDone[r.registration_number]
                                ? '✅ Confirmation Sent!'
                                : '✉️ Resend Confirmation'}
                            </button>
                            <button
                              onClick={() => handleDeleteReg(r)}
                              style={{
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
                                backgroundColor: 'rgba(239,68,68,0.05)', color: '#F87171',
                                fontWeight: '700', fontSize: '12.5px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                              }}
                            >
                              🗑️ Delete Registration
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingReg && (
        <EditVendorModal
          reg={editingReg}
          onClose={() => setEditingReg(null)}
          onSave={handleSaveRegistration}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}

// ── Edit Vendor Modal ──────────────────────────────────────────────────────────
function EditVendorModal({ reg, onClose, onSave }) {
  const [form, setForm] = useState({
    first_name: reg.first_name || '',
    last_name: reg.last_name || '',
    company_name: reg.company_name || '',
    email: reg.email || '',
    phone: reg.phone || '',
    address: reg.address || '',
    city: reg.city || '',
    state: reg.state || '',
    zip: reg.zip || '',
    space_type: reg.space_type || 'home_business',
    quantity: reg.quantity || 1,
    payment_status: reg.payment_status || 'pending',
    amount_paid: ((reg.amount_paid || 0) / 100).toFixed(2),
    amount_due: ((reg.amount_due || 0) / 100).toFixed(2),
    stripe_payment_ref: reg.stripe_payment_ref || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/indiafest/registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reg.id, ...form }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update registration');
      }
      onSave(data.record);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input, #0A0A1A)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '32px', maxWidth: '640px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            ✏️ Edit Vendor Registration
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '20px', color: '#FCA5A5', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Row 1: Name */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First Name</label>
              <input value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last Name</label>
              <input value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} required style={inputStyle} />
            </div>
          </div>

          {/* Row 2: Company Name */}
          <div>
            <label style={labelStyle}>Company / Business Name</label>
            <input value={form.company_name} onChange={e => handleChange('company_name', e.target.value)} required style={inputStyle} />
          </div>

          {/* Row 3: Email & Phone */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone</label>
              <input value={form.phone} onChange={e => handleChange('phone', e.target.value)} required style={inputStyle} />
            </div>
          </div>

          {/* Row 4: Address */}
          <div>
            <label style={labelStyle}>Address</label>
            <input value={form.address} onChange={e => handleChange('address', e.target.value)} required style={inputStyle} />
          </div>

          {/* Row 5: City, State, ZIP */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>City</label>
              <input value={form.city} onChange={e => handleChange('city', e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>State</label>
              <input value={form.state} onChange={e => handleChange('state', e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1.5 }}>
              <label style={labelStyle}>ZIP Code</label>
              <input value={form.zip} onChange={e => handleChange('zip', e.target.value)} required style={inputStyle} />
            </div>
          </div>

          {/* Row 6: Space Type & Quantity */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Vendor Space Type</label>
              <select value={form.space_type} onChange={e => handleChange('space_type', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="home_business">Vendor – Small Business from Home ($351)</option>
                <option value="established_business">Vendor – Established Business/Stores ($1,001)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Quantity</label>
              <input type="number" min="1" max="10" value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} required style={inputStyle} />
            </div>
          </div>

          {/* Row 7: Payment Status & Stripe Ref */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Payment Status</label>
              <select value={form.payment_status} onChange={e => handleChange('payment_status', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="pending">⏳ Pending</option>
                <option value="paid">✓ Paid</option>
                <option value="failed">✗ Failed</option>
                <option value="refunded">↩ Refunded</option>
              </select>
            </div>
            <div style={{ flex: 1.5 }}>
              <label style={labelStyle}>Stripe Payment Ref</label>
              <input value={form.stripe_payment_ref} onChange={e => handleChange('stripe_payment_ref', e.target.value)} style={inputStyle} placeholder="ch_... or pi_..." />
            </div>
          </div>

          {/* Row 8: Amounts Paid & Due */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Amount Paid ($)</label>
              <input type="number" step="0.01" value={form.amount_paid} onChange={e => handleChange('amount_paid', e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Amount Due ($)</label>
              <input type="number" step="0.01" value={form.amount_due} onChange={e => handleChange('amount_due', e.target.value)} required style={inputStyle} />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)',
              backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: '750',
              fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 1.5, padding: '12px', borderRadius: '10px', border: 'none',
              backgroundColor: 'var(--accent)', color: '#FFFFFF', fontWeight: '850',
              fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
