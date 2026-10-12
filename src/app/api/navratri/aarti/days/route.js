import { NextResponse } from 'next/server';
import { getAartiDaysPublic, getAartiSettings, getRecentAartiBidsPublic } from '@/lib/aarti/aartiService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [days, settings, recentBids] = await Promise.all([
      getAartiDaysPublic(),
      getAartiSettings(),
      getRecentAartiBidsPublic(),
    ]);

    return NextResponse.json({
      success: true,
      days,
      settings,
      recent_bids: recentBids,
    });
  } catch (error) {
    console.error('[API /aarti/days Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to load festival days',
    }, { status: 500 });
  }
}
