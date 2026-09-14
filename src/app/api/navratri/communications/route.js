/**
 * ═══════════════════════════════════════════════════════════════════
 * /api/navratri/communications — Send reminders & announcements
 * ═══════════════════════════════════════════════════════════════════
 *
 * POST actions:
 *   - reminder:     Send reminder to all ticket holders for a date
 *   - announcement: Send announcement to all ticket holders
 *   - test:         Send test email/SMS to admin
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';
import { sendReminder, sendAnnouncement } from '@/lib/navratri/communications';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, eventId, eventDateId, subject, message: msgBody, channels } = body;
    const reqInfo = getRequestInfo(request);

    if (!action || !eventId) {
      return NextResponse.json({ error: 'action and eventId required' }, { status: 400 });
    }

    const sendChannels = channels || ['email', 'sms'];

    // ── Send Reminder ────────────────────────────────────────────────────────
    if (action === 'reminder') {
      if (!eventDateId) return NextResponse.json({ error: 'eventDateId required for reminders' }, { status: 400 });

      // Get all orders with tickets for this date
      const orders = await db.query('navratri_orders',
        `event_id=eq.${eventId}&payment_status=in.(paid,partial_refund)`,
        { select: 'id,order_number,purchaser_name,purchaser_email,purchaser_phone' });

      const dateInfo = await db.getEventDateById(eventDateId);
      if (!dateInfo) return NextResponse.json({ error: 'Event date not found' }, { status: 404 });

      const dateName = dateInfo.label || dateInfo.event_date;
      const dateStr = new Date(dateInfo.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      // Filter orders that have tickets for this specific date
      let sentCount = 0;
      let errorCount = 0;

      for (const order of orders) {
        const items = await db.getOrderItems(order.id);
        const hasDate = items.some(i => i.event_date_id === eventDateId || i.ticket_type === 'combo');

        if (hasDate) {
          try {
            await sendReminder(order, dateName, dateStr);
            sentCount++;
          } catch {
            errorCount++;
          }
        }
      }

      await logAudit({
        eventId,
        action: auditActions.COMMUNICATION_SEND,
        entityType: 'reminder',
        entityId: eventDateId,
        userId: user.id,
        userEmail: user.email,
        newValue: { dateName, sentCount, errorCount, channels: sendChannels },
        ...reqInfo,
      });

      return NextResponse.json({ success: true, sentCount, errorCount, dateName });
    }

    // ── Send Announcement ────────────────────────────────────────────────────
    if (action === 'announcement') {
      if (!subject || !msgBody) return NextResponse.json({ error: 'subject and message required' }, { status: 400 });

      const orders = await db.query('navratri_orders',
        `event_id=eq.${eventId}&payment_status=in.(paid,partial_refund)`,
        { select: 'id,order_number,purchaser_name,purchaser_email,purchaser_phone' });

      // Deduplicate by phone (same person might have multiple orders)
      const seen = new Set();
      const uniqueRecipients = [];
      for (const order of orders) {
        const key = order.purchaser_phone || order.purchaser_email;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueRecipients.push(order);
        }
      }

      let sentCount = 0;
      let errorCount = 0;

      for (const recipient of uniqueRecipients) {
        try {
          await sendAnnouncement(
            sendChannels.includes('email') ? recipient.purchaser_email : null,
            sendChannels.includes('sms') ? recipient.purchaser_phone : null,
            recipient.purchaser_name,
            subject,
            msgBody
          );
          sentCount++;
        } catch {
          errorCount++;
        }
      }

      await logAudit({
        eventId,
        action: auditActions.COMMUNICATION_SEND,
        entityType: 'announcement',
        userId: user.id,
        userEmail: user.email,
        newValue: { subject, sentCount, errorCount, totalRecipients: uniqueRecipients.length, channels: sendChannels },
        ...reqInfo,
      });

      return NextResponse.json({ success: true, sentCount, errorCount, totalRecipients: uniqueRecipients.length });
    }

    // ── Test Send ────────────────────────────────────────────────────────────
    if (action === 'test') {
      const testOrder = {
        order_number: 'TEST-000',
        purchaser_name: user.name || 'Test User',
        purchaser_email: user.email,
        purchaser_phone: body.testPhone || '',
      };

      try {
        await sendAnnouncement(user.email, body.testPhone || null, 'Test User', subject || 'Test Announcement', msgBody || 'This is a test message from HCC Navratri.');
        return NextResponse.json({ success: true, message: `Test sent to ${user.email}` });
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[navratri/communications] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
