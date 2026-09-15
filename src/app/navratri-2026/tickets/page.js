'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { colors, spacing, type, radii, card, page as pageStyle, keyframes, alert as alertStyle, emptyState as emptyStateStyle } from '@/lib/navratri/designSystem';

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

const QR_WINDOW_MS = 30000;

function usePreferredTheme() {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    setTheme(mq.matches ? 'light' : 'dark');
    const handler = (e) => setTheme(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return theme;
}

export default function TicketViewerPage() {
  const theme = usePreferredTheme();
  const c = colors(theme);

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
      const qrBg = theme === 'light' ? 'FFFFFF' : '18181B';
      const qrFg = theme === 'light' ? '171717' : 'FAFAFA';
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrPayload)}&bgcolor=${qrBg}&color=${qrFg}&format=svg`;
      setQrDataUrl(qrUrl);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  }, [theme]);

  // Refresh QR every 30 seconds
  useEffect(() => {
    if (tickets.length === 0) return;

    const refreshQR = () => {
      generateQR(tickets[activeTicketIdx]);
      setCountdown(30);
    };

    refreshQR();

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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...pageStyle(theme), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ ...type.body, color: c.muted }}>Loading your tickets…</p>
      </div>
      <style>{keyframes}</style>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ ...pageStyle(theme), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: c.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>⚠️</div>
        <h2 style={{ ...type.sectionTitle, color: c.red, marginBottom: spacing.sm }}>Unable to Load Tickets</h2>
        <p style={{ ...type.secondary, color: c.muted }}>{error}</p>
      </div>
      <style>{keyframes}</style>
    </div>
  );

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (tickets.length === 0) return (
    <div style={{ ...pageStyle(theme), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: c.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>🎫</div>
        <h2 style={{ ...type.sectionTitle, color: c.text }}>No Active Tickets</h2>
        <p style={{ ...type.secondary, color: c.muted, marginTop: spacing.sm }}>No active tickets found for this order.</p>
      </div>
      <style>{keyframes}</style>
    </div>
  );

  const activeTicket = tickets[activeTicketIdx];

  return (
    <div style={pageStyle(theme)}>
      <style>{keyframes}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        background: c.gradient, padding: `${spacing.lg}px ${spacing.base}px`,
        textAlign: 'center',
      }}>
        <p style={{ ...type.overline, color: 'rgba(255,255,255,0.7)', margin: 0 }}>NAVRATRI 2026</p>
        <p style={{ ...type.cardTitle, color: '#fff', margin: `${spacing.xs}px 0 0` }}>{order?.purchaserName}</p>
        <p style={{ ...type.caption, color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Order: {order?.orderNumber}</p>
      </div>

      {/* ── Ticket tabs (if multiple) ─────────────────────────────────────── */}
      {tickets.length > 1 && (
        <div style={{ display: 'flex', overflowX: 'auto', padding: `${spacing.md}px ${spacing.base}px 0`, gap: `${spacing.sm}px`, WebkitOverflowScrolling: 'touch' }}>
          {tickets.map((t, i) => (
            <button key={t.id} onClick={() => setActiveTicketIdx(i)} style={{
              padding: `${spacing.sm}px ${spacing.base}px`,
              borderRadius: `${radii.sm}px`, border: 'none',
              fontSize: '13px', fontWeight: '600',
              background: i === activeTicketIdx ? c.primary : c.inputBg,
              color: i === activeTicketIdx ? '#fff' : c.muted,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}>
              {t.dateLabel}
            </button>
          ))}
        </div>
      )}

      {/* ── Ticket Card ───────────────────────────────────────────────────── */}
      <div style={{ padding: `${spacing.xl}px ${spacing.base}px`, maxWidth: '420px', margin: '0 auto' }}>
        <div style={{
          ...card(theme, 'elevated'),
          borderRadius: `${radii.xl}px`,
          overflow: 'hidden',
        }}>
          {/* Ticket info header */}
          <div style={{ padding: `${spacing.xl}px ${spacing.xl}px ${spacing.base}px`, textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: `${spacing.xs}px ${spacing.md}px`,
              borderRadius: radii.full,
              background: c.accentBg, color: c.accent,
              ...type.caption, fontWeight: '600',
            }}>
              {activeTicket.type === 'daily_entry' ? `📅 ${activeTicket.dateLabel}` :
                activeTicket.type === 'combo_pickup' ? '🎪 Full Event Pass' : '🏆 Pioneer Pass'}
            </div>
            <div style={{ ...type.secondary, color: c.muted, marginTop: spacing.sm }}>
              Qty: <strong style={{ color: c.text }}>{activeTicket.quantity}</strong> person(s)
            </div>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: `0 ${spacing.xl}px ${spacing.base}px` }}>
            <div style={{
              width: '280px', height: '280px',
              background: c.card, borderRadius: `${radii.lg}px`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${c.border}`,
            }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" style={{ width: '260px', height: '260px', borderRadius: `${radii.sm}px` }} />
              ) : (
                <div style={{ width: '36px', height: '36px', border: `3px solid ${c.border}`, borderTopColor: c.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              )}
            </div>
          </div>

          {/* Countdown */}
          <div style={{ textAlign: 'center', padding: `0 ${spacing.xl}px ${spacing.lg}px` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: countdown > 10 ? c.green : countdown > 5 ? c.amber : c.red,
                transition: 'background 0.3s',
              }} />
              <span style={{ ...type.caption, color: c.muted }}>
                Refreshes in <strong style={{ color: c.text, fontVariantNumeric: 'tabular-nums' }}>{countdown}s</strong>
              </span>
            </div>
            <p style={{ ...type.caption, color: c.placeholder, marginTop: spacing.xs }}>
              QR code changes every 30s for security
            </p>
          </div>

          {/* Divider with punch holes */}
          <div style={{ position: 'relative', margin: `0 ${spacing.base}px` }}>
            <div style={{ borderTop: `2px dashed ${c.border}` }} />
            <div style={{ position: 'absolute', left: '-24px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: c.bg }} />
            <div style={{ position: 'absolute', right: '-24px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: c.bg }} />
          </div>

          {/* Venue info */}
          <div style={{ padding: `${spacing.lg}px ${spacing.xl}px`, textAlign: 'center' }}>
            <div style={{ ...type.bodyMedium, color: c.text }}>{venue?.name}</div>
            <div style={{ ...type.caption, color: c.muted, marginTop: spacing.xs }}>{venue?.address}</div>
            {activeTicket.date && (
              <div style={{ ...type.bodyMedium, color: c.accent, marginTop: spacing.sm }}>
                {new Date(activeTicket.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {' · '}7:00 PM – 11:00 PM
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: spacing.xl,
          padding: `${spacing.base}px ${spacing.lg}px`,
          borderRadius: `${radii.lg}px`,
          background: c.primaryBg,
          border: `1px solid rgba(255,107,53,0.12)`,
        }}>
          <div style={{ ...type.bodyMedium, color: c.text, marginBottom: spacing.sm }}>At the Gate</div>
          <ol style={{ margin: 0, paddingLeft: '20px', color: c.muted, ...type.secondary, lineHeight: '1.9' }}>
            <li>Show this screen to the scanner</li>
            <li>Staff will scan your QR code</li>
            <li>Staff will verify your name</li>
            <li>Enjoy Navratri! 🪔</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
