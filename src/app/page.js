'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Card and UI style tokens using CSS variables for robust dark/light theme support
const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

const moduleConfigs = [
  {
    slug: 'pickleball',
    title: 'Tournament Registrations',
    desc: 'Manage tournament registrants, track payment status, generate secure links, and export player lists.',
    icon: '🏓',
    color: 'linear-gradient(135deg, #F4A40B, #D4AF37)',
    borderColor: 'rgba(244, 164, 11, 0.3)',
    hoverGlow: 'rgba(244, 164, 11, 0.08)',
    href: '/pickleball',
  },
  {
    slug: 'reports',
    title: 'Membership Reports',
    desc: 'View active subscriptions, total revenue collection breakdown, and download full PDF reports.',
    icon: '📊',
    color: 'linear-gradient(135deg, #10B981, #059669)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    hoverGlow: 'rgba(16, 185, 129, 0.08)',
    href: '/reports',
  },
  {
    slug: 'monthly',
    title: 'Monthly Activity',
    desc: 'Track monthly membership sign-ups, activity trends, and subscription revenue streams.',
    icon: '📅',
    color: 'linear-gradient(135deg, #38BDF8, #0284C7)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    hoverGlow: 'rgba(56, 189, 248, 0.08)',
    href: '/reports/monthly',
  },
  {
    slug: 'banner',
    title: 'Banner Management',
    desc: 'Review advertising sponsor banners, verify invoice lines, and handle banner status updates.',
    icon: '🎏',
    color: 'linear-gradient(135deg, #818CF8, #4F46E5)',
    borderColor: 'rgba(129, 140, 248, 0.3)',
    hoverGlow: 'rgba(129, 140, 248, 0.08)',
    href: '/banner',
  },
  {
    slug: 'users',
    title: 'User Management',
    desc: 'Administer system accounts, assign individual page access, toggle active states, and reset login PINs.',
    icon: '👥',
    color: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
    hoverGlow: 'rgba(167, 139, 250, 0.08)',
    href: '/settings/users',
    adminOnly: true,
  },
  {
    slug: 'settings',
    title: 'App Settings',
    desc: 'Adjust portal configuration settings, check health endpoints, and toggle registration availability.',
    icon: '⚙️',
    color: 'linear-gradient(135deg, #94A3B8, #475569)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
    hoverGlow: 'rgba(148, 163, 184, 0.08)',
    href: '/settings',
  },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'scanner'

  // Odoo Scanner diagnostics state
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch((err) => console.error('Error fetching auth data:', err))
      .finally(() => setUserLoading(false));
  }, []);

  const hasDashboardAccess =
    user?.role === 'super_admin' ||
    user?.allowedPages?.includes('*') ||
    user?.allowedPages?.includes('dashboard');

  const runScan = async () => {
    setLoading(true);
    setLogs([]);
    try {
      const res = await fetch('/api/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        setSummary(data.summary);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Network error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const executeFixes = async () => {
    const toFix = (results || []).filter((r) => r.status === 'would_fix');
    if (toFix.length === 0) return;
    if (!window.confirm('Execute ' + toFix.length + ' live fixes in Production Odoo?')) return;
    setExecuting(true);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: toFix, environment: 'production' }),
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        alert('Execution complete! Check logs below.');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const missingCount = summary ? summary.wouldFix : 0;

  if (userLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <div style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '15px' }}>Loading Portal Dashboard...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Filter modules based on user access
  const allowedModules = moduleConfigs.filter((mod) => {
    if (mod.adminOnly && user?.role !== 'super_admin') return false;
    const pages = user?.allowedPages || [];
    return pages.includes('*') || pages.includes(mod.slug);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
      
      {/* --- Page Navigation Header / Tabs --- */}
      {hasDashboardAccess && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '2px', gap: '24px' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              background: 'none', border: 'none',
              color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '15px', fontWeight: '700', padding: '8px 12px 14px', cursor: 'pointer',
              position: 'relative', transition: 'color 0.2s',
            }}
          >
            Overview
            {activeTab === 'overview' && (
              <span style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '3px', background: 'var(--accent)', borderRadius: '99px' }} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            style={{
              background: 'none', border: 'none',
              color: activeTab === 'scanner' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '15px', fontWeight: '700', padding: '8px 12px 14px', cursor: 'pointer',
              position: 'relative', transition: 'color 0.2s',
            }}
          >
            🔍 Odoo System Scanner
            {activeTab === 'scanner' && (
              <span style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '3px', background: 'var(--accent)', borderRadius: '99px' }} />
            )}
          </button>
        </div>
      )}

      {/* --- OVERVIEW TAB CONTENT --- */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-in">
          
          {/* Welcome Greeting Banner */}
          <div style={{
            ...cardStyle,
            background: 'var(--bg-banner-grad)',
            borderColor: 'var(--border-hover)',
            padding: '48px',
            boxShadow: '0 0 60px -20px var(--accent-glow)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '99px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: '20px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {user?.role === 'super_admin' ? 'Super Admin Session' : 'Staff Session'}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '38px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                Welcome to the{' '}
                <span style={{ background: 'linear-gradient(135deg, #818CF8, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  HCC Admin Portal
                </span>
              </h1>
              <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '580px', lineHeight: 1.6 }}>
                Hello, <strong>{user?.name || 'User'}</strong>! Choose an action below or browse the sidebar to manage the Knoxville Hindu Community Center activities.
              </p>
            </div>
          </div>

          {/* Quick Access Card Grid */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>
              Your Allowed Modules ({allowedModules.length})
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              
              {/* Allowed Pages Cards */}
              {allowedModules.map((mod) => (
                <Link key={mod.slug} href={mod.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      ...cardStyle,
                      padding: '28px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = mod.borderColor;
                      e.currentTarget.style.boxShadow = `0 8px 30px ${mod.hoverGlow}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Icon circle */}
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: mod.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px', marginBottom: '20px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}>
                      {mod.icon}
                    </div>

                    <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {mod.title}
                    </h3>
                    
                    <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
                      {mod.desc}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>
                      Manage Module <span>→</span>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Special diagnostics shortcut card for dashboard admins */}
              {hasDashboardAccess && (
                <div
                  onClick={() => setActiveTab('scanner')}
                  style={{
                    ...cardStyle,
                    padding: '28px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(236, 72, 153, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #EC4899, #F43F5E)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', marginBottom: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    🔍
                  </div>

                  <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Odoo Diagnostics Scanner
                  </h3>
                  
                  <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
                    Identify missing Pos recurring subscriptions and run instant database diagnostics on Odoo live.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#EC4899' }}>
                    Open Scanner Tab <span>→</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SCANNER TAB CONTENT (ADMIN DIAGNOSTICS) --- */}
      {activeTab === 'scanner' && hasDashboardAccess && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-in">
          
          {/* Header Card */}
          <div style={{
            ...cardStyle,
            background: 'var(--bg-banner-scanner)',
            borderColor: 'var(--border)',
            padding: '48px',
            boxShadow: '0 0 80px -20px var(--accent-glow)',
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
          }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
            <div style={{ position: 'relative' }}>
              <h1 style={{ margin: 0, fontSize: '42px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-1px' }}>
                System{' '}
                <span style={{ background: 'linear-gradient(135deg, #818CF8, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Scanner
                </span>
              </h1>
              <p style={{ margin: '12px 0 0', color: '#64748B', fontSize: '15px', maxWidth: '480px', lineHeight: 1.6 }}>
                Deep-scan Odoo live database to identify POS orders missing active recurring subscriptions.
              </p>
            </div>

            <button
              onClick={runScan}
              disabled={loading}
              style={{
                background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366F1, #22D3EE)',
                color: 'white', fontWeight: '700', fontSize: '15px',
                padding: '14px 32px', borderRadius: '12px', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 0 40px -10px rgba(99,102,241,0.5)',
                transition: 'all 0.3s', whiteSpace: 'nowrap', position: 'relative',
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                  Scanning...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  Run Diagnostics
                </>
              )}
            </button>
          </div>

          {/* --- Stat Cards --- */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {[
                { label: 'Active Subs',       value: summary.totalActiveSubscriptions, color: '#6366F1', glow: false },
                { label: 'POS Sub Orders',    value: summary.posOrdersWithSubs,        color: '#38BDF8', glow: false },
                { label: 'Valid (Skipped)',    value: summary.skipped,                  color: '#10B981', glow: false },
                { label: 'Missing Subs',      value: summary.wouldFix,                 color: '#F43F5E', glow: true  },
              ].map(({ label, value, color, glow }) => (
                <div key={label} style={{
                  ...cardStyle,
                  padding: '28px',
                  borderTop: '2px solid ' + color,
                  boxShadow: glow ? '0 0 30px -10px rgba(244,63,94,0.25)' : 'none',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>{label}</div>
                  <div style={{ fontSize: '48px', fontWeight: '900', color: color, lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* --- Results Table --- */}
          {results && results.length > 0 && (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>

              {/* Table Header */}
              <div style={{
                padding: '20px 28px',
                borderBottom: '1px solid var(--border-table)',
                backgroundColor: 'var(--bg-table-header)',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Analysis Results</h2>
                  <span style={{ backgroundColor: 'var(--bg-badge-pill)', color: 'var(--text-badge-pill)', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px', border: '1px solid var(--border-badge-pill)' }}>
                    {results.length} records
                  </span>
                </div>

                {/* Execute Fixes Button - shows when there are missing subs */}
                {missingCount > 0 && (
                  <button
                    onClick={executeFixes}
                    disabled={executing}
                    style={{
                      background: executing ? 'rgba(244,63,94,0.4)' : 'linear-gradient(135deg, #F43F5E, #E11D48)',
                      color: 'white', fontWeight: '700', fontSize: '14px',
                      padding: '12px 28px', borderRadius: '10px', border: 'none',
                      cursor: executing ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: '0 0 30px -8px rgba(244,63,94,0.6)',
                      transition: 'all 0.3s',
                    }}
                  >
                    {executing ? (
                      <>
                        <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                        Deploying Fixes...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        Execute {missingCount} Fixes Now
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Table Body */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-table)' }}>
                      {[['Order Ref','left'],['Customer','left'],['Product','left'],['Amount','right'],['Status','center']].map(([h, align]) => (
                        <th key={h} style={{ padding: '14px 24px', fontSize: '11px', fontWeight: '700', color: 'var(--text-table-header)', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: align }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: '1px solid var(--border-table)', backgroundColor: i % 2 !== 0 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 !== 0 ? 'var(--bg-table-stripe)' : 'transparent'}
                      >
                        <td style={{ padding: '15px 24px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{r.posOrder || '-'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>{r.invoiceNo || '-'}</div>
                        </td>
                        <td style={{ padding: '15px 24px', color: 'var(--text-secondary)', fontWeight: '600' }}>{r.customerName}</td>
                        <td style={{ padding: '15px 24px', color: 'var(--accent)' }}>{r.product}</td>
                        <td style={{ padding: '15px 24px', color: 'var(--text-primary)', fontWeight: '700', textAlign: 'right' }}>${r.amount?.toFixed(2)}</td>
                        <td style={{ padding: '15px 24px', textAlign: 'center' }}>
                          {r.status === 'would_fix' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '9999px', padding: '4px 12px', fontSize: '11px', fontWeight: '700', color: '#F43F5E' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F43F5E', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                              Missing Sub
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '9999px', padding: '4px 12px', fontSize: '11px', fontWeight: '700', color: '#10B981' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- Execution Logs --- */}
          {logs.length > 0 && (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-table)', backgroundColor: 'var(--bg-table-header)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Execution Logs</h3>
                <span style={{ backgroundColor: 'var(--bg-badge-pill)', color: 'var(--text-badge-pill)', fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '9999px' }}>{logs.length}</span>
              </div>
              <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'monospace', fontSize: '13px' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: '16px', flexWrap: 'wrap',
                      padding: '12px 16px', borderRadius: '10px',
                      backgroundColor: log.status === 'fixed' ? 'rgba(16,185,129,0.05)' : 'rgba(244,63,94,0.05)',
                      border: '1px solid ' + (log.status === 'fixed' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'),
                    }}>
                      <span style={{ fontWeight: '700', width: '70px', flexShrink: 0, color: log.status === 'fixed' ? '#10B981' : '#F43F5E' }}>[{(log.status || '').toUpperCase()}]</span>
                      <span style={{ color: '#64748B', width: '90px', flexShrink: 0 }}>{log.id}</span>
                      <span style={{ color: '#CBD5E1', flex: 1 }}>{log.message || log.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-in Utility animation class */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}