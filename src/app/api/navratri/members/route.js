/**
 * ═══════════════════════════════════════════════════════════════════
 * /api/navratri/members — Sync, search, link/unlink members
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET  — Search members by name/phone/email
 * POST — Actions: sync, link, unlink, toggle_committee
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';
import { syncMembersFromOdoo, searchMembers, linkMembers, unlinkMembers } from '@/lib/navratri/membership';
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
    const search  = searchParams.get('search');

    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

    const members = search
      ? await searchMembers(parseInt(eventId, 10), search)
      : await db.getMembersByEvent(parseInt(eventId, 10));

    // Enrich with committee status
    const committee = await db.getCommitteeMembers(parseInt(eventId, 10));
    const committeeIds = new Set(committee.filter(c => !c.removed_at).map(c => c.odoo_partner_id));

    const enriched = members.map(m => ({
      ...m,
      is_committee: committeeIds.has(m.odoo_partner_id),
    }));

    return NextResponse.json({ members: enriched, total: enriched.length });
  } catch (err) {
    console.error('[navratri/members] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, eventId } = body;
    const reqInfo = getRequestInfo(request);

    if (!action || !eventId) {
      return NextResponse.json({ error: 'action and eventId required' }, { status: 400 });
    }

    // ── Sync from Odoo ───────────────────────────────────────────────────────
    if (action === 'sync') {
      const event = await db.getEventById(eventId);
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

      const result = await syncMembersFromOdoo(eventId, event.membership_year);

      await logAudit({
        eventId,
        action: auditActions.MEMBER_SYNC,
        userId: user.id,
        userEmail: user.email,
        newValue: result,
        ...reqInfo,
      });

      return NextResponse.json({ success: true, ...result });
    }

    // ── Link Members ─────────────────────────────────────────────────────────
    if (action === 'link') {
      const { primaryOdooId, linkedOdooId, reason } = body;
      if (!primaryOdooId || !linkedOdooId || !reason) {
        return NextResponse.json({ error: 'primaryOdooId, linkedOdooId, and reason required' }, { status: 400 });
      }

      await linkMembers(eventId, primaryOdooId, linkedOdooId, reason, user.id);

      await logAudit({
        eventId,
        action: auditActions.MEMBER_LINK,
        userId: user.id,
        userEmail: user.email,
        newValue: { primaryOdooId, linkedOdooId, reason },
        ...reqInfo,
      });

      return NextResponse.json({ success: true });
    }

    // ── Unlink Members ───────────────────────────────────────────────────────
    if (action === 'unlink') {
      const { primaryOdooId, linkedOdooId, reason } = body;
      await unlinkMembers(eventId, primaryOdooId, linkedOdooId, reason, user.id);

      await logAudit({
        eventId,
        action: auditActions.MEMBER_UNLINK,
        userId: user.id,
        userEmail: user.email,
        newValue: { primaryOdooId, linkedOdooId, reason },
        ...reqInfo,
      });

      return NextResponse.json({ success: true });
    }

    // ── Toggle Committee ─────────────────────────────────────────────────────
    if (action === 'toggle_committee') {
      const { odooPartnerId, isCommittee } = body;
      if (!odooPartnerId) {
        return NextResponse.json({ error: 'odooPartnerId required' }, { status: 400 });
      }

      if (isCommittee) {
        await db.addCommitteeMember(eventId, odooPartnerId, user.id);
        await logAudit({
          eventId,
          action: auditActions.COMMITTEE_ADD,
          entityType: 'committee',
          userId: user.id,
          userEmail: user.email,
          newValue: { odooPartnerId },
          ...reqInfo,
        });
      } else {
        await db.removeCommitteeMember(eventId, odooPartnerId, user.id);
        await logAudit({
          eventId,
          action: auditActions.COMMITTEE_REMOVE,
          entityType: 'committee',
          userId: user.id,
          userEmail: user.email,
          newValue: { odooPartnerId },
          ...reqInfo,
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[navratri/members] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
