'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ClientLayout';

// ── Card style tokens ──────────────────────────────────────────────────────────
const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// ── Admin module configs ───────────────────────────────────────────────────────
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
    slug: 'indiafest',
    title: 'India Fest 2026 Vendors',
    desc: 'Manage vendor booth registrations, track payment status, and export vendor lists for India Fest 2026.',
    icon: '🪔',
    color: 'linear-gradient(135deg, #FF9933, #E07C1A)',
    borderColor: 'rgba(255, 153, 51, 0.3)',
    hoverGlow: 'rgba(255, 153, 51, 0.08)',
    href: '/indiafest',
  },
  {
    slug: 'sponsors',
    title: 'India Fest 2026 Sponsors',
    desc: 'Manage Grand Sponsor registrations, track $5,000 payments, publish/unpublish the sponsor form, and export sponsor lists.',
    icon: '🏆',
    color: 'linear-gradient(135deg, #D4AF37, #B8960C)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
    hoverGlow: 'rgba(212, 175, 55, 0.08)',
    href: '/indiafest/sponsors',
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

// ── Public landing page (shown to logged-out visitors) ─────────────────────────
function PublicLanding() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [pbOpen,   setPbOpen]   = useState(false);
  const [ifOpen,   setIfOpen]   = useState(false);
  const [gspOpen,  setGspOpen]  = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/pickleball/settings?key=is_published').then(r => r.json()).catch(() => ({})),
      fetch('/api/indiafest/settings?key=is_published').then(r => r.json()).catch(() => ({})),
      fetch('/api/indiafest/sponsor/settings?key=is_published').then(r => r.json()).catch(() => ({}))
    ]).then(([pb, ifest, gsp]) => {
      setPbOpen(pb.is_published === true || pb.value === 'true');
      setIfOpen(ifest.is_published === true || ifest.value === 'true');
      setGspOpen(gsp.is_published === true || gsp.value === 'true');
    }).finally(() => {
      setLoadingStatus(false);
    });
  }, []);

  const [hovered, setHovered] = useState(null);

  const options = [
    {
      title: 'Pickleball Registration',
      desc: 'Register your doubles team for the HCC Pickleball Tournament. Flat entry fee of $50 per team.',
      href: '/register/pickleball',
      accentColor: 'var(--accent)',
      glowColor: 'var(--accent-glow)',
      borderColor: 'var(--border)',
      icon: '🏸',
      badge: 'Sports Event',
      cta: pbOpen ? 'Register Online' : 'Registration Closed',
      isOpen: pbOpen,
    },
    {
      title: 'IndiaFest Vendor Registration',
      desc: 'Reserve your booth for IndiaFest 2026 (Aug 23, 11am-5pm). Home Business ($351) or Established Store ($1001).',
      href: '/register/indiafest/vendor',
      accentColor: '#FF9933',
      glowColor: 'rgba(255, 153, 51, 0.12)',
      borderColor: 'var(--border)',
      icon: '🎪',
      badge: 'Cultural Festival',
      cta: ifOpen ? 'Book Space' : 'Registration Closed',
      isOpen: ifOpen,
    },
    {
      title: 'Grand Sponsor — India Fest 2026',
      desc: 'Become a Grand Sponsor of IndiaFest 2026 ($5,001+). Includes Logo on Marketing Materials, Dedicated 10×10 Booth, On-Stage Announcement & Banner Display.',
      href: '/register/indiafest/sponsor',
      accentColor: '#D4AF37',
      glowColor: 'rgba(212, 175, 55, 0.12)',
      borderColor: 'var(--border)',
      icon: '🏆',
      badge: 'Grand Sponsorship',
      cta: gspOpen ? 'Become a Grand Sponsor' : 'Registration Closed',
      isOpen: gspOpen,
    },
    {
      title: 'Admin & Staff Portal',
      desc: 'Authorized operator access to system configurations, Odoo discrepancy scanner, logs, and report lists.',
      href: '/login',
      accentColor: '#8B1E3F',
      glowColor: 'rgba(139, 30, 63, 0.12)',
      borderColor: 'var(--border)',
      icon: '🔑',
      badge: 'Staff Only',
      cta: 'Operator Login',
      isOpen: true,
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflowY: 'auto',
      background: 'var(--bg-primary)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      color: 'var(--text-primary)',
      transition: 'background-color 0.3s, color 0.3s',
    }}>
      {/* Top flag stripe */}
      <div style={{ height: '5px', background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)', flexShrink: 0 }}/>

      {/* Responsive Rounded Pill Header Header */}
      <header style={{ width: '100%', maxWidth: '1100px', margin: '24px auto 0', padding: '0 24px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '50px', padding: '12px 28px',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/hcc_logo.png" alt="HCC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            <div style={{ borderLeft: '1.5px solid var(--border)', paddingLeft: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: '850', color: 'var(--text-primary)', letterSpacing: '0.2px' }}>Hindu Community Center</div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Knoxville, TN</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="https://www.knoxvillemandir.org" target="_blank" rel="noreferrer" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Visit Temple Website
            </a>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: '50%', width: '38px', height: '38px',
                display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
                transition: 'all 0.25s ease', fontSize: '16px',
              }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main content body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 60px', position: 'relative' }}>
        
        {/* Welcome Hero */}
        <div style={{ textAlign: 'center', marginBottom: '44px', maxWidth: '640px' }}>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(32px, 5.5vw, 56px)', fontWeight: '950', color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            HCC Registrations & Portal
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: '500' }}>
            Welcome to the Knoxville Hindu Community Center portal. Select an event below to register and secure your space.
          </p>
        </div>

        {/* Three Option Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '24px',
          width: '100%',
          maxWidth: '1000px',
        }}>
          {options.map((opt, i) => {
            const active = hovered === i;
            return (
              <Link key={i} href={opt.isOpen ? opt.href : '#'} style={{ textDecoration: 'none', cursor: opt.isOpen ? 'pointer' : 'not-allowed' }}>
                <div
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: 'var(--bg-card)',
                    border: active && opt.isOpen
                      ? `2px solid ${opt.accentColor}`
                      : '2px solid var(--border)',
                    borderRadius: '20px',
                    padding: '36px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    transform: active && opt.isOpen ? 'translateY(-6px)' : 'translateY(0)',
                    boxShadow: active && opt.isOpen
                      ? `0 12px 30px ${opt.glowColor}, var(--shadow)`
                      : 'var(--shadow)',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: opt.isOpen ? 1 : 0.65,
                  }}
                >
                  {/* Category Badge & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: active && opt.isOpen ? `${opt.accentColor}25` : 'var(--bg-input)',
                      borderRadius: '99px', padding: '4px 10px',
                      border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: '850', color: active && opt.isOpen ? opt.accentColor : 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                        {opt.badge}
                      </span>
                    </div>

                    {opt.title !== 'Admin & Staff Portal' && (
                      <span style={{
                        fontSize: '11px', fontWeight: '700',
                        color: opt.isOpen ? 'var(--text-success)' : 'var(--text-error)',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.isOpen ? 'var(--text-success)' : 'var(--text-error)' }}/>
                        {opt.isOpen ? 'Open' : 'Closed'}
                      </span>
                    )}
                  </div>

                  {/* Icon */}
                  <div style={{
                    width: '54px', height: '54px', borderRadius: '12px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px', marginBottom: '20px',
                  }}>
                    {opt.icon}
                  </div>

                  {/* Title & Desc */}
                  <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                    {opt.title}
                  </h2>
                  <p style={{ margin: '0 0 28px', fontSize: '13.5px', lineHeight: '1.6', color: 'var(--text-secondary)', flex: 1 }}>
                    {opt.desc}
                  </p>

                  {/* Action Link Indicator */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '13.5px', fontWeight: '800',
                    color: opt.isOpen ? opt.accentColor : 'var(--text-muted)',
                    transition: 'all 0.25s',
                  }}>
                    <span>{opt.cta}</span>
                    {opt.isOpen && <span style={{ transition: 'transform 0.2s', transform: active ? 'translateX(4px)' : 'translateX(0)' }}>→</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer info and address */}
        <footer style={{ marginTop: '64px', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '28px', width: '100%', maxWidth: '1000px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span>8580 Hickory Creek Rd, Lenoir City, TN 37771</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <a href="tel:865-988-3820" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>+1 865-988-3820</a>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            © 2026 Knoxville Hindu Community Center · All rights reserved
          </div>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ── Admin dashboard ────────────────────────────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <div style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '15px' }}>Loading...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not logged in → show public landing ───────────────────────────────────
  if (!user) {
    return <PublicLanding />;
  }

  // ── Logged in → show admin dashboard ──────────────────────────────────────
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

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-in">

          {/* Welcome Banner */}
          <div className="mobile-p-4" style={{
            ...cardStyle,
            background: 'var(--bg-banner-grad)',
            borderColor: 'var(--border-hover)',
            padding: 'clamp(20px, 4vw, 48px)',
            boxShadow: '0 0 60px -20px var(--accent-glow)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '99px', background: 'var(--accent-glow)', border: '1px solid var(--border)', marginBottom: '20px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-success)', boxShadow: '0 0 6px var(--text-success)' }} />
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {user?.role === 'super_admin' ? 'Super Admin Session' : 'Staff Session'}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: '950', color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                Welcome to the{' '}
                <span style={{ background: 'linear-gradient(135deg, var(--accent) 30%, #D4AF37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  HCC Admin Portal
                </span>
              </h1>
              <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '580px', lineHeight: 1.6, fontWeight: '500' }}>
                Hello, <strong>{user?.name || 'User'}</strong>! Choose an action below or browse the sidebar to manage the Knoxville Hindu Community Center activities.
              </p>
            </div>
          </div>

          {/* Quick Access Card Grid */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>
              Your Allowed Modules ({allowedModules.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {allowedModules.map((mod) => (
                <Link key={mod.slug} href={mod.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ ...cardStyle, padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative' }}
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
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: mod.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                      {mod.icon}
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>{mod.title}</h3>
                    <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{mod.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>
                      Manage Module <span>→</span>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Diagnostics shortcut card */}
              {hasDashboardAccess && (
                <div
                  onClick={() => setActiveTab('scanner')}
                  style={{ ...cardStyle, padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative' }}
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
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #EC4899, #F43F5E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    🔍
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>Odoo Diagnostics Scanner</h3>
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

      {/* --- SCANNER TAB --- */}
      {activeTab === 'scanner' && hasDashboardAccess && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-in">
          <div className="mobile-p-4" style={{
            ...cardStyle,
            background: 'var(--bg-banner-scanner)',
            borderColor: 'var(--border)',
            padding: 'clamp(20px, 4vw, 32px)',
            boxShadow: 'var(--shadow)',
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
          }}>
            <div style={{ position: 'relative' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '950', color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                System{' '}
                <span style={{ background: 'linear-gradient(135deg, var(--accent) 30%, #D4AF37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Scanner</span>
              </h1>
              <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', lineHeight: 1.6, fontWeight: '500' }}>
                Deep-scan Odoo live database to identify POS orders missing active recurring subscriptions.
              </p>
            </div>
            <button onClick={runScan} disabled={loading} style={{
              background: loading ? 'rgba(51,65,85,0.5)' : 'var(--accent)',
              color: 'white', fontWeight: '800', fontSize: '14.5px',
              padding: '12px 28px', borderRadius: '12px', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: '0 4px 12px var(--accent-glow)',
              transition: 'all 0.3s', whiteSpace: 'nowrap', position: 'relative',
            }}>
              {loading ? (
                <><span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>Scanning...</>
              ) : (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Run Diagnostics</>
              )}
            </button>
          </div>

          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {[
                { label: 'Active Subs',       value: summary.totalActiveSubscriptions, color: 'var(--accent)', glow: false },
                { label: 'POS Sub Orders',    value: summary.posOrdersWithSubs,        color: 'var(--accent)', glow: false },
                { label: 'Valid (Skipped)',    value: summary.skipped,                  color: 'var(--text-success)', glow: false },
                { label: 'Missing Subs',      value: summary.wouldFix,                 color: 'var(--text-error)', glow: true  },
              ].map(({ label, value, color, glow }) => (
                <div key={label} style={{ ...cardStyle, padding: '24px', borderTop: '3.5px solid ' + color, boxShadow: glow ? '0 4px 12px var(--accent-glow)' : 'var(--shadow)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>{label}</div>
                  <div style={{ fontSize: '36px', fontWeight: '950', color: color, lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {results && results.length > 0 && (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-table)', backgroundColor: 'var(--bg-table-header)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Analysis Results</h2>
                  <span style={{ backgroundColor: 'var(--bg-badge-pill)', color: 'var(--text-badge-pill)', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '9999px', border: '1px solid var(--border-badge-pill)' }}>{results.length} records</span>
                </div>
                {missingCount > 0 && (
                  <button onClick={executeFixes} disabled={executing} style={{ background: executing ? 'rgba(244,63,94,0.4)' : 'linear-gradient(135deg, #F43F5E, #E11D48)', color: 'white', fontWeight: '700', fontSize: '14px', padding: '12px 28px', borderRadius: '10px', border: 'none', cursor: executing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 30px -8px rgba(244,63,94,0.6)', transition: 'all 0.3s' }}>
                    {executing ? (<><span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>Deploying Fixes...</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Execute {missingCount} Fixes Now</>)}
                  </button>
                )}
              </div>
              <div className="table-responsive">
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
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-table)', backgroundColor: i % 2 !== 0 ? 'var(--bg-table-stripe)' : 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-glow)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 !== 0 ? 'var(--bg-table-stripe)' : 'transparent'}>
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
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F43F5E', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>Missing Sub
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '9999px', padding: '4px 12px', fontSize: '11px', fontWeight: '700', color: '#10B981' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>Valid
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
                    <div key={i} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '12px 16px', borderRadius: '10px', backgroundColor: log.status === 'fixed' ? 'rgba(16,185,129,0.05)' : 'rgba(244,63,94,0.05)', border: '1px solid ' + (log.status === 'fixed' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)') }}>
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

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}