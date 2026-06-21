'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Constants ──────────────────────────────────────────────────────────────────
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const TERMS_TEXT = `1. ELIGIBILITY: Participants must be currently enrolled students (Middle/High School category) or adults 18+ (Adult category).

2. CONDUCT: All participants are expected to maintain sportsmanlike conduct. Unsportsmanlike behavior may result in disqualification without refund.

3. REFUND POLICY: Registration fees are non-refundable once payment is processed. In case of event cancellation by HCC, a full refund will be issued.

4. MEDIA CONSENT: By registering, you consent to HCC photographing and/or recording the event for promotional use.

5. EQUIPMENT: Players are responsible for bringing their own paddles. Balls will be provided by HCC.

6. SCHEDULE: HCC reserves the right to modify event schedule, format, and rules. Registered participants will be notified of any changes.

7. CODE OF CONDUCT: Zero tolerance for harassment, discrimination, or inappropriate behavior of any kind.`;

const LIABILITY_TEXT = `I, the undersigned, acknowledge that participation in pickleball activities organized by the Knoxville Hindu Community Center (HCC) involves inherent risks of physical injury, including but not limited to sprains, fractures, or other physical harm. I voluntarily assume all risks associated with participation. I agree to release, indemnify, and hold harmless HCC, its officers, directors, volunteers, employees, and agents from any and all claims, damages, losses, or liabilities arising out of or related to my participation or the participation of any player I am registering. I confirm that all players listed are in good physical condition and capable of participating. I have read this waiver fully and agree to be bound by its terms on behalf of myself and all listed players.`;

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  saffron: '#F59E0B',
  gold:    '#D97706',
  maroon:  '#991B1B',
  crimson: '#7F1D1D',
  green:   '#10B981',
  blue:    '#3B82F6',
  bg:      '#0A0F1E',
  card:    'rgba(15,23,42,0.8)',
  border:  'rgba(51,65,85,0.5)',
};

// ── Reusable styled input ──────────────────────────────────────────────────────
function StyledInput({ label, required, hint, type = 'text', value, onChange, placeholder, children, as = 'input' }) {
  const [focused, setFocused] = useState(false);
  const baseStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    background: 'rgba(2,6,23,0.6)',
    border: `1.5px solid ${focused ? T.saffron : 'rgba(51,65,85,0.6)'}`,
    color: '#F1F5F9', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    boxShadow: focused ? `0 0 0 3px rgba(245,158,11,0.12)` : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}{required && <span style={{ color: T.saffron, marginLeft: '3px' }}>*</span>}
        </label>
      )}
      {as === 'select'
        ? <select value={value} onChange={onChange} style={{ ...baseStyle, appearance: 'none' }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
            {children}
          </select>
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder}
            required={required} style={baseStyle}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
      {hint && <span style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>{hint}</span>}
    </div>
  );
}

// ── Card section ───────────────────────────────────────────────────────────────
function Section({ step, title, icon, children, accent = T.saffron }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: '20px', overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* Section header bar */}
      <div style={{
        padding: '18px 28px', borderBottom: `1px solid ${T.border}`,
        background: 'rgba(2,6,23,0.5)',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
          border: `1px solid ${accent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>{icon}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '10px', fontWeight: '800', color: accent,
            background: `${accent}18`, border: `1px solid ${accent}30`,
            padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.5px',
          }}>STEP {step}</span>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#F1F5F9', letterSpacing: '-0.2px' }}>{title}</h2>
        </div>
      </div>
      <div style={{ padding: '28px' }}>{children}</div>
    </div>
  );
}

// ── Toggle card button ─────────────────────────────────────────────────────────
function ToggleCard({ selected, onClick, accent, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '18px 16px', borderRadius: '14px', cursor: 'pointer',
      textAlign: 'left', border: `2px solid ${selected ? accent : 'rgba(51,65,85,0.5)'}`,
      background: selected ? `${accent}12` : 'rgba(2,6,23,0.4)',
      boxShadow: selected ? `0 0 24px ${accent}22` : 'none',
      transition: 'all 0.2s', fontFamily: 'inherit',
    }}>
      {children}
    </button>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${T.bg}, #0D1525)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', border: `3px solid rgba(245,158,11,0.2)`, borderTop: `3px solid ${T.saffron}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
        <p style={{ color: '#475569', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>Loading registration...</p>
      </div>
    </div>
  );
}

// ── Registration Closed ────────────────────────────────────────────────────────
function RegistrationClosed() {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${T.bg} 0%, #0D1525 60%, rgba(127,29,29,0.06) 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, -apple-system, sans-serif', padding: '24px',
    }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(153,27,27,0.08), transparent 70%)', borderRadius: '50%' }}/>
      </div>

      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', position: 'relative' }}>
        {/* Icon */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '28px', margin: '0 auto',
            background: `linear-gradient(135deg, ${T.crimson}, ${T.maroon})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px', boxShadow: '0 0 60px rgba(153,27,27,0.35)',
          }}>🏓</div>
          <div style={{
            position: 'absolute', top: '-8px', right: '-8px',
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#EF4444', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '14px',
            boxShadow: '0 0 12px rgba(239,68,68,0.5)',
          }}>🔒</div>
        </div>

        <h1 style={{ margin: '0 0 12px', fontSize: '34px', fontWeight: '900', color: '#F1F5F9', letterSpacing: '-0.8px', lineHeight: 1.2 }}>
          Registration is Closed
        </h1>
        <p style={{ color: '#64748B', fontSize: '16px', lineHeight: '1.7', margin: '0 0 36px' }}>
          The HCC Pickleball Tournament registration window is currently not open. Check back soon or contact us to be notified when it opens.
        </p>

        {/* Contact card */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: '16px', padding: '24px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '10px', fontWeight: '600' }}>📬 GET NOTIFIED</div>
          <a href="mailto:knoxvillehcc@gmail.com?subject=Pickleball Registration Inquiry" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            color: T.saffron, fontWeight: '700', fontSize: '16px',
            textDecoration: 'none', padding: '10px 20px', borderRadius: '10px',
            background: `${T.saffron}12`, border: `1px solid ${T.saffron}30`,
            transition: 'all 0.2s',
          }}>
            ✉️ knoxvillehcc@gmail.com
          </a>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#334155' }}>
            Knoxville Hindu Community Center
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main registration form ─────────────────────────────────────────────────────
function RegistrationForm() {
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get('cancelled') === '1';

  const [publishStatus, setPublishStatus] = useState('loading');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', city: '', state: 'TN', zip: '',
    player_type: 'adult', team_name: '', registration_type: 'singles',
    event_date: '', skill_level: 'intermediate',
    player2_first_name: '', player2_last_name: '', player2_email: '',
    liability_accepted: false, terms_accepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Check publish status
  useEffect(() => {
    fetch('/api/pickleball/settings?key=is_published', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setPublishStatus((d.is_published === true || d.value === 'true') ? 'open' : 'closed'))
      .catch(() => setPublishStatus('closed'));
  }, []);

  const set       = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isDoubles = form.registration_type === 'doubles';
  const total     = isDoubles ? 50 : 25;

  const isValid =
    form.first_name && form.last_name && form.email && form.phone &&
    form.address && form.city && form.state && form.zip &&
    form.team_name && form.player_type &&
    form.liability_accepted && form.terms_accepted &&
    (!isDoubles || (form.player2_first_name && form.player2_last_name));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/pickleball/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Registration failed.'); setLoading(false); return; }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  // ── State gates ──────────────────────────────────────────────────────────────
  if (publishStatus === 'loading') return <LoadingScreen />;
  if (publishStatus === 'closed')  return <RegistrationClosed />;

  // ── Main form render ─────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${T.bg} 0%, #0D1525 55%, rgba(127,29,29,0.05) 100%)`,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#F1F5F9',
    }}>
      {/* Ambient background glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(245,158,11,0.04), transparent 65%)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(153,27,27,0.07), transparent 65%)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(16,185,129,0.02), transparent 70%)', borderRadius: '50%' }}/>
      </div>

      {/* ── Top nav bar ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(51,65,85,0.4)',
        background: 'rgba(10,15,30,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🏓</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#F1F5F9', lineHeight: 1.2 }}>HCC Pickleball</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Tournament Registration</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '5px 12px', borderRadius: '20px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }}/>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#10B981' }}>Registration Open</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '48px 24px 100px', position: 'relative' }}>

        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `${T.saffron}14`, border: `1px solid ${T.saffron}30`, padding: '6px 16px', borderRadius: '20px', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px' }}>🏆</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: T.saffron, letterSpacing: '0.5px' }}>KNOXVILLE HINDU COMMUNITY CENTER</span>
          </div>

          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Pickleball{' '}
            <span style={{ background: `linear-gradient(135deg, ${T.saffron}, ${T.gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Tournament
            </span>
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '16px' }}>Register your team · $25 per player · Secure Stripe payment</p>

          {/* Progress steps */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginTop: '32px', maxWidth: '460px', margin: '32px auto 0' }}>
            {['Contact', 'Team', 'Players', 'Legal', 'Pay'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', background: `${T.saffron}20`, color: T.saffron, border: `1.5px solid ${T.saffron}40` }}>{i + 1}</div>
                  <span style={{ fontSize: '10px', color: '#475569', fontWeight: '600' }}>{s}</span>
                </div>
                {i < 4 && <div style={{ height: '1px', flex: 1, background: 'rgba(51,65,85,0.6)', margin: '0 4px', marginBottom: '16px' }}/>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        {wasCancelled && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: '700', color: '#FCA5A5', fontSize: '14px' }}>Payment Cancelled</div>
              <div style={{ color: '#94A3B8', fontSize: '13px', marginTop: '2px' }}>Your registration was not completed. Please fill out the form again to proceed.</div>
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <div>
              <div style={{ fontWeight: '700', color: '#FCA5A5', fontSize: '14px' }}>Registration Error</div>
              <div style={{ color: '#94A3B8', fontSize: '13px', marginTop: '2px' }}>{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── STEP 1: Contact Info ───────────────────────────────────── */}
            <Section step={1} icon="👤" title="Your Contact Information">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <StyledInput label="First Name" required value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
                <StyledInput label="Last Name"  required value={form.last_name}  onChange={e => set('last_name',  e.target.value)} placeholder="Doe" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                <StyledInput label="Email Address" required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
                <StyledInput label="Phone Number"  required type="tel"   value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(865) 555-0100" />
              </div>
              <div style={{ marginTop: '14px' }}>
                <StyledInput label="Street Address" required value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main Street" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px', gap: '14px', marginTop: '14px' }}>
                <StyledInput label="City"     required value={form.city} onChange={e => set('city', e.target.value)} placeholder="Knoxville" />
                <StyledInput label="State"    required as="select" value={form.state} onChange={e => set('state', e.target.value)}>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </StyledInput>
                <StyledInput label="ZIP Code" required value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="37901" />
              </div>
            </Section>

            {/* ── STEP 2: Team & Player Type ────────────────────────────── */}
            <Section step={2} icon="🏆" title="Team & Player Type">
              <div style={{ marginBottom: '20px' }}>
                <StyledInput label="Team Name" required hint="For singles, you can use your own name" value={form.team_name} onChange={e => set('team_name', e.target.value)} placeholder="e.g. HCC Warriors" />
              </div>

              {/* Player Type */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                  Player Category <span style={{ color: T.saffron }}>*</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'adult',             emoji: '👤', label: 'Adult',               sub: '18 years & older' },
                    { value: 'middle_high_school', emoji: '🎓', label: 'Middle / High School', sub: 'Currently enrolled student' },
                  ].map(o => (
                    <ToggleCard key={o.value} selected={form.player_type === o.value} onClick={() => set('player_type', o.value)} accent={T.saffron}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{o.emoji}</div>
                      <div style={{ fontWeight: '800', fontSize: '14px', color: form.player_type === o.value ? T.saffron : '#F1F5F9', marginBottom: '3px' }}>{o.label}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{o.sub}</div>
                    </ToggleCard>
                  ))}
                </div>
              </div>

              {/* Registration Type */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                  Registration Type <span style={{ color: T.saffron }}>*</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'singles', emoji: '🎾', label: 'Singles', price: '$25', sub: '1 player' },
                    { value: 'doubles', emoji: '🤝', label: 'Doubles', price: '$50', sub: '2 players' },
                  ].map(o => (
                    <ToggleCard key={o.value} selected={form.registration_type === o.value} onClick={() => set('registration_type', o.value)} accent={T.green}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{o.emoji}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: form.registration_type === o.value ? T.green : '#F1F5F9', marginBottom: '3px' }}>{o.label}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{o.sub} · $25/player</div>
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '20px', color: T.green }}>{o.price}</div>
                      </div>
                    </ToggleCard>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── STEP 3: Players ───────────────────────────────────────── */}
            <Section step={3} icon="🏓" title="Player Details" accent={T.green}>
              {/* Player 1 — auto filled */}
              <div style={{ background: `${T.saffron}08`, border: `1px solid ${T.saffron}20`, borderRadius: '12px', padding: '16px 18px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: T.saffron, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  🏅 Player 1 (You — auto-filled)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ background: 'rgba(2,6,23,0.4)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '10px', color: '#475569', fontWeight: '600', marginBottom: '2px' }}>NAME</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: form.first_name ? '#F1F5F9' : '#334155' }}>
                      {form.first_name ? `${form.first_name} ${form.last_name}` : 'Fill in your name above'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(2,6,23,0.4)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '10px', color: '#475569', fontWeight: '600', marginBottom: '2px' }}>EMAIL</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: form.email ? '#F1F5F9' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {form.email || 'Fill in your email above'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Player 2 — doubles only */}
              {isDoubles ? (
                <div style={{ background: `${T.green}06`, border: `1px solid ${T.green}20`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: T.green, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                    🤝 Player 2 — Doubles Partner
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <StyledInput label="First Name" required value={form.player2_first_name} onChange={e => set('player2_first_name', e.target.value)} placeholder="Jane" />
                    <StyledInput label="Last Name"  required value={form.player2_last_name}  onChange={e => set('player2_last_name',  e.target.value)} placeholder="Doe" />
                  </div>
                  <StyledInput label="Email Address" type="email" hint="Confirmation email will be sent here" value={form.player2_email} onChange={e => set('player2_email', e.target.value)} placeholder="partner@example.com" />
                </div>
              ) : (
                <div style={{ background: 'rgba(2,6,23,0.3)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: '12px', padding: '16px 18px', textAlign: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Select <strong style={{ color: '#64748B' }}>Doubles</strong> in Step 2 to add a second player</span>
                </div>
              )}
            </Section>

            {/* ── STEP 4: Liability Waiver ──────────────────────────────── */}
            <Section step={4} icon="📋" title="Liability Waiver" accent="#EF4444">
              <div style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '10px', padding: '16px', marginBottom: '18px', fontSize: '13px', color: '#64748B', lineHeight: '1.75', maxHeight: '150px', overflowY: 'auto' }}>
                {LIABILITY_TEXT}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', padding: '14px 16px', borderRadius: '12px', background: form.liability_accepted ? 'rgba(245,158,11,0.06)' : 'rgba(2,6,23,0.3)', border: `1px solid ${form.liability_accepted ? 'rgba(245,158,11,0.25)' : 'rgba(51,65,85,0.4)'}`, transition: 'all 0.2s' }}>
                <input type="checkbox" checked={form.liability_accepted} onChange={e => set('liability_accepted', e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '1px', accentColor: T.saffron, cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.5' }}>
                  I have read and agree to the <strong style={{ color: '#F1F5F9' }}>Liability Waiver</strong> on behalf of myself and all registered players.{' '}
                  <span style={{ color: T.saffron }}>*</span>
                </span>
              </label>
            </Section>

            {/* ── STEP 4b: Terms & Conditions ───────────────────────────── */}
            <Section step="4b" icon="📄" title="Terms & Conditions" accent="#EF4444">
              <div style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '10px', padding: '16px', marginBottom: '18px', fontSize: '13px', color: '#64748B', lineHeight: '1.75', maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-line' }}>
                {TERMS_TEXT}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', padding: '14px 16px', borderRadius: '12px', background: form.terms_accepted ? 'rgba(245,158,11,0.06)' : 'rgba(2,6,23,0.3)', border: `1px solid ${form.terms_accepted ? 'rgba(245,158,11,0.25)' : 'rgba(51,65,85,0.4)'}`, transition: 'all 0.2s' }}>
                <input type="checkbox" checked={form.terms_accepted} onChange={e => set('terms_accepted', e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '1px', accentColor: T.saffron, cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.5' }}>
                  I have read and agree to the <strong style={{ color: '#F1F5F9' }}>Terms & Conditions</strong>.{' '}
                  <span style={{ color: T.saffron }}>*</span>
                </span>
              </label>
            </Section>

            {/* ── STEP 5: Payment & Submit ──────────────────────────────── */}
            <Section step={5} icon="💳" title="Payment" accent={T.green}>
              {/* Order summary */}
              <div style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Order Summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#F1F5F9' }}>
                      {isDoubles ? 'Doubles Registration' : 'Singles Registration'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {isDoubles ? '2 players' : '1 player'} × $25.00 per player
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#F1F5F9' }}>${total}.00</div>
                </div>
                {form.team_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>Team</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#F1F5F9' }}>{form.team_name}</span>
                  </div>
                )}
                {form.player_type && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>Category</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#F1F5F9' }}>
                      {form.player_type === 'middle_high_school' ? '🎓 Middle / High School' : '👤 Adult'}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#F1F5F9' }}>Total Due</span>
                  <span style={{ fontSize: '36px', fontWeight: '900', color: T.green, letterSpacing: '-1px' }}>${total}.00</span>
                </div>
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(16,185,129,0.05)', borderRadius: '8px', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔒 Secure checkout powered by <strong style={{ color: '#64748B' }}>Stripe</strong> · Visa, Mastercard, Amex, Discover
                </div>
              </div>

              {/* Requirement checklist */}
              {!isValid && (
                <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: T.saffron, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Complete to continue:</div>
                  {[
                    { done: !!(form.first_name && form.last_name && form.email && form.phone), label: 'Contact information' },
                    { done: !!(form.address && form.city && form.zip),                         label: 'Address' },
                    { done: !!form.team_name,                                                  label: 'Team name' },
                    { done: !isDoubles || !!(form.player2_first_name && form.player2_last_name), label: 'Player 2 details (doubles)' },
                    { done: form.liability_accepted,                                            label: 'Liability waiver accepted' },
                    { done: form.terms_accepted,                                                label: 'Terms & Conditions accepted' },
                  ].filter(item => !isDoubles ? item.label !== 'Player 2 details (doubles)' : true).map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px' }}>{item.done ? '✅' : '⬜'}</span>
                      <span style={{ fontSize: '13px', color: item.done ? '#64748B' : '#94A3B8', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit button */}
              <button type="submit" disabled={loading || !isValid} style={{
                width: '100%', padding: '18px 24px', borderRadius: '14px', border: 'none',
                background: loading || !isValid
                  ? 'rgba(30,41,59,0.5)'
                  : `linear-gradient(135deg, ${T.saffron} 0%, ${T.gold} 100%)`,
                color: loading || !isValid ? '#475569' : '#000',
                fontSize: '17px', fontWeight: '900', cursor: loading || !isValid ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                transition: 'all 0.3s', letterSpacing: '0.3px',
                boxShadow: !loading && isValid ? `0 0 40px ${T.saffron}40, 0 4px 24px rgba(0,0,0,0.3)` : 'none',
                transform: !loading && isValid ? 'translateY(0)' : 'none',
              }}>
                {loading ? (
                  <>
                    <span style={{ width: '20px', height: '20px', border: '2.5px solid rgba(0,0,0,0.2)', borderTop: '2.5px solid black', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }}/>
                    Redirecting to secure checkout...
                  </>
                ) : (
                  <>🏓 Register &amp; Pay ${total}.00 →</>
                )}
              </button>
            </Section>

          </div>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', borderTop: '1px solid rgba(51,65,85,0.3)' }}>
          <div style={{ fontSize: '13px', color: '#334155', marginBottom: '6px' }}>Knoxville Hindu Community Center · Pickleball Tournament</div>
          <a href="mailto:knoxvillehcc@gmail.com" style={{ color: T.saffron, textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
            knoxvillehcc@gmail.com
          </a>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.6} }
        input::placeholder, textarea::placeholder { color: #334155 !important; }
        select option { background: #0D1525; color: #F1F5F9; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(51,65,85,0.7); border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ── Root export with Suspense ──────────────────────────────────────────────────
export default function PickleballRegisterPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RegistrationForm />
    </Suspense>
  );
}
