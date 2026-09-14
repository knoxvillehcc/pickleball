/**
 * ═══════════════════════════════════════════════════════════════════
 * /api/navratri/accounting — Daily close, review, post, reopen
 * ═══════════════════════════════════════════════════════════════════
 *
 * POST actions: close, review, post, reopen, adjustment
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';
import { closeDay, reopenDay, createOdooDraftEntry, postOdooEntry } from '@/lib/navratri/accounting';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const date    = searchParams.get('date');

    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

    if (date) {
      const close = await db.getDailyClose(parseInt(eventId, 10), date);
      return NextResponse.json({ close: close || null });
    }

    // List all close records for the event
    const closes = await db.query('navratri_daily_close',
      `event_id=eq.${eventId}`, { order: 'close_date.desc' });
    return NextResponse.json({ closes });
  } catch (err) {
    console.error('[navratri/accounting] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, eventId, date, closeId, reason } = body;
    const reqInfo = getRequestInfo(request);

    if (!action || !eventId) {
      return NextResponse.json({ error: 'action and eventId required' }, { status: 400 });
    }

    // ── Close Day ────────────────────────────────────────────────────────────
    if (action === 'close') {
      if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

      const result = await closeDay(eventId, date, user.id);

      await logAudit({
        eventId,
        action: auditActions.DAILY_CLOSE,
        entityType: 'daily_close',
        entityId: result.id,
        userId: user.id,
        userEmail: user.email,
        newValue: { date, orderCount: result.order_count, stripeGross: result.stripe_gross },
        ...reqInfo,
      });

      return NextResponse.json({ success: true, close: result });
    }

    // ── Create Odoo Draft ────────────────────────────────────────────────────
    if (action === 'draft') {
      if (!closeId) return NextResponse.json({ error: 'closeId required' }, { status: 400 });

      const closeRecord = await db.query('navratri_daily_close', `id=eq.${closeId}`, { limit: 1 });
      if (!closeRecord.length) return NextResponse.json({ error: 'Close record not found' }, { status: 404 });

      const result = await createOdooDraftEntry(closeRecord[0]);

      await logAudit({
        eventId,
        action: auditActions.ODOO_DRAFT,
        entityType: 'daily_close',
        entityId: closeId,
        userId: user.id,
        userEmail: user.email,
        newValue: result,
        ...reqInfo,
      });

      return NextResponse.json({ success: true, ...result });
    }

    // ── Post to Odoo ─────────────────────────────────────────────────────────
    if (action === 'post') {
      if (!closeId) return NextResponse.json({ error: 'closeId required' }, { status: 400 });

      const result = await postOdooEntry(closeId, user.id);

      await logAudit({
        eventId,
        action: auditActions.ODOO_POST,
        entityType: 'daily_close',
        entityId: closeId,
        userId: user.id,
        userEmail: user.email,
        newValue: result,
        ...reqInfo,
      });

      return NextResponse.json({ success: true, ...result });
    }

    // ── Reopen Day ───────────────────────────────────────────────────────────
    if (action === 'reopen') {
      if (!date || !reason) return NextResponse.json({ error: 'date and reason required' }, { status: 400 });

      const result = await reopenDay(eventId, date, user.id, reason);

      await logAudit({
        eventId,
        action: auditActions.DAILY_REOPEN,
        entityType: 'daily_close',
        userId: user.id,
        userEmail: user.email,
        newValue: { date, reason },
        ...reqInfo,
      });

      return NextResponse.json({ success: true, close: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[navratri/accounting] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
