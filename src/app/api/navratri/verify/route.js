/**
 * ═══════════════════════════════════════════════════════════════════
 * POST /api/navratri/verify — OTP send & verify + membership check
 * ═══════════════════════════════════════════════════════════════════
 *
 * Actions (via body.action):
 *   - 'send_otp'   — Send OTP to phone
 *   - 'verify_otp' — Verify OTP code + return membership status
 */

import { NextResponse } from 'next/server';
import { sendOTP, verifyOTP } from '@/lib/twilioService';
import { verifyMembership } from '@/lib/navratri/membership';
import * as db from '@/lib/navratri/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, phone, code, eventSlug } = body;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (!action) {
      return NextResponse.json({ error: 'action is required (send_otp or verify_otp)' }, { status: 400 });
    }

    // ── Send OTP ─────────────────────────────────────────────────────────────
    if (action === 'send_otp') {
      if (!phone) {
        return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
      }

      const result = await sendOTP(phone, ip);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 429 });
      }

      // In dev mode (Twilio not configured), return the code
      const response = { success: true, expiresAt: result.expiresAt };
      if (result.fallbackCode) {
        response.devCode = result.fallbackCode;
        response.message = result.message;
      }

      return NextResponse.json(response);
    }

    // ── Verify OTP ───────────────────────────────────────────────────────────
    if (action === 'verify_otp') {
      if (!phone || !code) {
        return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });
      }

      const result = await verifyOTP(phone, code, ip);

      if (!result.verified) {
        return NextResponse.json({ error: result.error, verified: false }, { status: 400 });
      }

      // OTP verified — now check membership
      let membership = null;
      if (eventSlug) {
        const event = await db.getEventBySlug(eventSlug);
        if (event) {
          membership = await verifyMembership(event.id, phone);
        }
      }

      return NextResponse.json({
        verified: true,
        membership: membership ? {
          found: membership.found,
          type: membership.member?.membership_type || null,
          name: membership.member?.name || null,
          email: membership.member?.email || null,
          odooPartnerId: membership.member?.odoo_partner_id || null,
          source: membership.source,
          allMatches: membership.allMatches?.map(m => ({
            name: m.name,
            type: m.membership_type,
            odooPartnerId: m.odoo_partner_id,
          })),
        } : null,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('[navratri/verify] Error:', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
