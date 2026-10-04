import { NextResponse } from 'next/server';
import { getSessionAndPermissions } from '@/lib/auth';
import { getRegisteredEvents, addCustomEvent } from '@/lib/expensesDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getSessionAndPermissions('expenses');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const events = await getRegisteredEvents();
    return NextResponse.json({ success: true, events });
  } catch (err) {
    console.error('[Expenses Events GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await getSessionAndPermissions('expenses');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { eventName, analyticName, eventType } = body;

    if (!eventName || !eventName.trim()) {
      return NextResponse.json({ success: false, error: 'Event name is required' }, { status: 400 });
    }

    const newEvent = await addCustomEvent({
      eventName: eventName.trim(),
      analyticName: (analyticName || eventName).trim(),
      eventType: eventType || 'festival',
    });

    return NextResponse.json({ success: true, event: newEvent });
  } catch (err) {
    console.error('[Expenses Events POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
