/**
 * ═══════════════════════════════════════════════════════════════════
 * GET /api/navratri/orders — Search/filter orders
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import * as db from '@/lib/navratri/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const status  = searchParams.get('status');
    const type    = searchParams.get('type');
    const search  = searchParams.get('search');
    const limit   = parseInt(searchParams.get('limit') || '50', 10);

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const orders = await db.getOrders(parseInt(eventId, 10), { status, type, search, limit });

    // Enrich with order items for each order
    const enriched = await Promise.all(orders.map(async (order) => {
      const items = await db.getOrderItems(order.id);
      return { ...order, items };
    }));

    return NextResponse.json({ orders: enriched });
  } catch (err) {
    console.error('[navratri/orders] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });

    const updates = {};
    if (fields.purchaser_name !== undefined) updates.purchaser_name = fields.purchaser_name.trim();
    if (fields.purchaser_email !== undefined) updates.purchaser_email = fields.purchaser_email.trim().toLowerCase();
    if (fields.purchaser_phone !== undefined) updates.purchaser_phone = fields.purchaser_phone.trim();
    if (fields.payment_status !== undefined) updates.payment_status = fields.payment_status;
    if (fields.customer_type !== undefined) updates.customer_type = fields.customer_type;
    updates.updated_at = new Date().toISOString();

    const result = await db.updateOrder(id, updates);
    return NextResponse.json({ success: true, order: result });
  } catch (err) {
    console.error('[navratri/orders] PUT error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

