'use client';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/ClientLayout';

const C = {
  bg:      'var(--bg-primary)',
  card:    'var(--bg-card)',
  border:  'var(--border)',
  gold:    'var(--accent)',
  text:    'var(--text-primary)',
  muted:   'var(--text-secondary)',
  error:   '#EF4444',
  success: '#10B981',
};

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get('redirect') || '/';
  const expired      = searchParams.get('expired') === '1';
  const { theme, toggleTheme, isDark } = useTheme();

  const [step,    setStep]    = useState('email');
  const [email,   setEmail]   = useState('');
  const [pin,     setPin]     = useState(['', '', '', '', '', '']);
  const [error,   setError]   = useState(expired ? 'Session expired — please log in again.' : '');
  const [loading, setLoading] = useState(false);
  const [locked,  setLocked]  = useState('');
  const [showPin, setShowPin] = useState(false);

  const emailRef = useRef(null);
  const pinRefs  = useRef([]);

  useEffect(() => {
    if (step === 'email' && emailRef.current) emailRef.current.focus();
    if (step === 'pin'   && pinRefs.current[0]) pinRefs.current[0].focus();
  }, [step]);

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
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      const next = [...pin];
      next[i - 1] = '';
      setPin(next);
      pinRefs.current[i - 1]?.focus();
    }
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

  // Keypad clicks logic
  const handleKeypadPress = (num) => {
    if (loading) return;
    const idx = pin.findIndex(d => d === '');
    if (idx !== -1) {
      const next = [...pin];
      next[idx] = String(num);
      setPin(next);
      setError('');
      if (idx < 5) {
        pinRefs.current[idx + 1]?.focus();
      }
      if (idx === 5 && next.every(d => d !== '')) {
        submitPin(next.join(''));
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (loading) return;
    let idx = pin.findIndex(d => d === '');
    if (idx === -1) idx = 6;
    if (idx > 0) {
      const next = [...pin];
      next[idx - 1] = '';
      setPin(next);
      setError('');
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const handleKeypadClear = () => {
    if (loading) return;
    setPin(['', '', '', '', '', '']);
    setError('');
    pinRefs.current[0]?.focus();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative',
      transition: 'background-color 0.3s, color 0.3s',
    }}>
      {/* Top flag stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%)' }}/>

      {/* Floating Theme Toggle (Top Right) */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '50%', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
            boxShadow: 'var(--shadow)', transition: 'all 0.25s', fontSize: '18px',
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '400px', zIndex: 2 }}>
        
        {/* Mandir Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/hcc_logo.png" alt="HCC Logo" style={{ height: '48px', width: 'auto', marginBottom: '16px', objectFit: 'contain' }} />
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: C.text, letterSpacing: '-0.4px' }}>
            Hindu Community Center
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
            Operator & Staff Sign-In
          </p>
        </div>

        {/* Login Box */}
        <div className="login-card" style={{ boxShadow: 'var(--shadow)' }}>

          {/* ── Email Step ── */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit}>
              <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: '800',
                color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                Registered Staff Email
              </div>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="operator@knoxvillemandir.org"
                autoComplete="email"
                required
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  background: 'var(--bg-input)', border: `1px solid var(--border)`,
                  color: C.text, fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                  marginBottom: '20px', transition: 'border-color 0.2s',
                }}
              />
              {error && <ErrorBox msg={error} />}
              <button type="submit" style={btnStyle()}>
                Proceed to Secure PIN →
              </button>
            </form>
          )}

          {/* ── PIN Step ── */}
          {step === 'pin' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent)',
                  textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                  Enter 6-Digit Login PIN
                </div>
                <div style={{ fontSize: '13px', color: C.muted, wordBreak: 'break-all', fontWeight: '500' }}>{email}</div>
              </div>

              {/* Secure PIN inputs */}
              <div className="pin-container" onPaste={handlePaste}>
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => pinRefs.current[i] = el}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(i, e.target.value)}
                    onKeyDown={e => handlePinKey(i, e)}
                    disabled={loading}
                    aria-label={`PIN digit ${i + 1}`}
                    className="pin-input"
                    style={{
                      border: `2.5px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                      boxShadow: digit ? `0 0 10px var(--accent-glow)` : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Show PIN option */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: C.muted, userSelect: 'none', fontWeight: '600' }}>
                  <input
                    type="checkbox"
                    checked={showPin}
                    onChange={e => setShowPin(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  Show Pin Characters
                </label>
              </div>

              {/* Lockouts and errors */}
              {loading && (
                <div style={{ textAlign: 'center', color: 'var(--accent)', fontSize: '13px', marginBottom: '16px', fontWeight: '700' }}>
                  ⏳ Verifying code credentials…
                </div>
              )}

              {locked && (
                <div style={{ background: 'var(--bg-error)', border: '1px solid var(--border-error)',
                  borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: 'var(--text-error)',
                  marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: '600' }}>
                  🔒 {locked}
                </div>
              )}

              {error && <ErrorBox msg={error} />}

              {/* Tactile Keypad */}
              <div className="keypad-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    disabled={loading}
                    className="keypad-btn"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  disabled={loading}
                  className="keypad-btn keypad-special"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress(0)}
                  disabled={loading}
                  className="keypad-btn"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  disabled={loading}
                  className="keypad-btn keypad-special"
                  aria-label="Backspace"
                >
                  ⌫
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep('email'); setPin(['','','','','','']); setError(''); setLocked(''); }}
                disabled={loading}
                style={{ width: '100%', background: 'none', border: 'none', color: 'var(--accent)',
                  fontSize: '13px', cursor: 'pointer', padding: '10px', marginTop: '16px', fontWeight: '800' }}>
                ← Change Email Address
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: C.muted, marginTop: '28px', fontWeight: '500' }}>
          Protected by security lockout thresholds.
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        input::placeholder { color: var(--text-muted); }
        input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-glow) !important; }
        
        .login-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 32px 24px;
        }
        
        .pin-container {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 20px;
        }
        
        .pin-input {
          width: 46px;
          height: 56px;
          text-align: center;
          font-size: 24px;
          font-weight: 900;
          border-radius: 12px;
          background: var(--bg-input);
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .keypad-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 10px;
        }

        .keypad-btn {
          height: 52px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-input);
          color: var(--text-primary);
          font-size: 20px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          user-select: none;
          touch-action: manipulation;
        }

        .keypad-btn:hover:not(:disabled) {
          border-color: var(--accent);
          background: var(--bg-secondary);
          transform: scale(1.03);
        }

        .keypad-btn:active:not(:disabled) {
          transform: scale(0.97);
          opacity: 0.8;
        }

        .keypad-special {
          font-size: 16px;
          font-weight: 900;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 24px 16px;
          }
          .pin-container {
            gap: 6px;
          }
          .pin-input {
            width: 38px;
            height: 48px;
            font-size: 20px;
            border-radius: 10px;
          }
          .keypad-btn {
            height: 48px;
            font-size: 18px;
            border-radius: 10px;
          }
        }

        @media (max-width: 350px) {
          .pin-container {
            gap: 4px;
          }
          .pin-input {
            width: 32px;
            height: 42px;
            font-size: 16px;
            border-radius: 8px;
          }
        }
      `}</style>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'var(--bg-error)', border: '1px solid var(--border-error)',
      borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: 'var(--text-error)',
      marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: '600' }}>
      ⚠️ {msg}
    </div>
  );
}

function btnStyle() {
  return {
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
    background: 'var(--accent)',
    color: '#FFF', fontWeight: '900', fontSize: '15px',
    boxShadow: '0 4px 14px var(--accent-glow)',
    transition: 'all 0.2s',
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: 'Inter, sans-serif' }}>
        Loading...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
