'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const GOLD = '#D4AF37';

export default function SponsorSuccessClient() {
  const searchParams = useSearchParams();
  const regNumber    = searchParams.get('reg') || '';
  const [show, setShow] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: 'var(--text-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
    }}>

      {/* Background glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(212,175,55,0.06), transparent 60%)', borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', bottom: '0', right: '0', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(212,175,55,0.04), transparent 60%)', borderRadius: '50%' }}/>
      </div>

      {/* India flag top bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)', zIndex: 10 }}/>

      <div style={{
        maxWidth: '580px', width: '100%', textAlign: 'center', position: 'relative',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.55s ease',
      }}>

        {/* Top badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', padding: '6px 18px', borderRadius: '20px', marginBottom: '28px' }}>
          <span style={{ fontSize: '16px' }}>🇮🇳</span>
          <span style={{ fontSize: '12px', fontWeight: '800', color: GOLD, letterSpacing: '2px', textTransform: 'uppercase' }}>Knoxville Hindu Community Center</span>
        </div>

        {/* Trophy icon */}
        <div style={{
          width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 32px',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.20), rgba(212,175,55,0.08))',
          border: '2px solid rgba(212,175,55,0.40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px',
          boxShadow: '0 0 60px rgba(212,175,55,0.25), 0 0 120px rgba(212,175,55,0.10)',
          animation: 'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both',
        }}>
          🏆
        </div>

        {/* Headings */}
        <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          Thank You! 🎊
        </h1>
        <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(18px, 3.5vw, 28px)', fontWeight: '900', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          <span style={{ background: `linear-gradient(135deg, ${GOLD}, #F5D060)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            India Fest 2026
          </span>
        </h2>
        <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.7', fontWeight: '600' }}>
          Grand Sponsorship Confirmed
        </p>
        <p style={{ margin: '0 0 36px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          Your payment was successful and your sponsorship is confirmed.<br/>
          A confirmation email has been sent to your inbox.
        </p>

        {/* Registration number */}
        {regNumber && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '18px',
            padding: '28px', marginBottom: '20px',
            boxShadow: '0 0 40px rgba(212,175,55,0.08)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
              Your Sponsor Reference Number
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '28px', fontWeight: '900', color: GOLD, letterSpacing: '4px' }}>
              {regNumber}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '10px' }}>
              Save this — reference this number for any correspondence with HCC
            </div>
          </div>
        )}

        {/* What's included */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '18px',
          padding: '24px', marginBottom: '20px', textAlign: 'left',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '18px' }}>
            Your Grand Sponsor Benefits
          </div>
          {[
            { icon: '🎤', label: 'Stage Recognition', value: 'Live announcement & recognition at India Fest 2026' },
            { icon: '🎨', label: 'Branding',          value: 'Logo on all event banners, signage & digital materials' },
            { icon: '🪑', label: 'VIP Access',         value: 'Reserved VIP table seating for 4 guests' },
            { icon: '🎟️', label: 'Passes',             value: '10 complimentary event admission passes' },
            { icon: '📅', label: 'Event Date',         value: 'Sunday, Aug 23, 2026 · 11:00 AM – 5:00 PM' },
            { icon: '📍', label: 'Location',           value: 'HCC — 8580 Hickory Creek Rd, Lenoir City, TN 37771' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < 5 ? '14px' : 0 }}>
              <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.4' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* What's next */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: '18px',
          padding: '24px', marginBottom: '32px', textAlign: 'left',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '18px' }}>
            What Happens Next
          </div>
          {[
            { icon: '✅', title: 'Confirmation Email Sent',   desc: 'Check your inbox (and spam) for your sponsorship confirmation' },
            { icon: '🎨', title: 'Branding Assets Request',   desc: 'Our team will reach out for your logo and branding materials' },
            { icon: '🎊', title: 'See You at India Fest!',    desc: 'We look forward to celebrating with you on Aug 23, 2026' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < 2 ? '16px' : 0 }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Questions? We're here to help.</div>
        <a href="mailto:knoxvillehcc@gmail.com" style={{ color: GOLD, textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
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
