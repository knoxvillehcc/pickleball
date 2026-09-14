/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Google Drive Backup Service
 * ═══════════════════════════════════════════════════════════════════
 *
 * Exports event data (orders, tickets, check-ins, refunds) as JSON
 * and uploads to Google Drive via Service Account.
 *
 * Required env vars:
 *   GOOGLE_DRIVE_FOLDER_ID    — Target folder ID
 *   GOOGLE_SERVICE_ACCOUNT    — JSON stringified service account key
 *
 * Alternative: OAuth2 flow (requires user consent)
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 */

import * as db from '@/lib/navratri/db';

// ── Check if configured ──────────────────────────────────────────────────────
export function isGDriveConfigured() {
  return !!(
    (process.env.GOOGLE_SERVICE_ACCOUNT && process.env.GOOGLE_DRIVE_FOLDER_ID) ||
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
  );
}

// ── Get Access Token ─────────────────────────────────────────────────────────
async function getAccessToken() {
  // Method 1: Service Account
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const jwt = await createJWT(serviceAccount);
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    const data = await res.json();
    return data.access_token;
  }

  // Method 2: OAuth2 Refresh Token
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    return data.access_token;
  }

  throw new Error('Google Drive not configured');
}

// ── Create JWT for Service Account ───────────────────────────────────────────
async function createJWT(serviceAccount) {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const signInput = `${header}.${payload}`;

  // Import private key
  const pemKey = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${header}.${payload}.${sig}`;
}

// ── Upload file to Google Drive ──────────────────────────────────────────────
async function uploadToDrive(accessToken, filename, content, mimeType = 'application/json') {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const metadata = {
    name: filename,
    mimeType,
    parents: folderId ? [folderId] : [],
  };

  const boundary = '----NavratriBackup' + Date.now();
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    '',
    typeof content === 'string' ? content : JSON.stringify(content, null, 2),
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload failed: ${res.status} — ${err}`);
  }

  return res.json();
}

// ── Run Full Backup ──────────────────────────────────────────────────────────
export async function runBackup(eventId) {
  if (!isGDriveConfigured()) {
    return { success: false, error: 'Google Drive not configured' };
  }

  const accessToken = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const results = [];

  // 1. Export Orders
  try {
    const orders = await db.query('navratri_orders', `event_id=eq.${eventId}`, { order: 'created_at.desc' });
    const file = await uploadToDrive(accessToken, `navratri_orders_${timestamp}.json`, orders);
    results.push({ type: 'orders', count: orders.length, fileId: file.id });
  } catch (err) {
    results.push({ type: 'orders', error: err.message });
  }

  // 2. Export Order Items
  try {
    const items = await db.query('navratri_order_items', `order_id=not.is.null`, { order: 'created_at.desc', limit: 5000 });
    const file = await uploadToDrive(accessToken, `navratri_order_items_${timestamp}.json`, items);
    results.push({ type: 'order_items', count: items.length, fileId: file.id });
  } catch (err) {
    results.push({ type: 'order_items', error: err.message });
  }

  // 3. Export Tickets
  try {
    const tickets = await db.query('navratri_tickets', `order_id=not.is.null`, { order: 'created_at.desc', limit: 5000, select: 'id,order_id,ticket_type,quantity,status,event_date_id,email_sent,sms_sent,created_at' });
    const file = await uploadToDrive(accessToken, `navratri_tickets_${timestamp}.json`, tickets);
    results.push({ type: 'tickets', count: tickets.length, fileId: file.id });
  } catch (err) {
    results.push({ type: 'tickets', error: err.message });
  }

  // 4. Export Check-ins
  try {
    const checkins = await db.query('navratri_checkins', `ticket_id=not.is.null`, { order: 'checked_in_at.desc', limit: 5000 });
    const file = await uploadToDrive(accessToken, `navratri_checkins_${timestamp}.json`, checkins);
    results.push({ type: 'checkins', count: checkins.length, fileId: file.id });
  } catch (err) {
    results.push({ type: 'checkins', error: err.message });
  }

  // 5. Export Members Cache
  try {
    const members = await db.query('navratri_members_cache', `event_id=eq.${eventId}`, { order: 'name.asc' });
    const file = await uploadToDrive(accessToken, `navratri_members_${timestamp}.json`, members);
    results.push({ type: 'members', count: members.length, fileId: file.id });
  } catch (err) {
    results.push({ type: 'members', error: err.message });
  }

  // 6. Export Refunds
  try {
    const refunds = await db.query('navratri_refunds', `order_id=not.is.null`, { order: 'created_at.desc' });
    const file = await uploadToDrive(accessToken, `navratri_refunds_${timestamp}.json`, refunds);
    results.push({ type: 'refunds', count: refunds.length, fileId: file.id });
  } catch (err) {
    results.push({ type: 'refunds', error: err.message });
  }

  // 7. Export Daily Closes
  try {
    const closes = await db.query('navratri_daily_close', `event_id=eq.${eventId}`, { order: 'close_date.desc' });
    const file = await uploadToDrive(accessToken, `navratri_daily_close_${timestamp}.json`, closes);
    results.push({ type: 'daily_close', count: closes.length, fileId: file.id });
  } catch (err) {
    results.push({ type: 'daily_close', error: err.message });
  }

  const hasErrors = results.some(r => r.error);

  return {
    success: !hasErrors,
    timestamp,
    results,
    totalExported: results.filter(r => !r.error).reduce((s, r) => s + (r.count || 0), 0),
  };
}
