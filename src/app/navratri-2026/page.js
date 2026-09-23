'use client';
import { useState, useEffect, useCallback } from 'react';
import { colors, spacing, type, radii, btn, input, card, page as pageStyle, container, keyframes, alert as alertStyle } from '@/lib/navratri/designSystem';

// ── Constants ────────────────────────────────────────────────────────────────
const VENUE = { name: 'Hindu Community Center Knoxville', address: '8580 Hickory Creek Rd, Lenoir City, TN' };
const EVENT_SLUG = 'navratri-2026';
const STEPS = ['verify', 'select', 'review', 'checkout'];

// ── Theme Hook (system preference, fallback dark) ────────────────────────────
function usePreferredTheme() {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    setTheme(mq.matches ? 'light' : 'dark');
    const handler = (e) => setTheme(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return theme;
}

export default function NavratriPublicPage() {
  const theme = usePreferredTheme();
  const c = colors(theme);

  const [step, setStep] = useState('verify');
  const [event, setEvent] = useState(null);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // OTP state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [devCode, setDevCode] = useState('');

  // Membership state
  const [membership, setMembership] = useState(null);
  const [customerType, setCustomerType] = useState('non_member');
  const [memberData, setMemberData] = useState(null);

  // Purchase state
  const [orderType, setOrderType] = useState('daily');
  const [selectedDates, setSelectedDates] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [existingOrder, setExistingOrder] = useState(null);

  // Load event data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/navratri/events`);
        const data = await res.json();
        const ev = data.events?.find(e => e.slug === EVENT_SLUG);
        if (ev) {
          setEvent(ev);
          const dRes = await fetch(`/api/navratri/events/${ev.id}`);
          const dData = await dRes.json();
          setDates(dData.dates || []);
        }
      } catch (err) {
        setError('Failed to load event data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── OTP Handlers ───────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    setOtpLoading(true); setError('');
    try {
      const res = await fetch('/api/navratri/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOtpSent(true);
      if (data.devCode) setDevCode(data.devCode);
    } catch { setError('Failed to send OTP'); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOTP = async () => {
    setOtpLoading(true); setError('');
    try {
      const res = await fetch('/api/navratri/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', phone, code: otpCode, eventSlug: EVENT_SLUG }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      if (data.membership?.found) {
        setMembership(data.membership);
        setCustomerType(data.membership.type);
        setMemberData(data.membership);
        setName(data.membership.name || '');
        setEmail(data.membership.email || '');

        if (data.membership.existingOrder) {
          setExistingOrder(data.membership.existingOrder);
          setStep('already_claimed');
          return;
        }

        if (data.membership.type === 'pioneer' || data.membership.type === 'committee') {
          setOrderType('pioneer_claim');
          setStep('review');
          return;
        }
      } else {
        setCustomerType('non_member');
      }
      setStep('select');
    } catch { setError('Verification failed'); }
    finally { setOtpLoading(false); }
  };

  const handleSkipVerify = () => {
    setCustomerType('non_member');
    setStep('select');
  };

  // ── Date Selection ─────────────────────────────────────────────────────────
  const updateDateQty = (dateId, delta) => {
    setSelectedDates(prev => {
      const current = prev[dateId] || 0;
      const next = Math.max(0, Math.min(current + delta, 2));
      if (next === 0) { const { [dateId]: _, ...rest } = prev; return rest; }
      return { ...prev, [dateId]: next };
    });
  };

  // ── Calculate Total ────────────────────────────────────────────────────────
  const getTotal = useCallback(() => {
    if (!event) return 0;
    if (orderType === 'combo') return (event.price_combo || 35000) / 100;
    if (orderType === 'pioneer_claim') return 0;

    let total = 0;
    for (const [dateId, qty] of Object.entries(selectedDates)) {
      let price;
      if (customerType === 'general') price = (event.price_general_daily || 2000) / 100;
      else if (customerType === 'pioneer') price = (event.price_pioneer_guest_daily || 2000) / 100;
      else price = (event.price_nonmember_daily || 3000) / 100;
      total += price * qty;
    }
    return total;
  }, [event, orderType, selectedDates, customerType]);

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    setCheckoutLoading(true); setError('');
    try {
      const items = Object.entries(selectedDates).map(([dateId, qty]) => ({ dateId: parseInt(dateId), quantity: qty }));

      const res = await fetch('/api/navratri/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: EVENT_SLUG,
          customerType,
          odooPartnerId: memberData?.odooPartnerId || null,
          purchaserName: name,
          purchaserEmail: email,
          purchaserPhone: phone,
          items: orderType === 'daily' ? items : [],
          orderType,
          termsAccepted,
          consentMarketing,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      if (data.type === 'pioneer_claim') {
        window.location.href = `/navratri-2026/success?order=${data.orderNumber}`;
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch { setError('Checkout failed. Please try again.'); }
    finally { setCheckoutLoading(false); }
  };

  // ── Shared Styles ─────────────────────────────────────────────────────────
  const sectionStyle = { ...card(theme), padding: `${spacing.xl}px`, marginTop: `${spacing.lg}px` };
  const sectionTitleStyle = { ...type.sectionTitle, color: c.text, margin: `0 0 ${spacing.base}px` };
  const labelStyle = { ...type.label, color: c.muted, display: 'block', marginBottom: `${spacing.xs}px` };
  const inputStyle = input(theme);
  const primaryBtn = btn('primaryLg', theme);
  const secondaryBtn = { ...btn('secondary', theme), width: '100%', padding: '14px 24px', marginTop: `${spacing.sm}px` };
  const stepIndicatorIdx = STEPS.indexOf(step);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...pageStyle(theme), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ ...type.body, color: c.muted }}>Loading Navratri 2026…</p>
      </div>
      <style>{keyframes}</style>
    </div>
  );

  return (
    <div style={pageStyle(theme)}>
      <style>{keyframes}</style>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: c.gradient, padding: `${spacing['3xl']}px ${spacing.lg}px ${spacing['2xl']}px`,
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,215,0,0.3), transparent 40%)',
        }} />
        <div style={{ position: 'relative' }}>
          <p style={{ ...type.overline, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.sm }}>
            HINDU COMMUNITY CENTER KNOXVILLE
          </p>
          <h1 style={{ ...type.pageTitle, fontSize: '32px', color: '#fff', margin: `0 0 ${spacing.sm}px` }}>
            Navratri 2026
          </h1>
          <p style={{ ...type.body, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            Oct 11–20 & Oct 25 · 7:00 – 11:00 PM
          </p>
          <p style={{ ...type.caption, color: 'rgba(255,255,255,0.6)', marginTop: spacing.xs }}>
            {VENUE.address}
          </p>
        </div>
      </div>

      <div style={container('600px')}>
        {/* ── Step Indicator ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: `${spacing.sm}px`, marginTop: `${spacing.lg}px` }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, maxWidth: '60px', height: '3px', borderRadius: '2px',
              background: stepIndicatorIdx >= i ? c.primary : c.border,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {error && (
          <div style={{ ...alertStyle('error', theme), marginTop: spacing.base }}>
            ⚠️ {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1: Verify Phone
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'verify' && (
          <div style={{ ...sectionStyle, marginTop: spacing.xl }}>
            <h2 style={sectionTitleStyle}>Verify Your Phone</h2>
            <p style={{ ...type.secondary, color: c.muted, margin: `0 0 ${spacing.lg}px` }}>
              Enter your phone number to check membership status and get the best pricing.
            </p>

            <label style={labelStyle}>Phone Number</label>
            <input style={inputStyle} type="tel" inputMode="tel" placeholder="(865) 555-1234" value={phone}
              onChange={e => setPhone(e.target.value)} />

            {!otpSent ? (
              <button style={{ ...primaryBtn, marginTop: spacing.base, opacity: otpLoading || !phone ? 0.5 : 1 }}
                disabled={otpLoading || !phone} onClick={handleSendOTP}>
                {otpLoading ? 'Sending…' : 'Send Verification Code'}
              </button>
            ) : (
              <>
                {devCode && (
                  <div style={{ ...alertStyle('success', theme), marginTop: spacing.md }}>
                    🧪 Dev mode code: <strong>{devCode}</strong>
                  </div>
                )}
                <label style={{ ...labelStyle, marginTop: spacing.base }}>Enter 6-digit code</label>
                <input style={{ ...inputStyle, textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontVariantNumeric: 'tabular-nums' }}
                  type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} />
                <button style={{ ...primaryBtn, marginTop: spacing.base, opacity: otpLoading || otpCode.length !== 6 ? 0.5 : 1 }}
                  disabled={otpLoading || otpCode.length !== 6} onClick={handleVerifyOTP}>
                  {otpLoading ? 'Verifying…' : 'Verify & Continue'}
                </button>
              </>
            )}

            <button style={secondaryBtn} onClick={handleSkipVerify}>
              Skip — Buy as Non-Member
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ALREADY CLAIMED
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'already_claimed' && existingOrder && (
          <div style={{ ...sectionStyle, textAlign: 'center', marginTop: spacing.xl }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 16px',
              background: existingOrder.pickedUp ? c.greenBg : c.accentBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
            }}>
              {existingOrder.pickedUp ? '✅' : '🎟️'}
            </div>
            <h2 style={{ ...type.sectionTitle, color: c.text }}>
              {existingOrder.pickedUp ? 'Wristbands Already Picked Up' : 'Pass Already Claimed'}
            </h2>
            <p style={{ ...type.secondary, color: c.muted, marginTop: spacing.sm, lineHeight: '1.6' }}>
              {existingOrder.pickedUp
                ? `Your wristbands were picked up on ${new Date(existingOrder.pickedUpAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`
                : `You already claimed your Pioneer Free Pass (Order: ${existingOrder.orderNumber}).`
              }
            </p>
            {!existingOrder.pickedUp && (
              <p style={{ ...type.bodyMedium, color: c.accent, marginTop: spacing.md }}>
                Pick up your wristbands at the registration desk on any event day.
              </p>
            )}
            <div style={{ marginTop: spacing.xl }}>
              <a href={`/navratri-2026/tickets?phone=${encodeURIComponent(phone)}`}
                style={{ ...primaryBtn, display: 'inline-flex', textDecoration: 'none', width: 'auto', padding: '14px 32px' }}>
                View My Tickets
              </a>
            </div>
            <button style={{ ...secondaryBtn, marginTop: spacing.md }}
              onClick={() => { setStep('select'); setExistingOrder(null); }}>
              Buy Guest Tickets Instead
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2: Select Tickets
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'select' && (
          <>
            {/* Membership badge */}
            {membership?.found && (
              <div style={{
                ...card(theme), padding: spacing.base, marginTop: spacing.xl,
                background: c.greenBg, borderColor: `rgba(52,211,153,0.2)`,
                display: 'flex', alignItems: 'center', gap: `${spacing.md}px`,
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%', background: c.greenBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  border: `2px solid ${c.green}`, flexShrink: 0,
                }}>✓</div>
                <div>
                  <div style={{ ...type.bodyMedium, color: c.text }}>{membership.name}</div>
                  <div style={{ ...type.caption, color: c.green, marginTop: '2px' }}>
                    {membership.type === 'pioneer' ? 'Pioneer Member' : 'General Member'} · Verified
                  </div>
                </div>
              </div>
            )}

            {/* Ticket type cards */}
            <div style={{ ...sectionStyle, marginTop: spacing.lg }}>
              <h2 style={sectionTitleStyle}>Choose Your Tickets</h2>

              {/* Pioneer free claim */}
              {customerType === 'pioneer' && (
                <TicketOption
                  selected={orderType === 'pioneer_claim'} c={c}
                  title="Pioneer Free Pass"
                  subtitle="2 wristbands for all 11 days + parking"
                  price="FREE" priceColor={c.green}
                  onClick={() => setOrderType('pioneer_claim')}
                />
              )}

              {/* Combo pass */}
              {customerType === 'general' && (
                <TicketOption
                  selected={orderType === 'combo'} c={c}
                  title="Full Event Pass"
                  subtitle="2 wristbands for all 11 days"
                  price={`$${((event?.price_combo || 35000) / 100).toFixed(0)}`}
                  onClick={() => setOrderType('combo')}
                />
              )}

              {/* Daily tickets */}
              <div style={{
                borderRadius: `${radii.md}px`, padding: `${spacing.base}px`,
                background: orderType === 'daily' ? c.primaryBg : 'transparent',
                border: `2px solid ${orderType === 'daily' ? c.primary : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.15s',
                marginTop: spacing.sm,
              }} onClick={() => setOrderType('daily')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ ...type.bodyMedium, color: c.text }}>Daily Tickets</div>
                    <div style={{ ...type.caption, color: c.muted, marginTop: '2px' }}>Up to 2 per event date</div>
                  </div>
                  <div style={{ ...type.tabletNum, color: c.accent }}>
                    ${customerType === 'non_member' ? ((event?.price_nonmember_daily || 3000) / 100) : ((event?.price_general_daily || 2000) / 100)}<span style={{ ...type.caption, color: c.muted }}>/ea</span>
                  </div>
                </div>

                {orderType === 'daily' && (
                  <div style={{ marginTop: spacing.base, borderTop: `1px solid ${c.border}`, paddingTop: spacing.md }}>
                    {dates.map(d => (
                      <div key={d.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: `${spacing.md}px 0`,
                        borderBottom: `1px solid ${c.border}`,
                      }}>
                        <div>
                          <div style={{ ...type.bodyMedium, color: c.text }}>{d.label}</div>
                          <div style={{ ...type.caption, color: c.muted }}>
                            {new Date(d.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: `${spacing.md}px` }}>
                          <button onClick={e => { e.stopPropagation(); updateDateQty(d.id, -1); }}
                            style={{
                              width: '40px', height: '40px', borderRadius: `${radii.sm}px`,
                              border: `1px solid ${c.border}`, background: 'transparent',
                              color: (selectedDates[d.id] || 0) <= 0 ? c.placeholder : c.text,
                              fontSize: '18px', fontWeight: '600', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>−</button>
                          <span style={{ ...type.bodyMedium, minWidth: '20px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                            {selectedDates[d.id] || 0}
                          </span>
                          <button onClick={e => { e.stopPropagation(); updateDateQty(d.id, 1); }}
                            style={{
                              width: '40px', height: '40px', borderRadius: `${radii.sm}px`,
                              border: `1px solid ${c.border}`, background: 'transparent',
                              color: (selectedDates[d.id] || 0) >= 2 ? c.placeholder : c.text,
                              fontSize: '18px', fontWeight: '600', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Total & Continue */}
            <div style={{
              ...sectionStyle, marginTop: spacing.base,
              position: 'sticky', bottom: 0,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderTop: `1px solid ${c.border}`,
              zIndex: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <span style={{ ...type.bodyMedium, color: c.muted }}>Total</span>
                <span style={{ ...type.bigNum, color: c.accent }}>${getTotal().toFixed(2)}</span>
              </div>
              <button style={{ ...primaryBtn, opacity: orderType === 'daily' && Object.keys(selectedDates).length === 0 ? 0.5 : 1 }}
                disabled={orderType === 'daily' && Object.keys(selectedDates).length === 0}
                onClick={() => setStep('review')}>
                Continue to Review
              </button>
              <button style={secondaryBtn} onClick={() => setStep('verify')}>
                ← Back
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3: Review & Checkout
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'review' && (
          <>
            <div style={{ ...sectionStyle, marginTop: spacing.xl }}>
              <h2 style={sectionTitleStyle}>Your Information</h2>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />

              <label style={{ ...labelStyle, marginTop: spacing.base }}>Email *</label>
              <input style={inputStyle} type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />

              <label style={{ ...labelStyle, marginTop: spacing.base }}>Phone</label>
              <input style={{ ...inputStyle, opacity: 0.6 }} value={phone} readOnly />
            </div>

            <div style={{ ...sectionStyle }}>
              <h2 style={sectionTitleStyle}>Order Summary</h2>
              {orderType === 'combo' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing.md}px 0`, borderBottom: `1px solid ${c.border}` }}>
                  <span style={type.body}>Full Event Pass (2 wristbands, all 11 days)</span>
                  <span style={{ ...type.bodyMedium, flexShrink: 0 }}>${((event?.price_combo || 35000) / 100).toFixed(2)}</span>
                </div>
              )}
              {orderType === 'pioneer_claim' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing.md}px 0`, borderBottom: `1px solid ${c.border}` }}>
                  <span style={type.body}>Pioneer Free Pass (2 wristbands + parking)</span>
                  <span style={{ ...type.bodyMedium, color: c.green, flexShrink: 0 }}>FREE</span>
                </div>
              )}
              {orderType === 'daily' && Object.entries(selectedDates).map(([dateId, qty]) => {
                const d = dates.find(dd => dd.id === parseInt(dateId));
                const price = customerType === 'non_member'
                  ? (event?.price_nonmember_daily || 3000) / 100
                  : (event?.price_general_daily || 2000) / 100;
                return (
                  <div key={dateId} style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing.md}px 0`, borderBottom: `1px solid ${c.border}` }}>
                    <span style={type.body}>{d?.label} × {qty}</span>
                    <span style={{ ...type.bodyMedium, flexShrink: 0 }}>${(price * qty).toFixed(2)}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${spacing.base}px 0`, marginTop: spacing.sm }}>
                <span style={{ ...type.bodyMedium, color: c.text }}>Total</span>
                <span style={{ ...type.bigNum, color: c.accent }}>${getTotal().toFixed(2)}</span>
              </div>
            </div>

            <div style={{ ...sectionStyle }}>
              <label style={{ display: 'flex', gap: `${spacing.md}px`, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ width: '22px', height: '22px', marginTop: '1px', accentColor: c.primary, flexShrink: 0 }} />
                <span style={{ ...type.secondary, color: c.muted }}>
                  I accept the{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer"
                    style={{ color: c.primary, textDecoration: 'underline' }}>
                    terms, conditions, and privacy policy
                  </a>, including the refund policy (72-hour refund window) and SMS messaging policy. *
                </span>
              </label>

              <label style={{ display: 'flex', gap: `${spacing.md}px`, alignItems: 'flex-start', cursor: 'pointer', marginTop: spacing.base }}>
                <input type="checkbox" checked={consentMarketing} onChange={e => setConsentMarketing(e.target.checked)}
                  style={{ width: '22px', height: '22px', marginTop: '1px', accentColor: c.primary, flexShrink: 0 }} />
                <span style={{ ...type.secondary, color: c.muted }}>
                  I'd like to receive event updates and announcements from HCC.
                </span>
              </label>

              <button style={{
                ...primaryBtn, marginTop: spacing.xl,
                opacity: checkoutLoading || !termsAccepted || !name || !email ? 0.5 : 1,
              }}
                disabled={checkoutLoading || !termsAccepted || !name || !email}
                onClick={handleCheckout}>
                {checkoutLoading ? 'Processing…' :
                  orderType === 'pioneer_claim' ? 'Claim Your Free Pass' :
                  `Pay $${getTotal().toFixed(2)}`}
              </button>
              <button style={secondaryBtn} onClick={() => setStep('select')}>
                ← Back to Selection
              </button>
            </div>
          </>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: `${spacing['2xl']}px 0 ${spacing.base}px`, ...type.caption, color: c.placeholder }}>
          <p style={{ margin: 0 }}>© 2026 Hindu Community Center Knoxville</p>
          <p style={{ margin: `${spacing.xs}px 0 0` }}>Questions? Contact knoxvillehcc@gmail.com</p>
        </div>
      </div>
    </div>
  );
}

// ── Ticket Option Card ──────────────────────────────────────────────────────
function TicketOption({ selected, c, title, subtitle, price, priceColor, onClick }) {
  return (
    <div style={{
      borderRadius: `${radii.md}px`, padding: `${spacing.base}px`,
      background: selected ? (priceColor === c.green ? c.greenBg : c.accentBg) : 'transparent',
      border: `2px solid ${selected ? (priceColor || c.accent) : 'transparent'}`,
      cursor: 'pointer', transition: 'all 0.15s',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: spacing.sm,
    }} onClick={onClick}>
      <div>
        <div style={{ ...type.bodyMedium, color: c.text }}>{title}</div>
        <div style={{ ...type.caption, color: c.muted, marginTop: '2px' }}>{subtitle}</div>
      </div>
      <div style={{ ...type.tabletNum, color: priceColor || c.accent, flexShrink: 0 }}>{price}</div>
    </div>
  );
}
