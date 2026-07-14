import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // ── Auth check — requires 'indiafest' permission ──
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

export async function PUT(request) {
  // ── Auth check — requires 'indiafest' permission ──
  const auth = await getSessionAndPermissions('indiafest');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const {
      id, first_name, last_name, company_name, email, phone,
      address, city, state, zip, space_type, quantity,
      amount_due, amount_paid, payment_status, stripe_payment_ref
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Registration ID is required' }, { status: 400 });
    }

    const { updateVendorRegistration } = await import('@/lib/supabaseClient');

    const updates = {};
    if (first_name !== undefined)   updates.first_name = first_name.trim();
    if (last_name !== undefined)    updates.last_name = last_name.trim();
    if (company_name !== undefined) updates.company_name = company_name.trim();
    if (email !== undefined)        updates.email = email.trim().toLowerCase();
    if (phone !== undefined)        updates.phone = phone.trim();
    if (address !== undefined)      updates.address = address.trim();
    if (city !== undefined)         updates.city = city.trim();
    if (state !== undefined)        updates.state = state.trim().toUpperCase();
    if (zip !== undefined)          updates.zip = zip.trim();
    if (space_type !== undefined)   updates.space_type = space_type;
    if (quantity !== undefined)     updates.quantity = parseInt(quantity, 10) || 1;
    if (amount_due !== undefined)   updates.amount_due = Math.round(parseFloat(amount_due || 0) * 100);
    if (amount_paid !== undefined)  updates.amount_paid = Math.round(parseFloat(amount_paid || 0) * 100);
    if (payment_status !== undefined) updates.payment_status = payment_status;
    if (stripe_payment_ref !== undefined) updates.stripe_payment_ref = stripe_payment_ref.trim();

    const result = await updateVendorRegistration(id, updates);
    return NextResponse.json({ success: true, record: result });

  } catch (err) {
    console.error('[IndiafestRegistrations PUT] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  // ── Auth check — requires 'indiafest' permission ──
  const auth = await getSessionAndPermissions('indiafest');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Registration ID is required' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const KEY          = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vendor_registrations?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey':        KEY,
          'Authorization': `Bearer ${KEY}`,
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase delete failed (${res.status}): ${body}`);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[IndiafestRegistrations DELETE] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
