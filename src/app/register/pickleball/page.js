'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Constants ──────────────────────────────────────────────────────────────────
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const TERMS_TEXT = `1. ELIGIBILITY: Participants must be currently enrolled students (Middle/High School category) or adults 18+ (Adult category).\n\n2. CONDUCT: All participants are expected to maintain sportsmanlike conduct. Unsportsmanlike behavior may result in disqualification without refund.\n\n3. REFUND POLICY: Registration fees are non-refundable once payment is processed. In case of event cancellation by HCC, a full refund will be issued.\n\n4. MEDIA CONSENT: By registering, you consent to HCC photographing and/or recording the event for promotional use.\n\n5. EQUIPMENT: Players are responsible for bringing their own paddles. Balls will be provided by HCC. Paddle rental available for $5.\n\n6. SCHEDULE: HCC reserves the right to modify event schedule, format, and rules. Registered participants will be notified of any changes.\n\n7. CODE OF CONDUCT: Zero tolerance for harassment, discrimination, or inappropriate behavior of any kind.`;

const LIABILITY_TEXT = `I, the undersigned, acknowledge that participation in pickleball activities organized by the Knoxville Hindu Community Center (HCC) involves inherent risks of physical injury, including but not limited to sprains, fractures, or other physical harm. I voluntarily assume all risks associated with participation. I agree to release, indemnify, and hold harmless HCC, its officers, directors, volunteers, employees, and agents from any and all claims, damages, losses, or liabilities arising out of or related to my participation or the participation of any player I am registering. I confirm that all players listed are in good physical condition and capable of participating. I have read this waiver fully and agree to be bound by its terms on behalf of myself and all listed players.`;

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  navy:    '#04111F',
  navyMid: '#071A2E',
  navyCard:'rgba(7,26,50,0.85)',
  lime:    '#A8D62E',
  limeDark:'#85AB22',
  teal:    '#0E9E8A',
  tealDark:'#0A7B6B',
  white:   '#FFFFFF',
  light:   '#E2EAF4',
  muted:   '#6B8BAE',
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

function Card({ title, icon, accent = T.lime, children }) {
  return (
    <div style={{ background: T.navyCard, border: `1px solid ${accent}22`, borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', gap: '12px', background: `${accent}08` }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${accent}20`, border: `1px solid ${accent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>{icon}</div>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: T.white, letterSpacing: '0.2px' }}>{title}</h2>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}

function BracketPill({ icon, label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center',
      border: `2px solid ${selected ? T.teal : 'rgba(255,255,255,0.08)'}`,
      background: selected ? `${T.teal}18` : 'rgba(255,255,255,0.03)',
      boxShadow: selected ? `0 0 20px ${T.teal}30` : 'none',
      transition: 'all 0.2s', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center'
    }}>
      <div style={{ color: selected ? T.teal : T.muted, transition: 'color 0.2s' }}>{icon}</div>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RegistrationClosed() {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${T.navy}, ${T.navyMid})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '24px', background: `linear-gradient(135deg, ${T.teal}, ${T.tealDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: `0 0 50px ${T.teal}40` }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.1" />
            <path d="m15 15 5 5" />
            <circle cx="18" cy="8" r="2" fill="currentColor" />
          </svg>
        </div>
        <h1 style={{ margin: '0 0 12px', fontSize: '32px', fontWeight: '900', color: T.white, letterSpacing: '-0.5px' }}>Registration Closed</h1>
        <p style={{ color: T.muted, fontSize: '15px', lineHeight: '1.7', margin: '0 0 32px' }}>The HCC Pickleball Tournament registration is not currently open. Contact us to be notified when it opens.</p>
        <a href="mailto:knoxvillehcc@gmail.com?subject=Pickleball Registration Inquiry" style={{ display: 'inline-flex', alignItems: 'center', color: T.lime, fontWeight: '700', fontSize: '15px', textDecoration: 'none', padding: '12px 24px', borderRadius: '12px', background: `${T.lime}12`, border: `1px solid ${T.lime}30` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          knoxvillehcc@gmail.com
        </a>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <a href="tel:8659249286" style={{ color: T.muted, textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}><span style={{ color: T.lime }}>Love</span> · 865-924-9286</a>
          <a href="tel:8653154494" style={{ color: T.muted, textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}><span style={{ color: T.lime }}>Om</span> · 865-315-4494</a>
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: T.muted }}>Knoxville Hindu Community Center</div>
      </div>
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
    player_type: 'adult', team_name: '',
    registration_type: 'doubles',
    event_date: '', skill_level: 'intermediate',
    player2_first_name: '', player2_last_name: '', player2_email: '',
    liability_accepted: false, terms_accepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch('/api/pickleball/settings?key=is_published', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setPublishStatus((d.is_published === true || d.value === 'true') ? 'open' : 'closed'))
      .catch(() => setPublishStatus('closed'));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Doubles-only — always $50
  const TOTAL = 50;

  // Both players required — no singles path
  const isValid =
    form.first_name && form.last_name && form.email && form.phone &&
    form.address && form.city && form.state && form.zip &&
    form.team_name && form.player_type &&
    form.player2_first_name && form.player2_last_name &&
    form.liability_accepted && form.terms_accepted;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/pickleball/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, registration_type: 'doubles' }),
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

      {/* Animated background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '700px', height: '700px', background: `radial-gradient(circle, ${T.lime}08, transparent 60%)`, borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '-15%', left: '-8%', width: '600px', height: '600px', background: `radial-gradient(circle, ${T.teal}0A, transparent 60%)`, borderRadius: '50%' }}/>
      </div>

      {/* Sticky nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid rgba(255,255,255,0.06)`, background: 'rgba(4,17,31,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '0 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `linear-gradient(135deg, ${T.lime}, ${T.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.navy }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.1" />
                <path d="m15 15 5 5" />
                <circle cx="18" cy="8" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '900', color: T.white }}>HCC Youth Club</div>
              <div style={{ fontSize: '11px', color: T.muted, fontWeight: '600' }}>Pickleball Tournament · July 26, 2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: `${T.lime}12`, border: `1px solid ${T.lime}30`, padding: '6px 14px', borderRadius: '20px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: T.lime, display: 'inline-block', boxShadow: `0 0 8px ${T.lime}` }}/>
            <span style={{ fontSize: '12px', fontWeight: '800', color: T.lime }}>Registration Open</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 80px', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <div style={{ paddingTop: '52px', paddingBottom: '48px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `${T.teal}18`, border: `1px solid ${T.teal}35`, padding: '6px 16px', borderRadius: '20px', marginBottom: '22px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: T.teal, letterSpacing: '1px' }}>HCC YOUTH CLUB PRESENTS</span>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 'clamp(40px,8vw,72px)', fontWeight: '900', letterSpacing: '-2px', lineHeight: 0.95, textTransform: 'uppercase', color: T.white }}>Pickleball</h1>
          <h1 style={{ margin: '0 0 28px', fontSize: 'clamp(40px,8vw,72px)', fontWeight: '900', letterSpacing: '-2px', lineHeight: 0.95, textTransform: 'uppercase', color: T.lime }}>Tournament</h1>

          {/* Info cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px', marginBottom: '28px' }}>
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                ),
                color: T.lime,
                label: 'Date',
                value: 'Sunday',
                sub: 'July 26, 2026'
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                ),
                color: T.teal,
                label: 'Start Time',
                value: '12:00 PM',
                sub: 'Doors open early'
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                ),
                color: T.lime,
                label: 'Location',
                value: 'Lenoir City',
                sub: '8580 Hickory Creek Rd, TN'
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                ),
                color: T.teal,
                label: 'Entry Fee',
                value: '$25/player',
                sub: 'Doubles only · $50/team'
              },
            ].map(info => (
              <div key={info.label} style={{
                background: T.navyCard,
                border: `1.5px solid ${info.color}35`,
                borderRadius: '14px',
                padding: '18px 16px',
                textAlign: 'left',
                boxShadow: `0 8px 30px rgba(0,0,0,0.4), inset 0 0 12px ${info.color}08`,
                transition: 'transform 0.2s, border-color 0.2s',
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: `${info.color}15`,
                  border: `1.2px solid ${info.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: info.color
                }}>
                  {info.icon}
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '4px' }}>{info.label}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: T.white, letterSpacing: '-0.3px' }}>{info.value}</div>
                <div style={{ fontSize: '11px', color: T.muted, marginTop: '2px', lineHeight: '1.3' }}>{info.sub}</div>
              </div>
            ))}
          </div>

          {/* Brackets */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[{ bg: T.teal, text: 'Middle School & High School' }, { bg: T.lime, text: 'Adults (18+)' }].map(b => (
              <div key={b.text} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${b.bg}20`, border: `1px solid ${b.bg}40`, padding: '7px 16px', borderRadius: '20px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: b.bg }}>{b.text}</span>
              </div>
            ))}
          </div>

          {/* Tag line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>Compete. Have Fun. Build Community.</span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span>All Skill Levels Welcome</span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span>Paddle Rental $5</span>
          </div>

          {/* Contact */}
          <div style={{ marginTop: '20px', padding: '14px 20px', background: T.navyCard, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '14px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: T.teal, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Contact for Inquiries
            </div>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }}/>
            <a href="tel:8659249286" style={{ color: T.white, textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
              <span style={{ color: T.lime }}>Love</span> 865-924-9286
            </a>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <a href="tel:8653154494" style={{ color: T.white, textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
              <span style={{ color: T.lime }}>Om</span> 865-315-4494
            </a>
          </div>
        </div>

        {/* Alerts */}
        {wasCancelled && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <div style={{ fontWeight: '800', color: '#FCA5A5', fontSize: '14px' }}>Payment Cancelled</div>
              <div style={{ color: T.muted, fontSize: '13px', marginTop: '2px' }}>Your registration was not completed. Fill out the form again to proceed.</div>
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <div>
              <div style={{ fontWeight: '800', color: '#FCA5A5', fontSize: '14px' }}>Registration Error</div>
              <div style={{ color: T.muted, fontSize: '13px', marginTop: '2px' }}>{error}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Step 1: Contact */}
            <Card title="Your Contact Information" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            } accent={T.lime}>
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

            {/* Step 2: Team & Bracket */}
            <Card title="Team & Player Category" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                <path d="M12 2a5 5 0 0 0-5 5v3c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V7a5 5 0 0 0-5-5z" />
              </svg>
            } accent={T.lime}>
              <div style={{ marginBottom: '20px' }}>
                <Field label="Team Name" required hint="Give your team a fun name!" value={form.team_name} onChange={e => set('team_name', e.target.value)} placeholder="e.g. HCC Warriors" />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Player Category <span style={{ color: T.lime }}>*</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <BracketPill icon={
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  } label={'Middle School &\nHigh School'} selected={form.player_type === 'middle_high_school'} onClick={() => set('player_type', 'middle_high_school')} />
                  <BracketPill icon={
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  } label="Adults (18+)" selected={form.player_type === 'adult'} onClick={() => set('player_type', 'adult')} />
                </div>
              </div>

              {/* Doubles-only badge */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Registration Type</div>
                <div style={{ padding: '18px 20px', borderRadius: '14px', border: `2px solid ${T.lime}`, background: `${T.lime}12`, boxShadow: `0 0 28px ${T.lime}18`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '9px', fontWeight: '900', color: '#000', background: T.lime, padding: '2px 8px', borderRadius: '20px' }}>ONLY</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <div style={{ color: T.lime }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <span style={{ fontWeight: '900', fontSize: '18px', color: T.lime }}>Doubles</span>
                    </div>
                    <div style={{ fontSize: '12px', color: T.muted }}>2 players · $25.00 per player</div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '28px', color: T.lime }}>$50</div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: T.muted }}>
                  This tournament is <strong style={{ color: T.white }}>doubles format only</strong>. Add your partner details in Step 3 below.
                </div>
              </div>
            </Card>

            {/* Step 3: Players */}
            <Card title="Player Details" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.1" />
                <path d="m15 15 5 5" />
                <circle cx="18" cy="8" r="2" fill="currentColor" />
              </svg>
            } accent={T.teal}>
              {/* Player 1 */}
              <div style={{ background: `${T.lime}08`, border: `1px solid ${T.lime}20`, borderRadius: '12px', padding: '16px 18px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: T.lime, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Player 1 (You — auto-filled from Step 1)
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

              {/* Player 2 — always required */}
              <div style={{ background: `${T.teal}08`, border: `2px solid ${T.teal}40`, borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: T.teal, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                  Player 2 — Your Doubles Partner <span style={{ color: '#EF4444' }}>*</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <Field label="First Name" required value={form.player2_first_name} onChange={e => set('player2_first_name', e.target.value)} placeholder="Jane" />
                  <Field label="Last Name"  required value={form.player2_last_name}  onChange={e => set('player2_last_name',  e.target.value)} placeholder="Doe" />
                </div>
                <Field label="Partner Email" type="email" hint="Confirmation email will be sent here too" value={form.player2_email} onChange={e => set('player2_email', e.target.value)} placeholder="partner@example.com" />
              </div>
            </Card>

            {/* Step 4: Waivers */}
            <Card title="Liability Waiver & Terms" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            } accent="#EF4444">
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

            {/* Step 5: Payment */}
            <Card title="Review & Pay" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            } accent={T.lime}>
              {/* Order summary */}
              <div style={{ background: T.navyMid, border: `1px solid ${T.lime}18`, borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '16px' }}>Order Summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: T.white }}>Doubles Registration</div>
                    <div style={{ fontSize: '12px', color: T.muted, marginTop: '3px' }}>2 players × $25.00 per player</div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: T.white }}>${TOTAL}.00</div>
                </div>
                {form.team_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                    <span style={{ fontSize: '13px', color: T.muted }}>Team</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: T.white }}>{form.team_name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                  <span style={{ fontSize: '13px', color: T.muted }}>Bracket</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: T.white }}>{form.player_type === 'middle_high_school' ? 'Middle / High School' : 'Adult'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
                  <span style={{ fontSize: '13px', color: T.muted }}>Date</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: T.white }}>Sunday, July 26, 2026</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: T.white }}>Total Due</span>
                  <span style={{ fontSize: '40px', fontWeight: '900', color: T.lime, letterSpacing: '-2px' }}>${TOTAL}.00</span>
                </div>
                <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: T.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Secure checkout via <strong style={{ color: '#94A3B8' }}>Stripe</strong> · Visa, Mastercard, Amex, Discover
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
                    { done: !!(form.player2_first_name && form.player2_last_name),             label: 'Player 2 name (required)' },
                    { done: form.liability_accepted,                                            label: 'Liability waiver' },
                    { done: form.terms_accepted,                                                label: 'Terms & Conditions' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {item.done ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.lime} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          </svg>
                        )}
                      </span>
                      <span style={{ fontSize: '13px', color: item.done ? T.muted : '#94A3B8', textDecoration: item.done ? 'line-through' : 'none', marginLeft: '6px' }}>{item.label}</span>
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
                  <>Register & Pay ${TOTAL}.00 →</>
                )}
              </button>
            </Card>

          </div>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px', padding: '28px 0', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
          <div style={{ fontSize: '13px', color: T.muted, marginBottom: '6px' }}>Knoxville Hindu Community Center · HCC Youth Club Presents</div>
          <a href="mailto:knoxvillehcc@gmail.com" style={{ color: T.lime, textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>knoxvillehcc@gmail.com</a>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <a href="tel:8659249286" style={{ color: T.muted, textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}><span style={{ color: T.teal }}>Love</span> · 865-924-9286</a>
            <a href="tel:8653154494" style={{ color: T.muted, textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}><span style={{ color: T.teal }}>Om</span> · 865-315-4494</a>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(107,139,174,0.5)' }}>8580 Hickory Creek Rd, Lenoir City, TN 37771</div>
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
