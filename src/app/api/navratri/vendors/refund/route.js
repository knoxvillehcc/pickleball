import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionAndPermissions } from '@/lib/auth';
import {
  getVendorRegistrationByNumber,
  updateVendorRegistration,
  updateVendorDate,
} from '@/lib/navratriVendorDb';

export const dynamic = 'force-dynamic';
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  // Auth check
  const auth = await getSessionAndPermissions('navratri');
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { registration_number, mode = 'full', date_ids = [] } = body;

    if (!registration_number) {
      return NextResponse.json({ success: false, error: 'Registration number is required' }, { status: 400 });
    }

    const reg = await getVendorRegistrationByNumber(registration_number);
    if (!reg) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }

    if (reg.payment_status === 'refunded') {
      return NextResponse.json({ success: false, error: 'This registration has already been fully refunded.' }, { status: 400 });
    }

    if (!['paid', 'partially_refunded'].includes(reg.payment_status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot refund a registration with payment status: "${reg.payment_status}". Only paid registrations can be refunded.`,
      }, { status: 400 });
    }

    const stripe = getStripe();
    let paymentIntentId = null;

    // Resolve PaymentIntent from stripe_payment_ref
    if (reg.stripe_payment_ref) {
      if (reg.stripe_payment_ref.startsWith('pi_')) {
        paymentIntentId = reg.stripe_payment_ref;
      } else if (reg.stripe_payment_ref.startsWith('cs_')) {
        try {
          const session = await stripe.checkout.sessions.retrieve(reg.stripe_payment_ref);
          paymentIntentId = session.payment_intent;
        } catch (e) {
          console.error('[Navratri Vendor Refund] Failed to retrieve checkout session:', e.message);
        }
      }
    }

    if (!paymentIntentId) {
      return NextResponse.json({
        success: false,
        error: 'No valid Stripe payment reference found on this registration. Could not process refund through Stripe.',
      }, { status: 400 });
    }

    // ── Mode: FULL REFUND ────────────────────────────────────────────────────────
    if (mode === 'full') {
      const refundAmount = reg.amount_paid; // in cents
      let stripeRefund = null;

      if (refundAmount > 0) {
        stripeRefund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            registration_number: reg.registration_number,
            business_name: reg.business_name,
            refund_type: 'full_festival_refund',
          },
        });
      }

      // Mark all dates as refunded
      for (const d of reg.dates || []) {
        if (d.status !== 'refunded') {
          await updateVendorDate(d.id, {
            status: 'refunded',
            refund_amount_cents: d.total_cents,
            refund_id: stripeRefund?.id || 'manual',
            refunded_at: new Date().toISOString(),
          });
        }
      }

      // Update master registration
      await updateVendorRegistration(reg.id, {
        payment_status: 'refunded',
        amount_paid: 0,
        notes: `${reg.notes || ''}\n[${new Date().toISOString()}] Full refund issued: $${(refundAmount / 100).toFixed(2)} (Stripe: ${stripeRefund?.id || 'manual'})`.trim(),
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        mode: 'full',
        refundAmount: refundAmount / 100,
        stripeRefundId: stripeRefund?.id || null,
        message: `Successfully issued full refund of $${(refundAmount / 100).toFixed(2)}`,
      });
    }

    // ── Mode: PARTIAL REFUND (Specific Dates) ──────────────────────────────────
    if (mode === 'partial') {
      if (!Array.isArray(date_ids) || date_ids.length === 0) {
        return NextResponse.json({ success: false, error: 'Please select at least one date to cancel and refund.' }, { status: 400 });
      }

      const activeDates = reg.dates || [];
      const datesToRefund = activeDates.filter(d => date_ids.includes(d.id) && d.status !== 'refunded');

      if (datesToRefund.length === 0) {
        return NextResponse.json({ success: false, error: 'Selected dates are already refunded or not found.' }, { status: 400 });
      }

      const refundCents = datesToRefund.reduce((sum, d) => sum + (d.total_cents || 0), 0);

      if (refundCents <= 0) {
        return NextResponse.json({ success: false, error: 'Calculated refund amount is zero.' }, { status: 400 });
      }

      if (refundCents > reg.amount_paid) {
        return NextResponse.json({
          success: false,
          error: `Cannot refund $${(refundCents / 100).toFixed(2)} — maximum refundable balance is $${(reg.amount_paid / 100).toFixed(2)}`,
        }, { status: 400 });
      }

      // Process Stripe partial refund
      const stripeRefund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundCents,
        reason: 'requested_by_customer',
        metadata: {
          registration_number: reg.registration_number,
          business_name: reg.business_name,
          refund_type: 'partial_date_refund',
          dates_cancelled: datesToRefund.map(d => d.event_date).join(', '),
        },
      });

      // Update refunded dates
      for (const d of datesToRefund) {
        await updateVendorDate(d.id, {
          status: 'refunded',
          refund_amount_cents: d.total_cents,
          refund_id: stripeRefund.id,
          refunded_at: new Date().toISOString(),
        });
      }

      const remainingPaid = Math.max(0, reg.amount_paid - refundCents);
      const remainingActiveDates = activeDates.filter(
        d => !date_ids.includes(d.id) && d.status !== 'refunded'
      );
      const newStatus = remainingActiveDates.length === 0 ? 'refunded' : 'partially_refunded';
      const remainingBooths = remainingActiveDates.reduce((s, d) => s + (d.booth_count || 1), 0);

      // Update master registration
      const cancelledLabels = datesToRefund.map(d => d.day_label || d.event_date).join(', ');
      await updateVendorRegistration(reg.id, {
        amount_paid: remainingPaid,
        total_booths_booked: remainingBooths,
        payment_status: newStatus,
        notes: `${reg.notes || ''}\n[${new Date().toISOString()}] Partial refund issued for [${cancelledLabels}]: $${(refundCents / 100).toFixed(2)} (Stripe: ${stripeRefund.id})`.trim(),
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        mode: 'partial',
        refundAmount: refundCents / 100,
        remainingPaid: remainingPaid / 100,
        newStatus,
        stripeRefundId: stripeRefund.id,
        message: `Successfully refunded $${(refundCents / 100).toFixed(2)} for ${datesToRefund.length} cancelled date(s).`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid refund mode' }, { status: 400 });

  } catch (err) {
    console.error('[Navratri Vendor Refund] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
