import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getCredentials } from '@/lib/odooClient';
import { encrypt } from '@/lib/encryption';

const credFilePath = path.join(process.cwd(), 'credentials.json');

export async function GET(request) {
  const auth = await getSessionAndPermissions('settings');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const creds = await getCredentials();
    return NextResponse.json({ 
      ...creds, 
      password: creds.password ? '************' : '',
    });
  } catch (error) {
    return NextResponse.json({}, { status: 200 });
  }
}

export async function POST(request) {
  const auth = await getSessionAndPermissions('settings');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    let existing = {};
    
    try {
      existing = await getCredentials();
    } catch (e) {}

    let finalPassword = body.password;
    if (finalPassword === '************') {
      finalPassword = existing.password;
    }

    const dataToSave = {
      url: body.url || '',
      db: body.db || '',
      username: body.username || '',
      password: finalPassword || '',
      environment: body.environment || 'production',
      dryRunDefault: body.dryRunDefault !== undefined ? body.dryRunDefault : true,
    };

    // 1. Save to Supabase (cloud persistence)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const encryptedStr = encrypt(JSON.stringify(dataToSave));
      
      const checkUrl = `${SUPABASE_URL}/rest/v1/pickleball_settings?key=eq.odoo_creds`;
      const checkRes = await fetch(checkUrl, {
        headers: {
          'apikey':         SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      });
      
      const exists = checkRes.ok && (await checkRes.json()).length > 0;
      
      if (exists) {
        await fetch(`${SUPABASE_URL}/rest/v1/pickleball_settings?key=eq.odoo_creds`, {
          method: 'PATCH',
          headers: {
            'apikey':         SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({ value: encryptedStr }),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/pickleball_settings`, {
          method: 'POST',
          headers: {
            'apikey':         SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({ key: 'odoo_creds', value: encryptedStr }),
        });
      }
    }

    // 2. Save locally (development fallback, ignores read-only failures on cloud)
    try {
      await fs.writeFile(credFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (fsErr) {
      console.warn('[settings POST] Local credentials file write skipped (read-only filesystem):', fsErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }
}