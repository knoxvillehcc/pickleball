/**
 * emailService.js
 * Gmail SMTP email sender using nodemailer.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env.local
 */
import nodemailer from 'nodemailer';

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD in .env.local');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── Shared email styles ────────────────────────────────────────────────────────
const baseStyle = `
  font-family: 'Helvetica Neue', Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
`;

const headerHtml = (title, subtitle) => `
  <div style="background: linear-gradient(135deg, #7B1C1C 0%, #A0522D 100%); padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
    <div style="font-size: 48px; margin-bottom: 12px;">🏓</div>
    <h1 style="color: white; margin: 0 0 8px; font-size: 26px; font-weight: 800;">${title}</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 15px;">${subtitle}</p>
  </div>
`;

const footerHtml = `
  <div style="background: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e9ecef; border-radius: 0 0 12px 12px;">
    <p style="color: #6c757d; margin: 0; font-size: 13px;">
      Questions? Email us at 
      <a href="mailto:knoxvillehcc@gmail.com" style="color: #7B1C1C;">knoxvillehcc@gmail.com</a>
    </p>
    <p style="color: #adb5bd; margin: 8px 0 0; font-size: 12px;">
      Knoxville Hindu Community Center · Pickleball Tournament
    </p>
  </div>
`;

// ── Send confirmation to the registering person (team captain) ─────────────────
export async function sendCaptainConfirmation(regData) {
  const transporter = getTransporter();

  const playerRows = (regData.players_data || []).map((p, i) => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 10px 16px; color: #495057; font-weight: 600;">Player ${i + 1}</td>
      <td style="padding: 10px 16px; color: #212529;">${p.first_name} ${p.last_name}</td>
      <td style="padding: 10px 16px; color: #6c757d;">${p.email || '—'}</td>
    </tr>
  `).join('');

  const html = `
    <div style="${baseStyle}">
      ${headerHtml('Registration Confirmed! ✅', 'HCC Pickleball Tournament')}
      <div style="padding: 32px; border: 1px solid #e9ecef; border-top: none;">
        <p style="color: #212529; margin: 0 0 24px; font-size: 16px;">
          Dear <strong>${regData.full_name}</strong>,
        </p>
        <p style="color: #495057; margin: 0 0 24px; line-height: 1.6;">
          Your registration and payment have been confirmed. Here are your details:
        </p>

        <!-- Registration Info -->
        <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #7B1C1C; margin: 0 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Registration Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6c757d; width: 160px;">Reg Number</td><td style="padding: 6px 0; font-weight: 800; color: #F4A40B; font-family: monospace; font-size: 16px;">${regData.registration_number}</td></tr>
            <tr><td style="padding: 6px 0; color: #6c757d;">Team Name</td><td style="padding: 6px 0; font-weight: 600; color: #212529;">${regData.team_name || '—'}</td></tr>
            <tr><td style="padding: 6px 0; color: #6c757d;">Player Type</td><td style="padding: 6px 0; color: #212529;">${regData.player_type === 'middle_high_school' ? '🏫 Middle / High School' : '👤 Adult'}</td></tr>
            <tr><td style="padding: 6px 0; color: #6c757d;">Registration</td><td style="padding: 6px 0; color: #212529;">${regData.registration_type === 'doubles' ? 'Doubles (2 Players)' : 'Singles (1 Player)'}</td></tr>
            <tr><td style="padding: 6px 0; color: #6c757d;">Event Date</td><td style="padding: 6px 0; color: #212529;">${regData.event_date || 'TBD — we will notify you'}</td></tr>
          </table>
        </div>

        <!-- Players List -->
        ${playerRows ? `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #7B1C1C; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Registered Players</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; color: #6c757d; font-size: 12px; text-transform: uppercase;">#</th>
                <th style="padding: 10px 16px; text-align: left; color: #6c757d; font-size: 12px; text-transform: uppercase;">Name</th>
                <th style="padding: 10px 16px; text-align: left; color: #6c757d; font-size: 12px; text-transform: uppercase;">Email</th>
              </tr>
            </thead>
            <tbody>${playerRows}</tbody>
          </table>
        </div>` : ''}

        <!-- Payment Summary -->
        <div style="background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.04)); border: 1px solid rgba(16,185,129,0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #10B981; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Payment Confirmed ✅</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #495057;">${regData.player_count || 1} player(s) × $25.00</span>
            <strong style="color: #10B981; font-size: 20px;">$${(regData.amount_paid || 0).toFixed(2)}</strong>
          </div>
          <div style="font-size: 12px; color: #6c757d;">Payment Reference: ${regData.stripe_payment_ref || '—'}</div>
        </div>

        <!-- What's Next -->
        <div style="border-left: 4px solid #F4A40B; padding-left: 16px; margin-bottom: 24px;">
          <h3 style="color: #212529; margin: 0 0 12px; font-size: 15px;">What Happens Next?</h3>
          <ul style="color: #495057; margin: 0; padding: 0 0 0 20px; line-height: 1.8;">
            <li>All registered players will receive their own confirmation email</li>
            <li>You'll be contacted with venue and schedule details</li>
            <li>Bring your registration number <strong>${regData.registration_number}</strong> for check-in</li>
          </ul>
        </div>

        <p style="color: #495057; margin: 0; font-size: 14px; line-height: 1.6;">
          Thank you for registering with the Knoxville Hindu Community Center! 🎉
        </p>
      </div>
      ${footerHtml}
    </div>
  `;

  await transporter.sendMail({
    from:    `"HCC Pickleball" <${process.env.GMAIL_USER}>`,
    to:      regData.email,
    subject: `✅ Registration Confirmed — ${regData.registration_number} | HCC Pickleball`,
    html,
  });
}

// ── Send notification to an individual player ──────────────────────────────────
export async function sendPlayerNotification(player, regData) {
  if (!player.email) return; // skip if no email

  const transporter = getTransporter();

  const html = `
    <div style="${baseStyle}">
      ${headerHtml("You're Registered! 🏓", 'HCC Pickleball Tournament')}
      <div style="padding: 32px; border: 1px solid #e9ecef; border-top: none;">
        <p style="color: #212529; margin: 0 0 24px; font-size: 16px;">
          Dear <strong>${player.first_name} ${player.last_name}</strong>,
        </p>
        <p style="color: #495057; margin: 0 0 24px; line-height: 1.6;">
          <strong>${regData.full_name}</strong> has registered you for the 
          <strong>HCC Pickleball Tournament</strong>. Your spot is confirmed!
        </p>

        <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #7B1C1C; margin: 0 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Registration Info</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6c757d; width: 140px;">Reg Number</td><td style="padding: 6px 0; font-weight: 800; color: #F4A40B; font-family: monospace; font-size: 16px;">${regData.registration_number}</td></tr>
            <tr><td style="padding: 6px 0; color: #6c757d;">Team Name</td><td style="padding: 6px 0; font-weight: 600; color: #212529;">${regData.team_name || '—'}</td></tr>
            <tr><td style="padding: 6px 0; color: #6c757d;">Registered By</td><td style="padding: 6px 0; color: #212529;">${regData.full_name} (${regData.email})</td></tr>
            <tr><td style="padding: 6px 0; color: #6c757d;">Event Date</td><td style="padding: 6px 0; color: #212529;">${regData.event_date || 'TBD — you will be notified'}</td></tr>
            <tr><td style="padding: 6px 0; color: #6c757d;">Player Type</td><td style="padding: 6px 0; color: #212529;">${regData.player_type === 'middle_high_school' ? '🏫 Middle / High School' : '👤 Adult'}</td></tr>
          </table>
        </div>

        <div style="border-left: 4px solid #F4A40B; padding-left: 16px; margin-bottom: 24px;">
          <p style="color: #495057; margin: 0; line-height: 1.6;">
            Please bring your registration number <strong>${regData.registration_number}</strong> for check-in on event day.
          </p>
        </div>

        <p style="color: #495057; margin: 0; font-size: 14px;">
          See you on the court! 🏓
        </p>
      </div>
      ${footerHtml}
    </div>
  `;

  await transporter.sendMail({
    from:    `"HCC Pickleball" <${process.env.GMAIL_USER}>`,
    to:      player.email,
    subject: `🏓 You're registered for HCC Pickleball Tournament — Reg #${regData.registration_number}`,
    html,
  });
}

// ── Send all emails after payment confirmed ────────────────────────────────────
// Emails sent:
//   • Registering person → captain summary (full details + payment receipt)
//   • Player 1           → player confirmation (even if same as registering person)
//   • Player 2           → player confirmation (doubles only)
export async function sendAllConfirmationEmails(regData) {
  const errors = [];
  const sentTo = new Set();

  // 1. Captain confirmation → registering person (full summary + receipt)
  try {
    await sendCaptainConfirmation(regData);
    sentTo.add(regData.email);
    console.log(`[Email] ✅ Captain confirmation → ${regData.email}`);
  } catch (err) {
    console.error(`[Email] ❌ Captain email failed: ${err.message}`);
    errors.push(`captain(${regData.email}): ${err.message}`);
  }

  // 2. Player notification → every player (Player 1 AND Player 2)
  //    Player 1 gets both captain email + player notification (different content, both useful)
  //    Player 2 gets only the player notification
  const players = regData.players_data || [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (!player.email) {
      console.log(`[Email] ⚠️  Player ${i + 1} has no email — skipping`);
      continue;
    }
    const key = `player-${player.email}`;
    if (sentTo.has(key)) continue; // skip true duplicate
    try {
      await sendPlayerNotification(player, regData);
      sentTo.add(key);
      console.log(`[Email] ✅ Player ${i + 1} notification → ${player.email}`);
    } catch (err) {
      console.error(`[Email] ❌ Player ${i + 1} email failed (${player.email}): ${err.message}`);
      errors.push(`player${i + 1}(${player.email}): ${err.message}`);
    }
  }

  console.log(`[Email] Done. Sent to: ${[...sentTo].join(', ')}`);
  return { sent: true, sentTo: [...sentTo], errors };
}

