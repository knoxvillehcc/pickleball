'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ClientLayout';
import { colors, spacing, type, radii, btn, input as dsInput, card, chip, table as tableStyle, keyframes, alert as alertStyle } from '@/lib/navratri/designSystem';

export default function AccountingPage() {
  const { theme } = useTheme();
  const co = colors(theme);
  const t = tableStyle(theme);

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
    <div style={{ padding: `${spacing.xl}px`, color: co.text, fontFamily: type.fontFamily }}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h1 style={{ ...type.pageTitle, color: co.text, margin: 0 }}>💰 Accounting & Daily Close</h1>
          <p style={{ ...type.secondary, color: co.muted, marginTop: spacing.xs }}>Close days, create Odoo journal entries, and reconcile</p>
        </div>
        <a href="/navratri" style={{ ...btn('secondary', theme), textDecoration: 'none', ...type.caption }}>← Dashboard</a>
      </div>

      {message && (
        <div style={{ ...alertStyle(message.type, theme), marginBottom: spacing.base }}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* Close a new day */}
      <div style={{ ...card(theme), padding: spacing.xl, marginBottom: spacing.xl }}>
        <h3 style={{ ...type.cardTitle, color: co.text, marginBottom: spacing.base }}>📅 Close a Day</h3>
        <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ ...dsInput(theme), width: 'auto' }} />
          <button onClick={() => handleAction('close', { date: selectedDate })}
            disabled={!selectedDate || actionLoading === 'close'}
            style={{ ...btn('primary', theme), width: 'auto', background: co.accent, color: '#000', opacity: !selectedDate || actionLoading ? 0.5 : 1 }}>
            {actionLoading === 'close' ? 'Closing…' : '🔒 Close Day'}
          </button>
        </div>
      </div>

      {/* Closed days table */}
      <div style={{ ...card(theme), overflow: 'hidden' }}>
        <div style={{ padding: `${spacing.lg}px ${spacing.lg}px 0` }}>
          <h3 style={{ ...type.cardTitle, color: co.text }}>📋 Daily Close Records</h3>
        </div>
        {loading ? (
          <div style={{ padding: spacing['3xl'], textAlign: 'center' }}>
            <div style={{ width: '32px', height: '32px', border: `3px solid ${co.border}`, borderTopColor: co.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          </div>
        ) : closes.length === 0 ? (
          <div style={{ padding: spacing['3xl'], textAlign: 'center', ...type.body, color: co.muted }}>
            No days closed yet. Select a date above to close.
          </div>
        ) : (
          <div style={{ ...t.wrapper, marginTop: spacing.md }}>
            <table style={t.table}>
              <thead>
                <tr>
                  {['Date', 'Orders', 'Tickets', 'Stripe', 'Cash', 'Check', 'Refunds', 'Status', 'Actions'].map(h => (
                    <th key={h} style={t.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closes.map(c => (
                  <tr key={c.id} style={t.row}>
                    <td style={{ ...t.td, ...type.bodyMedium }}>
                      {new Date(c.close_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={t.td}>{c.order_count}</td>
                    <td style={t.td}>{c.ticket_quantity}</td>
                    <td style={t.td}>
                      <div style={{ ...type.bodyMedium, color: co.green }}>{fmt(c.stripe_gross)}</div>
                      <div style={{ ...type.caption, color: co.muted }}>net {fmt(c.stripe_net)} (fees {fmt(c.stripe_fees)})</div>
                    </td>
                    <td style={t.td}>{fmt(c.cash_total)}</td>
                    <td style={t.td}>{fmt(c.check_total)}</td>
                    <td style={{ ...t.td, color: c.refund_total > 0 ? co.red : co.muted }}>{fmt(c.refund_total)}</td>
                    <td style={t.td}>
                      <span style={chip(c.status === 'posted' ? 'posted' : c.status === 'draft_created' ? 'draft' : c.status === 'closed' ? 'closed' : 'active', theme)}>
                        {c.status === 'posted' ? '✅ Posted' : c.status === 'draft_created' ? '📝 Draft' : c.status === 'closed' ? '🔒 Closed' : '🔓 Reopened'}
                      </span>
                    </td>
                    <td style={t.td}>
                      <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                        {c.status === 'closed' && (
                          <>
                            <button onClick={() => handleAction('draft', { closeId: c.id })} disabled={actionLoading === 'draft'}
                              style={{ ...btn('secondary', theme), padding: `${spacing.xs}px ${spacing.md}px`, ...type.caption, color: co.blue }}>
                              📝 Draft
                            </button>
                            <button onClick={() => { const reason = prompt('Reason for reopening?'); if (reason) handleAction('reopen', { date: c.close_date, reason }); }}
                              style={{ ...btn('secondary', theme), padding: `${spacing.xs}px ${spacing.md}px`, ...type.caption, color: co.primary }}>
                              🔓 Reopen
                            </button>
                          </>
                        )}
                        {c.status === 'draft_created' && (
                          <button onClick={() => handleAction('post', { closeId: c.id })} disabled={actionLoading === 'post'}
                            style={{ ...btn('secondary', theme), padding: `${spacing.xs}px ${spacing.md}px`, ...type.caption, color: co.green }}>
                            ✅ Post
                          </button>
                        )}
                        {c.status === 'posted' && (
                          <span style={{ ...type.caption, color: co.muted }}>Odoo #{c.odoo_posted_move_id}</span>
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
    </div>
  );
}
