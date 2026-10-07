'use client';
import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportPdfWithNativeShare } from '@/lib/pdfShareHelper';
import { useTheme } from '@/components/ClientLayout';
import { colors, spacing, type, radii, btn, card, chip, table as tableStyle, emptyState as emptyStateStyle, keyframes, alert as alertStyle } from '@/lib/navratri/designSystem';

export default function NavratriDashboard() {
  const { theme } = useTheme();
  const c = colors(theme);
  const [overview, setOverview] = useState(null);
  const [dateStats, setDateStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [tab, setTab] = useState('overview');

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

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF('landscape');
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
      const timeStr = now.toLocaleTimeString();

      doc.setFontSize(18);
      doc.setTextColor(255, 107, 53); // Navratri Saffron
      doc.text('Navratri 2026 — Festival Management Summary', 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `Generated: ${dateStr} ${timeStr}  |  Event: ${activeEvent?.title || 'Navratri 2026'}  |  Status: ${activeEvent?.status?.toUpperCase() || 'ACTIVE'}`,
        14, 22
      );

      // KPI Summary Table
      if (overview) {
        autoTable(doc, {
          startY: 28,
          head: [['Total Revenue', 'Net Revenue', 'Stripe Fees', 'Refunds', 'Total Orders', 'Pending Orders', 'General Members', 'Pioneer Members']],
          body: [[
            fmt(overview.totalRevenue),
            fmt(overview.netRevenue),
            fmt(overview.totalFees),
            fmt(overview.totalRefunds),
            String(overview.totalOrders || 0),
            String(overview.pendingOrders || 0),
            String(overview.generalMembers || 0),
            String(overview.pioneerMembers || 0),
          ]],
          theme: 'grid',
          headStyles: { fillColor: [255, 107, 53], textColor: [255, 255, 255] },
          styles: { fontSize: 8.5, cellPadding: 3, halign: 'center' },
          margin: { top: 10, bottom: 6, left: 14, right: 14 },
        });
      }

      // Date breakdown table
      if (dateStats && dateStats.length > 0) {
        const tableBody = dateStats.map(d => {
          let dateFmt = '—';
          if (d.date) {
            const parts = d.date.split('T')[0].split('-');
            if (parts.length === 3) dateFmt = `${parts[1]}-${parts[2]}-${parts[0]}`;
          }
          return [
            dateFmt,
            d.label || '—',
            String(d.totalTickets || 0),
            fmt(d.totalRevenue || 0),
            String(d.totalRefunded || 0),
            String(d.checkedIn || 0),
            `${d.attendanceRate || 0}%`,
          ];
        });

        autoTable(doc, {
          startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 30,
          head: [['Date (MM-DD-YYYY)', 'Day Description', 'Tickets Sold', 'Revenue', 'Refunded', 'Checked In', 'Attendance Rate']],
          body: tableBody,
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
          styles: { fontSize: 8, cellPadding: 2.5 },
          margin: { top: 10, bottom: 10, left: 14, right: 14 },
        });
      }

      await exportPdfWithNativeShare(doc, `Navratri_Festival_Summary_${dateStr}.pdf`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    }
  };

  const t = tableStyle(theme);

  if (loading) return (
    <div style={{ padding: spacing['3xl'], textAlign: 'center' }}>
      <style>{keyframes}</style>
      <div style={{ width: '40px', height: '40px', border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ ...type.body, color: c.muted }}>Loading Navratri Dashboard…</p>
    </div>
  );

  return (
    <div style={{ padding: `${spacing.xl}px ${spacing.xl}px`, color: c.text, minHeight: '100vh', fontFamily: type.fontFamily }}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl, flexWrap: 'wrap', gap: spacing.base }}>
        <div>
          <h1 style={{ ...type.pageTitle, color: c.text, margin: 0 }}>Navratri 2026</h1>
          <p style={{ ...type.secondary, color: c.muted, marginTop: spacing.xs }}>
            {activeEvent?.status === 'active' ? 'Event Active' :
              activeEvent?.status === 'published' ? 'Published' :
              activeEvent?.status === 'draft' ? 'Draft' : activeEvent?.status || 'No events'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportPDF}
            style={{
              padding: '9px 16px', borderRadius: `${radii.md}px`,
              border: `1.5px solid ${c.primary}`, background: 'rgba(255,107,53,0.1)',
              color: c.primary, fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>Export Festival PDF</span>
          </button>
          {health && (
            <span style={chip(health.status === 'healthy' ? 'active' : 'invalid', theme)}>
              {health.status === 'healthy' ? 'All Systems OK' : 'System Degraded'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Nav */}
      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
        {[
          { href: '/navratri/orders', icon: '🎫', label: 'Orders' },
          { href: '/navratri/vendors', icon: '🎪', label: 'Vendor Booths' },
          { href: '/navratri/members', icon: '👥', label: 'Members' },
          { href: '/navratri/manual', icon: '📝', label: 'Manual Issue' },
          { href: '/navratri/accounting', icon: '💰', label: 'Accounting' },
          { href: '/navratri/communications', icon: '📢', label: 'Comms' },
          { href: '/navratri/scanner', icon: '📸', label: 'Scanner' },
          { href: '/navratri/pickup', icon: '🎫', label: 'Pickup' },
          { href: '/navratri/settings', icon: '⚙️', label: 'Settings' },
          { href: '/navratri-2026', icon: '🌐', label: 'Public Page', external: true },
        ].map(link => (
          <a key={link.href} href={link.href} target={link.external ? '_blank' : undefined}
            style={{
              ...btn('secondary', theme), padding: `${spacing.sm}px ${spacing.base}px`,
              textDecoration: 'none', ...type.caption, display: 'inline-flex', gap: '6px',
            }}>
            {link.icon} {link.label}
          </a>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '3px', marginBottom: spacing.xl,
        background: c.inputBg, borderRadius: `${radii.md}px`, padding: '3px',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'dates', label: 'By Date' },
          { key: 'orders', label: 'Orders' },
          { key: 'members', label: 'Members' },
          { key: 'accounting', label: 'Accounting' },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={{
            padding: `${spacing.sm}px ${spacing.base}px`,
            borderRadius: `${radii.sm}px`, border: 'none',
            ...type.bodyMedium, fontSize: '14px',
            background: tab === tb.key ? c.primary : 'transparent',
            color: tab === tb.key ? '#fff' : c.muted,
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
      {tab === 'overview' && overview && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: spacing.base, marginBottom: spacing.xl }}>
            {[
              { label: 'Total Revenue', value: fmt(overview.totalRevenue), color: c.green, icon: '💰' },
              { label: 'Net Revenue', value: fmt(overview.netRevenue), color: c.accent, icon: '📈' },
              { label: 'Stripe Fees', value: fmt(overview.totalFees), color: c.red, icon: '💳' },
              { label: 'Refunds', value: fmt(overview.totalRefunds), color: c.red, icon: '↩️' },
              { label: 'Total Orders', value: overview.totalOrders, color: c.blue, icon: '🎫' },
              { label: 'Pending', value: overview.pendingOrders, color: c.amber, icon: '⏳' },
              { label: 'Check-ins', value: overview.totalCheckins, color: c.green, icon: '✅' },
              { label: 'Members Synced', value: overview.membersSynced, color: c.blue, icon: '👥' },
            ].map((kpi, i) => (
              <div key={i} style={{ ...card(theme), padding: spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <span style={{ ...type.caption, color: c.muted }}>{kpi.label}</span>
                  <span style={{ fontSize: '18px' }}>{kpi.icon}</span>
                </div>
                <div style={{ ...type.tabletNum, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: spacing.base, marginBottom: spacing.xl }}>
            {[
              { title: 'By Payment Method', data: overview.revenueByMethod || {}, labels: { stripe: '💳 Stripe', cash: '💵 Cash', check: '📝 Check', complimentary: '🎁 Complimentary' } },
              { title: 'By Ticket Type', data: overview.revenueByType || {}, labels: {} },
              { title: 'By Customer Type', data: overview.revenueByCustomer || {}, labels: { general: '👤 General', pioneer: '🏆 Pioneer', non_member: '🌐 Non-Member' } },
            ].map((section, si) => (
              <div key={si} style={{ ...card(theme), padding: spacing.lg }}>
                <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>{section.title}</h3>
                {Object.entries(section.data).map(([key, amount]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing.sm}px 0`, borderBottom: `1px solid ${c.border}` }}>
                    <span style={{ ...type.secondary, textTransform: 'capitalize' }}>{section.labels[key] || key.replace('_', ' ')}</span>
                    <span style={{ ...type.bodyMedium, fontVariantNumeric: 'tabular-nums' }}>{fmt(amount)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Membership */}
          <div style={{ ...card(theme), padding: spacing.lg }}>
            <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>👥 Membership Breakdown</h3>
            <div style={{ display: 'flex', gap: spacing['2xl'] }}>
              <div>
                <span style={{ ...type.bigNum, color: c.blue }}>{overview.generalMembers}</span>
                <div style={{ ...type.caption, color: c.muted, marginTop: spacing.xs }}>General Members</div>
              </div>
              <div>
                <span style={{ ...type.bigNum, color: c.accent }}>{overview.pioneerMembers}</span>
                <div style={{ ...type.caption, color: c.muted, marginTop: spacing.xs }}>Pioneer Members</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── DATES TAB ────────────────────────────────────────────────── */}
      {tab === 'dates' && (
        <div style={{ ...card(theme), overflow: 'hidden' }}>
          <div style={t.wrapper}>
            <table style={t.table}>
              <thead>
                <tr>
                  {['Date', 'Label', 'Tickets', 'Revenue', 'Refunded', 'Checked In', 'Attendance'].map(h => (
                    <th key={h} style={t.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dateStats.map((d, i) => (
                  <tr key={d.dateId} style={{ ...t.row, background: i % 2 === 0 ? 'transparent' : c.bgAlt }}>
                    <td style={{ ...t.td, ...type.bodyMedium }}>
                      {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={t.td}>{d.label}</td>
                    <td style={{ ...t.td, ...type.bodyMedium }}>{d.totalTickets}</td>
                    <td style={{ ...t.td, ...type.bodyMedium, color: c.green }}>{fmt(d.totalRevenue)}</td>
                    <td style={{ ...t.td, color: d.totalRefunded > 0 ? c.red : c.muted }}>{d.totalRefunded}</td>
                    <td style={{ ...t.td, ...type.bodyMedium }}>{d.checkedIn}</td>
                    <td style={t.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <div style={{ flex: 1, height: '6px', background: c.inputBg, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(d.attendanceRate, 100)}%`, height: '100%', background: c.green, borderRadius: '3px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ ...type.caption, fontWeight: '600', minWidth: '40px', fontVariantNumeric: 'tabular-nums' }}>{d.attendanceRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Placeholder tabs */}
      {['orders', 'members', 'accounting'].includes(tab) && (
        <div style={{ ...card(theme), padding: spacing['3xl'], textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: spacing.base, opacity: 0.5 }}>
            {tab === 'orders' ? '🎫' : tab === 'members' ? '👥' : '💰'}
          </div>
          <h3 style={{ ...type.sectionTitle, color: c.text }}>
            {tab === 'orders' ? 'Orders Management' : tab === 'members' ? 'Member Management' : 'Accounting & Daily Close'}
          </h3>
          <p style={{ ...type.secondary, color: c.muted, marginTop: spacing.sm }}>
            Use the dedicated page from the quick nav above.
          </p>
        </div>
      )}

      {/* System Health */}
      {health && (
        <div style={{ ...card(theme), padding: spacing.lg, marginTop: spacing.xl }}>
          <h3 style={{ ...type.cardTitle, color: c.text, marginBottom: spacing.base }}>🔧 System Health</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: spacing.md }}>
            {Object.entries(health.checks || {}).map(([name, check]) => (
              <div key={name} style={{ padding: spacing.md, borderRadius: `${radii.sm}px`, background: c.bgAlt }}>
                <div style={{ ...type.bodyMedium, marginBottom: spacing.xs, textTransform: 'capitalize' }}>{name}</div>
                <span style={chip(check.status === 'healthy' ? 'active' : check.status === 'not_configured' ? 'pending' : 'invalid', theme)}>
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
