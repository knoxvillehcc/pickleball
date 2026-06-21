'use client';
import { useRouter } from 'next/navigation';

export default function AccessDeniedPage() {
  const router = useRouter();
  return (
    <div style={{
      minHeight: '100vh', background: '#060D1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: '24px', textAlign: 'center',
    }}>
      <div style={{ maxWidth: '420px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 24px',
          background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
        }}>🚫</div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#F1F5F9', margin: '0 0 12px' }}>
          Access Denied
        </h1>
        <p style={{ color: '#64748B', fontSize: '15px', lineHeight: '1.6', margin: '0 0 32px' }}>
          You don't have permission to view this page. Contact your administrator to request access.
        </p>
        <button
          onClick={() => router.back()}
          style={{
            padding: '12px 28px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #F4A40B, #D4AF37)',
            color: '#000', fontWeight: '800', fontSize: '14px', fontFamily: 'inherit',
          }}
        >← Go Back</button>
      </div>
    </div>
  );
}
