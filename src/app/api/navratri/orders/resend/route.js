import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';
import { sendTicketConfirmation } from '@/lib/navratri/communications';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const tickets = await db.getTicketsByOrder(orderId);
    const result = await sendTicketConfirmation(order, tickets || []);

    return NextResponse.json({
      success: true,
      sentTo: order.purchaser_email,
      emailSent: result.emailSent,
      smsSent: result.smsSent,
    });
  } catch (err) {
    console.error('[navratri/orders/resend] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
