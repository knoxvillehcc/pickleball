import { NextResponse } from 'next/server';
import { getAartiDaysAdmin } from '@/lib/aarti/aartiService';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getSessionAndPermissions('navratri_aarti');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const data = await getAartiDaysAdmin();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('[API /aarti/admin/data Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch admin data',
    }, { status: 500 });
  }
}
