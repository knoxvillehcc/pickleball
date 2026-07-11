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

// ── Vendor types — replaces old small/medium/large spaces ──────────────────────
const VENDOR_TYPES = {
  home_business:        { cents: 35100,  label: 'Vendor – Small Business from Home',  dollars: 351 },
  established_business: { cents: 100100, label: 'Vendor – Established Business/Stores', dollars: 1001 },
};

export const dynamic = 'force-dynamic';
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

function generateVendorRegNumber() {
  const d    = new Date();
  const yy   = String(d.getFullYear()).slice(-2);
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `VND-${yy}${mm}-${rand}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Validate required fields ──────────────────────────────────────────────
    const required = ['first_name', 'last_name', 'company_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'vendor_type'];
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

    const vendorKey = body.vendor_type?.toLowerCase();
    if (!VENDOR_TYPES[vendorKey]) {
      return NextResponse.json({ success: false, error: 'Invalid vendor type. Choose home_business or established_business.' }, { status: 400 });
    }

    // ── Quantity — default 1, max 10 ─────────────────────────────────────────
    const quantity = Math.min(10, Math.max(1, parseInt(body.quantity, 10) || 1));

    if (!body.disclaimer_accepted) {
      return NextResponse.json({ success: false, error: 'You must accept the vendor disclaimer.' }, { status: 400 });
    }

    const vendor      = VENDOR_TYPES[vendorKey];
    const totalCents  = vendor.cents * quantity;
    const totalDollars = vendor.dollars * quantity;
    const regNumber   = generateVendorRegNumber();
    const fullName    = `${body.first_name.trim()} ${body.last_name.trim()}`;
    const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // ── Save PENDING record to Supabase ──────────────────────────────────────
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
      space_type:          vendorKey,      // reuses existing column; stores new key
      quantity:            quantity,
      amount_due:          totalCents,
      payment_status:      'pending',
      amount_paid:         0,
      stripe_payment_ref:  '',
      disclaimer_accepted: true,
      registration_date:   new Date().toISOString(),
    };

    const saved = await insertVendorRegistration(regData);

    // ── Create Stripe Checkout Session ───────────────────────────────────────
    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment',
      customer_email:       regData.email,
      line_items: [{
        quantity:   quantity,
        price_data: {
          currency:     'usd',
          unit_amount:  vendor.cents,
          product_data: {
            name:        `India Fest 2026 — ${vendor.label}`,
            description: `Reg #${regNumber} · ${fullName} · ${body.company_name.trim()} · ${quantity} spot${quantity > 1 ? 's' : ''}`,
          },
        },
      }],
      metadata: {
        source:              'indiafest_vendor',
        registration_number: regNumber,
        registration_id:     String(saved?.id || ''),
        full_name:           fullName,
        email:               regData.email,
        company_name:        body.company_name.trim(),
        vendor_type:         vendorKey,
        vendor_label:        vendor.label,
        quantity:            String(quantity),
      },
      success_url: `${baseUrl}/register/indiafest/vendor/success?session_id={CHECKOUT_SESSION_ID}&reg=${regNumber}`,
      cancel_url:  `${baseUrl}/register/indiafest/vendor?cancelled=1`,
    });

    return NextResponse.json({
      success:     true,
      checkoutUrl: session.url,
      sessionId:   session.id,
      reg_number:  regNumber,
      amount:      totalDollars,
    });

  } catch (err) {
    console.error('[IndiafestVendor Register] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
