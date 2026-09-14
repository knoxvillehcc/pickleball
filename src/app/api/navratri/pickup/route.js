/**
 * ═══════════════════════════════════════════════════════════════════
 * POST /api/navratri/pickup — Pass pickup (scan/confirm/lookup)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Actions:
 *   - 'scan'    — QR lookup for pickup
 *   - 'confirm' — Mark pickup complete (wristband/parking)
 *   - 'lookup'  — Manual search by phone/name
 */

import { NextResponse } from 'next/server';
import * as db from '@/lib/navratri/db';
import { validateRollingQR } from '@/lib/navratri/tickets';
import { recordParkingPickup } from '@/lib/navratri/entitlements';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, sessionToken } = body;
    const reqInfo = getRequestInfo(request);

    // Validate scanner session
    if (!sessionToken) {
      return NextResponse.json({ error: 'Scanner session required' }, { status: 401 });
    }
    const session = await db.getScannerSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
    }

    // ── Scan QR for Pickup ───────────────────────────────────────────────────
    if (action === 'scan') {
      const { qrPayload } = body;
      if (!qrPayload || !qrPayload.startsWith('NV:')) {
        return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 });
      }

      const token = qrPayload.split(':')[1];
      const ticket = await db.getTicketByToken(token);
      if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

      // Validate rolling QR
      const qrResult = validateRollingQR(qrPayload, ticket.token_secret);
      if (!qrResult.valid) {
        return NextResponse.json({ error: qrResult.reason }, { status: 400 });
      }

      const order = await db.getOrderById(ticket.order_id);
      const entitlement = order?.odoo_partner_id
        ? await db.getEntitlement(session.event_id, order.odoo_partner_id)
        : null;
      const existingPickups = order?.id
        ? await db.getPickupsForOrder(order.id)
        : [];

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          purchaserName: order.purchaser_name,
          customerType: order.customer_type,
          orderType: order.order_type,
          odooPartnerId: order.odoo_partner_id,
        },
        ticket: {
          id: ticket.id,
          type: ticket.ticket_type,
          status: ticket.status,
          quantity: ticket.quantity,
        },
        entitlement: entitlement ? {
          comboWristbandQty: entitlement.combo_purchased ? 2 : 0,
          pioneerWristbandQty: entitlement.pioneer_claimed ? 2 : 0,
          parkingEligible: entitlement.parking_eligible,
          parkingPickedUp: entitlement.parking_picked_up,
        } : null,
        existingPickups: existingPickups.map(p => ({
          type: p.pickup_type,
          wristbandQty: p.wristband_qty,
          parkingQty: p.parking_qty,
          pickedUpAt: p.picked_up_at,
          employee: p.employee_name,
        })),
      });
    }

    // ── Confirm Pickup ───────────────────────────────────────────────────────
    if (action === 'confirm') {
      const { orderId, pickupType, wristbandQty, parkingQty, parkingPassNumbers, notes, odooPartnerId } = body;

      if (!orderId || !pickupType) {
        return NextResponse.json({ error: 'orderId and pickupType required' }, { status: 400 });
      }

      const pickup = await db.createPickup({
        order_id:          orderId,
        odoo_partner_id:   odooPartnerId || null,
        event_id:          session.event_id,
        pickup_type:       pickupType,
        wristband_qty:     wristbandQty || 0,
        parking_qty:       parkingQty || 0,
        parking_pass_numbers: parkingPassNumbers || null,
        employee_odoo_id:  session.employee_odoo_id,
        employee_name:     session.employee_name,
        notes:             notes || null,
      });

      // Update wristband inventory if applicable
      if (wristbandQty > 0) {
        const inv = await db.getWristbandInventory(session.event_id);
        if (inv) {
          await db.upsertWristbandInventory({
            event_id: session.event_id,
            starting_qty: inv.starting_qty,
            issued_qty: inv.issued_qty + wristbandQty,
          });
        }
      }

      // Update parking entitlement
      if (parkingQty > 0 && odooPartnerId) {
        await recordParkingPickup(session.event_id, odooPartnerId, parkingQty);
      }

      const auditAction = pickupType.includes('parking')
        ? auditActions.PICKUP_PARKING
        : auditActions.PICKUP_WRISTBAND;

      await logAudit({
        eventId: session.event_id,
        action: auditAction,
        entityType: 'pickup',
        entityId: pickup.id,
        employeeOdooId: session.employee_odoo_id,
        newValue: { orderId, pickupType, wristbandQty, parkingQty },
        ...reqInfo,
      });

      return NextResponse.json({
        success: true,
        pickupId: pickup.id,
        message: `${pickupType.replace('_', ' ')} pickup confirmed`,
      });
    }

    // ── Manual Lookup ────────────────────────────────────────────────────────
    if (action === 'lookup') {
      const { search } = body;
      if (!search) return NextResponse.json({ error: 'search required' }, { status: 400 });

      const orders = await db.getOrders(session.event_id, { search, limit: 10 });
      const results = await Promise.all(orders.map(async (order) => {
        const pickups = await db.getPickupsForOrder(order.id);
        return {
          id: order.id,
          orderNumber: order.order_number,
          purchaserName: order.purchaser_name,
          purchaserPhone: order.purchaser_phone,
          customerType: order.customer_type,
          orderType: order.order_type,
          paymentStatus: order.payment_status,
          pickups: pickups.map(p => ({
            type: p.pickup_type,
            qty: p.wristband_qty + p.parking_qty,
            at: p.picked_up_at,
          })),
        };
      }));

      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[navratri/pickup] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
