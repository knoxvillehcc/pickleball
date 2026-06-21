'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Constants ──────────────────────────────────────────────────────────────────
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const TERMS_TEXT = `1. ELIGIBILITY: Participants must be currently enrolled students (Middle/High School category) or adults 18+ (Adult category).\n\n2. CONDUCT: All participants are expected to maintain sportsmanlike conduct. Unsportsmanlike behavior may result in disqualification without refund.\n\n3. REFUND POLICY: Registration fees are non-refundable once payment is processed. In case of event cancellation by HCC, a full refund will be issued.\n\n4. MEDIA CONSENT: By registering, you consent to HCC photographing and/or recording the event for promotional use.\n\n5. EQUIPMENT: Players are responsible for bringing their own paddles. Balls will be provided by HCC. Paddle rental available for $5.\n\n6. SCHEDULE: HCC reserves the right to modify event schedule, format, and rules. Registered participants will be notified of any changes.\n\n7. CODE OF CONDUCT: Zero tolerance for harassment, discrimination, or inappropriate behavior of any kind.`;

const LIABILITY_TEXT = `I, the undersigned, acknowledge that participation in pickleball activities organized by the Knoxville Hindu Community Center (HCC) involves inherent risks of physical injury, including but not limited to sprains, fractures, or other physical harm. I voluntarily assume all risks associated with participation. I agree to release, indemnify, and hold harmless HCC, its officers, directors, volunteers, employees, and agents from any and all claims, damages, losses, or liabilities arising out of or related to my participation or the participation of any player I am registering. I confirm that all players listed are in good physical condition and capable of participating. I have read this waiver fully and agree to be bound by its terms on behalf of myself and all listed players.`;

// ── Design tokens matching the flyer ──────────────────────────────────────────
const T = {
  navy:    '#04111F',
  navyMid: '#071A2E',
  navyCard:'rgba(7,26,50,0.85)',
  lime:    '#A8D62E',
  limeDark:'#85AB22',
  teal:    '#0E9E8A',
  tealDark:'#0A7B6B',
  yellow:  '#F5C518',
  white:   '#FFFFFF',
  light:   '#E2EAF4',
  muted:   '#6B8BAE',
  border:  'rgba(168,214,46,0.15)',
  borderGray: 'rgba(255,255,255,0.08)',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function Field({ label, required, hint, type = 'text', value, onChange, placeholder, children, as = 'input' }) {
  const [focused, setFocused] = useState(false);
  const base = {
    width: '100%', padding: '13px 16px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)',
    border: `1.5px solid ${focused ? T.lime : 'rgba(255,255,255,0.1)'}`,
    color: T.white, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    boxShadow: focused ? `0 0 0 3px rgba(168,214,46,0.12)` : 'none',
    transition: 'all 0.2s',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {label}{required && <span style={{ color: T.lime, marginLeft: '3px' }}>*</span>}
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

function Card({ title, icon, accent = T.lime, children, noPad }) {
  return (
    <div style={{ background: T.navyCard, border: `1px solid ${accent}22`, borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', gap: '12px', background: `${accent}08` }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${accent}20`, border: `1px solid ${accent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>{icon}</div>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: T.white, letterSpacing: '0.2px' }}>{title}</h2>
      </div>
      <div style={noPad ? {} : { padding: '24px' }}>{children}</div>
    </div>
  );
}

function BracketPill({ emoji, label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center',
      border: `2px solid ${selected ? T.teal : 'rgba(255,255,255,0.08)'}`,
      background: selected ? `${T.teal}18` : 'rgba(255,255,255,0.03)',
      boxShadow: selected ? `0 0 20px ${T.teal}30` : 'none',
      transition: 'all 0.2s', fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{emoji}</div>
      <div style={{ fontSize: '13px', fontWeight: '800', color: selected ? T.teal : T.light, lineHeight: 1.3 }}>{label}</div>
    </button>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '52px', height: '52px', border: `3px solid rgba(168,214,46,0.2)`, borderTop: `3px solid ${T.lime}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
        <p style={{ color: T.muted, fontSize: '14px' }}>Loading registration...</p>
      </div>
    </div>
  );
}

function RegistrationClosed() {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${T.navy}, ${T.navyMid})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '24px', background: `linear-gradient(135deg, ${T.teal}, ${T.tealDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px', margin: '0 auto 24px', boxShadow: `0 0 50px ${T.teal}40` }}>🏓</div>
        <h1 style={{ margin: '0 0 12px', fontSize: '32px', fontWeight: '900', color: T.white, letterSpacing: '-0.5px' }}>Registration Closed</h1>
        <p style={{ color: T.muted, fontSize: '15px', lineHeight: '1.7', margin: '0 0 32px' }}>The HCC Pickleball Tournament registration is not currently open. Contact us to be notified when it opens.</p>
        <a href="mailto:knoxvillehcc@gmail.com?subject=Pickleball Registration Inquiry" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: T.lime, fontWeight: '700', fontSize: '15px', textDecoration: 'none', padding: '12px 24px', borderRadius: '12px', background: `${T.lime}12`, border: `1px solid ${T.lime}30` }}>
          ✉️ knoxvillehcc@gmail.com
        </a>
        <div style={{ marginTop: '12px', fontSize: '12px', color: T.muted }}>Knoxville Hindu Community Center</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────────
function RegistrationForm() {
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get('cancelled') === '1';

  const [publishStatus, setPublishStatus] = useState('loading');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', city: '', state: 'TN', zip: '',
    player_type: 'adult', team_name: '', registration_type: 'doubles',
    event_date: '', skill_level: 'intermediate',
    player2_first_name: '', player2_last_name: '', player2_email: '',
    liability_accepted: false, terms_accepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  if (publishStatus === 'loading') return <LoadingScreen />;
  if (publishStatus === 'closed')  return <RegistrationClosed />;

  return (
    <div style={{ minHeight: '100vh', background: T.navy, fontFamily: "'Inter', sans-serif", color: T.white }}>

      {/* ── Animated background ────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '700px', height: '700px', background: `radial-gradient(circle, ${T.lime}08, transparent 60%)`, borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '-15%', left: '-8%', width: '600px', height: '600px', background: `radial-gradient(circle, ${T.teal}0A, transparent 60%)`, borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%,-50%)', width: '900px', height: '300px', background: `radial-gradient(ellipse, ${T.lime}04, transparent 65%)` }}/>
      </div>

      {/* ── Sticky top nav ─────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid rgba(255,255,255,0.06)`, background: 'rgba(4,17,31,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '0 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `linear-gradient(135deg, ${T.lime}, ${T.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏓</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '900', color: T.white, letterSpacing: '-0.2px' }}>HCC Youth Club</div>
              <div style={{ fontSize: '11px', color: T.muted, fontWeight: '600' }}>Pickleball Tournament · July 11, 2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: `${T.lime}12`, border: `1px solid ${T.lime}30`, padding: '6px 14px', borderRadius: '20px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: T.lime, display: 'inline-block', boxShadow: `0 0 8px ${T.lime}` }}/>
            <span style={{ fontSize: '12px', fontWeight: '800', color: T.lime }}>Registration Open</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── HERO SECTION ───────────────────────────────────────────────────── */}
        <div style={{ paddingTop: '52px', paddingBottom: '48px', textAlign: 'center' }}>
          {/* Org badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `${T.teal}18`, border: `1px solid ${T.teal}35`, padding: '6px 16px', borderRadius: '20px', marginBottom: '22px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: T.teal, letterSpacing: '1px' }}>HCC YOUTH CLUB PRESENTS</span>
          </div>

          {/* Title */}
          <h1 style={{ margin: '0 0 4px', fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: '900', letterSpacing: '-2px', lineHeight: 0.95, textTransform: 'uppercase', color: T.white }}>
            Pickleball
          </h1>
          <h1 style={{ margin: '0 0 28px', fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: '900', letterSpacing: '-2px', lineHeight: 0.95, textTransform: 'uppercase', color: T.lime }}>
            Tournament
          </h1>

          {/* ── Tournament info cards ────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {[
              { icon: '📅', label: 'Date', value: 'Saturday', sub: 'July 11, 2026' },
              { icon: '⏰', label: 'Start Time', value: '12:00 PM', sub: 'Doors open early' },
              { icon: '📍', label: 'Location', value: 'Lenoir City', sub: '8580 Hickory Creek Rd, TN' },
              { icon: '💰', label: 'Entry Fee', value: '$25/player', sub: 'Doubles only · $50/team' },
            ].map(info => (
              <div key={info.label} style={{ background: `${T.navyCard}`, border: `1px solid rgba(255,255,255,0.07)`, borderRadius: '14px', padding: '16px', textAlign: 'left', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>{info.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{info.label}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: T.white, letterSpacing: '-0.3px' }}>{info.value}</div>
                <div style={{ fontSize: '11px', color: T.muted, marginTop: '2px' }}>{info.sub}</div>
              </div>
            ))}
          </div>

          {/* Brackets row */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[
              { bg: T.teal, text: '🎓 Middle School & High School' },
              { bg: T.lime, text: '👤 Adults' },
            ].map(b => (
              <div key={b.text} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${b.bg}20`, border: `1px solid ${b.bg}40`, padding: '7px 16px', borderRadius: '20px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: b.bg }}>{b.text}</span>
              </div>
            ))}
          </div>

          {/* Tag line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>🏆 Compete. Have Fun. Build Community.</span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span>🏓 All Skill Levels Welcome</span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span>🎾 Paddle Rental $5</span>
          </div>
        </div>

        {/* ── Alerts ─────────────────────────────────────────────────────────── */}
        {wasCancelled && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: '800', color: '#FCA5A5', fontSize: '14px' }}>Payment Cancelled</div>
              <div style={{ color: T.muted, fontSize: '13px', marginTop: '2px' }}>Your registration was not completed. Fill out the form again to proceed.</div>
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <div>
              <div style={{ fontWeight: '800', color: '#FCA5A5', fontSize: '14px' }}>Registration Error</div>
              <div style={{ color: T.muted, fontSize: '13px', marginTop: '2px' }}>{error}</div>
            </div>
          </div>
        )}

        {/* ── FORM ───────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* STEP 1: Contact */}
            <Card title="Your Contact Information" icon="👤">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="First Name" required value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
                <Field label="Last Name"  required value={form.last_name}  onChange={e => set('last_name',  e.target.value)} placeholder="Doe" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                <Field label="Email Address" required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
                <Field label="Phone Number"  required type="tel"   value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(865) 555-0100" />
              </div>
              <div style={{ marginTop: '14px' }}>
                <Field label="Street Address" required value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main Street" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px', gap: '14px', marginTop: '14px' }}>
                <Field label="City"     required value={form.city}  onChange={e => set('city',  e.target.value)} placeholder="Knoxville" />
                <Field label="State"    required as="select" value={form.state} onChange={e => set('state', e.target.value)}>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </Field>
                <Field label="ZIP Code" required value={form.zip}   onChange={e => set('zip',   e.target.value)} placeholder="37901" />
              </div>
            </Card>

            {/* STEP 2: Team & Bracket */}
            <Card title="Team & Player Category" icon="🏆" accent={T.lime}>
              {/* Team name */}
              <div style={{ marginBottom: '20px' }}>
                <Field label="Team Name" required hint="Give your team a fun name!" value={form.team_name} onChange={e => set('team_name', e.target.value)} placeholder="e.g. HCC Warriors" />
              </div>

              {/* Bracket */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Player Category <span style={{ color: T.lime }}>*</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <BracketPill emoji="🎓" label={'Middle School &\nHigh School'} selected={form.player_type === 'middle_high_school'} onClick={() => set('player_type', 'middle_high_school')} />
                  <BracketPill emoji="👤" label="Adults (18+)" selected={form.player_type === 'adult'} onClick={() => set('player_type', 'adult')} />
                </div>
              </div>

              {/* Registration type */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Registration Type <span style={{ color: T.lime }}>*</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { value: 'doubles', emoji: '🤝', label: 'Doubles', price: '$50', note: '2 players · $25/player', badge: 'FEATURED', badgeColor: T.lime },
                    { value: 'singles', emoji: '🎾', label: 'Singles', price: '$25', note: '1 player', badge: null, badgeColor: T.teal },
                  ].map(o => (
                    <button key={o.value} type="button" onClick={() => set('registration_type', o.value)} style={{
                      padding: '16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      border: `2px solid ${form.registration_type === o.value ? T.lime : 'rgba(255,255,255,0.08)'}`,
                      background: form.registration_type === o.value ? `${T.lime}12` : 'rgba(255,255,255,0.02)',
                      boxShadow: form.registration_type === o.value ? `0 0 24px ${T.lime}20` : 'none',
                      transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                    }}>
                      {o.badge && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', fontWeight: '900', color: '#000', background: o.badgeColor, padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.5px' }}>{o.badge}</div>
                      )}
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{o.emoji}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '15px', color: form.registration_type === o.value ? T.lime : T.white, marginBottom: '2px' }}>{o.label}</div>
                          <div style={{ fontSize: '12px', color: T.muted }}>{o.note}</div>
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '22px', color: T.lime }}>{o.price}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* STEP 3: Players */}
            <Card title="Player Details" icon="🏓" accent={T.teal}>
              {/* Player 1 — auto filled */}
              <div style={{ background: `${T.lime}08`, border: `1px solid ${T.lime}20`, borderRadius: '12px', padding: '16px 18px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: T.lime, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  🏅 Player 1 (You — auto-filled from Step 1)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { label: 'NAME',  val: form.first_name ? `${form.first_name} ${form.last_name}` : 'Fill in your name above' },
                    { label: 'EMAIL', val: form.email || 'Fill in your email above' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '10px', color: T.muted, fontWeight: '700', marginBottom: '3px' }}>{item.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player 2 */}
              {isDoubles ? (
                <div style={{ background: `${T.teal}08`, border: `1px solid ${T.teal}25`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: T.teal, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                    🤝 Player 2 — Your Doubles Partner
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <Field label="First Name" required value={form.player2_first_name} onChange={e => set('player2_first_name', e.target.value)} placeholder="Jane" />
                    <Field label="Last Name"  required value={form.player2_last_name}  onChange={e => set('player2_last_name',  e.target.value)} placeholder="Doe" />
                  </div>
                  <Field label="Partner Email" type="email" hint="Confirmation will be sent here too" value={form.player2_email} onChange={e => set('player2_email', e.target.value)} placeholder="partner@example.com" />
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', textAlign: 'center', color: T.muted, fontSize: '13px' }}>
                  Switch to <strong style={{ color: T.lime }}>Doubles</strong> in Step 2 to add your partner
                </div>
              )}
            </Card>

            {/* STEP 4: Waivers */}
            <Card title="Liability Waiver & Terms" icon="📋" accent="#EF4444">
              {/* Liability */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Liability Waiver</div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px', fontSize: '13px', color: T.muted, lineHeight: '1.75', maxHeight: '130px', overflowY: 'auto' }}>
                  {LIABILITY_TEXT}
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', padding: '14px 16px', borderRadius: '12px', background: form.liability_accepted ? `${T.lime}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${form.liability_accepted ? T.lime + '30' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={form.liability_accepted} onChange={e => set('liability_accepted', e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '1px', accentColor: T.lime, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.5' }}>
                    I have read and agree to the <strong style={{ color: T.white }}>Liability Waiver</strong> on behalf of all registered players. <span style={{ color: T.lime }}>*</span>
                  </span>
                </label>
              </div>

              {/* Terms */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Terms & Conditions</div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px', fontSize: '13px', color: T.muted, lineHeight: '1.75', maxHeight: '130px', overflowY: 'auto', whiteSpace: 'pre-line' }}>
                  {TERMS_TEXT}
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', padding: '14px 16px', borderRadius: '12px', background: form.terms_accepted ? `${T.lime}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${form.terms_accepted ? T.lime + '30' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={form.terms_accepted} onChange={e => set('terms_accepted', e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '1px', accentColor: T.lime, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.5' }}>
                    I have read and agree to the <strong style={{ color: T.white }}>Terms & Conditions</strong>. <span style={{ color: T.lime }}>*</span>
                  </span>
                </label>
              </div>
            </Card>

            {/* STEP 5: Payment */}
            <Card title="Review & Pay" icon="💳" accent={T.lime}>
              {/* Order summary */}
              <div style={{ background: `${T.navyMid}`, border: `1px solid ${T.lime}18`, borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '16px' }}>Order Summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: T.white }}>{isDoubles ? 'Doubles Registration' : 'Singles Registration'}</div>
                    <div style={{ fontSize: '12px', color: T.muted, marginTop: '3px' }}>{isDoubles ? '2 players' : '1 player'} × $25.00 per player</div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: T.white }}>${total}.00</div>
                </div>
                {form.team_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                    <span style={{ fontSize: '13px', color: T.muted }}>Team</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: T.white }}>{form.team_name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                  <span style={{ fontSize: '13px', color: T.muted }}>Bracket</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: T.white }}>{form.player_type === 'middle_high_school' ? '🎓 Middle / High School' : '👤 Adult'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                  <span style={{ fontSize: '13px', color: T.muted }}>Date</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: T.white }}>Saturday, July 11, 2026</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: T.white }}>Total Due</span>
                  <span style={{ fontSize: '40px', fontWeight: '900', color: T.lime, letterSpacing: '-2px' }}>${total}.00</span>
                </div>
                <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: T.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔒 Secure checkout via <strong style={{ color: '#94A3B8' }}>Stripe</strong> · Visa, Mastercard, Amex, Discover
                </div>
              </div>

              {/* Checklist */}
              {!isValid && (
                <div style={{ background: `${T.lime}06`, border: `1px solid ${T.lime}18`, borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: T.lime, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Complete to continue:</div>
                  {[
                    { done: !!(form.first_name && form.last_name && form.email && form.phone), label: 'Contact information' },
                    { done: !!(form.address && form.city && form.zip),                         label: 'Address' },
                    { done: !!form.team_name,                                                  label: 'Team name' },
                    { done: !isDoubles || !!(form.player2_first_name && form.player2_last_name), label: 'Player 2 details' },
                    { done: form.liability_accepted,                                            label: 'Liability waiver' },
                    { done: form.terms_accepted,                                                label: 'Terms & Conditions' },
                  ].filter(item => !isDoubles ? item.label !== 'Player 2 details' : true).map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px' }}>{item.done ? '✅' : '⬜'}</span>
                      <span style={{ fontSize: '13px', color: item.done ? T.muted : '#94A3B8', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading || !isValid} style={{
                width: '100%', padding: '20px 24px', borderRadius: '14px', border: 'none',
                background: loading || !isValid
                  ? 'rgba(255,255,255,0.06)'
                  : `linear-gradient(135deg, ${T.lime} 0%, ${T.limeDark} 100%)`,
                color: loading || !isValid ? T.muted : '#06130A',
                fontSize: '18px', fontWeight: '900', cursor: loading || !isValid ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                transition: 'all 0.3s', letterSpacing: '0.3px', fontFamily: 'inherit',
                boxShadow: !loading && isValid ? `0 0 50px ${T.lime}35, 0 4px 24px rgba(0,0,0,0.3)` : 'none',
                transform: !loading && isValid ? 'translateY(-1px)' : 'none',
              }}>
                {loading ? (
                  <>
                    <span style={{ width: '20px', height: '20px', border: `2.5px solid rgba(6,19,10,0.2)`, borderTop: '2.5px solid #06130A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }}/>
                    Redirecting to secure checkout...
                  </>
                ) : (
                  <>🏓 Register & Pay ${total}.00 →</>
                )}
              </button>
            </Card>

          </div>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px', padding: '24px 0', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
          <div style={{ fontSize: '13px', color: T.muted, marginBottom: '6px' }}>Knoxville Hindu Community Center · HCC Youth Club Presents</div>
          <a href="mailto:knoxvillehcc@gmail.com" style={{ color: T.lime, textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>knoxvillehcc@gmail.com</a>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(107,139,174,0.5)' }}>8580 Hickory Creek Rd, Lenoir City, TN 37771</div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: rgba(107,139,174,0.6) !important; }
        select option { background: #071A2E; color: #E2EAF4; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(168,214,46,0.2); border-radius: 2px; }
        button:hover { filter: brightness(1.05); }
      `}</style>
    </div>
  );
}

export default function PickleballRegisterPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RegistrationForm />
    </Suspense>
  );
}
