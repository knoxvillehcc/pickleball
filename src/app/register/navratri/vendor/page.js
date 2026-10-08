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

// ── Categories (Food & Refreshments removed per requirement) ─────────────────
const VENDOR_CATEGORIES = [
  { key: 'clothing',    label: 'Traditional Clothing & Apparel' },
  { key: 'jewelry',     label: 'Jewelry & Accessories' },
  { key: 'henna',       label: 'Henna & Beauty' },
  { key: 'handicrafts', label: 'Handicrafts, Puja & Home Decor' },
  { key: 'services',    label: 'Community Services / Business' },
  { key: 'other',       label: 'Other Merchandise & Retail' },
];

// ── Festival Dates (13 Dates — Format MM-DD-YYYY) ──────────────────────────────
// Day 8 (10-18-2026) updated to $351 peak rate
const FESTIVAL_DATES = [
  { date: '2026-10-09', dateFormatted: '10-09-2026', dayNum: 'Extra 1', name: 'Extra Day — Pre-Navratri Garba', dayOfWeek: 'Friday',    isWeekend: true,  rate: 351, isPeak: true },
  { date: '2026-10-10', dateFormatted: '10-10-2026', dayNum: 'Extra 2', name: 'Extra Day — Pre-Navratri Garba', dayOfWeek: 'Saturday',  isWeekend: true,  rate: 351, isPeak: true },
  { date: '2026-10-11', dateFormatted: '10-11-2026', dayNum: 1,        name: 'Day 1 — Pratipada',                dayOfWeek: 'Sunday',    isWeekend: false, rate: 201, isPeak: false },
  { date: '2026-10-12', dateFormatted: '10-12-2026', dayNum: 2,        name: 'Day 2 — Dwitiya',                  dayOfWeek: 'Monday',    isWeekend: false, rate: 201, isPeak: false },
  { date: '2026-10-13', dateFormatted: '10-13-2026', dayNum: 3,        name: 'Day 3 — Tritiya',                  dayOfWeek: 'Tuesday',   isWeekend: false, rate: 201, isPeak: false },
  { date: '2026-10-14', dateFormatted: '10-14-2026', dayNum: 4,        name: 'Day 4 — Chaturthi',                dayOfWeek: 'Wednesday', isWeekend: false, rate: 201, isPeak: false },
  { date: '2026-10-15', dateFormatted: '10-15-2026', dayNum: 5,        name: 'Day 5 — Panchami',                 dayOfWeek: 'Thursday',  isWeekend: false, rate: 201, isPeak: false },
  { date: '2026-10-16', dateFormatted: '10-16-2026', dayNum: 6,        name: 'Day 6 — Shashthi',                 dayOfWeek: 'Friday',    isWeekend: true,  rate: 351, isPeak: true },
  { date: '2026-10-17', dateFormatted: '10-17-2026', dayNum: 7,        name: 'Day 7 — Saptami',                  dayOfWeek: 'Saturday',  isWeekend: true,  rate: 351, isPeak: true },
  { date: '2026-10-18', dateFormatted: '10-18-2026', dayNum: 8,        name: 'Day 8 — Ashtami',                  dayOfWeek: 'Sunday',    isWeekend: true,  rate: 351, isPeak: true },
  { date: '2026-10-19', dateFormatted: '10-19-2026', dayNum: 9,        name: 'Day 9 — Navami',                   dayOfWeek: 'Monday',    isWeekend: false, rate: 201, isPeak: false },
  { date: '2026-10-20', dateFormatted: '10-20-2026', dayNum: 10,       name: 'Day 10 — Vijayadashami',           dayOfWeek: 'Tuesday',   isWeekend: false, rate: 201, isPeak: false },
  { date: '2026-10-25', dateFormatted: '10-25-2026', dayNum: 11,       name: 'Special — Sharad Purnima',         dayOfWeek: 'Sunday',    isWeekend: false, rate: 201, isPeak: false },
];

const TERMS_AND_CONDITIONS = `HINDU COMMUNITY CENTER OF KNOXVILLE (HCC)
NAVRATRI 2026 — VENDOR BOOTH RULES & AGREEMENT

1. BOOTH RESERVATIONS & PAYMENT:
All vendor booth reservations must be paid in full at the time of booking via credit/debit card. Spaces are assigned and reserved on a first-come, first-served basis upon receipt of payment.

2. BOOTH PRICING & SLOTS:
Booth pricing per slot per evening:
• Standard Dates (Sun–Thu): $201 per booth / night
• Peak & Weekend Dates (Fridays, Saturdays & Day 8 Ashtami): $351 per booth / night
Vendors reserving multiple spots will be allocated contiguous space where floor layout allows.

3. SETUP & OPERATING SCHEDULE:
• Setup Window: 5:30 PM to 6:45 PM on each registered event day. All loading doors must be cleared by 6:45 PM.
• Event Hours: 7:00 PM to 11:00 PM.
• Breakdown: Promptly after 11:00 PM. Vendors must pack all materials and clean their designated area each night.

4. CANCELLATION & REFUNDS:
Sponsorship and booth reservation fees are generally non-refundable. Cancellations requested in writing at least 7 days before the registered event date may be granted a partial or full refund at the discretion of the HCC Management Committee. No refunds will be granted for no-shows or same-day cancellations.

5. VENUE & SAFETY POLICIES:
All vendors must comply with HCC venue guidelines and vegetarian venue policies (strictly vegetarian venue; no outside meat, poultry, seafood, or unauthorized food stalls permitted on the premises). Knoxville Hindu Community Center reserves the right to review items sold to ensure alignment with community and festival standards.

6. CONDUCT & LIABILITY:
The vendor agrees to indemnify, defend, and hold harmless the Knoxville Hindu Community Center, its board of trustees, officers, volunteers, and agents from any claims, damages, liabilities, or injuries arising out of vendor's setup, products, or operations.

By checking the confirmation box below, you certify that you have read, understood, and agreed to adhere to all terms and guidelines outlined above.`;

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const AlertTriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

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

  // Calculate pricing breakdown: Standard ($201) vs Peak/Weekend ($351)
  const pricingSummary = useMemo(() => {
    let standardCount = 0;
    let peakCount = 0;
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

      if (dateInfo.isPeak || dateInfo.isWeekend || rate === 351) {
        peakCount += count;
      } else {
        standardCount += count;
      }

      items.push({
        date: dateStr,
        dateFormatted: dateInfo.dateFormatted,
        name: dateInfo.name,
        dayOfWeek: dateInfo.dayOfWeek,
        isWeekend: dateInfo.isWeekend,
        isPeak: dateInfo.isPeak,
        rate,
        count,
        total,
      });
    }

    return {
      items,
      standardCount,
      peakCount,
      weekdayCount: standardCount,
      weekendCount: peakCount,
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
        next[dateStr] = 1;
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

  // Submit and redirect to Stripe Checkout
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (pricingSummary.items.length === 0) {
      setErrorMessage('Please select at least one festival date for your booth reservation.');
      const el = document.getElementById('step-dates');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!formData.disclaimer_accepted) {
      setErrorMessage('Please accept the Navratri Vendor Rules & Agreement terms to proceed.');
      const el = document.getElementById('step-terms');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
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
        throw new Error('No checkout URL received from payment gateway.');
      }
    } catch (err) {
      setErrorMessage(err.message);
      setIsSubmitting(false);
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  };

  // Theme Tokens
  const saffron = '#FF6B35';
  const gold = '#FFB800';
  const cardBg = isDark ? '#140F20' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,107,53,0.22)' : '#E2E8F0';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#E2E8F0' : '#334155';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0D0917' : '#F8FAFC';
  const inputBorder = isDark ? '#2D2342' : '#CBD5E1';

  const cutoff = new Date('2026-10-25T23:59:59-04:00').getTime();
  const isPastCutoff = Date.now() > cutoff;

  if (!loadingConfig && (settings.is_published === false || isPastCutoff)) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 18px', textAlign: 'center', color: textPrimary }}>
        <div style={{ maxWidth: '520px', width: '100%', background: cardBg, padding: '44px 28px', borderRadius: '14px', border: `1px solid ${cardBorder}`, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,107,53,0.15)',
            border: `1.5px solid ${saffron}`, margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: saffron,
          }}>
            <CalendarIcon />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: saffron, marginBottom: '10px' }}>Vendor Registration Closed</h1>
          <p style={{ color: textMuted, fontSize: '15px', lineHeight: 1.6 }}>
            {isPastCutoff
              ? 'Navratri 2026 vendor registrations have concluded for this season. Thank you for your support!'
              : 'Navratri 2026 Vendor Booth registrations are currently closed. For inquiries or waitlist questions, please contact our temple management committee.'}
          </p>
          <div style={{ marginTop: '24px', padding: '14px', background: inputBg, borderRadius: '12px', border: `1px solid ${inputBorder}`, fontSize: '14px', color: textPrimary }}>
            Email: <a href="mailto:knoxvillehcc@gmail.com" style={{ color: saffron, fontWeight: '700', textDecoration: 'none' }}>knoxvillehcc@gmail.com</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hcc-vendor-page" style={{ minHeight: '100vh', background: isDark ? '#0A0612' : '#F8FAFC', paddingBottom: '90px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ── Festive Hero Banner ──────────────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #3A0D28 0%, #1F0724 60%, #100416 100%)',
        color: '#FFFFFF',
        padding: '48px 16px 40px',
        textAlign: 'center',
        borderBottom: `3px solid ${saffron}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,184,0,0.14)', border: '1px solid rgba(255,184,0,0.3)',
            padding: '6px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: '700',
            color: gold, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '14px',
          }}>
            Knoxville Hindu Community Center
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 5.5vw, 42px)', fontWeight: '700', letterSpacing: '-0.5px', margin: '0 0 12px', lineHeight: 1.2 }}>
            Navratri 2026 Vendor Booths
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', color: '#E2E8F0', maxWidth: '680px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            Showcase your business, clothing, jewelry, henna, handicrafts, or services to over 5,000 community attendees across all 13 festival dates (Oct 9–20 & Oct 25 Sharad Purnima)!
          </p>

          {/* Pricing Highlight Badges */}
          <div className="hero-pricing-pill">
            <div className="hero-price-segment">
              <span className="hero-price-label">Standard (Sun–Thu):</span>
              <span className="hero-price-val" style={{ color: gold }}>$201</span>
              <span className="hero-price-unit">/ night / booth</span>
            </div>
            <div className="hero-price-divider" />
            <div className="hero-price-segment">
              <span className="hero-price-label">Peak (Fri, Sat & Day 8):</span>
              <span className="hero-price-val" style={{ color: saffron }}>$351</span>
              <span className="hero-price-unit">/ night / booth</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Form Container ──────────────────────────────────────────────── */}
      <main className="form-wrapper">
        {wasCancelled && (
          <div className="alert-box alert-cancelled" role="alert">
            <AlertTriangleIcon />
            <span>Checkout was cancelled. You may adjust your details or selected dates and try again whenever you are ready.</span>
          </div>
        )}

        {errorMessage && (
          <div className="alert-box alert-error" role="alert">
            <AlertTriangleIcon />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── STEP 1: BUSINESS & CONTACT INFO ──────────────────────────────────── */}
          <section className="form-card" aria-labelledby="step-1-title">
            <div className="card-header">
              <span className="step-badge">1</span>
              <div>
                <h2 id="step-1-title" className="card-title">Business & Contact Information</h2>
                <p className="card-subtitle">Enter your company information and primary contact person</p>
              </div>
            </div>

            {/* Contact Information Fields */}
            <div className="grid-2col">
              <div className="field-group">
                <label className="field-label" htmlFor="business_name">
                  Business / Store Name <span className="req">*</span>
                </label>
                <input
                  id="business_name"
                  type="text"
                  required
                  placeholder="e.g. SwarnTrendz Boutique"
                  value={formData.business_name}
                  onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                  className="form-input"
                  autoComplete="organization"
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="contact_name">
                  Primary Contact Person <span className="req">*</span>
                </label>
                <input
                  id="contact_name"
                  type="text"
                  required
                  placeholder="First and Last Name"
                  value={formData.contact_name}
                  onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  className="form-input"
                  autoComplete="name"
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="email">
                  Email Address <span className="req">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  autoComplete="email"
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="phone">
                  Phone Number <span className="req">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  placeholder="(865) 555-0199"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Address Row — Mobile-first responsive breakdown */}
            <div className="address-grid">
              <div className="field-group addr-street">
                <label className="field-label" htmlFor="address">Street Address</label>
                <input
                  id="address"
                  type="text"
                  placeholder="123 Main St"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="form-input"
                  autoComplete="street-address"
                />
              </div>
              <div className="field-group addr-city">
                <label className="field-label" htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  placeholder="Knoxville"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="form-input"
                  autoComplete="address-level2"
                />
              </div>
              <div className="field-group addr-state">
                <label className="field-label" htmlFor="state">State</label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="form-input form-select"
                  autoComplete="address-level1"
                >
                  {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div className="field-group addr-zip">
                <label className="field-label" htmlFor="zip">ZIP</label>
                <input
                  id="zip"
                  type="text"
                  placeholder="37931"
                  value={formData.zip}
                  onChange={e => setFormData({ ...formData, zip: e.target.value })}
                  className="form-input"
                  autoComplete="postal-code"
                />
              </div>
            </div>

            {/* Category selection */}
            <div className="field-group" style={{ marginBottom: '20px' }}>
              <label className="field-label">
                Vendor Category <span className="req">*</span>
              </label>
              <div className="category-grid" role="radiogroup" aria-label="Vendor Category">
                {VENDOR_CATEGORIES.map(cat => {
                  const active = formData.category === cat.key;
                  return (
                    <button
                      type="button"
                      key={cat.key}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFormData({ ...formData, category: cat.key })}
                      className={`cat-btn ${active ? 'active' : ''}`}
                    >
                      <span className={`cat-dot ${active ? 'active' : ''}`} />
                      <span className="cat-text">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details & Electrical Checkbox */}
            <div className="details-grid">
              <div className="field-group">
                <label className="field-label" htmlFor="category_details">
                  What items will you be showcasing or selling?
                </label>
                <input
                  id="category_details"
                  type="text"
                  placeholder="e.g. Sarees, Lehengas, Kundan jewelry, handicrafts, home decor, etc."
                  value={formData.category_details}
                  onChange={e => setFormData({ ...formData, category_details: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="field-group">
                <label className="field-label">&nbsp;</label>
                <label className="electrical-card">
                  <input
                    type="checkbox"
                    checked={formData.electrical_needed}
                    onChange={e => setFormData({ ...formData, electrical_needed: e.target.checked })}
                    className="custom-checkbox"
                  />
                  <span className="electrical-label">
                    Electrical outlet required (110V Standard)
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* ── STEP 2: DATE & BOOTH SELECTION ───────────────────────────────────── */}
          <section id="step-dates" className="form-card" aria-labelledby="step-2-title">
            <div className="card-header card-header-split">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="step-badge">2</span>
                <div>
                  <h2 id="step-2-title" className="card-title">Select Festival Dates & Booth Quantity</h2>
                  <p className="card-subtitle">Pick any combination of dates. You can reserve multiple booths per night.</p>
                </div>
              </div>
              <div className="rates-legend">
                <span className="legend-item" style={{ color: gold }}>
                  <span className="legend-dot" style={{ background: gold }} /> Standard: $201
                </span>
                <span className="legend-item" style={{ color: saffron }}>
                  <span className="legend-dot" style={{ background: saffron }} /> Peak / Weekend: $351
                </span>
              </div>
            </div>

            {/* Interactive Dates Grid */}
            <div className="dates-grid">
              {FESTIVAL_DATES.map(dateItem => {
                const isSelected = Boolean(selectedDates[dateItem.date]);
                const boothCount = selectedDates[dateItem.date] || 1;
                const currentBooked = bookedCounts[dateItem.date] || 0;
                const capacity = (settings.custom_capacities?.[dateItem.date] !== undefined)
                  ? settings.custom_capacities[dateItem.date]
                  : (settings.default_capacity || 10);
                const isSoldOut = currentBooked >= capacity;
                const isDisabled = (settings.disabled_dates || []).includes(dateItem.date);
                const isPeakNight = dateItem.isPeak || dateItem.isWeekend || dateItem.rate === 351;

                return (
                  <div
                    key={dateItem.date}
                    className={`date-card ${isSelected ? 'selected' : ''} ${isPeakNight ? 'peak' : 'standard'} ${(isSoldOut || isDisabled) ? 'disabled' : ''}`}
                  >
                    <div className="date-card-top">
                      <div>
                        <div className="date-tags">
                          <span className={`day-tag ${isPeakNight ? 'tag-peak' : 'tag-standard'}`}>
                            {dateItem.dayOfWeek}
                          </span>
                          {isPeakNight && (
                            <span className="peak-banner-tag">
                              PEAK ATTENDANCE
                            </span>
                          )}
                        </div>
                        <div className="date-name">{dateItem.name}</div>
                        <div className="date-sub">
                          <span className="date-formatted-text">{dateItem.dateFormatted}</span>
                        </div>
                      </div>

                      <div className="date-rate-box">
                        <div className="date-price" style={{ color: isPeakNight ? saffron : gold }}>
                          ${dateItem.rate}
                        </div>
                        <div className="date-unit">/ booth</div>
                      </div>
                    </div>

                    {/* Capacity & Action Row */}
                    <div className="date-card-footer">
                      <div className="capacity-pill">
                        {isSoldOut ? (
                          <span className="badge-soldout">Sold Out</span>
                        ) : isDisabled ? (
                          <span className="badge-disabled">Unavailable</span>
                        ) : (
                          <span className="spots-left">{Math.max(0, capacity - currentBooked)} spots left</span>
                        )}
                      </div>

                      {!isSoldOut && !isDisabled && (
                        <button
                          type="button"
                          onClick={() => handleDateToggle(dateItem.date)}
                          className={`date-select-btn ${isSelected ? 'btn-selected' : ''}`}
                          style={{
                            background: isSelected ? (isPeakNight ? saffron : gold) : 'transparent',
                            color: isSelected ? '#FFFFFF' : textPrimary,
                            border: isSelected ? 'none' : `1.5px solid ${inputBorder}`,
                          }}
                        >
                          {isSelected ? (
                            <>
                              <CheckIcon />
                              <span>Selected</span>
                            </>
                          ) : (
                            'Select'
                          )}
                        </button>
                      )}
                    </div>

                    {/* Booth Count Stepper if Selected */}
                    {isSelected && (
                      <div className="booth-stepper-box">
                        <span className="stepper-label">Booths Needed:</span>
                        <div className="stepper-controls">
                          <button
                            type="button"
                            aria-label={`Decrease booth count for ${dateItem.name}`}
                            onClick={() => handleBoothCountChange(dateItem.date, Math.max(1, boothCount - 1))}
                            className="stepper-btn"
                          >
                            –
                          </button>
                          <span className="stepper-count" style={{ color: isPeakNight ? saffron : gold }}>
                            {boothCount}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase booth count for ${dateItem.name}`}
                            onClick={() => handleBoothCountChange(dateItem.date, boothCount + 1)}
                            className="stepper-btn"
                          >
                            +
                          </button>
                          <span className="stepper-total">
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
            <div className="summary-banner">
              <div className="summary-info">
                <div className="summary-title">Reservation Summary</div>
                <div className="summary-desc">
                  {pricingSummary.items.length === 0 ? (
                    <span style={{ color: textMuted }}>No dates selected yet. Tap any date above to add.</span>
                  ) : (
                    <span>
                      <strong>{pricingSummary.items.length} Event Date(s)</strong> · {pricingSummary.totalBooths} Total Booth Slot(s)
                      {pricingSummary.standardCount > 0 && ` (${pricingSummary.standardCount} Standard @ $201)`}
                      {pricingSummary.peakCount > 0 && ` (${pricingSummary.peakCount} Peak / Weekend @ $351)`}
                    </span>
                  )}
                </div>
              </div>

              <div className="summary-amount-box">
                <div className="summary-amount-label">Total Amount Due</div>
                <div className="summary-total-val" style={{ color: saffron }}>
                  ${pricingSummary.totalDollars.toLocaleString()}
                </div>
              </div>
            </div>
          </section>

          {/* ── STEP 3: VENDOR AGREEMENT & TERMS ─────────────────────────────────── */}
          <section id="step-terms" className="form-card" aria-labelledby="step-3-title">
            <div className="card-header">
              <span className="step-badge">3</span>
              <div>
                <h2 id="step-3-title" className="card-title">Vendor Rules & Agreement Terms</h2>
                <p className="card-subtitle">Please review the Knoxville Hindu Community Center guidelines</p>
              </div>
            </div>

            <div className="terms-scrollbox" tabIndex={0} aria-label="Vendor Rules and Terms of Agreement">
              {TERMS_AND_CONDITIONS}
            </div>

            <label className="terms-checkbox-label">
              <input
                type="checkbox"
                required
                checked={formData.disclaimer_accepted}
                onChange={e => setFormData({ ...formData, disclaimer_accepted: e.target.checked })}
                className="custom-checkbox checkbox-large"
              />
              <span className="terms-checkbox-text">
                I have read, understood, and agree to the <strong>Navratri 2026 Vendor Rules & Agreement Terms</strong>, including the strictly vegetarian venue policy, operating schedule, and payment terms. <span className="req">*</span>
              </span>
            </label>
          </section>

          {/* ── SUBMIT / CHECKOUT ACTION ────────────────────────────────────────── */}
          <div className="submit-container">
            <button
              type="submit"
              disabled={isSubmitting || pricingSummary.items.length === 0}
              className={`submit-btn ${pricingSummary.items.length === 0 ? 'btn-disabled' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  <span>Connecting to Stripe Checkout…</span>
                </>
              ) : (
                <>
                  <LockIcon />
                  <span>Pay ${pricingSummary.totalDollars.toLocaleString()} with Stripe Checkout →</span>
                </>
              )}
            </button>
            <p className="submit-helper">
              Instant automated confirmation and PDF receipt will be emailed immediately upon successful card payment.
            </p>
          </div>
        </form>
      </main>

      {/* ── Responsive Mobile-First CSS Stylesheet ────────────────────────────── */}
      <style jsx>{`
        /* Container */
        .form-wrapper {
          max-width: 980px;
          margin: -24px auto 0;
          padding: 0 16px;
          position: relative;
          z-index: 10;
        }

        /* Hero Pill */
        .hero-pricing-pill {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 107, 53, 0.4);
          padding: 12px 24px;
          border-radius: 16px;
          margin-top: 8px;
        }
        .hero-price-segment {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hero-price-label {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          color: #CBD5E1;
          letter-spacing: 0.8px;
        }
        .hero-price-val {
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
        }
        .hero-price-unit {
          font-size: 12px;
          color: #94A3B8;
        }
        .hero-price-divider {
          width: 1px;
          height: 22px;
          background: rgba(255, 255, 255, 0.2);
        }

        /* Alerts */
        .alert-box {
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          line-height: 1.5;
        }
        .alert-cancelled {
          background: rgba(245, 158, 11, 0.12);
          border: 1.5px solid rgba(245, 158, 11, 0.4);
          color: #D97706;
        }
        .alert-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1.5px solid rgba(239, 68, 68, 0.4);
          color: #EF4444;
        }

        /* Cards */
        .form-card {
          background: ${cardBg};
          border: 1px solid ${cardBorder};
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
          border-bottom: 1px solid ${cardBorder};
          padding-bottom: 16px;
        }
        .card-header-split {
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .step-badge {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${saffron};
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 15px;
          flex-shrink: 0;
        }
        .card-title {
          font-size: 18px;
          font-weight: 900;
          color: ${textPrimary};
          margin: 0;
          letter-spacing: -0.3px;
        }
        .card-subtitle {
          font-size: 13px;
          color: ${textMuted};
          margin: 3px 0 0;
        }

        /* Legend */
        .rates-legend {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          font-weight: 800;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Form Inputs */
        .grid-2col {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          margin-bottom: 18px;
        }
        .field-group {
          display: flex;
          flex-direction: column;
        }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: ${textSecondary};
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 7px;
        }
        .req {
          color: ${saffron};
          font-weight: 900;
        }
        .form-input {
          width: 100%;
          /* 16px on mobile prevents iOS Safari automatic viewport zooming */
          font-size: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1.5px solid ${inputBorder};
          background: ${inputBg};
          color: ${textPrimary};
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          min-height: 48px;
        }
        .form-input:focus {
          outline: none;
          border-color: ${saffron};
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.18);
        }
        .form-select {
          cursor: pointer;
        }

        /* Address Grid */
        .address-grid {
          display: grid;
          grid-template-columns: 2fr 1.2fr 0.8fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }

        /* Category Grid */
        .category-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .cat-btn {
          min-height: 48px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid ${inputBorder};
          background: ${inputBg};
          color: ${textPrimary};
          cursor: pointer;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 13.5px;
          transition: all 0.15s ease;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }
        .cat-btn.active {
          border-color: ${saffron};
          background: ${isDark ? 'rgba(255,107,53,0.16)' : '#FFF3EB'};
          color: ${isDark ? '#FFFFFF' : saffron};
        }
        .cat-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isDark ? '#6B7280' : '#CBD5E1'};
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .cat-dot.active {
          background: ${saffron};
          box-shadow: 0 0 8px rgba(255, 107, 53, 0.6);
        }
        .cat-text {
          line-height: 1.3;
        }

        /* Details & Electrical Grid */
        .details-grid {
          display: grid;
          grid-template-columns: 2fr 1.2fr;
          gap: 18px;
          align-items: flex-end;
        }
        .electrical-card {
          min-height: 48px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid ${inputBorder};
          background: ${inputBg};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          box-sizing: border-box;
          user-select: none;
          transition: border-color 0.15s ease;
        }
        .electrical-card:hover {
          border-color: ${saffron};
        }
        .electrical-label {
          font-size: 13.5px;
          font-weight: 700;
          color: ${textPrimary};
          line-height: 1.3;
        }

        /* Dates Grid */
        .dates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .date-card {
          border: 2px solid ${cardBorder};
          background: ${isDark ? 'rgba(255,255,255,0.02)' : '#FAFCFF'};
          border-radius: 16px;
          padding: 16px;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .date-card.standard.selected {
          border-color: ${gold};
          background: ${isDark ? 'rgba(255,184,0,0.10)' : '#FFFDF0'};
        }
        .date-card.peak.selected {
          border-color: ${saffron};
          background: ${isDark ? 'rgba(255,107,53,0.12)' : '#FFF3EB'};
        }
        .date-card.disabled {
          opacity: 0.55;
        }
        .date-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 10px;
        }
        .date-tags {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 4px;
        }
        .day-tag {
          font-size: 10px;
          font-weight: 900;
          padding: 2px 8px;
          border-radius: 99px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .tag-standard {
          background: rgba(255, 184, 0, 0.18);
          color: ${gold};
        }
        .tag-peak {
          background: rgba(255, 107, 53, 0.2);
          color: ${saffron};
        }
        .peak-banner-tag {
          font-size: 10px;
          font-weight: 900;
          color: ${saffron};
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .date-name {
          font-size: 15px;
          font-weight: 900;
          color: ${textPrimary};
          line-height: 1.3;
        }
        .date-sub {
          font-size: 12px;
          color: ${textMuted};
          font-weight: 700;
          margin-top: 3px;
        }
        .date-formatted-text {
          font-family: monospace;
          letter-spacing: 0.5px;
        }
        .date-rate-box {
          text-align: right;
          flex-shrink: 0;
        }
        .date-price {
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
        }
        .date-unit {
          font-size: 10px;
          color: ${textMuted};
          margin-top: 2px;
        }

        /* Date Footer */
        .date-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'};
        }
        .spots-left {
          font-size: 12px;
          font-weight: 700;
          color: ${textMuted};
        }
        .badge-soldout {
          color: #EF4444;
          background: rgba(239, 68, 68, 0.12);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
        }
        .badge-disabled {
          color: #94A3B8;
          background: rgba(148, 163, 184, 0.12);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
        }
        .date-select-btn {
          min-height: 38px;
          padding: 7px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        /* Booth Stepper */
        .booth-stepper-box {
          margin-top: 12px;
          padding: 10px 12px;
          background: ${isDark ? 'rgba(0,0,0,0.35)' : '#FFFFFF'};
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1'};
        }
        .stepper-label {
          font-size: 12px;
          font-weight: 800;
          color: ${textPrimary};
        }
        .stepper-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stepper-btn {
          min-width: 36px;
          min-height: 36px;
          border-radius: 8px;
          border: 1.5px solid ${inputBorder};
          background: ${inputBg};
          color: ${textPrimary};
          font-weight: 900;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s ease;
          font-family: inherit;
        }
        .stepper-btn:active {
          transform: scale(0.92);
        }
        .stepper-count {
          font-size: 16px;
          font-weight: 950;
          min-width: 22px;
          text-align: center;
        }
        .stepper-total {
          font-size: 13px;
          font-weight: 800;
          color: ${textMuted};
          margin-left: 6px;
        }

        /* Summary Banner */
        .summary-banner {
          margin-top: 24px;
          padding: 22px 24px;
          border-radius: 18px;
          background: ${isDark ? 'linear-gradient(135deg, rgba(255,107,53,0.14), rgba(255,184,0,0.10))' : 'linear-gradient(135deg, #FFF6EE, #FFFDF0)'};
          border: 1.5px solid ${saffron};
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .summary-title {
          font-size: 12px;
          font-weight: 900;
          color: ${saffron};
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .summary-desc {
          font-size: 14.5px;
          color: ${textPrimary};
          margin-top: 4px;
          line-height: 1.5;
        }
        .summary-amount-box {
          text-align: right;
        }
        .summary-amount-label {
          font-size: 11px;
          font-weight: 800;
          color: ${textMuted};
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .summary-total-val {
          font-size: 34px;
          font-weight: 950;
          line-height: 1.1;
        }

        /* Terms & Conditions */
        .terms-scrollbox {
          background: ${inputBg};
          border: 1.5px solid ${inputBorder};
          border-radius: 12px;
          padding: 16px 18px;
          height: 190px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          font-size: 13px;
          line-height: 1.7;
          color: ${textSecondary};
          white-space: pre-wrap;
          margin-bottom: 20px;
          font-family: inherit;
        }
        .terms-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }
        .terms-checkbox-text {
          font-size: 14px;
          font-weight: 600;
          color: ${textPrimary};
          line-height: 1.5;
        }

        /* Checkbox styling */
        .custom-checkbox {
          width: 20px;
          height: 20px;
          accent-color: ${saffron};
          flex-shrink: 0;
          cursor: pointer;
        }
        .checkbox-large {
          width: 22px;
          height: 22px;
          margin-top: 2px;
        }

        /* Submit Button */
        .submit-container {
          text-align: center;
          margin-top: 8px;
        }
        .submit-btn {
          width: 100%;
          max-width: 480px;
          min-height: 56px;
          padding: 16px 36px;
          border-radius: 16px;
          font-size: 17px;
          font-weight: 900;
          background: linear-gradient(135deg, ${saffron} 0%, #D4501F 100%);
          color: #FFFFFF;
          border: none;
          box-shadow: 0 12px 30px rgba(255, 107, 53, 0.35);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 16px 36px rgba(255, 107, 53, 0.45);
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-disabled {
          background: #94A3B8 !important;
          box-shadow: none !important;
          cursor: not-allowed !important;
        }
        .submit-helper {
          font-size: 13px;
          color: ${textMuted};
          margin-top: 14px;
        }

        /* Spinner animation */
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── iPad & Tablet Media Queries (641px – 1024px) ─────────────────────── */
        @media (max-width: 1024px) {
          .category-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .details-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .address-grid {
            grid-template-columns: 1fr 1fr;
          }
          .addr-street {
            grid-column: span 2;
          }
        }

        /* ── iPhone & Mobile Media Queries (<= 640px) ────────────────────────── */
        @media (max-width: 640px) {
          .form-wrapper {
            padding: 0 12px;
            margin-top: -16px;
          }
          .form-card {
            padding: 18px 14px;
            border-radius: 16px;
            margin-bottom: 16px;
          }
          .card-header {
            margin-bottom: 16px;
            padding-bottom: 12px;
          }
          .card-title {
            font-size: 16.5px;
          }
          .card-subtitle {
            font-size: 12px;
          }
          .grid-2col {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .address-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .addr-street {
            grid-column: span 1;
          }
          .category-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .cat-btn {
            font-size: 13px;
            min-height: 48px;
            padding: 10px 12px;
          }
          .dates-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .date-card {
            padding: 14px;
          }
          .stepper-btn {
            min-width: 40px;
            min-height: 40px;
          }
          .hero-pricing-pill {
            flex-direction: column;
            gap: 8px;
            padding: 12px 18px;
          }
          .hero-price-divider {
            display: none;
          }
          .rates-legend {
            width: 100%;
            justify-content: flex-start;
            gap: 12px;
            font-size: 11px;
          }
          .summary-banner {
            padding: 16px;
            flex-direction: column;
            align-items: flex-start;
          }
          .summary-amount-box {
            width: 100%;
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            border-top: 1px solid rgba(255, 107, 53, 0.25);
            padding-top: 12px;
            margin-top: 4px;
          }
          .summary-total-val {
            font-size: 28px;
          }
          .terms-scrollbox {
            height: 160px;
            font-size: 12.5px;
            padding: 14px;
          }
          .submit-btn {
            max-width: 100%;
            font-size: 16px;
            padding: 16px 20px;
          }
        }
      `}</style>
    </div>
  );
}

export default function NavratriVendorRegistrationPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0B0714', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FF6B35', fontSize: '18px', fontWeight: '700' }}>Loading…</div>
      </div>
    }>
      <NavratriVendorFormContent />
    </Suspense>
  );
}
