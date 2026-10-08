'use client';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Theme Context ──────────────────────────────────────────────────────────────
// theme     : the resolved theme actually applied ('light' | 'dark')
// themePref : the user's choice ('light' | 'dark' | 'system')
export const ThemeContext = createContext({ theme: 'light', themePref: 'system', isDark: false, toggleTheme: () => {}, setThemePref: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ── Icons (Lucide-style, 1.75 stroke) ─────────────────────────────────────────
const Ico = ({ children, size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const HomeIcon      = () => <Ico><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ico>;
const MembersIcon   = () => <Ico><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>;
const CalIcon       = () => <Ico><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></Ico>;
const PnLIcon       = () => <Ico><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></Ico>;
const BankIcon      = () => <Ico><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></Ico>;
const ExpenseIcon   = () => <Ico><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v2m0 8v2"/></Ico>;
const BannerIcon    = () => <Ico><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></Ico>;
const PBIcon        = () => <Ico><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></Ico>;
const FlagIcon      = () => <Ico><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></Ico>;
const TrophyIcon    = () => <Ico><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7"/><path d="M14 14.66V17c0 .55.45 1 1 1h2"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></Ico>;
const FestivalIcon  = () => <Ico><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></Ico>;
const VendorIcon    = () => <Ico><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></Ico>;
const LedIcon       = () => <Ico><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></Ico>;
const SettingsIcon  = () => <Ico><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/><circle cx="9" cy="6" r="2" fill="var(--bg-primary)"/><circle cx="15" cy="12" r="2" fill="var(--bg-primary)"/><circle cx="8" cy="18" r="2" fill="var(--bg-primary)"/></Ico>;
const UsersIcon     = () => <Ico><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></Ico>;
const SunIcon       = () => <Ico size={15}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></Ico>;
const MoonIcon      = () => <Ico size={15}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Ico>;
const AutoIcon      = () => <Ico size={15}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></Ico>;
const LogoutIcon    = () => <Ico size={16}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></Ico>;
const SidebarIcon   = () => <Ico size={18}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" x2="9" y1="3" y2="21"/></Ico>;
const MenuIcon      = () => <Ico size={22}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></Ico>;
const CloseIcon     = () => <Ico size={20}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>;

// ── Navigation (grouped, like macOS System Settings) ───────────────────────────
const navGroups = [
  { title: null, links: [
    { href: '/', label: 'Dashboard', icon: <HomeIcon />, slug: 'dashboard' },
  ]},
  { title: 'Membership & Finance', links: [
    { href: '/reports',             label: 'Membership',        icon: <MembersIcon />, slug: 'reports' },
    { href: '/reports/monthly',     label: 'Monthly Report',    icon: <CalIcon />,     slug: 'monthly' },
    { href: '/reports/pnl',         label: 'HCC P&L',           icon: <PnLIcon />,     slug: 'pnl' },
    { href: '/reports/stripe',      label: 'Bank Statement',    icon: <BankIcon />,    slug: 'stripe' },
    { href: '/accounting/expenses', label: 'Expenses & Accounts', icon: <ExpenseIcon />, slug: 'expenses' },
  ]},
  { title: 'Events', links: [
    { href: '/indiafest',           label: 'India Fest 2026',   icon: <FlagIcon />,     slug: 'indiafest' },
    { href: '/indiafest/sponsors',  label: 'Sponsors',          icon: <TrophyIcon />,   slug: 'sponsors' },
    { href: '/navratri',            label: 'Navratri 2026',     icon: <FestivalIcon />, slug: 'navratri' },
    { href: '/navratri/vendors',    label: 'Navratri Vendors',  icon: <VendorIcon />,   slug: 'navratri_vendors' },
    { href: '/pickleball',          label: 'Pickleball',        icon: <PBIcon />,       slug: 'pickleball' },
    { href: '/led-ads',             label: 'LED Screen Ads',    icon: <LedIcon />,      slug: 'led_ads' },
    { href: '/banner',              label: 'Banner In',         icon: <BannerIcon />,   slug: 'banner' },
  ]},
  { title: 'Admin', links: [
    { href: '/settings',            label: 'Settings',          icon: <SettingsIcon />, slug: 'settings' },
    { href: '/settings/users',      label: 'User Management',   icon: <UsersIcon />,    slug: 'users', adminOnly: true },
  ]},
];

// ── Public routes — no sidebar ─────────────────────────────────────────────────────
const PUBLIC_PREFIXES = ['/register', '/login', '/navratri-2026', '/navratri/scanner', '/navratri/pickup', '/privacy'];
const isPublicRoute = (path) => PUBLIC_PREFIXES.some(p => path.startsWith(p));

const SIDEBAR_W = 232;
const SIDEBAR_W_COLLAPSED = 60;

// ── Main ClientLayout ──────────────────────────────────────────────────────────
export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [themePref, setThemePrefState] = useState('system');
  const [theme,     setTheme]          = useState('light');
  const [mounted,   setMounted]        = useState(false);
  const [user,      setUser]           = useState(null);
  const [sidebarOpen, setSidebarOpen]  = useState(false);
  const [collapsed,   setCollapsed]    = useState(false);
  const [isDesktop,   setIsDesktop]    = useState(true);

  const resolve = (pref) =>
    pref === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : pref;

  const applyPref = useCallback((pref) => {
    const resolved = resolve(pref);
    setThemePrefState(pref);
    setTheme(resolved);
    localStorage.setItem('hcc-theme', pref);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-pref', pref);
  }, []);

  // Load saved theme + sidebar state; follow the OS when set to System
  useEffect(() => {
    const saved = localStorage.getItem('hcc-theme') || 'system';
    applyPref(saved);
    setCollapsed(localStorage.getItem('hcc-sidebar') === 'collapsed');
    setMounted(true);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const mqw = window.matchMedia('(min-width: 1025px)');
    const onWidth = () => setIsDesktop(mqw.matches);
    onWidth();
    mqw.addEventListener('change', onWidth);
    const onChange = () => {
      if ((localStorage.getItem('hcc-theme') || 'system') === 'system') applyPref('system');
    };
    mq.addEventListener('change', onChange);
    return () => { mq.removeEventListener('change', onChange); mqw.removeEventListener('change', onWidth); };
  }, [applyPref]);

  // Fetch current user & close sidebar on navigation change
  useEffect(() => {
    setSidebarOpen(false);
    if (!isPublicRoute(pathname)) {
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(d => setUser(d.user || null))
        .catch(() => {});
    }
  }, [pathname]);

  // Background body scroll lock on mobile sidebar open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }, [router]);

  const toggleTheme = () => applyPref(theme === 'dark' ? 'light' : 'dark');
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('hcc-sidebar', next ? 'collapsed' : 'expanded');
  };

  const isDark = theme === 'dark';
  const ctx = { theme, themePref, isDark, toggleTheme, setThemePref: applyPref };

  // ── Public pages: no sidebar ───────────────────────────────────────────────
  if (isPublicRoute(pathname) || (pathname === '/' && !user)) {
    return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
  }

  // ── Admin pages: sidebar layout ───────────────────────────────────────────
  const canSee = (link) => {
    if (link.adminOnly) return user?.role === 'super_admin';
    if (!user) return true; // show all while loading
    if (link.href === '/') return true;
    if (user.role === 'super_admin') return true;
    const pages = user.allowedPages || [];
    return pages.includes('*') || pages.includes(link.slug) || (link.slug === 'navratri_vendors' && pages.includes('navratri'));
  };
  const isActive = (href) => pathname === href || (href !== '/' && pathname.startsWith(href) &&
    // don't highlight a parent when a more specific sibling matches (e.g. /reports vs /reports/monthly)
    !navGroups.flatMap(g => g.links).some(l => l.href !== href && l.href.startsWith(href) && pathname.startsWith(l.href)));

  const initial = user ? (user.name || user.email || 'A')[0].toUpperCase() : 'A';
  const rail = collapsed && isDesktop; // icon-only on desktop
  const width = rail ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;

  const themeOptions = [
    { id: 'light',  label: 'Light',  icon: <SunIcon /> },
    { id: 'system', label: 'Auto',   icon: <AutoIcon /> },
    { id: 'dark',   label: 'Dark',   icon: <MoonIcon /> },
  ];

  return (
    <ThemeContext.Provider value={ctx}>
      <div className="app-shell" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'var(--font-sans)', opacity: mounted ? 1 : 0, transition: 'opacity 0.2s', position: 'relative' }}>

        {/* Mobile top bar */}
        <header className="mobile-header-bar" style={{
          display: 'none', alignItems: 'center', justifyContent: 'space-between',
          height: 52, width: '100%', padding: '0 12px',
          backgroundColor: 'var(--bg-sidebar)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid var(--border)', position: 'fixed', top: 0, left: 0, zIndex: 990,
        }}>
          <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', padding: 8, borderRadius: 8 }}>
            <MenuIcon />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/hcc_logo.png" alt="HCC" style={{ height: 22, width: 'auto' }} />
            <span style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>HCC Portal</span>
          </div>
          <button onClick={toggleTheme} aria-label="Toggle theme" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 8 }}>
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 995, animation: 'fadeIn 0.2s ease-out' }} />
        )}

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside
          className={`sidebar-container ${sidebarOpen ? 'mobile-open' : ''}`}
          style={{
            '--sbw': `${width}px`,
            width: width, minWidth: width, height: '100vh',
            backgroundColor: 'var(--bg-sidebar)',
            backdropFilter: 'saturate(180%) blur(24px)', WebkitBackdropFilter: 'saturate(180%) blur(24px)',
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1000, flexShrink: 0,
            transition: 'width 0.25s cubic-bezier(0.25,0.1,0.25,1), min-width 0.25s cubic-bezier(0.25,0.1,0.25,1), transform 0.3s cubic-bezier(0.25,0.1,0.25,1)',
          }}
        >
          {/* Brand + collapse */}
          <div style={{ height: 52, padding: rail ? '0 0' : '0 10px 0 16px', display: 'flex', alignItems: 'center', justifyContent: rail ? 'center' : 'space-between', gap: 8, flexShrink: 0 }}>
            {!rail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <img src="/hcc_logo.png" alt="HCC" style={{ height: 26, width: 'auto' }} />
                <span style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.015em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  HCC <span style={{ color: 'var(--accent)' }}>Portal</span>
                </span>
              </div>
            )}
            <button className="sb-collapse-btn" onClick={toggleCollapsed} aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'} title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 7, borderRadius: 8 }}>
              <SidebarIcon />
            </button>
            <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu"
              style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}>
              <CloseIcon />
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: rail ? '6px 8px 12px' : '6px 10px 12px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {navGroups.map((group, gi) => {
              const links = group.links.filter(canSee);
              if (!links.length) return null;
              return (
                <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: gi === 0 ? 0 : (rail ? 8 : 14) }}>
                  {group.title && !rail && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em', padding: '0 10px 5px' }}>{group.title}</div>
                  )}
                  {group.title && rail && <div style={{ height: 1, background: 'var(--border)', margin: '0 8px 6px' }} />}
                  {links.map(({ href, label, icon }) => {
                    const active = isActive(href);
                    return (
                      <Link key={href} href={href} title={rail ? label : undefined} className={`sidebar-link${active ? ' is-active' : ''}`}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: rail ? 'center' : 'flex-start', gap: 10,
                          height: 32, padding: rail ? 0 : '0 10px', borderRadius: 8,
                          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                          backgroundColor: active ? 'var(--accent-glow)' : 'transparent',
                          fontWeight: active ? 600 : 500, fontSize: 13.5, letterSpacing: '-0.006em',
                          textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>
                        <span style={{ display: 'flex', flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{icon}</span>
                        {!rail && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Footer: appearance + account */}
          <div style={{ padding: rail ? '10px 8px' : '10px 10px 12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {!rail ? (
              <div role="radiogroup" aria-label="Appearance" style={{ display: 'flex', padding: 2, borderRadius: 9, backgroundColor: 'var(--bg-hover)' }}>
                {themeOptions.map(o => {
                  const on = themePref === o.id;
                  return (
                    <button key={o.id} role="radio" aria-checked={on} title={o.label} onClick={() => applyPref(o.id)}
                      style={{
                        flex: 1, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        color: on ? 'var(--text-primary)' : 'var(--text-muted)',
                        backgroundColor: on ? 'var(--bg-card)' : 'transparent',
                        boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
                      }}>
                      {o.icon}{o.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button onClick={toggleTheme} title="Toggle appearance" style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 8, background: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: rail ? 0 : '4px 2px', justifyContent: rail ? 'center' : 'flex-start' }}>
              <div title={rail ? (user?.name || user?.email || 'Account') : undefined} style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(145deg, var(--accent), var(--accent-strong))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12.5, fontWeight: 650, color: '#fff',
              }}>{initial}</div>
              {!rail && (
                <>
                  <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user ? user.name || 'Admin' : 'Admin'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user ? user.email : 'Active session'}</div>
                  </div>
                  <button onClick={handleLogout} title="Sign out" aria-label="Sign out"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 7, borderRadius: 8 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-error)'; e.currentTarget.style.background = 'var(--bg-error)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}>
                    <LogoutIcon />
                  </button>
                </>
              )}
            </div>
            {rail && (
              <button onClick={handleLogout} title="Sign out" aria-label="Sign out" style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 8, background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <LogoutIcon />
              </button>
            )}
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main className="main-content-layout" style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden', backgroundColor: 'var(--bg-primary)',
          height: '100vh', display: 'flex', flexDirection: 'column',
        }}>
          <div className="page-container" style={{ padding: '22px 28px 36px', maxWidth: 1440, width: '100%', margin: '0 auto', minHeight: '100%' }}>
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .sidebar-link { transition: background-color 0.15s ease, color 0.15s ease; }
        .sidebar-link:hover { background-color: var(--bg-hover) !important; color: var(--text-primary) !important; }
        .sidebar-link.is-active:hover { background-color: var(--accent-glow) !important; }
        .sb-collapse-btn:hover { background-color: var(--bg-hover) !important; color: var(--text-primary) !important; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 1024px) {
          .mobile-header-bar { display: flex !important; }
          .main-content-layout { padding-top: 52px !important; }
          .page-container { padding: 16px 14px 28px !important; }
          .sidebar-container {
            position: fixed !important; top: 0; left: 0; bottom: 0;
            width: 260px !important; min-width: 260px !important;
            transform: translateX(-100%); z-index: 1000 !important; height: 100vh !important;
            box-shadow: 8px 0 32px var(--shadow-color);
          }
          .sidebar-container.mobile-open { transform: translateX(0) !important; }
          .mobile-close-btn { display: flex !important; align-items: center; justify-content: center; }
          .sb-collapse-btn { display: none !important; }
        }
      `}</style>
    </ThemeContext.Provider>
  );
}
