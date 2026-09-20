import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SB_URL = () => process.env.SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const hdrs = () => ({
  'apikey': SB_KEY(),
  'Authorization': `Bearer ${SB_KEY()}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

export async function GET() {
  const auth = await getSessionAndPermissions('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const res = await fetch(
      `${SB_URL()}/rest/v1/led_ad_registrations?select=*&order=registration_date.desc&limit=500`,
      { headers: hdrs(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Supabase query failed (${res.status}): ${await res.text()}`);
    const registrations = await res.json();
    return NextResponse.json({ success: true, registrations });
  } catch (err) {
    console.error('[LED-Ads Registrations GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await getSessionAndPermissions('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Registration ID required' }, { status: 400 });

    const { updateLedAdRegistration } = await import('@/lib/supabaseClient');

    const updates = {};
    if (fields.business_name !== undefined) updates.business_name = fields.business_name.trim();
    if (fields.contact_name !== undefined) updates.contact_name = fields.contact_name.trim();
    if (fields.email !== undefined) updates.email = fields.email.trim().toLowerCase();
    if (fields.phone !== undefined) updates.phone = fields.phone.trim();
    if (fields.address !== undefined) updates.address = fields.address.trim();
    if (fields.city !== undefined) updates.city = fields.city.trim();
    if (fields.state !== undefined) updates.state = fields.state.trim().toUpperCase();
    if (fields.zip !== undefined) updates.zip = fields.zip.trim();
    if (fields.ad_description !== undefined) updates.ad_description = fields.ad_description.trim();
    if (fields.amount_due !== undefined) updates.amount_due = Math.round(parseFloat(fields.amount_due || 0) * 100);
    if (fields.amount_paid !== undefined) updates.amount_paid = Math.round(parseFloat(fields.amount_paid || 0) * 100);
    if (fields.payment_status !== undefined) updates.payment_status = fields.payment_status;
    if (fields.stripe_payment_ref !== undefined) updates.stripe_payment_ref = fields.stripe_payment_ref.trim();
    if (fields.graphic_received !== undefined) updates.graphic_received = !!fields.graphic_received;
    updates.updated_at = new Date().toISOString();

    const result = await updateLedAdRegistration(id, updates);
    return NextResponse.json({ success: true, record: result });
  } catch (err) {
    console.error('[LED-Ads Registrations PUT] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await getSessionAndPermissions('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Registration ID required' }, { status: 400 });

    const res = await fetch(`${SB_URL()}/rest/v1/led_ad_registrations?id=eq.${id}`, {
      method: 'DELETE',
      headers: hdrs(),
    });
    if (!res.ok) throw new Error(`Delete failed (${res.status}): ${await res.text()}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[LED-Ads Registrations DELETE] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
