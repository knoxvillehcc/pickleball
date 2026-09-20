'use client';
import { useState, useEffect, useCallback } from 'react';

export default function LedAdsAdminPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isPublished, setIsPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

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

  useEffect(() => { fetchRegistrations(); fetchSettings(); }, [fetchRegistrations, fetchSettings]);

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
    } catch (e) { setError(e.message); }
    finally { setPublishing(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this registration?')) return;
    try {
      const res = await fetch(`/api/led-ads/registrations?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchRegistrations();
      else throw new Error(data.error);
    } catch (e) { setError(e.message); }
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
    } catch (e) { setError(e.message); }
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
    // Simple print-based PDF export
    const rows = filtered.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.registration_number}</td>
        <td>${r.business_name}</td>
        <td>${r.contact_name}</td>
        <td>${r.email}</td>
        <td>${r.phone}</td>
        <td>${r.ad_description || '—'}</td>
        <td style="text-transform:capitalize">${r.payment_status}</td>
        ${withPrices ? `<td>$${((r.amount_paid || 0) / 100).toLocaleString()}</td>` : ''}
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head><title>LED Screen Ads Report</title>
    <style>body{font-family:system-ui;margin:24px}table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#FF9933;color:white;font-weight:700}
    h1{font-size:20px;margin-bottom:4px}p{color:#666;margin-bottom:16px}</style></head>
    <body><h1>📺 LED Screen Ads — Navratri 2026</h1>
    <p>Generated: ${new Date().toLocaleString()} · ${filtered.length} registrations${withPrices ? ` · Total Revenue: $${(totalRevenue / 100).toLocaleString()}` : ''}</p>
    <table><thead><tr><th>#</th><th>Reg #</th><th>Business</th><th>Contact</th><th>Email</th><th>Phone</th><th>Ad Description</th><th>Status</th>
    ${withPrices ? '<th>Amount</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const chipStyle = (status) => ({
    display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
    ...(status === 'paid' ? { background: '#DCFCE7', color: '#166534' } :
      status === 'pending' ? { background: '#FEF3C7', color: '#92400E' } :
      { background: '#FEE2E2', color: '#991B1B' }),
  });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Loading registrations...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📺 LED Screen Ads
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              {registrations.length} registrations · {paidCount} paid · {pendingCount} pending
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href="/" style={{
              padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: '600',
              fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
            }}>← Dashboard</a>
            <button onClick={togglePublish} disabled={publishing} style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: isPublished ? '#EF4444' : '#22C55E', color: 'white', fontWeight: '700', fontSize: '13px',
            }}>
              {publishing ? '...' : isPublished ? '🔴 Unpublish' : '🟢 Publish'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', marginBottom: '16px' }}>
            ❌ {error}
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Registrations', value: registrations.length, color: '#FF9933' },
            { label: 'Paid', value: paidCount, color: '#22C55E' },
            { label: 'Pending', value: pendingCount, color: '#F59E0B' },
            { label: 'Graphics ✅', value: graphicReceived, color: '#10B981' },
            { label: 'Graphics Missing', value: graphicMissing, color: '#EF4444' },
            { label: 'Revenue', value: `$${(totalRevenue / 100).toLocaleString()}`, color: '#8B5CF6' },
          ].map(kpi => (
            <div key={kpi.label} style={{
              padding: '20px', borderRadius: '14px', background: 'var(--bg-primary)',
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '8px' }}>{kpi.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Shareable link */}
        <div style={{
          padding: '14px 20px', borderRadius: '12px', marginBottom: '24px',
          background: isPublished ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${isPublished ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
        }}>
          <div>
            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>
              {isPublished ? '🟢 Registration is LIVE' : '🔴 Registration is UNPUBLISHED'}
            </span>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Share: <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/register/led-ads` : '/register/led-ads'}
              </code>
            </div>
          </div>
          <button onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/register/led-ads`);
            alert('Link copied!');
          }} style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
            color: 'var(--text-primary)',
          }}>📋 Copy Link</button>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, reg #..."
            style={{
              flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
            }}
          />
          {[['all', registrations.length], ['paid', paidCount], ['pending', pendingCount], ['missing_graphic', graphicMissing]].map(([f, count]) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)',
              background: filter === f ? (f === 'missing_graphic' ? '#EF4444' : '#FF9933') : 'var(--bg-secondary)',
              color: filter === f ? 'white' : 'var(--text-primary)',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
            }}>{f === 'missing_graphic' ? '🖼 Missing' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})</button>
          ))}
          <button onClick={() => exportPDF(true)} style={{
            padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)',
            background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
          }}>📄 Export PDF</button>
          <button onClick={() => exportPDF(false)} style={{
            padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)',
            background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
          }}>📄 Export (No Prices)</button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Reg #', 'Business', 'Contact', 'Email', 'Phone', 'Status', 'Amount', 'Graphic', ''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No registrations found.</td></tr>
              ) : filtered.map(r => {
                const hasGraphic = r.graphic_received || r.media_url;
                return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: '700', color: '#FF9933' }}>{r.registration_number}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '600', color: 'var(--text-primary)' }}>{r.business_name}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>{r.contact_name}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{r.email}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.phone}</td>
                  <td style={{ padding: '12px 14px' }}><span style={chipStyle(r.payment_status)}>{r.payment_status}</span></td>
                  <td style={{ padding: '12px 14px', fontWeight: '600', color: 'var(--text-primary)' }}>${((r.amount_paid || 0) / 100).toLocaleString()}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => toggleGraphicReceived(r.id, r.graphic_received)} title={hasGraphic ? 'Mark as missing' : 'Mark as received'} style={{
                        padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                        background: hasGraphic ? '#DCFCE7' : '#FEE2E2',
                        color: hasGraphic ? '#166534' : '#991B1B',
                      }}>{hasGraphic ? '✅' : '❌'}</button>
                      {r.media_url && (
                        <a href={r.media_url} target="_blank" rel="noreferrer" title="View uploaded media" style={{
                          padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: 'var(--bg-secondary)', fontSize: '11px', textDecoration: 'none',
                          color: 'var(--text-primary)', fontWeight: '600',
                        }}>📥</a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => handleDelete(r.id)} style={{
                      padding: '6px 10px', borderRadius: '6px', border: '1px solid #FCA5A5',
                      background: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                    }}>🗑</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
