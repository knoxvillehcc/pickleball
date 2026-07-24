import { NextResponse } from 'next/server';
import { sendSponsorConfirmationEmail } from '@/lib/emailService';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await getSessionAndPermissions('indiafest');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { registration_number } = await request.json();

    if (!registration_number) {
      return NextResponse.json({ success: false, error: 'registration_number is required' }, { status: 400 });
    }

    const SUPABASE_URL      = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vendor_registrations?registration_number=eq.${encodeURIComponent(registration_number)}&space_type=in.(grand_sponsor,basic_sponsor)&select=*`,
      {
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      }
    );

    const rows = await res.json();
    if (!rows?.length) {
      return NextResponse.json({ success: false, error: 'Sponsor registration not found' }, { status: 404 });
    }

    const reg = rows[0];
    await sendSponsorConfirmationEmail(reg);

    console.log(`[Resend Sponsor] ✅ Confirmation resent for ${registration_number} → ${reg.email}`);
    return NextResponse.json({ success: true, sentTo: reg.email });

  } catch (err) {
    console.error('[Resend Sponsor] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
