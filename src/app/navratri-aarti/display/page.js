'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

// Crisp inline SVG Icons (Apple/Executive style)
const Icons = {
  diya: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2c.5 2 2 3.5 2 5.5 0 2.5-2 3.5-2 3.5s-2-1-2-3.5C10 5.5 11.5 4 12 2z" fill="currentColor" fillOpacity="0.3" />
      <path d="M4 14c0 4 3.5 7 8 7s8-3 8-7c0-2-3-3-8-3s-8 1-8 3z" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  fullscreen: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  qrPhone: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
  trophy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 2v10a6 6 0 0 0 12 0V2H6z" />
    </svg>
  ),
  sparkle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
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
  const [loading, setLoading] = useState(true);
  const [selectedDayNum, setSelectedDayNum] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [biddingUrl, setBiddingUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [nextRefreshIn, setNextRefreshIn] = useState(15);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate QR Code linking to canonical bidding page
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dashboard.knoxvillemandir.org';
    const targetUrl = origin.includes('localhost')
      ? 'https://dashboard.knoxvillemandir.org/navratri-aarti'
      : `${origin}/navratri-aarti`;

    setBiddingUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: '#1D1D1F',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR Code generation error:', err));
  }, []);

  // Fetch Days Data (polls every 15s)
  const fetchDays = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch('/api/navratri/aarti/days', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const fetchedDays = data.days || [];
        setDays(fetchedDays);
        setSettings(data.settings || null);
        setLastUpdated(new Date());
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
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // 15-second polling loop
  useEffect(() => {
    fetchDays(false);

    const pollInterval = setInterval(() => {
      fetchDays(true);
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

  // Grand Total Raised across all 10 days
  const grandTotalSeva = days.reduce((sum, d) => sum + (Number(d.current_highest_bid) || 0), 0);
  const totalBidsCount = days.reduce((sum, d) => sum + (Number(d.bids_count) || 0), 0);

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
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 10%, #1A0D04 0%, #08080A 60%, #000000 100%)',
        color: '#FFFFFF',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 32px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 0 35px rgba(232, 120, 12, 0.25); }
          50% { box-shadow: 0 0 55px rgba(232, 120, 12, 0.45); }
        }
        .display-qr-card {
          animation: subtleGlow 4s ease-in-out infinite;
        }
      `}</style>

      {/* ── TOP HEADER / EXECUTIVE STAGE NAVIGATION ─────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Mandir Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(232, 120, 12, 0.3) 0%, rgba(232, 120, 12, 0.08) 100%)',
              border: '1px solid rgba(232, 120, 12, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF9F0A',
            }}
          >
            {Icons.diya}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.12em', color: '#FF9F0A', textTransform: 'uppercase' }}>
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
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '999px',
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#E5E5E7',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.25)',
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
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '999px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '600',
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

      {/* ── MAIN STAGE CONTENT (TWO COLUMN: TODAY'S SPOTLIGHT + SCANNABLE QR) ──── */}
      <main
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.65fr) minmax(340px, 1fr)',
          gap: '32px',
          alignItems: 'center',
          margin: '28px 0',
        }}
      >
        {/* LEFT COLUMN: TODAY'S AARTI SEVA HERO SPOTLIGHT */}
        {activeDay ? (
          <div
            style={{
              background: activeDay.is_maha_aarti
                ? 'linear-gradient(145deg, rgba(232, 120, 12, 0.18) 0%, rgba(20, 20, 24, 0.85) 100%)'
                : 'linear-gradient(145deg, rgba(30, 30, 36, 0.8) 0%, rgba(16, 16, 20, 0.9) 100%)',
              border: activeDay.is_maha_aarti
                ? '2px solid rgba(232, 120, 12, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '28px',
              padding: '36px 40px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Row: Date Pill & Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    background: '#FF9F0A',
                    color: '#000000',
                    fontSize: '12.5px',
                    fontWeight: '900',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Day {activeDay.day_number}
                </span>

                <span style={{ fontSize: '15px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.85)', fontVariantNumeric: 'tabular-nums' }}>
                  {activeDay.formatted_date}
                </span>

                {activeDay.is_maha_aarti && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(255, 159, 10, 0.2)',
                      border: '1px solid rgba(255, 159, 10, 0.45)',
                      color: '#FFB340',
                      fontSize: '11px',
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
                  gap: '6px',
                  background: activeDay.status === 'closed' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${activeDay.status === 'closed' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(16, 185, 129, 0.35)'}`,
                  color: activeDay.status === 'closed' ? 'rgba(255, 255, 255, 0.6)' : '#34D399',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                {activeDay.status !== 'closed' && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                )}
                <span>{activeDay.status === 'closed' ? 'Bidding Concluded' : 'Bidding Open'}</span>
              </div>
            </div>

            {/* Festival Day Title */}
            <h2
              style={{
                fontSize: 'clamp(28px, 3.8vw, 42px)',
                fontWeight: '800',
                letterSpacing: '-0.025em',
                margin: '0 0 24px',
                color: '#FFFFFF',
                lineHeight: 1.15,
              }}
            >
              {activeDay.day_title}
            </h2>

            {/* Big Highest Bid Numeral */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '24px 28px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#98989D', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                {activeDay.status === 'closed' ? 'Winning Aarti Seva Contribution' : 'Current Highest Bid'}
              </div>

              <div
                style={{
                  fontSize: 'clamp(52px, 7.5vw, 84px)',
                  fontWeight: '900',
                  color: '#FF9F0A',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ${Number(activeDay.current_highest_bid || 500).toLocaleString()}
              </div>

              {/* Devotee Sponsor / Leader Name */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {activeDay.current_winner_name ? (
                  <>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #E8780C 0%, #B85A05 100%)',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(activeDay.current_winner_name)}
                    </div>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#98989D', fontWeight: '600' }}>
                        Leading Devotee Sponsor
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                        {activeDay.current_winner_name}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div style={{ fontSize: '12px', color: '#98989D' }}>
                      Opening Reserve: <strong style={{ color: '#FFFFFF' }}>${Number(activeDay.base_bid || 500).toLocaleString()}</strong>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF9F0A', marginTop: '2px' }}>
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
                gap: '14px',
              }}
            >
              {/* Daily Bids Placed */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bids Placed
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF', marginTop: '2px' }}>
                  {activeDay.bids_count} {activeDay.bids_count === 1 ? 'bid' : 'bids'}
                </div>
              </div>

              {/* Next Minimum Bid */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Next Minimum Bid
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#34D399', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                  ${nextMinBid.toLocaleString()}
                </div>
              </div>

              {/* Daily Cutoff Countdown */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#FF9F0A' }}>{Icons.clock}</span>
                  <span>Daily 9:30 PM Cutoff</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: activeDay.status === 'closed' ? '#8E8E93' : '#FF9F0A', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
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

        {/* RIGHT COLUMN: SCANNABLE QR CODE CARD FOR PHONES */}
        <div
          className="display-qr-card"
          style={{
            background: 'linear-gradient(160deg, rgba(28, 28, 34, 0.95) 0%, rgba(14, 14, 18, 0.98) 100%)',
            border: '2px solid rgba(232, 120, 12, 0.35)',
            borderRadius: '28px',
            padding: '36px 30px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Tag */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(232, 120, 12, 0.18)',
              border: '1px solid rgba(232, 120, 12, 0.4)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '11.5px',
              fontWeight: '800',
              color: '#FF9F0A',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            {Icons.qrPhone} Scan to Bid on Phone
          </div>

          <h3
            style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              margin: '0 0 6px',
            }}
          >
            Sponsor Tonight&apos;s Aarti
          </h3>

          <p
            style={{
              fontSize: '13.5px',
              color: '#A1A1A6',
              margin: '0 0 22px',
              maxWidth: '280px',
              lineHeight: 1.45,
            }}
          >
            Point your smartphone camera at the QR code below to place your verified Aarti Seva bid instantly.
          </p>

          {/* High-Contrast White Background Squircle for QR Code */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '16px',
              borderRadius: '20px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
              display: 'inline-block',
              marginBottom: '18px',
            }}
          >
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Scan to Bid on Aarti Seva"
                width={220}
                height={220}
                style={{ display: 'block', borderRadius: '8px' }}
              />
            ) : (
              <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Generating QR...
              </div>
            )}
          </div>

          {/* Direct URL pill */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12px',
              color: '#FF9F0A',
              fontWeight: '700',
              fontFamily: 'monospace',
              letterSpacing: '0.2px',
            }}
          >
            dashboard.knoxvillemandir.org/navratri-aarti
          </div>

          <div style={{ fontSize: '11px', color: '#6E6E73', marginTop: '10px' }}>
            Instant email verification · Real-time outbid notices
          </div>
        </div>
      </main>

      {/* ── 10-DAY FESTIVAL ROSTER TAPE (BOTTOM NAVIGATION) ────────────────── */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span>Festival 10-Day Roster</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span style={{ color: '#FF9F0A' }}>Click any day to spotlight</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
            <span style={{ color: '#8E8E93' }}>
              Total Devotion Pledged: <strong style={{ color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>${grandTotalSeva.toLocaleString()}</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span style={{ color: '#8E8E93' }}>
              Total Bids: <strong style={{ color: '#FFFFFF' }}>{totalBidsCount}</strong>
            </span>
          </div>
        </div>

        {/* 10 Days Horizontal Tape */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
            gap: '8px',
          }}
        >
          {days.map((day) => {
            const isSelected = day.day_number === activeDay?.day_number;
            const isClosed = day.status === 'closed' || day.is_past_cutoff;
            const isMaha = day.is_maha_aarti;
            const hasWinner = day.bids_count > 0 && day.current_winner_name;

            return (
              <button
                key={day.day_number}
                onClick={() => setSelectedDayNum(day.day_number)}
                type="button"
                style={{
                  background: isSelected
                    ? 'linear-gradient(180deg, rgba(232, 120, 12, 0.3) 0%, rgba(20, 20, 24, 0.95) 100%)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected
                    ? '2px solid #FF9F0A'
                    : isMaha
                    ? '1.5px solid rgba(232, 120, 12, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '10px 8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: isSelected ? '#FF9F0A' : '#8E8E93' }}>
                    D{day.day_number}
                  </span>
                  {isMaha ? (
                    <span style={{ fontSize: '9px', fontWeight: '900', color: '#FF9F0A' }}>★</span>
                  ) : isClosed ? (
                    <span style={{ fontSize: '8px', color: '#6E6E73' }}>●</span>
                  ) : (
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  )}
                </div>

                <div style={{ fontSize: '13.5px', fontWeight: '800', color: hasWinner ? '#FF9F0A' : '#E5E5E7', fontVariantNumeric: 'tabular-nums' }}>
                  ${Number(day.current_highest_bid).toLocaleString()}
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    color: '#8E8E93',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={day.current_winner_name || 'No bids'}
                >
                  {day.current_winner_name || 'Opening'}
                </div>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
