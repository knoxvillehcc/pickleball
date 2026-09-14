/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Communications Service
 * ═══════════════════════════════════════════════════════════════════
 *
 * - Ticket confirmation emails (HTML template)
 * - SMS ticket links via Twilio
 * - Reminder emails (X days before event)
 * - Announcement blasts (all ticket holders)
 */

import nodemailer from 'nodemailer';
import { sendSMS, isTwilioConfigured } from '@/lib/twilioService';

// ── Gmail Transporter ────────────────────────────────────────────────────────
function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Navratri Comms] Gmail not configured — emails will be logged only');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

// ── Email Styles ─────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0f0d13', card: '#1a1625', primary: '#FF6B35',
  secondary: '#8B1E3F', accent: '#FFD700', text: '#F8FAFC',
  muted: '#94A3B8', green: '#34D399',
};

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:0;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,${COLORS.primary},${COLORS.secondary});padding:32px 24px;text-align:center;border-radius:0 0 20px 20px;">
    <div style="font-size:40px;margin-bottom:8px;">🪔</div>
    <h1 style="margin:0;color:white;font-size:24px;font-weight:900;">Navratri 2026</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Hindu Community Center Knoxville</p>
  </div>
  <!-- Content -->
  <div style="padding:24px;">${content}</div>
  <!-- Footer -->
  <div style="padding:20px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
    <p style="margin:0;color:${COLORS.muted};font-size:12px;">Hindu Community Center Knoxville</p>
    <p style="margin:4px 0 0;color:${COLORS.muted};font-size:11px;">8580 Hickory Creek Rd, Lenoir City, TN</p>
    <p style="margin:8px 0 0;color:rgba(148,163,184,0.5);font-size:10px;">You received this email because you purchased Navratri 2026 tickets.</p>
  </div>
</div>
</body></html>`;
}

// ── Send Ticket Confirmation ─────────────────────────────────────────────────
export async function sendTicketConfirmation(order, tickets, event) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://monkfish-app-otsj3.ondigitalocean.app';
  const ticketUrl = `${baseUrl}/navratri-2026/tickets?order=${encodeURIComponent(order.order_number)}&phone=${encodeURIComponent(order.purchaser_phone)}`;

  const ticketRows = tickets.map(t => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.05);color:${COLORS.text};font-size:14px;">${t.dateLabel || 'All Dates'}</td>
      <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.05);color:${COLORS.text};font-size:14px;text-align:center;">${t.quantity}</td>
      <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.05);color:${COLORS.text};font-size:14px;text-transform:capitalize;">${(t.ticket_type || '').replace(/_/g, ' ')}</td>
    </tr>
  `).join('');

  const content = `
    <div style="background:${COLORS.card};border-radius:16px;padding:24px;margin-bottom:20px;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;padding:8px 20px;border-radius:20px;background:rgba(52,211,153,0.15);color:${COLORS.green};font-weight:700;font-size:14px;">
          ✅ Order Confirmed
        </div>
      </div>
      <h2 style="color:${COLORS.accent};font-size:20px;font-weight:900;margin:0 0 16px;text-align:center;">
        ${order.order_number}
      </h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Name</td>
          <td style="padding:8px 0;color:${COLORS.text};font-size:14px;font-weight:700;text-align:right;">${order.purchaser_name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Total</td>
          <td style="padding:8px 0;color:${COLORS.accent};font-size:18px;font-weight:900;text-align:right;">$${parseFloat(order.total_amount || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Type</td>
          <td style="padding:8px 0;color:${COLORS.text};font-size:14px;text-align:right;text-transform:capitalize;">${(order.order_type || '').replace(/_/g, ' ')}</td>
        </tr>
      </table>
    </div>

    <div style="background:${COLORS.card};border-radius:16px;padding:24px;margin-bottom:20px;">
      <h3 style="color:${COLORS.text};font-size:16px;font-weight:800;margin:0 0 12px;">🎟️ Your Tickets</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <th style="padding:10px 12px;text-align:left;color:${COLORS.muted};font-size:11px;text-transform:uppercase;border-bottom:2px solid rgba(255,255,255,0.1);">Date</th>
          <th style="padding:10px 12px;text-align:center;color:${COLORS.muted};font-size:11px;text-transform:uppercase;border-bottom:2px solid rgba(255,255,255,0.1);">Qty</th>
          <th style="padding:10px 12px;text-align:left;color:${COLORS.muted};font-size:11px;text-transform:uppercase;border-bottom:2px solid rgba(255,255,255,0.1);">Type</th>
        </tr>
        ${ticketRows}
      </table>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${ticketUrl}" style="display:inline-block;padding:18px 48px;border-radius:14px;background:linear-gradient(135deg,${COLORS.primary},#FF9933);color:white;text-decoration:none;font-weight:900;font-size:18px;">
        🎫 View Your Tickets
      </a>
      <p style="color:${COLORS.muted};font-size:12px;margin-top:12px;">Open this link on your phone at the gate</p>
    </div>

    <div style="background:rgba(255,107,53,0.05);border:1px solid rgba(255,107,53,0.15);border-radius:12px;padding:16px;margin-top:16px;">
      <h4 style="color:${COLORS.text};font-size:14px;font-weight:700;margin:0 0 8px;">📋 At the Gate:</h4>
      <ol style="margin:0;padding-left:20px;color:${COLORS.muted};font-size:13px;line-height:1.8;">
        <li>Open the ticket link on your phone</li>
        <li>Show the QR code (refreshes every 30 seconds)</li>
        <li>Staff will verify your name</li>
        <li>Enjoy Navratri! 🪔</li>
      </ol>
    </div>
  `;

  const html = emailWrapper(content);

  // Send email
  if (order.purchaser_email) {
    try {
      const transporter = getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: `"HCC Navratri" <${process.env.GMAIL_USER}>`,
          to: order.purchaser_email,
          subject: `🪔 Navratri 2026 — Order ${order.order_number} Confirmed!`,
          html,
        });
        console.log(`[Navratri Comms] Confirmation email sent to ${order.purchaser_email}`);
      }
    } catch (err) {
      console.error('[Navratri Comms] Email send failed:', err.message);
    }
  }

  // Send SMS with ticket link
  if (order.purchaser_phone && isTwilioConfigured()) {
    try {
      await sendSMS(
        order.purchaser_phone,
        `🪔 Navratri 2026 — Your tickets are ready!\n\nOrder: ${order.order_number}\nOpen this link at the gate:\n${ticketUrl}\n\n— Hindu Community Center`
      );
      console.log(`[Navratri Comms] SMS sent to ${order.purchaser_phone}`);
    } catch (err) {
      console.error('[Navratri Comms] SMS send failed:', err.message);
    }
  }

  return { emailSent: !!order.purchaser_email, smsSent: isTwilioConfigured() && !!order.purchaser_phone, ticketUrl };
}

// ── Send Reminder ────────────────────────────────────────────────────────────
export async function sendReminder(order, dateName, dateStr) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://monkfish-app-otsj3.ondigitalocean.app';
  const ticketUrl = `${baseUrl}/navratri-2026/tickets?order=${encodeURIComponent(order.order_number)}&phone=${encodeURIComponent(order.purchaser_phone)}`;

  const content = `
    <div style="background:${COLORS.card};border-radius:16px;padding:24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🪔</div>
      <h2 style="color:${COLORS.accent};font-size:22px;font-weight:900;margin:0 0 8px;">Reminder: ${dateName}</h2>
      <p style="color:${COLORS.muted};font-size:14px;margin:0 0 20px;">
        ${dateStr} • 7:00 PM – 11:00 PM
      </p>
      <p style="color:${COLORS.text};font-size:15px;margin:0 0 24px;">
        Hi <strong>${order.purchaser_name}</strong>,<br/>
        Your Navratri event is ${dateName.toLowerCase().includes('tomorrow') ? 'tomorrow' : 'coming up'}!
      </p>
      <a href="${ticketUrl}" style="display:inline-block;padding:16px 40px;border-radius:14px;background:linear-gradient(135deg,${COLORS.primary},#FF9933);color:white;text-decoration:none;font-weight:900;font-size:16px;">
        🎫 Open Your Tickets
      </a>
      <p style="color:${COLORS.muted};font-size:12px;margin-top:16px;">
        📍 8580 Hickory Creek Rd, Lenoir City, TN
      </p>
    </div>
  `;

  const html = emailWrapper(content);

  if (order.purchaser_email) {
    try {
      const transporter = getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: `"HCC Navratri" <${process.env.GMAIL_USER}>`,
          to: order.purchaser_email,
          subject: `🪔 Reminder: Navratri — ${dateName}`,
          html,
        });
      }
    } catch (err) { console.error('[Navratri Comms] Reminder email failed:', err.message); }
  }

  if (order.purchaser_phone && isTwilioConfigured()) {
    try {
      await sendSMS(
        order.purchaser_phone,
        `🪔 Navratri Reminder: ${dateName}\n${dateStr} • 7:00 PM\n📍 8580 Hickory Creek Rd, Lenoir City, TN\n\nOpen tickets: ${ticketUrl}`
      );
    } catch (err) { console.error('[Navratri Comms] Reminder SMS failed:', err.message); }
  }
}

// ── Send Announcement ────────────────────────────────────────────────────────
export async function sendAnnouncement(recipientEmail, recipientPhone, recipientName, subject, messageBody) {
  const content = `
    <div style="background:${COLORS.card};border-radius:16px;padding:24px;">
      <h2 style="color:${COLORS.text};font-size:20px;font-weight:900;margin:0 0 16px;">📢 ${subject}</h2>
      <div style="color:${COLORS.muted};font-size:15px;line-height:1.8;">
        ${messageBody.replace(/\n/g, '<br/>')}
      </div>
    </div>
  `;

  const html = emailWrapper(content);

  if (recipientEmail) {
    try {
      const transporter = getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: `"HCC Navratri" <${process.env.GMAIL_USER}>`,
          to: recipientEmail,
          subject: `🪔 ${subject}`,
          html,
        });
      }
    } catch (err) { console.error('[Navratri Comms] Announcement email failed:', err.message); }
  }

  if (recipientPhone && isTwilioConfigured()) {
    try {
      const smsText = `🪔 HCC Navratri\n\n${subject}\n\n${messageBody.substring(0, 300)}`;
      await sendSMS(recipientPhone, smsText);
    } catch (err) { console.error('[Navratri Comms] Announcement SMS failed:', err.message); }
  }
}

// ── Send Refund Notification ─────────────────────────────────────────────────
export async function sendRefundNotification(order, refundAmount) {
  const content = `
    <div style="background:${COLORS.card};border-radius:16px;padding:24px;text-align:center;">
      <div style="display:inline-block;padding:8px 20px;border-radius:20px;background:rgba(96,165,250,0.15);color:#60A5FA;font-weight:700;font-size:14px;margin-bottom:16px;">
        ↩️ Refund Processed
      </div>
      <h2 style="color:${COLORS.text};font-size:20px;font-weight:900;margin:0 0 16px;">Order ${order.order_number}</h2>
      <p style="color:${COLORS.muted};font-size:15px;margin:0 0 8px;">
        A refund of <strong style="color:${COLORS.green};font-size:20px;">$${parseFloat(refundAmount).toFixed(2)}</strong> has been processed.
      </p>
      <p style="color:${COLORS.muted};font-size:13px;margin-top:16px;">
        The refund will appear in your account within 5-10 business days.
      </p>
    </div>
  `;

  const html = emailWrapper(content);

  if (order.purchaser_email) {
    try {
      const transporter = getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: `"HCC Navratri" <${process.env.GMAIL_USER}>`,
          to: order.purchaser_email,
          subject: `🪔 Navratri 2026 — Refund Processed (${order.order_number})`,
          html,
        });
      }
    } catch (err) { console.error('[Navratri Comms] Refund email failed:', err.message); }
  }
}
