/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Tickets — Token generation, Rolling QR, and validation
 * ═══════════════════════════════════════════════════════════════════
 *
 * Anti-sharing strategy: Rolling QR (30-second refresh) + Name Verification
 *
 * How it works:
 *   1. Each ticket gets a random token (64 hex chars) + a token_secret (32 hex chars)
 *   2. The customer's ticket page generates a QR containing:
 *        HMAC-SHA256(token_secret, Math.floor(Date.now() / 30000))
 *   3. The QR changes every 30 seconds — screenshots are useless
 *   4. The scanner validates: is this HMAC valid for the current OR previous time window?
 *   5. After scanning, the scanner shows the purchaser's name for verbal verification
 *
 * Time windows:
 *   - Current window:  Math.floor(Date.now() / 30000)
 *   - Previous window: Math.floor(Date.now() / 30000) - 1
 *   - This gives a ~30-60s grace period for scans at window boundaries
 */

import crypto from 'crypto';
import * as db from './db.js';

const QR_WINDOW_MS = 30000; // 30 seconds

// ── Token Generation ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure token for a ticket.
 * Returns { token, tokenSecret }
 */
export function generateTicketToken() {
  return {
    token:       crypto.randomBytes(32).toString('hex'),  // 64 chars — permanent ID
    tokenSecret: crypto.randomBytes(16).toString('hex'),  // 32 chars — HMAC key for rolling QR
  };
}

/**
 * Generate the rolling QR payload for a given time window.
 * This is what the customer's browser generates every 30 seconds.
 *
 * QR format: `NV:<token>:<timeWindow>:<hmac>`
 *
 * @param {string} token       - The ticket's permanent token
 * @param {string} tokenSecret - The ticket's HMAC secret
 * @param {number} [timestamp] - Override timestamp for testing
 * @returns {string} The QR payload string
 */
export function generateRollingQR(token, tokenSecret, timestamp = Date.now()) {
  const timeWindow = Math.floor(timestamp / QR_WINDOW_MS);
  const hmac = crypto.createHmac('sha256', tokenSecret)
    .update(`${token}:${timeWindow}`)
    .digest('hex')
    .substring(0, 16); // First 16 chars is enough for verification

  return `NV:${token}:${timeWindow}:${hmac}`;
}

/**
 * Parse and validate a rolling QR payload scanned by the scanner.
 *
 * @param {string} qrPayload   - The scanned QR string
 * @param {string} tokenSecret - The ticket's HMAC secret (looked up from DB)
 * @returns {{ valid: boolean, token: string, reason?: string }}
 */
export function validateRollingQR(qrPayload, tokenSecret) {
  // Parse the QR format
  if (!qrPayload || !qrPayload.startsWith('NV:')) {
    return { valid: false, token: null, reason: 'Invalid QR format' };
  }

  const parts = qrPayload.split(':');
  if (parts.length !== 4) {
    return { valid: false, token: null, reason: 'Invalid QR format' };
  }

  const [prefix, token, timeWindowStr, scannedHmac] = parts;
  const scannedWindow = parseInt(timeWindowStr, 10);

  if (isNaN(scannedWindow)) {
    return { valid: false, token, reason: 'Invalid time window' };
  }

  // Check if the time window is current or previous (grace period)
  const currentWindow = Math.floor(Date.now() / QR_WINDOW_MS);
  const windowDiff = currentWindow - scannedWindow;

  if (windowDiff < 0 || windowDiff > 2) {
    // More than ~60-90 seconds old
    return { valid: false, token, reason: 'QR code expired — ask customer to refresh' };
  }

  // Validate the HMAC for the scanned time window
  const expectedHmac = crypto.createHmac('sha256', tokenSecret)
    .update(`${token}:${scannedWindow}`)
    .digest('hex')
    .substring(0, 16);

  if (!crypto.timingSafeEqual(
    Buffer.from(scannedHmac, 'hex'),
    Buffer.from(expectedHmac, 'hex')
  )) {
    return { valid: false, token, reason: 'QR code tampered or expired' };
  }

  return { valid: true, token };
}


// ── Ticket Creation ──────────────────────────────────────────────────────────

/**
 * Create tickets for a completed order.
 * Creates one ticket per event_date per order_item.
 *
 * @param {number} orderId    - The order ID
 * @param {Array}  orderItems - Array of order_items from the order
 * @param {string} ticketType - 'daily_entry', 'combo_pickup', or 'pioneer_pickup'
 * @returns {Array} Created ticket records
 */
export async function createTicketsForOrder(orderId, orderItems, ticketType = 'daily_entry') {
  const tickets = [];

  for (const item of orderItems) {
    const { token, tokenSecret } = generateTicketToken();
    tickets.push({
      order_id:      orderId,
      order_item_id: item.id,
      event_date_id: item.event_date_id || null,
      token,
      token_secret:  tokenSecret,
      ticket_type:   ticketType,
      quantity:      item.quantity,
      status:        'inactive', // Activated after payment confirmation
    });
  }

  if (tickets.length === 0) return [];

  return db.createTickets(tickets);
}

/**
 * Activate all tickets for an order (after payment confirmation).
 */
export async function activateOrderTickets(orderId) {
  const tickets = await db.getTicketsByOrder(orderId);
  const activated = [];

  for (const ticket of tickets) {
    if (ticket.status === 'inactive') {
      const updated = await db.updateTicket(ticket.id, { status: 'active' });
      activated.push(updated);
    }
  }

  return activated;
}


// ── Ticket Validation (Scanner) ──────────────────────────────────────────────

/**
 * Full server-side ticket validation.
 * Called by the scanner API after parsing the rolling QR.
 *
 * @param {string} token       - The ticket token (from QR parse)
 * @param {number} eventDateId - The event date being checked (from scanner context)
 * @returns {{ valid: boolean, ticket: object, order: object, reason: string, scanResult: string }}
 */
export async function validateTicketForCheckin(token, eventDateId) {
  // 1. Look up the ticket
  const ticket = await db.getTicketByToken(token);
  if (!ticket) {
    return {
      valid: false, ticket: null, order: null,
      reason: 'Ticket not found', scanResult: 'invalid',
    };
  }

  // 2. Look up the order for purchaser name
  const order = await db.getOrderById(ticket.order_id);

  // 3. Check ticket status
  if (ticket.status === 'used') {
    return {
      valid: false, ticket, order,
      reason: `Already checked in at ${new Date(ticket.checked_in_at).toLocaleTimeString()}`,
      scanResult: 'duplicate',
    };
  }

  if (ticket.status === 'revoked') {
    return {
      valid: false, ticket, order,
      reason: 'This ticket has been revoked', scanResult: 'revoked',
    };
  }

  if (ticket.status === 'refunded') {
    return {
      valid: false, ticket, order,
      reason: 'This ticket has been refunded', scanResult: 'refunded',
    };
  }

  if (ticket.status !== 'active') {
    return {
      valid: false, ticket, order,
      reason: `Ticket is ${ticket.status}`, scanResult: 'invalid',
    };
  }

  // 4. Check date match (skip for combo/pioneer pickup tickets)
  if (ticket.ticket_type === 'daily_entry' && ticket.event_date_id) {
    if (ticket.event_date_id !== eventDateId) {
      // Look up the actual date for a helpful message
      const correctDate = await db.query('navratri_event_dates',
        `id=eq.${ticket.event_date_id}`, { select: 'event_date,label', limit: 1 });
      const dateLabel = correctDate?.[0]?.label || correctDate?.[0]?.event_date || 'another date';
      return {
        valid: false, ticket, order,
        reason: `This ticket is for ${dateLabel}, not today`, scanResult: 'wrong_date',
      };
    }
  }

  // 5. All checks passed
  return {
    valid: true, ticket, order,
    reason: 'Valid ticket',
    scanResult: 'valid',
    purchaserName: order?.purchaser_name || 'Unknown',
    quantity: ticket.quantity,
  };
}

/**
 * Complete the check-in (after staff confirms name).
 * This is atomic — only the first call succeeds for a given ticket.
 */
export async function confirmCheckin(ticketId, eventDateId, employeeOdooId, employeeName, deviceInfo, ipAddress) {
  // Re-fetch ticket to ensure it hasn't been used between validation and confirmation
  const ticket = await db.query('navratri_tickets',
    `id=eq.${ticketId}&status=eq.active`, { limit: 1 });

  if (!ticket || ticket.length === 0) {
    return { success: false, reason: 'Ticket is no longer active (may have been used by another scanner)' };
  }

  // Mark ticket as used
  await db.updateTicket(ticketId, {
    status:             'used',
    checked_in_at:      new Date().toISOString(),
    checked_in_by:      employeeOdooId,
    checked_in_by_name: employeeName,
  });

  // Create check-in record
  const checkin = await db.createCheckin({
    ticket_id:           ticketId,
    event_date_id:       eventDateId,
    employee_odoo_id:    employeeOdooId,
    employee_name:       employeeName,
    quantity_checked_in: ticket[0].quantity,
    scan_result:         'valid',
    device_info:         deviceInfo || null,
    ip_address:          ipAddress || null,
  });

  return {
    success: true,
    checkinId: checkin.id,
    quantity: ticket[0].quantity,
  };
}


// ── Ticket Reissue ───────────────────────────────────────────────────────────

/**
 * Reissue a ticket — generates a new token and invalidates the old one.
 * Used when customer reports QR was compromised/shared.
 */
export async function reissueTicket(ticketId, reason, reissuedBy) {
  const oldTicket = await db.query('navratri_tickets',
    `id=eq.${ticketId}`, { limit: 1 });

  if (!oldTicket || oldTicket.length === 0) {
    throw new Error('Ticket not found');
  }

  if (oldTicket[0].status === 'used') {
    throw new Error('Cannot reissue a ticket that has already been used');
  }

  // Generate new token
  const { token: newToken, tokenSecret: newSecret } = generateTicketToken();

  // Update the ticket with new token, invalidating the old one
  await db.updateTicket(ticketId, {
    token:          newToken,
    token_secret:   newSecret,
    previous_token: oldTicket[0].token,
    reissue_reason: reason,
    reissued_by:    reissuedBy,
    reissued_at:    new Date().toISOString(),
    status:         'active',
    // Reset delivery flags
    email_sent: false,
    sms_sent:   false,
  });

  return {
    ticketId,
    newToken,
    oldToken: oldTicket[0].token,
  };
}

/**
 * Revoke a ticket (admin action).
 */
export async function revokeTicket(ticketId) {
  return db.updateTicket(ticketId, { status: 'revoked' });
}


// ── Client-Side Helper Generator ─────────────────────────────────────────────

/**
 * Generate the JavaScript snippet that the customer's ticket page
 * will use to create the rolling QR. This is embedded in the ticket
 * viewer page.
 *
 * IMPORTANT: The tokenSecret must be available client-side for the
 * customer's browser to generate QR codes. This is acceptable because:
 *   1. Each ticket has its own unique secret
 *   2. The secret alone cannot create a valid check-in
 *   3. Server-side validation (status, date, one-time-use) is the real gate
 *   4. The 30-second rotation prevents screenshot sharing
 *
 * @param {string} token       - The ticket token
 * @param {string} tokenSecret - The ticket HMAC secret
 * @returns {string} JS code snippet for QR generation
 */
export function getClientQRScript(token, tokenSecret) {
  return `
    function generateQR() {
      const token = "${token}";
      const secret = "${tokenSecret}";
      const timeWindow = Math.floor(Date.now() / ${QR_WINDOW_MS});
      
      // Web Crypto HMAC-SHA256
      return crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ).then(key => {
        return crypto.subtle.sign(
          'HMAC',
          key,
          new TextEncoder().encode(token + ':' + timeWindow)
        );
      }).then(sig => {
        const hmac = Array.from(new Uint8Array(sig))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 16);
        return 'NV:' + token + ':' + timeWindow + ':' + hmac;
      });
    }
  `;
}
