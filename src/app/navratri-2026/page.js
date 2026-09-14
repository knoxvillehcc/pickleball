'use client';
import { useState, useEffect, useCallback } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
const VENUE = { name: 'Hindu Community Center Knoxville', address: '8580 Hickory Creek Rd, Lenoir City, TN' };
const EVENT_SLUG = 'navratri-2026';

const C = {
  bg:       '#0f0d13', card: '#1a1625', border: 'rgba(139,30,63,0.25)',
  primary:  '#FF6B35', secondary: '#8B1E3F', accent: '#FFD700',
  text:     '#F8FAFC', muted: '#94A3B8', green: '#34D399', red: '#EF4444',
  gradient: 'linear-gradient(135deg, #FF6B35, #8B1E3F)',
};

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','Segoe UI',sans-serif" },
  hero: { background: C.gradient, padding: '48px 20px 40px', textAlign: 'center' },
  heroTitle: { fontSize: '36px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' },
  heroSub: { fontSize: '16px', color: 'rgba(255,255,255,0.85)', marginTop: '8px' },
  container: { maxWidth: '600px', margin: '0 auto', padding: '0 16px 80px' },
  section: { background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '24px', marginTop: '24px' },
  sectionTitle: { fontSize: '18px', fontWeight: '800', margin: '0 0 16px', color: C.accent },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: C.muted, marginBottom: '6px' },
  input: { width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: C.gradient, color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  btnOutline: { width: '100%', padding: '14px', borderRadius: '12px', border: `2px solid ${C.primary}`, background: 'transparent', color: C.primary, fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  chip: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  dateRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` },
  stepper: { display: 'flex', alignItems: 'center', gap: '12px' },
  stepBtn: { width: '36px', height: '36px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px 16px', color: C.red, fontSize: '14px', marginTop: '12px' },
  success: { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '12px', padding: '12px 16px', color: C.green, fontSize: '14px', marginTop: '12px' },
  price: { fontSize: '24px', fontWeight: '900', color: C.accent },
  total: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: `2px solid ${C.border}`, marginTop: '16px' },
};

// ── Steps ────────────────────────────────────────────────────────────────────
const STEPS = ['verify', 'select', 'review', 'checkout'];

export default function NavratriPublicPage() {
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
  const [orderType, setOrderType] = useState('daily'); // daily, combo, pioneer_claim
  const [selectedDates, setSelectedDates] = useState({}); // { dateId: qty }
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

        // Check if pioneer/committee already has an existing order
        if (data.membership.existingOrder) {
          setExistingOrder(data.membership.existingOrder);
          setStep('already_claimed');
          return;
        }

        // Pioneer/committee: auto-select free pass and go to review
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

      // Pioneer claim — no Stripe needed
      if (data.type === 'pioneer_claim') {
        window.location.href = `/navratri-2026/success?order=${data.orderNumber}`;
        return;
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch { setError('Checkout failed. Please try again.'); }
    finally { setCheckoutLoading(false); }
  };

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🪔</div>
        <p style={{ color: C.muted }}>Loading Navratri 2026...</p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🪔</div>
        <h1 style={S.heroTitle}>Navratri 2026</h1>
        <p style={S.heroSub}>{VENUE.name}</p>
        <p style={{ ...S.heroSub, fontSize: '14px', opacity: 0.8 }}>{VENUE.address}</p>
        <p style={{ ...S.heroSub, fontSize: '14px', marginTop: '12px' }}>
          Oct 11–20 & Oct 25 • 7:00 PM – 11:00 PM
        </p>
      </div>

      <div style={S.container}>
        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              width: '40px', height: '4px', borderRadius: '2px',
              background: STEPS.indexOf(step) >= i ? C.primary : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {error && <div style={S.error}>⚠️ {error}</div>}

        {/* ── STEP 1: Verify Phone ────────────────────────────────────────── */}
        {step === 'verify' && (
          <div style={S.section}>
            <h2 style={S.sectionTitle}>📱 Verify Your Phone</h2>
            <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 20px' }}>
              Enter your phone number to check membership status and get the best pricing.
            </p>

            <label style={S.label}>Phone Number</label>
            <input style={S.input} type="tel" placeholder="(865) 555-1234" value={phone}
              onChange={e => setPhone(e.target.value)} />

            {!otpSent ? (
              <button style={{ ...S.btn, marginTop: '16px', ...(otpLoading ? S.btnDisabled : {}) }}
                disabled={otpLoading || !phone} onClick={handleSendOTP}>
                {otpLoading ? 'Sending...' : 'Send Verification Code'}
              </button>
            ) : (
              <>
                {devCode && <div style={S.success}>🧪 Dev mode code: <strong>{devCode}</strong></div>}
                <label style={{ ...S.label, marginTop: '16px' }}>Enter 6-digit code</label>
                <input style={{ ...S.input, textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                  type="text" maxLength={6} placeholder="000000" value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} />
                <button style={{ ...S.btn, marginTop: '16px', ...(otpLoading ? S.btnDisabled : {}) }}
                  disabled={otpLoading || otpCode.length !== 6} onClick={handleVerifyOTP}>
                  {otpLoading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </>
            )}

            <button style={{ ...S.btnOutline, marginTop: '12px' }} onClick={handleSkipVerify}>
              Skip — Buy as Non-Member ($30/day)
            </button>
          </div>
        )}

        {/* ── ALREADY CLAIMED ─────────────────────────────────────────── */}
        {step === 'already_claimed' && existingOrder && (
          <div style={S.section}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                {existingOrder.pickedUp ? '✅' : '🎟️'}
              </div>
              <h2 style={{ ...S.sectionTitle, textAlign: 'center' }}>
                {existingOrder.pickedUp ? 'Wristbands Already Picked Up' : 'Pass Already Claimed'}
              </h2>
              <p style={{ color: C.muted, fontSize: '14px', lineHeight: '1.6' }}>
                {existingOrder.pickedUp
                  ? `Your wristbands were picked up on ${new Date(existingOrder.pickedUpAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`
                  : `You already claimed your Pioneer Free Pass (Order: ${existingOrder.orderNumber}).`
                }
              </p>
              {!existingOrder.pickedUp && (
                <p style={{ color: C.accent, fontSize: '14px', fontWeight: '700', marginTop: '12px' }}>
                  📍 Pick up your wristbands at the registration desk on any event day.
                </p>
              )}
              <div style={{ marginTop: '20px' }}>
                <a href={`/navratri-2026/tickets?phone=${encodeURIComponent(phone)}`}
                  style={{ ...S.btn, display: 'inline-block', textDecoration: 'none', padding: '14px 32px', width: 'auto' }}>
                  🎫 View My Tickets
                </a>
              </div>
              <button style={{ ...S.btnOutline, marginTop: '12px' }}
                onClick={() => { setStep('select'); setExistingOrder(null); }}>
                Buy Guest Tickets Instead
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Select Tickets ──────────────────────────────────────── */}
        {step === 'select' && (
          <>
            {/* Membership badge */}
            {membership?.found && (
              <div style={{ ...S.section, background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{membership.name}</div>
                    <div style={{ ...S.chip, background: 'rgba(52,211,153,0.15)', color: C.green, marginTop: '4px' }}>
                      {membership.type === 'pioneer' ? '🏆 Pioneer Member' : '👤 General Member'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket type selector */}
            <div style={S.section}>
              <h2 style={S.sectionTitle}>🎟️ Choose Your Tickets</h2>

              {/* Pioneer free claim */}
              {customerType === 'pioneer' && (
                <div style={{ ...S.dateRow, cursor: 'pointer', borderRadius: '12px', padding: '16px', margin: '0 0 12px',
                  background: orderType === 'pioneer_claim' ? 'rgba(255,215,0,0.1)' : 'transparent',
                  border: `2px solid ${orderType === 'pioneer_claim' ? C.accent : 'transparent'}`,
                }} onClick={() => setOrderType('pioneer_claim')}>
                  <div>
                    <div style={{ fontWeight: '800' }}>🏆 Pioneer Free Pass</div>
                    <div style={{ fontSize: '13px', color: C.muted }}>2 wristbands for all 11 days + parking</div>
                  </div>
                  <div style={S.price}>FREE</div>
                </div>
              )}

              {/* Combo pass */}
              {customerType === 'general' && (
                <div style={{ ...S.dateRow, cursor: 'pointer', borderRadius: '12px', padding: '16px', margin: '0 0 12px',
                  background: orderType === 'combo' ? 'rgba(255,215,0,0.1)' : 'transparent',
                  border: `2px solid ${orderType === 'combo' ? C.accent : 'transparent'}`,
                }} onClick={() => setOrderType('combo')}>
                  <div>
                    <div style={{ fontWeight: '800' }}>🎪 Full Event Pass</div>
                    <div style={{ fontSize: '13px', color: C.muted }}>2 wristbands for all 11 days</div>
                  </div>
                  <div style={S.price}>${((event?.price_combo || 35000) / 100).toFixed(0)}</div>
                </div>
              )}

              {/* Daily tickets */}
              <div style={{ cursor: 'pointer', borderRadius: '12px', padding: '16px',
                background: orderType === 'daily' ? 'rgba(255,107,53,0.1)' : 'transparent',
                border: `2px solid ${orderType === 'daily' ? C.primary : 'transparent'}`,
              }} onClick={() => setOrderType('daily')}>
                <div style={{ fontWeight: '800', marginBottom: '12px' }}>
                  📅 Daily Tickets — ${customerType === 'non_member' ? ((event?.price_nonmember_daily || 3000) / 100) : ((event?.price_general_daily || 2000) / 100)}/person
                </div>

                {orderType === 'daily' && dates.map(d => (
                  <div key={d.id} style={S.dateRow}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{d.label}</div>
                      <div style={{ fontSize: '12px', color: C.muted }}>
                        {new Date(d.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={S.stepper}>
                      <button style={S.stepBtn} onClick={e => { e.stopPropagation(); updateDateQty(d.id, -1); }}>−</button>
                      <span style={{ fontWeight: '800', fontSize: '18px', minWidth: '20px', textAlign: 'center' }}>
                        {selectedDates[d.id] || 0}
                      </span>
                      <button style={S.stepBtn} onClick={e => { e.stopPropagation(); updateDateQty(d.id, 1); }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total & Continue */}
            <div style={S.section}>
              <div style={S.total}>
                <span style={{ fontWeight: '600', color: C.muted }}>Total</span>
                <span style={S.price}>${getTotal().toFixed(2)}</span>
              </div>
              <button style={{ ...S.btn, marginTop: '8px' }}
                disabled={orderType === 'daily' && Object.keys(selectedDates).length === 0}
                onClick={() => setStep('review')}>
                Continue to Review
              </button>
              <button style={{ ...S.btnOutline, marginTop: '8px' }} onClick={() => setStep('verify')}>
                ← Back
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Review & Checkout ───────────────────────────────────── */}
        {step === 'review' && (
          <>
            <div style={S.section}>
              <h2 style={S.sectionTitle}>👤 Your Information</h2>
              <label style={S.label}>Full Name *</label>
              <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />

              <label style={{ ...S.label, marginTop: '16px' }}>Email *</label>
              <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />

              <label style={{ ...S.label, marginTop: '16px' }}>Phone</label>
              <input style={{ ...S.input, background: 'rgba(255,255,255,0.02)' }} value={phone} readOnly />
            </div>

            <div style={S.section}>
              <h2 style={S.sectionTitle}>📋 Order Summary</h2>
              {orderType === 'combo' && (
                <div style={S.dateRow}>
                  <span>🎪 Full Event Pass (2 wristbands, all 11 days)</span>
                  <span style={{ fontWeight: '700' }}>${((event?.price_combo || 35000) / 100).toFixed(2)}</span>
                </div>
              )}
              {orderType === 'pioneer_claim' && (
                <div style={S.dateRow}>
                  <span>🏆 Pioneer Free Pass (2 wristbands + parking)</span>
                  <span style={{ fontWeight: '700', color: C.green }}>FREE</span>
                </div>
              )}
              {orderType === 'daily' && Object.entries(selectedDates).map(([dateId, qty]) => {
                const d = dates.find(dd => dd.id === parseInt(dateId));
                const price = customerType === 'non_member'
                  ? (event?.price_nonmember_daily || 3000) / 100
                  : (event?.price_general_daily || 2000) / 100;
                return (
                  <div key={dateId} style={S.dateRow}>
                    <span>{d?.label} × {qty}</span>
                    <span style={{ fontWeight: '700' }}>${(price * qty).toFixed(2)}</span>
                  </div>
                );
              })}
              <div style={S.total}>
                <span style={{ fontWeight: '800', fontSize: '18px' }}>Total</span>
                <span style={{ ...S.price, fontSize: '28px' }}>${getTotal().toFixed(2)}</span>
              </div>
            </div>

            <div style={S.section}>
              <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: C.primary }} />
                <span style={{ fontSize: '14px', color: C.muted }}>
                  I accept the terms and conditions, including the refund policy (72-hour refund window). *
                </span>
              </label>

              <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', marginTop: '16px' }}>
                <input type="checkbox" checked={consentMarketing} onChange={e => setConsentMarketing(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: C.primary }} />
                <span style={{ fontSize: '14px', color: C.muted }}>
                  I'd like to receive event updates and announcements from HCC.
                </span>
              </label>

              <button style={{ ...S.btn, marginTop: '20px', ...(checkoutLoading || !termsAccepted || !name || !email ? S.btnDisabled : {}) }}
                disabled={checkoutLoading || !termsAccepted || !name || !email}
                onClick={handleCheckout}>
                {checkoutLoading ? 'Processing...' :
                  orderType === 'pioneer_claim' ? '🏆 Claim Your Free Pass' :
                  `💳 Pay $${getTotal().toFixed(2)}`}
              </button>
              <button style={{ ...S.btnOutline, marginTop: '8px' }} onClick={() => setStep('select')}>
                ← Back to Selection
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '32px 0 16px', color: C.muted, fontSize: '12px' }}>
          <p>© 2026 Hindu Community Center Knoxville</p>
          <p>Questions? Contact knoxvillehcc@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
