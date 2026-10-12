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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  diya: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c.5 2 2 3.5 2 5.5 0 2.5-2 3.5-2 3.5s-2-1-2-3.5C10 5.5 11.5 4 12 2z" />
      <path d="M4 14c0 4 3.5 7 8 7s8-3 8-7c0-2-3-3-8-3s-8 1-8 3z" />
    </svg>
  )
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
      {/* Top Header Navigation */}
      <header style={{
        maxWidth: '1160px',
        margin: '0 auto',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary, #515154)',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: '600',
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border, rgba(0,0,0,0.09))',
          padding: '8px 14px',
          borderRadius: '10px',
          boxShadow: 'var(--shadow)',
        }}>
          {Icons.chevronLeft} Back to Portal
        </Link>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          fontSize: '12px',
          fontWeight: '700',
          color: 'var(--accent, #E8780C)',
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border, rgba(0,0,0,0.09))',
          borderRadius: '10px',
          padding: '8px 14px',
          boxShadow: 'var(--shadow)',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent, #E8780C)', display: 'inline-block' }} />
          Daily Cutoff: 9:30 PM EST
        </div>
      </header>

      {/* Live Scrolling Ticker Bar */}
      <AartiLiveTicker days={days} mode="public" />

      {/* Hero Section */}
      <section style={{ maxWidth: '780px', margin: '24px auto 36px', textAlign: 'center', padding: '0 20px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
          color: 'var(--accent, #E8780C)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: '8px',
        }}>
          {Icons.diya} Hindu Community Center · Navratri 2026
        </div>

        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 36px)',
          fontWeight: '700',
          letterSpacing: '-0.5px',
          color: 'var(--text-primary, #1D1D1F)',
          margin: '0 0 10px',
        }}>
          Daily Aarti Seva
        </h1>

        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary, #515154)',
          lineHeight: '1.5',
          maxWidth: '580px',
          margin: '0 auto 20px',
        }}>
          Devotees can sponsor and perform the sacred evening Aarti for each night of Navratri.
          Advance bidding is open for all days. Daily bidding closes at <strong>9:30 PM EST</strong>.
        </p>

        {/* Quiet Rule Strip */}
        <div style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border, rgba(0,0,0,0.09))',
          borderRadius: '12px',
          padding: '10px 18px',
          fontSize: '12.5px',
          color: 'var(--text-secondary, #515154)',
          boxShadow: 'var(--shadow)',
        }}>
          <span>Opening Reserve: <strong style={{ color: 'var(--text-primary, #1D1D1F)' }}>$500</strong></span>
          <span style={{ color: 'var(--border, #E5E5E5)' }}>|</span>
          <span>Increments: <strong style={{ color: 'var(--text-primary, #1D1D1F)' }}>$500</strong> (over $3k: $250)</span>
          <span style={{ color: 'var(--border, #E5E5E5)' }}>|</span>
          <span>Verified via Email OTP</span>
        </div>
      </section>

      {/* Main Festival Days Grid */}
      <main style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted, #86868B)', fontSize: '14px' }}>
            Loading festival schedule...
          </div>
        ) : error ? (
          <div style={{
            background: 'var(--bg-error, rgba(215, 0, 21, 0.06))',
            border: '1px solid var(--border-error, rgba(215, 0, 21, 0.20))',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-error, #D70015)',
            maxWidth: '460px',
            margin: '30px auto',
            fontSize: '13px',
          }}>
            {error}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}>
            {days.map((day) => {
              const isClosed = day.status === 'closed';
              const isMaha = day.is_maha_aarti;
              const hasWinner = day.bids_count > 0 && day.current_winner_name;

              return (
                <div
                  key={day.day_number}
                  id={`day-card-${day.day_number}`}
                  style={{
                    background: isMaha
                      ? 'linear-gradient(180deg, rgba(232, 120, 12, 0.05) 0%, var(--bg-card, #FFFFFF) 100%)'
                      : 'var(--bg-card, #FFFFFF)',
                    border: isMaha
                      ? '1.5px solid var(--accent, #E8780C)'
                      : '1px solid var(--border, rgba(0,0,0,0.09))',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isMaha
                      ? '0 4px 14px rgba(232, 120, 12, 0.12), var(--shadow)'
                      : 'var(--shadow)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  <div>
                    {/* Top Row: Date & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: isMaha ? 'var(--accent, #E8780C)' : 'var(--text-muted, #86868B)' }}>
                        Day {day.day_number} · {day.formatted_date}
                      </div>

                      {isClosed ? (
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted, #86868B)' }}>
                          Concluded
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                          Open
                        </span>
                      )}
                    </div>

                    {/* Day Title */}
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)', marginBottom: isMaha ? '4px' : '12px' }}>
                      {day.day_title}
                    </div>

                    {isMaha && (
                      <div style={{ fontSize: '11px', color: 'var(--accent, #E8780C)', fontWeight: '700', marginBottom: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ★ Maha Aarti (Aatham)
                      </div>
                    )}

                    {/* Bid & Leader Box */}
                    <div style={{
                      background: 'var(--bg-input, #F2F2F5)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      marginBottom: '16px',
                    }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted, #86868B)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        {isClosed ? 'Winning Contribution' : 'Current Highest Bid'}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: hasWinner ? 'var(--accent, #E8780C)' : 'var(--text-primary, #1D1D1F)', marginTop: '2px' }}>
                        ${day.current_highest_bid.toLocaleString()}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary, #515154)', marginTop: '6px' }}>
                        {hasWinner ? (
                          <span style={{ fontWeight: '600', color: 'var(--text-primary, #1D1D1F)' }}>
                            Leader: {day.current_winner_name}
                          </span>
                        ) : (
                          'No bids yet · Reserve: $500'
                        )}
                        {day.bids_count > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted, #86868B)', marginLeft: '6px' }}>
                            ({day.bids_count} {day.bids_count === 1 ? 'bid' : 'bids'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div>
                    {isClosed ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '10px 12px',
                        background: 'var(--bg-input, #F2F2F5)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: 'var(--text-secondary, #515154)',
                        fontWeight: '500',
                      }}>
                        Aarti Sponsor: <strong style={{ color: 'var(--text-primary, #1D1D1F)' }}>{day.current_winner_name || 'Anonymous'}</strong>
                      </div>
                    ) : (
                      <button
                        onClick={() => openBidModal(day)}
                        style={{
                          width: '100%',
                          background: isMaha ? 'var(--accent, #E8780C)' : 'var(--text-primary, #1D1D1F)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '11px 14px',
                          fontSize: '13.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s ease, transform 0.1s ease',
                          boxShadow: 'var(--shadow)',
                        }}
                      >
                        Place Aarti Bid →
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border, rgba(0,0,0,0.1))',
            borderRadius: '18px',
            maxWidth: '420px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent, #E8780C)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Day {selectedDay.day_number} · {selectedDay.formatted_date}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)', marginTop: '2px' }}>
                  {selectedDay.day_title}
                </div>
              </div>
              <button
                onClick={closeBidModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #86868B)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {Icons.close}
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              {/* STEP 1: Select 1-Click Bid & Enter Info */}
              {step === 1 && (
                <form onSubmit={handleInitiateBid}>
                  {/* Current Status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-input, #F2F2F5)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '12.5px',
                  }}>
                    <span style={{ color: 'var(--text-secondary, #515154)' }}>Current Leader:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>
                      {selectedDay.current_winner_name || 'None'} (${selectedDay.current_highest_bid.toLocaleString()})
                    </span>
                  </div>

                  {/* 1-Click Increment Pills */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #515154)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
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
                              background: isSelected ? 'rgba(232, 120, 12, 0.1)' : 'var(--bg-input, #F2F2F5)',
                              border: isSelected ? '2px solid var(--accent, #E8780C)' : '1px solid var(--border, rgba(0,0,0,0.08))',
                              borderRadius: '10px',
                              padding: '10px 6px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              color: isSelected ? 'var(--accent-strong, #C96205)' : 'var(--text-primary, #1D1D1F)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ fontSize: '15px', fontWeight: '800' }}>
                              ${opt.amount.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: '600', color: isSelected ? 'var(--accent, #E8780C)' : 'var(--text-muted, #86868B)', marginTop: '2px' }}>
                              {opt.label.split('(')[1]?.replace(')', '') || 'Next'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Devotee Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
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
                          border: '1px solid var(--border, rgba(0,0,0,0.12))',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: 'var(--text-primary, #1D1D1F)',
                          fontSize: '13.5px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
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
                          border: '1px solid var(--border, rgba(0,0,0,0.12))',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: 'var(--text-primary, #1D1D1F)',
                          fontSize: '13.5px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #515154)', marginBottom: '4px' }}>
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
                          border: '1px solid var(--border, rgba(0,0,0,0.12))',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: 'var(--text-primary, #1D1D1F)',
                          fontSize: '13.5px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {formError && (
                    <div style={{
                      background: 'var(--bg-error, rgba(215, 0, 21, 0.06))',
                      border: '1px solid var(--border-error, rgba(215, 0, 21, 0.20))',
                      borderRadius: '8px',
                      padding: '10px',
                      color: 'var(--text-error, #D70015)',
                      fontSize: '12px',
                      marginBottom: '14px',
                    }}>
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
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: 'var(--shadow)',
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
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)', marginBottom: '4px' }}>
                      Enter 6-Digit Verification Code
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary, #515154)' }}>
                      Sent to <strong>{maskedEmail}</strong> for a bid of <strong>${bidAmount?.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
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
                        border: '1.5px solid var(--accent, #E8780C)',
                        borderRadius: '10px',
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '26px',
                        fontWeight: '800',
                        letterSpacing: '8px',
                        color: 'var(--accent-strong, #C96205)',
                        outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '16px' }}>
                    <span style={{ color: countdown > 0 ? 'var(--text-secondary, #515154)' : 'var(--text-error, #D70015)' }}>
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
                        fontSize: '11.5px',
                        fontWeight: '600',
                        cursor: canResend ? 'pointer' : 'not-allowed',
                        textDecoration: 'underline',
                      }}
                    >
                      Resend Code
                    </button>
                  </div>

                  {formError && (
                    <div style={{
                      background: 'var(--bg-error, rgba(215, 0, 21, 0.06))',
                      border: '1px solid var(--border-error, rgba(215, 0, 21, 0.20))',
                      borderRadius: '8px',
                      padding: '10px',
                      color: 'var(--text-error, #D70015)',
                      fontSize: '12px',
                      marginBottom: '14px',
                    }}>
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || otpCode.length < 6}
                    style={{
                      width: '100%',
                      background: 'var(--accent, #E8780C)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: (submitting || otpCode.length < 6) ? 'not-allowed' : 'pointer',
                      opacity: (submitting || otpCode.length < 6) ? 0.6 : 1,
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    {submitting ? 'Verifying...' : 'Confirm & Post Bid'}
                  </button>
                </form>
              )}

              {/* STEP 3: Success Confirmation */}
              {step === 3 && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    marginBottom: '12px',
                  }}>
                    {Icons.check}
                  </div>

                  <h4 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary, #1D1D1F)' }}>
                    Jai Mataji! Bid Confirmed
                  </h4>

                  <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary, #515154)', lineHeight: '1.4' }}>
                    Your bid of <strong>${bidAmount?.toLocaleString()}</strong> has been verified. You are currently the leading sponsor for {selectedDay.day_title}!
                  </p>

                  <button
                    type="button"
                    onClick={closeBidModal}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #F2F2F5)',
                      border: '1px solid var(--border, rgba(0,0,0,0.08))',
                      borderRadius: '10px',
                      padding: '10px',
                      color: 'var(--text-primary, #1D1D1F)',
                      fontSize: '13px',
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
