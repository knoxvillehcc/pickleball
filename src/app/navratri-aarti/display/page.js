'use client';

import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

// Crisp inline SVG Icons (Apple/Executive style)
const Icons = {
  diya: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2c.5 2 2 3.5 2 5.5 0 2.5-2 3.5-2 3.5s-2-1-2-3.5C10 5.5 11.5 4 12 2z" fill="currentColor" fillOpacity="0.3" />
      <path d="M4 14c0 4 3.5 7 8 7s8-3 8-7c0-2-3-3-8-3s-8 1-8 3z" />
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  fullscreen: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  qrPhone: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
  sun: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41" />
    </svg>
  ),
  moon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
};

const getInitials = (name) => {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function AartiDisplayLivePage() {
  const [days, setDays] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedDayNum, setSelectedDayNum] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [biddingUrl, setBiddingUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [nextRefreshIn, setNextRefreshIn] = useState(15);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Load saved theme preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hcc_aarti_display_theme');
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('hcc_aarti_display_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isDark = theme === 'dark';

  // Generate High-Contrast QR Code linking to canonical bidding page
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dashboard.knoxvillemandir.org';
    const targetUrl = origin.includes('localhost')
      ? 'https://dashboard.knoxvillemandir.org/navratri-aarti'
      : `${origin}/navratri-aarti`;

    setBiddingUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR Code generation error:', err));
  }, []);

  // Fetch Days Data (polls every 15s)
  const fetchDays = useCallback(async () => {
    try {
      const res = await fetch('/api/navratri/aarti/days', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const fetchedDays = data.days || [];
        setDays(fetchedDays);
        setSettings(data.settings || null);
        setNextRefreshIn(15);

        // Auto-select today's festival day if not manually overridden
        setSelectedDayNum((prevSelected) => {
          if (prevSelected !== null) return prevSelected;

          const now = new Date();
          const todayIso = now.toISOString().split('T')[0];

          // Check if any day matches today's YYYY-MM-DD
          const todayMatch = fetchedDays.find((d) => d.event_date === todayIso);
          if (todayMatch) return todayMatch.day_number;

          // Otherwise find first open day
          const firstOpen = fetchedDays.find((d) => d.status !== 'closed' && !d.is_past_cutoff);
          return firstOpen ? firstOpen.day_number : (fetchedDays[0]?.day_number || 1);
        });
      }
    } catch (err) {
      console.error('Display sync fetch error:', err);
    }
  }, []);

  // 15-second polling loop
  useEffect(() => {
    fetchDays();

    const pollInterval = setInterval(() => {
      fetchDays();
    }, 15000);

    const countdownInterval = setInterval(() => {
      setNextRefreshIn((prev) => (prev > 1 ? prev - 1 : 15));
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(countdownInterval);
    };
  }, [fetchDays]);

  // Active day details
  const activeDay = days.find((d) => d.day_number === selectedDayNum) || days[0] || null;

  // Real-time Cutoff Countdown Clock
  useEffect(() => {
    if (!activeDay) return;

    const updateCountdown = () => {
      const now = new Date();
      const cutoff = new Date(activeDay.cutoff_time);
      const diff = cutoff - now;

      if (diff <= 0 || activeDay.status === 'closed') {
        setTimeLeft('Bidding Concluded');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const hStr = hours.toString().padStart(2, '0');
      const mStr = mins.toString().padStart(2, '0');
      const sStr = secs.toString().padStart(2, '0');

      setTimeLeft(`${hStr}h ${mStr}m ${sStr}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [activeDay]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Next Minimum Bid for Active Day
  const activeCurrentBid = Number(activeDay?.current_highest_bid || activeDay?.base_bid || 500);
  const activeBidsCount = Number(activeDay?.bids_count || 0);
  const activeNextStep = (activeCurrentBid >= (settings?.tier1_max || 3000))
    ? (settings?.tier2_increment || 250)
    : (settings?.tier1_increment || 500);
  const nextMinBid = activeBidsCount > 0 ? (activeCurrentBid + activeNextStep) : (activeDay?.base_bid || 500);

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        background: isDark
          ? 'radial-gradient(ellipse at 50% 0%, #1a0d03 0%, #0a0a0d 50%, #000000 100%)'
          : 'radial-gradient(ellipse at 50% 0%, #FFF9F3 0%, #F5F5F7 50%, #EBEBED 100%)',
        color: isDark ? '#FFFFFF' : '#1D1D1F',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'background 0.3s ease, color 0.3s ease',
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        @keyframes subtleGlowDark {
          0%, 100% { box-shadow: 0 16px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(232, 120, 12, 0.22); }
          50% { box-shadow: 0 16px 50px rgba(0, 0, 0, 0.6), 0 0 55px rgba(232, 120, 12, 0.45); }
        }
        @keyframes subtleGlowLight {
          0%, 100% { box-shadow: 0 14px 40px rgba(0, 0, 0, 0.08), 0 0 25px rgba(232, 120, 12, 0.16); }
          50% { box-shadow: 0 14px 40px rgba(0, 0, 0, 0.08), 0 0 45px rgba(232, 120, 12, 0.32); }
        }
        @keyframes orangeBreathe {
          0%, 100% {
            box-shadow: 0 0 12px rgba(255, 159, 10, 0.35), inset 0 0 10px rgba(255, 159, 10, 0.15);
            border-color: rgba(255, 159, 10, 0.6);
            background: rgba(255, 159, 10, 0.16);
          }
          50% {
            box-shadow: 0 0 28px rgba(255, 159, 10, 0.85), inset 0 0 18px rgba(255, 159, 10, 0.35);
            border-color: #FF9F0A;
            background: rgba(255, 159, 10, 0.35);
          }
        }
        @keyframes orangeDotBreathe {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 6px #FF9F0A; }
          50% { transform: scale(1.35); opacity: 0.75; box-shadow: 0 0 16px #FF9F0A; }
        }
        .jumbotron-text-glow-dark {
          text-shadow: 0 0 50px rgba(255, 159, 10, 0.6), 0 0 100px rgba(232, 120, 12, 0.4);
        }
        .jumbotron-text-glow-light {
          text-shadow: 0 4px 22px rgba(217, 119, 6, 0.32);
        }
        .display-hero-card {
          animation: ${isDark ? 'subtleGlowDark' : 'subtleGlowLight'} 4s ease-in-out infinite;
        }
        .display-qr-card {
          animation: ${isDark ? 'subtleGlowDark' : 'subtleGlowLight'} 4s ease-in-out infinite;
        }
      `}</style>

      {/* ── TOP HEADER / EXECUTIVE STAGE NAVIGATION ─────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '8px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          flexShrink: 0,
        }}
      >
        {/* Mandir Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isDark
                ? 'linear-gradient(135deg, rgba(232, 120, 12, 0.4) 0%, rgba(232, 120, 12, 0.12) 100%)'
                : 'linear-gradient(135deg, rgba(232, 120, 12, 0.22) 0%, rgba(232, 120, 12, 0.08) 100%)',
              border: isDark ? '1.5px solid rgba(232, 120, 12, 0.55)' : '1.5px solid rgba(232, 120, 12, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#FF9F0A' : '#D97706',
              boxShadow: isDark ? '0 4px 18px rgba(232, 120, 12, 0.35)' : '0 3px 12px rgba(232, 120, 12, 0.2)',
              flexShrink: 0,
            }}
          >
            {Icons.diya}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.14em', color: isDark ? '#FF9F0A' : '#D97706', textTransform: 'uppercase' }}>
              Hindu Community Center of Knoxville
            </div>
            <div style={{ fontSize: '19px', fontWeight: '800', letterSpacing: '-0.02em', color: isDark ? '#FFFFFF' : '#1D1D1F', marginTop: '1px' }}>
              Navratri 2026 · Daily Aarti Seva Stage
            </div>
          </div>
        </div>

        {/* Live Running Timer, Dark/Light Mode Switch & Fullscreen Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Running Seconds Countdown Beacon (No 'Live Auto-Sync' text) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              border: isDark ? '1.5px solid rgba(255, 255, 255, 0.16)' : '1.5px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: '800',
              color: isDark ? '#E5E5E7' : '#1D1D1F',
              fontVariantNumeric: 'tabular-nums',
            }}
            title="Auto-refresh countdown"
          >
            <span
              style={{
                width: '7.5px',
                height: '7.5px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.35)',
                animation: 'pulseDot 2s infinite ease-in-out',
                display: 'inline-block',
              }}
            />
            <span style={{ color: isDark ? '#FF9F0A' : '#C25E00', fontWeight: '900' }}>
              {nextRefreshIn}s
            </span>
          </div>

          {/* Dark / Light Mode Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              border: isDark ? '1.5px solid rgba(255, 255, 255, 0.18)' : '1.5px solid rgba(0, 0, 0, 0.12)',
              borderRadius: '999px',
              padding: '6px 13px',
              fontSize: '12px',
              fontWeight: '700',
              color: isDark ? '#FFFFFF' : '#1D1D1F',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? Icons.sun : Icons.moon}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              border: isDark ? '1.5px solid rgba(255, 255, 255, 0.18)' : '1.5px solid rgba(0, 0, 0, 0.12)',
              borderRadius: '999px',
              padding: '6px 13px',
              fontSize: '12px',
              fontWeight: '700',
              color: isDark ? '#FFFFFF' : '#1D1D1F',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Toggle TV / Stage Fullscreen"
          >
            {Icons.fullscreen}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* ── 70-INCH JUMBOTRON STAGE: EXACT 75% HERO / 25% QR CODE SPLIT ────────── */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 3fr) minmax(280px, 1fr)',
          gap: '16px',
          alignItems: 'stretch',
          margin: '8px 0 0',
        }}
      >
        {/* ── 75% COLUMN: CENTERED STADIUM TODAY'S AARTI (HERO JUMBOTRON) ─────── */}
        {activeDay ? (
          <div
            className="display-hero-card"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: isDark
                ? (activeDay.is_maha_aarti
                    ? 'linear-gradient(150deg, rgba(232, 120, 12, 0.25) 0%, rgba(22, 22, 28, 0.94) 55%, rgba(10, 10, 14, 0.98) 100%)'
                    : 'linear-gradient(150deg, rgba(32, 32, 42, 0.9) 0%, rgba(16, 16, 22, 0.98) 100%)')
                : (activeDay.is_maha_aarti
                    ? 'linear-gradient(150deg, #FFF6EC 0%, #FFFFFF 55%, #FFF0DE 100%)'
                    : 'linear-gradient(150deg, #FFFFFF 0%, #FAFAF8 100%)'),
              border: isDark
                ? (activeDay.is_maha_aarti ? '2.5px solid rgba(232, 120, 12, 0.7)' : '2px solid rgba(232, 120, 12, 0.4)')
                : (activeDay.is_maha_aarti ? '2.5px solid #FF9F0A' : '2px solid rgba(232, 120, 12, 0.35)'),
              borderRadius: '24px',
              padding: 'clamp(16px, 2vw, 26px)',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
              transition: 'background 0.3s ease, border-color 0.3s ease',
            }}
          >
            {/* Top Tier: D1–D10 Day Switcher + Header Row + Big Day Title */}
            <div>
              {/* D1–D10 Compact Day Switcher Pill Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                  overflowX: 'auto',
                }}
              >
                {days.map((d) => {
                  const isSel = d.day_number === activeDay.day_number;
                  const isMaha = d.is_maha_aarti;
                  return (
                    <button
                      key={d.day_number}
                      onClick={() => setSelectedDayNum(d.day_number)}
                      type="button"
                      style={{
                        background: isSel ? '#FF9F0A' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                        color: isSel ? '#000000' : (isDark ? '#A1A1A6' : '#6E6E73'),
                        border: isSel
                          ? '1.5px solid #FF9F0A'
                          : isMaha
                          ? (isDark ? '1.5px solid rgba(232, 120, 12, 0.45)' : '1.5px solid rgba(232, 120, 12, 0.55)')
                          : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.1)'),
                        borderRadius: '999px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      D{d.day_number} {isMaha ? '★' : ''}
                    </button>
                  );
                })}
              </div>

              {/* Day Badge, Date & Bidding Open (Orange Breathing Effect) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: '#FF9F0A',
                      color: '#000000',
                      fontSize: '14px',
                      fontWeight: '900',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Day {activeDay.day_number}
                  </span>

                  <span style={{ fontSize: '18px', fontWeight: '800', color: isDark ? '#FFFFFF' : '#1D1D1F', fontVariantNumeric: 'tabular-nums' }}>
                    {activeDay.formatted_date}
                  </span>

                  {activeDay.is_maha_aarti && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isDark ? 'rgba(255, 159, 10, 0.25)' : 'rgba(255, 159, 10, 0.16)',
                        border: isDark ? '1.5px solid rgba(255, 159, 10, 0.55)' : '1.5px solid rgba(217, 119, 6, 0.45)',
                        color: isDark ? '#FFB340' : '#B45309',
                        fontSize: '12px',
                        fontWeight: '800',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      ★ Maha Aarti (Aatham)
                    </span>
                  )}
                </div>

                {/* Status Pill (Orange with Glowing Breathing Effect) */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: activeDay.status === 'closed'
                      ? (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)')
                      : (isDark ? 'rgba(255, 159, 10, 0.2)' : 'rgba(255, 159, 10, 0.16)'),
                    border: activeDay.status === 'closed'
                      ? (isDark ? '1.5px solid rgba(255, 255, 255, 0.2)' : '1.5px solid rgba(0, 0, 0, 0.14)')
                      : (isDark ? '1.5px solid #FF9F0A' : '1.5px solid #D97706'),
                    color: activeDay.status === 'closed'
                      ? (isDark ? 'rgba(255, 255, 255, 0.7)' : '#6E6E73')
                      : (isDark ? '#FFB340' : '#B45309'),
                    borderRadius: '999px',
                    padding: '6px 18px',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    letterSpacing: '0.04em',
                    animation: activeDay.status !== 'closed' ? 'orangeBreathe 2.5s infinite ease-in-out' : 'none',
                  }}
                >
                  {activeDay.status !== 'closed' && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#FF9F0A',
                        display: 'inline-block',
                        animation: 'orangeDotBreathe 2s infinite ease-in-out',
                      }}
                    />
                  )}
                  <span>{activeDay.status === 'closed' ? 'Bidding Concluded' : 'Bidding Open'}</span>
                </div>
              </div>

              {/* Festival Day Title (HUGE, COMMANDING ACROSS 75%) */}
              <h2
                style={{
                  fontSize: 'clamp(32px, 4.2vw, 52px)',
                  fontWeight: '900',
                  letterSpacing: '-0.03em',
                  margin: '2px 0 0',
                  color: isDark ? '#FFFFFF' : '#1D1D1F',
                  lineHeight: 1.15,
                }}
              >
                {activeDay.day_title}
              </h2>
            </div>

            {/* ── CENTER JUMBOTRON: STADIUM NUMERAL & LEADING DEVOTEE (CENTERED) ─ */}
            <div
              style={{
                margin: 'auto 0',
                padding: '4px 0',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: isDark ? '#FF9F0A' : '#C25E00',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: '2px',
                }}
              >
                {activeDay.status === 'closed' ? 'Winning Aarti Seva Contribution' : 'Current Highest Bid'}
              </div>

              {/* Massive Stadium Size Amount ($1,000 / $500) Centered */}
              <div
                className={isDark ? 'jumbotron-text-glow-dark' : 'jumbotron-text-glow-light'}
                style={{
                  fontSize: 'clamp(98px, 14vw, 175px)',
                  fontWeight: '900',
                  color: isDark ? '#FF9F0A' : '#D97706',
                  letterSpacing: '-0.04em',
                  lineHeight: 0.9,
                  margin: '0 auto 8px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ${Number(activeDay.current_highest_bid || 500).toLocaleString()}
              </div>

              {/* Leading Devotee Sponsor Row (Centered & Massive) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  paddingTop: '8px',
                  borderTop: isDark ? '1.5px solid rgba(255, 255, 255, 0.12)' : '1.5px solid rgba(0, 0, 0, 0.08)',
                  width: '100%',
                  maxWidth: '750px',
                }}
              >
                {activeDay.current_winner_name ? (
                  <>
                    <div style={{ fontSize: '13px', color: isDark ? '#98989D' : '#6E6E73', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Leading Devotee Sponsor
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '14px',
                      }}
                    >
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FF9F0A 0%, #B85A05 100%)',
                          color: '#FFFFFF',
                          fontSize: '20px',
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 4px 18px rgba(232, 120, 12, 0.45)',
                        }}
                      >
                        {getInitials(activeDay.current_winner_name)}
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(32px, 4.4vw, 56px)',
                          fontWeight: '900',
                          color: isDark ? '#FFFFFF' : '#1D1D1F',
                          letterSpacing: '-0.02em',
                          lineHeight: 1.05,
                        }}
                      >
                        {activeDay.current_winner_name}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div style={{ fontSize: '15px', color: isDark ? '#98989D' : '#6E6E73' }}>
                      Opening Reserve: <strong style={{ color: isDark ? '#FFFFFF' : '#1D1D1F' }}>${Number(activeDay.base_bid || 500).toLocaleString()}</strong>
                    </div>
                    <div style={{ fontSize: 'clamp(22px, 2.8vw, 34px)', fontWeight: '800', color: isDark ? '#FF9F0A' : '#D97706', marginTop: '2px' }}>
                      First verified bid takes the lead!
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Tier: 3 Large Stats Cards Spanning Full 75% Width */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}
            >
              {/* Daily Bids Placed */}
              <div
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5F5F7',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <div style={{ fontSize: '11px', color: isDark ? '#8E8E93' : '#6E6E73', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Bids Placed Tonight
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: isDark ? '#FFFFFF' : '#1D1D1F', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  {activeDay.bids_count} {activeDay.bids_count === 1 ? 'bid' : 'bids'}
                </div>
              </div>

              {/* Next Minimum Bid */}
              <div
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5F5F7',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <div style={{ fontSize: '11px', color: isDark ? '#8E8E93' : '#6E6E73', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Next Minimum Bid
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: isDark ? '#34D399' : '#059669', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  ${nextMinBid.toLocaleString()}
                </div>
              </div>

              {/* Daily Cutoff Countdown */}
              <div
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5F5F7',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <div style={{ fontSize: '11px', color: isDark ? '#8E8E93' : '#6E6E73', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: isDark ? '#FF9F0A' : '#D97706' }}>{Icons.clock}</span>
                  <span>9:30 PM Cutoff</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: activeDay.status === 'closed' ? (isDark ? '#8E8E93' : '#6E6E73') : (isDark ? '#FF9F0A' : '#D97706'), marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  {timeLeft || '9:30 PM EST'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', color: isDark ? '#8E8E93' : '#6E6E73' }}>
            Loading live festival schedule...
          </div>
        )}

        {/* ── 25% COLUMN: FULL-HEIGHT SCANNABLE QR CODE CARD ─────────────────── */}
        <div
          className="display-qr-card"
          style={{
            height: '100%',
            background: isDark
              ? 'linear-gradient(160deg, rgba(28, 28, 38, 0.95) 0%, rgba(14, 14, 18, 0.98) 100%)'
              : 'linear-gradient(160deg, #FFFFFF 0%, #FAFAF8 100%)',
            border: isDark ? '2px solid rgba(232, 120, 12, 0.45)' : '2px solid rgba(232, 120, 12, 0.35)',
            borderRadius: '24px',
            padding: 'clamp(16px, 2vw, 24px) 14px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxSizing: 'border-box',
            transition: 'background 0.3s ease, border-color 0.3s ease',
          }}
        >
          {/* Header Tag and Title */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isDark ? 'rgba(232, 120, 12, 0.22)' : 'rgba(232, 120, 12, 0.14)',
                border: isDark ? '1.5px solid rgba(232, 120, 12, 0.55)' : '1.5px solid rgba(217, 119, 6, 0.4)',
                borderRadius: '999px',
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: '800',
                color: isDark ? '#FF9F0A' : '#B45309',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              {Icons.qrPhone} Scan to Bid
            </div>

            <h3
              style={{
                fontSize: 'clamp(18px, 2vw, 24px)',
                fontWeight: '900',
                color: isDark ? '#FFFFFF' : '#1D1D1F',
                letterSpacing: '-0.02em',
                margin: '0 0 4px',
                lineHeight: 1.15,
              }}
            >
              Sponsor Tonight&apos;s Aarti
            </h3>

            <p
              style={{
                fontSize: '12px',
                color: isDark ? '#A1A1A6' : '#6E6E73',
                margin: '0',
                lineHeight: 1.4,
              }}
            >
              Point camera to bid on phone
            </p>
          </div>

          {/* High-Contrast Pure White Squircle for QR Code */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px',
              borderRadius: '18px',
              boxShadow: isDark
                ? '0 12px 36px rgba(0, 0, 0, 0.7)'
                : '0 10px 30px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.15)',
              border: isDark ? 'none' : '1px solid rgba(0, 0, 0, 0.06)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 'auto 0',
            }}
          >
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Scan to Bid on Aarti Seva"
                style={{
                  display: 'block',
                  borderRadius: '6px',
                  width: 'clamp(150px, 22vh, 215px)',
                  height: 'clamp(150px, 22vh, 215px)',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Generating QR...
              </div>
            )}
          </div>

          {/* Direct URL and Trust Badge */}
          <div style={{ width: '100%' }}>
            <div
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '9.5px',
                color: isDark ? '#FF9F0A' : '#B45309',
                fontWeight: '800',
                fontFamily: 'monospace',
                letterSpacing: '-0.2px',
                display: 'block',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
              title={biddingUrl}
            >
              dashboard.knoxvillemandir.org/navratri-aarti
            </div>

            <div style={{ fontSize: '10px', color: isDark ? '#8E8E93' : '#6E6E73', marginTop: '5px', fontWeight: '600' }}>
              Instant OTP verification
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
