import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getAllVendorRegistrations, getVendorSettings, setVendorSetting } from '@/lib/navratriVendorDb';
import { postEventGeneralEntry, checkOdooGeneralEntry } from '@/lib/odooGeneralEntry';

export const dynamic = 'force-dynamic';

const SOURCE_REF = 'NAVRATRI-2026-VENDORS-FINAL';
const SETTING_KEY = 'odoo_general_entry_vendors';

// ── GET: Check current Odoo General Entry sync status ─────────────────────────
export async function GET() {
  const auth = await getSessionAndPermissions('navratri');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await getVendorSettings();
    let savedSync = null;
    if (settings && settings[SETTING_KEY]) {
      try {
        savedSync = JSON.parse(settings[SETTING_KEY]);
      } catch {
        savedSync = null;
      }
    }

    // Verify against Odoo live database
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
    console.error('[Navratri Vendors Sync GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── POST: Post End-of-Event General Entry to Odoo ─────────────────────────────
export async function POST(request) {
  const auth = await getSessionAndPermissions('navratri');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const forceReSync = body.force === true;

    // 1. Fetch all vendor registrations
    const allRegistrations = await getAllVendorRegistrations();
    const paidRegistrations = allRegistrations.filter(r => r.payment_status === 'paid');

    if (paidRegistrations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No paid vendor registrations found to post to Odoo.',
      }, { status: 400 });
    }

    // 2. Calculate totals
    const totalGross = paidRegistrations.reduce((sum, r) => sum + ((r.amount_paid || 0) / 100), 0);
    if (totalGross <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Total paid amount is $0.00.',
      }, { status: 400 });
    }

    // Stripe fee estimation (2.9% + $0.30 per paid transaction)
    const totalFees = paidRegistrations.reduce((sum, r) => {
      const gross = (r.amount_paid || 0) / 100;
      return sum + (gross * 0.029 + 0.30);
    }, 0);

    // 3. Post General Entry to Odoo
    const result = await postEventGeneralEntry({
      eventName: 'Navratri 2026',
      sourceRef: SOURCE_REF,
      revenueAccountCode: 2007, // Event Vendor / Booth Income
      lineDescription: 'Navratri 2026 Vendor Booths Final Revenue',
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

    await setVendorSetting(SETTING_KEY, JSON.stringify(syncData), 'Odoo General Entry posting details for Navratri 2026 Vendors');

    return NextResponse.json({
      success: true,
      syncInfo: syncData,
      message: `General Entry ${result.moveName} successfully posted to Odoo under MISC journal with Navratri 2026 analytic account.`,
    });

  } catch (err) {
    console.error('[Navratri Vendors Sync POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
