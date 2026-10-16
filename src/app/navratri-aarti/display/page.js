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
  bolt: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
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
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Screen Wake Lock API (keeps TV, Firestick Silk Browser, and devices active without sleeping)
  const requestWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        const sentinel = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        sentinel.addEventListener('release', () => {
          setWakeLockActive(false);
        });
        return sentinel;
      }
    } catch (err) {
      console.warn('Screen Wake Lock request:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    let sentinel = null;

    requestWakeLock().then((s) => {
      sentinel = s;
    });

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        requestWakeLock().then((s) => {
          sentinel = s;
        });
      }
    };

    const handleInteraction = () => {
      requestWakeLock().then((s) => {
        sentinel = s;
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      if (sentinel) {
        sentinel.release().catch(() => {});
      }
    };
  }, [requestWakeLock]);

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
  const activeCurrentBid = Number(activeDay?.current_highest_bid || activeDay?.base_bid || settings?.base_bid || 500);
  const activeBidsCount = Number(activeDay?.bids_count || 0);
  const activeNextStep = (activeCurrentBid >= Number(settings?.tier1_max || 3000))
    ? Number(settings?.tier2_increment || 250)
    : Number(settings?.tier1_increment || 500);
  const nextMinBid = activeBidsCount > 0 ? (activeCurrentBid + activeNextStep) : Number(activeDay?.base_bid || settings?.base_bid || 500);

  // Dynamic Knoxville / Eastern cutoff time formatting (e.g. "9:45 PM", "10:00 PM")
  const formattedCutoffTime = activeDay?.cutoff_time
    ? new Date(activeDay.cutoff_time).toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
      })
    : (() => {
        try {
          const raw = settings?.daily_cutoff_time || '21:45';
          const [hStr, mStr] = raw.split(':');
          const h = parseInt(hStr, 10);
          const m = parseInt(mStr, 10);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 === 0 ? 12 : h % 12;
          return `${h12}:${isNaN(m) ? '00' : m.toString().padStart(2, '0')} ${ampm}`;
        } catch {
          return '9:45 PM';
        }
      })();

  // Check if bidding has concluded (time expired OR admin manually closed)
  const isPastCutoff = activeDay?.cutoff_time
    ? new Date() >= new Date(activeDay.cutoff_time)
    : false;
  const isConcluded = Boolean(
    activeDay && (activeDay.status === 'closed' || isPastCutoff || timeLeft === 'Bidding Concluded' || activeDay.is_locked)
  );

  const winnerDisplayName =
    settings?.show_bidder_names === false
      ? 'Devotee Sponsor'
      : (activeDay?.locked_sponsor_name || activeDay?.current_winner_name || (activeDay?.bids_count > 0 ? 'Devotee Sponsor' : ''));
  const hasWinner = Boolean(activeDay && (activeDay.current_winner_name || activeDay.locked_sponsor_name || activeDay.bids_count > 0 || activeDay.is_locked));

  return (
    <div
      className="aarti-display-root"
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
        @keyframes goldenCelebrationGlow {
          0%, 100% {
            box-shadow: 0 0 25px rgba(255, 159, 10, 0.4), inset 0 0 15px rgba(255, 159, 10, 0.15);
            border-color: rgba(255, 159, 10, 0.6);
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 159, 10, 0.75), inset 0 0 25px rgba(255, 159, 10, 0.3);
            border-color: #FF9F0A;
          }
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

        /* ==========================================================================
           MULTI-DEVICE AUTO-DETECTION ARCHITECTURE
           Priority: (1) iPhone -> (2) iPad -> (3) Desktop Browser -> (4) TV Screen
           Specifically optimized for Landscape view
           ========================================================================== */

        /* ── 1. IPHONE (FIRST PRIORITY) ───────────────────────────────────────── */

        /* 1A. iPhone Landscape (Height <= 520px) ── */
        /* Targets iPhone SE, 12, 13, 14, 15, 16 Pro/Max held horizontally */
        @media (orientation: landscape) and (max-height: 520px),
               (max-width: 950px) and (max-height: 480px) {
          .aarti-display-root {
            height: auto !important;
            min-height: 100vh !important;
            max-height: none !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 6px 10px 18px !important;
          }
          .aarti-stage-header {
            padding-bottom: 4px !important;
            gap: 8px !important;
          }
          .aarti-header-diya {
            width: 28px !important;
            height: 28px !important;
            border-radius: 8px !important;
          }
          .aarti-header-sub {
            font-size: 8.5px !important;
            letter-spacing: 0.1em !important;
          }
          .aarti-header-title {
            font-size: 13px !important;
          }
          .aarti-header-btn {
            padding: 3px 8px !important;
            font-size: 10px !important;
          }
          .aarti-main-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 1.85fr) minmax(200px, 1fr) !important;
            gap: 10px !important;
            margin-top: 6px !important;
          }
          .display-hero-card {
            padding: 10px 14px !important;
            border-radius: 16px !important;
            min-height: auto !important;
          }
          .day-switcher-bar {
            margin-bottom: 6px !important;
            gap: 4px !important;
          }
          .day-switcher-btn {
            padding: 2px 7px !important;
            font-size: 9.5px !important;
          }
          .day-meta-row {
            margin-bottom: 2px !important;
          }
          .day-badge-pill {
            font-size: 11px !important;
            padding: 3px 9px !important;
          }
          .day-date-text {
            font-size: 13px !important;
          }
          .day-maha-pill {
            font-size: 10px !important;
            padding: 2px 6px !important;
          }
          .day-status-pill {
            font-size: 10.5px !important;
            padding: 3px 10px !important;
          }
          .day-main-heading {
            font-size: 19px !important;
            margin-top: 2px !important;
            line-height: 1.15 !important;
          }
          .celebration-center-stage {
            padding: 4px 0 !important;
          }
          .celebration-ribbon {
            padding: 3px 12px !important;
            font-size: 10px !important;
          }
          .celebration-subhead {
            font-size: 12px !important;
            margin: 2px 0 !important;
          }
          .winner-row {
            gap: 8px !important;
            margin: 2px 0 !important;
          }
          .winner-avatar {
            width: 34px !important;
            height: 34px !important;
            font-size: 14px !important;
            border-width: 2px !important;
          }
          .winner-name {
            font-size: 20px !important;
            line-height: 1.05 !important;
          }
          .contribution-label {
            font-size: 9px !important;
            letter-spacing: 0.12em !important;
          }
          .contribution-amount {
            font-size: 36px !important;
            line-height: 0.95 !important;
          }
          .bidding-amount {
            font-size: 44px !important;
            line-height: 0.95 !important;
            margin: 0 auto 4px !important;
          }
          .celebration-blessing-card {
            padding: 8px 12px !important;
            border-radius: 12px !important;
          }
          .celebration-blessing-text {
            font-size: 11.5px !important;
            line-height: 1.3 !important;
            margin-bottom: 3px !important;
          }
          .celebration-blessing-footer {
            font-size: 9px !important;
          }
          .aarti-bottom-stats {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
            margin-top: 6px !important;
          }
          .stat-card {
            padding: 5px 8px !important;
            border-radius: 10px !important;
          }
          .stat-label {
            font-size: 8.5px !important;
          }
          .stat-value {
            font-size: 14px !important;
            margin-top: 1px !important;
          }
          .display-qr-card {
            padding: 8px 8px !important;
            border-radius: 16px !important;
          }
          .qr-badge {
            padding: 3px 8px !important;
            font-size: 9px !important;
            margin-bottom: 3px !important;
          }
          .qr-heading {
            font-size: 13px !important;
            margin-bottom: 1px !important;
          }
          .qr-subtext {
            font-size: 9.5px !important;
          }
          .qr-squircle {
            padding: 6px !important;
            margin: 4px auto !important;
          }
          .qr-image {
            width: 100px !important;
            height: 100px !important;
          }
          .qr-url-badge {
            font-size: 8px !important;
            padding: 3px 5px !important;
          }
          .qr-trust-badge {
            font-size: 8.5px !important;
            margin-top: 2px !important;
          }
        }

        /* 1B. iPhone Portrait (Width <= 640px, Height > 520px) ── */
        @media (max-width: 640px) and (min-height: 521px) {
          .aarti-display-root {
            height: auto !important;
            min-height: 100vh !important;
            max-height: none !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 10px 10px 28px !important;
          }
          .aarti-stage-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
            padding-bottom: 8px !important;
          }
          .aarti-stage-header-actions {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .aarti-main-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 14px !important;
            margin-top: 8px !important;
          }
          .display-hero-card {
            min-height: auto !important;
            padding: 16px 14px !important;
            border-radius: 18px !important;
          }
          .day-main-heading {
            font-size: 26px !important;
          }
          .celebration-ribbon {
            font-size: 11px !important;
            padding: 5px 14px !important;
          }
          .celebration-subhead {
            font-size: 15px !important;
          }
          .winner-avatar {
            width: 48px !important;
            height: 48px !important;
            font-size: 18px !important;
          }
          .winner-name {
            font-size: 28px !important;
          }
          .contribution-amount {
            font-size: 48px !important;
          }
          .bidding-amount {
            font-size: 58px !important;
          }
          .celebration-blessing-card {
            padding: 14px 14px !important;
            border-radius: 16px !important;
          }
          .celebration-blessing-text {
            font-size: 13.5px !important;
          }
          .aarti-bottom-stats {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .stat-card {
            padding: 10px 14px !important;
          }
          .stat-value {
            font-size: 20px !important;
          }
          .display-qr-card {
            min-height: auto !important;
            padding: 18px 14px !important;
            border-radius: 18px !important;
          }
          .qr-image {
            width: 145px !important;
            height: 145px !important;
          }
        }

        /* ── 2. IPAD & TABLETS (SECOND PRIORITY) ─────────────────────────────── */

        /* 2A. iPad Landscape (Width: 951px–1279px, Height: 521px–900px) ── */
        @media (min-width: 951px) and (max-width: 1279px) and (min-height: 521px) and (max-height: 900px) {
          .aarti-display-root {
            padding: 10px 14px !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }
          .aarti-main-grid {
            grid-template-columns: minmax(0, 2.35fr) minmax(235px, 1fr) !important;
            gap: 12px !important;
          }
          .display-hero-card {
            padding: 14px 18px !important;
            border-radius: 20px !important;
          }
          .day-main-heading {
            font-size: clamp(26px, 3.2vw, 36px) !important;
          }
          .celebration-ribbon {
            padding: 6px 18px !important;
            font-size: 12px !important;
          }
          .celebration-subhead {
            font-size: 16px !important;
            margin: 4px 0 !important;
          }
          .winner-avatar {
            width: 52px !important;
            height: 52px !important;
            font-size: 20px !important;
          }
          .winner-name {
            font-size: clamp(28px, 3.6vw, 44px) !important;
          }
          .contribution-amount {
            font-size: clamp(48px, 6.2vw, 76px) !important;
          }
          .bidding-amount {
            font-size: clamp(58px, 7.5vw, 92px) !important;
          }
          .celebration-blessing-card {
            padding: 12px 18px !important;
            max-width: 95% !important;
          }
          .celebration-blessing-text {
            font-size: 13.5px !important;
            line-height: 1.4 !important;
            margin-bottom: 6px !important;
          }
          .aarti-bottom-stats {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
          }
          .stat-card {
            padding: 8px 12px !important;
          }
          .stat-value {
            font-size: 18px !important;
          }
          .display-qr-card {
            padding: 14px 12px !important;
            border-radius: 20px !important;
          }
          .qr-image {
            width: clamp(120px, 16vh, 160px) !important;
            height: clamp(120px, 16vh, 160px) !important;
          }
        }

        /* 2B. iPad Portrait (Width: 641px–950px, Height: > 520px) ── */
        @media (min-width: 641px) and (max-width: 950px) and (min-height: 521px) {
          .aarti-display-root {
            padding: 12px 16px !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .aarti-main-grid {
            grid-template-columns: minmax(0, 1.8fr) minmax(220px, 1fr) !important;
            gap: 12px !important;
          }
          .display-hero-card {
            padding: 16px !important;
            border-radius: 20px !important;
          }
          .day-main-heading {
            font-size: 28px !important;
          }
          .winner-avatar {
            width: 50px !important;
            height: 50px !important;
          }
          .winner-name {
            font-size: 30px !important;
          }
          .contribution-amount {
            font-size: 52px !important;
          }
          .bidding-amount {
            font-size: 64px !important;
          }
          .aarti-bottom-stats {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .qr-image {
            width: 140px !important;
            height: 140px !important;
          }
        }

        /* ── 3. DESKTOP BROWSER (THIRD PRIORITY) ─────────────────────────────── */

        /* 3A. Standard Desktop & Laptops (Width: 1280px–1599px, Height >= 600px) ── */
        @media (min-width: 1280px) and (max-width: 1599px) and (min-height: 600px) {
          .aarti-display-root {
            padding: 14px 20px !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }
          .aarti-main-grid {
            grid-template-columns: minmax(0, 2.75fr) minmax(280px, 1fr) !important;
            gap: 16px !important;
          }
          .display-hero-card {
            padding: 20px 24px !important;
            border-radius: 24px !important;
          }
          .day-main-heading {
            font-size: clamp(32px, 3.8vw, 48px) !important;
          }
          .winner-avatar {
            width: 68px !important;
            height: 68px !important;
            font-size: 26px !important;
          }
          .winner-name {
            font-size: clamp(36px, 4.2vw, 56px) !important;
          }
          .contribution-amount {
            font-size: clamp(68px, 7.8vw, 110px) !important;
          }
          .bidding-amount {
            font-size: clamp(86px, 10vw, 130px) !important;
          }
          .celebration-blessing-card {
            max-width: min(96%, 1050px) !important;
            padding: 18px 30px !important;
          }
          .aarti-bottom-stats {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
          }
          .stat-card {
            padding: 10px 14px !important;
          }
          .stat-value {
            font-size: 22px !important;
          }
          .qr-image {
            width: clamp(150px, 20vh, 195px) !important;
            height: clamp(150px, 20vh, 195px) !important;
          }
        }

        /* 3B. Height-constrained Laptops / Displays (Height <= 720px on Wide Screens) ── */
        @media (min-width: 951px) and (max-height: 720px) {
          .day-main-heading {
            font-size: clamp(22px, 2.8vw, 34px) !important;
          }
          .celebration-subhead {
            margin: 2px 0 !important;
            font-size: 14px !important;
          }
          .winner-avatar {
            width: 44px !important;
            height: 44px !important;
            font-size: 17px !important;
          }
          .winner-name {
            font-size: clamp(24px, 3vw, 38px) !important;
          }
          .contribution-amount {
            font-size: clamp(46px, 5.8vw, 72px) !important;
          }
          .bidding-amount {
            font-size: clamp(56px, 6.8vw, 86px) !important;
          }
          .celebration-blessing-card {
            padding: 10px 16px !important;
          }
          .celebration-blessing-text {
            font-size: 12.5px !important;
            line-height: 1.35 !important;
            margin-bottom: 4px !important;
          }
          .stat-card {
            padding: 6px 10px !important;
          }
          .stat-value {
            font-size: 18px !important;
          }
          .qr-squircle {
            padding: 8px !important;
          }
          .qr-image {
            width: clamp(110px, 17vh, 150px) !important;
            height: clamp(110px, 17vh, 150px) !important;
          }
        }

        /* ── 4. TV SCREEN / 4K / JUMBOTRON STAGE (FOURTH PRIORITY) ───────────── */
        /* 1080p Full HD, 4K, 70-inch Temple TV Screens (Width >= 1600px, Height >= 800px) */
        @media (min-width: 1600px) and (min-height: 800px) {
          .aarti-display-root {
            padding: 20px 32px !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }
          .aarti-header-diya {
            width: 50px !important;
            height: 50px !important;
            border-radius: 14px !important;
          }
          .aarti-header-sub {
            font-size: 13px !important;
            letter-spacing: 0.16em !important;
          }
          .aarti-header-title {
            font-size: 24px !important;
          }
          .aarti-header-btn {
            padding: 8px 18px !important;
            font-size: 14px !important;
          }
          .aarti-main-grid {
            grid-template-columns: minmax(0, 3fr) minmax(360px, 1fr) !important;
            gap: 24px !important;
            margin-top: 14px !important;
          }
          .display-hero-card {
            padding: 26px 36px !important;
            border-radius: 28px !important;
          }
          .day-switcher-btn {
            padding: 6px 14px !important;
            font-size: 13px !important;
          }
          .day-badge-pill {
            font-size: 16px !important;
            padding: 6px 18px !important;
          }
          .day-date-text {
            font-size: 22px !important;
          }
          .day-maha-pill {
            font-size: 14px !important;
            padding: 5px 12px !important;
          }
          .day-status-pill {
            font-size: 15px !important;
            padding: 8px 22px !important;
          }
          .day-main-heading {
            font-size: clamp(44px, 4.4vw, 64px) !important;
          }
          .celebration-ribbon {
            padding: 12px 36px !important;
            font-size: 16px !important;
          }
          .celebration-subhead {
            font-size: 26px !important;
            margin: 10px 0 !important;
          }
          .winner-avatar {
            width: 90px !important;
            height: 90px !important;
            font-size: 38px !important;
          }
          .winner-name {
            font-size: clamp(52px, 5vw, 84px) !important;
          }
          .contribution-label {
            font-size: 16px !important;
            letter-spacing: 0.18em !important;
          }
          .contribution-amount {
            font-size: clamp(96px, 10vw, 150px) !important;
          }
          .bidding-amount {
            font-size: clamp(120px, 13vw, 190px) !important;
          }
          .celebration-blessing-card {
            max-width: 1250px !important;
            padding: 24px 44px !important;
            border-radius: 24px !important;
          }
          .celebration-blessing-text {
            font-size: 21px !important;
            line-height: 1.55 !important;
          }
          .celebration-blessing-footer {
            font-size: 15px !important;
          }
          .aarti-bottom-stats {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
          }
          .stat-card {
            padding: 16px 20px !important;
            border-radius: 18px !important;
          }
          .stat-label {
            font-size: 13px !important;
          }
          .stat-value {
            font-size: 30px !important;
          }
          .display-qr-card {
            padding: 26px 22px !important;
            border-radius: 28px !important;
          }
          .qr-badge {
            padding: 6px 16px !important;
            font-size: 13px !important;
          }
          .qr-heading {
            font-size: 26px !important;
          }
          .qr-subtext {
            font-size: 14px !important;
          }
          .qr-squircle {
            padding: 16px !important;
            border-radius: 22px !important;
          }
          .qr-image {
            width: clamp(180px, 24vh, 250px) !important;
            height: clamp(180px, 24vh, 250px) !important;
          }
          .qr-url-badge {
            font-size: 12px !important;
            padding: 8px 14px !important;
          }
          .qr-trust-badge {
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* ── TOP HEADER / EXECUTIVE STAGE NAVIGATION ─────────────────────────── */}
      <header
        className="aarti-stage-header"
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
            className="aarti-header-diya"
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
            <div className="aarti-header-sub" style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.14em', color: isDark ? '#FF9F0A' : '#D97706', textTransform: 'uppercase' }}>
              Hindu Community Center of Knoxville
            </div>
            <div className="aarti-header-title" style={{ fontSize: '19px', fontWeight: '800', letterSpacing: '-0.02em', color: isDark ? '#FFFFFF' : '#1D1D1F', marginTop: '1px' }}>
              Navratri 2026 · Daily Maha Aarti Stage
            </div>
          </div>
        </div>

        {/* Live Running Timer, Dark/Light Mode Switch & Fullscreen Toggle */}
        <div className="aarti-stage-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Running Seconds Countdown Beacon */}
          <div
            className="aarti-header-btn aarti-header-timer"
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
            className="aarti-header-btn"
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

          {/* TV / Firestick Screen Wake Lock Toggle */}
          <button
            id="screen-wake-lock-btn"
            className="aarti-header-btn"
            onClick={() => requestWakeLock()}
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: wakeLockActive
                ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.14)')
                : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
              border: wakeLockActive
                ? '1.5px solid #10B981'
                : (isDark ? '1.5px solid rgba(255, 255, 255, 0.18)' : '1.5px solid rgba(0, 0, 0, 0.12)'),
              borderRadius: '999px',
              padding: '6px 13px',
              fontSize: '12px',
              fontWeight: '700',
              color: wakeLockActive ? '#10B981' : (isDark ? '#FFFFFF' : '#1D1D1F'),
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={wakeLockActive ? 'Screen Wake Lock is Active (TV will not sleep)' : 'Click to Keep Firestick / TV Screen Awake'}
          >
            {Icons.bolt}
            <span>{wakeLockActive ? 'Screen Awake: ON' : 'Keep Screen On'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            className="aarti-header-btn"
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

      {/* ── JUMBOTRON STAGE: HERO 75% / QR CODE 25% SPLIT ──────────────────────── */}
      <main
        className="aarti-main-grid"
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
        {/* ── HERO STAGE (LEFT COLUMN) ────────────────────────────────────────── */}
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
                className="day-switcher-bar"
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
                      className="day-switcher-btn"
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

              {/* Day Badge, Date & Status Pill */}
              <div className="day-meta-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    className="day-badge-pill"
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

                  <span className="day-date-text" style={{ fontSize: '18px', fontWeight: '800', color: isDark ? '#FFFFFF' : '#1D1D1F', fontVariantNumeric: 'tabular-nums' }}>
                    {activeDay.formatted_date}
                  </span>

                  {activeDay.is_maha_aarti && (
                    <span
                      className="day-maha-pill"
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

                {/* Status Pill */}
                <div
                  className="day-status-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isConcluded
                      ? (isDark ? 'rgba(255, 159, 10, 0.22)' : 'rgba(255, 159, 10, 0.16)')
                      : (isDark ? 'rgba(255, 159, 10, 0.2)' : 'rgba(255, 159, 10, 0.16)'),
                    border: isConcluded
                      ? (isDark ? '1.5px solid #FF9F0A' : '1.5px solid #D97706')
                      : (isDark ? '1.5px solid #FF9F0A' : '1.5px solid #D97706'),
                    color: isConcluded
                      ? (isDark ? '#FFB340' : '#B45309')
                      : (isDark ? '#FFB340' : '#B45309'),
                    borderRadius: '999px',
                    padding: '6px 18px',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    letterSpacing: '0.04em',
                    animation: !isConcluded ? 'orangeBreathe 2.5s infinite ease-in-out' : 'goldenCelebrationGlow 3s infinite ease-in-out',
                  }}
                >
                  {!isConcluded ? (
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
                  ) : (
                    <span style={{ color: isDark ? '#FF9F0A' : '#D97706' }}>{Icons.diya}</span>
                  )}
                  <span>{activeDay.is_locked ? 'Maha Aarti Reserved' : isConcluded ? 'Maha Aarti Confirmed' : 'Bidding Open'}</span>
                </div>
              </div>

              {/* Festival Day Title */}
              <h2
                className="day-main-heading"
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

            {/* ── CENTER JUMBOTRON: CELEBRATORY THANK YOU STAGE OR LIVE BIDDING STAGE ─ */}
            {isConcluded && hasWinner ? (
              /* ── GRAND CELEBRATORY THANK YOU STAGE (AFTER CUTOFF) ─ */
              <div
                className="celebration-center-stage"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-evenly',
                  textAlign: 'center',
                  width: '100%',
                  padding: '8px 0',
                  boxSizing: 'border-box',
                }}
              >
                {/* Celebratory Dhanyavad Ribbon */}
                <div
                  className="celebration-ribbon"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(255, 159, 10, 0.28) 0%, rgba(217, 119, 6, 0.16) 100%)'
                      : 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                    border: isDark ? '1.5px solid #FF9F0A' : '1.5px solid #F59E0B',
                    borderRadius: '999px',
                    padding: 'clamp(7px, 1.2vh, 12px) clamp(22px, 2.5vw, 36px)',
                    fontSize: 'clamp(12px, 1.1vw, 16px)',
                    fontWeight: '900',
                    color: isDark ? '#FFB340' : '#B45309',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    boxShadow: isDark ? '0 4px 20px rgba(255, 159, 10, 0.35)' : '0 2px 10px rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <span>Heartfelt Dhanyavad · Sacred Gratitude</span>
                </div>

                {/* Subtitle */}
                <div
                  className="celebration-subhead"
                  style={{
                    fontSize: 'clamp(16px, 1.9vw, 26px)',
                    fontWeight: '800',
                    color: isDark ? '#E5E5E7' : '#374151',
                    letterSpacing: '-0.01em',
                    margin: 'clamp(4px, 0.8vh, 10px) 0',
                  }}
                >
                  Tonight&apos;s Sacred Maha Aarti Sponsor
                </div>

                {/* Winning Devotee Sponsor Name & Radiant Avatar */}
                <div
                  className="winner-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'clamp(14px, 2vw, 24px)',
                    margin: 'clamp(4px, 1vh, 12px) 0',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    className="winner-avatar"
                    style={{
                      width: 'clamp(58px, 6vw, 92px)',
                      height: 'clamp(58px, 6vw, 92px)',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FF9F0A 0%, #D97706 50%, #92400E 100%)',
                      color: '#FFFFFF',
                      fontSize: 'clamp(22px, 2.4vw, 38px)',
                      fontWeight: '900',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isDark
                        ? '0 0 35px rgba(255, 159, 10, 0.6), 0 4px 20px rgba(0, 0, 0, 0.5)'
                        : '0 0 25px rgba(217, 119, 6, 0.45), 0 4px 15px rgba(0, 0, 0, 0.1)',
                      border: '3px solid #FFF',
                    }}
                  >
                    {getInitials(winnerDisplayName)}
                  </div>

                  <div
                    className="winner-name"
                    style={{
                      fontSize: 'clamp(36px, 5vw, 76px)',
                      fontWeight: '900',
                      color: isDark ? '#FFFFFF' : '#111827',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.05,
                      textShadow: isDark ? '0 2px 25px rgba(0, 0, 0, 0.7)' : 'none',
                    }}
                  >
                    {winnerDisplayName}
                  </div>
                </div>

                {/* Winning Contribution Amount */}
                <div
                  className="contribution-wrapper"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    margin: 'clamp(4px, 1vh, 10px) 0',
                  }}
                >
                  <div
                    className="contribution-label"
                    style={{
                      fontSize: 'clamp(11.5px, 1.1vw, 15px)',
                      fontWeight: '800',
                      color: isDark ? '#FF9F0A' : '#C25E00',
                      textTransform: 'uppercase',
                      letterSpacing: '0.16em',
                    }}
                  >
                    Confirmed Maha Aarti Contribution
                  </div>
                  <div
                    className={`contribution-amount ${isDark ? 'jumbotron-text-glow-dark' : 'jumbotron-text-glow-light'}`}
                    style={{
                      fontSize: 'clamp(64px, 8.5vw, 135px)',
                      fontWeight: '900',
                      color: isDark ? '#FF9F0A' : '#D97706',
                      letterSpacing: '-0.04em',
                      lineHeight: 0.95,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${Number(activeDay.current_highest_bid || activeDay.locked_sponsor_amount || activeDay.base_bid || 500).toLocaleString()}
                  </div>
                </div>

                {/* Heartfelt Divine Blessing Card */}
                <div
                  className="celebration-blessing-card"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(255, 159, 10, 0.16) 0%, rgba(26, 26, 34, 0.88) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 247, 237, 0.98) 0%, rgba(254, 243, 199, 0.9) 100%)',
                    border: isDark ? '1.5px solid rgba(255, 159, 10, 0.45)' : '1.5px solid rgba(245, 158, 11, 0.45)',
                    borderRadius: '20px',
                    padding: 'clamp(14px, 2vh, 26px) clamp(20px, 3vw, 44px)',
                    maxWidth: 'min(98%, 1150px)',
                    width: '100%',
                    boxSizing: 'border-box',
                    boxShadow: isDark ? '0 10px 35px rgba(0, 0, 0, 0.45)' : '0 8px 24px rgba(245, 158, 11, 0.16)',
                  }}
                >
                  <p
                    className="celebration-blessing-text"
                    style={{
                      fontSize: 'clamp(14px, 1.4vw, 21px)',
                      fontWeight: '700',
                      color: isDark ? '#F5F5F7' : '#1F2937',
                      lineHeight: 1.5,
                      margin: '0 0 clamp(8px, 1vh, 12px)',
                    }}
                  >
                    Dhanyavad, <strong style={{ color: isDark ? '#FFB340' : '#B45309' }}>{winnerDisplayName}</strong>, for sponsoring Day {activeDay.day_number}&apos;s sacred Maha Aarti! May Maa Durga bless you and your family with divine grace, vibrant health, peace, and eternal prosperity.
                  </p>
                  <div
                    className="celebration-blessing-footer"
                    style={{
                      fontSize: 'clamp(11px, 1vw, 14.5px)',
                      fontWeight: '900',
                      color: isDark ? '#FF9F0A' : '#C25E00',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Jai Mata Di · Hindu Community Center of Knoxville
                  </div>
                </div>
              </div>
            ) : isConcluded && !hasWinner ? (
              /* ── CONCLUDED WITH NO BIDS: GENERAL HCC SPONSORSHIP NOTICE ─ */
              <div
                className="celebration-center-stage"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-evenly',
                  textAlign: 'center',
                  width: '100%',
                  padding: '12px 0',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="contribution-label"
                  style={{
                    fontSize: 'clamp(13px, 1.2vw, 16px)',
                    fontWeight: '800',
                    color: isDark ? '#FF9F0A' : '#C25E00',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginBottom: '4px',
                  }}
                >
                  Bidding Concluded at {formattedCutoffTime} EST
                </div>
                <div
                  className={`contribution-amount ${isDark ? 'jumbotron-text-glow-dark' : 'jumbotron-text-glow-light'}`}
                  style={{
                    fontSize: 'clamp(54px, 7vw, 96px)',
                    fontWeight: '900',
                    color: isDark ? '#FF9F0A' : '#D97706',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    marginBottom: '8px',
                  }}
                >
                  ${Number(activeDay.base_bid || 500).toLocaleString()}
                </div>
                <div
                  className="celebration-subhead"
                  style={{
                    fontSize: 'clamp(18px, 2.3vw, 28px)',
                    fontWeight: '800',
                    color: isDark ? '#FFFFFF' : '#1D1D1F',
                    maxWidth: 'min(96%, 850px)',
                    lineHeight: 1.35,
                  }}
                >
                  Tonight&apos;s Maha Aarti is open for General Devotee Sponsorship.
                </div>
                <div style={{ fontSize: 'clamp(13px, 1.2vw, 16px)', color: isDark ? '#A1A1A6' : '#6E6E73', marginTop: '6px' }}>
                  Please visit the Mandir desk or scan the QR code to sponsor.
                </div>
              </div>
            ) : (
              /* ── ACTIVE STADIUM BIDDING (BEFORE CUTOFF OR EXTENSION) ─ */
              <div
                className="celebration-center-stage"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-evenly',
                  textAlign: 'center',
                  width: '100%',
                  padding: '8px 0',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="contribution-label"
                  style={{
                    fontSize: '15px',
                    fontWeight: '800',
                    color: isDark ? '#FF9F0A' : '#C25E00',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: '2px',
                  }}
                >
                  Current Highest Bid
                </div>

                {/* Massive Stadium Size Amount ($1,000 / $500) Centered */}
                <div
                  className={`bidding-amount ${isDark ? 'jumbotron-text-glow-dark' : 'jumbotron-text-glow-light'}`}
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
                  ${Number(activeDay.current_highest_bid || activeDay.base_bid || settings?.base_bid || 500).toLocaleString()}
                </div>

                {/* Leading Devotee Sponsor Row (Centered) */}
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
                      <div className="celebration-subhead" style={{ fontSize: '13px', color: isDark ? '#98989D' : '#6E6E73', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Leading Devotee Sponsor
                      </div>
                      <div
                        className="winner-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '14px',
                        }}
                      >
                        <div
                          className="winner-avatar"
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
                          {getInitials(winnerDisplayName)}
                        </div>
                        <div
                          className="winner-name"
                          style={{
                            fontSize: 'clamp(32px, 4.4vw, 56px)',
                            fontWeight: '900',
                            color: isDark ? '#FFFFFF' : '#1D1D1F',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.05,
                          }}
                        >
                          {winnerDisplayName}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div style={{ fontSize: '15px', color: isDark ? '#98989D' : '#6E6E73' }}>
                        Opening Reserve: <strong style={{ color: isDark ? '#FFFFFF' : '#1D1D1F' }}>${Number(activeDay.base_bid || settings?.base_bid || 500).toLocaleString()}</strong>
                        <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
                        Min Increment: <strong style={{ color: isDark ? '#34D399' : '#059669' }}>+${activeNextStep.toLocaleString()}</strong>
                      </div>
                      <div style={{ fontSize: 'clamp(22px, 2.8vw, 34px)', fontWeight: '800', color: isDark ? '#FF9F0A' : '#D97706', marginTop: '4px' }}>
                        First verified bid takes the lead!
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Tier: 3 Large Stats Cards Spanning Full 75% Width */}
            <div
              className="aarti-bottom-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}
            >
              {/* Daily Bids Placed */}
              <div
                className="stat-card"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5F5F7',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <div className="stat-label" style={{ fontSize: '11px', color: isDark ? '#8E8E93' : '#6E6E73', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isConcluded ? 'Total Bids Placed' : 'Bids Placed Tonight'}
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: '900', color: isDark ? '#FFFFFF' : '#1D1D1F', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  {activeDay.bids_count} {activeDay.bids_count === 1 ? 'bid' : 'bids'}
                </div>
              </div>

              {/* Next Minimum Bid OR Confirmed Seva */}
              <div
                className="stat-card"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5F5F7',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <div className="stat-label" style={{ fontSize: '11px', color: isDark ? '#8E8E93' : '#6E6E73', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isConcluded ? 'Winning Contribution' : 'Next Minimum Bid'}
                </div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: '900', color: isDark ? '#34D399' : '#059669', marginTop: '2px', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span>${isConcluded ? Number(activeDay.current_highest_bid || activeDay.base_bid || settings?.base_bid || 500).toLocaleString() : nextMinBid.toLocaleString()}</span>
                  {!isConcluded && (
                    <span style={{ fontSize: '12px', fontWeight: '700', color: isDark ? '#10B981' : '#047857', opacity: 0.9 }}>
                      (+${activeNextStep.toLocaleString()} min)
                    </span>
                  )}
                </div>
              </div>

              {/* Daily Cutoff Countdown OR Concluded Status */}
              <div
                className="stat-card"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5F5F7',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <div className="stat-label" style={{ fontSize: '11px', color: isDark ? '#8E8E93' : '#6E6E73', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: isDark ? '#FF9F0A' : '#D97706' }}>{Icons.clock}</span>
                  <span>{isConcluded ? `Concluded (${formattedCutoffTime} EST)` : `${formattedCutoffTime} Cutoff`}</span>
                </div>
                <div className="stat-value" style={{ fontSize: '22px', fontWeight: '900', color: isConcluded ? (isDark ? '#34D399' : '#059669') : (isDark ? '#FF9F0A' : '#D97706'), marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  {isConcluded ? 'Maha Aarti Confirmed' : (timeLeft || `${formattedCutoffTime} EST`)}
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
              className="qr-badge"
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
              {isConcluded ? Icons.diya : Icons.qrPhone} {isConcluded ? 'Upcoming Maha Aarti' : 'Scan to Bid'}
            </div>

            <h3
              className="qr-heading"
              style={{
                fontSize: 'clamp(18px, 2vw, 24px)',
                fontWeight: '900',
                color: isDark ? '#FFFFFF' : '#1D1D1F',
                letterSpacing: '-0.02em',
                margin: '0 0 4px',
                lineHeight: 1.15,
              }}
            >
              {isConcluded ? 'Sponsor Upcoming Maha Aarti' : 'Sponsor Maha Aarti'}
            </h3>

            <p
              className="qr-subtext"
              style={{
                fontSize: '12px',
                color: isDark ? '#A1A1A6' : '#6E6E73',
                margin: '0',
                lineHeight: 1.4,
              }}
            >
              {isConcluded ? 'Point camera to pledge for upcoming festival days' : 'Point camera to bid on phone'}
            </p>
          </div>

          {/* High-Contrast Pure White Squircle for QR Code */}
          <div
            className="qr-squircle"
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
                alt="Scan to Bid on Maha Aarti"
                className="qr-image"
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
              className="qr-url-badge"
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

            <div className="qr-trust-badge" style={{ fontSize: '10px', color: isDark ? '#8E8E93' : '#6E6E73', marginTop: '5px', fontWeight: '600' }}>
              {isConcluded ? 'Scan to sponsor upcoming Maha Aarti' : 'Instant OTP verification'}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
