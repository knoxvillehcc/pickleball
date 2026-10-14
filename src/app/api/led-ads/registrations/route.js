import { NextResponse } from 'next/server';
import { getSessionAndPermissions, requireEditPermission } from '@/lib/auth';
import { insertLedAdRegistration, updateLedAdRegistration } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

const SB_URL = () => process.env.SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const hdrs = () => ({
  'apikey': SB_KEY(),
  'Authorization': `Bearer ${SB_KEY()}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

function generateRegNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LED-${yy}${mm}-${rand}`;
}

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
    const rawList = await res.json();

    // Normalize offline payment details if column not present or stored in ref
    const registrations = rawList.map(r => {
      let payment_method = r.payment_method;
      let check_number = r.check_number || '';
      const ref = r.stripe_payment_ref || '';

      if (!payment_method && ref) {
        if (ref.startsWith('OFFLINE_CHECK:')) {
          payment_method = 'check';
          check_number = ref.replace('OFFLINE_CHECK:', '');
        } else if (ref === 'OFFLINE_CHECK') {
          payment_method = 'check';
        } else if (ref === 'OFFLINE_CASH') {
          payment_method = 'cash';
        } else if (ref.startsWith('OFFLINE_ZELLE:')) {
          payment_method = 'zelle';
          check_number = ref.replace('OFFLINE_ZELLE:', '');
        } else if (ref === 'OFFLINE_ZELLE') {
          payment_method = 'zelle';
        } else if (ref.startsWith('OFFLINE_CARD:')) {
          payment_method = 'card';
          check_number = ref.replace('OFFLINE_CARD:', '');
        } else if (ref.startsWith('pi_') || ref.startsWith('cs_')) {
          payment_method = 'stripe';
        }
      } else if (!payment_method) {
        payment_method = r.payment_status === 'paid' ? 'stripe' : '';
      }

      return {
        ...r,
        payment_method: payment_method || (r.payment_status === 'paid' ? 'stripe' : ''),
        check_number: check_number || r.check_number || '',
        payment_notes: r.payment_notes || '',
      };
    });

    return NextResponse.json({
      success: true,
      canEdit: auth.canEdit,
      isViewOnly: auth.isViewOnly,
      registrations,
    });
  } catch (err) {
    console.error('[LED-Ads Registrations GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── Manual Admin Registration (POST) ─────────────────────────────────────────
export async function POST(request) {
  const auth = await requireEditPermission('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();

    if (!body.business_name?.trim()) {
      return NextResponse.json({ success: false, error: 'Business name is required' }, { status: 400 });
    }
    if (!body.contact_name?.trim()) {
      return NextResponse.json({ success: false, error: 'Contact name is required' }, { status: 400 });
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const regNumber = generateRegNumber();
    const isPaid = body.payment_status === 'paid';
    const paymentMethod = body.payment_method || (isPaid ? 'cash' : '');
    const checkNumber = (body.check_number || '').trim();
    const paymentNotes = (body.payment_notes || '').trim();

    let offlineRef = '';
    if (isPaid && paymentMethod !== 'stripe') {
      offlineRef = `OFFLINE_${paymentMethod.toUpperCase()}${checkNumber ? ':' + checkNumber : ''}`;
    }

    const amountDueCents = Math.round(parseFloat(body.amount_due || 1500) * 100);
    const amountPaidCents = isPaid ? Math.round(parseFloat(body.amount_paid || body.amount_due || 1500) * 100) : 0;

    const regData = {
      registration_number: regNumber,
      business_name:       body.business_name.trim(),
      contact_name:        body.contact_name.trim(),
      email:               body.email.trim().toLowerCase(),
      phone:               body.phone.trim(),
      address:             body.address?.trim() || '',
      city:                body.city?.trim() || '',
      state:               body.state?.trim().toUpperCase() || '',
      zip:                 body.zip?.trim() || '',
      ad_description:      body.ad_description?.trim() || '',
      amount_due:          amountDueCents,
      amount_paid:         amountPaidCents,
      payment_status:      isPaid ? 'paid' : 'pending',
      payment_method:      paymentMethod,
      check_number:        checkNumber,
      payment_notes:       paymentNotes,
      stripe_payment_ref:  offlineRef,
      disclaimer_accepted: true,
      graphic_received:    !!body.graphic_received,
      registration_date:   body.registration_date ? new Date(body.registration_date).toISOString() : new Date().toISOString(),
    };

    const saved = await insertLedAdRegistration(regData);
    return NextResponse.json({ success: true, record: saved });
  } catch (err) {
    console.error('[LED-Ads Registrations POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireEditPermission('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Registration ID required' }, { status: 400 });

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
    if (fields.payment_method !== undefined) updates.payment_method = fields.payment_method;
    if (fields.check_number !== undefined) updates.check_number = fields.check_number.trim();
    if (fields.payment_notes !== undefined) updates.payment_notes = fields.payment_notes.trim();

    // Format offline reference if marking as paid offline
    if (updates.payment_status === 'paid' && updates.payment_method && updates.payment_method !== 'stripe') {
      const chk = updates.check_number || fields.check_number || '';
      updates.stripe_payment_ref = `OFFLINE_${updates.payment_method.toUpperCase()}${chk ? ':' + chk : ''}`;
    } else if (fields.stripe_payment_ref !== undefined) {
      updates.stripe_payment_ref = fields.stripe_payment_ref.trim();
    }

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
  const auth = await requireEditPermission('led_ads');
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
