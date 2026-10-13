'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AartiLiveTicker from '@/components/AartiLiveTicker';

// Clean SVG Icons
const Icons = {
  chevronLeft: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  mail: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  diya: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c.5 2 2 3.5 2 5.5 0 2.5-2 3.5-2 3.5s-2-1-2-3.5C10 5.5 11.5 4 12 2z" />
      <path d="M4 14c0 4 3.5 7 8 7s8-3 8-7c0-2-3-3-8-3s-8 1-8 3z" />
    </svg>
  ),
  lock: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  shieldCheck: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  user: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

const getInitials = (name) => {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function NavratriAartiPage() {
  const [days, setDays] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bid Modal State
  const [selectedDay, setSelectedDay] = useState(null);
  const [step, setStep] = useState(1); // 1: Select & Info, 2: OTP, 3: Success
  const [bidAmount, setBidAmount] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [bidId, setBidId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [canResend, setCanResend] = useState(false);

  // Fetch Days
  const fetchDays = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const res = await fetch('/api/navratri/aarti/days', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setDays(data.days || []);
        setSettings(data.settings || null);
      } else {
        if (!isPolling) setError(data.error || 'Unable to load festival schedule.');
      }
    } catch {
      if (!isPolling) setError('Connection error. Please try again.');
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDays();
    const interval = setInterval(() => {
      fetchDays(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchDays]);

  // Handle OTP countdown
  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const openBidModal = (day) => {
    setSelectedDay(day);
    setStep(1);
    setBidAmount(day.quick_options?.[0]?.amount || (day.current_highest_bid + 500));
    setFormError('');
    setOtpCode('');
  };

  // Handle URL query parameter `?day=X` for direct re-bidding from email notifications
  useEffect(() => {
    if (typeof window === 'undefined' || days.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get('day');
    if (dayParam) {
      const targetDay = days.find((d) => String(d.day_number) === String(dayParam));
      if (targetDay && targetDay.status !== 'closed' && !targetDay.is_past_cutoff) {
        setSelectedDay(targetDay);
        setStep(1);
        setBidAmount(targetDay.quick_options?.[0]?.amount || (targetDay.current_highest_bid + 500));
        setFormError('');
        setOtpCode('');
      }
      const el = document.getElementById(`day-card-${dayParam}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [days]);

  const closeBidModal = () => {
    setSelectedDay(null);
    setStep(1);
    setFormError('');
    setOtpCode('');
  };

  // Step 1: Initiate Bid & Request OTP
  const handleInitiateBid = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setFormError('Please enter your full name, phone number, and email.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/navratri/aarti/bid/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: selectedDay.day_number,
          bidder_name: fullName.trim(),
          bidder_phone: phone.trim(),
          bidder_email: email.trim(),
          bid_amount: bidAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Unable to place bid.');
        return;
      }

      setBidId(data.bid_id);
      setMaskedEmail(data.masked_email || email);
      setCountdown(300);
      setCanResend(false);
      setStep(2);
    } catch {
      setFormError('Failed to send verification code. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!otpCode || otpCode.length < 6) {
      setFormError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/navratri/aarti/bid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bid_id: bidId,
          otp_code: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Verification failed.');
        return;
      }

      fetchDays(true);
      setStep(3);
    } catch {
      setFormError('Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setFormError('');
    try {
      setSubmitting(true);
      const res = await fetch('/api/navratri/aarti/bid/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid_id: bidId }),
      });
      const data = await res.json();
      if (data.success) {
        setCountdown(300);
        setCanResend(false);
      } else {
        setFormError(data.error || 'Failed to resend code.');
      }
    } catch {
      setFormError('Failed to resend code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #F5F5F7)',
      color: 'var(--text-primary, #1D1D1F)',
      fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif)",
      paddingBottom: '60px',
      transition: 'background-color 0.25s, color 0.25s',
    }}>
      {/* Sticky Top Frosted Glass Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--bg-card, rgba(255, 255, 255, 0.85))',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid var(--border, rgba(0, 0, 0, 0.08))',
          transition: 'background-color 0.25s, border-color 0.25s',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--text-primary, #1D1D1F)',
              letterSpacing: '-0.01em',
            }}
          >
            <span style={{ color: 'var(--accent, #E8780C)', display: 'flex' }}>
              {Icons.diya}
            </span>
            <span>HCC Navratri 2026</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--accent, #E8780C)',
              background: 'rgba(232, 120, 12, 0.1)',
              border: '1px solid rgba(232, 120, 12, 0.25)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ display: 'flex', color: 'var(--accent, #E8780C)' }}>
              {Icons.clock}
            </span>
            <span>Daily Cutoff: <strong>9:45 PM EST</strong></span>
          </div>
        </div>
      </header>

      {/* Live Scrolling Ticker Bar */}
      <AartiLiveTicker days={days} mode="public" />

      {/* Apple-Style Hero Section */}
      <section
        style={{
          maxWidth: '820px',
          margin: '36px auto 32px',
          textAlign: 'center',
          padding: '0 20px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: '700',
            color: 'var(--accent, #E8780C)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: 'rgba(232, 120, 12, 0.1)',
            border: '1px solid rgba(232, 120, 12, 0.22)',
            padding: '5px 12px',
            borderRadius: '999px',
            marginBottom: '14px',
          }}
        >
          {Icons.diya} Hindu Community Center · Navratri 2026
        </div>

        <h1
          style={{
            fontSize: 'clamp(32px, 5.5vw, 46px)',
            fontWeight: '800',
            letterSpacing: '-0.03em',
            color: 'var(--text-primary, #1D1D1F)',
            margin: '0 0 12px',
            lineHeight: 1.1,
          }}
        >
          Daily Maha Aarti
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: 'var(--text-secondary, #515154)',
            lineHeight: '1.55',
            maxWidth: '620px',
            margin: '0 auto 24px',
          }}
        >
          Devotees can sponsor and perform the sacred evening Maha Aarti for each night of Navratri.
          Advance bidding is open for all 10 festival days. Daily bidding closes at <strong>9:45 PM EST</strong>.
        </p>

        {/* Apple Segmented Feature Strip */}
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px 18px',
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border, rgba(0,0,0,0.09))',
            borderRadius: '999px',
            padding: '10px 22px',
            fontSize: '12.5px',
            color: 'var(--text-secondary, #515154)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span>Opening Reserve:</span>
            <strong style={{ color: 'var(--text-primary, #1D1D1F)' }}>$500</strong>
          </span>
          <span style={{ color: 'var(--border, rgba(0,0,0,0.15))' }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span>Increments:</span>
            <strong style={{ color: 'var(--text-primary, #1D1D1F)' }}>$500</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)' }}>(+$250 over $3k)</span>
          </span>
          <span style={{ color: 'var(--border, rgba(0,0,0,0.15))' }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--accent, #E8780C)', display: 'flex' }}>{Icons.shieldCheck}</span>
            <span>Verified via Email OTP</span>
          </span>
        </div>
      </section>

      {/* 10 Festival Days Grid */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted, #86868B)', fontSize: '14px' }}>
            Loading festival schedule...
          </div>
        ) : error ? (
          <div
            style={{
              background: 'var(--bg-error, rgba(215, 0, 21, 0.06))',
              border: '1px solid var(--border-error, rgba(215, 0, 21, 0.20))',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center',
              color: 'var(--text-error, #D70015)',
              maxWidth: '460px',
              margin: '30px auto',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '20px',
            }}
          >
            {days.map((day) => {
              const isClosed = day.status === 'closed' || day.is_past_cutoff;
              const isMaha = day.is_maha_aarti;
              const hasWinner = day.bids_count > 0 && day.current_winner_name;

              return (
                <div
                  key={day.day_number}
                  id={`day-card-${day.day_number}`}
                  style={{
                    background: isMaha
                      ? 'linear-gradient(180deg, rgba(232, 120, 12, 0.06) 0%, var(--bg-card, #FFFFFF) 100%)'
                      : 'var(--bg-card, #FFFFFF)',
                    border: isMaha
                      ? '1.5px solid var(--accent, #E8780C)'
                      : '1px solid var(--border, rgba(0,0,0,0.09))',
                    borderRadius: '18px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isMaha
                      ? '0 6px 20px rgba(232, 120, 12, 0.16), var(--shadow)'
                      : 'var(--shadow)',
                    transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div>
                    {/* Top Row: Date Pill & Live Status Badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: isMaha ? 'var(--accent, #E8780C)' : 'var(--text-secondary, #6E6E73)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <span style={{ color: 'var(--accent, #E8780C)' }}>{Icons.diya}</span>
                        <span>Day {day.day_number} · {day.formatted_date}</span>
                      </div>

                      {day.is_locked ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: 'rgba(232, 120, 12, 0.12)',
                            color: 'var(--accent, #E8780C)',
                            border: '1px solid rgba(232, 120, 12, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {Icons.lock} Sponsorship Reserved
                        </span>
                      ) : isClosed ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            background: 'var(--bg-input, #F2F2F5)',
                            color: 'var(--text-muted, #86868B)',
                            border: '1px solid var(--border, rgba(0,0,0,0.06))',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {Icons.lock} Concluded
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10B981',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#10B981',
                              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
                              display: 'inline-block',
                            }}
                          />
                          Live · Open
                        </span>
                      )}
                    </div>

                    {/* Day Title */}
                    <div
                      style={{
                        fontSize: '17px',
                        fontWeight: '700',
                        color: 'var(--text-primary, #1D1D1F)',
                        marginBottom: isMaha ? '6px' : '14px',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                      }}
                    >
                      {day.day_title}
                    </div>

                    {/* Maha Aarti Badge */}
                    {isMaha && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(232, 120, 12, 0.15)',
                          color: 'var(--accent, #E8780C)',
                          fontSize: '10.5px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase',
                          marginBottom: '14px',
                        }}
                      >
                        ★ Maha Aarti (Aatham)
                      </div>
                    )}

                    {/* Apple Wallet / Card Financial Highlight Block */}
                    <div
                      style={{
                        background: 'var(--bg-input, #F2F2F5)',
                        border: '1px solid var(--border, rgba(0,0,0,0.06))',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        marginBottom: '18px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          color: 'var(--text-muted, #86868B)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {day.is_locked ? 'Reserved Sponsorship Contribution' : isClosed ? 'Winning Contribution' : 'Current Highest Bid'}
                      </div>

                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: '800',
                          color: (hasWinner || day.is_locked) ? 'var(--accent, #E8780C)' : 'var(--text-primary, #1D1D1F)',
                          marginTop: '3px',
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        ${day.current_highest_bid.toLocaleString()}
                      </div>

                      {/* Devotee Leader Row */}
                      <div
                        style={{
                          fontSize: '12.5px',
                          color: 'var(--text-secondary, #515154)',
                          marginTop: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        {(hasWinner || day.is_locked) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'rgba(232, 120, 12, 0.15)',
                                color: 'var(--accent, #E8780C)',
                                fontSize: '10px',
                                fontWeight: '800',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(day.current_winner_name)}
                            </span>
                            <span
                              style={{
                                fontWeight: '600',
                                color: 'var(--text-primary, #1D1D1F)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={day.current_winner_name}
                            >
                              {day.is_locked ? 'Sponsor: ' : 'Leader: '}{day.current_winner_name}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary, #6E6E73)', fontSize: '12px' }}>
                            No bids yet · Reserve: ${Number(day.base_bid || 500).toLocaleString()}
                          </span>
                        )}

                        {day.bids_count > 0 && !day.is_locked && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: 'var(--text-muted, #86868B)',
                              background: 'var(--bg-card, #FFFFFF)',
                              border: '1px solid var(--border, rgba(0,0,0,0.08))',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              flexShrink: 0,
                            }}
                          >
                            {day.bids_count} {day.bids_count === 1 ? 'bid' : 'bids'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div>
                    {day.is_locked ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px 14px',
                          background: 'rgba(232, 120, 12, 0.08)',
                          border: '1px solid rgba(232, 120, 12, 0.25)',
                          borderRadius: '12px',
                          fontSize: '13px',
                          color: 'var(--accent, #E8780C)',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {Icons.lock} Sponsorship Reserved · Maha Aarti
                      </div>
                    ) : isClosed ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px 14px',
                          background: 'var(--bg-input, #F2F2F5)',
                          border: '1px solid var(--border, rgba(0,0,0,0.06))',
                          borderRadius: '12px',
                          fontSize: '13px',
                          color: 'var(--text-secondary, #515154)',
                          fontWeight: '500',
                        }}
                      >
                        Maha Aarti Sponsor: <strong style={{ color: 'var(--text-primary, #1D1D1F)' }}>{day.current_winner_name || 'Devotee'}</strong>
                      </div>
                    ) : (
                      <button
                        onClick={() => openBidModal(day)}
                        type="button"
                        style={{
                          width: '100%',
                          background: 'var(--accent, #E8780C)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '13px 18px',
                          fontSize: '15px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(232, 120, 12, 0.3)',
                          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        {Icons.diya} Place Maha Aarti Bid &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Apple-Style Bidding Modal */}
      {selectedDay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border, rgba(0,0,0,0.12))',
              borderRadius: '20px',
              maxWidth: '430px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              color: 'var(--text-primary, #1D1D1F)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--accent, #E8780C)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Day {selectedDay.day_number} · {selectedDay.formatted_date}
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: 'var(--text-primary, #1D1D1F)',
                    marginTop: '2px',
                  }}
                >
                  {selectedDay.day_title}
                </div>
              </div>
              <button
                onClick={closeBidModal}
                type="button"
                style={{
                  background: 'var(--bg-input, #F2F2F5)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted, #86868B)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'opacity 0.15s ease',
                }}
              >
                {Icons.close}
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px' }}>
              {/* STEP 1: Select 1-Click Bid & Enter Info */}
              {step === 1 && (
                <form onSubmit={handleInitiateBid}>
                  {/* Current Status Strip */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-input, #F2F2F5)',
                      border: '1px solid var(--border, rgba(0,0,0,0.08))',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      marginBottom: '18px',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary, #6E6E73)', fontWeight: '500' }}>Current Leader:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary, #1D1D1F)', fontVariantNumeric: 'tabular-nums' }}>
                      {selectedDay.current_winner_name || 'None'} (${selectedDay.current_highest_bid.toLocaleString()})
                    </span>
                  </div>

                  {/* 1-Click Increment Pills */}
                  <div style={{ marginBottom: '18px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: 'var(--text-secondary, #6E6E73)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '8px',
                      }}
                    >
                      Select Your Bid Amount
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {selectedDay.quick_options?.map((opt) => {
                        const isSelected = bidAmount === opt.amount;
                        return (
                          <button
                            type="button"
                            key={opt.amount}
                            onClick={() => setBidAmount(opt.amount)}
                            style={{
                              background: isSelected ? 'rgba(232, 120, 12, 0.12)' : 'var(--bg-input, #F2F2F5)',
                              border: isSelected ? '2px solid var(--accent, #E8780C)' : '1px solid var(--border, rgba(0,0,0,0.12))',
                              borderRadius: '12px',
                              padding: '11px 6px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              color: isSelected ? 'var(--accent, #E8780C)' : 'var(--text-primary, #1D1D1F)',
                              boxShadow: isSelected ? '0 2px 10px rgba(232, 120, 12, 0.22)' : 'none',
                              transition: 'all 0.15s ease',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            <div style={{ fontSize: '16px', fontWeight: '800' }}>
                              ${opt.amount.toLocaleString()}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: isSelected ? 'var(--accent, #E8780C)' : 'var(--text-secondary, #6E6E73)',
                                marginTop: '2px',
                              }}
                            >
                              {opt.label.split('(')[1]?.replace(')', '') || 'Next'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Devotee Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '5px' }}>
                        Full Name (Shown publicly if winning)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'var(--bg-input, #F2F2F5)',
                          border: '1.5px solid var(--border, rgba(0,0,0,0.12))',
                          borderRadius: '12px',
                          padding: '13px 14px',
                          color: 'var(--text-primary, #1D1D1F)',
                          fontSize: '16px', // 16px strictly prevents iOS Safari auto-zoom
                          outline: 'none',
                          fontWeight: '500',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '5px' }}>
                        Phone Number (Private · staff only)
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. (865) 555-0199"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'var(--bg-input, #F2F2F5)',
                          border: '1.5px solid var(--border, rgba(0,0,0,0.12))',
                          borderRadius: '12px',
                          padding: '13px 14px',
                          color: 'var(--text-primary, #1D1D1F)',
                          fontSize: '16px', // 16px strictly prevents iOS Safari auto-zoom
                          outline: 'none',
                          fontWeight: '500',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '5px' }}>
                        Email Address (OTP verification code sent here)
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'var(--bg-input, #F2F2F5)',
                          border: '1.5px solid var(--border, rgba(0,0,0,0.12))',
                          borderRadius: '12px',
                          padding: '13px 14px',
                          color: 'var(--text-primary, #1D1D1F)',
                          fontSize: '16px', // 16px strictly prevents iOS Safari auto-zoom
                          outline: 'none',
                          fontWeight: '500',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                      />
                    </div>
                  </div>

                  {formError && (
                    <div
                      style={{
                        background: 'var(--bg-error, rgba(215, 0, 21, 0.08))',
                        border: '1.5px solid var(--border-error, rgba(215, 0, 21, 0.24))',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        color: 'var(--text-error, #D70015)',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        marginBottom: '16px',
                      }}
                    >
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: '100%',
                      background: 'var(--accent, #E8780C)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '15px 18px',
                      fontSize: '16px',
                      fontWeight: '800',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(232, 120, 12, 0.35)',
                      letterSpacing: '0.2px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {submitting ? 'Sending Verification Code...' : `Verify & Place Bid of $${bidAmount?.toLocaleString()} →`}
                  </button>
                </form>
              )}

              {/* STEP 2: 6-Digit OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)', marginBottom: '4px' }}>
                      Enter 6-Digit Verification Code
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary, #515154)', lineHeight: 1.4 }}>
                      Sent to <strong>{maskedEmail}</strong> for a bid of <strong>${bidAmount?.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <input
                      type="text"
                      maxLength="6"
                      autoFocus
                      required
                      placeholder="······"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'var(--bg-input, #F2F2F5)',
                        border: '2px solid var(--accent, #E8780C)',
                        borderRadius: '14px',
                        padding: '14px',
                        textAlign: 'center',
                        fontSize: '30px',
                        fontWeight: '800',
                        letterSpacing: '10px',
                        color: 'var(--text-primary, #1D1D1F)',
                        outline: 'none',
                        fontFamily: 'monospace',
                        boxShadow: '0 2px 10px rgba(232, 120, 12, 0.15)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '16px' }}>
                    <span style={{ fontWeight: '600', color: countdown > 0 ? 'var(--text-secondary, #6E6E73)' : 'var(--text-error, #D70015)', fontVariantNumeric: 'tabular-nums' }}>
                      Expires in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      disabled={!canResend || submitting}
                      onClick={handleResendOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: canResend ? 'var(--accent, #E8780C)' : 'var(--text-muted, #86868B)',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: canResend ? 'pointer' : 'not-allowed',
                        textDecoration: 'underline',
                      }}
                    >
                      Resend Code
                    </button>
                  </div>

                  {formError && (
                    <div
                      style={{
                        background: 'var(--bg-error, rgba(215, 0, 21, 0.08))',
                        border: '1.5px solid var(--border-error, rgba(215, 0, 21, 0.24))',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        color: 'var(--text-error, #D70015)',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        marginBottom: '16px',
                      }}
                    >
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || otpCode.length < 6}
                    style={{
                      width: '100%',
                      background: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '15px 18px',
                      fontSize: '16px',
                      fontWeight: '800',
                      cursor: (submitting || otpCode.length < 6) ? 'not-allowed' : 'pointer',
                      opacity: (submitting || otpCode.length < 6) ? 0.6 : 1,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {submitting ? 'Confirming...' : 'Confirm & Post Winning Bid ✓'}
                  </button>
                </form>
              )}

              {/* STEP 3: Success Confirmation */}
              {step === 3 && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      marginBottom: '14px',
                    }}
                  >
                    {Icons.check}
                  </div>

                  <h4 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: '800', color: 'var(--text-primary, #1D1D1F)' }}>
                    Jai Mataji! Bid Confirmed
                  </h4>

                  <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: 'var(--text-secondary, #515154)', lineHeight: '1.5' }}>
                    Your bid of <strong>${bidAmount?.toLocaleString()}</strong> has been verified. You are currently the leading sponsor for {selectedDay.day_title}!
                  </p>

                  <button
                    type="button"
                    onClick={closeBidModal}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #F2F2F5)',
                      border: '1px solid var(--border, rgba(0,0,0,0.08))',
                      borderRadius: '12px',
                      padding: '12px',
                      color: 'var(--text-primary, #1D1D1F)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
