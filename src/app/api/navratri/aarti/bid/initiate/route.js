import { NextResponse } from 'next/server';
import { initiateBid } from '@/lib/aarti/aartiService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await initiateBid(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /aarti/bid/initiate Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to initiate bid',
    }, { status: 400 });
  }
}
