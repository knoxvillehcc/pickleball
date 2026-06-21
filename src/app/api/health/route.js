import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status:  'ok',
    service: 'hcc-agent',
    time:    new Date().toISOString(),
  });
}
