'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/ClientLayout';

// ── US States ──────────────────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

// ── Categories ─────────────────────────────────────────────────────────────────
const VENDOR_CATEGORIES = [
  { key: 'clothing',    label: 'Traditional Clothing & Apparel', icon: '👗' },
  { key: 'jewelry',     label: 'Jewelry & Accessories',          icon: '💎' },
  { key: 'food',        label: 'Food & Refreshments',             icon: '🍲' },
  { key: 'henna',       label: 'Henna & Beauty',                 icon: '🎨' },
  { key: 'handicrafts', label: 'Handicrafts, Puja & Home Decor',  icon: '🪔' },
  { key: 'services',    label: 'Community Services / Business',   icon: '💼' },
  { key: 'other',       label: 'Other Merchandise',               icon: '🛍️' },
];

// ── Festival Dates ─────────────────────────────────────────────────────────────
const FESTIVAL_DATES = [
  { date: '2026-10-11', dayNum: 1,  name: 'Day 1 — Pratipada',             dayOfWeek: 'Sunday',    isWeekend: false, rate: 201 },
  { date: '2026-10-12', dayNum: 2,  name: 'Day 2 — Dwitiya',               dayOfWeek: 'Monday',    isWeekend: false, rate: 201 },
  { date: '2026-10-13', dayNum: 3,  name: 'Day 3 — Tritiya',               dayOfWeek: 'Tuesday',   isWeekend: false, rate: 201 },
  { date: '2026-10-14', dayNum: 4,  name: 'Day 4 — Chaturthi',             dayOfWeek: 'Wednesday', isWeekend: false, rate: 201 },
  { date: '2026-10-15', dayNum: 5,  name: 'Day 5 — Panchami',              dayOfWeek: 'Thursday',  isWeekend: false, rate: 201 },
  { date: '2026-10-16', dayNum: 6,  name: 'Day 6 — Shashthi (Grand Garba)',dayOfWeek: 'Friday',    isWeekend: true,  rate: 351 },
  { date: '2026-10-17', dayNum: 7,  name: 'Day 7 — Saptami (Grand Garba)', dayOfWeek: 'Saturday',  isWeekend: true,  rate: 351 },
  { date: '2026-10-18', dayNum: 8,  name: 'Day 8 — Ashtami (Dandiya Night)',dayOfWeek: 'Sunday',   isWeekend: false, rate: 201 },
  { date: '2026-10-19', dayNum: 9,  name: 'Day 9 — Navami (Maha Aarti)',   dayOfWeek: 'Monday',    isWeekend: false, rate: 201 },
  { date: '2026-10-20', dayNum: 10, name: 'Day 10 — Vijayadashami',        dayOfWeek: 'Tuesday',   isWeekend: false, rate: 201 },
  { date: '2026-10-25', dayNum: 11, name: 'Special — Sharad Purnima',      dayOfWeek: 'Sunday',    isWeekend: false, rate: 201 },
];

const TERMS_AND_CONDITIONS = `HINDU COMMUNITY CENTER OF KNOXVILLE (HCC)
NAVRATRI 2026 — VENDOR BOOTH RULES & AGREEMENT

1. BOOTH RESERVATIONS & PAYMENT:
All vendor booth reservations must be paid in full at the time of booking via credit/debit card. Spaces are assigned and reserved on a first-come, first-served basis upon receipt of payment.

2. BOOTH PRICING & SLOTS:
Booth pricing is fixed per slot per evening:
• Sunday to Thursday: $201 per booth / night
• Friday & Saturday: $351 per booth / night
Vendors reserving multiple spots will be allocated contiguous space where floor layout allows.

3. SETUP & OPERATING SCHEDULE:
• Setup Window: 5:30 PM to 6:45 PM on each registered event day. All loading doors must be cleared by 6:45 PM.
• Event Hours: 7:00 PM to 11:00 PM.
• Breakdown: Promptly after 11:00 PM. Vendors must pack all materials and clean their designated area each night.

4. CANCELLATION & REFUNDS:
Sponsorship and booth reservation fees are generally non-refundable. Cancellations requested in writing at least 7 days before the registered event date may be granted a partial or full refund at the discretion of the HCC Management Committee. No refunds will be granted for no-shows or same-day cancellations.

5. FOOD & SAFETY REGULATIONS:
Food vendors must comply with Knox County / Tennessee Health Department safety standards and follow HCC vegetarian venue policies (strictly vegetarian food items only; no meat, poultry, or seafood on the premises).

6. CONDUCT & LIABILITY:
The vendor agrees to indemnify, defend, and hold harmless the Knoxville Hindu Community Center, its board of trustees, officers, volunteers, and agents from any claims, damages, liabilities, or injuries arising out of vendor's setup, products, or operations.

By checking the confirmation box below, you certify that you have read, understood, and agreed to adhere to all terms and guidelines outlined above.`;

function NavratriVendorFormContent() {
  const { isDark } = useTheme();
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get('cancelled') === '1';

  // Settings & Capacity State
  const [settings, setSettings] = useState({ is_published: true, default_capacity: 10 });
  const [bookedCounts, setBookedCounts] = useState({});
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'TN',
    zip: '',
    category: 'clothing',
    category_details: '',
    electrical_needed: false,
    special_requests: '',
    disclaimer_accepted: false,
  });

  // Selected Dates: map of { [dateStr]: boothCount }
  const [selectedDates, setSelectedDates] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load live capacities and publish status
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/navratri/vendors/registrations');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setBookedCounts(data.bookedCounts || {});
            if (data.settings) {
              setSettings({
                is_published: data.settings.is_published !== 'false',
                default_capacity: parseInt(data.settings.default_capacity_per_night || '10', 10),
                disabled_dates: JSON.parse(data.settings.disabled_dates || '[]'),
                custom_capacities: JSON.parse(data.settings.custom_capacities || '{}'),
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load vendor configuration:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  // Calculate pricing breakdown
  const pricingSummary = useMemo(() => {
    let weekdayCount = 0;
    let weekendCount = 0;
    let totalBooths = 0;
    let subtotalCents = 0;

    const items = [];

    for (const [dateStr, count] of Object.entries(selectedDates)) {
      if (count <= 0) continue;
      const dateInfo = FESTIVAL_DATES.find(d => d.date === dateStr);
      if (!dateInfo) continue;

      const rate = dateInfo.rate;
      const total = rate * count;
      subtotalCents += total * 100;
      totalBooths += count;

      if (dateInfo.isWeekend) {
        weekendCount += count;
      } else {
        weekdayCount += count;
      }

      items.push({
        date: dateStr,
        name: dateInfo.name,
        dayOfWeek: dateInfo.dayOfWeek,
        isWeekend: dateInfo.isWeekend,
        rate,
        count,
        total,
      });
    }

    return {
      items,
      weekdayCount,
      weekendCount,
      totalBooths,
      totalDollars: subtotalCents / 100,
    };
  }, [selectedDates]);

  // Toggle date selection
  const handleDateToggle = (dateStr) => {
    setSelectedDates(prev => {
      const next = { ...prev };
      if (next[dateStr]) {
        delete next[dateStr];
      } else {
        next[dateStr] = 1; // default 1 booth
      }
      return next;
    });
  };

  // Change booth quantity for a selected date
  const handleBoothCountChange = (dateStr, count) => {
    setSelectedDates(prev => {
      const next = { ...prev };
      const val = Math.max(1, parseInt(count || 1, 10));
      next[dateStr] = val;
      return next;
    });
  };

  // Submit and redirect to Stripe
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (pricingSummary.items.length === 0) {
      setErrorMessage('Please select at least one festival date for your booth reservation.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    if (!formData.disclaimer_accepted) {
      setErrorMessage('Please accept the Navratri Vendor Rules & Agreement terms to proceed.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        selected_dates: pricingSummary.items.map(i => ({
          date: i.date,
          booth_count: i.count,
        })),
      };

      const res = await fetch('/api/navratri/vendors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initialize registration');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received.');
      }
    } catch (err) {
      setErrorMessage(err.message);
      setIsSubmitting(false);
    }
  };

  // Color Tokens
  const saffron = '#FF6B35';
  const gold = '#FFB800';
  const maroon = '#500E2B';
  const cardBg = isDark ? '#161124' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,107,53,0.25)' : '#E2E8F0';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0D0917' : '#F8FAFC';
  const inputBorder = isDark ? '#2D2342' : '#CBD5E1';

  if (!loadingConfig && settings.is_published === false) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', color: textPrimary }}>
        <div style={{ maxWidth: '500px', background: cardBg, padding: '40px', borderRadius: '20px', border: `1px solid ${cardBorder}`, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🪔</div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: saffron, marginBottom: '8px' }}>Vendor Registration Closed</h1>
          <p style={{ color: textMuted, fontSize: '15px', lineHeight: 1.6 }}>
            Navratri 2026 Vendor Booth registrations are currently closed or under maintenance. For inquiries or booth availability, please contact <a href="mailto:knoxvillehcc@gmail.com" style={{ color: gold, fontWeight: '700' }}>knoxvillehcc@gmail.com</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#0B0714' : '#F8FAFC', paddingBottom: '80px', fontFamily: "'Inter', sans-serif" }}>
      {/* Festive Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #3A0D28 0%, #1F0724 60%, #100416 100%)',
        color: '#FFFFFF',
        padding: '50px 20px 40px',
        textAlign: 'center',
        borderBottom: `3px solid ${saffron}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,184,0,0.15)', border: '1px solid rgba(255,184,0,0.3)', padding: '6px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: '800', color: gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>
            🪔 Knoxville Hindu Community Center
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '950', letterSpacing: '-0.5px', margin: '0 0 10px', lineHeight: 1.2 }}>
            Navratri 2026 Vendor Booths
          </h1>
          <p style={{ fontSize: '16px', color: '#CBD5E1', maxWidth: '620px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            Showcase your business, clothing, jewelry, food, or services to over 5,000 community attendees across 11 vibrant festival nights!
          </p>

          {/* Pricing Highlight Pill */}
          <div style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,107,53,0.4)',
            padding: '12px 24px',
            borderRadius: '16px',
            marginTop: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.8px' }}>Sun – Thu:</span>
              <span style={{ fontSize: '20px', fontWeight: '950', color: gold }}>$201</span>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>/ night / booth</span>
            </div>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.8px' }}>Fri & Sat:</span>
              <span style={{ fontSize: '20px', fontWeight: '950', color: saffron }}>$351</span>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>/ night / booth</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '-20px auto 0', padding: '0 16px', position: 'relative', zIndex: 10 }}>
        {wasCancelled && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#EF4444',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span>⚠️</span> Checkout was cancelled. You may adjust your details or selected dates and try again whenever you are ready.
          </div>
        )}

        {errorMessage && (
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#EF4444',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: '700',
          }}>
            ❌ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── STEP 1: BUSINESS & CONTACT INFO ──────────────────────────────────── */}
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '28px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: `1px solid ${cardBorder}`, paddingBottom: '14px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: saffron, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>1</span>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: textPrimary, margin: 0 }}>Business & Contact Information</h2>
                <p style={{ fontSize: '12px', color: textMuted, margin: '2px 0 0' }}>Enter your company information and primary contact details</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  Business / Store Name <span style={{ color: saffron }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SwarnTrendz Boutique"
                  value={formData.business_name}
                  onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  Primary Contact Person <span style={{ color: saffron }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="First and Last Name"
                  value={formData.contact_name}
                  onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  Email Address <span style={{ color: saffron }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  Phone Number <span style={{ color: saffron }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(865) 555-0199"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Address Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Street Address</label>
                <input
                  type="text"
                  placeholder="123 Main St"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>City</label>
                <input
                  type="text"
                  placeholder="Knoxville"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>State</label>
                <select
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                >
                  {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>ZIP</label>
                <input
                  type="text"
                  placeholder="37931"
                  value={formData.zip}
                  onChange={e => setFormData({ ...formData, zip: e.target.value })}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Category selection */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                Vendor Category <span style={{ color: saffron }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {VENDOR_CATEGORIES.map(cat => {
                  const active = formData.category === cat.key;
                  return (
                    <button
                      type="button"
                      key={cat.key}
                      onClick={() => setFormData({ ...formData, category: cat.key })}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: `1.5px solid ${active ? saffron : inputBorder}`,
                        background: active ? (isDark ? 'rgba(255,107,53,0.15)' : '#FFF3EB') : inputBg,
                        color: active ? (isDark ? '#FFF' : saffron) : textPrimary,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: active ? '800' : '600',
                        fontSize: '13px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details & Electrical */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px', alignItems: 'start' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  What items will you be showcasing or selling?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarees, Lehengas, Kundan jewelry, Indian sweets, etc."
                  value={formData.category_details}
                  onChange={e => setFormData({ ...formData, category_details: e.target.value })}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: '10px', border: `1.5px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ paddingTop: '22px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={formData.electrical_needed}
                    onChange={e => setFormData({ ...formData, electrical_needed: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: saffron }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: textPrimary }}>⚡ Electrical outlet needed (110V)</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── STEP 2: DATE & BOOTH SELECTION ───────────────────────────────────── */}
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '28px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: `1px solid ${cardBorder}`, paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: saffron, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>2</span>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '900', color: textPrimary, margin: 0 }}>Select Festival Dates & Booth Quantity</h2>
                  <p style={{ fontSize: '12px', color: textMuted, margin: '2px 0 0' }}>Pick any combination of dates. You can reserve multiple booths per night.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: '700' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: gold }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: gold }} /> Weekday: $201
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: saffron }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: saffron }} /> Weekend: $351
                </span>
              </div>
            </div>

            {/* Interactive Dates Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '14px' }}>
              {FESTIVAL_DATES.map(dateItem => {
                const isSelected = Boolean(selectedDates[dateItem.date]);
                const boothCount = selectedDates[dateItem.date] || 1;
                const currentBooked = bookedCounts[dateItem.date] || 0;
                const capacity = (settings.custom_capacities?.[dateItem.date] !== undefined)
                  ? settings.custom_capacities[dateItem.date]
                  : (settings.default_capacity || 10);
                const isSoldOut = currentBooked >= capacity;
                const isDisabled = (settings.disabled_dates || []).includes(dateItem.date);

                return (
                  <div
                    key={dateItem.date}
                    style={{
                      border: `2px solid ${isSelected ? (dateItem.isWeekend ? saffron : gold) : cardBorder}`,
                      background: isSelected
                        ? (dateItem.isWeekend ? (isDark ? 'rgba(255,107,53,0.12)' : '#FFF3EB') : (isDark ? 'rgba(255,184,0,0.10)' : '#FFFDF0'))
                        : (isDark ? 'rgba(255,255,255,0.02)' : '#FAFCFF'),
                      borderRadius: '16px',
                      padding: '16px',
                      opacity: (isSoldOut || isDisabled) ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            textTransform: 'uppercase',
                            background: dateItem.isWeekend ? 'rgba(255,107,53,0.2)' : 'rgba(255,184,0,0.2)',
                            color: dateItem.isWeekend ? saffron : gold,
                          }}>
                            {dateItem.dayOfWeek}
                          </span>
                          {dateItem.isWeekend && (
                            <span style={{ fontSize: '10px', fontWeight: '800', color: saffron, letterSpacing: '0.5px' }}>★ HIGH ATTENDANCE</span>
                          )}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: textPrimary }}>
                          {dateItem.name}
                        </div>
                        <div style={{ fontSize: '12px', color: textMuted }}>
                          {dateItem.date}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '950', color: dateItem.isWeekend ? saffron : gold, lineHeight: 1 }}>
                          ${dateItem.rate}
                        </div>
                        <div style={{ fontSize: '10px', color: textMuted, marginTop: '2px' }}>/ booth</div>
                      </div>
                    </div>

                    {/* Capacity Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}` }}>
                      <div style={{ fontSize: '11px', color: isSoldOut ? '#EF4444' : textMuted, fontWeight: '700' }}>
                        {isSoldOut ? '🔴 SOLD OUT' : isDisabled ? '⚪ Unavailable' : `Spots: ${Math.max(0, capacity - currentBooked)} remaining`}
                      </div>

                      {!isSoldOut && !isDisabled && (
                        <button
                          type="button"
                          onClick={() => handleDateToggle(dateItem.date)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isSelected ? (dateItem.isWeekend ? saffron : gold) : (isDark ? '#2D2342' : '#E2E8F0'),
                            color: isSelected ? '#FFFFFF' : textPrimary,
                            fontWeight: '800',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSelected ? '✓ Selected' : '+ Select'}
                        </button>
                      )}
                    </div>

                    {/* Booth Count Selector if Selected */}
                    {isSelected && (
                      <div style={{ marginTop: '12px', padding: '10px', background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1'}` }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: textPrimary }}>Booths Needed:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleBoothCountChange(dateItem.date, Math.max(1, boothCount - 1))}
                            style={{ width: '26px', height: '26px', borderRadius: '6px', border: `1px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontWeight: '800', cursor: 'pointer' }}
                          >
                            –
                          </button>
                          <span style={{ fontSize: '14px', fontWeight: '900', color: dateItem.isWeekend ? saffron : gold, minWidth: '20px', textAlign: 'center' }}>
                            {boothCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBoothCountChange(dateItem.date, boothCount + 1)}
                            style={{ width: '26px', height: '26px', borderRadius: '6px', border: `1px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontWeight: '800', cursor: 'pointer' }}
                          >
                            +
                          </button>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: textMuted, marginLeft: '6px' }}>
                            = ${(dateItem.rate * boothCount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pricing Summary Box */}
            <div style={{
              marginTop: '24px',
              padding: '20px 24px',
              borderRadius: '16px',
              background: isDark ? 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,184,0,0.08))' : 'linear-gradient(135deg, #FFF6EE, #FFFDF0)',
              border: `1.5px solid ${saffron}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: saffron, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Reservation Summary
                </div>
                <div style={{ fontSize: '14px', color: textPrimary, marginTop: '4px', fontWeight: '600' }}>
                  {pricingSummary.items.length === 0 ? (
                    <span style={{ color: textMuted }}>No dates selected yet. Click any date above to add.</span>
                  ) : (
                    <span>
                      {pricingSummary.items.length} Event Date(s) · {pricingSummary.totalBooths} Total Booth Slot(s)
                      {pricingSummary.weekdayCount > 0 && ` (${pricingSummary.weekdayCount} weekday @ $201)`}
                      {pricingSummary.weekendCount > 0 && ` (${pricingSummary.weekendCount} weekend @ $351)`}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Amount Due</div>
                <div style={{ fontSize: '32px', fontWeight: '950', color: saffron, lineHeight: 1.1 }}>
                  ${pricingSummary.totalDollars.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ── STEP 3: VENDOR AGREEMENT & TERMS ─────────────────────────────────── */}
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '28px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: `1px solid ${cardBorder}`, paddingBottom: '14px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: saffron, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>3</span>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: textPrimary, margin: 0 }}>Vendor Rules & Agreement Terms</h2>
                <p style={{ fontSize: '12px', color: textMuted, margin: '2px 0 0' }}>Please review the Knoxville Hindu Community Center guidelines</p>
              </div>
            </div>

            <div style={{
              background: inputBg,
              border: `1px solid ${inputBorder}`,
              borderRadius: '12px',
              padding: '16px 20px',
              height: '180px',
              overflowY: 'auto',
              fontSize: '12.5px',
              lineHeight: 1.7,
              color: textMuted,
              whiteSpace: 'pre-wrap',
              marginBottom: '18px',
              fontFamily: 'monospace',
            }}>
              {TERMS_AND_CONDITIONS}
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                required
                checked={formData.disclaimer_accepted}
                onChange={e => setFormData({ ...formData, disclaimer_accepted: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: saffron, marginTop: '2px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13.5px', fontWeight: '700', color: textPrimary, lineHeight: 1.5 }}>
                I have read, understood, and agree to the <strong>Navratri 2026 Vendor Rules & Agreement Terms</strong>, including the vegetarian venue policy, setup timings, and payment terms. <span style={{ color: saffron }}>*</span>
              </span>
            </label>
          </div>

          {/* ── SUBMIT BUTTON ────────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="submit"
              disabled={isSubmitting || pricingSummary.items.length === 0}
              style={{
                background: pricingSummary.items.length === 0 ? '#94A3B8' : `linear-gradient(135deg, ${saffron} 0%, #D4501F 100%)`,
                color: '#FFFFFF',
                border: 'none',
                padding: '18px 48px',
                borderRadius: '16px',
                fontSize: '17px',
                fontWeight: '900',
                cursor: (isSubmitting || pricingSummary.items.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: pricingSummary.items.length === 0 ? 'none' : '0 12px 30px rgba(255,107,53,0.35)',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Processing Checkout…
                </>
              ) : (
                <>
                  🔒 Pay ${pricingSummary.totalDollars.toLocaleString()} with Stripe Checkout →
                </>
              )}
            </button>
            <div style={{ fontSize: '12px', color: textMuted, marginTop: '12px' }}>
              Instant automated confirmation and receipt will be emailed immediately upon successful payment.
            </div>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function NavratriVendorRegistrationPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0B0714', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FF6B35', fontSize: '18px', fontWeight: '800' }}>Loading…</div>
      </div>
    }>
      <NavratriVendorFormContent />
    </Suspense>
  );
}
