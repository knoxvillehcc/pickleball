'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NavratriVendorSuccessClient() {
  const searchParams = useSearchParams();
  const regNumber = searchParams.get('reg') || '';
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  const saffron = '#FF6B35';
  const gold = '#FFB800';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0714',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background festive glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,107,53,0.18), transparent 65%)', borderRadius: '50%' }} />
      </div>

      <div style={{
        maxWidth: '580px',
        width: '100%',
        background: '#161124',
        border: '1px solid rgba(255,107,53,0.3)',
        borderRadius: '24px',
        padding: '40px 32px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.4s ease',
      }}>
        {/* Festive Badge */}
        <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 20px' }}>
          ✓
        </div>

        <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '2px', color: gold, textTransform: 'uppercase', marginBottom: '8px' }}>
          🪔 Navratri 2026 · Knoxville Hindu Community Center
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: '950', margin: '0 0 10px', color: '#FFFFFF' }}>
          Vendor Booth Confirmed!
        </h1>

        <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6, margin: '0 0 28px' }}>
          Thank you for registering your vendor space. Your payment has been processed and a confirmation receipt has been sent to your email.
        </p>

        {/* Reg Number Box */}
        <div style={{
          background: 'rgba(255,107,53,0.1)',
          border: '1px solid rgba(255,107,53,0.35)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '28px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94A3B8', marginBottom: '6px' }}>
            Vendor Registration Number
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '26px', fontWeight: '900', color: saffron, letterSpacing: '3px' }}>
            {regNumber || 'NVV-2026-CONFIRMED'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            Save this number for check-in on your scheduled event days
          </div>
        </div>

        {/* What to Expect */}
        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', marginBottom: '28px' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: gold, marginBottom: '12px' }}>
            What to Expect Next
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5 }}>
            <div>📧 <strong>Receipt & Pass:</strong> Check your inbox for your complete confirmation receipt and date breakdown.</div>
            <div>📍 <strong>Setup Window:</strong> 5:30 PM to 6:45 PM on each registered evening. All doors clear by 6:45 PM.</div>
            <div>🕒 <strong>Event Hours:</strong> 7:00 PM to 11:00 PM nightly.</div>
            <div>🏢 <strong>Venue:</strong> Hindu Community Center, 8580 Hickory Creek Rd, Lenoir City, TN 37771.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/navratri-2026"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: saffron,
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Go to Navratri Festival Page →
          </Link>
          <Link
            href="/register/navratri/vendor"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#CBD5E1',
              fontWeight: '800',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Register Another Booth
          </Link>
        </div>
      </div>
    </div>
  );
}
