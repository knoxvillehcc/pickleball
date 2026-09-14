'use client';
import { useState, useEffect, useRef } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Scanner — Mobile-optimized QR check-in + pickup tool
 * ═══════════════════════════════════════════════════════════════════
 *
 * Flow:
 *   1. Employee enters PIN → authenticates via Odoo
 *   2. Camera scans rolling QR
 *   3. Shows purchaser name → staff verifies verbally
 *   4. Tap "Confirm Check-In" → atomic check-in
 *
 * Also supports manual lookup (fallback) and pickup mode.
 */

const C = {
  bg: '#0a0a0f', card: '#141420', border: 'rgba(139,30,63,0.3)',
  primary: '#FF6B35', secondary: '#8B1E3F', accent: '#FFD700',
  text: '#F8FAFC', muted: '#94A3B8', green: '#34D399', red: '#EF4444',
};

const S = {
  page: { minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter',sans-serif" },
  input: { width: '100%', padding: '16px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: '18px', textAlign: 'center', outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '18px', borderRadius: '14px', border: 'none', fontSize: '18px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.15s' },
};

export default function ScannerPage() {
  const [mode, setMode] = useState('login'); // login, scan, result, lookup, pickup
  const [sessionToken, setSessionToken] = useState('');
  const [employee, setEmployee] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [stats, setStats] = useState({ scanned: 0, valid: 0, denied: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [eventDateId, setEventDateId] = useState(null);
  const [dates, setDates] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scannerRef = useRef(null);

  // Load events on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/navratri/events');
        const data = await res.json();
        if (data.events?.length > 0) {
          const ev = data.events[0];
          setEventId(ev.id);
          const dRes = await fetch(`/api/navratri/events/${ev.id}`);
          const dData = await dRes.json();
          setDates(dData.dates || []);
          // Auto-select today's date
          const today = new Date().toISOString().split('T')[0];
          const todayDate = (dData.dates || []).find(d => d.event_date === today);
          if (todayDate) setEventDateId(todayDate.id);
        }
      } catch { }
    })();
  }, []);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('navratri_scanner_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.token && new Date(s.expires) > new Date()) {
          setSessionToken(s.token);
          setEmployee(s.employee);
          setMode('scan');
        }
      } catch { }
    }
  }, []);

  // ── PIN Login ──────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!pin || !eventId) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/navratri/scanner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth', pin, eventId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSessionToken(data.sessionToken);
      setEmployee(data.employee);
      setMode('scan');
      localStorage.setItem('navratri_scanner_session', JSON.stringify({
        token: data.sessionToken, employee: data.employee,
        expires: new Date(Date.now() + 4 * 3600000).toISOString(),
      }));
    } catch { setError('Login failed'); }
    finally { setLoading(false); }
  };

  // ── QR Scanning ────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch (err) {
      setError('Camera access denied. Use manual lookup instead.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    if (scannerRef.current) {
      cancelAnimationFrame(scannerRef.current);
      scannerRef.current = null;
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      scannerRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      detector.detect(imageData).then(codes => {
        if (codes.length > 0) {
          const payload = codes[0].rawValue;
          if (payload.startsWith('NV:')) {
            stopCamera();
            handleQRScanned(payload);
            return;
          }
        }
        scannerRef.current = requestAnimationFrame(scanFrame);
      }).catch(() => {
        scannerRef.current = requestAnimationFrame(scanFrame);
      });
    } else {
      // Fallback: manual entry
      scannerRef.current = requestAnimationFrame(scanFrame);
    }
  };

  useEffect(() => {
    if (mode === 'scan') startCamera();
    return () => stopCamera();
  }, [mode]);

  // ── Handle QR Scanned ─────────────────────────────────────────────────────
  const handleQRScanned = async (qrPayload) => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/navratri/scanner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', qrPayload, eventDateId, sessionToken }),
      });
      const data = await res.json();
      setScanResult(data);
      setStats(prev => ({
        scanned: prev.scanned + 1,
        valid: data.valid ? prev.valid + 1 : prev.valid,
        denied: !data.valid ? prev.denied + 1 : prev.denied,
      }));
      setMode('result');
    } catch { setError('Validation failed'); }
    finally { setLoading(false); }
  };

  // ── Confirm Check-In ──────────────────────────────────────────────────────
  const handleConfirmCheckin = async () => {
    if (!scanResult?.ticketId) {
      setError('No ticket ID — cannot check in');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/navratri/scanner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkin', ticketId: scanResult.ticketId, eventDateId, sessionToken }),
      });
      const data = await res.json();
      if (data.success) {
        setScanResult({ ...scanResult, confirmed: true, message: data.message });
        // Haptic feedback on success
        if (navigator.vibrate) navigator.vibrate(200);
        // Auto-return to scan after 2.5 seconds
        setTimeout(() => { setScanResult(null); setMode('scan'); }, 2500);
      } else {
        setError(data.reason || data.error || 'Check-in failed');
        // Haptic feedback on error
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    } catch (err) {
      setError('Check-in failed: ' + (err.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  // ── Manual Lookup ──────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const res = await fetch('/api/navratri/scanner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', search: searchTerm, eventId, sessionToken }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    stopCamera();
    localStorage.removeItem('navratri_scanner_session');
    setSessionToken('');
    setEmployee(null);
    setMode('login');
    setPin('');
  };

  // ── LOGIN SCREEN ───────────────────────────────────────────────────────────
  if (mode === 'login') return (
    <div style={{ ...S.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(180deg, #0a0a0f 0%, #141420 100%)' }}>

      {/* Glowing icon */}
      <div style={{ width: '120px', height: '120px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', background: 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(139,30,63,0.15))', border: '1px solid rgba(255,107,53,0.2)', boxShadow: '0 0 60px rgba(255,107,53,0.1)', marginBottom: '32px' }}>
        🪔
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Gate Scanner</h1>
      <p style={{ color: C.muted, fontSize: '15px', marginBottom: '36px', fontWeight: '500' }}>Enter your staff PIN to begin</p>

      {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '14px 20px', color: C.red, fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '340px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>{error}</div>}

      {/* PIN dots */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: pin.length > i ? C.primary : 'rgba(255,255,255,0.08)',
            border: `2px solid ${pin.length > i ? C.primary : 'rgba(255,255,255,0.15)'}`,
            boxShadow: pin.length > i ? `0 0 12px ${C.primary}40` : 'none',
            transition: 'all 0.2s ease',
          }} />
        ))}
      </div>

      <input style={{ ...S.input, maxWidth: '340px', letterSpacing: '16px', fontSize: '28px', fontWeight: '700', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.08)' }}
        type="password" maxLength={6} placeholder="" value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />

      {/* Date selector — dark styled */}
      <div style={{ width: '100%', maxWidth: '340px', marginTop: '20px', position: 'relative' }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Event Date</label>
        <select value={eventDateId || ''} onChange={e => setEventDateId(parseInt(e.target.value))} style={{
          width: '100%', padding: '16px 20px', borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          color: C.text, fontSize: '15px', fontWeight: '600',
          outline: 'none', appearance: 'none', cursor: 'pointer',
          WebkitAppearance: 'none', MozAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
          boxSizing: 'border-box',
        }}>
          <option value="" style={{ background: '#141420', color: C.muted }}>Auto-detect today</option>
          {dates.map(d => (
            <option key={d.id} value={d.id} style={{ background: '#141420', color: C.text }}>
              {d.label} — {new Date(d.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      <button style={{ ...S.btn, maxWidth: '340px', marginTop: '28px', background: 'linear-gradient(135deg, #FF6B35, #D4531F)', color: 'white', borderRadius: '16px', fontSize: '17px', letterSpacing: '-0.01em', boxShadow: loading || !pin ? 'none' : '0 4px 24px rgba(255,107,53,0.3)', opacity: loading || !pin ? 0.4 : 1, transition: 'all 0.3s ease' }}
        disabled={loading || !pin} onClick={handleLogin}>
        {loading ? 'Authenticating...' : 'Continue'}
      </button>

      <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '12px', marginTop: '40px', fontWeight: '500' }}>
        Navratri 2026 • Hindu Community Center
      </p>

      <style>{`
        select option { background: #141420 !important; color: #F8FAFC !important; }
        input::placeholder { color: rgba(148,163,184,0.3) !important; }
      `}</style>
    </div>
  );

  // ── SCAN SCREEN ────────────────────────────────────────────────────────────
  if (mode === 'scan') return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>👤 {employee?.name}</div>
          <div style={{ fontSize: '11px', color: C.muted }}>
            ✅ {stats.valid} checked in • ❌ {stats.denied} denied
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setMode('lookup')} style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            🔍 Lookup
          </button>
          <button onClick={handleLogout} style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid rgba(239,68,68,0.3)`, background: 'transparent', color: C.red, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            Exit
          </button>
        </div>
      </div>

      {/* Camera viewfinder */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', maxHeight: '60vh', overflow: 'hidden', background: '#000' }}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Scan frame overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '250px', height: '250px', border: '3px solid rgba(255,107,53,0.7)',
            borderRadius: '24px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }} />
        </div>

        {/* Scanning indicator */}
        <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          padding: '8px 20px', borderRadius: '20px', background: 'rgba(0,0,0,0.7)',
          color: C.green, fontSize: '14px', fontWeight: '700', backdropFilter: 'blur(8px)',
        }}>
          {loading ? '⏳ Validating...' : '📸 Point camera at QR code'}
        </div>
      </div>

      {/* Manual QR input fallback */}
      <div style={{ padding: '16px' }}>
        <p style={{ color: C.muted, fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>
          Camera not working? Enter QR data manually:
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input id="manualQR" style={{ ...S.input, fontSize: '14px', textAlign: 'left', flex: 1 }} placeholder="NV:..." />
          <button onClick={() => {
            const el = document.getElementById('manualQR');
            if (el?.value) handleQRScanned(el.value);
          }} style={{ ...S.btn, width: 'auto', padding: '16px 24px', background: C.primary, color: 'white' }}>
            Scan
          </button>
        </div>
      </div>

      {error && <div style={{ margin: '0 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px', color: C.red, fontSize: '14px', textAlign: 'center' }}>{error}</div>}
    </div>
  );

  // ── RESULT SCREEN ──────────────────────────────────────────────────────────
  if (mode === 'result' && scanResult) {
    const isValid = scanResult.valid;
    const isConfirmed = scanResult.confirmed;

    return (
      <div style={{ ...S.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        {/* Big status indicator */}
        <div style={{
          width: '160px', height: '160px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '80px', marginBottom: '24px',
          background: isConfirmed ? 'rgba(52,211,153,0.15)' : isValid ? 'rgba(255,215,0,0.15)' : 'rgba(239,68,68,0.15)',
          border: `4px solid ${isConfirmed ? C.green : isValid ? C.accent : C.red}`,
          animation: 'pulse 1.5s infinite',
        }}>
          {isConfirmed ? '✅' : isValid ? '🎫' : '❌'}
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: '900', color: isConfirmed ? C.green : isValid ? C.accent : C.red, textAlign: 'center' }}>
          {isConfirmed ? 'Checked In!' : isValid ? 'Valid Ticket' : 'Entry Denied'}
        </h1>

        {/* Purchaser name (for verification) */}
        {scanResult.purchaserName && (
          <div style={{
            marginTop: '20px', padding: '20px 32px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.05)', border: `2px solid ${isValid ? C.accent : C.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>VERIFY NAME</div>
            <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '0.02em' }}>{scanResult.purchaserName}</div>
            {scanResult.quantity > 1 && (
              <div style={{ fontSize: '14px', color: C.accent, marginTop: '8px' }}>
                👥 {scanResult.quantity} person(s)
              </div>
            )}
            {scanResult.orderNumber && (
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
                Order: {scanResult.orderNumber} • {scanResult.customerType}
              </div>
            )}
          </div>
        )}

        <p style={{ color: C.muted, fontSize: '15px', marginTop: '16px', textAlign: 'center' }}>
          {scanResult.reason || scanResult.message}
        </p>

        {/* Action buttons */}
        <div style={{ width: '100%', maxWidth: '360px', marginTop: '32px' }}>
          {isValid && !isConfirmed && (
            <button onClick={handleConfirmCheckin} disabled={loading}
              style={{ ...S.btn, background: C.green, color: '#000', marginBottom: '12px', fontSize: '22px', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Processing...' : '✅ Confirm Check-In'}
            </button>
          )}
          <button onClick={() => { setScanResult(null); setMode('scan'); setError(''); }}
            style={{ ...S.btn, background: 'rgba(255,255,255,0.1)', color: C.text }}>
            {isConfirmed ? '📸 Scan Next' : '← Back to Scanner'}
          </button>
        </div>

        <style>{`@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
      </div>
    );
  }

  // ── LOOKUP SCREEN ──────────────────────────────────────────────────────────
  if (mode === 'lookup') return (
    <div style={S.page}>
      <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => setMode('scan')} style={{ background: 'none', border: 'none', color: C.text, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>🔍 Manual Lookup</h2>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input style={{ ...S.input, textAlign: 'left', fontSize: '16px', flex: 1 }} placeholder="Phone, name, or order #..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch} disabled={loading}
            style={{ ...S.btn, width: 'auto', padding: '16px 24px', background: C.primary, color: 'white' }}>
            {loading ? '...' : 'Search'}
          </button>
        </div>

        {/* Results */}
        <div style={{ marginTop: '16px' }}>
          {searchResults.map((r, i) => (
            <div key={i} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px',
              padding: '16px', marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '16px' }}>{r.purchaserName}</div>
                  <div style={{ fontSize: '13px', color: C.muted }}>{r.orderNumber} • {r.customerType}</div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                  background: r.paymentStatus === 'paid' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                  color: r.paymentStatus === 'paid' ? C.green : C.red,
                }}>
                  {r.paymentStatus}
                </span>
              </div>

              {r.tickets?.map((ticket, ti) => (
                <div key={ti} style={{
                  marginTop: '10px', padding: '10px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>
                      {ticket.type === 'daily_entry' ? 'Daily Entry' : ticket.type === 'combo_pass' ? 'Combo Pass' : ticket.type === 'pioneer_pass' ? 'Pioneer Pass' : ticket.type}
                      {ticket.eventDate ? ` — ${new Date(ticket.eventDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
                      {` × ${ticket.quantity}`}
                    </span>
                    <span style={{
                      marginLeft: '8px', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                      background: ticket.status === 'active' ? 'rgba(52,211,153,0.1)' : ticket.status === 'used' ? 'rgba(148,163,184,0.1)' : 'rgba(239,68,68,0.1)',
                      color: ticket.status === 'active' ? C.green : ticket.status === 'used' ? C.muted : C.red,
                    }}>
                      {ticket.status}
                    </span>
                  </div>
                  {ticket.status === 'active' && (
                    <button onClick={() => {
                      setScanResult({ valid: true, ticketId: ticket.id, purchaserName: r.purchaserName, quantity: ticket.quantity, orderNumber: r.orderNumber, customerType: r.customerType, scanResult: 'valid', reason: 'Manual lookup' });
                      setMode('result');
                    }} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: C.green, color: '#000', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                      Check In
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
          {searchResults.length === 0 && searchTerm && !loading && (
            <p style={{ color: C.muted, textAlign: 'center', marginTop: '32px' }}>No results found</p>
          )}
        </div>
      </div>
    </div>
  );

  return null;
}
