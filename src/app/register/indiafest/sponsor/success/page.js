// SERVER COMPONENT — wraps the client content in Suspense
// Required in Next.js App Router for useSearchParams to work without errors
import { Suspense } from 'react';
import SponsorSuccessClient from './SuccessClient';

export const dynamic = 'force-dynamic';

export default function IndiafestSponsorSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ color: '#D4AF37', fontSize: '18px' }}>Loading…</div>
      </div>
    }>
      <SponsorSuccessClient />
    </Suspense>
  );
}
