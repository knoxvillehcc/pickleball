import { NextResponse } from 'next/server';
import { removeAartiBid } from '@/lib/aarti/aartiService';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await getSessionAndPermissions('navratri_aarti');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { bid_id, day_number, reason } = body || {};

    if (!bid_id && !day_number) {
      return NextResponse.json({
        success: false,
        error: 'Either bid_id or day_number is required to remove a bid.',
      }, { status: 400 });
    }

    const result = await removeAartiBid({ bid_id, day_number, reason });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /aarti/admin/bid/remove Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to remove bid',
    }, { status: 400 });
  }
}
