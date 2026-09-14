/**
 * ═══════════════════════════════════════════════════════════════════
 * Twilio Service — OTP verification & SMS messaging
 * ═══════════════════════════════════════════════════════════════════
 *
 * Built behind config — works only when TWILIO_* env vars are set.
 * Falls back to console logging when Twilio is not configured.
 *
 * Rate limiting: max 5 OTP attempts per session, 30-min session expiry.
 * OTP stored as bcrypt hash — never in plaintext.
 */

import bcrypt from 'bcryptjs';
import * as db from './navratri/db.js';
import { logAudit, auditActions } from './navratri/audit.js';

// ── Config Check ─────────────────────────────────────────────────────────────

export function isTwilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

// ── SMS Sending ──────────────────────────────────────────────────────────────

/**
 * Send an SMS via Twilio REST API.
 * Falls back to console log if Twilio is not configured.
 *
 * @param {string} to      - Recipient phone number (E.164 format preferred)
 * @param {string} message - SMS text body
 * @returns {{ success: boolean, sid?: string, fallback?: boolean }}
 */
export async function sendSMS(to, message) {
  // Clean and format phone number
  let phone = to.replace(/\D/g, '');
  if (phone.length === 10) phone = '1' + phone; // US number
  if (!phone.startsWith('+')) phone = '+' + phone;

  if (!isTwilioConfigured()) {
    console.log(`[Twilio FALLBACK] SMS to ${phone}: ${message}`);
    return { success: true, fallback: true, message: 'SMS logged to console (Twilio not configured)' };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To:   phone,
        From: fromNumber,
        Body: message,
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[Twilio] SMS failed:', err);
      return { success: false, error: err.message || 'SMS send failed' };
    }

    const data = await res.json();
    return { success: true, sid: data.sid };

  } catch (err) {
    console.error('[Twilio] SMS error:', err.message);
    return { success: false, error: err.message };
  }
}


// ── OTP Generation & Verification ────────────────────────────────────────────

/**
 * Generate and send a 6-digit OTP to a phone number.
 *
 * @param {string} phone     - Phone number
 * @param {string} ipAddress - Client IP for rate limiting
 * @returns {{ success: boolean, expiresAt?: string, fallbackCode?: string }}
 */
export async function sendOTP(phone, ipAddress = 'unknown') {
  const cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, error: 'Invalid phone number' };
  }

  // Rate limit: max 3 OTP sends per phone per 10 minutes
  const recentSessions = await db.query('navratri_otp_sessions',
    `phone=eq.${cleanPhone}&created_at=gte.${new Date(Date.now() - 10 * 60000).toISOString()}`,
    { select: 'id', limit: 10 }
  );

  if (recentSessions.length >= 3) {
    return { success: false, error: 'Too many OTP requests. Please wait 10 minutes.' };
  }

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  // Store hashed OTP
  await db.createOtpSession({
    phone:      cleanPhone,
    otp_hash:   otpHash,
    attempts:   0,
    verified:   false,
    ip_address: ipAddress,
    expires_at: expiresAt,
  });

  // Send via Twilio
  const smsResult = await sendSMS(cleanPhone,
    `Your HCC Navratri verification code is: ${otp}\n\nThis code expires in 30 minutes. Do not share this code.`
  );

  await logAudit({
    action: auditActions.OTP_SEND,
    entityType: 'otp',
    reason: `OTP sent to ${cleanPhone.substring(0, 3)}***${cleanPhone.slice(-4)}`,
    ipAddress,
  });

  // In dev/fallback mode, return the code for testing
  if (smsResult.fallback) {
    return {
      success: true,
      expiresAt,
      fallbackCode: otp, // ONLY in dev mode when Twilio is not configured
      message: 'OTP logged to console (Twilio not configured)',
    };
  }

  return { success: smsResult.success, expiresAt, error: smsResult.error };
}

/**
 * Verify an OTP code.
 *
 * @param {string} phone - Phone number
 * @param {string} code  - 6-digit code entered by user
 * @param {string} ipAddress
 * @returns {{ verified: boolean, error?: string }}
 */
export async function verifyOTP(phone, code, ipAddress = 'unknown') {
  const cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone || !code || !/^\d{6}$/.test(code)) {
    return { verified: false, error: 'Invalid phone number or code' };
  }

  // Get the latest active OTP session for this phone
  const session = await db.getOtpSession(cleanPhone);

  if (!session) {
    return { verified: false, error: 'No active OTP session. Please request a new code.' };
  }

  // Check attempts
  if (session.attempts >= (session.max_attempts || 5)) {
    return { verified: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  // Verify the code
  const valid = await bcrypt.compare(code, session.otp_hash);

  if (!valid) {
    // Increment attempts
    await db.updateOtpSession(session.id, {
      attempts: session.attempts + 1,
    });

    await logAudit({
      action: auditActions.OTP_VERIFY_FAIL,
      entityType: 'otp',
      entityId: session.id,
      reason: `Failed attempt ${session.attempts + 1} for ${cleanPhone.substring(0, 3)}***${cleanPhone.slice(-4)}`,
      ipAddress,
    });

    const remaining = (session.max_attempts || 5) - session.attempts - 1;
    return {
      verified: false,
      error: `Invalid code. ${remaining} attempt(s) remaining.`,
    };
  }

  // Mark as verified
  await db.updateOtpSession(session.id, { verified: true });

  await logAudit({
    action: auditActions.OTP_VERIFY_SUCCESS,
    entityType: 'otp',
    entityId: session.id,
    reason: `Verified ${cleanPhone.substring(0, 3)}***${cleanPhone.slice(-4)}`,
    ipAddress,
  });

  return { verified: true };
}


// ── Health Check ─────────────────────────────────────────────────────────────

/**
 * Check if Twilio is properly configured and reachable.
 */
export async function checkTwilioHealth() {
  if (!isTwilioConfigured()) {
    return {
      configured: false,
      status: 'not_configured',
      message: 'Twilio credentials not set. SMS will be logged to console.',
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        configured: true,
        status: 'healthy',
        accountName: data.friendly_name,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      };
    }

    return {
      configured: true,
      status: 'error',
      message: `Twilio API returned ${res.status}`,
    };
  } catch (err) {
    return {
      configured: true,
      status: 'error',
      message: err.message,
    };
  }
}
