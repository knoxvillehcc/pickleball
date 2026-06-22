'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// ── Design tokens — matches flyer palette ──────────────────────────────────────
const T = {
  navy:    '#04111F',
  navyMid: '#071A2E',
  navyCard:'rgba(7,26,50,0.9)',
  lime:    '#A8D62E',
  teal:    '#0E9E8A',
  muted:   '#6B8BAE',
  white:   '#FFFFFF',
};

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const regNumber    = searchParams.get('reg') || '';
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: T.navy,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: T.white,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
    }}>

      {/* Background glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '700px', background: `radial-gradient(circle, ${T.lime}07, transparent 60%)`, borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '0%', right: '0%', width: '500px', height: '500px', background: `radial-gradient(circle, ${T.teal}08, transparent 60%)`, borderRadius: '50%' }}/>
      </div>

      <div style={{
        maxWidth: '560px', width: '100%', textAlign: 'center', position: 'relative',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease',
      }}>

        {/* Top badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `${T.teal}18`, border: `1px solid ${T.teal}35`, padding: '6px 16px', borderRadius: '20px', marginBottom: '24px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: T.teal, letterSpacing: '1px' }}>HCC YOUTH CLUB PRESENTS</span>
        </div>

        {/* Success icon */}
        <div style={{
          width: '110px', height: '110px', borderRadius: '50%', margin: '0 auto 28px',
          background: `linear-gradient(135deg, ${T.lime}25, ${T.lime}10)`,
          border: `2px solid ${T.lime}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '56px',
          boxShadow: `0 0 60px ${T.lime}25, 0 0 120px ${T.lime}10`,
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        }}>
          🏓
        </div>

        {/* Heading */}
        <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(34px, 6vw, 52px)', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 0.95, textTransform: 'uppercase', color: T.white }}>
          You're In!
        </h1>
        <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '900', letterSpacing: '-1px', lineHeight: 1, textTransform: 'uppercase', color: T.lime }}>
          Registration Confirmed ✅
        </h2>
        <p style={{ margin: '0 0 36px', color: T.muted, fontSize: '16px', lineHeight: '1.6' }}>
          Your payment was successful and your spot is locked in.<br/>
          A confirmation email has been sent to your inbox.
        </p>

        {/* Registration number card */}
        {regNumber && (
          <div style={{
            background: T.navyCard, border: `1px solid ${T.lime}25`, borderRadius: '18px',
            padding: '28px', marginBottom: '20px',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 40px ${T.lime}12`,
          }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
              Your Registration Number
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '34px', fontWeight: '900', color: T.lime, letterSpacing: '4px' }}>
              {regNumber}
            </div>
            <div style={{ fontSize: '13px', color: T.muted, marginTop: '10px' }}>
              Save this — you'll need it for check-in on game day
            </div>
          </div>
        )}

        {/* Event details */}
        <div style={{
          background: T.navyCard, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: '18px',
          padding: '24px', marginBottom: '20px', textAlign: 'left',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '18px' }}>
            Event Details
          </div>
          {[
            { icon: '📅', label: 'Date', value: 'Sunday, July 26, 2026' },
            { icon: '⏰', label: 'Start Time', value: '12:00 PM — arrive early!' },
            { icon: '📍', label: 'Location', value: '8580 Hickory Creek Rd, Lenoir City, TN 37771' },
            { icon: '🎾', label: 'Paddle Rental', value: '$5 available on-site' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < 3 ? '14px' : 0 }}>
              <div style={{ fontSize: '22px', flexShrink: 0, width: '28px', textAlign: 'center' }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontWeight: '700', color: T.white, fontSize: '14px' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* What's next */}
        <div style={{
          background: T.navyCard, border: `1px solid ${T.teal}20`, borderRadius: '18px',
          padding: '24px', marginBottom: '32px', textAlign: 'left',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '18px' }}>
            What Happens Next
          </div>
          {[
            { icon: '📧', title: 'Confirmation Email Sent', desc: 'Check your inbox (and spam) for your confirmation' },
            { icon: '🏆', title: 'Bracket Assignment', desc: 'You will be notified of your bracket and schedule' },
            { icon: '🏓', title: 'See You on the Court!', desc: 'Compete. Have fun. Build community.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < 2 ? '14px' : 0 }}>
              <div style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: '700', color: T.white, marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: T.muted }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA tag line */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '12px', fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '32px' }}>
          <span>🏆 All Skill Levels Welcome</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span>🤝 Doubles Tournament</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <span>📍 Lenoir City, TN</span>
        </div>

        {/* Questions footer */}
        <div style={{ fontSize: '13px', color: T.muted, marginBottom: '8px' }}>Questions? We're here to help.</div>
        <a href="mailto:knoxvillehcc@gmail.com" style={{ color: T.lime, textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
          knoxvillehcc@gmail.com
        </a>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
