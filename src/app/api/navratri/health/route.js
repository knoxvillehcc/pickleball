/**
 * ═══════════════════════════════════════════════════════════════════
 * GET /api/navratri/health — System health check
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getCredentials, odooAuth } from '@/lib/odooClient';
import { checkTwilioHealth } from '@/lib/twilioService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const checks = {
      supabase: { status: 'unknown' },
      stripe:   { status: 'unknown' },
      odoo:     { status: 'unknown' },
      twilio:   { status: 'unknown' },
      env:      { status: 'unknown', missing: [] },
    };

    // Supabase
    try {
      const url = `${process.env.SUPABASE_URL}/rest/v1/navratri_events?select=id&limit=1`;
      const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
      const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
      checks.supabase.status = res.ok ? 'healthy' : 'error';
      if (!res.ok) checks.supabase.message = `HTTP ${res.status}`;
    } catch (e) { checks.supabase = { status: 'error', message: e.message }; }

    // Stripe
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const bal = await stripe.balance.retrieve();
      checks.stripe.status = 'healthy';
      checks.stripe.livemode = bal.livemode;
    } catch (e) { checks.stripe = { status: 'error', message: e.message }; }

    // Odoo
    try {
      const creds = await getCredentials();
      const uid = await odooAuth(creds);
      checks.odoo.status = uid ? 'healthy' : 'error';
      checks.odoo.uid = uid;
    } catch (e) { checks.odoo = { status: 'error', message: e.message }; }

    // Twilio
    checks.twilio = await checkTwilioHealth();

    // Environment variables
    const requiredVars = [
      'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY',
      'STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'JWT_SECRET',
    ];
    const optionalVars = [
      'STRIPE_NAVRATRI_WEBHOOK_SECRET',
      'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
      'GMAIL_USER', 'GMAIL_APP_PASSWORD',
    ];

    const missing = requiredVars.filter(v => !process.env[v]);
    const unconfigured = optionalVars.filter(v => !process.env[v]);

    checks.env = {
      status: missing.length === 0 ? 'healthy' : 'error',
      missing,
      unconfigured,
    };

    const overallStatus = Object.values(checks).every(c => c.status === 'healthy' || c.status === 'not_configured')
      ? 'healthy' : 'degraded';

    return NextResponse.json({ status: overallStatus, checks, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
