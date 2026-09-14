/**
 * ═══════════════════════════════════════════════════════════════════
 * POST /api/navratri/scanner — Scanner auth, validate QR, check-in
 * ═══════════════════════════════════════════════════════════════════
 *
 * Actions (via body.action):
 *   - 'auth'      — Employee PIN login → scanner session token
 *   - 'validate'  — Parse rolling QR → return ticket details + name
 *   - 'checkin'   — Confirm check-in (after name verification)
 *   - 'lookup'    — Manual search by phone/name (fallback for no-internet)
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import * as db from '@/lib/navratri/db';
import { validateRollingQR, validateTicketForCheckin, confirmCheckin } from '@/lib/navratri/tickets';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const reqInfo = getRequestInfo(request);

    // ── Employee PIN Auth ────────────────────────────────────────────────────
    if (action === 'auth') {
      const { pin, eventId, sessionType = 'scanner' } = body;

      if (!pin || !eventId) {
        return NextResponse.json({ error: 'PIN and eventId are required' }, { status: 400 });
      }

      // Verify PIN against Odoo hr.employee
      try {
        const creds = await getCredentials();
        const uid   = await odooAuth(creds);

        // Search for employee with this PIN
        const employees = await odooCall(creds, uid, 'hr.employee', 'search_read', [
          [['pin', '=', pin]]
        ], {
          fields: ['id', 'name', 'job_title', 'work_email'],
          limit: 1,
        });

        if (employees.length === 0) {
          return NextResponse.json({ error: 'Invalid PIN. Employee not found.' }, { status: 401 });
        }

        const employee = employees[0];

        // Create scanner session (4-hour expiry)
        const sessionToken = crypto.randomBytes(24).toString('hex');
        await db.createScannerSession({
          employee_odoo_id: employee.id,
          employee_name:    employee.name,
          event_id:         eventId,
          session_type:     sessionType,
          token:            sessionToken,
          expires_at:       new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          ip_address:       reqInfo.ipAddress,
          device_info:      reqInfo.deviceInfo,
        });

        await logAudit({
          eventId,
          action: auditActions.SCANNER_AUTH,
          entityType: 'scanner_session',
          employeeOdooId: employee.id,
          newValue: { employeeName: employee.name, sessionType },
          ...reqInfo,
        });

        return NextResponse.json({
          success: true,
          sessionToken,
          employee: {
            id: employee.id,
            name: employee.name,
            jobTitle: employee.job_title,
          },
        });

      } catch (odooErr) {
        console.error('[navratri/scanner] Odoo auth error:', odooErr.message);
        return NextResponse.json({
          error: 'Could not verify PIN. Please check Odoo connection.',
        }, { status: 503 });
      }
    }

    // ── Validate Scanner Session ─────────────────────────────────────────────
    const sessionToken = body.sessionToken || request.headers.get('x-scanner-token');
    if (!sessionToken) {
      return NextResponse.json({ error: 'Scanner session required. Please log in.' }, { status: 401 });
    }

    const session = await db.getScannerSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Scanner session expired. Please log in again.' }, { status: 401 });
    }

    // Update last activity
    await db.updateScannerSessionActivity(sessionToken);

    // ── Validate QR ──────────────────────────────────────────────────────────
    if (action === 'validate') {
      const { qrPayload, eventDateId } = body;

      if (!qrPayload) {
        return NextResponse.json({ error: 'QR payload is required' }, { status: 400 });
      }

      // 1. Parse the rolling QR format
      if (!qrPayload.startsWith('NV:')) {
        return NextResponse.json({
          valid: false,
          reason: 'This is not a Navratri ticket QR code',
          scanResult: 'invalid',
        });
      }

      // Extract the token from QR
      const parts = qrPayload.split(':');
      if (parts.length !== 4) {
        return NextResponse.json({
          valid: false,
          reason: 'Invalid QR format',
          scanResult: 'invalid',
        });
      }

      const token = parts[1];

      // 2. Look up the ticket to get the token_secret
      const ticket = await db.getTicketByToken(token);
      if (!ticket) {
        // Log failed scan attempt
        await db.createCheckin({
          ticket_id:          0, // No valid ticket
          event_date_id:      eventDateId || 0,
          employee_odoo_id:   session.employee_odoo_id,
          employee_name:      session.employee_name,
          quantity_checked_in: 0,
          scan_result:        'invalid',
          device_info:        reqInfo.deviceInfo,
          ip_address:         reqInfo.ipAddress,
        });

        return NextResponse.json({
          valid: false,
          reason: 'Ticket not found',
          scanResult: 'invalid',
        });
      }

      // 3. Validate the rolling QR (HMAC + time window)
      const qrResult = validateRollingQR(qrPayload, ticket.token_secret);
      if (!qrResult.valid) {
        await db.createCheckin({
          ticket_id:          ticket.id,
          event_date_id:      eventDateId || 0,
          employee_odoo_id:   session.employee_odoo_id,
          employee_name:      session.employee_name,
          quantity_checked_in: 0,
          scan_result:        'expired_qr',
          device_info:        reqInfo.deviceInfo,
          ip_address:         reqInfo.ipAddress,
        });

        return NextResponse.json({
          valid: false,
          reason: qrResult.reason,
          scanResult: 'expired_qr',
        });
      }

      // 4. Validate ticket status, date, etc.
      const ticketResult = await validateTicketForCheckin(token, eventDateId);

      if (!ticketResult.valid) {
        await db.createCheckin({
          ticket_id:          ticket.id,
          event_date_id:      eventDateId || 0,
          employee_odoo_id:   session.employee_odoo_id,
          employee_name:      session.employee_name,
          quantity_checked_in: 0,
          scan_result:        ticketResult.scanResult,
          device_info:        reqInfo.deviceInfo,
          ip_address:         reqInfo.ipAddress,
        });

        return NextResponse.json({
          valid: false,
          reason: ticketResult.reason,
          scanResult: ticketResult.scanResult,
          purchaserName: ticketResult.order?.purchaser_name || null,
        });
      }

      // 5. Valid — return ticket details + purchaser name for verification
      return NextResponse.json({
        valid: true,
        ticketId: ticket.id,
        purchaserName: ticketResult.purchaserName,
        quantity: ticketResult.quantity,
        ticketType: ticket.ticket_type,
        orderNumber: ticketResult.order?.order_number,
        customerType: ticketResult.order?.customer_type,
        scanResult: 'valid',
        // Don't confirm yet — staff must verify name first
        message: 'Please verify the name with the customer',
      });
    }

    // ── Confirm Check-In ─────────────────────────────────────────────────────
    if (action === 'checkin') {
      const { ticketId, eventDateId } = body;

      if (!ticketId) {
        return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
      }

      const result = await confirmCheckin(
        ticketId, eventDateId,
        session.employee_odoo_id, session.employee_name,
        reqInfo.deviceInfo, reqInfo.ipAddress
      );

      if (!result.success) {
        return NextResponse.json({
          success: false,
          reason: result.reason,
        }, { status: 409 });
      }

      await logAudit({
        eventId: session.event_id,
        action: auditActions.TICKET_CHECKIN,
        entityType: 'ticket',
        entityId: ticketId,
        employeeOdooId: session.employee_odoo_id,
        newValue: {
          quantity: result.quantity,
          checkinId: result.checkinId,
          employee: session.employee_name,
        },
        ...reqInfo,
      });

      return NextResponse.json({
        success: true,
        checkinId: result.checkinId,
        quantity: result.quantity,
        message: `✅ Checked in ${result.quantity} person(s)`,
      });
    }

    // ── Manual Lookup ────────────────────────────────────────────────────────
    if (action === 'lookup') {
      const { search, eventId } = body;
      if (!search || !eventId) {
        return NextResponse.json({ error: 'search and eventId are required' }, { status: 400 });
      }

      // Search orders by phone, name, or order number
      const orders = await db.getOrders(eventId, { search, limit: 10 });

      const results = [];
      for (const order of orders) {
        const tickets = await db.getTicketsByOrder(order.id);
        results.push({
          orderNumber: order.order_number,
          purchaserName: order.purchaser_name,
          purchaserPhone: order.purchaser_phone,
          customerType: order.customer_type,
          orderType: order.order_type,
          paymentStatus: order.payment_status,
          tickets: tickets.map(t => ({
            id: t.id,
            type: t.ticket_type,
            status: t.status,
            quantity: t.quantity,
            eventDateId: t.event_date_id,
            checkedInAt: t.checked_in_at,
          })),
        });
      }

      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('[navratri/scanner] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
