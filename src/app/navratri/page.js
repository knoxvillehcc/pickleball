'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/ClientLayout';

const T = (theme) => ({
  bg:       theme === 'dark' ? '#0f172a' : '#F8FAFC',
  card:     theme === 'dark' ? '#1e293b' : '#FFFFFF',
  border:   theme === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
  text:     theme === 'dark' ? '#F8FAFC' : '#0f172a',
  muted:    theme === 'dark' ? '#94A3B8' : '#64748B',
  primary:  '#FF6B35', secondary: '#8B1E3F', accent: '#FFD700',
  green:    '#34D399', red: '#EF4444', blue: '#60A5FA',
});

export default function NavratriDashboard() {
  const { theme } = useTheme();
  const t = T(theme);
  const [overview, setOverview] = useState(null);
  const [dateStats, setDateStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [tab, setTab] = useState('overview'); // overview, dates, orders, members, accounting

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const evRes = await fetch('/api/navratri/events');
        const evData = await evRes.json();
        setEvents(evData.events || []);
        if (evData.events?.length > 0) {
          setActiveEvent(evData.events[0]);
        }
      } catch (err) { console.error('Failed to load events:', err); }
    })();
  }, []);

  useEffect(() => {
    if (!activeEvent) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const [ovRes, dtRes, hlRes] = await Promise.all([
          fetch(`/api/navratri/reports?eventId=${activeEvent.id}&type=overview`),
          fetch(`/api/navratri/reports?eventId=${activeEvent.id}&type=by_date`),
          fetch('/api/navratri/health'),
        ]);
        const ovData = await ovRes.json();
        const dtData = await dtRes.json();
        const hlData = await hlRes.json();
        setOverview(ovData.overview || null);
        setDateStats(dtData.dateStats || []);
        setHealth(hlData);
      } catch (err) { console.error('Load error:', err); }
      finally { setLoading(false); }
    })();
  }, [activeEvent]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🪔</div>
      <p style={{ color: t.muted }}>Loading Navratri Dashboard...</p>
    </div>
  );

  return (
    <div style={{ padding: '24px 28px', color: t.text, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>🪔 Navratri 2026</h1>
          <p style={{ color: t.muted, fontSize: '14px', marginTop: '4px' }}>
            {activeEvent?.status === 'active' ? '🟢 Event Active' :
              activeEvent?.status === 'published' ? '🟡 Published' :
              activeEvent?.status === 'draft' ? '⚪ Draft' : activeEvent?.status || 'No events'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {health && (
            <span style={{
              padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
              background: health.status === 'healthy' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
              color: health.status === 'healthy' ? t.green : t.red,
            }}>
              {health.status === 'healthy' ? '✅ All Systems OK' : '⚠️ System Degraded'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Nav */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { href: '/navratri/orders', icon: '🎫', label: 'Orders' },
          { href: '/navratri/members', icon: '👥', label: 'Members' },
          { href: '/navratri/manual', icon: '📝', label: 'Manual Issue' },
          { href: '/navratri/accounting', icon: '💰', label: 'Accounting' },
          { href: '/navratri/communications', icon: '📢', label: 'Communications' },
          { href: '/navratri/scanner', icon: '📸', label: 'Scanner' },
          { href: '/navratri/pickup', icon: '🎫', label: 'Pickup' },
          { href: '/navratri/settings', icon: '⚙️', label: 'Settings' },
          { href: '/navratri-2026', icon: '🌐', label: 'Public Page', external: true },
        ].map(link => (
          <a key={link.href} href={link.href} target={link.external ? '_blank' : undefined}
            style={{ padding: '10px 18px', borderRadius: '12px', background: t.card, border: `1px solid ${t.border}`, color: t.text, textDecoration: 'none', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
            {link.icon} {link.label}
          </a>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: '12px', padding: '4px' }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'dates', label: '📅 By Date' },
          { key: 'orders', label: '🎫 Orders' },
          { key: 'members', label: '👥 Members' },
          { key: 'accounting', label: '💰 Accounting' },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: '600',
            background: tab === tb.key ? t.primary : 'transparent',
            color: tab === tb.key ? 'white' : t.muted,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
      {tab === 'overview' && overview && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Revenue', value: fmt(overview.totalRevenue), color: t.green, icon: '💰' },
              { label: 'Net Revenue', value: fmt(overview.netRevenue), color: t.accent, icon: '📈' },
              { label: 'Stripe Fees', value: fmt(overview.totalFees), color: t.red, icon: '💳' },
              { label: 'Refunds', value: fmt(overview.totalRefunds), color: t.red, icon: '↩️' },
              { label: 'Total Orders', value: overview.totalOrders, color: t.blue, icon: '🎫' },
              { label: 'Pending Orders', value: overview.pendingOrders, color: t.accent, icon: '⏳' },
              { label: 'Total Check-ins', value: overview.totalCheckins, color: t.green, icon: '✅' },
              { label: 'Members Synced', value: overview.membersSynced, color: t.blue, icon: '👥' },
            ].map((kpi, i) => (
              <div key={i} style={{
                background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: t.muted }}>{kpi.label}</span>
                  <span style={{ fontSize: '20px' }}>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* By Method */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px' }}>By Payment Method</h3>
              {Object.entries(overview.revenueByMethod || {}).map(([method, amount]) => (
                <div key={method} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>
                    {method === 'stripe' ? '💳 Stripe' : method === 'cash' ? '💵 Cash' : method === 'check' ? '📝 Check' : '🎁 Complimentary'}
                  </span>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>{fmt(amount)}</span>
                </div>
              ))}
            </div>
            {/* By Type */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px' }}>By Ticket Type</h3>
              {Object.entries(overview.revenueByType || {}).map(([type, amount]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>{fmt(amount)}</span>
                </div>
              ))}
            </div>
            {/* By Customer */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px' }}>By Customer Type</h3>
              {Object.entries(overview.revenueByCustomer || {}).map(([type, amount]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>
                    {type === 'general' ? '👤 General' : type === 'pioneer' ? '🏆 Pioneer' : '🌐 Non-Member'}
                  </span>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>{fmt(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Membership Stats */}
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px' }}>👥 Membership Breakdown</h3>
            <div style={{ display: 'flex', gap: '32px' }}>
              <div><span style={{ fontSize: '32px', fontWeight: '900', color: t.blue }}>{overview.generalMembers}</span><div style={{ color: t.muted, fontSize: '13px', marginTop: '4px' }}>General Members</div></div>
              <div><span style={{ fontSize: '32px', fontWeight: '900', color: t.accent }}>{overview.pioneerMembers}</span><div style={{ color: t.muted, fontSize: '13px', marginTop: '4px' }}>Pioneer Members</div></div>
            </div>
          </div>
        </>
      )}

      {/* ── DATES TAB ────────────────────────────────────────────────── */}
      {tab === 'dates' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {['Date', 'Label', 'Tickets Sold', 'Revenue', 'Refunded', 'Checked In', 'Attendance'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: t.muted, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dateStats.map((d, i) => (
                <tr key={d.dateId} style={{ borderBottom: `1px solid ${t.border}`, background: i % 2 === 0 ? 'transparent' : (theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600' }}>
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px' }}>{d.label}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700' }}>{d.totalTickets}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: t.green }}>{fmt(d.totalRevenue)}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: d.totalRefunded > 0 ? t.red : t.muted }}>{d.totalRefunded}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700' }}>{d.checkedIn}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(d.attendanceRate, 100)}%`, height: '100%', background: t.green, borderRadius: '4px', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '45px' }}>{d.attendanceRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ORDERS TAB (placeholder for now) ──────────────────────────── */}
      {tab === 'orders' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
          <h3>Orders Management</h3>
          <p style={{ color: t.muted, marginTop: '8px' }}>Full order search, detail view, manual issue, and refund UI coming in next phase.</p>
          <p style={{ color: t.muted, marginTop: '4px', fontSize: '13px' }}>API is fully functional — use the reports tab for now.</p>
        </div>
      )}

      {/* ── MEMBERS TAB (placeholder) ─────────────────────────────────── */}
      {tab === 'members' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3>Member Management</h3>
          <p style={{ color: t.muted, marginTop: '8px' }}>Odoo sync, member search, committee management, and entitlement views coming in next phase.</p>
        </div>
      )}

      {/* ── ACCOUNTING TAB (placeholder) ──────────────────────────────── */}
      {tab === 'accounting' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <h3>Accounting & Daily Close</h3>
          <p style={{ color: t.muted, marginTop: '8px' }}>Daily close, Odoo journal entries, and reconciliation coming in next phase.</p>
        </div>
      )}

      {/* System Health */}
      {health && (
        <div style={{ marginTop: '24px', background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px' }}>🔧 System Health</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {Object.entries(health.checks || {}).map(([name, check]) => (
              <div key={name} style={{ padding: '12px', borderRadius: '10px', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px', textTransform: 'capitalize' }}>{name}</div>
                <span style={{
                  fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                  background: check.status === 'healthy' ? 'rgba(52,211,153,0.1)' : check.status === 'not_configured' ? 'rgba(148,163,184,0.1)' : 'rgba(239,68,68,0.1)',
                  color: check.status === 'healthy' ? t.green : check.status === 'not_configured' ? t.muted : t.red,
                }}>
                  {check.status === 'healthy' ? '✅ Healthy' : check.status === 'not_configured' ? '⚙️ Not Configured' : '❌ Error'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
