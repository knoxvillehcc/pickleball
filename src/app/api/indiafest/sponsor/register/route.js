import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { insertVendorRegistration } from '@/lib/supabaseClient';

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

export const dynamic = 'force-dynamic';
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

const GRAND_SPONSOR = {
  key:     'grand_sponsor',
  label:   'India Fest 2026 — Grand Sponsor',
  cents:   500000,  // $5,000.00
  dollars: 5000,
};

function generateSponsorRegNumber() {
  const d    = new Date();
  const yy   = String(d.getFullYear()).slice(-2);
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GSP-${yy}${mm}-${rand}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Validate required fields ───────────────────────────────────────────────
    const required = ['first_name', 'last_name', 'company_name', 'email', 'phone', 'address', 'city', 'state', 'zip'];
    for (const field of required) {
      if (!body[field]?.toString().trim()) {
        return NextResponse.json({ success: false, error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    if (!/^\d{5}(-\d{4})?$/.test(body.zip?.trim())) {
      return NextResponse.json({ success: false, error: 'Invalid ZIP code (5 digits or 5+4)' }, { status: 400 });
    }

    const stateUpper = body.state?.trim().toUpperCase();
    if (!US_STATES.has(stateUpper)) {
      return NextResponse.json({ success: false, error: 'Invalid US state abbreviation' }, { status: 400 });
    }

    if (!body.disclaimer_accepted) {
      return NextResponse.json({ success: false, error: 'You must accept the sponsor agreement.' }, { status: 400 });
    }

    const regNumber = generateSponsorRegNumber();
    const fullName  = `${body.first_name.trim()} ${body.last_name.trim()}`;
    const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // ── Save PENDING record to Supabase (vendor_registrations table) ──────────
    // Uses space_type = 'grand_sponsor' to distinguish from vendor registrations
    const regData = {
      registration_number: regNumber,
      first_name:          body.first_name.trim(),
      last_name:           body.last_name.trim(),
      company_name:        body.company_name.trim(),
      email:               body.email.trim().toLowerCase(),
      phone:               body.phone.trim(),
      address:             body.address.trim(),
      city:                body.city.trim(),
      state:               stateUpper,
      zip:                 body.zip.trim(),
      space_type:          'grand_sponsor',
      quantity:            1,
      amount_due:          GRAND_SPONSOR.cents,
      payment_status:      'pending',
      amount_paid:         0,
      stripe_payment_ref:  '',
      disclaimer_accepted: true,
      registration_date:   new Date().toISOString(),
    };

    const saved = await insertVendorRegistration(regData);

    // ── Create Stripe Checkout Session ────────────────────────────────────────
    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment',
      customer_email:       regData.email,
      line_items: [{
        quantity:   1,
        price_data: {
          currency:     'usd',
          unit_amount:  GRAND_SPONSOR.cents,
          product_data: {
            name:        GRAND_SPONSOR.label,
            description: `Reg #${regNumber} · ${fullName} · ${body.company_name.trim()} · Grand Sponsorship`,
          },
        },
      }],
      metadata: {
        source:              'indiafest_grand_sponsor',
        registration_number: regNumber,
        registration_id:     String(saved?.id || ''),
        full_name:           fullName,
        email:               regData.email,
        company_name:        body.company_name.trim(),
        vendor_type:         'grand_sponsor',
        vendor_label:        GRAND_SPONSOR.label,
        quantity:            '1',
      },
      success_url: `${baseUrl}/register/indiafest/sponsor/success?session_id={CHECKOUT_SESSION_ID}&reg=${regNumber}`,
      cancel_url:  `${baseUrl}/register/indiafest/sponsor?cancelled=1`,
    });

    return NextResponse.json({
      success:     true,
      checkoutUrl: session.url,
      sessionId:   session.id,
      reg_number:  regNumber,
      amount:      GRAND_SPONSOR.dollars,
    });

  } catch (err) {
    console.error('[GrandSponsor Register] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
