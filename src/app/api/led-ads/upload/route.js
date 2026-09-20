import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SB_URL = () => process.env.SUPABASE_URL;
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const hdrs = () => ({
  'apikey': SB_KEY(),
  'Authorization': `Bearer ${SB_KEY()}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

// GET — verify token and return registration info
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing upload token' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${SB_URL()}/rest/v1/led_ad_registrations?upload_token=eq.${encodeURIComponent(token)}&select=id,registration_number,business_name,contact_name,media_url,media_filename,media_uploaded_at,payment_status`,
      { headers: hdrs(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
    const rows = await res.json();
    if (!rows?.length) {
      return NextResponse.json({ success: false, error: 'Invalid or expired upload link' }, { status: 404 });
    }
    const reg = rows[0];
    if (reg.payment_status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Payment not confirmed yet' }, { status: 403 });
    }
    return NextResponse.json({ success: true, registration: reg });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST — upload media file
export async function POST(request) {
  try {
    const formData = await request.formData();
    const token = formData.get('token');
    const file = formData.get('file');

    if (!token || !file) {
      return NextResponse.json({ success: false, error: 'Missing token or file' }, { status: 400 });
    }

    // Validate file size (10 MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum 10 MB.' }, { status: 400 });
    }

    // Find registration by token
    const lookupRes = await fetch(
      `${SB_URL()}/rest/v1/led_ad_registrations?upload_token=eq.${encodeURIComponent(token)}&select=id,registration_number,payment_status`,
      { headers: hdrs(), cache: 'no-store' }
    );
    const rows = await lookupRes.json();
    if (!rows?.length) {
      return NextResponse.json({ success: false, error: 'Invalid upload token' }, { status: 404 });
    }
    const reg = rows[0];
    if (reg.payment_status !== 'paid') {
      return NextResponse.json({ success: false, error: 'Payment not confirmed' }, { status: 403 });
    }

    // Build storage path
    const ext = file.name.split('.').pop() || 'bin';
    const storagePath = `${reg.registration_number}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(
      `${SB_URL()}/storage/v1/object/led-ads/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'apikey': SB_KEY(),
          'Authorization': `Bearer ${SB_KEY()}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: fileBuffer,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Storage upload failed (${uploadRes.status}): ${errText}`);
    }

    // Build public URL
    const publicUrl = `${SB_URL()}/storage/v1/object/public/led-ads/${storagePath}`;

    // Update registration record with media info
    const updateRes = await fetch(
      `${SB_URL()}/rest/v1/led_ad_registrations?id=eq.${reg.id}`,
      {
        method: 'PATCH',
        headers: hdrs(),
        body: JSON.stringify({
          media_url: publicUrl,
          media_filename: file.name,
          media_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateRes.ok) {
      throw new Error(`DB update failed: ${await updateRes.text()}`);
    }

    return NextResponse.json({
      success: true,
      media_url: publicUrl,
      filename: file.name,
    });

  } catch (err) {
    console.error('[LED-Ads Upload] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
