/**
 * ═══════════════════════════════════════════════════════════════════
 * GET /api/navratri/events/[eventId]   — Get event detail
 * PATCH /api/navratri/events/[eventId] — Update event (settings, status)
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Valid status transitions
const VALID_TRANSITIONS = {
  draft:     ['published'],
  published: ['active', 'draft'],
  active:    ['completed'],
  completed: ['archived'],
  archived:  [],
};

export async function GET(request, { params }) {
  try {
    const { eventId } = await params;
    const event = await db.getEventById(eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Also fetch event dates
    const dates = await db.getEventDates(event.id);

    return NextResponse.json({ event, dates });
  } catch (err) {
    console.error('[navratri/events/id] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { eventId } = await params;
    const event = await db.getEventById(eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const body = await request.json();
    const reqInfo = getRequestInfo(request);

    // Handle status change separately
    if (body.status && body.status !== event.status) {
      const allowed = VALID_TRANSITIONS[event.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({
          error: `Cannot transition from "${event.status}" to "${body.status}". Allowed: ${allowed.join(', ') || 'none'}`,
        }, { status: 400 });
      }

      await logAudit({
        eventId:    event.id,
        action:     auditActions.EVENT_STATUS_CHANGE,
        entityType: 'event',
        entityId:   event.id,
        userId:     user.id,
        userEmail:  user.email,
        oldValue:   { status: event.status },
        newValue:   { status: body.status },
        ...reqInfo,
      });
    }

    // Build update object — only allow safe fields
    const allowedFields = [
      'name', 'status', 'venue_name', 'venue_address', 'contact_phone', 'contact_email',
      'default_start_time', 'default_end_time', 'timezone',
      'hero_image_url', 'theme_primary', 'theme_secondary', 'theme_accent',
      'terms_text', 'terms_version', 'refund_policy_text', 'refund_cutoff_hours',
      'daily_sales_open', 'combo_sales_open',
      'price_general_daily', 'price_pioneer_guest_daily', 'price_nonmember_daily', 'price_combo',
      'daily_member_limit', 'daily_pioneer_guest_limit',
      'combo_wristband_qty', 'pioneer_wristband_qty', 'pioneer_parking_qty', 'committee_extra_parking',
      'price_lock_minutes', 'stripe_session_minutes',
      'reminder_lead_hours', 'reminder_channel',
      'odoo_analytic_account_id', 'odoo_analytic_account_name',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await db.updateEvent(eventId, updateData);

    // Log pricing changes specifically
    const pricingFields = ['price_general_daily', 'price_pioneer_guest_daily', 'price_nonmember_daily', 'price_combo'];
    const changedPricing = pricingFields.filter(f => body[f] !== undefined && body[f] !== event[f]);
    if (changedPricing.length > 0) {
      await logAudit({
        eventId: event.id,
        action: auditActions.PRICING_CHANGE,
        entityType: 'event',
        entityId: event.id,
        userId: user.id,
        userEmail: user.email,
        oldValue: Object.fromEntries(changedPricing.map(f => [f, event[f]])),
        newValue: Object.fromEntries(changedPricing.map(f => [f, body[f]])),
        ...reqInfo,
      });
    }

    return NextResponse.json({ success: true, event: updated[0] || updated });
  } catch (err) {
    console.error('[navratri/events/id] PATCH error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
