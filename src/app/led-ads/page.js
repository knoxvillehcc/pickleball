'use client';
import { useState, useEffect, useCallback } from 'react';

function formatMMDDYYYY(d) {
  if (!d) return '—';
  const dateObj = typeof d === 'string' && d.includes('T') ? new Date(d) : new Date(d);
  if (isNaN(dateObj.getTime())) {
    const parts = String(d).split('-');
    if (parts.length === 3) return `${parts[1]}-${parts[2]}-${parts[0]}`;
    return String(d);
  }
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export default function LedAdsAdminPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isPublished, setIsPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Odoo General Entry Sync
  const [odooSyncStatus, setOdooSyncStatus] = useState(null);
  const [showOdooModal, setShowOdooModal] = useState(false);
  const [isSyncingOdoo, setIsSyncingOdoo] = useState(false);
  const [odooSyncMsg, setOdooSyncMsg] = useState('');
  const [forceOdooSync, setForceOdooSync] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    try {
      const res = await fetch('/api/led-ads/registrations');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRegistrations(data.registrations || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/led-ads/settings');
      const data = await res.json();
      setIsPublished(data.is_published);
    } catch { }
  }, []);

  const fetchOdooSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/led-ads/sync-odoo');
      const data = await res.json();
      if (data.success && data.syncInfo) setOdooSyncStatus(data.syncInfo);
    } catch { }
  }, []);

  useEffect(() => {
    fetchRegistrations();
    fetchSettings();
    fetchOdooSyncStatus();
  }, [fetchRegistrations, fetchSettings, fetchOdooSyncStatus]);

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/led-ads/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: !isPublished }),
      });
      const data = await res.json();
      if (data.success) setIsPublished(!isPublished);
    } catch (e) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this registration?')) return;
    try {
      const res = await fetch(`/api/led-ads/registrations?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchRegistrations();
      else throw new Error(data.error);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleGraphicReceived = async (id, current) => {
    try {
      const res = await fetch('/api/led-ads/registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, graphic_received: !current }),
      });
      const data = await res.json();
      if (data.success) fetchRegistrations();
      else throw new Error(data.error);
    } catch (e) {
      setError(e.message);
    }
  };

  // Post General Entry to Odoo
  const handlePostToOdoo = async (isForced = false) => {
    setIsSyncingOdoo(true);
    setOdooSyncMsg('');
    try {
      const res = await fetch('/api/led-ads/sync-odoo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: isForced }),
      });
      const data = await res.json();
      if (data.success) {
        setOdooSyncStatus(data.syncInfo);
        setOdooSyncMsg(`Success: General Entry ${data.syncInfo.moveName} posted to Odoo.`);
        setForceOdooSync(false);
      } else {
        setOdooSyncMsg(data.message || data.error || 'Failed to post General Entry to Odoo');
      }
    } catch (err) {
      setOdooSyncMsg(`Error: ${err.message}`);
    } finally {
      setIsSyncingOdoo(false);
    }
  };

  const filtered = registrations.filter(r => {
    if (filter === 'paid' && r.payment_status !== 'paid') return false;
    if (filter === 'pending' && r.payment_status !== 'pending') return false;
    if (filter === 'missing_graphic' && (r.graphic_received || r.media_url)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.business_name?.toLowerCase().includes(q) ||
        r.contact_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.registration_number?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalRevenue = registrations.filter(r => r.payment_status === 'paid').reduce((s, r) => s + (r.amount_paid || 0), 0);
  const paidCount = registrations.filter(r => r.payment_status === 'paid').length;
  const pendingCount = registrations.filter(r => r.payment_status === 'pending').length;
  const graphicMissing = registrations.filter(r => r.payment_status === 'paid' && !r.graphic_received && !r.media_url).length;
  const graphicReceived = registrations.filter(r => r.graphic_received || r.media_url).length;

  const exportPDF = (withPrices = true) => {
    const rows = filtered.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.registration_number}</td>
        <td>${r.business_name}</td>
        <td>${r.contact_name}</td>
        <td>${r.email}</td>
        <td>${r.phone}</td>
        <td>${formatMMDDYYYY(r.registration_date)}</td>
        <td>${r.ad_description || '—'}</td>
        <td style="text-transform:capitalize">${r.payment_status}</td>
        ${withPrices ? `<td>$${((r.amount_paid || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>` : ''}
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head><title>LED Screen Ads Report</title>
    <style>body{font-family:'Inter',system-ui,sans-serif;margin:24px;color:#0F172A}table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #CBD5E1;padding:7px 9px;text-align:left}th{background:#F8FAFC;color:#475569;font-weight:700;font-size:10px;text-transform:uppercase}
    h1{font-size:18px;margin-bottom:4px;color:#0F172A}p{color:#64748B;font-size:12px;margin-bottom:16px}</style></head>
    <body><h1>LED Screen Ads — Navratri 2026</h1>
    <p>Generated: ${formatMMDDYYYY(new Date())} · ${filtered.length} registrations${withPrices ? ` · Total Revenue: $${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}</p>
    <table><thead><tr><th>#</th><th>Reg #</th><th>Business</th><th>Contact</th><th>Email</th><th>Phone</th><th>Date</th><th>Ad Description</th><th>Status</th>
    ${withPrices ? '<th>Amount</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const copyPublicUrl = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/register/led-ads` : '/register/led-ads';
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2200);
  };

  const chipStyle = (status) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
    ...(status === 'paid' ? { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' } :
      status === 'pending' ? { background: 'rgba(245,158,11,0.1)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)' } :
      { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }),
  });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>Loading registrations...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 28px', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>

        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '950', color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
                LED Screen Ads — Navratri 2026
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
              {registrations.length} registrations · {paidCount} paid · {pendingCount} pending · Standard Rate: $1,500
            </p>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="/" style={{
              padding: '9px 15px', borderRadius: '10px', border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: '600',
              fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              <span>Dashboard</span>
            </a>

            {/* Public Link Copy Button */}
            <button
              onClick={copyPublicUrl}
              style={{
                padding: '9px 15px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: urlCopied ? '#10B981' : 'var(--text-primary)',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span>{urlCopied ? 'Link Copied' : 'Public Link'}</span>
            </button>

            {/* Registration Open/Closed Toggle */}
            <button onClick={togglePublish} disabled={publishing} style={{
              padding: '9px 15px', borderRadius: '10px',
              border: `1.5px solid ${isPublished ? '#10B981' : '#EF4444'}`,
              background: isPublished ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: isPublished ? '#10B981' : '#EF4444',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isPublished ? '#10B981' : '#EF4444' }} />
              <span>{publishing ? 'Saving...' : isPublished ? 'Registration Open' : 'Registration Closed'}</span>
            </button>

            {/* Post General Entry to Odoo */}
            <button
              onClick={() => { setOdooSyncMsg(''); setForceOdooSync(false); setShowOdooModal(true); }}
              style={{
                padding: '9px 15px', borderRadius: '10px',
                border: odooSyncStatus ? '1.5px solid rgba(16,185,129,0.5)' : '1px solid rgba(14,165,233,0.4)',
                background: odooSyncStatus ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.08)',
                color: odooSyncStatus ? '#10B981' : '#0284C7',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
              <span>{odooSyncStatus ? `Posted to Odoo (${odooSyncStatus.moveName || 'Synced'})` : 'Post General Entry to Odoo'}</span>
            </button>
          </div>
        </div>

        {/* Odoo Synced Notice Pill */}
        {odooSyncStatus && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderRadius: '12px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
            color: '#10B981', fontSize: '12.5px', fontWeight: '700', marginBottom: '20px',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Odoo General Entry Confirmed:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '800' }}>{odooSyncStatus.moveName}</span>
            <span>· Gross: ${Number(odooSyncStatus.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span>· Analytic: Navratri 2026</span>
            {odooSyncStatus.date && <span>· Date: {formatMMDDYYYY(odooSyncStatus.date)}</span>}
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── KPI CARDS ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Registrations', value: registrations.length, color: '#0284C7' },
            { label: 'Paid', value: paidCount, color: '#10B981' },
            { label: 'Pending', value: pendingCount, color: '#F59E0B' },
            { label: 'Graphics Received', value: graphicReceived, color: '#059669' },
            { label: 'Graphics Missing', value: graphicMissing, color: '#EF4444' },
            { label: 'Revenue Collected', value: `$${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: '#6366F1' },
          ].map(kpi => (
            <div key={kpi.label} style={{
              padding: '20px', borderRadius: '14px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>{kpi.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '950', color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* ── SEARCH & FILTER TOOLBAR ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by business, contact, email, reg #..."
              style={{
                width: '100%', padding: '10px 14px 10px 36px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {[['all', registrations.length], ['paid', paidCount], ['pending', pendingCount], ['missing_graphic', graphicMissing]].map(([f, count]) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--border)',
              background: filter === f ? '#0284C7' : 'var(--bg-card)',
              color: filter === f ? '#FFFFFF' : 'var(--text-primary)',
              fontWeight: '700', fontSize: '12.5px', cursor: 'pointer',
            }}>{f === 'missing_graphic' ? 'Missing Graphics' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})</button>
          ))}

          <button onClick={() => exportPDF(true)} style={{
            padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>Export PDF</span>
          </button>
          <button onClick={() => exportPDF(false)} style={{
            padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer',
          }}>No Prices</button>
        </div>

        {/* ── TABLE ───────────────────────────────────────────────────────────── */}
        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: 'var(--shadow)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                {['Reg #', 'Business Name', 'Contact', 'Email', 'Phone', 'Date (MM-DD-YYYY)', 'Status', 'Amount', 'Graphic', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800', color: 'var(--text-secondary)', fontSize: '11px', letterSpacing: '0.6px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No registrations found.</td></tr>
              ) : filtered.map(r => {
                const hasGraphic = r.graphic_received || r.media_url;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0284C7', fontFamily: 'monospace' }}>{r.registration_number}</td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-primary)' }}>{r.business_name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>{r.contact_name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{r.email}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.phone || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '12px' }}>{formatMMDDYYYY(r.registration_date)}</td>
                    <td style={{ padding: '12px 14px' }}><span style={chipStyle(r.payment_status)}>{r.payment_status}</span></td>
                    <td style={{ padding: '12px 14px', fontWeight: '800', color: 'var(--text-primary)' }}>${((r.amount_paid || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => toggleGraphicReceived(r.id, r.graphic_received)}
                          title={hasGraphic ? 'Click to mark as missing' : 'Click to mark as received'}
                          style={{
                            padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                            background: hasGraphic ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: hasGraphic ? '#10B981' : '#EF4444',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasGraphic ? '#10B981' : '#EF4444' }} />
                          <span>{hasGraphic ? 'Received' : 'Missing'}</span>
                        </button>
                        {r.media_url && (
                          <a href={r.media_url} target="_blank" rel="noreferrer" title="Download media graphic" style={{
                            padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)', fontSize: '11px', textDecoration: 'none',
                            color: 'var(--text-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px',
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            <span>File</span>
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => handleDelete(r.id)} style={{
                        padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: ODOO GENERAL ENTRY SYNC ───────────────────────────────────── */}
      {showOdooModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ maxWidth: '540px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(14,165,233,0.1)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>
                    Odoo General Entry
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Navratri 2026 LED Screen Ads Final Settlement
                  </div>
                </div>
              </div>
              <button onClick={() => setShowOdooModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Already Synced Warning */}
            {odooSyncStatus && !forceOdooSync ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontWeight: '800', fontSize: '14px', marginBottom: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>Duplicate Blocked: Already Posted to Odoo</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                    LED Ads revenue was previously posted to Odoo under journal entry:
                  </p>
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontWeight: '800', fontSize: '13.5px', color: '#0284C7' }}>
                    <span>{odooSyncStatus.moveName}</span>
                    <span>${Number(odooSyncStatus.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Reference: {odooSyncStatus.ref || 'NAVRATRI-2026-LED-ADS-FINAL'} · Date: {odooSyncStatus.date ? formatMMDDYYYY(odooSyncStatus.date) : 'N/A'}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  To avoid double-counting revenue, posting again is restricted. If you made corrections and strictly require re-posting, use Force Re-sync below.
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowOdooModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}>
                    Close
                  </button>
                  <button onClick={() => setForceOdooSync(true)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #D97706', background: 'rgba(245,158,11,0.1)', color: '#D97706', fontWeight: '800', cursor: 'pointer' }}>
                    Force Re-sync
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {forceOdooSync && (
                  <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid #F59E0B', color: '#D97706', fontSize: '12px', fontWeight: '700' }}>
                    Force Re-sync mode active. A new General Entry will be created.
                  </div>
                )}

                <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Event / Analytic Account:</span>
                    <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>Navratri 2026</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Odoo Journal:</span>
                    <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>MISC (General Operations)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Paid Advertisers:</span>
                    <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{paidCount} advertisers</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Credit Revenue (Acct 2005):</span>
                    <span style={{ fontWeight: '800', color: '#10B981' }}>+${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Debit CC Fees (Acct 950):</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>+${(totalRevenue / 100 * 0.029 + paidCount * 0.30).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Debit HCC Bank (Acct 101401):</span>
                    <span style={{ fontWeight: '950', color: '#0284C7' }}>${((totalRevenue / 100) - (totalRevenue / 100 * 0.029 + paidCount * 0.30)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                  This creates and confirms a balanced General Journal Entry in Odoo tagged with the <strong>Navratri 2026</strong> analytic account. Strict duplicate checks ensure this reference can only be submitted once.
                </div>

                {odooSyncMsg && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700',
                    background: odooSyncMsg.startsWith('Success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: odooSyncMsg.startsWith('Success') ? '#10B981' : '#EF4444',
                    border: `1px solid ${odooSyncMsg.startsWith('Success') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {odooSyncMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowOdooModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => handlePostToOdoo(forceOdooSync)} disabled={isSyncingOdoo || paidCount === 0} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: isSyncingOdoo ? 'rgba(14,165,233,0.5)' : 'linear-gradient(135deg, #0284C7, #0369A1)', color: '#FFFFFF', fontWeight: '800', cursor: isSyncingOdoo || paidCount === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {isSyncingOdoo ? 'Posting to Odoo...' : 'Confirm & Post General Entry'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
