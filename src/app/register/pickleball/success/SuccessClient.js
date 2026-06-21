'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const C = {
  saffron: '#F4A40B',
  gold:    '#D4AF37',
  green:   '#10B981',
  bg:      '#060D1A',
};

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const regNumber    = searchParams.get('reg') || '';
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${C.bg} 0%, #0D1220 60%, rgba(16,185,129,0.05) 100%)`,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>

      {/* Background orb */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)',
          borderRadius: '50%',
        }}/>
      </div>

      <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center', position: 'relative' }}>

        {/* Success icon */}
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 32px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))',
          border: '2px solid rgba(16,185,129,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '50px',
          boxShadow: '0 0 60px rgba(16,185,129,0.2)',
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        }}>
          ✅
        </div>

        <h1 style={{ margin: '0 0 12px', fontSize: '40px', fontWeight: '900', letterSpacing: '-1px' }}>
          You're{' '}
          <span style={{
            background: `linear-gradient(135deg, ${C.green}, #059669)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Registered!
          </span>
        </h1>

        <p style={{ margin: '0 0 32px', color: '#64748B', fontSize: '16px', lineHeight: '1.6' }}>
          Your payment was successful and your spot is confirmed. 🏓
        </p>

        {/* Reg number card */}
        {regNumber && (
          <div style={{
            background: 'rgba(13,20,38,0.9)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '16px', padding: '28px', marginBottom: '28px',
            boxShadow: '0 0 40px rgba(16,185,129,0.08)',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569',
              textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
              Your Registration Number
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '32px', fontWeight: '900', color: C.saffron, letterSpacing: '3px' }}>
              {regNumber}
            </div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '10px' }}>
              Save this number — you'll need it for check-in
            </div>
          </div>
        )}

        {/* What's next */}
        <div style={{
          background: 'rgba(13,20,38,0.8)', border: '1px solid rgba(51,65,85,0.6)',
          borderRadius: '16px', padding: '28px', marginBottom: '28px', textAlign: 'left',
        }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            What Happens Next
          </div>
          {[
            { icon: '📧', title: 'Confirmation Email',    desc: 'A confirmation email has been sent to your inbox' },
            { icon: '📋', title: 'Admin Notified',         desc: 'HCC staff have been notified of your registration' },
            { icon: '🏓', title: 'See You on the Court',  desc: 'Bring your registration number on event day for check-in' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: i < 2 ? '16px' : 0 }}>
              <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: '700', color: 'white', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Syncing notice */}
        <div style={{
          background: 'rgba(244,164,11,0.05)', border: '1px solid rgba(244,164,11,0.15)',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '32px',
          fontSize: '13px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '18px' }}>⚙️</span>
          <span>Syncing your registration to HCC database{dots}</span>
        </div>

        {/* Back button */}
        <a href="/" style={{
          display: 'inline-block', padding: '16px 40px', borderRadius: '12px', textDecoration: 'none',
          background: `linear-gradient(135deg, ${C.saffron}, ${C.gold})`,
          color: '#000', fontWeight: '800', fontSize: '16px',
          boxShadow: '0 0 30px rgba(244,164,11,0.25)',
          transition: 'all 0.2s',
        }}>
          ← Back to HCC Home
        </a>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes popIn {
          0%   { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
