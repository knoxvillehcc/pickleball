import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// ── POST: Generate a fresh Stripe payment link for a pending registration ──────
export async function POST(request) {
  const auth = await getSessionAndPermissions('pickleball');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  try {
    const body = await request.json();
    const { registration_number } = body;

    if (!registration_number) {
      return NextResponse.json(
        { success: false, error: 'registration_number is required' },
        { status: 400 }
      );
    }

    // 1. Look up the registration in Supabase
    const SUPABASE_URL      = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?registration_number=eq.${encodeURIComponent(registration_number)}&select=*&limit=1`,
      {
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      }
    );

    const records = await res.json();

    if (!records?.length) {
      return NextResponse.json(
        { success: false, error: `Registration ${registration_number} not found` },
        { status: 404 }
      );
    }

    const reg = records[0];

    // 2. Check if already paid
    if (reg.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'This registration has already been paid.' },
        { status: 400 }
      );
    }

    const baseUrl      = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const amountCents  = 5000; // Doubles-only: $50 per team
    const eventLabel   = 'Doubles';

    // 3. Create a fresh Stripe Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment',
      customer_email:       reg.email,
      line_items: [{
        quantity:   1,
        price_data: {
          currency:     'usd',
          unit_amount:  amountCents,
          product_data: {
            name:        `HCC Pickleball Registration (${eventLabel})`,
            description: `Reg #${reg.registration_number} — ${reg.full_name} — ${reg.skill_level} level`,
          },
        },
      }],
      metadata: {
        registration_number: reg.registration_number,
        registration_id:     String(reg.id),
        full_name:           reg.full_name,
        email:               reg.email,
        skill_level:         reg.skill_level        || '',
        registration_type:   'doubles',
        partner_name:        reg.partner_name       || '',
        gender:              reg.gender             || '',
        city:                reg.city               || '',
        state:               reg.state              || '',
        event_date:          reg.event_date         || '',
        liability_accepted:  'true',
      },
      success_url: `${baseUrl}/register/pickleball/success?session_id={CHECKOUT_SESSION_ID}&reg=${reg.registration_number}`,
      cancel_url:  `${baseUrl}/register/pickleball?cancelled=1`,
    });

    return NextResponse.json({
      success:        true,
      payment_url:    session.url,
      session_id:     session.id,
      reg_number:     reg.registration_number,
      player_name:    reg.full_name,
      player_email:   reg.email,
      amount:         amountCents / 100,
    });

  } catch (err) {
    console.error('[Payment Link] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
