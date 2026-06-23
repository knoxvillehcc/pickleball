/**
 * supabaseClient.js
 * Lightweight Supabase REST client — no npm package required.
 * Uses the PostgREST API built into every Supabase project.
 */

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

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

function getServiceHeaders() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      'Missing Supabase credentials. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to your .env.local file.'
    );
  }
  return {
    'Content-Type':  'application/json',
    'apikey':         SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
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
    'city', 'state', 'liability_accepted', 'team_name',
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
      'gender', 'city', 'state', 'partner_name', 'team_name',
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
    headers: getServiceHeaders(),
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
    headers: getServiceHeaders(),
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

/**
 * Call RPC to generate the next unique sequence-based registration number.
 * @returns {Promise<string>}
 */
export async function getNextRegistrationNumber() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_next_registration_number`, {
    method:  'POST',
    headers: getServiceHeaders(),
    cache:   'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to call get_next_registration_number RPC: ${body}`);
  }

  return res.json();
}

/**
 * Check if any player with the given emails is already registered and paid.
 * @param {string} email1
 * @param {string} [email2]
 * @returns {Promise<{ duplicate: boolean, message?: string }>}
 */
export async function checkDuplicateRegistration(email1, email2) {
  const emailsToCheck = [email1.toLowerCase().trim()];
  if (email2) {
    const clean2 = email2.toLowerCase().trim();
    if (clean2) {
      emailsToCheck.push(clean2);
    }
  }

  // Fetch all registrations where payment_status = 'paid'
  const params = new URLSearchParams({
    payment_status: 'eq.paid',
    select: 'registration_number,email,players_data'
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?${params}`, {
    headers: getServiceHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to query registrations for duplicate check: ${body}`);
  }

  const paidRegs = await res.json();

  for (const reg of paidRegs) {
    // Check main email
    const regEmail = reg.email?.toLowerCase().trim();
    if (emailsToCheck.includes(regEmail)) {
      return {
        duplicate: true,
        message: `Email ${regEmail} is already registered under paid registration #${reg.registration_number}.`
      };
    }

    // Check players_data array
    let players = [];
    if (Array.isArray(reg.players_data)) {
      players = reg.players_data;
    } else if (typeof reg.players_data === 'string') {
      try {
        players = JSON.parse(reg.players_data);
      } catch {
        players = [];
      }
    }

    for (const p of players) {
      const pEmail = p?.email?.toLowerCase().trim();
      if (pEmail && emailsToCheck.includes(pEmail)) {
        return {
          duplicate: true,
          message: `Email ${pEmail} is already registered under paid registration #${reg.registration_number}.`
        };
      }
    }
  }

  return { duplicate: false };
}

