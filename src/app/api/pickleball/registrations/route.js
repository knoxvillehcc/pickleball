import { NextResponse } from 'next/server';
import { queryRegistrations, getAllRegistrations } from '@/lib/supabaseClient';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const paymentStatus = searchParams.get('payment_status');
  const skillLevel    = searchParams.get('skill_level');
  const search        = searchParams.get('search');
  const limit         = parseInt(searchParams.get('limit') || '200');

  try {
    // Filtered records for the table view
    const records = await queryRegistrations({ paymentStatus, skillLevel, search, limit });

    // All records for stats (unfiltered)
    const allRecords = await getAllRegistrations(1000);

    const stats = {
      total:        allRecords.length,
      paid:         allRecords.filter(r => r.payment_status === 'paid').length,
      pending:      allRecords.filter(r => r.payment_status === 'pending').length,
      failed:       allRecords.filter(r => r.payment_status === 'failed').length,
      beginner:     allRecords.filter(r => r.skill_level === 'beginner').length,
      intermediate: allRecords.filter(r => r.skill_level === 'intermediate').length,
      advanced:     allRecords.filter(r => r.skill_level === 'advanced').length,
      totalRevenue: allRecords
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (r.amount_paid || 0), 0),
    };

    return NextResponse.json({ success: true, records, stats });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
