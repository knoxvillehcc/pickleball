import { NextResponse } from 'next/server';
import { getAartiDaysPublic, getAartiSettings } from '@/lib/aarti/aartiService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [days, settings] = await Promise.all([
      getAartiDaysPublic(),
      getAartiSettings(),
    ]);

    return NextResponse.json({
      success: true,
      days,
      settings,
    });
  } catch (error) {
    console.error('[API /aarti/days Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to load festival days',
    }, { status: 500 });
  }
}
