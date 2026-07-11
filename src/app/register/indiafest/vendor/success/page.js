// SERVER COMPONENT — wraps the client content in Suspense
// Required in Next.js App Router for useSearchParams to work without errors
import { Suspense } from 'react';
import VendorSuccessClient from './SuccessClient';

export const dynamic = 'force-dynamic';

export default function IndiafestVendorSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#060A18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ color: '#FF9933', fontSize: '18px' }}>Loading…</div>
      </div>
    }>
      <VendorSuccessClient />
    </Suspense>
  );
}
