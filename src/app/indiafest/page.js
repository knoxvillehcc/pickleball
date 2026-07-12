'use client';
import { useState, useEffect, useCallback } from 'react';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  saffron: '#FF9933',
  gold:    '#FFD700',
  bg:      'var(--bg-card)',
  border:  'var(--border)',
};

const SPACE_LABELS = {
  small:  { label: 'Small',  size: '10×10 ft', price: '$100' },
  medium: { label: 'Medium', size: '10×20 ft', price: '$150' },
  large:  { label: 'Large',  size: '20×20 ft', price: '$200' },
};

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    paid:     { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: '#10B981', label: '✓ Paid' },
    pending:  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: '#F59E0B', label: '⏳ Pending' },
    failed:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#EF4444', label: '✗ Failed' },
    refunded: { bg: 'rgba(148,163,184,0.15)',border: 'rgba(148,163,184,0.4)',color: '#94A3B8', label: '↩ Refunded' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '700',
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
    small:  { bg: 'rgba(255,153,51,0.12)', border: 'rgba(255,153,51,0.3)', color: '#FF9933' },
    medium: { bg: 'rgba(255,215,0,0.12)',  border: 'rgba(255,215,0,0.3)',  color: '#FFD700' },
    large:  { bg: 'rgba(250,128,114,0.12)',border: 'rgba(250,128,114,0.3)',color: '#FA8072' },
  };
  const c = colors[type] || colors.small;
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '700',
      backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}>
      🏪 {s.label} · {s.size} · {s.price}
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      backgroundColor: C.bg, border: `1px solid ${C.border}`,
      borderRadius: '16px', padding: '24px', borderTop: `2px solid ${accent}`,
      flex: '1 1 160px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>
        {label}
      </div>
      <div style={{ fontSize: '40px', fontWeight: '900', color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>{sub}</div>}
    </div>
  );
}

// ── Filter button ──────────────────────────────────────────────────────────────
function FilterBtn({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: '8px',
      border: `1px solid ${active ? C.saffron : 'rgba(51,65,85,0.6)'}`,
      backgroundColor: active ? 'rgba(255,153,51,0.12)' : 'transparent',
      color: active ? C.saffron : '#64748B',
      fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
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

  // ── Export handler ────────────────────────────────────────────────────────
  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = await fetch(`/api/indiafest/export?format=${format}`);
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
            ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
          border: `1px solid ${isPublished ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.3)'}`,
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        }}>
          {/* Status dot + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
      a.remove();
    } catch (err) {
      alert('Failed to export: ' + err.message);
    } finally {
      setExporting(null);
    }
  }

  const paid    = registrations.filter(r => r.payment_status === 'paid');
  const pending = registrations.filter(r => r.payment_status === 'pending');
  const revenue = paid.reduce((acc, r) => acc + (r.amount_paid || 0), 0);

  const filtered = registrations.filter(r => {
    const query = search.toLowerCase();
    const matchesSearch =
      (r.first_name || '').toLowerCase().includes(query) ||
      (r.last_name  || '').toLowerCase().includes(query) ||
      (r.company_name||'').toLowerCase().includes(query) ||
      (r.email      || '').toLowerCase().includes(query) ||
      (r.registration_number || '').toLowerCase().includes(query);

    const matchesStatus =
      filter === 'all' ||
      (filter === 'paid' && r.payment_status === 'paid') ||
      (filter === 'pending' && r.payment_status === 'pending') ||
      (filter === 'failed' && r.payment_status === 'failed');

    const matchesSpace =
      spaceFilter === 'all' ||
      (spaceFilter === 'small' && r.space_type === 'home_business') ||
      (spaceFilter === 'medium' && r.space_type === 'established_business');

    return matchesSearch && matchesStatus && matchesSpace;
  });

  const tdStyle = { padding: '16px 20px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

  return (
    <div style={{ paddingBottom: '60px' }}>
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
            color: 'var(--text)', fontSize: '13px', outline: 'none',
          }}
        />
        {/* Status */}
        {['all','paid','pending','failed'].map(s => (
          <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
          </FilterBtn>
        ))}
        {/* Space */}
        {['all','small','medium','large'].map(s => (
          <FilterBtn key={s} active={spaceFilter === s} onClick={() => setSpaceFilter(s)}>
            {s === 'all' ? 'All Spaces' : `${s.charAt(0).toUpperCase() + s.slice(1)}`}
          </FilterBtn>
        ))}
        <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '4px' }}>
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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}
