'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// ── Design tokens — India Fest palette ────────────────────────────────────────
const T = {
  bg:      '#060A18',
  bgMid:   '#0A0F22',
  card:    'rgba(10,15,35,0.92)',
  saffron: '#FF9933',
  gold:    '#FFD700',
  muted:   '#7A7090',
  white:   '#FFFFFF',
  light:   '#E8E0D0',
};

export default function VendorSuccessClient() {
  const searchParams = useSearchParams();
  const regNumber    = searchParams.get('reg') || '';
  const [show, setShow] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: T.white,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
    }}>

      {/* Background glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(255,153,51,0.07), transparent 60%)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '0', right: '0', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(255,215,0,0.05), transparent 60%)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '900px', height: '900px', border: '1px solid rgba(255,153,51,0.03)', borderRadius: '50%' }}/>
      </div>

      {/* India flag top bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)', zIndex: 10 }}/>

      <div style={{
        maxWidth: '580px', width: '100%', textAlign: 'center', position: 'relative',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.55s ease',
      }}>

        {/* Top badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.3)', padding: '6px 18px', borderRadius: '20px', marginBottom: '28px' }}>
          <span style={{ fontSize: '16px' }}>🇮🇳</span>
          <span style={{ fontSize: '12px', fontWeight: '800', color: T.saffron, letterSpacing: '2px', textTransform: 'uppercase' }}>Knoxville Hindu Community Center</span>
        </div>

        {/* Check icon */}
        <div style={{
          width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 32px',
          background: 'linear-gradient(135deg, rgba(255,153,51,0.20), rgba(255,215,0,0.10))',
          border: '2px solid rgba(255,153,51,0.40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 60px rgba(255,153,51,0.25), 0 0 120px rgba(255,153,51,0.10)',
          animation: 'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both',
        }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={T.saffron} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>

        {/* Headings */}
        <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 0.95, textTransform: 'uppercase', color: T.white }}>
          You're In! 🎊
        </h1>
        <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(18px, 3.5vw, 28px)', fontWeight: '900', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          <span style={{ background: `linear-gradient(135deg, ${T.saffron}, ${T.gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            India Fest 2026
          </span>
        </h2>
        <p style={{ margin: '0 0 12px', color: T.muted, fontSize: '15px', lineHeight: '1.7', fontWeight: '600' }}>
          Vendor Space Confirmed
        </p>
        <p style={{ margin: '0 0 36px', color: T.muted, fontSize: '14px', lineHeight: '1.6' }}>
          Your payment was successful and your booth is reserved.<br/>
          A confirmation email has been sent to your inbox.
        </p>

        {/* Registration number */}
        {regNumber && (
          <div style={{
            background: T.card, border: '1px solid rgba(255,153,51,0.25)', borderRadius: '18px',
            padding: '28px', marginBottom: '20px', backdropFilter: 'blur(12px)',
            boxShadow: '0 0 40px rgba(255,153,51,0.10)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
              Your Registration Number
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '30px', fontWeight: '900', color: T.saffron, letterSpacing: '4px' }}>
              {regNumber}
            </div>
            <div style={{ fontSize: '13px', color: T.muted, marginTop: '10px' }}>
              Save this — you'll need it for booth check-in on event day
            </div>
          </div>
        )}

        {/* Event info */}
        <div style={{
          background: T.card, border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px',
          padding: '24px', marginBottom: '20px', textAlign: 'left', backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '18px' }}>
            Event Details
          </div>
          {[
            { icon: '📅', label: 'Event', value: 'India Fest 2026' },
            { icon: '📍', label: 'Location', value: 'HCC — 8580 Hickory Creek Rd, Lenoir City, TN 37771' },
            { icon: '🏪', label: 'Setup', value: 'Arrive 30 min before doors open for booth setup' },
            { icon: '📧', label: 'Details', value: 'Full event & setup instructions will be emailed separately' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < 3 ? '14px' : 0 }}>
              <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontWeight: '700', color: T.white, fontSize: '14px', lineHeight: '1.4' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* What's next */}
        <div style={{
          background: T.card, border: '1px solid rgba(255,215,0,0.12)', borderRadius: '18px',
          padding: '24px', marginBottom: '32px', textAlign: 'left', backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '18px' }}>
            What Happens Next
          </div>
          {[
            { icon: '✅', title: 'Confirmation Email Sent', desc: 'Check your inbox (and spam) for your vendor confirmation' },
            { icon: '📋', title: 'Space Assignment', desc: 'You will receive your specific booth location closer to the event' },
            { icon: '🎊', title: 'See You at India Fest!', desc: 'Celebrate culture, food, and community with all of Knoxville' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < 2 ? '16px' : 0 }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: '700', color: T.white, marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: T.muted }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ fontSize: '13px', color: T.muted, marginBottom: '8px' }}>Questions? We're here to help.</div>
        <a href="mailto:knoxvillehcc@gmail.com" style={{ color: T.saffron, textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
          knoxvillehcc@gmail.com
        </a>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
