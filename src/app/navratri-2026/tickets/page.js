'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Ticket Viewer — Rolling QR Code Page
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is the page customers open on their phone at the gate.
 * The QR code refreshes every 30 seconds to prevent sharing.
 *
 * URL: /navratri-2026/tickets?order=NV-2026-000001&phone=8651234567
 */

const C = {
  bg: '#0f0d13', card: '#1a1625', border: 'rgba(139,30,63,0.25)',
  primary: '#FF6B35', secondary: '#8B1E3F', accent: '#FFD700',
  text: '#F8FAFC', muted: '#94A3B8', green: '#34D399', red: '#EF4444',
};

const QR_WINDOW_MS = 30000;

export default function TicketViewerPage() {
  const [tickets, setTickets] = useState([]);
  const [order, setOrder] = useState(null);
  const [venue, setVenue] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTicketIdx, setActiveTicketIdx] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [countdown, setCountdown] = useState(30);
  const canvasRef = useRef(null);

  // Parse URL params
  const getParams = () => {
    if (typeof window === 'undefined') return { order: '', phone: '' };
    const params = new URLSearchParams(window.location.search);
    return { order: params.get('order') || '', phone: params.get('phone') || '' };
  };

  // Load tickets
  useEffect(() => {
    (async () => {
      const { order: orderNum, phone } = getParams();
      if (!orderNum || !phone) { setError('Missing order or phone in URL'); setLoading(false); return; }

      try {
        const res = await fetch(`/api/navratri/tickets?order=${encodeURIComponent(orderNum)}&phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error); setLoading(false); return; }
        setOrder(data.order);
        setTickets(data.tickets || []);
        setVenue(data.venue);
      } catch { setError('Failed to load tickets'); }
      finally { setLoading(false); }
    })();
  }, []);

  // Generate Rolling QR
  const generateQR = useCallback(async (ticket) => {
    if (!ticket) return;
    const timeWindow = Math.floor(Date.now() / QR_WINDOW_MS);

    try {
      // Generate HMAC using Web Crypto
      const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(ticket.tokenSecret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sig = await crypto.subtle.sign(
        'HMAC', key, new TextEncoder().encode(`${ticket.token}:${timeWindow}`)
      );
      const hmac = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

      const qrPayload = `NV:${ticket.token}:${timeWindow}:${hmac}`;

      // Generate QR code on canvas
      drawQR(qrPayload);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  }, []);

  // QR Drawing (simple QR implementation using API)
  const drawQR = (data) => {
    // Use qrserver API for QR generation
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data)}&bgcolor=1a1625&color=F8FAFC&format=svg`;
    setQrDataUrl(qrUrl);
  };

  // Refresh QR every 30 seconds
  useEffect(() => {
    if (tickets.length === 0) return;

    const refreshQR = () => {
      generateQR(tickets[activeTicketIdx]);
      setCountdown(30);
    };

    refreshQR(); // Initial

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tickets, activeTicketIdx, generateQR]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 2s infinite' }}>🪔</div>
        <p style={{ color: C.muted }}>Loading your tickets...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: C.red, marginBottom: '12px' }}>Unable to Load Tickets</h2>
        <p style={{ color: C.muted, fontSize: '14px' }}>{error}</p>
      </div>
    </div>
  );

  if (tickets.length === 0) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
        <h2>No Active Tickets</h2>
        <p style={{ color: C.muted }}>No active tickets found for this order.</p>
      </div>
    </div>
  );

  const activeTicket = tickets[activeTicketIdx];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #FF6B35, #8B1E3F)', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>🪔 Navratri 2026</div>
        <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '4px' }}>{order?.purchaserName}</div>
        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>Order: {order?.orderNumber}</div>
      </div>

      {/* Ticket tabs (if multiple) */}
      {tickets.length > 1 && (
        <div style={{ display: 'flex', overflowX: 'auto', padding: '12px 16px 0', gap: '8px' }}>
          {tickets.map((t, i) => (
            <button key={t.id} onClick={() => setActiveTicketIdx(i)} style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: '700',
              background: i === activeTicketIdx ? C.primary : 'rgba(255,255,255,0.05)',
              color: i === activeTicketIdx ? 'white' : C.muted, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {t.dateLabel}
            </button>
          ))}
        </div>
      )}

      {/* QR Code Area */}
      <div style={{ padding: '24px 16px', maxWidth: '400px', margin: '0 auto' }}>
        <div style={{
          background: C.card, borderRadius: '24px', border: `1px solid ${C.border}`,
          overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Ticket info */}
          <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: '20px',
              background: 'rgba(255,215,0,0.1)', color: C.accent, fontSize: '13px', fontWeight: '700',
            }}>
              {activeTicket.type === 'daily_entry' ? `📅 ${activeTicket.dateLabel}` :
                activeTicket.type === 'combo_pickup' ? '🎪 Full Event Pass' : '🏆 Pioneer Pass'}
            </div>
            <div style={{ fontSize: '14px', color: C.muted, marginTop: '8px' }}>
              Qty: <strong style={{ color: C.text }}>{activeTicket.quantity}</strong> person(s)
            </div>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 24px 16px' }}>
            <div style={{
              width: '280px', height: '280px', background: '#1a1625', borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${C.border}`, position: 'relative',
            }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" style={{ width: '260px', height: '260px', borderRadius: '8px' }} />
              ) : (
                <div style={{ color: C.muted }}>Generating QR...</div>
              )}
            </div>
          </div>

          {/* Countdown */}
          <div style={{ textAlign: 'center', padding: '0 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: countdown > 10 ? C.green : countdown > 5 ? C.accent : C.red,
                animation: countdown <= 5 ? 'pulse 0.5s infinite' : 'none',
              }} />
              <span style={{ fontSize: '13px', color: C.muted }}>
                Refreshes in <strong style={{ color: C.text }}>{countdown}s</strong>
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(148,163,184,0.6)', marginTop: '8px' }}>
              This QR code changes every 30 seconds for your security
            </p>
          </div>

          {/* Divider with dots */}
          <div style={{ position: 'relative', margin: '0 16px' }}>
            <div style={{ borderTop: `2px dashed ${C.border}` }} />
            <div style={{ position: 'absolute', left: '-24px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: C.bg }} />
            <div style={{ position: 'absolute', right: '-24px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: C.bg }} />
          </div>

          {/* Venue info */}
          <div style={{ padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{venue?.name}</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>{venue?.address}</div>
            {activeTicket.date && (
              <div style={{ fontSize: '13px', color: C.accent, marginTop: '8px', fontWeight: '700' }}>
                {new Date(activeTicket.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {' • '}7:00 PM – 11:00 PM
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '24px', padding: '16px 20px', borderRadius: '16px',
          background: 'rgba(255,107,53,0.05)', border: `1px solid rgba(255,107,53,0.15)`,
        }}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>📋 At the Gate:</div>
          <ol style={{ margin: 0, paddingLeft: '20px', color: C.muted, fontSize: '13px', lineHeight: '1.8' }}>
            <li>Show this screen to the scanner</li>
            <li>Staff will scan your QR code</li>
            <li>Staff will verify your name</li>
            <li>Enjoy Navratri! 🪔</li>
          </ol>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
