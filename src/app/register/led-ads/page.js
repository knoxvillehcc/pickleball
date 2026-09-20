'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/ClientLayout';

// ── Disclaimer ─────────────────────────────────────────────────────────────────
const DISCLAIMER_TEXT = `LED SCREEN ADVERTISEMENT AGREEMENT — NAVRATRI 2026

1. AD PLACEMENT: LED screen advertisements will be displayed during Navratri 2026 events on screens provided by the Knoxville Hindu Community Center (HCC). Placement frequency and rotation schedule are at HCC's discretion.

2. PAYMENT & REFUND POLICY: All advertising fees ($1,500 per slot) are non-refundable once payment is processed. In the event of cancellation by HCC due to circumstances beyond its control, HCC will issue a credit toward a future event. No cash refunds will be issued.

3. AD SPECIFICATIONS: All advertisements must be submitted in high resolution (1080×1920 pixels). HCC reserves the right to reject or request modifications to any advertisement that does not meet technical specifications or content guidelines.

4. CONTENT GUIDELINES: Advertisements must not contain offensive, discriminatory, or inappropriate content. HCC reserves the right to refuse or remove any advertisement that violates community standards, without refund.

5. MEDIA SUBMISSION: Advertisers must submit their ad media (image or video) at least 7 days before the first event date. Late submissions may result in delayed display without fee adjustment.

6. LIABILITY: HCC is not responsible for technical failures, power outages, or other circumstances that may temporarily interrupt ad display. HCC will make reasonable efforts to ensure consistent display throughout the event.

7. MEDIA & PHOTOGRAPHY: By participating, advertisers consent to HCC using images of the LED display for promotional purposes.

8. INDEMNIFICATION: Advertiser agrees to indemnify, defend, and hold harmless the Knoxville Hindu Community Center, its board members, volunteers, employees, and agents from any claims arising from the advertiser's content.

By checking the box below, you acknowledge that you have read, understood, and agree to all terms and conditions set forth in this LED Screen Advertisement Agreement.`;

const PRICE = 1500;
const STEPS = [
  { id: 1, label: 'Business Info', icon: '📺' },
  { id: 2, label: 'Contact', icon: '📞' },
  { id: 3, label: 'Agreement', icon: '📋' },
];

// ── Progress Bar ───────────────────────────────────────────────────────────────
function ProgressBar({ active }) {
  const { isDark } = useTheme();
  const activeColor = isDark ? '#FFD700' : '#8B1E3F';
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg-primary)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)', padding: '14px 24px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      <div style={{ maxWidth: '660px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
        {STEPS.map((step, i) => {
          const done = active > step.id;
          const current = active === step.id;
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#FF9933' : current ? activeColor : 'var(--bg-secondary)',
                  border: `2px solid ${done ? '#FF9933' : current ? activeColor : 'var(--border)'}`,
                  fontSize: done ? '14px' : '13px', color: done || current ? 'white' : 'var(--text-secondary)',
                  fontWeight: '800', transition: 'all 0.3s ease', flexShrink: 0,
                }}>{done ? '✓' : step.id}</div>
                <span style={{ fontSize: '10px', fontWeight: '700', color: done ? '#FF9933' : current ? activeColor : 'var(--text-secondary)', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '2px', margin: '0 8px', marginBottom: '18px', background: done ? '#FF9933' : 'var(--border)', borderRadius: '2px', transition: 'background 0.3s ease' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Input Field ────────────────────────────────────────────────────────────────
function Field({ label, required, hint, type = 'text', value, onChange, placeholder, children, as = 'input' }) {
  const [focused, setFocused] = useState(false);
  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: '10px', boxSizing: 'border-box',
    border: `1.5px solid ${focused ? '#FF9933' : 'var(--border)'}`,
    background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px',
    outline: 'none', fontFamily: 'inherit',
    boxShadow: focused ? '0 0 0 3px rgba(255,153,51,0.12)' : 'none',
    transition: 'all 0.2s ease',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}{required && <span style={{ color: '#FF9933', marginLeft: '3px' }}>*</span>}
        </label>
      )}
      {as === 'textarea'
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
            style={inputStyle} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
      {hint && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{hint}</span>}
    </div>
  );
}

// ── Section Card ───────────────────────────────────────────────────────────────
function Section({ title, icon, step, children, active }) {
  return (
    <div style={{
      background: 'var(--bg-primary)', border: `1px solid var(--border)`,
      borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        padding: '20px 28px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-secondary)',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, #FF9933, #E07C1A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          boxShadow: '0 4px 12px rgba(255,153,51,0.25)',
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#FF9933', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
            Step {step} of 3
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>{title}</div>
        </div>
        <div style={{
          marginLeft: 'auto', width: '28px', height: '28px', borderRadius: '50%',
          background: active > step ? '#FF9933' : 'var(--bg-secondary)',
          border: `2px solid ${active > step ? '#FF9933' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', color: active > step ? 'white' : 'var(--text-secondary)', fontWeight: '800',
        }}>{active > step ? '✓' : ''}</div>
      </div>
      <div style={{ padding: '28px' }}>{children}</div>
    </div>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────────
function LedAdsFormInner() {
  const { isDark } = useTheme();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('cancelled');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPublished, setIsPublished] = useState(null);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Check if registration is published
  useEffect(() => {
    fetch('/api/led-ads/settings')
      .then(r => r.json())
      .then(d => setIsPublished(d.is_published))
      .catch(() => setIsPublished(false));
  }, []);

  const validate = () => {
    if (!businessName.trim()) return 'Business/Advertiser name is required';
    if (!contactName.trim()) return 'Contact name is required';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Valid email is required';
    if (!phone.trim()) return 'Phone number is required';
    if (!agreed) return 'You must accept the agreement';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/led-ads/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          contact_name: contactName,
          email, phone, address, city, state, zip,
          ad_description: adDescription,
          disclaimer_accepted: agreed,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  // Loading state
  if (isPublished === null) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
    </div>
  );

  // Unpublished state
  if (!isPublished) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>📺</div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
          LED Screen Ads — Coming Soon
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Registration for LED Screen Advertisements during Navratri 2026 is not yet open. Please check back soon.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <ProgressBar active={step} />

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '40px 24px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📺</div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Navratri 2026 — LED Screen Ads
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px', lineHeight: '1.5', maxWidth: '500px', margin: '8px auto 0' }}>
          Showcase your business on our LED screens throughout all 9 nights of Navratri 2026.
          High-resolution display (1080×1920).
        </p>
        <div style={{
          display: 'inline-block', marginTop: '16px', padding: '10px 28px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #FF9933, #E07C1A)',
          color: 'white', fontWeight: '800', fontSize: '20px',
          boxShadow: '0 4px 16px rgba(255,153,51,0.3)',
        }}>
          $1,500 per ad slot
        </div>
      </div>

      {cancelled && (
        <div style={{ maxWidth: '660px', margin: '0 auto 16px', padding: '0 24px' }}>
          <div style={{ padding: '14px 20px', borderRadius: '12px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: '14px', fontWeight: '600' }}>
            ⚠️ Payment was cancelled. Your information has been saved — you can try again.
          </div>
        </div>
      )}

      {error && (
        <div style={{ maxWidth: '660px', margin: '0 auto 16px', padding: '0 24px' }}>
          <div style={{ padding: '14px 20px', borderRadius: '12px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '14px', fontWeight: '600' }}>
            ❌ {error}
          </div>
        </div>
      )}

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '0 24px 80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Step 1: Business Info */}
        <Section title="Business Information" icon="📺" step={1} active={step}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Business / Advertiser Name" required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your company or brand name" />
            <Field label="What are you advertising?" value={adDescription} onChange={e => setAdDescription(e.target.value)} placeholder="Brief description of your ad content" as="textarea" />
            <div style={{ padding: '14px 18px', borderRadius: '10px', background: isDark ? 'rgba(255,153,51,0.08)' : '#FFF8F0', border: '1px solid rgba(255,153,51,0.2)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#FF9933', letterSpacing: '0.5px', marginBottom: '6px' }}>📐 MEDIA REQUIREMENT</div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>High Resolution: 1080 × 1920 pixels (portrait)</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Submit your ad media at least 7 days before the event.</div>
            </div>
          </div>
          <button onClick={() => {
            if (!businessName.trim()) { setError('Business name is required'); return; }
            setError(''); setStep(2);
          }} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #FF9933, #E07C1A)', color: 'white',
            fontWeight: '700', fontSize: '15px', marginTop: '20px',
          }}>Continue →</button>
        </Section>

        {/* Step 2: Contact */}
        {step >= 2 && (
          <Section title="Contact Details" icon="📞" step={2} active={step}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Contact Person Name" required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Email" required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                <Field label="Phone" required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <Field label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address (optional)" />
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                <Field label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
                <Field label="State" value={state} onChange={e => setState(e.target.value)} placeholder="TN" />
                <Field label="ZIP" value={zip} onChange={e => setZip(e.target.value)} placeholder="37919" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
              }}>← Back</button>
              <button onClick={() => {
                if (!contactName.trim()) { setError('Contact name is required'); return; }
                if (!email.trim()) { setError('Email is required'); return; }
                if (!phone.trim()) { setError('Phone is required'); return; }
                setError(''); setStep(3);
              }} style={{
                flex: 2, padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #FF9933, #E07C1A)', color: 'white', fontWeight: '700', fontSize: '15px',
              }}>Continue →</button>
            </div>
          </Section>
        )}

        {/* Step 3: Agreement */}
        {step >= 3 && (
          <Section title="Agreement & Payment" icon="📋" step={3} active={step}>
            <div style={{
              maxHeight: '250px', overflowY: 'auto', padding: '16px', borderRadius: '10px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              fontSize: '12px', lineHeight: '1.7', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
            }}>
              {DISCLAIMER_TEXT}
            </div>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '16px',
              cursor: 'pointer', padding: '14px 16px', borderRadius: '12px',
              background: agreed ? (isDark ? 'rgba(34,197,94,0.08)' : '#F0FDF4') : 'var(--bg-secondary)',
              border: `1.5px solid ${agreed ? '#22C55E' : 'var(--border)'}`,
              transition: 'all 0.2s ease',
            }} onClick={() => setAgreed(!agreed)}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, marginTop: '1px',
                border: `2px solid ${agreed ? '#22C55E' : 'var(--border)'}`,
                background: agreed ? '#22C55E' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '14px', fontWeight: '800',
                transition: 'all 0.2s ease',
              }}>{agreed ? '✓' : ''}</div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                I have read and agree to the LED Screen Advertisement Agreement & Disclaimer
              </span>
            </label>

            {/* Order summary */}
            <div style={{
              marginTop: '20px', padding: '20px', borderRadius: '14px',
              background: isDark ? 'rgba(255,153,51,0.06)' : '#FFF8F0',
              border: '1px solid rgba(255,153,51,0.2)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#FF9933', letterSpacing: '1px', marginBottom: '12px' }}>ORDER SUMMARY</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>LED Screen Ad — Navratri 2026</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>${PRICE.toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,153,51,0.2)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>Total</span>
                <span style={{ fontWeight: '900', fontSize: '20px', color: '#FF9933' }}>${PRICE.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setStep(2)} style={{
                flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
              }}>← Back</button>
              <button onClick={handleSubmit} disabled={!agreed || loading} style={{
                flex: 2, padding: '16px', borderRadius: '14px', border: 'none', cursor: agreed && !loading ? 'pointer' : 'not-allowed',
                background: agreed ? 'linear-gradient(135deg, #22C55E, #16A34A)' : '#ccc',
                color: 'white', fontWeight: '800', fontSize: '16px',
                boxShadow: agreed ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
                opacity: loading ? 0.6 : 1, transition: 'all 0.2s ease',
              }}>
                {loading ? '⏳ Processing...' : `💳 Pay $${PRICE.toLocaleString()} — Proceed to Checkout`}
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

export default function LedAdsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <LedAdsFormInner />
    </Suspense>
  );
}
