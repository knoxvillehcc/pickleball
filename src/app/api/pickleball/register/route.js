import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { insertRegistration } from '@/lib/supabaseClient';

// Prevent Next.js from statically analyzing this route at build time
export const dynamic = 'force-dynamic';

// Lazy init — only runs at request time, not during build
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

function generateRegNumber() {
  const d    = new Date();
  const yy   = String(d.getFullYear()).slice(-2);
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PB-${yy}${mm}-${rand}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Validate required fields ───────────────────────────────────────────────
    const required = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'player_type', 'team_name'];
    for (const field of required) {
      if (!body[field]?.toString().trim()) {
        return NextResponse.json({ success: false, error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    if (!body.liability_accepted) {
      return NextResponse.json({ success: false, error: 'You must accept the liability waiver.' }, { status: 400 });
    }

    if (!body.terms_accepted) {
      return NextResponse.json({ success: false, error: 'You must accept the Terms & Conditions.' }, { status: 400 });
    }

    // ── Build players list ─────────────────────────────────────────────────────
    const isDoubles    = body.registration_type === 'doubles';
    const playerCount  = isDoubles ? 2 : 1;
    const amountCents  = playerCount * 2500; // $25 per player
    const amountDollars = amountCents / 100;

    // Player 1 = registering person
    const player1 = {
      first_name: body.first_name.trim(),
      last_name:  body.last_name.trim(),
      email:      body.email.trim().toLowerCase(),
    };

    // Player 2 (doubles only)
    const player2 = isDoubles && body.player2_first_name ? {
      first_name: body.player2_first_name.trim(),
      last_name:  body.player2_last_name?.trim() || '',
      email:      body.player2_email?.trim().toLowerCase() || '',
    } : null;

    const playersData = [player1, ...(player2 ? [player2] : [])];
    const fullName    = `${body.first_name.trim()} ${body.last_name.trim()}`;
    const regNumber   = generateRegNumber();
    const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const eventLabel  = isDoubles ? 'Doubles' : 'Singles';

    // ── Save PENDING registration to Supabase ──────────────────────────────────
    const regData = {
      registration_number: regNumber,
      full_name:           fullName,
      first_name:          body.first_name.trim(),
      last_name:           body.last_name.trim(),
      email:               body.email.trim().toLowerCase(),
      phone:               body.phone.trim(),
      address:             body.address.trim(),
      city:                body.city.trim(),
      state:               body.state,
      zip:                 body.zip.trim(),
      player_type:         body.player_type,
      team_name:           body.team_name.trim(),
      registration_type:   body.registration_type || 'singles',
      player_count:        playerCount,
      players_data:        playersData,
      skill_level:         body.skill_level || 'intermediate',
      gender:              body.gender       || '',
      partner_name:        player2 ? `${player2.first_name} ${player2.last_name}` : '',
      event_name:          `HCC Pickleball Tournament (${eventLabel})`,
      event_date:          body.event_date || '',
      payment_status:      'pending',
      amount_paid:         0,
      stripe_payment_ref:  '',
      liability_accepted:  true,
      terms_accepted:      true,
      registration_date:   new Date().toISOString().replace('T', ' ').split('.')[0],
    };

    const saved = await insertRegistration(regData);

    // ── Create Stripe Checkout Session ─────────────────────────────────────────
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment',
      customer_email:       regData.email,
      line_items: [{
        quantity:   1,
        price_data: {
          currency:     'usd',
          unit_amount:  amountCents,
          product_data: {
            name:        `HCC Pickleball — ${eventLabel} Registration`,
            description: `Reg #${regNumber} · Team: ${body.team_name} · ${playerCount} player(s) × $25`,
          },
        },
      }],
      metadata: {
        registration_number: regNumber,
        registration_id:     String(saved?.id || ''),
        full_name:           fullName,
        email:               regData.email,
        team_name:           body.team_name.trim(),
        player_type:         body.player_type,
        player_count:        String(playerCount),
        registration_type:   regData.registration_type,
        event_date:          body.event_date || '',
        // Pass player 2 email for post-payment emails
        player2_email:       player2?.email || '',
        player2_name:        player2 ? `${player2.first_name} ${player2.last_name}` : '',
      },
      success_url: `${baseUrl}/register/pickleball/success?session_id={CHECKOUT_SESSION_ID}&reg=${regNumber}`,
      cancel_url:  `${baseUrl}/register/pickleball?cancelled=1`,
    });

    return NextResponse.json({
      success:     true,
      checkoutUrl: session.url,
      sessionId:   session.id,
      reg_number:  regNumber,
      amount:      amountDollars,
    });

  } catch (err) {
    console.error('[Register] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
