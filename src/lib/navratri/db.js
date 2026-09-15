/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri DB — Supabase CRUD helpers for all navratri_* tables
 * ═══════════════════════════════════════════════════════════════════
 *
 * Follows the existing HCC PostgREST pattern (raw fetch, no SDK).
 * Uses SUPABASE_SERVICE_KEY for server-side operations.
 */

// ── Headers ──────────────────────────────────────────────────────────────────
function getHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  return {
    'apikey':         key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/json',
    'Prefer':         'return=representation',
  };
}

const baseUrl = () => `${process.env.SUPABASE_URL}/rest/v1`;

// ── Generic helpers ──────────────────────────────────────────────────────────

/**
 * Generic SELECT query against any navratri table.
 * @param {string} table   - Table name (e.g. 'navratri_orders')
 * @param {string} filter  - PostgREST query string (e.g. 'event_id=eq.1&status=eq.active')
 * @param {object} opts    - { select, order, limit, single }
 */
export async function query(table, filter = '', opts = {}) {
  const { select = '*', order, limit, single } = opts;
  let url = `${baseUrl()}/${table}?select=${encodeURIComponent(select)}`;
  if (filter) url += `&${filter}`;
  if (order)  url += `&order=${order}`;
  if (limit)  url += `&limit=${limit}`;

  const headers = getHeaders();
  if (single) headers['Accept'] = 'application/vnd.pgrst.object+json';

  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] SELECT ${table} failed: ${text}`);
  }
  return res.json();
}

/**
 * Generic INSERT into any navratri table. Returns the inserted row(s).
 */
export async function insert(table, data) {
  const url = `${baseUrl()}/${table}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] INSERT ${table} failed: ${text}`);
  }
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Generic UPDATE on a navratri table by filter. Returns updated row(s).
 */
export async function update(table, filter, data) {
  const url = `${baseUrl()}/${table}?${filter}`;
  const res = await fetch(url, {
    method:  'PATCH',
    headers: getHeaders(),
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] UPDATE ${table} failed: ${text}`);
  }
  const result = await res.json();
  return Array.isArray(result) ? result : [result];
}

/**
 * Generic DELETE on a navratri table by filter.
 */
export async function remove(table, filter) {
  const url = `${baseUrl()}/${table}?${filter}`;
  const res = await fetch(url, {
    method:  'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] DELETE ${table} failed: ${text}`);
  }
  return true;
}

/**
 * Call a Supabase RPC function.
 */
export async function rpc(fnName, params = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] RPC ${fnName} failed: ${text}`);
  }
  return res.json();
}


// ── Domain-specific helpers ──────────────────────────────────────────────────

// ── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(filter = '') {
  return query('navratri_events', filter, { order: 'created_at.desc' });
}

export async function getEventBySlug(slug) {
  const rows = await query('navratri_events', `slug=eq.${encodeURIComponent(slug)}`, { limit: 1 });
  return rows?.[0] || null;
}

export async function getEventById(id) {
  const rows = await query('navratri_events', `id=eq.${id}`, { limit: 1 });
  return rows?.[0] || null;
}

export async function createEvent(data) {
  return insert('navratri_events', data);
}

export async function updateEvent(id, data) {
  return update('navratri_events', `id=eq.${id}`, data);
}

// ── Event Dates ──────────────────────────────────────────────────────────────

export async function getEventDates(eventId) {
  return query('navratri_event_dates', `event_id=eq.${eventId}`, { order: 'display_order.asc' });
}

export async function createEventDate(data) {
  return insert('navratri_event_dates', data);
}

export async function updateEventDate(id, data) {
  return update('navratri_event_dates', `id=eq.${id}`, data);
}

export async function deleteEventDate(id) {
  return remove('navratri_event_dates', `id=eq.${id}`);
}

export async function getEventDateById(id) {
  const rows = await query('navratri_event_dates', `id=eq.${id}`, { limit: 1 });
  return rows?.[0] || null;
}

// ── Members Cache ────────────────────────────────────────────────────────────

export async function getMembersByEvent(eventId) {
  return query('navratri_members_cache', `event_id=eq.${eventId}`, { order: 'name.asc' });
}

export async function searchMembers(eventId, searchTerm) {
  const encoded = encodeURIComponent(searchTerm);
  const filter = `event_id=eq.${eventId}&or=(name.ilike.*${encoded}*,phone.ilike.*${encoded}*,email.ilike.*${encoded}*)`;
  return query('navratri_members_cache', filter, { limit: 20 });
}

export async function getMemberByPhone(eventId, phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const rows = await query('navratri_members_cache', 
    `event_id=eq.${eventId}&phone=ilike.*${cleanPhone}*`, 
    { limit: 5 });
  return rows;
}

export async function getMemberByOdooId(eventId, odooPartnerId) {
  const rows = await query('navratri_members_cache',
    `event_id=eq.${eventId}&odoo_partner_id=eq.${odooPartnerId}`,
    { limit: 1 });
  return rows?.[0] || null;
}

export async function upsertMember(data) {
  // Use PostgREST upsert via Prefer header + on_conflict for unique constraint
  const url = `${baseUrl()}/navratri_members_cache?on_conflict=event_id,odoo_partner_id`;
  const headers = {
    ...getHeaders(),
    'Prefer': 'return=representation,resolution=merge-duplicates',
  };
  const res = await fetch(url, {
    method:  'POST',
    headers,
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] UPSERT member failed: ${text}`);
  }
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

// ── Committee Members ────────────────────────────────────────────────────────

export async function getCommitteeMembers(eventId) {
  return query('navratri_committee_members', 
    `event_id=eq.${eventId}&removed_at=is.null`);
}

export async function addCommitteeMember(eventId, odooPartnerId, addedBy) {
  return insert('navratri_committee_members', {
    event_id: eventId,
    odoo_partner_id: odooPartnerId,
    added_by: addedBy,
  });
}

export async function removeCommitteeMember(eventId, odooPartnerId, removedBy) {
  return update('navratri_committee_members',
    `event_id=eq.${eventId}&odoo_partner_id=eq.${odooPartnerId}`,
    { removed_at: new Date().toISOString(), removed_by: removedBy });
}

// ── Entitlements ─────────────────────────────────────────────────────────────

export async function getEntitlement(eventId, odooPartnerId) {
  const rows = await query('navratri_entitlements',
    `event_id=eq.${eventId}&odoo_partner_id=eq.${odooPartnerId}`,
    { limit: 1 });
  return rows?.[0] || null;
}

export async function upsertEntitlement(data) {
  const url = `${baseUrl()}/navratri_entitlements`;
  const headers = {
    ...getHeaders(),
    'Prefer': 'return=representation,resolution=merge-duplicates',
  };
  const res = await fetch(url, {
    method:  'POST',
    headers,
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] UPSERT entitlement failed: ${text}`);
  }
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

export async function updateEntitlement(id, data) {
  return update('navratri_entitlements', `id=eq.${id}`, data);
}

// ── Entitlement Holds ────────────────────────────────────────────────────────

export async function createHold(data) {
  return insert('navratri_entitlement_holds', data);
}

export async function commitHold(holdId) {
  return update('navratri_entitlement_holds', `id=eq.${holdId}`, { status: 'committed' });
}

export async function releaseHold(holdId) {
  return update('navratri_entitlement_holds', `id=eq.${holdId}`, { status: 'released' });
}

export async function getActiveHolds(eventId, odooPartnerId) {
  return query('navratri_entitlement_holds',
    `event_id=eq.${eventId}&odoo_partner_id=eq.${odooPartnerId}&status=eq.active`);
}

export async function cleanupExpiredHolds() {
  return rpc('cleanup_expired_navratri_holds');
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function getNextOrderNumber(year = 2026) {
  return rpc('get_next_navratri_order_number', { event_year: year });
}

export async function createOrder(data) {
  return insert('navratri_orders', data);
}

export async function getOrderById(id) {
  const rows = await query('navratri_orders', `id=eq.${id}`, { limit: 1 });
  return rows?.[0] || null;
}

export async function getOrderByNumber(orderNumber) {
  const rows = await query('navratri_orders', 
    `order_number=eq.${encodeURIComponent(orderNumber)}`, { limit: 1 });
  return rows?.[0] || null;
}

export async function getOrderByStripeSession(sessionId) {
  const rows = await query('navratri_orders',
    `stripe_session_id=eq.${encodeURIComponent(sessionId)}`, { limit: 1 });
  return rows?.[0] || null;
}

export async function updateOrder(id, data) {
  return update('navratri_orders', `id=eq.${id}`, data);
}

export async function getOrders(eventId, filters = {}) {
  let filter = `event_id=eq.${eventId}`;
  if (filters.status)  filter += `&payment_status=eq.${filters.status}`;
  if (filters.type)    filter += `&order_type=eq.${filters.type}`;
  if (filters.search) {
    const s = encodeURIComponent(filters.search);
    filter += `&or=(purchaser_name.ilike.*${s}*,purchaser_phone.ilike.*${s}*,purchaser_email.ilike.*${s}*,order_number.ilike.*${s}*)`;
  }
  const order = filters.order || 'created_at.desc';
  const limit = filters.limit || 50;
  return query('navratri_orders', filter, { order, limit });
}

// ── Order Items ──────────────────────────────────────────────────────────────

export async function createOrderItems(items) {
  // Bulk insert
  const url = `${baseUrl()}/navratri_order_items`;
  const res = await fetch(url, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify(items),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] INSERT order_items failed: ${text}`);
  }
  return res.json();
}

export async function getOrderItems(orderId) {
  return query('navratri_order_items', `order_id=eq.${orderId}`, { order: 'id.asc' });
}

export async function updateOrderItem(id, data) {
  return update('navratri_order_items', `id=eq.${id}`, data);
}

// ── Tickets ──────────────────────────────────────────────────────────────────

export async function createTickets(tickets) {
  const url = `${baseUrl()}/navratri_tickets`;
  const res = await fetch(url, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify(tickets),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] INSERT tickets failed: ${text}`);
  }
  return res.json();
}

export async function getTicketByToken(token) {
  const rows = await query('navratri_tickets',
    `token=eq.${encodeURIComponent(token)}`, { limit: 1 });
  return rows?.[0] || null;
}

export async function getTicketsByOrder(orderId) {
  return query('navratri_tickets', `order_id=eq.${orderId}`, { order: 'event_date_id.asc' });
}

export async function updateTicket(id, data) {
  return update('navratri_tickets', `id=eq.${id}`, data);
}

// ── Check-Ins ────────────────────────────────────────────────────────────────

export async function createCheckin(data) {
  return insert('navratri_checkins', data);
}

export async function getCheckinsForDate(eventDateId) {
  return query('navratri_checkins', `event_date_id=eq.${eventDateId}`, 
    { order: 'checked_in_at.desc' });
}

export async function getCheckinCountForDate(eventDateId) {
  const rows = await query('navratri_checkins',
    `event_date_id=eq.${eventDateId}&scan_result=eq.valid`,
    { select: 'quantity_checked_in' });
  return rows.reduce((sum, r) => sum + (r.quantity_checked_in || 0), 0);
}

// ── Pickups ──────────────────────────────────────────────────────────────────

export async function createPickup(data) {
  return insert('navratri_pickups', data);
}

export async function getPickupsForOrder(orderId) {
  return query('navratri_pickups', `order_id=eq.${orderId}`);
}

export async function getPickupsForMember(eventId, odooPartnerId) {
  return query('navratri_pickups',
    `event_id=eq.${eventId}&odoo_partner_id=eq.${odooPartnerId}`);
}

// ── Refunds ──────────────────────────────────────────────────────────────────

export async function createRefund(data) {
  return insert('navratri_refunds', data);
}

export async function getRefundsForOrder(orderId) {
  return query('navratri_refunds', `order_id=eq.${orderId}`, { order: 'refunded_at.desc' });
}

// ── Daily Close ──────────────────────────────────────────────────────────────

export async function getDailyClose(eventId, date) {
  const rows = await query('navratri_daily_close',
    `event_id=eq.${eventId}&close_date=eq.${date}`, { limit: 1 });
  return rows?.[0] || null;
}

export async function upsertDailyClose(data) {
  const url = `${baseUrl()}/navratri_daily_close`;
  const headers = {
    ...getHeaders(),
    'Prefer': 'return=representation,resolution=merge-duplicates',
  };
  const res = await fetch(url, {
    method:  'POST',
    headers,
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] UPSERT daily_close failed: ${text}`);
  }
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

export async function updateDailyClose(id, data) {
  return update('navratri_daily_close', `id=eq.${id}`, data);
}

// ── Scanner Sessions ─────────────────────────────────────────────────────────

export async function createScannerSession(data) {
  return insert('navratri_scanner_sessions', data);
}

export async function getScannerSession(token) {
  const rows = await query('navratri_scanner_sessions',
    `token=eq.${encodeURIComponent(token)}&expires_at=gt.${new Date().toISOString()}`,
    { limit: 1 });
  return rows?.[0] || null;
}

export async function updateScannerSessionActivity(token) {
  return update('navratri_scanner_sessions',
    `token=eq.${encodeURIComponent(token)}`,
    { last_activity: new Date().toISOString() });
}

// ── OTP Sessions ─────────────────────────────────────────────────────────────

export async function createOtpSession(data) {
  return insert('navratri_otp_sessions', data);
}

export async function getOtpSession(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const rows = await query('navratri_otp_sessions',
    `phone=eq.${encodeURIComponent(cleanPhone)}&verified=eq.false&expires_at=gt.${new Date().toISOString()}`,
    { order: 'created_at.desc', limit: 1 });
  return rows?.[0] || null;
}

export async function updateOtpSession(id, data) {
  return update('navratri_otp_sessions', `id=eq.${id}`, data);
}

// ── Communications ───────────────────────────────────────────────────────────

export async function createCommunication(data) {
  return insert('navratri_communications', data);
}

export async function getCommunications(eventId) {
  return query('navratri_communications', `event_id=eq.${eventId}`, 
    { order: 'sent_at.desc', limit: 50 });
}

// ── Wristband Inventory ──────────────────────────────────────────────────────

export async function getWristbandInventory(eventId) {
  const rows = await query('navratri_wristband_inventory',
    `event_id=eq.${eventId}`, { limit: 1 });
  return rows?.[0] || null;
}

export async function upsertWristbandInventory(data) {
  const url = `${baseUrl()}/navratri_wristband_inventory`;
  const headers = {
    ...getHeaders(),
    'Prefer': 'return=representation,resolution=merge-duplicates',
  };
  const res = await fetch(url, {
    method:  'POST',
    headers,
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[navratri/db] UPSERT wristband_inventory failed: ${text}`);
  }
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

// ── Settings History ─────────────────────────────────────────────────────────

export async function logSettingChange(eventId, key, oldValue, newValue, changedBy) {
  return insert('navratri_settings_history', {
    event_id:    eventId,
    setting_key: key,
    old_value:   typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue),
    new_value:   typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
    changed_by:  changedBy,
  });
}
