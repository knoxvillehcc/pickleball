'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ── US States ──────────────────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

// ── Space tiers ────────────────────────────────────────────────────────────────
const SPACES = [
  {
    key:   'small',
    label: 'Small',
    size:  '10 × 10 ft',
    price: '$100',
    cents: 10000,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1" opacity="0.3"/>
        <rect x="3" y="14" width="7" height="7" rx="1" opacity="0.3"/>
        <rect x="14" y="14" width="7" height="7" rx="1" opacity="0.3"/>
      </svg>
    ),
    perks: ['Standard booth space', 'One 6 ft table', 'Two chairs', 'Power access'],
  },
  {
    key:   'medium',
    label: 'Medium',
    size:  '10 × 20 ft',
    price: '$150',
    cents: 15000,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1" opacity="0.3"/>
        <rect x="14" y="14" width="7" height="7" rx="1" opacity="0.3"/>
      </svg>
    ),
    perks: ['Double booth space', 'Two 6 ft tables', 'Four chairs', 'Power access', 'Premium visibility'],
  },
  {
    key:   'large',
    label: 'Large',
    size:  '20 × 20 ft',
    price: '$200',
    cents: 20000,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    perks: ['Corner/premium location', 'Three 6 ft tables', 'Six chairs', 'Dedicated power', 'Max brand exposure'],
  },
];

// ── Disclaimer text ────────────────────────────────────────────────────────────
const DISCLAIMER_TEXT = `VENDOR AGREEMENT & DISCLAIMER — INDIA FEST 2026

1. SPACE ASSIGNMENT: Booth spaces are assigned by the Knoxville Hindu Community Center (HCC) at their sole discretion. Space assignments will be communicated prior to the event. HCC reserves the right to relocate vendors if necessary.

2. PAYMENT & REFUND POLICY: All registration fees are non-refundable once payment is processed. In the event of cancellation by HCC due to circumstances beyond its control (weather, venue issues, etc.), HCC will issue a full credit toward a future event. No cash refunds will be issued.

3. SETUP & BREAKDOWN: Vendors are responsible for the setup and teardown of their own display within their assigned space. Vendors must be fully set up 30 minutes before the event opens and must not begin teardown until the event officially closes.

4. VENDOR CONDUCT: All vendors and their staff are expected to maintain professional, courteous conduct throughout the event. HCC reserves the right to ask any vendor to leave the event if their conduct is deemed inappropriate or disruptive, without refund.

5. SALES & PERMITS: Vendors are solely responsible for obtaining any and all permits, licenses, and approvals required by local, state, or federal law to conduct their business at the event. HCC assumes no liability for failure to comply.

6. FOOD VENDORS: Food vendors must comply with all applicable health department regulations. Any vendor selling food items must present valid food handler certification upon request.

7. INSURANCE: Vendors participate at their own risk. HCC, its officers, volunteers, and agents are not liable for theft, loss, or damage to vendor property. Vendors are encouraged to carry their own insurance.

8. ELECTRICITY & UTILITIES: Power access is included with your booth. Vendors requiring additional or specialized electrical connections must notify HCC in advance. HCC is not responsible for power outages.

9. MEDIA & PHOTOGRAPHY: By participating, vendors consent to HCC and its authorized photographers capturing images and video of their booth and products for promotional use across digital and print media.

10. COMPLIANCE: Vendors must comply with all event rules and regulations communicated by HCC staff. HCC reserves the right to modify event rules at any time. Registered vendors will be notified of any material changes.

11. INDEMNIFICATION: Vendor agrees to indemnify, defend, and hold harmless the Knoxville Hindu Community Center, its board members, volunteers, employees, and agents from any claims, damages, liabilities, or expenses arising out of or related to vendor's participation in India Fest 2026.

By checking the box below, you acknowledge that you have read, understood, and agree to all terms and conditions set forth in this Vendor Agreement & Disclaimer.`;

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  bg:       '#060A18',
  bgMid:    '#0A0F22',
  card:     'rgba(10,15,35,0.9)',
  saffron:  '#FF9933',
  saffDark: '#E07C1A',
  gold:     '#FFD700',
  white:    '#FFFFFF',
  light:    '#E8E0D0',
  muted:    '#7A7090',
  green:    '#22C55E',
};

// ── Field component ────────────────────────────────────────────────────────────
function Field({ label, required, hint, type = 'text', value, onChange, placeholder, children, as = 'input' }) {
  const [focused, setFocused] = useState(false);
  const base = {
    width: '100%', padding: '13px 16px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)',
    border: `1.5px solid ${focused ? T.saffron : 'rgba(255,255,255,0.1)'}`,
    color: T.white, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    boxShadow: focused ? `0 0 0 3px rgba(255,153,51,0.12)` : 'none',
    transition: 'all 0.2s',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {label}{required && <span style={{ color: T.saffron, marginLeft: '3px' }}>*</span>}
        </label>
      )}
      {as === 'select'
        ? <select value={value} onChange={onChange} style={{ ...base, cursor: 'pointer', appearance: 'none' }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>{children}</select>
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
            style={base} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
      {hint && <span style={{ fontSize: '11px', color: T.muted }}>{hint}</span>}
    </div>
  );
}

// ── Card component ─────────────────────────────────────────────────────────────
function Card({ title, icon, children, accent = T.saffron }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${accent}22`, borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', gap: '12px', background: `${accent}08` }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${accent}20`, border: `1px solid ${accent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>{icon}</div>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: T.white, letterSpacing: '0.2px' }}>{title}</h2>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}

// ── Space tile ─────────────────────────────────────────────────────────────────
function SpaceTile({ space, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '20px 14px', borderRadius: '16px', cursor: 'pointer', textAlign: 'center',
      border: `2px solid ${selected ? T.saffron : 'rgba(255,255,255,0.08)'}`,
      background: selected ? `rgba(255,153,51,0.10)` : 'rgba(255,255,255,0.03)',
      boxShadow: selected ? `0 0 24px rgba(255,153,51,0.20)` : 'none',
      transition: 'all 0.2s', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', minWidth: 0,
    }}>
      <div style={{ color: selected ? T.saffron : T.muted, transition: 'color 0.2s' }}>{space.icon}</div>
      <div style={{ fontSize: '15px', fontWeight: '900', color: selected ? T.saffron : T.light }}>{space.label}</div>
      <div style={{ fontSize: '11px', color: T.muted }}>{space.size}</div>
      <div style={{
        fontSize: '22px', fontWeight: '900', color: selected ? T.gold : T.white,
        background: selected ? `rgba(255,215,0,0.10)` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${selected ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '10px', padding: '6px 16px',
      }}>{space.price}</div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', textAlign: 'left', width: '100%' }}>
        {space.perks.map((p, i) => (
          <li key={i} style={{ fontSize: '11px', color: selected ? T.light : T.muted, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ color: selected ? T.saffron : T.muted, fontWeight: '700' }}>✓</span> {p}
          </li>
        ))}
      </ul>
    </button>
  );
}

// ── Main form content (needs useSearchParams) ──────────────────────────────────
function VendorFormContent() {
  const searchParams  = useSearchParams();
  const cancelled     = searchParams.get('cancelled') === '1';

  const [form, setForm] = useState({
    first_name: '', last_name: '', company_name: '',
    email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    space_type: 'medium',
    disclaimer_accepted: false,
  });
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [mounted,       setMounted]       = useState(false);
  const [publishStatus, setPublishStatus] = useState('loading'); // 'loading' | 'open' | 'closed'

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
    fetch('/api/indiafest/settings?key=is_published', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setPublishStatus((d.is_published === true || d.value === 'true') ? 'open' : 'closed'))
      .catch(() => setPublishStatus('closed'));
  }, []);

  // ── Registration closed screen ──────────────────────────────────────────────
  if (publishStatus === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#060A18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: '#FF9933', fontSize: '18px' }}>Loading…</div>
      </div>
    );
  }

  if (publishStatus === 'closed') {
    return (
      <div style={{ minHeight: '100vh', background: '#060A18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.3)', padding: '6px 18px', borderRadius: '20px', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px' }}>🇮🇳</span>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#FF9933', letterSpacing: '2px', textTransform: 'uppercase' }}>Knoxville Hindu Community Center</span>
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: '36px', fontWeight: '900', color: '#FFFFFF' }}>India Fest 2026</h1>
          <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '700', color: '#FF9933' }}>Vendor Registration Closed</h2>
          <p style={{ color: '#7A7090', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
            Vendor registration for India Fest 2026 is not currently open.<br/>
            Please check back later or contact us at{' '}
            <a href="mailto:knoxvillehcc@gmail.com" style={{ color: '#FF9933', textDecoration: 'none', fontWeight: '700' }}>knoxvillehcc@gmail.com</a>
          </p>
        </div>
      </div>
    );
  }


  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const selectedSpace = SPACES.find(s => s.key === form.space_type);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.disclaimer_accepted) {
      setError('You must read and accept the Vendor Disclaimer before proceeding.');
      return;
    }
    if (!form.space_type) {
      setError('Please select a booth space size.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/indiafest/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError('Network error — please check your connection and try again.');
      setLoading(false);
    }
  }

  const inputRow = (style = {}) => ({ display: 'grid', gap: '16px', ...style });

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: T.white,
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Decorative background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '70vw', height: '70vw', maxWidth: '800px', maxHeight: '800px', background: `radial-gradient(circle, rgba(255,153,51,0.06), transparent 60%)`, borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '50vw', height: '50vw', maxWidth: '600px', maxHeight: '600px', background: `radial-gradient(circle, rgba(255,215,0,0.04), transparent 60%)`, borderRadius: '50%' }}/>
        {/* Mandala-like decorative ring */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '120vw', height: '120vw', maxWidth: '1400px', maxHeight: '1400px', border: '1px solid rgba(255,153,51,0.03)', borderRadius: '50%', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '90vw', height: '90vw', maxWidth: '1100px', maxHeight: '1100px', border: '1px solid rgba(255,215,0,0.02)', borderRadius: '50%' }}/>
      </div>

      {/* India flag color bar */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)', position: 'relative', zIndex: 1 }}/>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px', margin: '0 auto', padding: '48px 20px 80px' }}>

        {/* ── Hero header ── */}
        <div style={{
          textAlign: 'center', marginBottom: '48px',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-16px)',
          transition: 'all 0.5s ease',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.3)', padding: '6px 18px', borderRadius: '20px', marginBottom: '20px' }}>
            <span style={{ fontSize: '16px' }}>🇮🇳</span>
            <span style={{ fontSize: '12px', fontWeight: '800', color: T.saffron, letterSpacing: '2px', textTransform: 'uppercase' }}>Knoxville Hindu Community Center</span>
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: '900', letterSpacing: '-2px', lineHeight: 0.9, textTransform: 'uppercase' }}>
            <span style={{ color: T.white }}>India</span>
            <span style={{ background: `linear-gradient(135deg, ${T.saffron}, ${T.gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginLeft: '16px' }}>Fest</span>
          </h1>
          <div style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '900', color: T.gold, letterSpacing: '8px', marginBottom: '16px' }}>2026</div>

          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(255,153,51,0.15), rgba(255,215,0,0.10))', border: '1px solid rgba(255,153,51,0.35)', borderRadius: '12px', padding: '10px 24px', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: T.light, letterSpacing: '1px' }}>🏪 Vendor Space Registration</span>
          </div>

          <p style={{ color: T.muted, fontSize: '15px', maxWidth: '520px', margin: '0 auto', lineHeight: '1.65' }}>
            Secure your booth at the most vibrant cultural celebration in Knoxville. Showcase your products, food, and crafts to thousands of attendees.
          </p>
        </div>

        {/* Cancelled banner */}
        {cancelled && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 20px', marginBottom: '28px', color: '#FCA5A5', fontSize: '14px', fontWeight: '600' }}>
            ⚠️ Payment was cancelled. Your registration has not been completed. Please complete payment to secure your space.
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 20px', marginBottom: '28px', color: '#FCA5A5', fontSize: '14px', fontWeight: '600' }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ── 1. Vendor Info ── */}
          <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease 0.1s' }}>
            <Card title="Vendor Information" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={inputRow({ gridTemplateColumns: '1fr 1fr' })}>
                  <Field label="First Name" required value={form.first_name} onChange={setField('first_name')} placeholder="Jane" />
                  <Field label="Last Name"  required value={form.last_name}  onChange={setField('last_name')}  placeholder="Smith" />
                </div>
                <Field label="Company / Business Name" required value={form.company_name} onChange={setField('company_name')} placeholder="e.g. Spice Garden LLC" />
                <div style={inputRow({ gridTemplateColumns: '1fr 1fr' })}>
                  <Field label="Email" required type="email" value={form.email} onChange={setField('email')} placeholder="jane@example.com" />
                  <Field label="Phone" required type="tel"   value={form.phone} onChange={setField('phone')}  placeholder="(865) 555-0100" />
                </div>
              </div>
            </Card>
          </div>

          {/* ── 2. Address ── */}
          <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease 0.15s' }}>
            <Card title="Business Address" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Field label="Street Address" required value={form.address} onChange={setField('address')} placeholder="123 Main St" />
                <div style={inputRow({ gridTemplateColumns: '1fr auto auto' })}>
                  <Field label="City"  required value={form.city}  onChange={setField('city')}  placeholder="Knoxville" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '90px' }}>
                    <Field label="State" required as="select" value={form.state} onChange={setField('state')}>
                      <option value="">ST</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Field>
                  </div>
                  <div style={{ minWidth: '110px' }}>
                    <Field label="ZIP" required value={form.zip} onChange={setField('zip')} placeholder="37902" hint="5-digit ZIP" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── 3. Space Selection ── */}
          <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease 0.2s' }}>
            <Card title="Choose Your Booth Space" accent={T.gold} icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            }>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {SPACES.map(space => (
                  <SpaceTile
                    key={space.key}
                    space={space}
                    selected={form.space_type === space.key}
                    onClick={() => setForm(f => ({ ...f, space_type: space.key }))}
                  />
                ))}
              </div>

              {/* Selected summary strip */}
              {selectedSpace && (
                <div style={{ marginTop: '20px', background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: T.light, fontWeight: '600' }}>
                    Selected: <strong style={{ color: T.gold }}>{selectedSpace.label} ({selectedSpace.size})</strong>
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: T.saffron }}>{selectedSpace.price} <span style={{ fontSize: '12px', fontWeight: '600', color: T.muted }}>one-time</span></span>
                </div>
              )}
            </Card>
          </div>

          {/* ── 4. Disclaimer ── */}
          <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease 0.25s' }}>
            <Card title="Vendor Agreement & Disclaimer" accent="#EF4444" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            }>
              {/* Scrollable disclaimer */}
              <div style={{
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '20px', height: '220px', overflowY: 'auto',
                fontSize: '12px', lineHeight: '1.8', color: '#A0A0B8',
                whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginBottom: '20px',
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,153,51,0.3) transparent',
              }}>
                {DISCLAIMER_TEXT}
              </div>

              {/* Agree checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer' }}>
                <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    id="disclaimer_accepted"
                    checked={form.disclaimer_accepted}
                    onChange={setField('disclaimer_accepted')}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '6px',
                    border: `2px solid ${form.disclaimer_accepted ? T.saffron : 'rgba(255,255,255,0.2)'}`,
                    background: form.disclaimer_accepted ? `rgba(255,153,51,0.15)` : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {form.disclaimer_accepted && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.saffron} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: T.white }}>
                    I have read and agree to the Vendor Agreement & Disclaimer
                  </span>
                  <div style={{ fontSize: '12px', color: T.muted, marginTop: '4px' }}>
                    By checking this box you acknowledge all terms above on behalf of your company.
                  </div>
                </div>
              </label>
            </Card>
          </div>

          {/* ── 5. Submit ── */}
          <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease 0.3s' }}>
            {/* Order summary */}
            {selectedSpace && (
              <div style={{ background: T.card, border: '1px solid rgba(255,153,51,0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Order Summary</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: T.white }}>Vendor Space — {selectedSpace.label} ({selectedSpace.size})</div>
                  <div style={{ fontSize: '12px', color: T.muted, marginTop: '2px' }}>India Fest 2026 · Knoxville, TN</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: T.saffron }}>{selectedSpace.price}</div>
                  <div style={{ fontSize: '11px', color: T.muted }}>one-time payment</div>
                </div>
              </div>
            )}

            <button
              id="vendor-submit-btn"
              type="submit"
              disabled={loading || !form.disclaimer_accepted}
              style={{
                width: '100%', padding: '18px 32px', borderRadius: '14px',
                background: loading || !form.disclaimer_accepted
                  ? 'rgba(255,153,51,0.3)'
                  : `linear-gradient(135deg, ${T.saffron} 0%, ${T.saffDark} 100%)`,
                border: 'none', cursor: loading || !form.disclaimer_accepted ? 'not-allowed' : 'pointer',
                color: '#1A0800', fontWeight: '900', fontSize: '16px', letterSpacing: '0.5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: loading || !form.disclaimer_accepted ? 'none' : `0 8px 30px rgba(255,153,51,0.35)`,
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
            >
              {loading ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Redirecting to Payment…
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Proceed to Secure Payment — {selectedSpace?.price || ''}
                </>
              )}
            </button>

            {/* Trust badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
              {[
                { icon: '🔒', text: 'Secured by Stripe' },
                { icon: '🇮🇳', text: 'HCC Verified Event' },
                { icon: '📧', text: 'Instant Confirmation' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: T.muted }}>
                  <span>{b.icon}</span><span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px', fontSize: '13px', color: T.muted }}>
          Questions? Email us at{' '}
          <a href="mailto:knoxvillehcc@gmail.com" style={{ color: T.saffron, textDecoration: 'none', fontWeight: '700' }}>
            knoxvillehcc@gmail.com
          </a>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,153,51,0.3); border-radius: 3px; }
      `}</style>
    </div>
  );
}

// ── Suspense wrapper (required for useSearchParams in App Router) ───────────────
export default function IndiafestVendorPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060A18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: '#FF9933', fontSize: '18px' }}>Loading…</div>
      </div>
    }>
      <VendorFormContent />
    </Suspense>
  );
}
