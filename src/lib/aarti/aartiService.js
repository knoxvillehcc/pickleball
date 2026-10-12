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
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Code - Aarti Seva</title>
    </head>
    <body style="margin: 0; padding: 24px 10px; background-color: #F4F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1D1D1F; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        
        <!-- Header -->
        <tr>
          <td style="background-color: #E8780C; padding: 26px 24px; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #FFF2E5; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
              Hindu Community Center of Knoxville
            </div>
            <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">
              Navratri 2026 · Daily Aarti Seva
            </h1>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 32px 28px;">
            <h2 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #1D1D1F;">
              Jai Mataji, ${cleanName}!
            </h2>
            <p style="margin: 0 0 20px; font-size: 14.5px; color: #515154; line-height: 1.55;">
              Please enter the 6-digit verification code below to confirm and post your Aarti Seva bid. This code expires in <strong>5 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1.5px dashed #F59E0B; border-radius: 14px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 20px; text-align: center;">
                  <div style="font-size: 11.5px; font-weight: 700; color: #B45309; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                    Your Verification Code
                  </div>
                  <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #D97706; font-family: monospace;">
                    ${otpCode}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Details Summary Table -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 10px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-size: 13.5px; color: #64748B;">
                  Festival Day
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-size: 14px; font-weight: 700; color: #1D1D1F; text-align: right;">
                  Day ${day.day_number} — ${day.day_title}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-size: 13.5px; color: #64748B;">
                  Date (MM-DD-YYYY)
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-size: 14px; font-weight: 700; color: #1D1D1F; text-align: right;">
                  ${formattedDate}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-size: 14px; color: #64748B;">
                  Your Bid Amount
                </td>
                <td style="padding: 12px 0; font-size: 18px; font-weight: 800; color: #E8780C; text-align: right;">
                  $${amount.toLocaleString()}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #FAFAFC; padding: 20px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
            <div style="font-size: 12px; font-weight: 600; color: #64748B;">
              Hindu Community Center · 8580 Executive Park Dr, Knoxville, TN 37923
            </div>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">
              If you did not request this bid, please ignore this email.
            </div>
          </td>
        </tr>

      </table>
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
      dayNumber: bid.day_number,
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
async function sendOutbidAlert({ toEmail, toName, dayNumber, dayTitle, eventDate, newHighBid }) {
  const [y, m, d] = (eventDate || '').split('-');
  const formattedDate = (y && m && d) ? `${m}-${d}-${y}` : eventDate;

  // Calculate next minimum bid to take back the lead
  const settings = await getAartiSettings().catch(() => ({ tier1_max: 3000, tier1_increment: 500, tier2_increment: 250 }));
  const minStep = calculateNextStep(newHighBid, settings);
  const minNextBid = newHighBid + minStep;

  // Determine rebid link
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost'))
    ? process.env.NEXT_PUBLIC_BASE_URL
    : 'https://dashboard.knoxvillemandir.org';
  const targetDayNum = dayNumber || 1;
  const rebidUrl = `${baseUrl}/navratri-aarti?day=${targetDayNum}#day-card-${targetDayNum}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Outbid Alert - Aarti Seva</title>
    </head>
    <body style="margin: 0; padding: 24px 10px; background-color: #F4F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1D1D1F; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        
        <!-- Header Banner -->
        <tr>
          <td style="background-color: #E8780C; padding: 26px 24px; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #FFF2E5; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
              Hindu Community Center of Knoxville
            </div>
            <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">
              Navratri 2026 · Daily Aarti Seva
            </h1>
          </td>
        </tr>

        <!-- Content Area -->
        <tr>
          <td style="padding: 32px 28px;">

            <!-- Higher Bid Pill Badge -->
            <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
              <tr>
                <td style="background-color: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 20px; padding: 6px 14px;">
                  <span style="font-size: 11.5px; font-weight: 800; color: #B91C1C; text-transform: uppercase; letter-spacing: 0.8px;">
                    Higher Bid Placed
                  </span>
                </td>
              </tr>
            </table>

            <h2 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #1D1D1F;">
              Jai Mataji, ${toName}!
            </h2>

            <p style="margin: 0 0 20px; font-size: 14.5px; color: #515154; line-height: 1.55;">
              Another devotee has just placed a higher verified bid on <strong>Day ${targetDayNum} — ${dayTitle}</strong> (${formattedDate}).
            </p>

            <!-- Highlighted Bid Summary Card -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAFAFC; border: 1.5px solid #E5E7EB; border-radius: 14px; margin-bottom: 22px;">
              <tr>
                <td style="padding: 18px 20px;">
                  <div style="font-size: 11.5px; font-weight: 700; color: #86868B; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px;">
                    New Highest Bid
                  </div>
                  <div style="font-size: 32px; font-weight: 800; color: #E8780C; letter-spacing: -0.5px; line-height: 1.1;">
                    $${newHighBid.toLocaleString()}
                  </div>
                  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 13px; color: #515154;">
                    Minimum next bid to reclaim lead: <strong style="color: #10B981; font-weight: 700;">$${minNextBid.toLocaleString()}</strong>
                  </div>
                </td>
              </tr>
            </table>

            <p style="margin: 0 0 24px; font-size: 14px; color: #515154; line-height: 1.5;">
              Would you like to reclaim your Aarti Seva for this day? Tap the button below to view the live dashboard and submit your new bid. Bidding closes daily at <strong>9:30 PM EST</strong>.
            </p>

            <!-- Bulletproof CTA Button (Solid Orange with White Text) -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 16px;">
              <tr>
                <td align="center" style="background-color: #E8780C; border-radius: 12px; box-shadow: 0 3px 12px rgba(232, 120, 12, 0.28);">
                  <a href="${rebidUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 16px 24px; font-size: 16px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 12px; text-align: center; letter-spacing: 0.2px;">
                    Reclaim Aarti Seva &amp; Rebid Now &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- Direct URL Link Fallback (Always Clickable) -->
            <div style="text-align: center; margin-top: 14px; padding: 12px; background-color: #F8F9FA; border-radius: 10px; border: 1px dashed #CBD5E1;">
              <div style="font-size: 11.5px; color: #64748B; margin-bottom: 4px; font-weight: 600;">
                Or open this link directly in your browser:
              </div>
              <a href="${rebidUrl}" target="_blank" style="font-size: 12.5px; color: #E8780C; font-weight: 700; text-decoration: underline; word-break: break-all;">
                ${rebidUrl}
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #FAFAFC; padding: 20px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
            <div style="font-size: 12px; font-weight: 600; color: #64748B;">
              Hindu Community Center · 8580 Executive Park Dr, Knoxville, TN 37923
            </div>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">
              Daily Aarti bidding concludes each night at 9:30 PM EST.
            </div>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"HCC Navratri Aarti" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `Outbid Notice: Navratri Day ${targetDayNum} Aarti (New High Bid: $${newHighBid.toLocaleString()})`,
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

/**
 * Admin: Void / Remove a bid (e.g. if bidder backs out)
 * Automatically recalculates highest bid and promotes runner-up if available.
 */
export async function removeAartiBid({ bid_id, day_number, reason = '' }) {
  let targetBid = null;

  if (bid_id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?id=eq.${bid_id}&select=*`, {
      headers: getServiceHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      const list = await res.json();
      targetBid = list[0] || null;
    }
  } else if (day_number) {
    // If only day_number was passed, find the active highest bid for that day
    const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?day_number=eq.${day_number}&is_highest=eq.true&select=*`, {
      headers: getServiceHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      const list = await res.json();
      targetBid = list[0] || null;
    }
  }

  if (!targetBid) {
    // If no specific bid row found, but day_number exists, reset day directly
    if (day_number) {
      const dayRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${day_number}&select=*`, {
        headers: getServiceHeaders(),
        cache: 'no-store',
      });
      const dayData = dayRes.ok ? (await dayRes.json())[0] : null;
      const baseBid = dayData?.base_bid || 500;

      await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${day_number}`, {
        method: 'PATCH',
        headers: getServiceHeaders(),
        body: JSON.stringify({
          current_highest_bid: baseBid,
          current_winner_name: '',
          current_winner_email: '',
          current_winner_phone: '',
          bids_count: 0,
          payment_status: 'pending',
          admin_notes: reason ? `Bid withdrawn: ${reason}` : 'Bid withdrawn by admin',
          updated_at: new Date().toISOString(),
        }),
      });
      return { success: true, message: `Day ${day_number} winner removed and reset to opening reserve $${baseBid}.` };
    }
    throw new Error('Target bid not found');
  }

  const targetDayNumber = targetBid.day_number;

  // 1. Delete the voided bid
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?id=eq.${targetBid.id}`, {
    method: 'DELETE',
    headers: getServiceHeaders(),
  });
  if (!delRes.ok) {
    const errText = await delRes.text();
    throw new Error(`Failed to delete bid: ${errText}`);
  }

  // 2. Fetch remaining verified bids for this day
  const remRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?day_number=eq.${targetDayNumber}&is_verified=eq.true&select=*&order=bid_amount.desc,created_at.desc`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });
  const remainingBids = remRes.ok ? await remRes.json() : [];

  // Fetch the day configuration
  const dayRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${targetDayNumber}&select=*`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });
  const day = dayRes.ok ? (await dayRes.json())[0] : null;
  const baseBid = day?.base_bid || 500;

  if (remainingBids.length > 0) {
    // 3A. Promote top remaining verified bid
    const newLeader = remainingBids[0];

    // Mark newLeader as is_highest = true
    await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?id=eq.${newLeader.id}`, {
      method: 'PATCH',
      headers: getServiceHeaders(),
      body: JSON.stringify({ is_highest: true }),
    });

    // Mark all other remaining bids as is_highest = false
    await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_bids?day_number=eq.${targetDayNumber}&id=neq.${newLeader.id}`, {
      method: 'PATCH',
      headers: getServiceHeaders(),
      body: JSON.stringify({ is_highest: false }),
    });

    // Update day master row
    await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${targetDayNumber}`, {
      method: 'PATCH',
      headers: getServiceHeaders(),
      body: JSON.stringify({
        current_highest_bid: newLeader.bid_amount,
        current_winner_name: newLeader.bidder_name,
        current_winner_email: newLeader.bidder_email,
        current_winner_phone: newLeader.bidder_phone,
        bids_count: remainingBids.length,
        payment_status: 'pending',
        admin_notes: reason ? `Previous bid removed (${reason}). Promoted ${newLeader.bidder_name}` : `Previous bid removed. Promoted ${newLeader.bidder_name}`,
        updated_at: new Date().toISOString(),
      }),
    });

    return {
      success: true,
      message: `Bid by ${targetBid.bidder_name} ($${Number(targetBid.bid_amount).toLocaleString()}) removed. ${newLeader.bidder_name} ($${Number(newLeader.bid_amount).toLocaleString()}) is now the active highest bid.`,
      new_leader: {
        name: newLeader.bidder_name,
        amount: newLeader.bid_amount,
      },
    };
  } else {
    // 3B. No remaining bids — reset day back to base opening bid
    await fetch(`${SUPABASE_URL}/rest/v1/navratri_aarti_days?day_number=eq.${targetDayNumber}`, {
      method: 'PATCH',
      headers: getServiceHeaders(),
      body: JSON.stringify({
        current_highest_bid: baseBid,
        current_winner_name: '',
        current_winner_email: '',
        current_winner_phone: '',
        bids_count: 0,
        payment_status: 'pending',
        admin_notes: reason ? `Bid withdrawn by ${targetBid.bidder_name}: ${reason}` : `Bid withdrawn by ${targetBid.bidder_name}`,
        updated_at: new Date().toISOString(),
      }),
    });

    return {
      success: true,
      message: `Bid by ${targetBid.bidder_name} ($${Number(targetBid.bid_amount).toLocaleString()}) removed. Day ${targetDayNumber} reset to opening reserve of $${baseBid.toLocaleString()}.`,
      new_leader: null,
    };
  }
}

