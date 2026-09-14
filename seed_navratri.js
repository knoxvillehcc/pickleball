/**
 * Seed Navratri 2026 event + 11 dates into Supabase
 * Run: node seed_navratri.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wkyzejotrcraluextvpc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreXplam90cmNyYWx1ZXh0dnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk5ODU1MywiZXhwIjoyMDk3NTc0NTUzfQ.VMMXPaH5fb4x5H5YEPsNT9_ekxA1dKLFK8nHyQDjE-A';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function seed() {
  console.log('🪔 Seeding Navratri 2026 Event...\n');

  // 1. Create Event
  const eventData = {
    slug: 'navratri-2026',
    name: 'Navratri 2026',
    status: 'published',
    membership_year: 2026,

    // Pricing (in cents)
    price_general_daily: 2000,         // $20
    price_pioneer_guest_daily: 2000,   // $20
    price_nonmember_daily: 3000,       // $30
    price_combo: 35000,                // $350

    // Entitlement limits
    daily_member_limit: 2,
    daily_pioneer_guest_limit: 2,
    combo_wristband_qty: 2,
    pioneer_wristband_qty: 2,
    pioneer_parking_qty: 1,
    committee_extra_parking: 1,

    // Sales controls
    daily_sales_open: true,
    combo_sales_open: true,

    // Venue
    venue_name: 'Hindu Community Center Knoxville',
    venue_address: '8580 Hickory Creek Rd, Lenoir City, TN',
    contact_email: 'knoxvillehcc@gmail.com',

    // Checkout settings
    price_lock_minutes: 15,
    stripe_session_minutes: 30,
    refund_cutoff_hours: 72,
  };

  const eventRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_events`, {
    method: 'POST', headers, body: JSON.stringify(eventData),
  });

  if (!eventRes.ok) {
    const err = await eventRes.text();
    console.error('❌ Event creation failed:', err);
    return;
  }

  const [event] = await eventRes.json();
  console.log(`✅ Event created: ${event.name} (ID: ${event.id})`);

  // 2. Create Event Dates
  const dates = [
    { date: '2026-10-11', label: 'Day 1 — Pratipada',    day: 1 },
    { date: '2026-10-12', label: 'Day 2 — Dwitiya',      day: 2 },
    { date: '2026-10-13', label: 'Day 3 — Tritiya',      day: 3 },
    { date: '2026-10-14', label: 'Day 4 — Chaturthi',    day: 4 },
    { date: '2026-10-15', label: 'Day 5 — Panchami',     day: 5 },
    { date: '2026-10-16', label: 'Day 6 — Shashthi',     day: 6 },
    { date: '2026-10-17', label: 'Day 7 — Saptami',      day: 7 },
    { date: '2026-10-18', label: 'Day 8 — Ashtami',      day: 8 },
    { date: '2026-10-19', label: 'Day 9 — Navami',       day: 9 },
    { date: '2026-10-20', label: 'Day 10 — Dashami',     day: 10 },
    { date: '2026-10-25', label: 'Special Day — Sharad Purnima', day: 11 },
  ];

  for (const d of dates) {
    const dateData = {
      event_id: event.id,
      event_date: d.date,
      label: d.label,
      day_number: d.day,
      display_order: d.day,
      is_active: true,
      daily_capacity: 500,
    };

    const dateRes = await fetch(`${SUPABASE_URL}/rest/v1/navratri_event_dates`, {
      method: 'POST', headers, body: JSON.stringify(dateData),
    });

    if (dateRes.ok) {
      console.log(`  📅 ${d.label} — ${d.date}`);
    } else {
      const err = await dateRes.text();
      console.error(`  ❌ ${d.label} failed:`, err);
    }
  }

  console.log('\n🎉 Seed complete! Event is published and ready.');
  console.log(`   Dashboard: https://monkfish-app-otsj3.ondigitalocean.app/navratri`);
  console.log(`   Public:    https://monkfish-app-otsj3.ondigitalocean.app/navratri-2026`);
}

seed().catch(console.error);
