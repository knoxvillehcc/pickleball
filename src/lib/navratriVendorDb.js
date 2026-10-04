/**
 * navratriVendorDb.js
 * Supabase client helpers for Navratri 2026 Vendor & Booth registrations.
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
 * Generate unique registration number
 * Prefix: NVV-YYMM-RANDOM (e.g. NVV-2610-8421)
 */
export function generateNavratriVendorRegNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NVV-${yy}${mm}-${rand}`;
}

/**
 * Insert master vendor registration
 */
export async function insertVendorRegistration(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_vendor_registrations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase vendor insert failed (${res.status}): ${body}`);
  }

  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Insert booked dates for a registration
 */
export async function insertVendorDates(dates) {
  if (!dates || dates.length === 0) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_vendor_dates`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dates),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase vendor dates insert failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Get all registrations with optional query params and their booked dates
 */
export async function getAllVendorRegistrations() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/navratri_vendor_registrations?select=*&order=registration_date.desc&limit=1000`,
    { headers: getHeaders(), cache: 'no-store' }
  );

  if (!res.ok) {
    if (res.status === 404) {
      console.warn('[Navratri Vendor DB] Table navratri_vendor_registrations not found yet. Please run sql/navratri_vendor_migration.sql in Supabase.');
      return [];
    }
    const body = await res.text();
    throw new Error(`Supabase fetch failed (${res.status}): ${body}`);
  }

  const registrations = await res.json();

  // Fetch all booked dates
  const datesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/navratri_vendor_dates?select=*&order=event_date.asc`,
    { headers: getHeaders(), cache: 'no-store' }
  );

  let dates = [];
  if (datesRes.ok) {
    dates = await datesRes.json();
  }

  // Attach booked dates to corresponding registration
  const datesByRegId = {};
  for (const d of dates) {
    if (!datesByRegId[d.registration_id]) datesByRegId[d.registration_id] = [];
    datesByRegId[d.registration_id].push(d);
  }

  return registrations.map(r => ({
    ...r,
    dates: datesByRegId[r.id] || [],
  }));
}

/**
 * Get single registration by registration_number or ID with dates
 */
export async function getVendorRegistrationByNumber(regNumber) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/navratri_vendor_registrations?registration_number=eq.${encodeURIComponent(regNumber)}&select=*&limit=1`,
    { headers: getHeaders(), cache: 'no-store' }
  );

  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows || rows.length === 0) return null;

  const reg = rows[0];

  const datesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/navratri_vendor_dates?registration_id=eq.${reg.id}&select=*&order=event_date.asc`,
    { headers: getHeaders(), cache: 'no-store' }
  );

  let dates = [];
  if (datesRes.ok) {
    dates = await datesRes.json();
  }

  return { ...reg, dates };
}

/**
 * Update registration record
 */
export async function updateVendorRegistration(id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_vendor_registrations?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase update failed (${res.status}): ${body}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Update a specific booked date (e.g. booth spot number or refund status)
 */
export async function updateVendorDate(dateId, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_vendor_dates?id=eq.${dateId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase update date failed (${res.status}): ${body}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Delete registration by ID
 */
export async function deleteVendorRegistration(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_vendor_registrations?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase delete failed (${res.status}): ${body}`);
  }

  return true;
}

/**
 * Get booked booth counts grouped by date (only counting confirmed/paid bookings)
 */
export async function getBookedBoothsByDate() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/navratri_vendor_dates?status=neq.cancelled&status=neq.refunded&select=event_date,booth_count,registration_id`,
    { headers: getHeaders(), cache: 'no-store' }
  );

  if (!res.ok) return {};
  const rows = await res.json();

  // Also verify that the parent registration is not cancelled/failed
  const regRes = await fetch(
    `${SUPABASE_URL}/rest/v1/navratri_vendor_registrations?payment_status=in.(paid,partially_refunded,pending)&select=id`,
    { headers: getHeaders(), cache: 'no-store' }
  );

  let activeRegIds = new Set();
  if (regRes.ok) {
    const activeRegs = await regRes.json();
    activeRegIds = new Set(activeRegs.map(r => r.id));
  }

  const counts = {};
  for (const row of rows) {
    if (activeRegIds.has(row.registration_id)) {
      counts[row.event_date] = (counts[row.event_date] || 0) + (row.booth_count || 1);
    }
  }

  return counts;
}

/**
 * Settings helpers
 */
export async function getVendorSettings() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_vendor_settings?select=*`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) return {};
  const rows = await res.json();
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
}

export async function setVendorSetting(key, value, description = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/navratri_vendor_settings`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      key,
      value: String(value),
      description,
      updated_at: new Date().toISOString(),
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update setting (${res.status}): ${body}`);
  }

  return res.json();
}
