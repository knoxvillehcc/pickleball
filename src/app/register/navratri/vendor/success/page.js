import { Suspense } from 'react';
import NavratriVendorSuccessClient from './SuccessClient';

export const dynamic = 'force-dynamic';

export default function NavratriVendorSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#0B0714',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ color: '#FF6B35', fontSize: '18px', fontWeight: '800' }}>Loading…</div>
      </div>
    }>
      <NavratriVendorSuccessClient />
    </Suspense>
  );
}
