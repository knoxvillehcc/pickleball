import { NextResponse } from 'next/server';
import { resendOtp } from '@/lib/aarti/aartiService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await resendOtp(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /aarti/bid/resend Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to resend code',
    }, { status: 400 });
  }
}
