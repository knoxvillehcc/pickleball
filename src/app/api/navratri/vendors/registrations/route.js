import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import {
  getAllVendorRegistrations,
  updateVendorRegistration,
  updateVendorDate,
  deleteVendorRegistration,
  getBookedBoothsByDate,
  getVendorSettings,
} from '@/lib/navratriVendorDb';

export const dynamic = 'force-dynamic';

// ── GET: List all Navratri vendor registrations with dates ─────────────────────
export async function GET(request) {
  const auth = await getSessionAndPermissions('navratri');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const registrations = await getAllVendorRegistrations();
    let bookedCounts = {};
    let settings = {};
    try {
      [bookedCounts, settings] = await Promise.all([
        getBookedBoothsByDate(),
        getVendorSettings(),
      ]);
    } catch (e) {
      console.warn('[Vendor Registrations GET] Auxiliary load error:', e.message);
    }

    return NextResponse.json({
      success: true,
      registrations,
      bookedCounts,
      settings,
    });
  } catch (err) {
    console.error('[Vendor Registrations GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── PUT: Update vendor registration details or spot numbers ───────────────────
export async function PUT(request) {
  const auth = await getSessionAndPermissions('navratri');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, dates, ...masterFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Registration ID is required' }, { status: 400 });
    }

    // 1. Update master registration fields if provided
    let updatedMaster = null;
    const allowedMasterKeys = [
      'business_name', 'contact_name', 'email', 'phone',
      'address', 'city', 'state', 'zip', 'category', 'category_details',
      'electrical_needed', 'special_requests', 'notes', 'payment_status',
    ];

    const fieldsToUpdate = {};
    for (const key of allowedMasterKeys) {
      if (masterFields[key] !== undefined) {
        fieldsToUpdate[key] = masterFields[key];
      }
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      fieldsToUpdate.updated_at = new Date().toISOString();
      updatedMaster = await updateVendorRegistration(id, fieldsToUpdate);
    }

    // 2. Update individual date booth spot numbers if provided
    if (Array.isArray(dates)) {
      for (const d of dates) {
        if (d.id && d.booth_spot_number !== undefined) {
          await updateVendorDate(d.id, {
            booth_spot_number: d.booth_spot_number?.trim() || '',
          });
        }
      }
    }

    return NextResponse.json({ success: true, updated: updatedMaster });

  } catch (err) {
    console.error('[Vendor Registrations PUT] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── DELETE: Delete registration by ID ─────────────────────────────────────────
export async function DELETE(request) {
  const auth = await getSessionAndPermissions('navratri');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Registration ID is required' }, { status: 400 });
    }

    await deleteVendorRegistration(id);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[Vendor Registrations DELETE] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
