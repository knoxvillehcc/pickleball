/**
 * aartiService.js
 * Master Service layer for Navratri 2026 Daily Aarti Seva & Bidding System.
 * Handles bid calculations, dynamic increment tiers, OTP verification,
 * outbid alerts, and administrative payment tracking.
 */

import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

function getServiceHeaders() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  }
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };
}

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

/**
 * Fetch global Aarti auction settings
 */
export async function getAartiSettings() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_settings?id=eq.config&select=*`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    // Default fallback if table not yet seeded
    return {
      id: 'config',
      is_published: true,
      tier1_max: 3000,
      tier1_increment: 500,
      tier2_increment: 250,
      daily_cutoff_time: '21:30',
    };
  }

  const rows = await res.json();
  if (rows && rows.length > 0) return rows[0];

  return {
    id: 'config',
    is_published: true,
    tier1_max: 3000,
    tier1_increment: 500,
    tier2_increment: 250,
    daily_cutoff_time: '21:30',
  };
}

/**
 * Calculate the next increment step based on current bid and active tier rules
 */
export function calculateNextStep(currentBid, settings) {
  const tier1Max = Number(settings?.tier1_max || 3000);
  const tier1Step = Number(settings?.tier1_increment || 500);
  const tier2Step = Number(settings?.tier2_increment || 250);

  if (currentBid < tier1Max) {
    return tier1Step;
  }
  return tier2Step;
}

/**
 * Generate 3 smart 1-click bid options for the UI
 */
export function generateQuickBidOptions(currentBid, bidsCount, baseBid, settings) {
  const base = Number(baseBid || 500);
  const current = Number(currentBid || base);

  if (Number(bidsCount || 0) === 0) {
    // No bids yet: first bid can be base bid ($500), base + step ($1,000), base + 2*step ($1,500)
    const step = calculateNextStep(base, settings);
    return [
      { amount: base, label: `$${base.toLocaleString()} (Opening Bid)` },
      { amount: base + step, label: `$${(base + step).toLocaleString()}` },
      { amount: base + (step * 2), label: `$${(base + (step * 2)).toLocaleString()}` },
    ];
  }

  // Existing bids: compute increments
  const step1 = calculateNextStep(current, settings);
  const bid1 = current + step1;
  const step2 = calculateNextStep(bid1, settings);
  const bid2 = bid1 + step2;
  const step3 = calculateNextStep(bid2, settings);
  const bid3 = bid2 + step3;

  return [
    { amount: bid1, label: `$${bid1.toLocaleString()} (Next Bid)` },
    { amount: bid2, label: `$${bid2.toLocaleString()} (+1 Step)` },
    { amount: bid3, label: `$${bid3.toLocaleString()} (+2 Steps)` },
  ];
}

/**
 * Public endpoint data: returns all 10 festival days with sanitized fields
 */
export async function getAartiDaysPublic() {
  const settings = await getAartiSettings();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?select=*&order=day_number.asc`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch aarti days: ${errText}`);
  }

  const rows = await res.json();
  const now = new Date();

  return rows.map(day => {
    const cutoffDate = new Date(day.cutoff_time);
    const isPastCutoff = now > cutoffDate;
    const isClosed = day.status === 'closed' || isPastCutoff;

    const currentBid = Number(day.current_highest_bid || day.base_bid || 500);
    const bidsCount = Number(day.bids_count || 0);

    const quickOptions = !isClosed ? generateQuickBidOptions(currentBid, bidsCount, day.base_bid, settings) : [];

    // Format event_date to strict MM-DD-YYYY
    const [y, m, d] = (day.event_date || '').split('-');
    const formattedDate = (y && m && d) ? `${m}-${d}-${y}` : day.event_date;

    return {
      day_number: day.day_number,
      event_date: day.event_date,
      formatted_date: formattedDate,
      day_title: day.day_title,
      is_maha_aarti: day.is_maha_aarti,
      base_bid: day.base_bid,
      current_highest_bid: currentBid,
      current_winner_name: day.current_winner_name || (bidsCount > 0 ? 'Devotee' : ''),
      bids_count: bidsCount,
      status: isClosed ? 'closed' : 'open',
      is_past_cutoff: isPastCutoff,
      cutoff_time: day.cutoff_time,
      quick_options: quickOptions,
    };
  });
}

/**
 * Admin endpoint data: full unmasked days, payments, and settings
 */
export async function getAartiDaysAdmin() {
  const settings = await getAartiSettings();

  const [daysRes, bidsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?select=*&order=day_number.asc`, {
      headers: getServiceHeaders(),
      cache: 'no-store',
    }),
    fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?is_verified=eq.true&select=*&order=created_at.desc`, {
      headers: getServiceHeaders(),
      cache: 'no-store',
    }),
  ]);

  const days = daysRes.ok ? await daysRes.json() : [];
  const allBids = bidsRes.ok ? await bidsRes.json() : [];

  const now = new Date();

  const enrichedDays = days.map(day => {
    const cutoffDate = new Date(day.cutoff_time);
    const isPastCutoff = now > cutoffDate;

    const [y, m, d] = (day.event_date || '').split('-');
    const formattedDate = (y && m && d) ? `${m}-${d}-${y}` : day.event_date;

    const dayBids = allBids.filter(b => b.day_number === day.day_number);

    return {
      ...day,
      formatted_date: formattedDate,
      is_past_cutoff: isPastCutoff,
      bids: dayBids,
    };
  });

  return {
    settings,
    days: enrichedDays,
  };
}

/**
 * Initiate bid: validate amount, create unverified record, send 6-digit OTP email
 */
export async function initiateBid({ day_number, bidder_name, bidder_phone, bidder_email, bid_amount }) {
  if (!day_number || !bidder_name?.trim() || !bidder_phone?.trim() || !bidder_email?.trim() || !bid_amount) {
    throw new Error('Please provide your Full Name, Phone Number, Email, and select a Bid Amount.');
  }

  const cleanEmail = bidder_email.toLowerCase().trim();
  const cleanPhone = bidder_phone.trim();
  const cleanName = bidder_name.trim();
  const amount = Number(bid_amount);

  // 1. Fetch day details & settings
  const settings = await getAartiSettings();
  const dayRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${day_number}&select=*`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });

  if (!dayRes.ok) throw new Error('Failed to find festival day.');
  const days = await dayRes.json();
  const day = days[0];
  if (!day) throw new Error('Invalid day selected.');

  const now = new Date();
  if (day.status === 'closed' || now > new Date(day.cutoff_time)) {
    throw new Error('Bidding for this day has concluded at 9:30 PM EST.');
  }

  // 2. Validate bid amount meets minimum
  const currentBid = Number(day.current_highest_bid || day.base_bid || 500);
  const bidsCount = Number(day.bids_count || 0);

  if (bidsCount === 0) {
    if (amount < Number(day.base_bid || 500)) {
      throw new Error(`The opening bid must be at least $${Number(day.base_bid || 500).toLocaleString()}.`);
    }
  } else {
    const minStep = calculateNextStep(currentBid, settings);
    if (amount < currentBid + minStep) {
      throw new Error(`The minimum next bid is $${(currentBid + minStep).toLocaleString()}.`);
    }
  }

  // 3. Generate 6-digit OTP code (5-minute expiration)
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // 4. Save unverified bid
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids`, {
    method: 'POST',
    headers: getServiceHeaders(),
    body: JSON.stringify({
      day_number: Number(day_number),
      bidder_name: cleanName,
      bidder_phone: cleanPhone,
      bidder_email: cleanEmail,
      bid_amount: amount,
      is_verified: false,
      otp_code: otpCode,
      otp_expires_at: expiresAt,
      is_highest: false,
    }),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    throw new Error(`Failed to record bid: ${errText}`);
  }

  const inserted = await insertRes.json();
  const bidRecord = inserted[0];

  // 5. Send OTP Email
  const [y, m, d] = (day.event_date || '').split('-');
  const formattedDate = (y && m && d) ? `${m}-${d}-${y}` : day.event_date;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #b45309 0%, #ea580c 100%); padding: 32px 28px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.9); }
        .body { padding: 32px 28px; }
        .otp-box { background: #1e293b; border: 1.5px dashed #f59e0b; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-digits { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; font-family: monospace; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 14px; }
        .detail-label { color: #94a3b8; }
        .detail-val { color: #ffffff; font-weight: 600; }
        .footer { padding: 20px 28px; background: #0f172a; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.06); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Hindu Community Center of Knoxville</h1>
          <p>Navratri 2026 Daily Aarti Seva Bidding</p>
        </div>
        <div class="body">
          <p style="margin: 0 0 16px; font-size: 16px; color: #e2e8f0;">Jai Mataji, <strong>${cleanName}</strong>!</p>
          <p style="margin: 0 0 20px; font-size: 14px; color: #94a3b8; line-height: 1.5;">
            Please enter the 6-digit verification code below to confirm and post your Aarti Seva bid. This code expires in <strong>5 minutes</strong>.
          </p>

          <div class="otp-box">
            <div style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Your Verification Code</div>
            <div class="otp-digits">${otpCode}</div>
          </div>

          <div style="margin-top: 24px;">
            <div class="detail-row">
              <span class="detail-label">Festival Day</span>
              <span class="detail-val">${day.day_title}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date (MM-DD-YYYY)</span>
              <span class="detail-val">${formattedDate}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label">Your Bid Amount</span>
              <span class="detail-val" style="color: #34d399; font-size: 16px;">$${amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          Hindu Community Center · 8580 Executive Park Dr, Knoxville, TN 37923<br>
          If you did not request this bid, please ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"HCC Navratri Aarti" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: `Your Verification Code: ${otpCode} (Navratri Aarti Bid: $${amount.toLocaleString()})`,
      html: emailHtml,
    });
  } catch (mailErr) {
    console.error('[Aarti OTP Email Error]', mailErr);
    // Don't crash if mail fails in dev, but log it
  }

  // Mask email for public client response (e.g. j***@gmail.com)
  const [localPart, domainPart] = cleanEmail.split('@');
  const maskedLocal = localPart.length <= 2 ? `${localPart}***` : `${localPart[0]}***${localPart[localPart.length - 1]}`;
  const maskedEmail = `${maskedLocal}@${domainPart}`;

  return {
    success: true,
    bid_id: bidRecord.id,
    masked_email: maskedEmail,
    expires_in_seconds: 300,
  };
}

/**
 * Verify OTP: marks bid verified, updates leader, dispatches outbid alert
 */
export async function verifyBid({ bid_id, otp_code }) {
  if (!bid_id || !otp_code?.trim()) {
    throw new Error('Please enter the 6-digit verification code.');
  }

  // 1. Fetch bid record
  const bidRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?id=eq.${bid_id}&select=*`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });

  if (!bidRes.ok) throw new Error('Bid not found.');
  const bids = await bidRes.json();
  const bid = bids[0];
  if (!bid) throw new Error('Invalid bid reference.');

  if (bid.is_verified) {
    return { success: true, message: 'Bid is already verified and active.' };
  }

  // Check expiration
  if (new Date() > new Date(bid.otp_expires_at)) {
    throw new Error('Verification code has expired. Please click "Resend Code" to receive a new one.');
  }

  // Check code match
  if (bid.otp_code.trim() !== otp_code.trim()) {
    throw new Error('Invalid verification code. Please check your email and try again.');
  }

  // 2. Fetch current day details to ensure race-condition protection
  const dayRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${bid.day_number}&select=*`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });

  if (!dayRes.ok) throw new Error('Failed to find festival day.');
  const days = await dayRes.json();
  const day = days[0];

  const now = new Date();
  if (day.status === 'closed' || now > new Date(day.cutoff_time)) {
    throw new Error('Bidding for this day has already closed at 9:30 PM EST.');
  }

  const previousWinnerEmail = day.current_winner_email;
  const previousWinnerName = day.current_winner_name;
  const previousHighBid = Number(day.current_highest_bid || day.base_bid || 500);

  // If another verified bid beat this amount while the user was entering OTP
  if (day.bids_count > 0 && bid.bid_amount <= previousHighBid) {
    throw new Error(`Another devotee just placed a verified bid of $${previousHighBid.toLocaleString()}. Please place a higher bid to take the lead.`);
  }

  // 3. Mark this bid verified & highest
  await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?id=eq.${bid_id}`, {
    method: 'PATCH',
    headers: getServiceHeaders(),
    body: JSON.stringify({
      is_verified: true,
      is_highest: true,
    }),
  });

  // Demote previous bids for this day
  await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?day_number=eq.${bid.day_number}&id=neq.${bid_id}`, {
    method: 'PATCH',
    headers: getServiceHeaders(),
    body: JSON.stringify({
      is_highest: false,
    }),
  });

  // 4. Update navratri_aarti_days master row
  const updatedDayRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${bid.day_number}`, {
    method: 'PATCH',
    headers: getServiceHeaders(),
    body: JSON.stringify({
      current_highest_bid: bid.bid_amount,
      current_winner_name: bid.bidder_name,
      current_winner_email: bid.bidder_email,
      current_winner_phone: bid.bidder_phone,
      bids_count: Number(day.bids_count || 0) + 1,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!updatedDayRes.ok) {
    const errText = await updatedDayRes.text();
    console.error('Failed to update day row:', errText);
  }

  // 5. Send outbid alert to previous leader if different email
  if (previousWinnerEmail && previousWinnerEmail.toLowerCase() !== bid.bidder_email.toLowerCase()) {
    sendOutbidAlert({
      toEmail: previousWinnerEmail,
      toName: previousWinnerName || 'Devotee',
      dayTitle: day.day_title,
      eventDate: day.event_date,
      newHighBid: bid.bid_amount,
      newWinnerName: bid.bidder_name,
    }).catch(err => console.error('[Outbid Email Error]', err));
  }

  return {
    success: true,
    day_number: bid.day_number,
    bid_amount: bid.bid_amount,
    bidder_name: bid.bidder_name,
  };
}

/**
 * Resend OTP code
 */
export async function resendOtp({ bid_id }) {
  if (!bid_id) throw new Error('Missing bid ID');

  const bidRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?id=eq.${bid_id}&select=*`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });

  if (!bidRes.ok) throw new Error('Bid not found');
  const bids = await bidRes.json();
  const bid = bids[0];
  if (!bid) throw new Error('Bid record not found');

  if (bid.is_verified) throw new Error('Bid is already verified');

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?id=eq.${bid_id}`, {
    method: 'PATCH',
    headers: getServiceHeaders(),
    body: JSON.stringify({
      otp_code: newOtp,
      otp_expires_at: expiresAt,
    }),
  });

  // Resend email
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"HCC Navratri Aarti" <${process.env.GMAIL_USER}>`,
    to: bid.bidder_email,
    subject: `New Code: ${newOtp} (Navratri Aarti Bid: $${bid.bid_amount.toLocaleString()})`,
    html: `<p>Jai Mataji, ${bid.bidder_name}!</p><p>Your new verification code is: <strong>${newOtp}</strong> (expires in 5 minutes).</p>`,
  });

  return { success: true };
}

/**
 * Send outbid alert email
 */
async function sendOutbidAlert({ toEmail, toName, dayTitle, eventDate, newHighBid }) {
  const [y, m, d] = (eventDate || '').split('-');
  const formattedDate = (y && m && d) ? `${m}-${d}-${y}` : eventDate;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #e11d48 0%, #b45309 100%); padding: 32px 28px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; }
        .body { padding: 32px 28px; }
        .alert-pill { display: inline-block; padding: 6px 14px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
        .cta-btn { display: block; width: 100%; box-sizing: border-box; text-align: center; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000000; font-weight: 700; font-size: 15px; padding: 14px 20px; border-radius: 12px; text-decoration: none; margin: 24px 0 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Hindu Community Center of Knoxville</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.9);">Navratri 2026 Daily Aarti Alert</p>
        </div>
        <div class="body">
          <div class="alert-pill">Higher Bid Placed</div>
          <p style="margin: 0 0 12px; font-size: 16px; color: #e2e8f0;">Jai Mataji, <strong>${toName}</strong>!</p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #94a3b8; line-height: 1.5;">
            Another devotee has just placed a higher verified bid on <strong>${dayTitle}</strong> (${formattedDate}).
          </p>

          <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">New Highest Bid</div>
            <div style="font-size: 28px; font-weight: 800; color: #f59e0b;">$${newHighBid.toLocaleString()}</div>
          </div>

          <p style="margin: 0 0 20px; font-size: 14px; color: #94a3b8;">
            Would you like to reclaim your Aarti Seva for this day? Tap the button below to view the live dashboard and submit your new bid.
          </p>

          <a href="https://dashboard.knoxvillemandir.org/navratri-aarti" class="cta-btn">View Live Aarti Auction & Rebid →</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"HCC Navratri Aarti" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `Outbid Notice: Navratri ${dayTitle} Aarti (New High Bid: $${newHighBid.toLocaleString()})`,
    html,
  });
}

/**
 * Admin: Update day status, cutoff, or manual winner
 */
export async function updateAdminDay({ day_number, status, cutoff_time, current_winner_name, current_highest_bid }) {
  const updates = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (cutoff_time) updates.cutoff_time = cutoff_time;
  if (current_winner_name !== undefined) updates.current_winner_name = current_winner_name;
  if (current_highest_bid !== undefined) updates.current_highest_bid = Number(current_highest_bid);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${day_number}`, {
    method: 'PATCH',
    headers: getServiceHeaders(),
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update day: ${errText}`);
  }

  return { success: true };
}

/**
 * Admin: Update iPad payment check-off status
 */
export async function updateAdminPayment({ day_number, payment_status, payment_collector, payment_method, payment_ref, admin_notes }) {
  const updates = {
    payment_status: payment_status || 'pending',
    payment_collector: payment_collector || '',
    payment_method: payment_method || '',
    payment_ref: payment_ref || '',
    admin_notes: admin_notes || '',
    updated_at: new Date().toISOString(),
  };

  if (payment_status === 'paid') {
    updates.paid_at = new Date().toISOString();
  } else if (payment_status === 'pending') {
    updates.paid_at = null;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${day_number}`, {
    method: 'PATCH',
    headers: getServiceHeaders(),
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update payment: ${errText}`);
  }

  return { success: true };
}

/**
 * Admin: Update increment settings
 */
export async function updateAdminSettings({ tier1_max, tier1_increment, tier2_increment, is_published, daily_cutoff_time }) {
  const updates = { updated_at: new Date().toISOString() };
  if (tier1_max !== undefined) updates.tier1_max = Number(tier1_max);
  if (tier1_increment !== undefined) updates.tier1_increment = Number(tier1_increment);
  if (tier2_increment !== undefined) updates.tier2_increment = Number(tier2_increment);
  if (is_published !== undefined) updates.is_published = Boolean(is_published);
  if (daily_cutoff_time !== undefined) updates.daily_cutoff_time = daily_cutoff_time;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_settings?id=eq.config`, {
    method: 'PATCH',
    headers: getServiceHeaders(),
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update settings: ${errText}`);
  }

  return { success: true };
}
