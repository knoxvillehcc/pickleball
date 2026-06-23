'use client';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Theme Context ──────────────────────────────────────────────────────────────
export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ── Icons ──────────────────────────────────────────────────────────────────────
const HomeIcon     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ReportsIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>;
const CalIcon      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const BannerIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
const PBIcon       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const SettingsIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const UsersIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SunIcon      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>;
const MoonIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

const navLinks = [
  { href: '/',                label: 'Dashboard',      icon: <HomeIcon />,     slug: 'dashboard' },
  { href: '/reports',        label: 'Membership',     icon: <ReportsIcon />,  slug: 'reports' },
  { href: '/reports/monthly',label: 'Monthly Report', icon: <CalIcon />,      slug: 'monthly' },
  { href: '/banner',         label: 'Banner In',      icon: <BannerIcon />,   slug: 'banner' },
  { href: '/pickleball',     label: 'Pickleball',     icon: <PBIcon />,       slug: 'pickleball' },
  { href: '/settings',       label: 'Settings',       icon: <SettingsIcon />, slug: 'settings' },
  { href: '/settings/users', label: 'User Management',icon: <UsersIcon />,    slug: 'users', adminOnly: true },
];

// ── Public routes — no sidebar ─────────────────────────────────────────────────────
const PUBLIC_PREFIXES = ['/register', '/login'];
const isPublicRoute = (path) => PUBLIC_PREFIXES.some(p => path.startsWith(p));

// ── Main ClientLayout ──────────────────────────────────────────────────────────
export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [theme,   setTheme]   = useState('dark');
  const [mounted, setMounted] = useState(false);
  const [user,    setUser]    = useState(null);

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem('hcc-theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    setMounted(true);
  }, []);

  // Fetch current user
  useEffect(() => {
    if (!isPublicRoute(pathname)) {
      fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {});
    }
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }, [router]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('hcc-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const isDark = theme === 'dark';

  // ── Public pages: no sidebar ───────────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    return (
      <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  // ── Admin pages: full sidebar layout ──────────────────────────────────────
  const sidebarBg    = isDark ? 'rgba(10,15,28,0.97)' : '#FFFFFF';
  const sidebarBorder= isDark ? 'rgba(51,65,85,0.5)'  : 'rgba(203,213,225,0.9)';
  const mainBg       = isDark ? '#080C14'              : '#F0F4F8';
  const textPrimary  = isDark ? '#FFFFFF'              : '#0F172A';
  const textMuted    = isDark ? '#64748B'              : '#94A3B8';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      <div style={{
        display: 'flex', height: '100vh', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        opacity: mounted ? 1 : 0, transition: 'opacity 0.2s',
      }}>
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside style={{
          width: '260px', minWidth: '260px', height: '100vh',
          backgroundColor: sidebarBg,
          borderRight: `1px solid ${sidebarBorder}`,
          display: 'flex', flexDirection: 'column', position: 'relative',
          zIndex: 20, flexShrink: 0,
          boxShadow: isDark ? 'none' : '2px 0 12px rgba(0,0,0,0.06)',
          transition: 'background-color 0.3s, border-color 0.3s',
        }}>

          {/* Logo */}
          <div style={{ padding: '28px 24px', borderBottom: `1px solid ${sidebarBorder}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1, #38BDF8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '900', fontSize: '18px',
              boxShadow: '0 0 20px rgba(99,102,241,0.35)', flexShrink: 0,
            }}>H</div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: textPrimary, letterSpacing: '-0.3px' }}>
              Agent<span style={{ color: '#818CF8' }}>Hub</span>
            </span>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px', paddingLeft: '12px' }}>
              NAVIGATION
            </div>
            {navLinks.filter(link => {
              if (link.adminOnly) return user?.role === 'super_admin';
              if (!user) return true; // show all while loading
              // Welcome page / Dashboard is always visible to any authenticated user
              if (link.href === '/') return true;
              // Super admin always sees all non-adminOnly links
              if (user.role === 'super_admin') return true;
              // Staff: check allowed pages
              const pages = user.allowedPages || [];
              return pages.includes('*') || pages.includes(link.slug);
            }).map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 14px', borderRadius: '12px',
                  color: active ? '#818CF8' : textMuted,
                  backgroundColor: active ? (isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)') : 'transparent',
                  border: active ? `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}` : '1px solid transparent',
                  fontWeight: active ? '700' : '600', fontSize: '14px',
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
                className="sidebar-link">
                  <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
                  {label}
                  {active && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#818CF8' }}/>}
                </Link>
              );
            })}
          </nav>

          {/* Footer: Theme toggle + user */}
          <div style={{ padding: '16px', borderTop: `1px solid ${sidebarBorder}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '12px', border: `1px solid ${sidebarBorder}`,
                backgroundColor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(241,245,249,0.8)',
                color: textMuted, cursor: 'pointer', width: '100%',
                fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#818CF8'}
              onMouseLeave={e => e.currentTarget.style.borderColor = sidebarBorder}
            >
              <span style={{ color: isDark ? '#F59E0B' : '#6366F1' }}>
                {isDark ? <SunIcon /> : <MoonIcon />}
              </span>
              {isDark ? 'Light Mode' : 'Dark Mode'}
              {/* Toggle pill */}
              <span style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center',
                width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                backgroundColor: isDark ? 'rgba(99,102,241,0.3)' : '#6366F1',
                transition: 'background-color 0.3s',
              }}>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                  transform: isDark ? 'translateX(0)' : 'translateX(16px)',
                  transition: 'transform 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}/>
              </span>
            </button>

            {/* User info + Logout */}
            <div style={{
              padding: '12px 14px', borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(241,245,249,0.8)',
              border: `1px solid ${sidebarBorder}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                  border: '2px solid rgba(99,102,241,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: '#818CF8',
                }}>
                  {user ? user.email[0].toUpperCase() : 'AD'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: textPrimary, lineHeight: 1.2 }}>
                    {user ? user.name || 'Admin' : 'Admin User'}
                  </div>
                  <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user ? user.email : 'Active Session'}
                  </div>
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }}/>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)',
                  background: 'rgba(239,68,68,0.08)', color: '#FC8181',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.5px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          backgroundColor: mainBg,
          backgroundImage: isDark
            ? 'radial-gradient(at 0% 0%, rgba(30,27,75,0.35) 0, transparent 55%), radial-gradient(at 90% 10%, rgba(14,116,144,0.07) 0, transparent 50%)'
            : 'none',
          transition: 'background-color 0.3s',
        }}>
          <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', minHeight: '100%' }}>
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .sidebar-link:hover {
          background-color: ${isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)'} !important;
          color: ${isDark ? 'white' : '#0F172A'} !important;
          border-color: ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.12)'} !important;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(51,65,85,0.8); border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(71,85,105,1); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </ThemeContext.Provider>
  );
}
