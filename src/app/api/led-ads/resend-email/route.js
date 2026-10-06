import { NextResponse } from 'next/server';
import { sendLedAdConfirmationEmail, sendLedAdPaymentLinkEmail } from '@/lib/emailService';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await getSessionAndPermissions('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { registration_number } = await request.json();

    if (!registration_number) {
      return NextResponse.json({ success: false, error: 'registration_number is required' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/led_ad_registrations?registration_number=eq.${encodeURIComponent(registration_number)}&select=*`,
      {
        headers: {
          'apikey': KEY,
          'Authorization': `Bearer ${KEY}`,
        },
        cache: 'no-store',
      }
    );

    const rows = await res.json();
    if (!rows?.length) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }

    const reg = rows[0];

    if (reg.payment_status === 'paid') {
      await sendLedAdConfirmationEmail(reg);
    } else {
      await sendLedAdPaymentLinkEmail(reg);
    }

    console.log(`[Resend LED Ad] ✅ Email sent for ${registration_number} (${reg.payment_status}) to ${reg.email}`);
    return NextResponse.json({ success: true, sentTo: reg.email, status: reg.payment_status });

  } catch (err) {
    console.error('[Resend LED Ad] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
