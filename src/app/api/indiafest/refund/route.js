import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// ── POST: Issue a full Stripe refund for a vendor registration ────────────────
export async function POST(request) {
  // Auth check — requires 'indiafest' permission
  const auth = await getSessionAndPermissions('indiafest');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    // 1. Look up the registration in Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const KEY          = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    const findRes = await fetch(
      `${SUPABASE_URL}/rest/v1/vendor_registrations?id=eq.${id}&select=*&limit=1`,
      {
        headers: {
          'apikey':        KEY,
          'Authorization': `Bearer ${KEY}`,
        },
        cache: 'no-store',
      }
    );

    const records = await findRes.json();
    if (!records?.length) {
      return NextResponse.json(
        { success: false, error: 'Registration not found' },
        { status: 404 }
      );
    }

    const reg = records[0];

    // 2. Validate — must be paid to refund
    if (reg.payment_status === 'refunded') {
      return NextResponse.json(
        { success: false, error: 'This registration has already been refunded.' },
        { status: 400 }
      );
    }

    if (reg.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Only paid registrations can be refunded.' },
        { status: 400 }
      );
    }

    // 3. Must have a Stripe reference to process refund
    const stripeRef = reg.stripe_payment_ref;
    if (!stripeRef) {
      return NextResponse.json(
        { success: false, error: 'No Stripe payment reference found. Cannot process automatic refund.' },
        { status: 400 }
      );
    }

    // 4. Process the refund via Stripe
    const stripe = getStripe();
    let refund;

    try {
      // The stripe_payment_ref is a checkout session ID (cs_live_...)
      // We need to retrieve the session to get the payment intent
      if (stripeRef.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(stripeRef);
        if (!session.payment_intent) {
          return NextResponse.json(
            { success: false, error: 'No payment intent found for this checkout session. The payment may not have been completed.' },
            { status: 400 }
          );
        }
        refund = await stripe.refunds.create({
          payment_intent: session.payment_intent,
        });
      } else if (stripeRef.startsWith('pi_')) {
        // Direct payment intent
        refund = await stripe.refunds.create({
          payment_intent: stripeRef,
        });
      } else if (stripeRef.startsWith('ch_')) {
        // Direct charge
        refund = await stripe.refunds.create({
          charge: stripeRef,
        });
      } else {
        return NextResponse.json(
          { success: false, error: `Unrecognized Stripe reference format: ${stripeRef.substring(0, 10)}...` },
          { status: 400 }
        );
      }
    } catch (stripeErr) {
      console.error('[Refund] Stripe error:', stripeErr.message);
      return NextResponse.json(
        { success: false, error: `Stripe refund failed: ${stripeErr.message}` },
        { status: 500 }
      );
    }

    // 5. Update Supabase — mark as refunded
    const { updateVendorRegistration } = await import('@/lib/supabaseClient');
    await updateVendorRegistration(id, {
      payment_status: 'refunded',
    });

    console.log(`[Refund] ✅ Registration ${reg.registration_number} refunded. Stripe refund ID: ${refund.id}`);

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount_refunded: refund.amount / 100,
      registration_number: reg.registration_number,
    });

  } catch (err) {
    console.error('[Refund] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
