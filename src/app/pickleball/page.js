'use client';
import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  saffron: '#F4A40B',
  gold:    '#D4AF37',
  maroon:  '#7B1C1C',
  cream:   '#FFF8F0',
};

const card = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  overflow: 'hidden',
};

// ── Badge component ───────────────────────────────────────────────────────────
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
      display: 'inline-block', padding: '4px 12px', borderRadius: '99px', fontSize: '11px',
      fontWeight: '700', backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ── Skill badge ───────────────────────────────────────────────────────────────
function SkillBadge({ level }) {
  const map = {
    beginner:     { emoji: '🌱', color: '#10B981' },
    intermediate: { emoji: '⭐', color: '#F59E0B' },
    advanced:     { emoji: '🏆', color: '#818CF8' },
  };
  const s = map[level] || {};
  return (
    <span style={{ color: s.color, fontWeight: '700', fontSize: '13px' }}>
      {s.emoji} {level ? level.charAt(0).toUpperCase() + level.slice(1) : '–'}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      ...card,
      padding: '24px',
      borderTop: `2px solid ${accent}`,
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

// ── Filter button ─────────────────────────────────────────────────────────────
function FilterBtn({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: '8px', border: `1px solid ${active ? C.saffron : 'rgba(51,65,85,0.6)'}`,
      backgroundColor: active ? `rgba(244,164,11,0.15)` : 'transparent',
      color: active ? C.saffron : '#64748B', fontWeight: '600', fontSize: '13px',
      cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
// ── Send Payment Link modal state ────────────────────────────────────────────
function PaymentLinkModal({ reg, onClose }) {
  const [loading,  setLoading]  = useState(false);
  const [linkUrl,  setLinkUrl]  = useState('');
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState('');

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/pickleball/payment-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_number: reg.registration_number }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      setLinkUrl(data.payment_url);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const emailLink = () => {
    const subject = encodeURIComponent('HCC Pickleball — Complete Your Registration Payment');
    const body = encodeURIComponent(
      `Dear ${reg.full_name},\n\nThank you for registering for the HCC Pickleball Tournament!\n\n` +
      `Your registration (#${reg.registration_number}) is pending payment. Please use the link below to complete your payment:\n\n` +
      `${linkUrl}\n\n` +
      `This link is secure and will take you directly to our payment page.\n\n` +
      `If you have any questions, please contact us at knoxhcc@gmail.com.\n\n` +
      `Thank you,\nHCC Team`
    );
    window.open(`mailto:${reg.email}?subject=${subject}&body=${body}`);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-modal)', border: '1px solid var(--border-modal)',
        borderRadius: '20px', padding: '32px', maxWidth: '540px', width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            📧 Send Payment Link
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Player</div>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{reg.full_name}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{reg.email}</div>
          <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '6px', fontFamily: 'monospace' }}>{reg.registration_number} · ⏳ Pending Payment</div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', color: '#FCA5A5', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {!linkUrl ? (
          <button onClick={generate} disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: loading ? 'rgba(51,65,85,0.5)' : 'linear-gradient(135deg, #F4A40B, #D4AF37)',
            color: loading ? '#475569' : '#000', fontWeight: '800', fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {loading
              ? <><span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid black', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/> Generating link...</>
              : <>🔗 Generate Payment Link</>}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', wordBreak: 'break-all', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {linkUrl}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={copy} style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.4)',
                background: copied ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: '#10B981', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {copied ? '✅ Copied!' : '📋 Copy Link'}
              </button>
              <button onClick={emailLink} style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #F4A40B, #D4AF37)',
                color: '#000', fontWeight: '800', fontSize: '14px', cursor: 'pointer',
              }}>
                📧 Open Email
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              "Open Email" will open your email app pre-filled with the payment link ready to send.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function PickleballDashboard() {
  const [records,      setRecords]      = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter,       setFilter]       = useState({ payment: '', skill: '' });
  const [sortField,    setSortField]    = useState('registration_date');
  const [sortDir,      setSortDir]      = useState('desc');
  const [exporting,    setExporting]    = useState('');
  const [payLinkReg,   setPayLinkReg]   = useState(null);
  const [editingReg,   setEditingReg]   = useState(null);
  const [isPublished,  setIsPublished]  = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [urlCopied,    setUrlCopied]    = useState(false);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [resendingId,  setResendingId]  = useState(null);
  const [resendDone,   setResendDone]   = useState({});

  const PUBLIC_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/register/pickleball`
    : '/register/pickleball';

  // Load publish status + current user role on mount
  useEffect(() => {
    fetch('/api/pickleball/settings?key=is_published')
      .then(r => r.json())
      .then(d => setIsPublished(d.is_published === true || d.value === 'true'))
      .catch(() => {});
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setCurrentUser(d.user || null))
      .catch(() => {});
  }, []);

  const handlePublishToggle = async () => {
    setPublishing(true);
    const next = !isPublished;
    try {
      const res  = await fetch('/api/pickleball/settings', {
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

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch registrations
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter.payment)     params.set('payment_status', filter.payment);
      if (filter.skill)       params.set('skill_level', filter.skill);
      if (debouncedSearch)    params.set('search', debouncedSearch);

      const res  = await fetch(`/api/pickleball/registrations?${params}`);
      
      if (!res.ok) {
        try {
          const data = await res.json();
          throw new Error(data.error || `Server error (HTTP ${res.status})`);
        } catch {
          throw new Error(`Server returned HTTP ${res.status} (${res.statusText})`);
        }
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server returned an invalid HTML/text response instead of JSON.');
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRecords(data.records);
      setStats(data.stats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side sort
  const sorted = [...records].sort((a, b) => {
    const va = a[sortField] ?? '';
    const vb = b[sortField] ?? '';
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIndicator = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '4px' }}>
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  // Export handler
  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = await fetch(`/api/pickleball/export?format=${format}`);
      const blob = await res.blob();
      const ext = { csv: 'csv', excel: 'xls', pdf: 'html' }[format];
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url;
      a.download = `pickleball-registrations-${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setExporting('');
    }
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      const dateStr = new Date().toLocaleDateString();
      const timeStr = new Date().toLocaleTimeString();
      const userName = currentUser?.name || currentUser?.email || 'Admin';

      doc.setFontSize(20);
      doc.text('HCC Pickleball Tournament Registrations', 10, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Printed by: ${userName}  |  Date: ${dateStr}  |  Time: ${timeStr}`, 10, 22);

      const tableBody = sorted.map(r => [
        r.registration_number || '',
        r.full_name || '',
        r.team_name || '',
        r.partner_name || '',
        r.email || '',
        r.phone || '',
        r.skill_level ? r.skill_level.charAt(0).toUpperCase() + r.skill_level.slice(1) : '',
        r.registration_date ? r.registration_date.split('T')[0] : '',
        r.payment_status ? r.payment_status.toUpperCase() : '',
        '$' + (r.amount_paid || 0).toFixed(2)
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Reg #', 'Name', 'Team Name', 'Partner Name', 'Email', 'Phone', 'Skill', 'Date', 'Status', 'Amount']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [123, 28, 28] }, // Maroon (#7B1C1C)
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { top: 10, bottom: 10, left: 10, right: 10 },
      });

      doc.save('Pickleball_Registrations_' + dateStr.replace(/\//g, '-') + '.pdf');
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    }
  };

  const setPaymentFilter = (v) => setFilter(f => ({ ...f, payment: f.payment === v ? '' : v }));
  const setSkillFilter   = (v) => setFilter(f => ({ ...f, skill:   f.skill   === v ? '' : v }));
  const clearFilters     = () => { setFilter({ payment: '', skill: '' }); setSearch(''); };

  const handleResendEmail = async (reg) => {
    setResendingId(reg.registration_number);
    try {
      const res  = await fetch('/api/pickleball/resend-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
      {payLinkReg && <PaymentLinkModal reg={payLinkReg} onClose={() => setPayLinkReg(null)} />}
      {editingReg && (
        <EditRegistrationModal
          reg={editingReg}
          onClose={() => setEditingReg(null)}
          onSave={(updatedRecord) => {
            setRecords(prev => prev.map(r => r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r));
            fetchData();
          }}
        />
      )}

      {/* ── Publish Banner — super_admin only ────────────────────────── */}
      {currentUser?.role === 'super_admin' && <div style={{
        ...card,
        padding: '20px 24px',
        background: isPublished
          ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))'
          : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
        borderColor: isPublished ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.3)',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
            backgroundColor: isPublished ? '#10B981' : '#F59E0B',
            boxShadow: isPublished ? '0 0 8px #10B981' : '0 0 8px #F59E0B',
            animation: 'pulse 2s infinite',
          }}/>
          <span style={{ fontWeight: '800', fontSize: '15px', color: isPublished ? '#10B981' : '#F59E0B' }}>
            Registration Page: {isPublished ? '🌐 LIVE' : '🔒 CLOSED'}
          </span>
        </div>

        {/* URL display (only when published) */}
        {isPublished && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', background: 'rgba(8,12,24,0.5)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(51,65,85,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {PUBLIC_URL}
            </span>
            <button onClick={copyPublicUrl} style={{
              padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.4)',
              background: urlCopied ? 'rgba(16,185,129,0.2)' : 'transparent',
              color: '#10B981', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {urlCopied ? '✅ Copied!' : '📋 Copy URL'}
            </button>
            <a href={PUBLIC_URL} target="_blank" rel="noreferrer" style={{
              padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)',
              background: 'transparent', color: '#10B981', fontSize: '12px',
              fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap',
            }}>↗ Preview</a>
          </div>
        )}

        {/* Publish toggle button */}
        <button onClick={handlePublishToggle} disabled={publishing} style={{
          marginLeft: 'auto', padding: '10px 20px', borderRadius: '10px', border: 'none',
          background: publishing ? 'rgba(51,65,85,0.5)' : isPublished
            ? 'linear-gradient(135deg, #EF4444, #DC2626)'
            : 'linear-gradient(135deg, #10B981, #059669)',
          color: publishing ? '#475569' : 'white',
          fontWeight: '800', fontSize: '14px', cursor: publishing ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
          boxShadow: publishing ? 'none' : isPublished ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 20px rgba(16,185,129,0.3)',
          transition: 'all 0.3s',
        }}>
          {publishing ? '⏳ Saving...' : isPublished ? '🔒 Unpublish Page' : '🌐 Publish Page'}
        </button>
      </div>}

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div style={{
        ...card,
        background: `linear-gradient(135deg, rgba(13,20,38,0.95) 0%, rgba(123,28,28,0.2) 100%)`,
        borderColor: `rgba(244,164,11,0.2)`,
        padding: '40px',
        boxShadow: `0 0 80px -20px rgba(244,164,11,0.1)`,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '250px', height: '250px',
          background: 'radial-gradient(circle, rgba(244,164,11,0.08), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: `linear-gradient(135deg, ${C.maroon}, #A0522D)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', boxShadow: `0 0 20px rgba(123,28,28,0.4)`,
            }}>🏓</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>
                Pickleball{' '}
                <span style={{ background: `linear-gradient(135deg, ${C.saffron}, ${C.gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Registrations
                </span>
              </h1>
              <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
                HCC Activities — Knoxville Hindu Community Center
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button onClick={fetchData} style={{
            background: loading ? 'rgba(244,164,11,0.3)' : `linear-gradient(135deg, ${C.maroon}, #A0522D)`,
            color: 'white', fontWeight: '700', fontSize: '14px', padding: '12px 24px',
            borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
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
              border: `1px solid rgba(244,164,11,0.4)`,
              color: C.saffron, fontWeight: '600', fontSize: '13px',
              padding: '12px 18px', borderRadius: '10px', cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
            }}>
              {exporting === fmt
                ? <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(244,164,11,0.3)', borderTop: `2px solid ${C.saffron}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/> Exporting...</>
                : <>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '🖨️'} {fmt.toUpperCase()}</>
              }
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ ...card, padding: '20px 24px', borderColor: 'rgba(239,68,68,0.4)',
          background: 'rgba(239,68,68,0.05)', color: '#EF4444', fontWeight: '600' }}>
          ⚠️ {error}
          {error.includes('Missing Supabase') && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#94A3B8', fontWeight: '400' }}>
              Add <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> to your <code>.env.local</code> file and restart the server.
            </div>
          )}
        </div>
      )}

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <StatCard label="Total Registered" value={stats.total}     accent="#818CF8"/>
          <StatCard label="Paid"              value={stats.paid}      accent="#10B981"  sub={`$${(stats.totalRevenue || 0).toFixed(2)} collected`}/>
          <StatCard label="Pending Payment"   value={stats.pending}   accent="#F59E0B"/>
          <StatCard label="Beginners"         value={stats.beginner}  accent="#10B981"/>
          <StatCard label="Intermediate"      value={stats.intermediate} accent="#F59E0B"/>
          <StatCard label="Advanced"          value={stats.advanced}  accent="#818CF8"/>
        </div>
      )}

      {/* ── Filters & Search ────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569', flexShrink: 0 }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, phone, reg #..."
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.6)',
                borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none',
              }}
            />
          </div>

          {/* Payment filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <FilterBtn active={filter.payment === 'paid'}     onClick={() => setPaymentFilter('paid')}>✓ Paid</FilterBtn>
            <FilterBtn active={filter.payment === 'pending'}  onClick={() => setPaymentFilter('pending')}>⏳ Unpaid</FilterBtn>
          </div>

          {/* Skill filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <FilterBtn active={filter.skill === 'beginner'}     onClick={() => setSkillFilter('beginner')}>🌱 Beginner</FilterBtn>
            <FilterBtn active={filter.skill === 'intermediate'} onClick={() => setSkillFilter('intermediate')}>⭐ Intermediate</FilterBtn>
            <FilterBtn active={filter.skill === 'advanced'}     onClick={() => setSkillFilter('advanced')}>🏆 Advanced</FilterBtn>
          </div>

          {(filter.payment || filter.skill || search) && (
            <button onClick={clearFilters} style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)',
              background: 'transparent', color: '#EF4444', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
            }}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* ── Results Table ────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: 0 }}>
        {/* Table header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border-table)',
          backgroundColor: 'var(--bg-table-header)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Registration List
            </h2>
            <span style={{ backgroundColor: 'var(--bg-badge-pill)', color: 'var(--text-badge-pill)', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px' }}>
              {sorted.length} records
            </span>
          </div>

        </div>

        {/* Table body */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(244,164,11,0.3)', borderTop: `3px solid ${C.saffron}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }}/>
            <div>Loading registrations...</div>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏓</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>No registrations found</div>
            <div style={{ fontSize: '14px' }}>
              {(filter.payment || filter.skill || search)
                ? 'Try clearing the filters'
                : 'Registrations will appear here once participants start signing up'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-table)' }}>
                  {[
                    ['registration_number', 'Reg #'],
                    ['full_name',           'Name'],
                    ['team_name',           'Team Name'],
                    ['partner_name',        'Partner Name'],
                    ['email',               'Email'],
                    ['phone',               'Phone'],
                    ['skill_level',         'Skill'],
                    ['registration_date',   'Date'],
                    ['payment_status',      'Payment'],
                    ['amount_paid',         'Amount'],
                    ['actions',             'Actions'],
                  ].map(([field, label]) => (
                    <th key={field}
                      onClick={() => handleSort(field)}
                      style={{
                        padding: '14px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-table-header)',
                        textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'left',
                        cursor: 'pointer', userSelect: 'none',
                      }}>
                      {label}<SortIndicator field={field}/>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.id || i}
                    style={{
                      borderBottom: '1px solid var(--border-table)',
                      backgroundColor: i % 2 !== 0 ? 'var(--bg-table-stripe)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 !== 0 ? 'var(--bg-table-stripe)' : 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', fontFamily: 'monospace', fontWeight: '800', color: C.saffron, fontSize: '13px' }}>
                      {r.registration_number}
                    </td>
                    <td style={{ padding: '13px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>{r.full_name}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--text-secondary)' }}>{r.team_name || '–'}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--text-secondary)' }}>{r.partner_name || '–'}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--text-secondary)' }}>{r.email}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--text-secondary)' }}>{r.phone}</td>
                    <td style={{ padding: '13px 16px' }}><SkillBadge level={r.skill_level}/></td>
                    <td style={{ padding: '13px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {r.registration_date ? r.registration_date.split(' ')[0] : '–'}
                    </td>
                    <td style={{ padding: '13px 16px' }}><Badge status={r.payment_status}/></td>
                    <td style={{ padding: '13px 16px', color: '#10B981', fontWeight: '700' }}>
                      ${(r.amount_paid || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => setEditingReg(r)}
                          title="Edit registration details"
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(129,140,248,0.4)',
                            background: 'rgba(129,140,248,0.08)', color: '#818CF8',
                            fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(129,140,248,0.08)'}
                        >
                          ✏️ Edit
                        </button>
                        {r.payment_status !== 'paid' && (
                          <button
                            onClick={() => setPayLinkReg(r)}
                            title="Generate & send payment link to this player"
                            style={{
                              padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(244,164,11,0.4)',
                              background: 'rgba(244,164,11,0.08)', color: '#F4A40B',
                              fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                              whiteSpace: 'nowrap', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,164,11,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,164,11,0.08)'}
                          >
                            📧 Send Link
                          </button>
                        )}
                        {r.payment_status === 'paid' && (
                          <button
                            onClick={() => handleResendEmail(r)}
                            disabled={resendingId === r.registration_number}
                            title="Resend confirmation email"
                            style={{
                              padding: '6px 12px', borderRadius: '8px', cursor: resendingId === r.registration_number ? 'not-allowed' : 'pointer',
                              border: `1px solid ${resendDone[r.registration_number] ? 'rgba(16,185,129,0.5)' : 'rgba(14,158,138,0.4)'}`,
                              background: resendDone[r.registration_number] ? 'rgba(16,185,129,0.15)' : 'rgba(14,158,138,0.08)',
                              color: resendDone[r.registration_number] ? '#10B981' : '#0E9E8A',
                              fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', transition: 'all 0.2s',
                            }}
                          >
                            {resendingId === r.registration_number
                              ? <><span style={{ display:'inline-block',width:'10px',height:'10px',border:'2px solid rgba(14,158,138,0.3)',borderTop:'2px solid #0E9E8A',borderRadius:'50%',animation:'spin 0.7s linear infinite',marginRight:'5px' }}/> Sending...</>
                              : resendDone[r.registration_number] ? '✅ Sent!' : '📧 Resend Email'
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #475569; }
        input:focus { border-color: rgba(244,164,11,0.5) !important; outline: none; }
      `}</style>
    </div>
  );
}

// ── Edit Registration Modal Component ──────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' };

function EditRegistrationModal({ reg, onClose, onSave }) {
  const [form, setForm] = useState({
    first_name: reg.first_name || '',
    last_name: reg.last_name || '',
    email: reg.email || '',
    phone: reg.phone || '',
    skill_level: reg.skill_level || 'beginner',
    payment_status: reg.payment_status || 'pending',
    amount_paid: reg.amount_paid || 0,
    team_name: reg.team_name || '',
    partner_name: reg.partner_name || '',
    gender: reg.gender || 'male',
    city: reg.city || '',
    state: reg.state || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reg.first_name && reg.full_name) {
      const parts = reg.full_name.split(' ');
      const first = parts[0] || '';
      const last = parts.slice(1).join(' ') || '';
      setForm(prev => ({ ...prev, first_name: first, last_name: last }));
    }
  }, [reg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/pickleball/registrations', {
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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-modal)', border: '1px solid var(--border-modal)',
        borderRadius: '20px', padding: '32px', maxWidth: '640px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            ✏️ Edit Registration
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

          {/* Row 2: Email & Phone */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone</label>
              <input value={form.phone} onChange={e => handleChange('phone', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Row 3: Team Details */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Team Name</label>
              <input value={form.team_name} onChange={e => handleChange('team_name', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Partner Name</label>
              <input value={form.partner_name} onChange={e => handleChange('partner_name', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Row 4: Skill & Gender */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Skill Level</label>
              <select value={form.skill_level} onChange={e => handleChange('skill_level', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Gender</label>
              <select value={form.gender} onChange={e => handleChange('gender', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer Not To Say</option>
              </select>
            </div>
          </div>

          {/* Row 5: City & State */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>City</label>
              <input value={form.city} onChange={e => handleChange('city', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>State</label>
              <input value={form.state} onChange={e => handleChange('state', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Row 6: Payment Info */}
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
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Amount Paid ($)</label>
              <input type="number" step="0.01" value={form.amount_paid} onChange={e => handleChange('amount_paid', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border-button-secondary)',
              background: 'var(--bg-button-secondary)', color: 'var(--text-button-secondary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #F4A40B, #D4AF37)', color: '#000', fontWeight: '800', fontSize: '14px',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
