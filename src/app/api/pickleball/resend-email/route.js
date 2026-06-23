import { NextResponse } from 'next/server';
import { sendCaptainConfirmation } from '@/lib/emailService';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await getSessionAndPermissions('pickleball');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  try {
    const { registration_number } = await request.json();

    if (!registration_number) {
      return NextResponse.json({ success: false, error: 'registration_number is required' }, { status: 400 });
    }

    // Fetch the registration from Supabase
    const SUPABASE_URL      = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?registration_number=eq.${encodeURIComponent(registration_number)}&select=*`,
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
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }

    const reg = rows[0];

    // Ensure players_data is an array (Supabase may return JSON or null)
    if (!Array.isArray(reg.players_data)) {
      reg.players_data = reg.email
        ? [{ first_name: reg.first_name || reg.full_name, last_name: reg.last_name || '', email: reg.email }]
        : [];
    }

    // Re-send the captain confirmation email
    await sendCaptainConfirmation(reg);

    console.log(`[Resend] ✅ Confirmation resent for ${registration_number} → ${reg.email}`);
    return NextResponse.json({ success: true, sentTo: reg.email });

  } catch (err) {
    console.error('[Resend] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
