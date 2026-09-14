/**
 * ═══════════════════════════════════════════════════════════════════
 * GET /api/navratri/events       — List all events
 * POST /api/navratri/events      — Create a new event (admin only)
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

// GET — List all events
export async function GET() {
  try {
    const events = await db.getEvents();
    return NextResponse.json({ events });
  } catch (err) {
    console.error('[navratri/events] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Create new event
export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, slug, membershipYear, venueName, venueAddress } = body;

    if (!name || !slug || !membershipYear) {
      return NextResponse.json({ error: 'name, slug, and membershipYear are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await db.getEventBySlug(slug);
    if (existing) {
      return NextResponse.json({ error: `Event with slug "${slug}" already exists` }, { status: 409 });
    }

    const event = await db.createEvent({
      name,
      slug,
      membership_year: membershipYear,
      venue_name:      venueName || null,
      venue_address:   venueAddress || null,
      created_by:      user.id,
    });

    const reqInfo = getRequestInfo(request);
    await logAudit({
      eventId:    event.id,
      action:     auditActions.EVENT_CREATE,
      entityType: 'event',
      entityId:   event.id,
      userId:     user.id,
      userEmail:  user.email,
      newValue:   { name, slug, membershipYear },
      ...reqInfo,
    });

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error('[navratri/events] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
