/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Audit — Immutable append-only audit trail
 * ═══════════════════════════════════════════════════════════════════
 *
 * Every meaningful action is logged. Logs are never modified or deleted.
 * Used for compliance, dispute resolution, and admin visibility.
 */

import { insert } from './db.js';

/**
 * Log an audit entry.
 *
 * @param {object} entry
 * @param {number} [entry.eventId]       - Event ID
 * @param {string} entry.action          - e.g. 'ticket.checkin', 'order.create', 'refund.issue'
 * @param {string} [entry.entityType]    - e.g. 'order', 'ticket', 'member'
 * @param {number} [entry.entityId]      - Primary key of the entity
 * @param {number} [entry.userId]        - HCC user ID (from JWT)
 * @param {string} [entry.userEmail]     - HCC user email
 * @param {number} [entry.employeeOdooId] - Odoo employee ID (for scanner/pickup)
 * @param {object} [entry.oldValue]      - Previous state (for updates)
 * @param {object} [entry.newValue]      - New state (for updates)
 * @param {string} [entry.reason]        - Human-readable reason
 * @param {string} [entry.ipAddress]     - Client IP
 * @param {string} [entry.deviceInfo]    - User-Agent or device description
 */
export async function logAudit(entry) {
  try {
    await insert('navratri_audit_log', {
      event_id:         entry.eventId || null,
      action:           entry.action,
      entity_type:      entry.entityType || null,
      entity_id:        entry.entityId || null,
      user_id:          entry.userId || null,
      user_email:       entry.userEmail || null,
      employee_odoo_id: entry.employeeOdooId || null,
      old_value:        entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      new_value:        entry.newValue ? JSON.stringify(entry.newValue) : null,
      reason:           entry.reason || null,
      ip_address:       entry.ipAddress || null,
      device_info:      entry.deviceInfo || null,
    });
  } catch (err) {
    // Never let audit logging crash the main flow
    console.error('[navratri/audit] Failed to log:', err.message, entry);
  }
}

/**
 * Extract IP address and User-Agent from a Next.js request.
 */
export function getRequestInfo(request) {
  return {
    ipAddress:  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                || request.headers.get('x-real-ip')
                || 'unknown',
    deviceInfo: request.headers.get('user-agent') || 'unknown',
  };
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

export const auditActions = {
  // Events
  EVENT_CREATE:         'event.create',
  EVENT_UPDATE:         'event.update',
  EVENT_STATUS_CHANGE:  'event.status_change',
  EVENT_CLONE:          'event.clone',

  // Members
  MEMBER_SYNC:          'member.sync',
  MEMBER_LINK:          'member.link',
  MEMBER_UNLINK:        'member.unlink',
  COMMITTEE_ADD:        'committee.add',
  COMMITTEE_REMOVE:     'committee.remove',

  // Orders
  ORDER_CREATE:         'order.create',
  ORDER_PAID:           'order.paid',
  ORDER_FAILED:         'order.failed',
  ORDER_CANCELLED:      'order.cancelled',
  MANUAL_ISSUE:         'order.manual_issue',

  // Tickets
  TICKET_CREATE:        'ticket.create',
  TICKET_ACTIVATE:      'ticket.activate',
  TICKET_CHECKIN:       'ticket.checkin',
  TICKET_CHECKIN_DENIED:'ticket.checkin_denied',
  TICKET_REVOKE:        'ticket.revoke',
  TICKET_REISSUE:       'ticket.reissue',
  TICKET_DELIVER_EMAIL: 'ticket.deliver_email',
  TICKET_DELIVER_SMS:   'ticket.deliver_sms',

  // Pickups
  PICKUP_WRISTBAND:     'pickup.wristband',
  PICKUP_PARKING:       'pickup.parking',

  // Entitlements
  ENTITLEMENT_ADJUST:   'entitlement.adjust',
  ENTITLEMENT_HOLD:     'entitlement.hold',
  ENTITLEMENT_COMMIT:   'entitlement.commit',
  ENTITLEMENT_RELEASE:  'entitlement.release',

  // Refunds
  REFUND_ISSUE:         'refund.issue',
  REFUND_OVERRIDE:      'refund.override',

  // Accounting
  DAILY_CLOSE:          'accounting.daily_close',
  DAILY_REOPEN:         'accounting.daily_reopen',
  ODOO_DRAFT:           'accounting.odoo_draft',
  ODOO_POST:            'accounting.odoo_post',
  ODOO_ADJUSTMENT:      'accounting.adjustment',

  // Communications
  COMM_REMINDER:        'comm.reminder',
  COMM_ANNOUNCEMENT:    'comm.announcement',
  COMM_RESEND:          'comm.resend',

  // Settings
  SETTING_CHANGE:       'setting.change',
  PRICING_CHANGE:       'setting.pricing_change',

  // Scanner
  SCANNER_AUTH:         'scanner.auth',
  SCANNER_LOGOUT:       'scanner.logout',

  // OTP
  OTP_SEND:             'otp.send',
  OTP_VERIFY_SUCCESS:   'otp.verify_success',
  OTP_VERIFY_FAIL:      'otp.verify_fail',

  // Inventory
  WRISTBAND_ADJUST:     'inventory.wristband_adjust',
};
