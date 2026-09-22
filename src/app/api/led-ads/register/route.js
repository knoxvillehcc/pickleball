import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { insertLedAdRegistration } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_CENTS = 150000; // $1,500
const PRICE_DOLLARS = 1500;

function generateRegNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LED-${yy}${mm}-${rand}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Validate required fields ──────────────────────────────────────────
    const required = ['business_name', 'contact_name', 'email', 'phone'];
    for (const field of required) {
      if (!body[field]?.toString().trim()) {
        return NextResponse.json({ success: false, error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    if (!body.disclaimer_accepted) {
      return NextResponse.json({ success: false, error: 'You must accept the agreement.' }, { status: 400 });
    }

    const regNumber = generateRegNumber();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // ── Save PENDING record to Supabase ──────────────────────────────────
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
      amount_due:          PRICE_CENTS,
      payment_status:      'pending',
      amount_paid:         0,
      stripe_payment_ref:  '',
      disclaimer_accepted: true,
      registration_date:   new Date().toISOString(),
    };

    const saved = await insertLedAdRegistration(regData);

    // ── Create Stripe Checkout Session ───────────────────────────────────
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: regData.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_CENTS,
          product_data: {
            name: 'Navratri 2026 — LED Screen Advertisement',
            description: `Reg #${regNumber} · ${body.business_name.trim()} · Full event LED screen ad (1920×1080)`,
          },
        },
      }],
      metadata: {
        source:              'led_screen_ad',
        registration_number: regNumber,
        registration_id:     String(saved?.id || ''),
        business_name:       body.business_name.trim(),
        contact_name:        body.contact_name.trim(),
        email:               regData.email,
      },
      success_url: `${baseUrl}/register/led-ads/success?session_id={CHECKOUT_SESSION_ID}&reg=${regNumber}`,
      cancel_url:  `${baseUrl}/register/led-ads?cancelled=1`,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      reg_number: regNumber,
      amount: PRICE_DOLLARS,
    });

  } catch (err) {
    console.error('[LED-Ads Register] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
