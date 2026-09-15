'use client';
import { useState, useEffect } from 'react';
import { colors, spacing, type, radii, btn, input as dsInput, card, page as pageStyle, keyframes, alert as alertStyle, chip } from '@/lib/navratri/designSystem';

/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Pickup Station — Wristband & Parking Distribution
 * ═══════════════════════════════════════════════════════════════════
 * Dark-only for event-day operations. All business logic preserved.
 */

const c = colors('dark');

// Stepper button helper
const StepperBtn = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: '48px', height: '48px', borderRadius: `${radii.md}px`,
    border: `1px solid ${c.border}`, background: 'transparent',
    color: disabled ? c.placeholder : c.text,
    fontSize: '22px', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  }}>{children}</button>
);

export default function PickupPage() {
  const [mode, setMode] = useState('login');
  const [sessionToken, setSessionToken] = useState('');
  const [employee, setEmployee] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pickupData, setPickupData] = useState(null);
  const [wristbandQty, setWristbandQty] = useState(0);
  const [parkingQty, setParkingQty] = useState(0);
  const [notes, setNotes] = useState('');
  const [eventId, setEventId] = useState(null);
  const [pickupResult, setPickupResult] = useState(null);
  const [stats, setStats] = useState({ wristbands: 0, parking: 0, total: 0 });

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/navratri/events');
      const data = await res.json();
      if (data.events?.length) setEventId(data.events[0].id);
    })();
    const saved = localStorage.getItem('navratri_pickup_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.token && new Date(s.expires) > new Date()) {
          setSessionToken(s.token); setEmployee(s.employee); setMode('search');
        }
      } catch { }
    }
  }, []);

  const handleLogin = async () => {
    if (!pin || !eventId) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/navratri/scanner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth', pin, eventId, sessionType: 'pickup' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSessionToken(data.sessionToken); setEmployee(data.employee); setMode('search');
      localStorage.setItem('navratri_pickup_session', JSON.stringify({
        token: data.sessionToken, employee: data.employee,
        expires: new Date(Date.now() + 4 * 3600000).toISOString(),
      }));
    } catch { setError('Login failed'); }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const res = await fetch('/api/navratri/pickup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', search: searchTerm, sessionToken }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { }
    finally { setLoading(false); }
  };

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    const isComboOrPioneer = order.orderType === 'combo' || order.orderType === 'pioneer_claim';
    const maxW = isComboOrPioneer ? 2 : 0;
    const alreadyPickedW = (order.pickups || []).reduce((s, p) => s + (p.type?.includes('wristband') ? (p.qty || 0) : 0), 0);
    const alreadyPickedP = (order.pickups || []).reduce((s, p) => s + (p.type === 'parking_pass' ? (p.qty || 0) : 0), 0);
    const remainW = Math.max(0, maxW - alreadyPickedW);
    // Only combo/pioneer WITH an Odoo member ID are eligible for parking
    const maxP = (isComboOrPioneer && order.odooPartnerId) ? 1 : 0;
    const remainP = Math.max(0, maxP - alreadyPickedP);
    setWristbandQty(remainW);
    setParkingQty(0);
    setSelectedOrder({ ...order, maxWristbands: maxW, remainingWristbands: remainW, alreadyPickedW, maxParking: maxP, remainingParking: remainP, alreadyPickedP });
    setMode('confirm');
  };

  const handleConfirmPickup = async () => {
    if (!selectedOrder) return;
    setLoading(true); setError(''); setPickupResult(null);
    try {
      let pickupType;
      if (parkingQty > 0 && wristbandQty === 0) {
        pickupType = 'parking_pass';
      } else if (selectedOrder.customerType === 'pioneer' || selectedOrder.customerType === 'committee') {
        pickupType = 'pioneer_wristband';
      } else {
        pickupType = 'combo_wristband';
      }
      const res = await fetch('/api/navratri/pickup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm', orderId: selectedOrder.id, pickupType,
          wristbandQty, parkingQty, notes, odooPartnerId: selectedOrder.odooPartnerId,
          sessionToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPickupResult({ success: true, message: data.message });
        setStats(prev => ({
          wristbands: prev.wristbands + wristbandQty,
          parking: prev.parking + parkingQty,
          total: prev.total + 1,
        }));
        setTimeout(() => {
          setPickupResult(null); setSelectedOrder(null);
          setSearchTerm(''); setSearchResults([]); setMode('search');
        }, 2500);
      } else {
        setError(data.error || 'Pickup failed');
      }
    } catch { setError('Pickup failed'); }
    finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'login') return (
    <div style={{
      ...pageStyle('dark'),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: spacing.xl,
      background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bgAlt} 100%)`,
    }}>
      <style>{keyframes}</style>

      <div style={{
        width: '96px', height: '96px', borderRadius: `${radii.xl}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px',
        background: c.accentBg, border: `1px solid ${c.border}`, marginBottom: spacing['2xl'],
      }}>🎫</div>

      <h1 style={{ ...type.pageTitle, color: c.text, margin: `0 0 ${spacing.xs}px` }}>Pickup Station</h1>
      <p style={{ ...type.body, color: c.muted, marginBottom: spacing['2xl'] }}>Enter your staff PIN to begin</p>

      {error && <div style={{ ...alertStyle('error', 'dark'), width: '100%', maxWidth: '340px', marginBottom: spacing.lg, justifyContent: 'center' }}>{error}</div>}

      {/* PIN dots */}
      <div style={{ display: 'flex', gap: spacing.base, marginBottom: spacing.xl }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: pin.length > i ? c.accent : 'transparent',
            border: `2px solid ${pin.length > i ? c.accent : c.borderSolid}`,
            transition: 'all 0.2s',
            boxShadow: pin.length > i ? `0 0 12px rgba(255,215,0,0.3)` : 'none',
          }} />
        ))}
      </div>

      <input
        style={{ ...dsInput('dark'), maxWidth: '340px', textAlign: 'center', letterSpacing: '12px', fontSize: '24px', fontWeight: '600' }}
        type="password" inputMode="numeric" maxLength={6} value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus
      />

      <button onClick={handleLogin} disabled={loading || !pin} style={{
        ...btn('primaryLg', 'dark'), maxWidth: '340px', marginTop: spacing.xl,
        background: `linear-gradient(135deg, #FFD700, #F59E0B)`, color: '#000',
        opacity: loading || !pin ? 0.4 : 1,
      }}>
        {loading ? 'Authenticating…' : 'Continue'}
      </button>

      <p style={{ ...type.caption, color: c.placeholder, marginTop: spacing['3xl'] }}>
        Navratri 2026 · Wristband Distribution
      </p>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIRM PICKUP
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'confirm' && selectedOrder) return (
    <div style={{ ...pageStyle('dark'), padding: spacing.base }}>
      <style>{keyframes}</style>

      <button onClick={() => { setMode('search'); setSelectedOrder(null); setError(''); }}
        style={{ ...btn('ghost', 'dark'), padding: `${spacing.sm}px 0`, marginBottom: spacing.base }}>
        ← Back
      </button>

      {pickupResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px',
            background: c.greenBg, border: `3px solid ${c.green}`, marginBottom: spacing.xl,
          }}>✅</div>
          <h2 style={{ ...type.sectionTitle, color: c.green }}>Pickup Complete!</h2>
          <p style={{ ...type.body, color: c.muted, marginTop: spacing.sm }}>{pickupResult.message}</p>
        </div>
      ) : (
        <div style={{ ...card('dark'), padding: spacing.xl }}>
          <h2 style={{ ...type.sectionTitle, color: c.text, marginBottom: spacing.xs }}>{selectedOrder.purchaserName}</h2>
          <p style={{ ...type.secondary, color: c.muted }}>{selectedOrder.orderNumber} · {selectedOrder.customerType}</p>

          {error && <div style={{ ...alertStyle('error', 'dark'), marginTop: spacing.md }}>{error}</div>}

          {selectedOrder.alreadyPickedW > 0 && (
            <div style={{ ...alertStyle('warning', 'dark'), marginTop: spacing.md }}>
              ⚠️ Already picked up: {selectedOrder.alreadyPickedW} wristband(s)
            </div>
          )}

          {selectedOrder.remainingWristbands <= 0 && selectedOrder.maxWristbands > 0 && (
            <div style={{ ...alertStyle('error', 'dark'), marginTop: spacing.md }}>
              ❌ All wristbands already picked up for this order
            </div>
          )}

          {/* Not eligible banner for daily/non-member */}
          {selectedOrder.maxWristbands === 0 && selectedOrder.maxParking === 0 && (
            <div style={{ ...alertStyle('error', 'dark'), marginTop: spacing.md }}>
              ❌ Daily / non-member orders are not eligible for wristband or parking pickup. Only Combo Pass and Pioneer Pass orders qualify.
            </div>
          )}

          {/* Wristbands */}
          <div style={{ marginTop: spacing.xl }}>
            <label style={{ ...type.label, color: c.accent }}>
              Wristbands {selectedOrder.maxWristbands > 0 && (
                <span style={{ ...type.caption, color: c.muted, fontWeight: '400' }}>
                  (max {selectedOrder.maxWristbands}, {selectedOrder.remainingWristbands} remaining)
                </span>
              )}
              {selectedOrder.maxWristbands === 0 && (
                <span style={{ ...type.caption, color: c.muted, fontWeight: '400' }}> — not eligible</span>
              )}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.base, marginTop: spacing.sm }}>
              <StepperBtn onClick={() => setWristbandQty(Math.max(0, wristbandQty - 1))} disabled={wristbandQty <= 0}>−</StepperBtn>
              <span style={{ ...type.bigNum, color: c.text, minWidth: '40px', textAlign: 'center' }}>{wristbandQty}</span>
              <StepperBtn onClick={() => setWristbandQty(Math.min(selectedOrder.remainingWristbands || 0, wristbandQty + 1))} disabled={wristbandQty >= (selectedOrder.remainingWristbands || 0)}>+</StepperBtn>
            </div>
          </div>

          {/* Parking */}
          <div style={{ marginTop: spacing.xl }}>
            <label style={{ ...type.label, color: c.accent }}>
              Parking Passes
              {selectedOrder.maxParking === 0 && (
                <span style={{ ...type.caption, color: c.muted, fontWeight: '400' }}> — not eligible</span>
              )}
              {selectedOrder.alreadyPickedP > 0 && (
                <span style={{ ...type.caption, color: c.muted, fontWeight: '400' }}> (already picked up {selectedOrder.alreadyPickedP})</span>
              )}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.base, marginTop: spacing.sm }}>
              <StepperBtn onClick={() => setParkingQty(Math.max(0, parkingQty - 1))} disabled={parkingQty <= 0}>−</StepperBtn>
              <span style={{ ...type.bigNum, color: c.text, minWidth: '40px', textAlign: 'center' }}>{parkingQty}</span>
              <StepperBtn onClick={() => setParkingQty(Math.min(selectedOrder.remainingParking || 0, parkingQty + 1))} disabled={parkingQty >= (selectedOrder.remainingParking || 0)}>+</StepperBtn>
            </div>
          </div>

          {/* Notes */}
          <textarea
            style={{ ...dsInput('dark'), marginTop: spacing.lg, resize: 'vertical', minHeight: '60px' }}
            rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
          />

          <button onClick={handleConfirmPickup}
            disabled={loading || (wristbandQty === 0 && parkingQty === 0)}
            style={{
              ...btn('success', 'dark'), marginTop: spacing.xl,
              fontSize: '18px', padding: `${spacing.lg}px`,
              opacity: loading || (wristbandQty === 0 && parkingQty === 0) ? 0.5 : 1,
            }}>
            {loading ? 'Processing…' : `✅ Confirm Pickup (${wristbandQty}W + ${parkingQty}P)`}
          </button>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH MODE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={pageStyle('dark')}>
      <style>{keyframes}</style>

      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${spacing.md}px ${spacing.base}px`,
        borderBottom: `1px solid ${c.border}`, background: c.bgAlt,
      }}>
        <div>
          <div style={{ ...type.bodyMedium, color: c.text }}>🎫 Pickup — {employee?.name}</div>
          <div style={{ ...type.caption, color: c.muted }}>
            Issued: {stats.wristbands}W / {stats.parking}P ({stats.total} pickups)
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem('navratri_pickup_session'); setMode('login'); setPin(''); }}
          style={{ ...btn('destructive', 'dark'), padding: `${spacing.sm}px ${spacing.md}px`, ...type.caption }}>
          Exit
        </button>
      </div>

      <div style={{ padding: spacing.base }}>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <input
            style={{ ...dsInput('dark'), flex: 1, textAlign: 'left' }}
            placeholder="Search by phone, name, or order #…"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} autoFocus
          />
          <button onClick={handleSearch} disabled={loading} style={{
            ...btn('primary', 'dark'), width: 'auto', padding: `${spacing.base}px ${spacing.xl}px`,
          }}>
            {loading ? '…' : '🔍'}
          </button>
        </div>

        {searchResults.map((r, i) => (
          <div key={i} onClick={() => handleSelectOrder(r)} style={{
            ...card('dark', 'interactive'), padding: spacing.base, marginTop: spacing.md,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ ...type.bodyMedium, color: c.text }}>{r.purchaserName}</div>
                <div style={{ ...type.caption, color: c.muted }}>{r.orderNumber} · {r.customerType} · {r.orderType}</div>
              </div>
              <span style={chip(r.paymentStatus, 'dark')}>{r.paymentStatus}</span>
            </div>
            {r.pickups?.length > 0 && (
              <div style={{ ...alertStyle('warning', 'dark'), marginTop: spacing.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
                Previous pickups: {r.pickups.map(p => `${p.type} (${p.qty})`).join(', ')}
              </div>
            )}
          </div>
        ))}

        {searchResults.length === 0 && searchTerm && !loading && (
          <p style={{ ...type.body, color: c.muted, textAlign: 'center', marginTop: spacing['2xl'] }}>No results found</p>
        )}
      </div>
    </div>
  );
}
