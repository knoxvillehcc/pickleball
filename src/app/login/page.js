'use client';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const C = {
  bg:      '#060D1A',
  card:    '#0D1627',
  border:  'rgba(51,65,85,0.6)',
  gold:    '#F4A40B',
  text:    '#E2E8F0',
  muted:   '#64748B',
  error:   '#EF4444',
  success: '#10B981',
};

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get('redirect') || '/pickleball';
  const expired      = searchParams.get('expired') === '1';

  const [step,    setStep]    = useState('email');
  const [email,   setEmail]   = useState('');
  const [pin,     setPin]     = useState(['', '', '', '', '', '']);
  const [error,   setError]   = useState(expired ? 'Session expired — please log in again.' : '');
  const [loading, setLoading] = useState(false);
  const [locked,  setLocked]  = useState('');

  const emailRef = useRef(null);
  const pinRefs  = useRef([]);

  useEffect(() => {
    if (step === 'email' && emailRef.current) emailRef.current.focus();
    if (step === 'pin'   && pinRefs.current[0]) pinRefs.current[0].focus();
  }, [step]);

  const handlePinChange = useCallback((i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...pin];
    next[i] = val.slice(-1);
    setPin(next);
    setError('');
    if (val && i < 5) pinRefs.current[i + 1]?.focus();
    if (val && i === 5 && next.every(d => d !== '')) submitPin(next.join(''));
  }, [pin]);

  const handlePinKey = useCallback((i, e) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) pinRefs.current[i - 1]?.focus();
  }, [pin]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setPin(pasted.split(''));
      pinRefs.current[5]?.focus();
      submitPin(pasted);
    }
  }, []);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email'); return; }
    setError('');
    setStep('pin');
  };

  const submitPin = async (pinVal) => {
    setLoading(true);
    setError('');
    setLocked('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin: pinVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.lockedUntil) {
          const t = new Date(data.lockedUntil);
          setLocked(`Account locked until ${t.toLocaleTimeString()}`);
        }
        setError(data.error || 'Login failed');
        setPin(['', '', '', '', '', '']);
        pinRefs.current[0]?.focus();
        return;
      }
      router.push(redirect);
    } catch {
      setError('Connection error — please try again');
      setPin(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${C.bg} 0%, #0A1120 100%)`,
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(244,164,11,0.04) 0%, transparent 70%)',
          borderRadius: '50%',
        }}/>
      </div>

      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(244,164,11,0.15), rgba(244,164,11,0.05))',
            border: '1.5px solid rgba(244,164,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px',
            boxShadow: '0 0 40px rgba(244,164,11,0.15)',
          }}>
            🏓
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px' }}>
            HCC Dashboard
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: C.muted }}>
            Admin access only
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>

          {/* ── Email Step ── */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit}>
              <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: '700',
                color: C.gold, textTransform: 'uppercase', letterSpacing: '2px' }}>
                Email Address
              </div>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="knoxvillehcc@gmail.com"
                autoComplete="email"
                required
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                  color: C.text, fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                  marginBottom: '20px',
                }}
              />
              {error && <ErrorBox msg={error} />}
              <button type="submit" style={btnStyle(C.gold)}>
                Continue →
              </button>
            </form>
          )}

          {/* ── PIN Step ── */}
          {step === 'pin' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.gold,
                  textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                  Enter 6-Digit PIN
                </div>
                <div style={{ fontSize: '13px', color: C.muted }}>{email}</div>
              </div>

              {/* PIN inputs */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center',
                marginBottom: '24px' }} onPaste={handlePaste}>
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => pinRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(i, e.target.value)}
                    onKeyDown={e => handlePinKey(i, e)}
                    disabled={loading}
                    aria-label={`PIN digit ${i + 1}`}
                    style={{
                      width: '48px', height: '58px', textAlign: 'center',
                      fontSize: '24px', fontWeight: '800', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: `2px solid ${digit ? C.gold : C.border}`,
                      color: C.text, outline: 'none',
                      transition: 'border-color 0.15s',
                      boxShadow: digit ? `0 0 12px rgba(244,164,11,0.2)` : 'none',
                    }}
                  />
                ))}
              </div>

              {loading && (
                <div style={{ textAlign: 'center', color: C.gold, fontSize: '13px', marginBottom: '16px' }}>
                  ⏳ Verifying…
                </div>
              )}

              {locked && (
                <div style={{ background: 'rgba(244,164,11,0.08)', border: '1px solid rgba(244,164,11,0.2)',
                  borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#D4AF37',
                  marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  🔒 {locked}
                </div>
              )}

              {error && <ErrorBox msg={error} />}

              <button
                type="button"
                onClick={() => { setStep('email'); setPin(['','','','','','']); setError(''); setLocked(''); }}
                disabled={loading}
                style={{ width: '100%', background: 'none', border: 'none', color: C.muted,
                  fontSize: '13px', cursor: 'pointer', padding: '10px', marginTop: '4px' }}>
                ← Back to email
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: C.muted, marginTop: '24px' }}>
          HCC · Knoxville, TN · Admin Portal
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        input::placeholder { color: #475569; }
        input:focus { border-color: rgba(244,164,11,0.5) !important; box-shadow: 0 0 0 3px rgba(244,164,11,0.08); }
      `}</style>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#FC8181',
      marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
      ⚠️ {msg}
    </div>
  );
}

function btnStyle(color) {
  return {
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
    background: `linear-gradient(135deg, ${color}, #D4AF37)`,
    color: '#000', fontWeight: '800', fontSize: '15px',
    boxShadow: `0 4px 20px rgba(244,164,11,0.25)`,
    transition: 'all 0.2s',
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060D1A', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#F4A40B', fontFamily: 'Inter, sans-serif' }}>
        Loading...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
