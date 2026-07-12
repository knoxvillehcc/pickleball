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

// ── Vendor types ───────────────────────────────────────────────────────────────
const VENDOR_TYPES = [
  {
    key:   'home_business',
    label: 'Small Business from Home',
    desc:  'Perfect for home-based businesses, crafters, and artisan sellers.',
    price: 351,
    cents: 35100,
    emoji: '🏡',
    color: '#FF9933',
    bg:    '#FFF8F0',
    border:'#FFD4A0',
  },
  {
    key:   'established_business',
    label: 'Established Business / Store',
    desc:  'For established retail shops, restaurants, and brand businesses.',
    price: 1001,
    cents: 100100,
    emoji: '🏪',
    color: '#8B1E3F',
    bg:    '#FFF0F4',
    border:'#F4B8C8',
  },
];

// ── Disclaimer ─────────────────────────────────────────────────────────────────
const DISCLAIMER_TEXT = `VENDOR AGREEMENT & DISCLAIMER — INDIA FEST 2026

1. SPACE ASSIGNMENT: Booth spaces are assigned by the Knoxville Hindu Community Center (HCC) at their sole discretion. Space assignments will be communicated prior to the event. HCC reserves the right to relocate vendors if necessary.

2. PAYMENT & REFUND POLICY: All registration fees are non-refundable once payment is processed. In the event of cancellation by HCC due to circumstances beyond its control (weather, venue issues, etc.), HCC will issue a credit toward a future event. No cash refunds will be issued.

3. SETUP & BREAKDOWN: Vendors are responsible for the setup and teardown of their own display within their assigned space. Vendors must be fully set up 30 minutes before the event opens and must not begin teardown until the event officially closes.

4. VENDOR CONDUCT: All vendors and their staff are expected to maintain professional, courteous conduct throughout the event. HCC reserves the right to ask any vendor to leave the event if their conduct is deemed inappropriate or disruptive, without refund.

5. INSURANCE: Vendors participate at their own risk. HCC, its officers, volunteers, and agents are not liable for theft, loss, or damage to vendor property. Vendors are encouraged to carry their own insurance.

6. ELECTRICITY & UTILITIES: Power access is included with your booth. Vendors requiring additional or specialized electrical connections must notify HCC in advance. HCC is not responsible for power outages.

7. MEDIA & PHOTOGRAPHY: By participating, vendors consent to HCC and its authorized photographers capturing images and video of their booth and products for promotional use across digital and print media.

8. COMPLIANCE: Vendors must comply with all event rules and regulations communicated by HCC staff. HCC reserves the right to modify event rules at any time. Registered vendors will be notified of any material changes.

9. INDEMNIFICATION: Vendor agrees to indemnify, defend, and hold harmless the Knoxville Hindu Community Center, its board members, volunteers, employees, and agents from any claims, damages, liabilities, or expenses arising out of or related to vendor's participation in India Fest 2026.

By checking the box below, you acknowledge that you have read, understood, and agree to all terms and conditions set forth in this Vendor Agreement & Disclaimer.`;

// ── Step progress indicator ────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Business Info',  icon: '🏢' },
  { id: 2, label: 'Contact',        icon: '📞' },
  { id: 3, label: 'Booth',          icon: '🏪' },
  { id: 4, label: 'Agreement',      icon: '📋' },
];

function ProgressBar({ active }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #F0E6D3',
      padding: '14px 24px',
      boxShadow: '0 2px 12px rgba(139,30,63,0.06)',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, i) => {
          const done   = active > step.id;
          const current = active === step.id;
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#FF9933' : current ? '#8B1E3F' : '#F3EDE6',
                  border: `2px solid ${done ? '#FF9933' : current ? '#8B1E3F' : '#E8D8C8'}`,
                  fontSize: done ? '14px' : '13px',
                  color: done || current ? 'white' : '#A89070',
                  fontWeight: '800',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                }}>
                  {done ? '✓' : step.id}
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: '700',
                  color: done ? '#FF9933' : current ? '#8B1E3F' : '#B0A090',
                  letterSpacing: '0.3px', whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: '2px', margin: '0 8px', marginBottom: '18px',
                  background: done ? '#FF9933' : '#F0E6D3',
                  borderRadius: '2px',
                  transition: 'background 0.3s ease',
                }}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Input field ────────────────────────────────────────────────────────────────
function Field({ label, required, hint, type = 'text', value, onChange, placeholder, children, as = 'input' }) {
  const [focused, setFocused] = useState(false);
  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: '10px', boxSizing: 'border-box',
    border: `1.5px solid ${focused ? '#FF9933' : '#E8D8C8'}`,
    background: focused ? '#FFFCF8' : '#FAFAF8',
    color: '#2D1A08', fontSize: '15px', outline: 'none', fontFamily: 'inherit',
    boxShadow: focused ? '0 0 0 3px rgba(255,153,51,0.12)' : 'none',
    transition: 'all 0.2s ease',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: '700', color: '#8B6040', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}{required && <span style={{ color: '#FF9933', marginLeft: '3px' }}>*</span>}
        </label>
      )}
      {as === 'select'
        ? <select value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23FF9933' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
            }}>
            {children}
          </select>
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
            style={inputStyle} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
      {hint && <span style={{ fontSize: '11px', color: '#B09070' }}>{hint}</span>}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, icon, step, children, active }) {
  const isActive = active >= step;
  return (
    <div id={`section-${step}`} style={{
      background: '#FFFFFF',
      border: `1px solid ${isActive ? '#F0D8C0' : '#F0EBE4'}`,
      borderRadius: '20px',
      boxShadow: isActive
        ? '0 4px 24px rgba(139,30,63,0.06), 0 1px 3px rgba(0,0,0,0.04)'
        : '0 1px 4px rgba(0,0,0,0.03)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
    }}>
      {/* Section header */}
      <div style={{
        padding: '20px 28px',
        borderBottom: '1px solid #F8F0E8',
        display: 'flex', alignItems: 'center', gap: '14px',
        background: 'linear-gradient(90deg, #FFF8F2, #FFFFFF)',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, #FF9933, #E07C1A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 4px 12px rgba(255,153,51,0.25)',
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#FF9933', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
            Step {step} of 4
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#2D1A08' }}>{title}</div>
        </div>
        <div style={{
          marginLeft: 'auto', width: '28px', height: '28px', borderRadius: '50%',
          background: active > step ? '#FF9933' : active === step ? '#FFF4E8' : '#F5EDE5',
          border: `2px solid ${active > step ? '#FF9933' : active === step ? '#FFD4A0' : '#E8D8C8'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', color: active > step ? 'white' : '#C0A080', fontWeight: '800',
          flexShrink: 0,
        }}>
          {active > step ? '✓' : step}
        </div>
      </div>
      <div style={{ padding: '28px' }}>{children}</div>
    </div>
  );
}

// ── Vendor type card ──────────────────────────────────────────────────────────
function VendorTypeCard({ vendor, selected, quantity, onSelect, onQuantity }) {
  const subtotal = vendor.price * quantity;
  return (
    <div onClick={onSelect} style={{
      cursor: 'pointer',
      border: `2px solid ${selected ? vendor.color : '#F0E0D0'}`,
      borderRadius: '16px',
      background: selected ? vendor.bg : '#FAFAF8',
      boxShadow: selected
        ? `0 0 0 1px ${vendor.color}30, 0 8px 24px rgba(0,0,0,0.08)`
        : '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'all 0.25s ease',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '20px 22px',
        borderBottom: `1px solid ${selected ? vendor.border : '#F5EDE5'}`,
      }}>
        {/* Radio */}
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${selected ? vendor.color : '#D0C0B0'}`,
          background: selected ? `${vendor.color}18` : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          {selected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: vendor.color }}/>}
        </div>
        <span style={{ fontSize: '26px' }}>{vendor.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: selected ? vendor.color : '#3D2010', marginBottom: '2px' }}>
            {vendor.label}
          </div>
          <div style={{ fontSize: '12px', color: '#907060', fontWeight: '500' }}>{vendor.desc}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: selected ? vendor.color : '#907060' }}>
            ${vendor.price.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#B09080' }}>per spot</div>
        </div>
      </div>
      {/* Quantity row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 22px',
        background: selected ? `${vendor.bg}CC` : '#FAFAF8',
        flexWrap: 'wrap', gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#907060' }}>Number of spots</span>
          <select
            value={quantity}
            onChange={(e) => { e.stopPropagation(); onQuantity(Number(e.target.value)); }}
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '7px 30px 7px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
              background: 'white', border: `1.5px solid ${selected ? vendor.border : '#E0D0C0'}`,
              color: selected ? vendor.color : '#5D3A20', outline: 'none', cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23${selected ? vendor.color.replace('#','') : '907060'}' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center', fontFamily: 'inherit',
            }}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#B09080', marginBottom: '1px' }}>Subtotal</div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: selected ? vendor.color : '#A09080' }}>
            ${subtotal.toLocaleString()}.00
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compute current step from form state ───────────────────────────────────────
function getActiveStep(form) {
  if (!form.first_name && !form.last_name && !form.company_name) return 1;
  if (!form.email && !form.phone && !form.address) return 2;
  if (!form.vendor_type) return 3;
  return 4;
}

// ── Main form ──────────────────────────────────────────────────────────────────
function VendorFormContent() {
  const searchParams = useSearchParams();
  const cancelled    = searchParams.get('cancelled') === '1';

  const [form, setForm] = useState({
    first_name: '', last_name: '', company_name: '',
    email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    vendor_type: '',
    quantity: 1,
    disclaimer_accepted: false,
  });
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [mounted,       setMounted]       = useState(false);
  const [publishStatus, setPublishStatus] = useState('loading');

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    fetch('/api/indiafest/settings?key=is_published', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setPublishStatus((d.is_published === true || d.value === 'true') ? 'open' : 'closed'))
      .catch(() => setPublishStatus('closed'));
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (publishStatus === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#FFF8F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #FFE0B8', borderTop: '4px solid #FF9933', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
          <div style={{ color: '#FF9933', fontSize: '15px', fontWeight: '700', fontFamily: 'Inter, sans-serif' }}>Loading…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Closed ─────────────────────────────────────────────────────────────────
  if (publishStatus === 'closed') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFF8F2 0%, #FFF4EC 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          {/* Flag bar */}
          <div style={{ height: '5px', background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)', borderRadius: '99px', marginBottom: '40px', width: '200px', margin: '0 auto 40px' }}/>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>🔒</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FFF4E8', border: '1px solid #FFD4A0', padding: '6px 18px', borderRadius: '20px', marginBottom: '24px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF9933', display: 'inline-block', flexShrink: 0 }}/>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#FF9933', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Knoxville Hindu Community Center</span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '40px', fontWeight: '900', color: '#2D1A08', letterSpacing: '-1px' }}>India Fest 2026</h1>
          <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '700', color: '#8B1E3F' }}>Vendor Registration Closed</h2>
          <p style={{ color: '#907060', fontSize: '15px', lineHeight: '1.8', margin: '0 0 24px' }}>
            Vendor registration is not currently open.<br/>
            Please check back soon or contact us at<br/>
            <a href="mailto:knoxvillehcc@gmail.com" style={{ color: '#FF9933', textDecoration: 'none', fontWeight: '700' }}>knoxvillehcc@gmail.com</a>
          </p>
        </div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');`}</style>
      </div>
    );
  }

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const selectedVendor = VENDOR_TYPES.find(v => v.key === form.vendor_type);
  const grandTotal     = selectedVendor ? selectedVendor.price * form.quantity : 0;
  const activeStep     = getActiveStep(form);
  const canSubmit      = form.vendor_type && form.disclaimer_accepted;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.vendor_type)          { setError('Please select a vendor category.'); return; }
    if (!form.disclaimer_accepted)  { setError('You must accept the Vendor Agreement before proceeding.'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/indiafest/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Registration failed. Please try again.'); setLoading(false); return; }
      window.location.href = data.checkoutUrl;
    } catch { setError('Network error — please check your connection and try again.'); setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFF8F2 0%, #FFF4EC 60%, #FFFAF6 100%)', fontFamily: "'Inter', -apple-system, sans-serif", color: '#2D1A08' }}>

      {/* ── India flag stripe ── */}
      <div style={{ height: '5px', background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)' }}/>

      {/* ── Sticky progress ── */}
      <ProgressBar active={activeStep} />

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #8B1E3F 0%, #6B1530 50%, #8B1E3F 100%)',
        padding: 'clamp(48px, 8vw, 80px) 24px clamp(40px, 6vw, 64px)',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease',
      }}>
        {/* Subtle pattern overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,153,51,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,215,0,0.08) 0%, transparent 40%)', pointerEvents: 'none' }}/>

        {/* HCC badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 18px', borderRadius: '99px', marginBottom: '24px', position: 'relative' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF9933', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 8px rgba(255,153,51,0.6)' }}/>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: '2px', textTransform: 'uppercase' }}>Knoxville Hindu Community Center</span>
        </div>

        {/* Title */}
        <h1 style={{ margin: '0 0 10px', lineHeight: '1', position: 'relative' }}>
          <div style={{ fontSize: 'clamp(44px, 9vw, 80px)', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-2px' }}>IndiaFest</div>
          <div style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: '900', color: '#FFD700', letterSpacing: '8px', marginTop: '4px' }}>2026</div>
        </h1>

        {/* Tagline */}
        <div style={{ display: 'inline-block', background: 'rgba(255,153,51,0.2)', border: '1px solid rgba(255,153,51,0.4)', borderRadius: '10px', padding: '10px 24px', margin: '20px 0 18px', position: 'relative' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#FFD4A0', letterSpacing: '1px', textTransform: 'uppercase' }}>Vendor Registration</span>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '15px', maxWidth: '520px', margin: '0 auto', lineHeight: '1.75', fontWeight: '400', position: 'relative' }}>
          Reserve your booth and join East Tennessee's largest celebration of Indian culture, food, art, and community.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '32px', flexWrap: 'wrap', position: 'relative' }}>
          {[
            { icon: '👥', val: '2,000+', label: 'Expected Guests' },
            { icon: '🎪', val: '2 Tiers', label: 'Vendor Packages' },
            { icon: '📍', val: 'Knoxville, TN', label: 'Location' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 18px', minWidth: '120px' }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFD700', marginBottom: '1px' }}>{s.val}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Form ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Alerts */}
        {cancelled && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', color: '#B91C1C', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            Your payment was cancelled — registration is not complete. Please try again below.
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', color: '#B91C1C', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>❌</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease 0.15s' }}>

          {/* ── Step 1: Business Information ── */}
          <Section title="Business Information" icon="🏢" step={1} active={activeStep}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="First Name" required value={form.first_name} onChange={setField('first_name')} placeholder="Jane" />
                <Field label="Last Name"  required value={form.last_name}  onChange={setField('last_name')}  placeholder="Smith" />
              </div>
              <Field label="Company / Business Name" required value={form.company_name} onChange={setField('company_name')} placeholder="e.g. Spice Garden LLC" />
            </div>
          </Section>

          {/* ── Step 2: Contact Information ── */}
          <Section title="Contact Information" icon="📞" step={2} active={activeStep}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Email Address" required type="email" value={form.email} onChange={setField('email')} placeholder="jane@example.com" />
                <Field label="Phone Number"  required type="tel"   value={form.phone} onChange={setField('phone')}  placeholder="(865) 555-0100" />
              </div>
              <Field label="Street Address" required value={form.address} onChange={setField('address')} placeholder="123 Main Street" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', gap: '14px' }}>
                <Field label="City"     required value={form.city} onChange={setField('city')} placeholder="Knoxville" />
                <Field label="State"    required as="select" value={form.state} onChange={setField('state')}>
                  <option value="">ST</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </Field>
                <Field label="ZIP Code" required value={form.zip}  onChange={setField('zip')}  placeholder="37902" hint="5-digit" />
              </div>
            </div>
          </Section>

          {/* ── Step 3: Booth Selection ── */}
          <Section title="Select Your Booth Package" icon="🏪" step={3} active={activeStep}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {VENDOR_TYPES.map(vendor => (
                <VendorTypeCard
                  key={vendor.key}
                  vendor={vendor}
                  selected={form.vendor_type === vendor.key}
                  quantity={form.vendor_type === vendor.key ? form.quantity : 1}
                  onSelect={() => setForm(f => ({ ...f, vendor_type: vendor.key, quantity: 1 }))}
                  onQuantity={(q) => setForm(f => ({ ...f, quantity: q }))}
                />
              ))}

              {/* Grand total row */}
              {form.vendor_type && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '18px 22px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #FFF8F0, #FFF4E8)',
                  border: '1.5px solid #FFD4A0',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#B09070', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Grand Total</div>
                    <div style={{ fontSize: '13px', color: '#907060', marginTop: '2px' }}>{form.quantity} spot{form.quantity > 1 ? 's' : ''} selected</div>
                  </div>
                  <div style={{ fontSize: '34px', fontWeight: '900', color: '#FF9933' }}>${grandTotal.toLocaleString()}.00</div>
                </div>
              )}
            </div>
          </Section>

          {/* ── Step 4: Vendor Agreement ── */}
          <Section title="Vendor Agreement & Disclaimer" icon="📋" step={4} active={activeStep}>
            {/* Scrollable text */}
            <div style={{
              background: '#FAFAF8', border: '1px solid #F0E8DC', borderRadius: '12px',
              padding: '20px 22px', height: '220px', overflowY: 'auto',
              fontSize: '12.5px', lineHeight: '1.85', color: '#706050',
              whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginBottom: '20px',
              scrollbarWidth: 'thin', scrollbarColor: '#FFD4A0 #F8F0E8',
            }}>
              {DISCLAIMER_TEXT}
            </div>

            {/* Checkbox */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer',
              padding: '16px 18px',
              background: form.disclaimer_accepted ? '#FFF8F0' : '#FAFAF8',
              borderRadius: '12px',
              border: `1.5px solid ${form.disclaimer_accepted ? '#FFD4A0' : '#EEE4D8'}`,
              transition: 'all 0.2s ease',
            }}>
              <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
                <input type="checkbox" id="disclaimer_accepted" checked={form.disclaimer_accepted}
                  onChange={setField('disclaimer_accepted')}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                <div style={{
                  width: '22px', height: '22px', borderRadius: '6px',
                  border: `2px solid ${form.disclaimer_accepted ? '#FF9933' : '#C0A888'}`,
                  background: form.disclaimer_accepted ? '#FF9933' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: form.disclaimer_accepted ? '0 0 0 3px rgba(255,153,51,0.18)' : 'none',
                }}>
                  {form.disclaimer_accepted && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#2D1A08' }}>I have read and agree to the Vendor Agreement</div>
                <div style={{ fontSize: '12px', color: '#907060', marginTop: '4px' }}>By checking this box you accept all terms on behalf of your company.</div>
              </div>
            </label>
          </Section>

          {/* ── Order Summary + Submit ── */}
          <div style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease 0.3s' }}>
            {/* Order card */}
            {selectedVendor && (
              <div style={{
                background: '#FFFFFF', border: '1px solid #F0E0C8', borderRadius: '16px',
                padding: '22px 24px', marginBottom: '16px',
                boxShadow: '0 4px 20px rgba(139,30,63,0.07)',
              }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#C0A080', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '14px' }}>Order Summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingBottom: '14px', borderBottom: '1px solid #F5EDE5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: selectedVendor.bg,
                      border: `1px solid ${selectedVendor.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                    }}>{selectedVendor.emoji}</div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#2D1A08' }}>{selectedVendor.label}</div>
                      <div style={{ fontSize: '12px', color: '#907060', marginTop: '2px' }}>
                        India Fest 2026 · Knoxville, TN · {form.quantity} spot{form.quantity > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#B09080' }}>${selectedVendor.price.toLocaleString()}.00 × {form.quantity}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#907060' }}>Total Due</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#FF9933' }}>${grandTotal.toLocaleString()}.00</div>
                </div>
              </div>
            )}

            {/* CTA button */}
            <button
              id="vendor-submit-btn"
              type="submit"
              disabled={loading || !canSubmit}
              style={{
                width: '100%', padding: '20px 32px', borderRadius: '14px', border: 'none',
                background: loading || !canSubmit
                  ? '#F5E8D8'
                  : 'linear-gradient(135deg, #FF9933 0%, #E07C1A 60%, #CC6600 100%)',
                color: loading || !canSubmit ? '#C0A888' : '#FFFFFF',
                fontWeight: '800', fontSize: '17px', letterSpacing: '0.2px',
                cursor: loading || !canSubmit ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                boxShadow: loading || !canSubmit
                  ? 'none'
                  : '0 8px 32px rgba(255,153,51,0.35), 0 2px 0 rgba(255,255,255,0.15) inset',
                transition: 'all 0.25s ease', fontFamily: 'inherit',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: '20px', height: '20px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                  Redirecting to Secure Payment…
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Submit Registration{selectedVendor && grandTotal > 0 ? ` — $${grandTotal.toLocaleString()}.00` : ''}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </>
              )}
            </button>

            {/* Trust badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '18px', flexWrap: 'wrap' }}>
              {[
                { icon: '🔒', text: 'Secured by Stripe' },
                { icon: '🇮🇳', text: 'HCC Verified Event' },
                { icon: '📧', text: 'Instant Confirmation' },
                { icon: '🔐', text: 'SSL Encrypted' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#A09080', fontWeight: '600' }}>
                  <span>{b.icon}</span><span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '56px', paddingTop: '28px', borderTop: '1px solid #F0E6D8' }}>
          <div style={{ height: '4px', background: 'linear-gradient(90deg, #FF9933 33.33%, transparent 33.33%, transparent 66.66%, #138808 66.66%)', borderRadius: '99px', width: '80px', margin: '0 auto 20px' }}/>
          <div style={{ fontSize: '13px', color: '#B09080', marginBottom: '6px' }}>Questions about vendor registration?</div>
          <a href="mailto:knoxvillehcc@gmail.com" style={{ color: '#FF9933', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
            knoxvillehcc@gmail.com
          </a>
          <div style={{ marginTop: '16px', fontSize: '11px', color: '#C0B0A0' }}>
            © 2026 Knoxville Hindu Community Center · India Fest 2026
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #F8F0E8; }
        ::-webkit-scrollbar-thumb { background: #FFD4A0; border-radius: 3px; }
        input::placeholder { color: #C0A888; }
        select option { background: #FFFFFF; color: #2D1A08; }
        #vendor-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 40px rgba(255,153,51,0.4), 0 2px 0 rgba(255,255,255,0.15) inset !important; }
        #vendor-submit-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>
    </div>
  );
}

// ── Suspense wrapper ──────────────────────────────────────────────────────────
export default function IndiafestVendorPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FFF8F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #FFE0B8', borderTop: '4px solid #FF9933', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
          <div style={{ color: '#FF9933', fontSize: '15px', fontFamily: 'Inter, sans-serif', fontWeight: '700' }}>Loading…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <VendorFormContent />
    </Suspense>
  );
}
