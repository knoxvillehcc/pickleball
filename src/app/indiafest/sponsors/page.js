'use client';
import { useState, useEffect, useCallback } from 'react';

const GOLD = '#D4AF37';

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    paid:     { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: 'var(--text-success)', label: '✓ Paid' },
    pending:  { bg: 'rgba(212,175,55,0.15)', border: 'rgba(212,175,55,0.4)', color: GOLD,                  label: '⏳ Pending' },
    failed:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: 'var(--text-error)',   label: '✗ Failed' },
    refunded: { bg: 'rgba(148,163,184,0.15)',border: 'rgba(148,163,184,0.4)',color: 'var(--text-muted)',   label: '↩ Refunded' },
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

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
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
      border: `1px solid ${active ? GOLD : 'var(--border)'}`,
      backgroundColor: active ? 'rgba(212,175,55,0.10)' : 'var(--bg-card)',
      color: active ? GOLD : 'var(--text-secondary)',
      fontWeight: '800', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
      fontFamily: 'inherit',
    }}>
      {children}
    </button>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function SponsorDashboard() {
  const [registrations,   setRegistrations]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [search,          setSearch]          = useState('');
  const [filter,          setFilter]          = useState('all');
  const [tierFilter,      setTierFilter]      = useState('all');
  const [expanded,        setExpanded]        = useState(null);
  const [isGrandPublished,setIsGrandPublished]= useState(false);
  const [isBasicPublished,setIsBasicPublished]= useState(false);
  const [publishing,      setPublishing]      = useState(null); // 'grand' | 'basic' | null
  const [urlCopied,       setUrlCopied]       = useState(false);
  const [currentUser,     setCurrentUser]     = useState(null);
  const [editingReg,      setEditingReg]      = useState(null);
  const [resendingId,     setResendingId]     = useState(null);
  const [resendDone,      setResendDone]      = useState({});

  const PUBLIC_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/register/indiafest/sponsor`
    : '/register/indiafest/sponsor';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/indiafest/sponsor/registrations');
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
    fetch('/api/indiafest/sponsor/settings?key=is_published')
      .then(r => r.json())
      .then(d => setIsGrandPublished(d.is_published === true || d.value === 'true'))
      .catch(() => {});
    fetch('/api/indiafest/sponsor/settings?key=basic_is_published')
      .then(r => r.json())
      .then(d => setIsBasicPublished(d.is_published === true || d.value === 'true'))
      .catch(() => {});
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setCurrentUser(d.user || null))
      .catch(() => {});
  }, [load]);

  const handlePublishToggle = async (tierKey) => {
    setPublishing(tierKey);
    const isGrand = tierKey === 'grand';
    const current = isGrand ? isGrandPublished : isBasicPublished;
    const next    = !current;
    const settingKey = isGrand ? 'is_published' : 'basic_is_published';
    try {
      const res  = await fetch('/api/indiafest/sponsor/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingKey, value: String(next) }),
      });
      const data = await res.json();
      if (data.success) {
        if (isGrand) setIsGrandPublished(next);
        else         setIsBasicPublished(next);
      }
    } catch (e) { console.error(e); }
    finally { setPublishing(null); }
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(PUBLIC_URL);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleResendEmail = async (reg) => {
    setResendingId(reg.registration_number);
    try {
      const res = await fetch('/api/indiafest/sponsor/resend-email', {
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
    if (!confirm(`Are you sure you want to delete sponsor registration ${reg.registration_number} for ${reg.first_name} ${reg.last_name} (${reg.company_name})? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/indiafest/sponsor/registrations?id=${reg.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete');
      setRegistrations(prev => prev.filter(r => r.id !== reg.id));
      setExpanded(null);
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  const handleSaveRegistration = (updatedRecord) => {
    setRegistrations(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const grandRegs  = registrations.filter(r => r.space_type === 'grand_sponsor');
  const basicRegs  = registrations.filter(r => r.space_type === 'basic_sponsor');
  const paid       = registrations.filter(r => r.payment_status === 'paid');
  const pending    = registrations.filter(r => r.payment_status === 'pending');
  const revenue    = paid.reduce((sum, r) => sum + (r.amount_paid || 0), 0);

  // ── Filter + search ─────────────────────────────────────────────────────────
  const filtered = registrations.filter(r => {
    const matchStatus = filter === 'all' || r.payment_status === filter;
    const matchTier   = tierFilter === 'all' || r.space_type === tierFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || [
      r.first_name, r.last_name, r.company_name, r.email,
      r.registration_number, r.city,
    ].some(f => f?.toLowerCase().includes(q));
    return matchStatus && matchTier && matchSearch;
  });

  // ── CSV export ──────────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = ['Reg #', 'First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 'Amount', 'Status', 'Date'];
    const rows = filtered.map(r => [
      r.registration_number, r.first_name, r.last_name, r.company_name,
      r.email, r.phone, r.address, r.city, r.state, r.zip,
      `$${((r.amount_paid || 0) / 100).toFixed(2)}`,
      r.payment_status,
      r.registration_date ? new Date(r.registration_date).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `grand-sponsors-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const tdStyle = { padding: '14px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── Publish Banner — super_admin only ──────────────────────────────── */}
      {currentUser?.role === 'super_admin' && (
        <div style={{
          borderRadius: '16px', padding: '18px 24px', marginBottom: '24px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '14px' }}>Registration Controls</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* Grand Sponsor toggle */}
            <div style={{ flex: 1, minWidth: '260px', background: isGrandPublished ? 'rgba(16,185,129,0.08)' : 'rgba(212,175,55,0.08)', border: `1px solid ${isGrandPublished ? 'var(--text-success)' : GOLD}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px' }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '14px', color: isGrandPublished ? 'var(--text-success)' : GOLD }}>Grand Sponsor: {isGrandPublished ? '🌐 LIVE' : '🔒 CLOSED'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>$5,001 · {grandRegs.length} registered</div>
              </div>
              <button onClick={() => handlePublishToggle('grand')} disabled={publishing === 'grand'} style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: publishing === 'grand' ? 'rgba(51,65,85,0.5)' : isGrandPublished ? 'linear-gradient(135deg, #EF4444, #DC2626)' : `linear-gradient(135deg, ${GOLD}, #B8960C)`,
                color: publishing === 'grand' ? '#475569' : isGrandPublished ? 'white' : '#1A1200',
                fontWeight: '800', fontSize: '13px', cursor: publishing === 'grand' ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>
                {publishing === 'grand' ? '⏳ Saving...' : isGrandPublished ? '🔒 Unpublish' : '🌐 Publish'}
              </button>
            </div>
            {/* Basic Sponsor toggle */}
            <div style={{ flex: 1, minWidth: '260px', background: isBasicPublished ? 'rgba(16,185,129,0.08)' : 'rgba(45,122,58,0.08)', border: `1px solid ${isBasicPublished ? 'var(--text-success)' : '#2D7A3A'}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px' }}>🌟</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '14px', color: isBasicPublished ? 'var(--text-success)' : '#2D7A3A' }}>Basic Sponsor: {isBasicPublished ? '🌐 LIVE' : '🔒 CLOSED'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>$1,001 · {basicRegs.length} registered</div>
              </div>
              <button onClick={() => handlePublishToggle('basic')} disabled={publishing === 'basic'} style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: publishing === 'basic' ? 'rgba(51,65,85,0.5)' : isBasicPublished ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #2D7A3A, #1E5C2A)',
                color: publishing === 'basic' ? '#475569' : 'white',
                fontWeight: '800', fontSize: '13px', cursor: publishing === 'basic' ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>
                {publishing === 'basic' ? '⏳ Saving...' : isBasicPublished ? '🔒 Unpublish' : '🌐 Publish'}
              </button>
            </div>
          </div>
          {(isGrandPublished || isBasicPublished) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>{PUBLIC_URL}</span>
              <button onClick={copyPublicUrl} style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: urlCopied ? 'rgba(16,185,129,0.15)' : 'transparent', color: 'var(--text-success)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{urlCopied ? '✅ Copied!' : '📋 Copy URL'}</button>
              <a href={PUBLIC_URL} target="_blank" rel="noreferrer" style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-success)', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>↗ Preview</a>
            </div>
          )}
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '950', letterSpacing: '-0.5px' }}>
              Grand Sponsor{' '}
              <span style={{ background: `linear-gradient(135deg, ${GOLD} 30%, #F5D060 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Manager
              </span>
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13.5px', fontWeight: '500' }}>India Fest 2026 · Grand Sponsor Registrations Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={load} style={{
            background: loading ? `rgba(212,175,55,0.3)` : `linear-gradient(135deg, ${GOLD}, #B8960C)`,
            color: loading ? 'var(--text-muted)' : '#1A1200', fontWeight: '800', fontSize: '14px', padding: '12px 24px',
            borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            boxShadow: `0 4px 12px rgba(212,175,55,0.25)`,
          }}>
            {loading
              ? <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(26,18,0,0.3)', borderTop: '2px solid #1A1200', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/> Loading...</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.09-4.82"/></svg> Refresh</>
            }
          </button>
          <button onClick={exportCSV} style={{
            background: 'transparent', border: `1px solid rgba(212,175,55,0.4)`,
            color: GOLD, fontWeight: '600', fontSize: '13px',
            padding: '12px 18px', borderRadius: '10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}>
            📄 Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Total Sponsors"     value={registrations.length} accent={GOLD}      sub={`${grandRegs.length} grand · ${basicRegs.length} basic`} />
        <StatCard label="Confirmed (Paid)"   value={paid.length}          accent="#10B981"   sub={`${pending.length} pending`} />
        <StatCard label="Revenue Collected"  value={`$${(revenue / 100).toFixed(0)}`}        accent={GOLD}  sub="from confirmed sponsors" />
        <StatCard label="Grand Revenue"  value={`$${(grandRegs.filter(r=>r.payment_status==='paid').reduce((s,r)=>s+(r.amount_paid||0),0)/100).toFixed(0)}`} accent="#B8960C" sub="grand sponsors" />
        <StatCard label="Basic Revenue"  value={`$${(basicRegs.filter(r=>r.payment_status==='paid').reduce((s,r)=>s+(r.amount_paid||0),0)/100).toFixed(0)}`} accent="#2D7A3A" sub="basic sponsors" />
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', color: '#F87171', fontSize: '14px' }}>
          ❌ {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <input
          type="text" placeholder="🔍  Search name, company, email, reg #..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 260px', padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
        />
        {['all','paid','pending','failed'].map(s => (
          <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All Status' : s === 'paid' ? 'Paid' : s === 'pending' ? 'Pending' : 'Failed'}
          </FilterBtn>
        ))}
        <div style={{ width: '1px', height: '28px', background: 'var(--border)', margin: '0 4px' }}/>
        {[{ k:'all', label:'All Tiers' }, { k:'grand_sponsor', label:'🏆 Grand' }, { k:'basic_sponsor', label:'🌟 Basic' }].map(({ k, label }) => (
          <FilterBtn key={k} active={tierFilter === k} onClick={() => setTierFilter(k)}>{label}</FilterBtn>
        ))}
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginLeft: '4px', fontWeight: '750' }}>
          {filtered.length} of {registrations.length}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading sponsors…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
            {registrations.length === 0 ? 'No grand sponsor registrations yet.' : 'No results match your filters.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: `rgba(212,175,55,0.06)` }}>
                  {['Reg #', 'Tier', 'Sponsor', 'Company', 'Amount', 'Status', 'Date', ''].map(h => (
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
                        <code style={{ fontSize: '12px', color: r.space_type === 'basic_sponsor' ? '#2D7A3A' : GOLD, fontWeight: '700', background: r.space_type === 'basic_sponsor' ? 'rgba(45,122,58,0.1)' : 'rgba(212,175,55,0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                          {r.registration_number}
                        </code>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', background: r.space_type === 'basic_sponsor' ? 'rgba(45,122,58,0.12)' : 'rgba(212,175,55,0.12)', color: r.space_type === 'basic_sponsor' ? '#2D7A3A' : GOLD, border: `1px solid ${r.space_type === 'basic_sponsor' ? '#2D7A3A40' : GOLD + '40'}` }}>
                          {r.space_type === 'basic_sponsor' ? '🌟 Basic' : '🏆 Grand'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{r.first_name} {r.last_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{r.email}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '600' }}>{r.company_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{r.city}, {r.state}</div>
                      </td>
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
                          <div style={{ background: `rgba(212,175,55,0.04)`, padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
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

                          {/* Row actions */}
                          <div style={{ background: `rgba(212,175,55,0.04)`, padding: '0 24px 20px 24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setEditingReg(r)}
                              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                            >
                              ✏️ Edit Details
                            </button>
                            <button
                              onClick={() => handleResendEmail(r)}
                              disabled={resendingId === r.registration_number}
                              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                            >
                              {resendingId === r.registration_number
                                ? '⏳ Resending...'
                                : resendDone[r.registration_number]
                                ? '✅ Confirmation Sent!'
                                : '✉️ Resend Confirmation'}
                            </button>
                            <button
                              onClick={() => handleDeleteReg(r)}
                              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)', color: '#F87171', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
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
        <EditSponsorModal
          reg={editingReg}
          onClose={() => setEditingReg(null)}
          onSave={handleSaveRegistration}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Edit Sponsor Modal ─────────────────────────────────────────────────────────
function EditSponsorModal({ reg, onClose, onSave }) {
  const [form, setForm] = useState({
    first_name:         reg.first_name || '',
    last_name:          reg.last_name || '',
    company_name:       reg.company_name || '',
    email:              reg.email || '',
    phone:              reg.phone || '',
    address:            reg.address || '',
    city:               reg.city || '',
    state:              reg.state || '',
    zip:                reg.zip || '',
    payment_status:     reg.payment_status || 'pending',
    amount_paid:        ((reg.amount_paid || 0) / 100).toFixed(2),
    amount_due:         ((reg.amount_due || 0) / 100).toFixed(2),
    stripe_payment_ref: reg.stripe_payment_ref || '',
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/indiafest/sponsor/registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reg.id, ...form }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update');
      onSave(data.record);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

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
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            ✏️ Edit Sponsor Registration
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '20px', color: '#FCA5A5', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <div>
            <label style={labelStyle}>Company / Organization Name</label>
            <input value={form.company_name} onChange={e => handleChange('company_name', e.target.value)} required style={inputStyle} />
          </div>
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
          <div>
            <label style={labelStyle}>Address</label>
            <input value={form.address} onChange={e => handleChange('address', e.target.value)} required style={inputStyle} />
          </div>
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
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: '750', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1.5, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: GOLD, color: '#1A1200', fontWeight: '850', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s', fontFamily: 'inherit' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
