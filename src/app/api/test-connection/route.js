import { NextResponse } from 'next/server';
import { odooAuth } from '@/lib/odooClient';

export async function POST(req) {
  try {
    const creds = await req.json();
    
    if (!creds.url || !creds.db || !creds.username || !creds.password) {
      return NextResponse.json({ success: false, error: 'Missing required credential fields.' }, { status: 400 });
    }

    // Attempt to authenticate
    const sessionId = await odooAuth(creds);
    
    // If we reach here, authentication was successful
    return NextResponse.json({ success: true, message: 'Connection successful!' });
  } catch (error) {
    // If authentication failed, return the exact error message
    return NextResponse.json({ success: false, error: error.message || 'Unknown connection error' });
  }
}