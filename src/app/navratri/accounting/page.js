'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';

const T = (theme) => ({
  card: theme === 'dark' ? '#1e293b' : '#FFFFFF',
  border: theme === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
  text: theme === 'dark' ? '#F8FAFC' : '#0f172a', muted: theme === 'dark' ? '#94A3B8' : '#64748B',
  primary: '#FF6B35', green: '#34D399', red: '#EF4444', accent: '#FFD700', blue: '#60A5FA',
});

const STATUS_MAP = {
  closed: { label: '🔒 Closed', color: '#FFD700', bg: 'rgba(255,215,0,0.1)' },
  draft_created: { label: '📝 Draft', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  posted: { label: '✅ Posted', color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  reopened: { label: '🔓 Reopened', color: '#FF6B35', bg: 'rgba(255,107,53,0.1)' },
};

export default function AccountingPage() {
  const { theme } = useTheme();
  const t = T(theme);
  const [closes, setCloses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/navratri/events');
      const data = await res.json();
      if (data.events?.length) setEventId(data.events[0].id);
    })();
  }, []);

  useEffect(() => { if (eventId) loadCloses(); }, [eventId]);

  const loadCloses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/navratri/accounting?eventId=${eventId}`);
      const data = await res.json();
      setCloses(data.closes || []);
    } catch { }
    finally { setLoading(false); }
  };

  const handleAction = async (action, params = {}) => {
    setActionLoading(action); setMessage(null);
    try {
      const res = await fetch('/api/navratri/accounting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, eventId, ...params }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `${action} completed successfully` });
        loadCloses();
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setActionLoading(''); }
  };

  const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`;

  return (
    <div style={{ padding: '24px 28px', color: t.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>💰 Accounting & Daily Close</h1>
          <p style={{ color: t.muted, fontSize: '13px', marginTop: '4px' }}>Close days, create Odoo journal entries, and reconcile</p>
        </div>
        <a href="/navratri" style={{ padding: '10px 18px', borderRadius: '10px', border: `1px solid ${t.border}`, color: t.text, textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>← Dashboard</a>
      </div>

      {message && (
        <div style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '16px',
          background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}`,
          color: message.type === 'error' ? t.red : t.green, fontSize: '14px',
        }}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* Close a new day */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>📅 Close a Day</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: '14px', outline: 'none' }} />
          <button onClick={() => handleAction('close', { date: selectedDate })}
            disabled={!selectedDate || actionLoading === 'close'}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: t.accent, color: '#000', fontWeight: '800', cursor: 'pointer', opacity: !selectedDate || actionLoading ? 0.5 : 1 }}>
            {actionLoading === 'close' ? 'Closing...' : '🔒 Close Day'}
          </button>
        </div>
      </div>

      {/* Closed days table */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>📋 Daily Close Records</h3>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.muted }}>Loading...</div>
        ) : closes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.muted }}>No days closed yet. Select a date above to close.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {['Date', 'Orders', 'Tickets', 'Stripe', 'Cash', 'Check', 'Refunds', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: t.muted, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closes.map(c => {
                const st = STATUS_MAP[c.status] || { label: c.status, color: t.muted, bg: 'transparent' };
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '700' }}>
                      {new Date(c.close_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{c.order_count}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{c.ticket_quantity}</td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '700', color: t.green }}>
                      {fmt(c.stripe_gross)}<br />
                      <span style={{ fontSize: '11px', color: t.muted }}>net {fmt(c.stripe_net)} (fees {fmt(c.stripe_fees)})</span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{fmt(c.cash_total)}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{fmt(c.check_total)}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: c.refund_total > 0 ? t.red : t.muted }}>{fmt(c.refund_total)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {c.status === 'closed' && (
                          <>
                            <button onClick={() => handleAction('draft', { closeId: c.id })} disabled={actionLoading === 'draft'}
                              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(96,165,250,0.15)', color: t.blue, fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                              📝 Create Draft
                            </button>
                            <button onClick={() => { const reason = prompt('Reason for reopening?'); if (reason) handleAction('reopen', { date: c.close_date, reason }); }}
                              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(255,107,53,0.1)', color: t.primary, fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                              🔓 Reopen
                            </button>
                          </>
                        )}
                        {c.status === 'draft_created' && (
                          <button onClick={() => handleAction('post', { closeId: c.id })} disabled={actionLoading === 'post'}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(52,211,153,0.15)', color: t.green, fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                            ✅ Post to Odoo
                          </button>
                        )}
                        {c.status === 'posted' && (
                          <span style={{ fontSize: '11px', color: t.muted, padding: '6px 0' }}>Odoo Move #{c.odoo_posted_move_id}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
