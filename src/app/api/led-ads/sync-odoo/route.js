import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { postEventGeneralEntry, checkOdooGeneralEntry } from '@/lib/odooGeneralEntry';

export const dynamic = 'force-dynamic';

const SOURCE_REF = 'NAVRATRI-2026-LED-ADS-FINAL';
const SETTING_KEY = 'odoo_general_entry_led_ads';

const URL_ = () => process.env.SUPABASE_URL;
const KEY_ = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const hdrs = () => ({
  'apikey': KEY_(),
  'Authorization': `Bearer ${KEY_()}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

async function getLedSetting(key) {
  try {
    const res = await fetch(
      `${URL_()}/rest/v1/indiafest_settings?key=eq.${encodeURIComponent(key)}&select=key,value&limit=1`,
      { headers: hdrs(), cache: 'no-store' }
    );
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0) {
        return JSON.parse(rows[0].value);
      }
    }
  } catch (err) {
    console.warn('[LED-Ads getLedSetting] Warning:', err.message);
  }
  return null;
}

async function saveLedSetting(key, data) {
  const value = JSON.stringify(data);
  try {
    await fetch(`${URL_()}/rest/v1/indiafest_settings?key=eq.${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: hdrs(),
    });
    await fetch(`${URL_()}/rest/v1/indiafest_settings`, {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ key, value }),
    });
  } catch (err) {
    console.warn('[LED-Ads saveLedSetting] Warning:', err.message);
  }
}

// ── GET: Check current Odoo General Entry sync status for LED Ads ─────────────
export async function GET() {
  const auth = await getSessionAndPermissions('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const savedSync = await getLedSetting(SETTING_KEY);
    const odooCheck = await checkOdooGeneralEntry(SOURCE_REF);

    const isSynced = !!(savedSync || odooCheck.exists);
    const syncInfo = savedSync || (odooCheck.exists ? {
      moveId: odooCheck.entry.id,
      moveName: odooCheck.entry.name,
      date: odooCheck.entry.date,
      ref: odooCheck.entry.ref,
      totalGross: odooCheck.entry.amount_total,
      syncedAt: odooCheck.entry.date,
      analyticAccount: { name: 'Navratri 2026' },
    } : null);

    return NextResponse.json({
      success: true,
      isSynced,
      syncInfo,
    });
  } catch (err) {
    console.error('[LED Ads Sync GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── POST: Post End-of-Event General Entry to Odoo for LED Ads ────────────────
export async function POST(request) {
  const auth = await getSessionAndPermissions('led_ads');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const forceReSync = body.force === true;

    // 1. Fetch all paid LED ad registrations
    const res = await fetch(
      `${URL_()}/rest/v1/led_ad_registrations?select=*&payment_status=eq.paid&limit=500`,
      { headers: hdrs(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Failed to fetch LED registrations (${res.status})`);
    const paidRegistrations = await res.json();

    if (!paidRegistrations || paidRegistrations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No paid LED screen registrations found to post to Odoo.',
      }, { status: 400 });
    }

    // 2. Calculate totals (amount_paid is stored in cents)
    const totalGross = paidRegistrations.reduce((sum, r) => sum + ((r.amount_paid || 0) / 100), 0);
    if (totalGross <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Total paid amount is $0.00.',
      }, { status: 400 });
    }

    // Stripe fee estimation (2.9% + $0.30 per transaction)
    const totalFees = paidRegistrations.reduce((sum, r) => {
      const gross = (r.amount_paid || 0) / 100;
      return sum + (gross * 0.029 + 0.30);
    }, 0);

    // 3. Post General Entry to Odoo
    const result = await postEventGeneralEntry({
      eventName: 'Navratri 2026',
      sourceRef: SOURCE_REF,
      revenueAccountCode: 2005, // Event Sponsorship / Ads Income
      lineDescription: 'Navratri 2026 LED Screen Ads Final Revenue',
      totalGross,
      totalFees,
      registrationsCount: paidRegistrations.length,
      forceReSync,
    });

    if (result.alreadyExists) {
      return NextResponse.json({
        success: false,
        alreadySynced: true,
        message: result.message,
        syncInfo: result.entry,
      }, { status: 409 });
    }

    // 4. Save audit / sync info in settings
    const syncData = {
      ...result,
      syncedAt: new Date().toISOString(),
      syncedBy: auth.user?.email || 'admin',
    };

    await saveLedSetting(SETTING_KEY, syncData);

    return NextResponse.json({
      success: true,
      syncInfo: syncData,
      message: `General Entry ${result.moveName} successfully posted to Odoo under MISC journal with Navratri 2026 analytic account.`,
    });

  } catch (err) {
    console.error('[LED Ads Sync POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
