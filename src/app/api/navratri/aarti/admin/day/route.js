import { NextResponse } from 'next/server';
import { updateAdminDay } from '@/lib/aarti/aartiService';
import { getSessionAndPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await getSessionAndPermissions('navratri_aarti');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const result = await updateAdminDay(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /aarti/admin/day Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update day',
    }, { status: 400 });
  }
}
