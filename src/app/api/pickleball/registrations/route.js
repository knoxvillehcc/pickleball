import { NextResponse } from 'next/server';
import { queryRegistrations, getAllRegistrations } from '@/lib/supabaseClient';
import { getSessionAndPermissions } from '@/lib/auth';

export async function GET(request) {
  const auth = await getSessionAndPermissions('pickleball');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  const { searchParams } = new URL(request.url);
  const paymentStatus = searchParams.get('payment_status');
  const skillLevel    = searchParams.get('skill_level');
  const search        = searchParams.get('search');
  const limit         = parseInt(searchParams.get('limit') || '200');

  try {
    // Filtered records for the table view
    const records = await queryRegistrations({ paymentStatus, skillLevel, search, limit });

    // All records for stats (unfiltered)
    const allRecords = await getAllRegistrations(1000);

    const stats = {
      total:        allRecords.length,
      paid:         allRecords.filter(r => r.payment_status === 'paid').length,
      pending:      allRecords.filter(r => r.payment_status === 'pending').length,
      failed:       allRecords.filter(r => r.payment_status === 'failed').length,
      beginner:     allRecords.filter(r => r.skill_level === 'beginner').length,
      intermediate: allRecords.filter(r => r.skill_level === 'intermediate').length,
      advanced:     allRecords.filter(r => r.skill_level === 'advanced').length,
      totalRevenue: allRecords
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (r.amount_paid || 0), 0),
    };

    return NextResponse.json({ success: true, records, stats });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const auth = await getSessionAndPermissions('pickleball');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, first_name, last_name, email, phone, skill_level, payment_status, amount_paid, team_name, partner_name, gender, city, state } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Registration ID is required' }, { status: 400 });
    }

    const { updateRegistration } = await import('@/lib/supabaseClient');

    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined)  updates.last_name = last_name;
    if (email !== undefined)      updates.email = email;
    if (phone !== undefined)      updates.phone = phone;
    if (skill_level !== undefined) updates.skill_level = skill_level;

    if (payment_status !== undefined) {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
      const findRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${id}&select=payment_status`, {
        headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` },
        cache: 'no-store',
      });
      const rows = await findRes.json();
      if (rows && rows.length > 0) {
        const currentStatus = rows[0].payment_status;
        if (currentStatus === 'paid' && payment_status === 'pending') {
          return NextResponse.json({ success: false, error: 'Cannot revert a paid registration back to pending status.' }, { status: 400 });
        }
        if (payment_status === 'paid' && currentStatus !== 'paid' && auth.user.role !== 'super_admin' && !body.stripe_payment_ref) {
          return NextResponse.json({ success: false, error: 'Only a Super Admin can manually set status to Paid without a Stripe reference.' }, { status: 403 });
        }
      }
      updates.payment_status = payment_status;
    }
    if (amount_paid !== undefined) updates.amount_paid = parseFloat(amount_paid || 0);
    if (team_name !== undefined)  updates.team_name = team_name;
    if (partner_name !== undefined) updates.partner_name = partner_name;
    if (gender !== undefined)     updates.gender = gender;
    if (city !== undefined)       updates.city = city;
    if (state !== undefined)      updates.state = state;

    const result = await updateRegistration(id, updates);
    return NextResponse.json({ success: true, record: result });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
