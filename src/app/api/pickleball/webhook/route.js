import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import { sendAllConfirmationEmails } from '@/lib/emailService';

export const dynamic = 'force-dynamic';
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// ── Sync confirmed registration to Odoo as a Contact ──────────────────────────
async function syncToOdoo(regData, amountPaid, stripeRef) {
  try {
    const creds = await getCredentials();
    const uid   = await odooAuth(creds);

    // 1. Find or create "Pickleball Registration" tag
    let tagId;
    const tags = await odooCall(creds, uid, 'res.partner.category', 'search_read', [
      [['name', '=', 'Pickleball Registration']]
    ], { fields: ['id'], limit: 1 });

    tagId = tags.length > 0
      ? tags[0].id
      : await odooCall(creds, uid, 'res.partner.category', 'create', [
          { name: 'Pickleball Registration', color: 10 }
        ]);

    // 2. Find or create the contact
    const existing = await odooCall(creds, uid, 'res.partner', 'search_read', [
      [['email', '=', regData.email]]
    ], { fields: ['id'], limit: 1 });

    const partnerVals = {
      name:        regData.full_name,
      email:       regData.email,
      phone:       regData.phone     || '',
      city:        regData.city      || '',
      country_id:  233,
      category_id: [[4, tagId]],
      comment:     `Team: ${regData.team_name || '—'} | Type: ${regData.player_type || 'adult'}`,
    };

    const partnerId = existing.length > 0
      ? (await odooCall(creds, uid, 'res.partner', 'write', [[existing[0].id], partnerVals]), existing[0].id)
      : await odooCall(creds, uid, 'res.partner', 'create', [partnerVals]);

    // 3. Build players HTML for chatter note
    const playerRows = (regData.players_data || []).map((p, i) =>
      `<tr><td style="padding:3px 8px"><b>Player ${i + 1}</b></td><td style="padding:3px 8px">${p.first_name} ${p.last_name}</td><td style="padding:3px 8px">${p.email || '—'}</td></tr>`
    ).join('');

    const noteBody = `
      <p><strong>🏓 Pickleball Registration — PAYMENT CONFIRMED ✅</strong></p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:12px">
        <tr><td style="padding:4px 8px"><b>Reg #</b></td><td style="padding:4px 8px">${regData.registration_number}</td></tr>
        <tr><td style="padding:4px 8px"><b>Name</b></td><td style="padding:4px 8px">${regData.full_name}</td></tr>
        <tr><td style="padding:4px 8px"><b>Email</b></td><td style="padding:4px 8px">${regData.email}</td></tr>
        <tr><td style="padding:4px 8px"><b>Phone</b></td><td style="padding:4px 8px">${regData.phone || '—'}</td></tr>
        <tr><td style="padding:4px 8px"><b>Team Name</b></td><td style="padding:4px 8px">${regData.team_name || '—'}</td></tr>
        <tr><td style="padding:4px 8px"><b>Player Type</b></td><td style="padding:4px 8px">${regData.player_type === 'middle_high_school' ? 'Middle/High School' : 'Adult'}</td></tr>
        <tr><td style="padding:4px 8px"><b>Registration</b></td><td style="padding:4px 8px">Doubles</td></tr>
        <tr><td style="padding:4px 8px"><b>Players</b></td><td style="padding:4px 8px">${regData.player_count || 1}</td></tr>
        <tr><td style="padding:4px 8px"><b>Address</b></td><td style="padding:4px 8px">${regData.address || ''}, ${regData.city || ''}, ${regData.state || ''} ${regData.zip || ''}</td></tr>
        <tr><td style="padding:4px 8px"><b>Event Date</b></td><td style="padding:4px 8px">${regData.event_date || 'TBD'}</td></tr>
        <tr><td style="padding:4px 8px"><b>Amount Paid</b></td><td style="padding:4px 8px"><b style="color:green">$${amountPaid.toFixed(2)}</b></td></tr>
        <tr><td style="padding:4px 8px"><b>Stripe Ref</b></td><td style="padding:4px 8px"><code>${stripeRef}</code></td></tr>
      </table>
      ${playerRows ? `<p><b>Registered Players:</b></p>
      <table style="border-collapse:collapse;border:1px solid #ddd">
        <tr style="background:#f5f5f5"><th style="padding:4px 8px">Player</th><th style="padding:4px 8px">Name</th><th style="padding:4px 8px">Email</th></tr>
        ${playerRows}
      </table>` : ''}
    `.trim();

    await odooCall(creds, uid, 'mail.message', 'create', [{
      model:        'res.partner',
      res_id:       partnerId,
      message_type: 'comment',
      subtype_id:   1,
      body:         noteBody,
      author_id:    uid,
    }]);

    return { success: true, odoo_partner_id: partnerId };
  } catch (err) {
    console.error('[Odoo Sync] Failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Update Supabase registration to PAID ───────────────────────────────────────
async function markAsPaid(regNumber, sessionId, amountPaid) {
  const { updateRegistration } = await import('@/lib/supabaseClient');
  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/registrations?registration_number=eq.${encodeURIComponent(regNumber)}&select=*`,
    {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  const found = await findRes.json();
  if (!found?.length) {
    console.warn(`[Webhook] Registration ${regNumber} not found in Supabase`);
    return null;
  }

  const record = found[0];
  if (record.payment_status === 'paid') {
    return 'already_paid';
  }

  const updated = await updateRegistration(record.id, {
    payment_status:     'paid',
    amount_paid:        amountPaid,
    stripe_payment_ref: sessionId,
  });

  // Return full record for emails
  return { ...record, payment_status: 'paid', amount_paid: amountPaid, stripe_payment_ref: sessionId };
}

async function isWebhookProcessed(webhookId) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const url = `${SUPABASE_URL}/rest/v1/webhook_logs?webhook_id=eq.${encodeURIComponent(webhookId)}&select=id&limit=1`;
  
  const res = await fetch(url, {
    headers: {
      'apikey':        KEY,
      'Authorization': `Bearer ${KEY}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) return false;
  const rows = await res.json();
  return rows && rows.length > 0;
}

async function logWebhook(webhookId, regNumber, result) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const url = `${SUPABASE_URL}/rest/v1/webhook_logs`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'apikey':         KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      webhook_id:          webhookId,
      registration_number: regNumber || '',
      result:              result || '',
    }),
  });
}

// ── Webhook handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  const sig     = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session    = event.data.object;
    const meta       = session.metadata || {};
    const regNumber  = meta.registration_number;
    const amountPaid = (session.amount_total || 0) / 100;
    const stripeRef  = session.id;

    // Check webhook log first
    const processed = await isWebhookProcessed(event.id);
    if (processed) {
      console.log(`[Webhook] Duplicate webhook event ignored: ${event.id}`);
      return NextResponse.json({ received: true, ignored: true, reason: 'Duplicate event' });
    }

    console.log(`[Webhook] Payment confirmed for ${regNumber} — $${amountPaid}`);

    // 1. Update Supabase to PAID + get full record
    const fullReg = await markAsPaid(regNumber, stripeRef, amountPaid);

    if (fullReg === 'already_paid') {
      console.log(`[Webhook] Registration ${regNumber} was already marked paid. Skipping actions.`);
      await logWebhook(event.id, regNumber, 'ignored: already paid');
      return NextResponse.json({ received: true, ignored: true, reason: 'Registration already paid' });
    }

    if (fullReg) {
      // 2. Send Gmail confirmation emails to all players
      await sendAllConfirmationEmails(fullReg);

      // 3. Sync to Odoo
      await syncToOdoo(fullReg, amountPaid, stripeRef);

      // 4. Log the webhook success
      await logWebhook(event.id, regNumber, 'processed: paid and synced');
    } else {
      await logWebhook(event.id, regNumber, 'failed: registration not found');
    }
  }

  return NextResponse.json({ received: true });
}
