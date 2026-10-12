'use client';

import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

// Crisp inline SVG Icons (Apple/Executive style)
const Icons = {
  diya: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  qrPhone: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
  activity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
};

const getInitials = (name) => {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return 'Today';
};

export default function AartiDisplayLivePage() {
  const [days, setDays] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedDayNum, setSelectedDayNum] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [biddingUrl, setBiddingUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [nextRefreshIn, setNextRefreshIn] = useState(15);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate High-Contrast QR Code linking to canonical bidding page
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dashboard.knoxvillemandir.org';
    const targetUrl = origin.includes('localhost')
      ? 'https://dashboard.knoxvillemandir.org/navratri-aarti'
      : `${origin}/navratri-aarti`;

    setBiddingUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 400,
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

  // Fetch Days & Recent Bids (polls every 15s)
  const fetchDays = useCallback(async () => {
    try {
      const res = await fetch('/api/navratri/aarti/days', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const fetchedDays = data.days || [];
        setDays(fetchedDays);
        setRecentBids(data.recent_bids || []);
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
        background: 'radial-gradient(ellipse at 50% 0%, #1c0e04 0%, #0a0a0d 55%, #000000 100%)',
        color: '#FFFFFF',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 22px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 16px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(232, 120, 12, 0.2); }
          50% { box-shadow: 0 16px 50px rgba(0, 0, 0, 0.6), 0 0 50px rgba(232, 120, 12, 0.4); }
        }
        .jumbotron-glow {
          text-shadow: 0 0 40px rgba(255, 159, 10, 0.45), 0 0 80px rgba(232, 120, 12, 0.25);
        }
        .display-hero-card {
          animation: subtleGlow 4s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 999px;
        }
      `}</style>

      {/* ── TOP HEADER / EXECUTIVE STAGE NAVIGATION ─────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
        }}
      >
        {/* Mandir Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(232, 120, 12, 0.35) 0%, rgba(232, 120, 12, 0.1) 100%)',
              border: '1.5px solid rgba(232, 120, 12, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF9F0A',
              boxShadow: '0 4px 18px rgba(232, 120, 12, 0.3)',
              flexShrink: 0,
            }}
          >
            {Icons.diya}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.14em', color: '#FF9F0A', textTransform: 'uppercase' }}>
              Hindu Community Center of Knoxville
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', color: '#FFFFFF', marginTop: '1px' }}>
              Navratri 2026 · Daily Aarti Seva Stage
            </div>
          </div>
        </div>

        {/* Live Auto-Sync Status & Fullscreen Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Live Sync Beacon */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '999px',
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#E5E5E7',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)',
                animation: 'pulseDot 2s infinite ease-in-out',
                display: 'inline-block',
              }}
            />
            <span>Live Auto-Sync</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</span>
            <span style={{ color: '#FF9F0A' }}>{nextRefreshIn}s</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '999px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#FFFFFF',
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

      {/* ── MAIN 70-INCH STADIUM STAGE (SPLIT: TODAY'S JUMBOTRON + QR & LIVE STREAM) ──── */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(360px, 1fr)',
          gap: '18px',
          alignItems: 'stretch',
          margin: '10px 0 0',
        }}
      >
        {/* ── LEFT COLUMN: JUMBOTRON TODAY'S AARTI SPOTLIGHT ─────────────────── */}
        {activeDay ? (
          <div
            className="display-hero-card"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: activeDay.is_maha_aarti
                ? 'linear-gradient(150deg, rgba(232, 120, 12, 0.22) 0%, rgba(20, 20, 26, 0.9) 60%, rgba(10, 10, 14, 0.98) 100%)'
                : 'linear-gradient(150deg, rgba(32, 32, 40, 0.85) 0%, rgba(16, 16, 20, 0.96) 100%)',
              border: activeDay.is_maha_aarti
                ? '2.5px solid rgba(232, 120, 12, 0.65)'
                : '1.5px solid rgba(232, 120, 12, 0.35)',
              borderRadius: '24px',
              padding: 'clamp(20px, 2.4vw, 30px)',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Row: Compact 10-Day Switcher Tape */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '14px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
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
                        background: isSel
                          ? '#FF9F0A'
                          : 'rgba(255, 255, 255, 0.06)',
                        color: isSel ? '#000000' : '#A1A1A6',
                        border: isSel
                          ? '1px solid #FF9F0A'
                          : isMaha
                          ? '1px solid rgba(232, 120, 12, 0.4)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
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

              {/* Day Badge, Date & Live Bidding Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: '#FF9F0A',
                      color: '#000000',
                      fontSize: '13px',
                      fontWeight: '900',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Day {activeDay.day_number}
                  </span>

                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                    {activeDay.formatted_date}
                  </span>

                  {activeDay.is_maha_aarti && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(255, 159, 10, 0.25)',
                        border: '1.5px solid rgba(255, 159, 10, 0.5)',
                        color: '#FFB340',
                        fontSize: '11.5px',
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
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    background: activeDay.status === 'closed' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 185, 129, 0.2)',
                    border: `1.5px solid ${activeDay.status === 'closed' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(16, 185, 129, 0.45)'}`,
                    color: activeDay.status === 'closed' ? 'rgba(255, 255, 255, 0.7)' : '#34D399',
                    borderRadius: '999px',
                    padding: '5px 14px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                  }}
                >
                  {activeDay.status !== 'closed' && (
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                  )}
                  <span>{activeDay.status === 'closed' ? 'Bidding Concluded' : 'Bidding Open'}</span>
                </div>
              </div>

              {/* Festival Day Title */}
              <h2
                style={{
                  fontSize: 'clamp(26px, 3.4vw, 42px)',
                  fontWeight: '800',
                  letterSpacing: '-0.025em',
                  margin: '0 0 8px',
                  color: '#FFFFFF',
                  lineHeight: 1.15,
                }}
              >
                {activeDay.day_title}
              </h2>
            </div>

            {/* ── GIGANTIC STADIUM NUMERAL & LEADING DEVOTEE BOX ─────────────── */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: 'clamp(18px, 2.6vw, 28px)',
                margin: 'auto 0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#A1A1A6', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '2px' }}>
                {activeDay.status === 'closed' ? 'Winning Aarti Seva Contribution' : 'Current Highest Bid'}
              </div>

              {/* Massive Stadium Size Amount */}
              <div
                className="jumbotron-glow"
                style={{
                  fontSize: 'clamp(78px, 10vw, 130px)',
                  fontWeight: '900',
                  color: '#FF9F0A',
                  letterSpacing: '-0.035em',
                  lineHeight: 0.95,
                  margin: '4px 0 10px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ${Number(activeDay.current_highest_bid || 500).toLocaleString()}
              </div>

              {/* Leading Devotee Sponsor Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  marginTop: '6px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {activeDay.current_winner_name ? (
                  <>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FF9F0A 0%, #B85A05 100%)',
                        color: '#FFFFFF',
                        fontSize: '16px',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 14px rgba(232, 120, 12, 0.4)',
                      }}
                    >
                      {getInitials(activeDay.current_winner_name)}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#98989D', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Leading Devotee Sponsor
                      </div>
                      <div style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {activeDay.current_winner_name}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div style={{ fontSize: '13px', color: '#98989D' }}>
                      Opening Reserve: <strong style={{ color: '#FFFFFF' }}>${Number(activeDay.base_bid || 500).toLocaleString()}</strong>
                    </div>
                    <div style={{ fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: '800', color: '#FF9F0A', marginTop: '2px' }}>
                      First verified bid takes the lead!
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar: Bids, Next Bid, Countdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}
            >
              {/* Daily Bids Placed */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Bids Placed Tonight
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  {activeDay.bids_count} {activeDay.bids_count === 1 ? 'bid' : 'bids'}
                </div>
              </div>

              {/* Next Minimum Bid */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Next Minimum Bid
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#34D399', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  ${nextMinBid.toLocaleString()}
                </div>
              </div>

              {/* Daily Cutoff Countdown */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#FF9F0A' }}>{Icons.clock}</span>
                  <span>9:30 PM Cutoff</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: activeDay.status === 'closed' ? '#8E8E93' : '#FF9F0A', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  {timeLeft || '9:30 PM EST'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', color: '#8E8E93' }}>
            Loading live festival schedule...
          </div>
        )}

        {/* ── RIGHT COLUMN: STACKED (GIANT QR CODE + LIVE RECENT BIDS STREAM) ── */}
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* TOP CARD: GIANT SCANNABLE QR CODE CARD */}
          <div
            style={{
              flex: 1.15,
              minHeight: 0,
              background: 'linear-gradient(160deg, rgba(28, 28, 36, 0.95) 0%, rgba(14, 14, 18, 0.98) 100%)',
              border: '2px solid rgba(232, 120, 12, 0.4)',
              borderRadius: '24px',
              padding: 'clamp(14px, 1.8vw, 22px)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* Header tag */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(232, 120, 12, 0.2)',
                  border: '1.5px solid rgba(232, 120, 12, 0.5)',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  color: '#FF9F0A',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                {Icons.qrPhone} Scan to Bid on Phone
              </div>

              <h3
                style={{
                  fontSize: 'clamp(19px, 2.2vw, 24px)',
                  fontWeight: '800',
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  margin: '0',
                }}
              >
                Sponsor Tonight&apos;s Aarti
              </h3>
            </div>

            {/* High-Contrast White Background Squircle for QR Code */}
            <div
              style={{
                background: '#FFFFFF',
                padding: '8px',
                borderRadius: '14px',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6)',
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
                    borderRadius: '4px',
                    width: 'clamp(130px, 17vh, 180px)',
                    height: 'clamp(130px, 17vh, 180px)',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  Generating QR...
                </div>
              )}
            </div>

            {/* Direct URL pill */}
            <div style={{ width: '100%' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '9px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  color: '#FF9F0A',
                  fontWeight: '700',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2px',
                  display: 'inline-block',
                }}
              >
                dashboard.knoxvillemandir.org/navratri-aarti
              </div>

              <div style={{ fontSize: '10px', color: '#8E8E93', marginTop: '4px' }}>
                Instant OTP verification · Real-time outbid notices
              </div>
            </div>
          </div>

          {/* BOTTOM CARD: LIVE STREAM OF RECENT BIDS TONIGHT */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              background: 'linear-gradient(160deg, rgba(22, 22, 28, 0.95) 0%, rgba(12, 12, 16, 0.98) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: 'clamp(14px, 1.8vw, 20px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)',
                    animation: 'pulseDot 2s infinite ease-in-out',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Live Bids Stream
                </span>
              </div>

              <span style={{ fontSize: '10.5px', color: '#8E8E93', fontWeight: '600' }}>
                Real-Time Updates
              </span>
            </div>

            {/* Recent Bids Feed */}
            <div
              className="custom-scrollbar"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {recentBids && recentBids.length > 0 ? (
                recentBids.slice(0, 4).map((bid, idx) => {
                  const isTop = idx === 0;
                  return (
                    <div
                      key={bid.id || idx}
                      style={{
                        background: isTop
                          ? 'linear-gradient(90deg, rgba(232, 120, 12, 0.22) 0%, rgba(255, 255, 255, 0.04) 100%)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isTop
                          ? '1px solid rgba(232, 120, 12, 0.45)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isTop ? '#FF9F0A' : 'rgba(255, 255, 255, 0.1)',
                            color: isTop ? '#000000' : '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(bid.bidder_name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF' }}>
                            {bid.bidder_name}
                          </div>
                          <div style={{ fontSize: '10px', color: '#8E8E93', fontWeight: '600' }}>
                            Day {bid.day_number} • {formatTimeAgo(bid.created_at)}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: '900',
                            color: isTop ? '#FF9F0A' : '#FFFFFF',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          ${Number(bid.bid_amount).toLocaleString()}
                        </div>
                        {isTop && (
                          <div style={{ fontSize: '9px', fontWeight: '800', color: '#FF9F0A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            ★ Leading Bid
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: '#8E8E93', fontSize: '12px' }}>
                  Opening Reserve: <strong style={{ color: '#FFFFFF' }}>$500</strong>
                  <div style={{ color: '#FF9F0A', fontWeight: '700', marginTop: '4px' }}>
                    First verified bid takes the lead tonight!
                  </div>
                </div>
              )}
            </div>

            {/* Bottom footnote */}
            <div
              style={{
                fontSize: '10.5px',
                color: '#6E6E73',
                textAlign: 'center',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                marginTop: '4px',
                flexShrink: 0,
              }}
            >
              Devotee bids appear live within 15 seconds of OTP confirmation
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
