/**
 * ═══════════════════════════════════════════════════════════════════
 * /api/navratri/backup — Google Drive backup + status
 * ═══════════════════════════════════════════════════════════════════
 *
 * GET  — Check backup config status
 * POST — Run backup
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { runBackup, isGDriveConfigured } from '@/lib/navratri/gdrive';
import { logAudit, auditActions, getRequestInfo } from '@/lib/navratri/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      configured: isGDriveConfigured(),
      method: process.env.GOOGLE_SERVICE_ACCOUNT ? 'service_account' :
              process.env.GOOGLE_REFRESH_TOKEN ? 'oauth2' : 'not_configured',
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { eventId } = body;
    const reqInfo = getRequestInfo(request);

    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

    if (!isGDriveConfigured()) {
      return NextResponse.json({
        error: 'Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT + GOOGLE_DRIVE_FOLDER_ID or GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN in environment variables.',
      }, { status: 400 });
    }

    const result = await runBackup(eventId);

    await logAudit({
      eventId,
      action: auditActions.BACKUP_RUN,
      entityType: 'backup',
      userId: user.id,
      userEmail: user.email,
      newValue: result,
      ...reqInfo,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[navratri/backup] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
