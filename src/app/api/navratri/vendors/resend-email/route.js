import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getVendorRegistrationByNumber } from '@/lib/navratriVendorDb';
import { sendNavratriVendorConfirmationEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await getSessionAndPermissions('navratri');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { registration_number } = body;

    if (!registration_number) {
      return NextResponse.json({ success: false, error: 'Registration number is required' }, { status: 400 });
    }

    const reg = await getVendorRegistrationByNumber(registration_number);
    if (!reg) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }

    // Only active (non-refunded) dates are included in the resend email
    const activeDates = (reg.dates || []).filter(d => d.status !== 'refunded');

    const result = await sendNavratriVendorConfirmationEmail(reg, activeDates);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to dispatch email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Confirmation email successfully resent to ${reg.email}`,
    });

  } catch (err) {
    console.error('[Navratri Vendor Resend Email] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
