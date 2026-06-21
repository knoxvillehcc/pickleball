/**
 * supabaseClient.js
 * Lightweight Supabase REST client — no npm package required.
 * Uses the PostgREST API built into every Supabase project.
 */

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function getHeaders() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase credentials. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env.local file.'
    );
  }
  return {
    'Content-Type':  'application/json',
    'apikey':         SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer':         'return=representation',
  };
}

/**
 * Query registrations with optional filters.
 * @param {object} opts
 * @param {string} [opts.paymentStatus]  - 'paid' | 'pending' | 'failed' | 'refunded'
 * @param {string} [opts.skillLevel]     - 'beginner' | 'intermediate' | 'advanced'
 * @param {string} [opts.search]         - free-text search across name/email/phone/reg#
 * @param {number} [opts.limit]          - max records (default 200)
 * @returns {Promise<Array>}
 */
export async function queryRegistrations({ paymentStatus, skillLevel, search, limit = 200 } = {}) {
  const params = new URLSearchParams();

  // Fields to select
  params.set('select', [
    'id', 'registration_number', 'full_name', 'first_name', 'last_name',
    'email', 'phone', 'skill_level', 'registration_date',
    'payment_status', 'amount_paid', 'stripe_payment_ref',
    'event_name', 'event_date', 'partner_name', 'gender',
    'city', 'state', 'liability_accepted',
  ].join(','));

  // Exact-match filters
  if (paymentStatus) params.append('payment_status', `eq.${paymentStatus}`);
  if (skillLevel)    params.append('skill_level',    `eq.${skillLevel}`);

  // Full-text search via PostgREST OR filter
  if (search) {
    const s = encodeURIComponent(`%${search}%`);
    params.append('or', `(full_name.ilike.${s},email.ilike.${s},phone.ilike.${s},registration_number.ilike.${s})`);
  }

  // Ordering and limit
  params.append('order',             'registration_date.desc');
  params.append('limit',             String(limit));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?${params}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase query failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Fetch ALL registrations (for stats + exports).
 * @param {number} [limit] - safety cap (default 5000)
 * @returns {Promise<Array>}
 */
export async function getAllRegistrations(limit = 5000) {
  const params = new URLSearchParams({
    select: [
      'id', 'registration_number', 'full_name', 'email', 'phone',
      'skill_level', 'registration_date', 'payment_status',
      'amount_paid', 'stripe_payment_ref', 'event_name', 'event_date',
      'gender', 'city', 'state', 'partner_name',
    ].join(','),
    order: 'registration_date.desc',
    limit: String(limit),
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?${params}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase query failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Insert a new registration record.
 * @param {object} data - registration fields
 * @returns {Promise<object>} - inserted record
 */
export async function insertRegistration(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify(data),
    cache:   'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase insert failed (${res.status}): ${body}`);
  }

  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Update a registration record by ID.
 * @param {number} id
 * @param {object} data - fields to update
 * @returns {Promise<object>}
 */
export async function updateRegistration(id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${id}`, {
    method:  'PATCH',
    headers: getHeaders(),
    body:    JSON.stringify(data),
    cache:   'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase update failed (${res.status}): ${body}`);
  }

  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}
