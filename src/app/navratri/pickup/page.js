'use client';
import { useState, useEffect } from 'react';

const C = {
  bg: '#0a0a0f', card: '#141420', border: 'rgba(139,30,63,0.3)',
  primary: '#FF6B35', accent: '#FFD700', text: '#F8FAFC', muted: '#94A3B8',
  green: '#34D399', red: '#EF4444',
};

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
    // Set default wristband qty based on order type
    const wQty = order.orderType === 'combo' || order.orderType === 'pioneer_claim' ? 2 : 0;
    setWristbandQty(wQty);
    setParkingQty(0);
    setMode('confirm');
  };

  const handleConfirmPickup = async () => {
    if (!selectedOrder) return;
    setLoading(true); setError(''); setPickupResult(null);
    try {
      // Determine pickup_type based on order type (DB constraint: combo_wristband, pioneer_wristband, parking_pass)
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

  const inputStyle = { width: '100%', padding: '16px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: '16px', outline: 'none', boxSizing: 'border-box' };

  if (mode === 'login') return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #0a0a0f 0%, #141420 100%)', color: C.text, fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Glowing icon */}
      <div style={{ width: '120px', height: '120px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,107,53,0.12))', border: '1px solid rgba(255,215,0,0.2)', boxShadow: '0 0 60px rgba(255,215,0,0.08)', marginBottom: '32px' }}>
        🎫
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Pickup Station</h1>
      <p style={{ color: C.muted, fontSize: '15px', marginBottom: '36px', fontWeight: '500' }}>Enter your staff PIN to begin</p>

      {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '14px 20px', color: C.red, fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '340px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>{error}</div>}

      {/* PIN dots */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: pin.length > i ? C.accent : 'rgba(255,255,255,0.08)',
            border: `2px solid ${pin.length > i ? C.accent : 'rgba(255,255,255,0.15)'}`,
            boxShadow: pin.length > i ? '0 0 12px rgba(255,215,0,0.3)' : 'none',
            transition: 'all 0.2s ease',
          }} />
        ))}
      </div>

      <input style={{ ...inputStyle, maxWidth: '340px', letterSpacing: '16px', fontSize: '28px', textAlign: 'center', fontWeight: '700', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.08)' }}
        type="password" maxLength={6} placeholder="" value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />

      <button onClick={handleLogin} disabled={loading || !pin}
        style={{ width: '100%', maxWidth: '340px', padding: '18px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #FFD700, #F59E0B)', color: '#000', fontSize: '17px', fontWeight: '800', cursor: 'pointer', marginTop: '28px', opacity: loading || !pin ? 0.4 : 1, boxShadow: loading || !pin ? 'none' : '0 4px 24px rgba(255,215,0,0.25)', transition: 'all 0.3s ease', letterSpacing: '-0.01em' }}>
        {loading ? 'Authenticating...' : 'Continue'}
      </button>

      <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '12px', marginTop: '40px', fontWeight: '500' }}>
        Navratri 2026 • Wristband Distribution
      </p>

      <style>{`input::placeholder { color: rgba(148,163,184,0.3) !important; }`}</style>
    </div>
  );

  if (mode === 'confirm' && selectedOrder) return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter',sans-serif", padding: '16px' }}>
      <button onClick={() => { setMode('search'); setSelectedOrder(null); }}
        style={{ background: 'none', border: 'none', color: C.text, fontSize: '16px', cursor: 'pointer', marginBottom: '16px' }}>← Back</button>

      {pickupResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>✅</div>
          <h2 style={{ color: C.green, fontSize: '24px', fontWeight: '900' }}>Pickup Complete!</h2>
          <p style={{ color: C.muted, marginTop: '8px' }}>{pickupResult.message}</p>
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius: '20px', border: `1px solid ${C.border}`, padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '4px' }}>{selectedOrder.purchaserName}</h2>
          <p style={{ color: C.muted, fontSize: '14px' }}>{selectedOrder.orderNumber} • {selectedOrder.customerType}</p>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '12px', padding: '12px', color: C.red, fontSize: '14px', marginTop: '12px' }}>{error}</div>}

          <div style={{ marginTop: '24px' }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: C.accent }}>Wristbands</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              <button onClick={() => setWristbandQty(Math.max(0, wristbandQty - 1))} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '24px', cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: '32px', fontWeight: '900', minWidth: '40px', textAlign: 'center' }}>{wristbandQty}</span>
              <button onClick={() => setWristbandQty(wristbandQty + 1)} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '24px', cursor: 'pointer' }}>+</button>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: C.accent }}>Parking Passes</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              <button onClick={() => setParkingQty(Math.max(0, parkingQty - 1))} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '24px', cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: '32px', fontWeight: '900', minWidth: '40px', textAlign: 'center' }}>{parkingQty}</span>
              <button onClick={() => setParkingQty(parkingQty + 1)} style={{ width: '48px', height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '24px', cursor: 'pointer' }}>+</button>
            </div>
          </div>

          <textarea style={{ ...inputStyle, marginTop: '20px', resize: 'vertical' }} rows={2} value={notes}
            onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" />

          <button onClick={handleConfirmPickup} disabled={loading || (wristbandQty === 0 && parkingQty === 0)}
            style={{ width: '100%', padding: '18px', borderRadius: '14px', border: 'none', background: C.green, color: '#000', fontSize: '18px', fontWeight: '800', cursor: 'pointer', marginTop: '24px', opacity: loading || (wristbandQty === 0 && parkingQty === 0) ? 0.5 : 1 }}>
            {loading ? 'Processing...' : `✅ Confirm Pickup (${wristbandQty}W + ${parkingQty}P)`}
          </button>
        </div>
      )}
    </div>
  );

  // Search mode
  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>🎫 Pickup — {employee?.name}</div>
          <div style={{ fontSize: '11px', color: C.muted }}>Issued: {stats.wristbands}W / {stats.parking}P ({stats.total} pickups)</div>
        </div>
        <button onClick={() => { localStorage.removeItem('navratri_pickup_session'); setMode('login'); setPin(''); }}
          style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid rgba(239,68,68,0.3)`, background: 'transparent', color: C.red, fontSize: '13px', cursor: 'pointer' }}>Exit</button>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input style={{ ...inputStyle, flex: 1, textAlign: 'left' }} placeholder="Search by phone, name, or order #..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} autoFocus />
          <button onClick={handleSearch} disabled={loading}
            style={{ padding: '16px 24px', borderRadius: '14px', border: 'none', background: C.primary, color: 'white', fontWeight: '800', cursor: 'pointer' }}>
            {loading ? '...' : '🔍'}
          </button>
        </div>

        {searchResults.map((r, i) => (
          <div key={i} onClick={() => handleSelectOrder(r)}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginTop: '12px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>{r.purchaserName}</div>
                <div style={{ fontSize: '13px', color: C.muted }}>{r.orderNumber} • {r.customerType} • {r.orderType}</div>
              </div>
              <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: r.paymentStatus === 'paid' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', color: r.paymentStatus === 'paid' ? C.green : C.red, fontWeight: '700', height: 'fit-content' }}>
                {r.paymentStatus}
              </span>
            </div>
            {r.pickups?.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: C.accent }}>
                ⚠️ Previous pickups: {r.pickups.map(p => `${p.type} (${p.qty})`).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
