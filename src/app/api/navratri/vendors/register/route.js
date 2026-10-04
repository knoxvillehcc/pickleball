import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  generateNavratriVendorRegNumber,
  insertVendorRegistration,
  insertVendorDates,
  getBookedBoothsByDate,
  getVendorSettings,
} from '@/lib/navratriVendorDb';

export const dynamic = 'force-dynamic';
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// Master festival dates & daily rates
const FESTIVAL_DATES = {
  '2026-10-11': { date: '2026-10-11', label: 'Day 1 — Sun, Oct 11', isWeekend: false, rate: 20100 },
  '2026-10-12': { date: '2026-10-12', label: 'Day 2 — Mon, Oct 12', isWeekend: false, rate: 20100 },
  '2026-10-13': { date: '2026-10-13', label: 'Day 3 — Tue, Oct 13', isWeekend: false, rate: 20100 },
  '2026-10-14': { date: '2026-10-14', label: 'Day 4 — Wed, Oct 14', isWeekend: false, rate: 20100 },
  '2026-10-15': { date: '2026-10-15', label: 'Day 5 — Thu, Oct 15', isWeekend: false, rate: 20100 },
  '2026-10-16': { date: '2026-10-16', label: 'Day 6 — Fri, Oct 16', isWeekend: true,  rate: 35100 },
  '2026-10-17': { date: '2026-10-17', label: 'Day 7 — Sat, Oct 17', isWeekend: true,  rate: 35100 },
  '2026-10-18': { date: '2026-10-18', label: 'Day 8 — Sun, Oct 18', isWeekend: false, rate: 20100 },
  '2026-10-19': { date: '2026-10-19', label: 'Day 9 — Mon, Oct 19', isWeekend: false, rate: 20100 },
  '2026-10-20': { date: '2026-10-20', label: 'Day 10 — Tue, Oct 20', isWeekend: false, rate: 20100 },
  '2026-10-25': { date: '2026-10-25', label: 'Day 11 — Sun, Oct 25 (Sharad Purnima)', isWeekend: false, rate: 20100 },
};

export async function POST(request) {
  try {
    const body = await request.json();

    // 1. Check if registrations are open in settings
    let settings = {};
    try {
      settings = await getVendorSettings();
    } catch (e) {
      console.warn('[Navratri Vendor] Could not fetch settings, using defaults:', e.message);
    }

    if (settings.is_published === 'false') {
      return NextResponse.json(
        { success: false, error: 'Navratri vendor registrations are currently closed.' },
        { status: 400 }
      );
    }

    // 2. Validate required vendor fields
    const {
      business_name,
      contact_name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      category,
      category_details,
      electrical_needed,
      special_requests,
      selected_dates, // array of { date: 'YYYY-MM-DD', booth_count: number }
      disclaimer_accepted,
    } = body;

    if (!business_name?.trim()) return NextResponse.json({ success: false, error: 'Business name is required' }, { status: 400 });
    if (!contact_name?.trim()) return NextResponse.json({ success: false, error: 'Contact name is required' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }
    if (!phone?.trim()) return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    if (!disclaimer_accepted) {
      return NextResponse.json({ success: false, error: 'You must accept the vendor agreement terms' }, { status: 400 });
    }
    if (!Array.isArray(selected_dates) || selected_dates.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select at least one festival date for your booth' }, { status: 400 });
    }

    // 3. Check capacity & calculate pricing
    let bookedCounts = {};
    try {
      bookedCounts = await getBookedBoothsByDate();
    } catch (e) {
      console.warn('[Navratri Vendor] Capacity check fallback:', e.message);
    }

    const defaultCapacity = parseInt(settings.default_capacity_per_night || '10', 10);
    let customCapacities = {};
    try {
      customCapacities = JSON.parse(settings.custom_capacities || '{}');
    } catch {}

    let disabledDates = [];
    try {
      disabledDates = JSON.parse(settings.disabled_dates || '[]');
    } catch {}

    let totalCents = 0;
    let totalBoothsBooked = 0;
    const validatedDates = [];

    for (const item of selected_dates) {
      const dateStr = item.date;
      const count = Math.max(1, parseInt(item.booth_count || 1, 10));
      const info = FESTIVAL_DATES[dateStr];

      if (!info) {
        return NextResponse.json({ success: false, error: `Invalid date selected: ${dateStr}` }, { status: 400 });
      }

      if (disabledDates.includes(dateStr)) {
        return NextResponse.json({ success: false, error: `Date ${info.label} is currently not available for booking` }, { status: 400 });
      }

      const dateCap = customCapacities[dateStr] !== undefined ? customCapacities[dateStr] : defaultCapacity;
      const currentBooked = bookedCounts[dateStr] || 0;
      if (currentBooked + count > dateCap) {
        return NextResponse.json({
          success: false,
          error: `Sorry, ${info.label} only has ${Math.max(0, dateCap - currentBooked)} booth spot(s) remaining.`,
        }, { status: 400 });
      }

      const dateSubtotal = info.rate * count;
      totalCents += dateSubtotal;
      totalBoothsBooked += count;

      validatedDates.push({
        event_date: dateStr,
        day_label: info.label,
        is_weekend: info.isWeekend,
        rate_cents: info.rate,
        booth_count: count,
        total_cents: dateSubtotal,
        status: 'confirmed',
      });
    }

    const regNumber = generateNavratriVendorRegNumber();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 4. Save Pending Master Record
    const masterData = {
      registration_number: regNumber,
      business_name: business_name.trim(),
      contact_name: contact_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address?.trim() || '',
      city: city?.trim() || '',
      state: (state?.trim() || '').toUpperCase(),
      zip: zip?.trim() || '',
      category: category || 'merchandise',
      category_details: category_details?.trim() || '',
      electrical_needed: Boolean(electrical_needed),
      special_requests: special_requests?.trim() || '',
      total_booths_booked: totalBoothsBooked,
      amount_due: totalCents,
      amount_paid: 0,
      payment_status: 'pending',
      disclaimer_accepted: true,
      registration_date: new Date().toISOString(),
    };

    const savedMaster = await insertVendorRegistration(masterData);

    // 5. Save Booked Dates
    const datesToInsert = validatedDates.map(d => ({
      ...d,
      registration_id: savedMaster.id,
    }));
    await insertVendorDates(datesToInsert);

    // 6. Create Stripe Checkout Session
    const stripe = getStripe();
    const lineItems = validatedDates.map(d => ({
      quantity: d.booth_count,
      price_data: {
        currency: 'usd',
        unit_amount: d.rate_cents,
        product_data: {
          name: `Navratri 2026 Booth — ${d.day_label}`,
          description: `${business_name.trim()} · ${d.booth_count} Booth(s) @ $${(d.rate_cents / 100).toFixed(0)}/night · Reg #${regNumber}`,
        },
      },
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: masterData.email,
      line_items: lineItems,
      metadata: {
        source: 'navratri_vendor',
        registration_number: regNumber,
        registration_id: String(savedMaster.id),
        business_name: masterData.business_name,
        contact_name: masterData.contact_name,
        email: masterData.email,
        total_booths: String(totalBoothsBooked),
        days_count: String(validatedDates.length),
      },
      success_url: `${baseUrl}/register/navratri/vendor/success?session_id={CHECKOUT_SESSION_ID}&reg=${regNumber}`,
      cancel_url: `${baseUrl}/register/navratri/vendor?cancelled=1`,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      reg_number: regNumber,
      amount: totalCents / 100,
    });

  } catch (err) {
    console.error('[Navratri Vendor Register] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
