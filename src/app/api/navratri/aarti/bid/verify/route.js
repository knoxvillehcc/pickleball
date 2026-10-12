import { NextResponse } from 'next/server';
import { verifyBid } from '@/lib/aarti/aartiService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await verifyBid(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /aarti/bid/verify Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Verification failed',
    }, { status: 400 });
  }
}
