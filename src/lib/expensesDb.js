/**
 * expensesDb.js
 * Supabase client helpers for HCC Expenses, Utility Bills, and Event Settlements.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

function getHeaders() {
  return {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

/**
 * Predefined Odoo Account Categories available for HCC
 */
export const HCC_ACCOUNT_CATEGORIES = [
  // ── Event Expenses (30001–30013) ──
  { code: '30008', name: 'Event Entertainment Expense (DJ, Sound, Performers)', group: 'events' },
  { code: '30002', name: 'Event Food & Catering Expense', group: 'events' },
  { code: '30009', name: 'Event Decorations Expense (Stage, Mandap, Lights)', group: 'events' },
  { code: '30003', name: 'Event Security / Police Expense', group: 'events' },
  { code: '30011', name: 'Event Equipment Rental Expense (Tents, Chairs, Generator)', group: 'events' },
  { code: '30006', name: 'Event Cleaning Expense (Crew, Waste, Cleanup)', group: 'events' },
  { code: '30010', name: 'Event Marketing & Printing Expense (Banners, Signs)', group: 'events' },
  { code: '30012', name: 'Event Permits & City Fees', group: 'events' },
  { code: '30007', name: 'Event Merchandise / Supplies (Dandiya, Wristbands)', group: 'events' },
  { code: '30005', name: 'Event Venue / Facility Rental Expense', group: 'events' },
  { code: '30001', name: 'Event Raffle & Prize Expense', group: 'events' },
  { code: '30004', name: 'Event Beverage Expense', group: 'events' },
  { code: '30013', name: 'Event Miscellaneous Expense', group: 'events' },

  // ── Utilities & Facility Operations ──
  { code: '4001',  name: 'Electric (KUB)', group: 'utilities' },
  { code: '4002',  name: 'Water', group: 'utilities' },
  { code: '4003',  name: 'Sewer', group: 'utilities' },
  { code: '4004',  name: 'Gas', group: 'utilities' },
  { code: '4006',  name: 'Trash Removal & Dumpster', group: 'utilities' },
  { code: '8001',  name: 'Landscaping & Grounds Keeping', group: 'utilities' },
  { code: '13000', name: 'Pest Control', group: 'utilities' },
  { code: '14000', name: 'Repair & Maintenance', group: 'utilities' },
  { code: '16000', name: 'Insurance', group: 'utilities' },
  { code: '15000', name: 'License & Taxes', group: 'utilities' },
  { code: '17000', name: 'Professional Fees & Legal', group: 'utilities' },

  // ── Temple & Kitchen Operations ──
  { code: '7001',  name: 'Temple Supplies & Pooja Items', group: 'temple' },
  { code: '304',   name: 'Temple Expenses', group: 'temple' },
  { code: '6001',  name: 'Kitchen Groceries & Ingredients', group: 'temple' },
  { code: '6002',  name: 'Kitchen Paper Products & Disposables', group: 'temple' },
  { code: '6003',  name: 'Kitchen Utensils & Cookware', group: 'temple' },
  { code: '301',   name: 'Catering Expense', group: 'temple' },
  { code: '302',   name: 'Snack Expense', group: 'temple' },
];

/**
 * Fetch expenses with optional query filters
 */
export async function getExpenses({ eventTag, group, status, limit = 500 } = {}) {
  let query = `${SUPABASE_URL}/rest/v1/hcc_expenses?select=*&order=expense_date.desc&limit=${limit}`;

  if (eventTag && eventTag !== 'all') {
    query += `&event_tag=eq.${encodeURIComponent(eventTag)}`;
  }
  if (status && status !== 'all') {
    query += `&status=eq.${encodeURIComponent(status)}`;
  }

  const res = await fetch(query, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch expenses (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Insert a new expense record
 */
export async function insertExpense(expenseData) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_expenses`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(expenseData),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to insert expense (${res.status}): ${errText}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Update an expense record.
 * If status was already 'posted_odoo', flags it as 'adjustment_pending' (Option A safe audit).
 */
export async function updateExpense(id, updates) {
  // First check existing status
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/hcc_expenses?id=eq.${id}&select=status,odoo_move_name`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  let adjustedStatus = updates.status;
  if (existingRes.ok) {
    const rows = await existingRes.json();
    if (rows && rows[0] && rows[0].status === 'posted_odoo' && !updates.status) {
      adjustedStatus = 'adjustment_pending';
    }
  }

  const payload = {
    ...updates,
    ...(adjustedStatus ? { status: adjustedStatus } : {}),
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_expenses?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update expense (${res.status}): ${errText}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Delete an expense record
 */
export async function deleteExpense(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_expenses?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete expense (${res.status}): ${errText}`);
  }

  return true;
}

/**
 * Fetch all registered events (dynamic + system)
 */
export async function getRegisteredEvents() {
  const systemEvents = [
    { event_name: 'Navratri 2026', analytic_name: 'Navratri 2026', event_type: 'festival' },
    { event_name: 'India Fest 2026', analytic_name: 'India Fest 2026', event_type: 'festival' },
    { event_name: 'Pickleball Tournament 2026', analytic_name: 'Pickleball 2026', event_type: 'sports' },
  ];

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_custom_events?select=*&is_active=eq.true&order=created_at.desc`, {
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (res.ok) {
      const customEvents = await res.json();
      const map = new Map();
      systemEvents.forEach(e => map.set(e.event_name, e));
      customEvents.forEach(e => map.set(e.event_name, e));
      return Array.from(map.values());
    }
  } catch (err) {
    console.warn('[getRegisteredEvents] Supabase notice:', err.message);
  }

  return systemEvents;
}

/**
 * Add a custom event
 */
export async function addCustomEvent({ eventName, analyticName, eventType = 'festival' }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hcc_custom_events`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      event_name: eventName,
      analytic_name: analyticName || eventName,
      event_type: eventType,
      is_active: true,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create custom event (${res.status}): ${errText}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}
