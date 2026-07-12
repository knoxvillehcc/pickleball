// SERVER COMPONENT — wraps the client content in Suspense
// This is required in Next.js 16 App Router for useSearchParams to work
import { Suspense } from 'react';
import SuccessClient from './SuccessClient';

export const dynamic = 'force-dynamic';

export default function PickleballSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ color: 'var(--accent)', fontSize: '18px' }}>Loading...</div>
      </div>
    }>
      <SuccessClient />
    </Suspense>
  );
}
