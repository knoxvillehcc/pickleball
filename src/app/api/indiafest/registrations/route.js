import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // ── Auth check — requires 'indiafest' permission (same pattern as pickleball) ──
  const auth = await getSessionAndPermissions('indiafest');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const KEY          = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    const params = new URLSearchParams({
      select: [
        'id', 'registration_number', 'first_name', 'last_name', 'company_name',
        'email', 'phone', 'address', 'city', 'state', 'zip',
        'space_type', 'amount_due', 'amount_paid',
        'payment_status', 'stripe_payment_ref',
        'disclaimer_accepted', 'registration_date',
      ].join(','),
      order:  'registration_date.desc',
      limit:  '500',
    });

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vendor_registrations?${params}`,
      {
        headers: {
          'apikey':        KEY,
          'Authorization': `Bearer ${KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase query failed (${res.status}): ${body}`);
    }

    const registrations = await res.json();
    return NextResponse.json({ success: true, registrations });

  } catch (err) {
    console.error('[IndiafestRegistrations] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
