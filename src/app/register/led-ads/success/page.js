'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessInner() {
  const params = useSearchParams();
  const regNumber = params.get('reg') || 'N/A';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '24px',
    }}>
      <div style={{
        maxWidth: '520px', width: '100%', textAlign: 'center',
        background: 'var(--bg-primary)', borderRadius: '24px',
        border: '1px solid var(--border)', padding: '48px 36px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #22C55E, #16A34A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '40px', boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
        }}>✅</div>

        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Payment Successful!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
          Your LED Screen Ad registration for Navratri 2026 has been confirmed.
        </p>

        <div style={{
          padding: '16px 24px', borderRadius: '14px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '4px' }}>REGISTRATION NUMBER</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#FF9933', letterSpacing: '1px' }}>{regNumber}</div>
        </div>

        <div style={{
          padding: '14px 20px', borderRadius: '12px',
          background: 'rgba(255,153,51,0.06)', border: '1px solid rgba(255,153,51,0.15)',
          fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6',
        }}>
          📐 <strong>Media Requirement:</strong> 1080×1920 pixels (portrait, high resolution).
          <br />Please submit your ad media at least 7 days before the event.
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '20px' }}>
          A confirmation email has been sent to your registered email address.
          <br />Please save your registration number for reference.
        </p>
      </div>
    </div>
  );
}

export default function LedAdsSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <SuccessInner />
    </Suspense>
  );
}
