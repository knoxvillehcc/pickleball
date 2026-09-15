'use client';
import { useState, useEffect, useRef } from 'react';
import { colors, spacing, type, radii, btn, input as inputStyle, card, page as pageStyle, keyframes, alert as alertStyle, chip } from '@/lib/navratri/designSystem';

/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Scanner — Mobile-optimized QR check-in tool
 * ═══════════════════════════════════════════════════════════════════
 * Dark-only for event-day dim lighting operations.
 * All business logic preserved exactly from original.
 */

const c = colors('dark');

export default function ScannerPage() {
  const [mode, setMode] = useState('login');
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
  const [autoDateLabel, setAutoDateLabel] = useState('');
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
          const today = new Date().toISOString().split('T')[0];
          const todayDate = (dData.dates || []).find(d => d.event_date === today);
          if (todayDate) {
            setEventDateId(todayDate.id);
            setAutoDateLabel(`${todayDate.label} — ${new Date(todayDate.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`);
          }
        }
      } catch { }
    })();
  }, []);

  // Restore session
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
        if (navigator.vibrate) navigator.vibrate(200);
        setTimeout(() => { setScanResult(null); setMode('scan'); }, 2500);
      } else {
        setError(data.reason || data.error || 'Check-in failed');
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

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'login') return (
    <div style={{
      ...pageStyle('dark'),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: `${spacing.xl}px`,
      background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bgAlt} 100%)`,
    }}>
      <style>{keyframes}{`
        select option { background: ${c.card} !important; color: ${c.text} !important; }
      `}</style>

      {/* App icon */}
      <div style={{
        width: '96px', height: '96px', borderRadius: `${radii.xl}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px',
        background: c.primaryBg, border: `1px solid ${c.border}`,
        marginBottom: spacing['2xl'],
      }}>🪔</div>

      <h1 style={{ ...type.pageTitle, color: c.text, margin: `0 0 ${spacing.xs}px` }}>Gate Scanner</h1>
      <p style={{ ...type.body, color: c.muted, marginBottom: spacing['2xl'] }}>Enter your staff PIN to begin</p>

      {error && (
        <div style={{ ...alertStyle('error', 'dark'), width: '100%', maxWidth: '340px', marginBottom: spacing.lg, justifyContent: 'center' }}>
          {error}
        </div>
      )}

      {/* PIN dots */}
      <div style={{ display: 'flex', gap: spacing.base, marginBottom: spacing.xl }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: pin.length > i ? c.primary : 'transparent',
            border: `2px solid ${pin.length > i ? c.primary : c.borderSolid}`,
            transition: 'all 0.2s ease',
            boxShadow: pin.length > i ? `0 0 12px ${c.primary}40` : 'none',
          }} />
        ))}
      </div>

      <input
        style={{ ...inputStyle('dark'), maxWidth: '340px', textAlign: 'center', letterSpacing: '12px', fontSize: '24px', fontWeight: '600' }}
        type="password" inputMode="numeric" maxLength={6} value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus
      />

      {/* Date selector */}
      <div style={{ width: '100%', maxWidth: '340px', marginTop: spacing.lg }}>
        <label style={{ ...type.overline, color: c.muted, display: 'block', marginBottom: spacing.sm }}>Event Date</label>
        <select value={eventDateId || ''} onChange={e => setEventDateId(parseInt(e.target.value))} style={{
          ...inputStyle('dark'), cursor: 'pointer', appearance: 'none',
          WebkitAppearance: 'none', MozAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23A1A1AA' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
        }}>
          <option value="">Auto-detect today</option>
          {dates.map(d => (
            <option key={d.id} value={d.id}>
              {d.label} — {new Date(d.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </option>
          ))}
        </select>

        {autoDateLabel && eventDateId && (
          <div style={{ ...alertStyle('success', 'dark'), marginTop: spacing.sm }}>
            ✅ Today: {autoDateLabel}
          </div>
        )}
        {!autoDateLabel && dates.length > 0 && !eventDateId && (
          <div style={{ ...alertStyle('warning', 'dark'), marginTop: spacing.sm }}>
            ⚠️ No event today — select a date manually
          </div>
        )}
      </div>

      <button style={{
        ...btn('primaryLg', 'dark'), maxWidth: '340px', marginTop: spacing.xl,
        opacity: loading || !pin ? 0.4 : 1,
      }} disabled={loading || !pin} onClick={handleLogin}>
        {loading ? 'Authenticating…' : 'Continue'}
      </button>

      <p style={{ ...type.caption, color: c.placeholder, marginTop: spacing['3xl'] }}>
        Navratri 2026 · Hindu Community Center
      </p>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SCAN SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'scan') return (
    <div style={pageStyle('dark')}>
      <style>{keyframes}</style>

      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${spacing.md}px ${spacing.base}px`,
        borderBottom: `1px solid ${c.border}`,
        background: c.bgAlt,
      }}>
        <div>
          <div style={{ ...type.bodyMedium, color: c.text }}>👤 {employee?.name}</div>
          <div style={{ ...type.caption, color: c.muted }}>
            ✅ {stats.valid} in · ❌ {stats.denied} denied
          </div>
        </div>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button onClick={() => setMode('lookup')} style={{ ...btn('secondary', 'dark'), padding: `${spacing.sm}px ${spacing.md}px`, ...type.caption }}>
            🔍 Lookup
          </button>
          <button onClick={handleLogout} style={{ ...btn('destructive', 'dark'), padding: `${spacing.sm}px ${spacing.md}px`, ...type.caption }}>
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
            width: '250px', height: '250px',
            border: `3px solid rgba(255,107,53,0.7)`,
            borderRadius: `${radii.xl}px`,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }} />
        </div>

        {/* Scanning indicator */}
        <div style={{
          position: 'absolute', bottom: spacing.base, left: '50%', transform: 'translateX(-50%)',
          padding: `${spacing.sm}px ${spacing.lg}px`,
          borderRadius: radii.full,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          ...type.bodyMedium, color: c.green,
        }}>
          {loading ? '⏳ Validating…' : '📸 Point at QR code'}
        </div>
      </div>

      {/* Manual QR input */}
      <div style={{ padding: spacing.base }}>
        <p style={{ ...type.caption, color: c.muted, textAlign: 'center', marginBottom: spacing.sm }}>
          Camera not working? Enter QR data manually:
        </p>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <input id="manualQR" style={{ ...inputStyle('dark'), flex: 1, textAlign: 'left' }} placeholder="NV:..." />
          <button onClick={() => {
            const el = document.getElementById('manualQR');
            if (el?.value) handleQRScanned(el.value);
          }} style={{ ...btn('primary', 'dark'), width: 'auto', padding: `${spacing.base}px ${spacing.xl}px` }}>
            Scan
          </button>
        </div>
      </div>

      {error && (
        <div style={{ margin: `0 ${spacing.base}px`, ...alertStyle('error', 'dark') }}>{error}</div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULT SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'result' && scanResult) {
    const isValid = scanResult.valid;
    const isConfirmed = scanResult.confirmed;

    return (
      <div style={{
        ...pageStyle('dark'),
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: spacing.xl, minHeight: '100dvh',
      }}>
        <style>{keyframes}</style>

        {/* Big status icon */}
        <div style={{
          width: '140px', height: '140px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px',
          marginBottom: spacing.xl,
          background: isConfirmed ? c.greenBg : isValid ? c.accentBg : c.redBg,
          border: `3px solid ${isConfirmed ? c.green : isValid ? c.accent : c.red}`,
        }}>
          {isConfirmed ? '✅' : isValid ? '🎫' : '❌'}
        </div>

        <h1 style={{
          ...type.pageTitle, textAlign: 'center',
          color: isConfirmed ? c.green : isValid ? c.accent : c.red,
        }}>
          {isConfirmed ? 'Checked In!' : isValid ? 'Valid Ticket' : 'Entry Denied'}
        </h1>

        {/* Purchaser card */}
        {scanResult.purchaserName && (
          <div style={{
            marginTop: spacing.lg, padding: `${spacing.lg}px ${spacing['2xl']}px`,
            ...card('dark'), textAlign: 'center', width: '100%', maxWidth: '360px',
            borderColor: isValid ? `${c.accent}30` : c.border,
          }}>
            <div style={{ ...type.overline, color: c.muted, marginBottom: spacing.xs }}>VERIFY NAME</div>
            <div style={{ ...type.pageTitle, fontSize: '26px', color: c.text }}>{scanResult.purchaserName}</div>
            {scanResult.quantity > 1 && (
              <div style={{ ...type.bodyMedium, color: c.accent, marginTop: spacing.sm }}>
                👥 {scanResult.quantity} person(s)
              </div>
            )}
            {scanResult.orderNumber && (
              <div style={{ ...type.caption, color: c.muted, marginTop: spacing.xs }}>
                {scanResult.orderNumber} · {scanResult.customerType}
              </div>
            )}
          </div>
        )}

        <p style={{ ...type.body, color: c.muted, marginTop: spacing.base, textAlign: 'center' }}>
          {scanResult.reason || scanResult.message}
        </p>

        {/* Error banner */}
        {error && (
          <div style={{
            ...alertStyle('error', 'dark'), width: '100%', maxWidth: '360px',
            marginTop: spacing.base, justifyContent: 'center', fontWeight: '600',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ width: '100%', maxWidth: '360px', marginTop: spacing['2xl'] }}>
          {isValid && !isConfirmed && (
            <button onClick={handleConfirmCheckin} disabled={loading} style={{
              ...btn('success', 'dark'), marginBottom: spacing.md,
              fontSize: '20px', padding: `${spacing.lg}px`,
              opacity: loading ? 0.5 : 1,
            }}>
              {loading ? 'Processing…' : '✅ Confirm Check-In'}
            </button>
          )}
          <button onClick={() => { setScanResult(null); setMode('scan'); setError(''); }} style={{
            ...btn('secondary', 'dark'), width: '100%', padding: `${spacing.base}px`,
          }}>
            {isConfirmed ? '📸 Scan Next' : '← Back to Scanner'}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOOKUP SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'lookup') return (
    <div style={pageStyle('dark')}>
      <style>{keyframes}</style>

      <div style={{
        padding: spacing.base, borderBottom: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', gap: spacing.md,
        background: c.bgAlt,
      }}>
        <button onClick={() => setMode('scan')} style={{
          ...btn('icon', 'dark'), border: 'none', padding: spacing.sm,
        }}>←</button>
        <h2 style={{ ...type.sectionTitle, color: c.text, margin: 0 }}>Manual Lookup</h2>
      </div>

      <div style={{ padding: spacing.base }}>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <input
            style={{ ...inputStyle('dark'), flex: 1, textAlign: 'left' }}
            placeholder="Phone, name, or order #…"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading} style={{
            ...btn('primary', 'dark'), width: 'auto', padding: `${spacing.base}px ${spacing.xl}px`,
          }}>
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {/* Results */}
        <div style={{ marginTop: spacing.base }}>
          {searchResults.map((r, i) => (
            <div key={i} style={{
              ...card('dark'), padding: spacing.base, marginBottom: spacing.md,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...type.bodyMedium, color: c.text }}>{r.purchaserName}</div>
                  <div style={{ ...type.caption, color: c.muted }}>{r.orderNumber} · {r.customerType}</div>
                </div>
                <span style={chip(r.paymentStatus, 'dark')}>{r.paymentStatus}</span>
              </div>

              {r.tickets?.map((ticket, ti) => (
                <div key={ti} style={{
                  marginTop: spacing.sm, padding: spacing.md,
                  borderRadius: `${radii.sm}px`, background: c.bgAlt,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <span style={{ ...type.bodyMedium, color: c.text }}>
                      {ticket.type === 'daily_entry' ? 'Daily Entry' : ticket.type === 'combo_pass' ? 'Combo Pass' : ticket.type === 'pioneer_pass' ? 'Pioneer Pass' : ticket.type}
                      {ticket.eventDate ? ` — ${new Date(ticket.eventDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
                      {` × ${ticket.quantity}`}
                    </span>
                    <span style={{ ...chip(ticket.status === 'active' ? 'valid' : ticket.status === 'used' ? 'checked_in' : 'invalid', 'dark'), marginLeft: spacing.sm }}>
                      {ticket.status}
                    </span>
                  </div>
                  {ticket.status === 'active' && (
                    <button onClick={() => {
                      setScanResult({ valid: true, ticketId: ticket.id, purchaserName: r.purchaserName, quantity: ticket.quantity, orderNumber: r.orderNumber, customerType: r.customerType, scanResult: 'valid', reason: 'Manual lookup' });
                      setMode('result');
                    }} style={{ ...btn('success', 'dark'), width: 'auto', padding: `${spacing.sm}px ${spacing.base}px`, fontSize: '13px' }}>
                      Check In
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
          {searchResults.length === 0 && searchTerm && !loading && (
            <p style={{ ...type.body, color: c.muted, textAlign: 'center', marginTop: spacing['2xl'] }}>No results found</p>
          )}
        </div>
      </div>
    </div>
  );

  return null;
}
