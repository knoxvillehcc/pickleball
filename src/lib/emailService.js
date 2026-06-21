/**
 * emailService.js
 * HCC Pickleball Tournament — Professional confirmation emails
 * Color palette matches the tournament flyer:
 *   Navy   #041427  |  Lime  #A8D62E  |  Teal  #0E9E8A
 */
import nodemailer from 'nodemailer';

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

// ── Full email wrapper — email-client safe ─────────────────────────────────────
function buildEmail(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>HCC Pickleball Tournament</title>
</head>
<body style="margin:0;padding:0;background-color:#020D1A;font-family:Arial,Helvetica,sans-serif;">

<!--[if mso]><table width="100%" bgcolor="#020D1A"><tr><td><![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#020D1A">
<tr><td align="center" style="padding:32px 16px;">

  <!-- WRAPPER -->
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

    <!-- ══ HEADER ══════════════════════════════════════════════════════ -->
    <tr>
      <td bgcolor="#041427" style="border-radius:16px 16px 0 0;border-top:4px solid #A8D62E;border-left:1px solid #122238;border-right:1px solid #122238;padding:0;">

        <!-- top accent bar -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="#A8D62E" style="height:4px;line-height:4px;font-size:1px;">&nbsp;</td>
          </tr>
        </table>

        <!-- header content -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;">

              <!-- org label -->
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#0E9E8A;letter-spacing:3px;text-transform:uppercase;">
                HCC YOUTH CLUB PRESENTS
              </p>

              <!-- big title -->
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="padding:0;">
                    <p style="margin:0;font-size:48px;font-weight:900;color:#FFFFFF;letter-spacing:-2px;line-height:1;text-transform:uppercase;">
                      PICKLEBALL
                    </p>
                    <p style="margin:0;font-size:36px;font-weight:900;color:#A8D62E;letter-spacing:-1px;line-height:1.1;text-transform:uppercase;">
                      TOURNAMENT
                    </p>
                  </td>
                </tr>
              </table>

              <!-- divider line -->
              <table width="60" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:18px auto;">
                <tr><td bgcolor="#A8D62E" style="height:3px;border-radius:2px;">&nbsp;</td></tr>
              </table>

              <!-- date / location chips -->
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td bgcolor="#0E1E30" style="border:1px solid #1A3248;border-radius:8px;padding:8px 16px;">
                    <p style="margin:0;font-size:13px;color:#A8D62E;font-weight:700;letter-spacing:0.5px;">
                      &#128197; Saturday, July 11, 2026 &nbsp;·&nbsp; 12:00 PM
                    </p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td bgcolor="#0E1E30" style="border:1px solid #1A3248;border-radius:8px;padding:8px 16px;">
                    <p style="margin:0;font-size:12px;color:#6B8BAE;font-weight:600;">
                      &#128205; 8580 Hickory Creek Rd, Lenoir City, TN 37771
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ══ BODY ════════════════════════════════════════════════════════ -->
    <tr>
      <td bgcolor="#071828" style="border-left:1px solid #122238;border-right:1px solid #122238;padding:40px;">

        ${bodyHtml}

      </td>
    </tr>

    <!-- ══ FOOTER ══════════════════════════════════════════════════════ -->
    <tr>
      <td bgcolor="#041427" style="border-radius:0 0 16px 16px;border:1px solid #122238;border-top:1px solid #1A3A20;padding:28px 40px;text-align:center;">

        <!-- tagline row -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom:14px;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="padding:0 10px;font-size:11px;color:#6B8BAE;font-weight:700;text-transform:uppercase;letter-spacing:1px;">&#127942; COMPETE</td>
                  <td style="color:#1A3248;font-size:14px;">|</td>
                  <td style="padding:0 10px;font-size:11px;color:#6B8BAE;font-weight:700;text-transform:uppercase;letter-spacing:1px;">&#129311; HAVE FUN</td>
                  <td style="color:#1A3248;font-size:14px;">|</td>
                  <td style="padding:0 10px;font-size:11px;color:#6B8BAE;font-weight:700;text-transform:uppercase;letter-spacing:1px;">&#127775; BUILD COMMUNITY</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- divider -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td bgcolor="#122238" style="height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr>
        </table>

        <p style="margin:14px 0 4px;font-size:13px;color:#6B8BAE;">
          Questions? <a href="mailto:knoxvillehcc@gmail.com" style="color:#A8D62E;text-decoration:none;font-weight:700;">knoxvillehcc@gmail.com</a>
        </p>
        <p style="margin:0;font-size:11px;color:#2A4060;">
          Knoxville Hindu Community Center &nbsp;·&nbsp; 8580 Hickory Creek Rd, Lenoir City, TN 37771
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->

</body>
</html>`;
}

// ── Section label helper ───────────────────────────────────────────────────────
function sectionLabel(text, color = '#0E9E8A') {
  return `<p style="margin:0 0 14px;font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:2.5px;">${text}</p>`;
}

// ── Info table row ─────────────────────────────────────────────────────────────
function infoRow(label, value, highlight = false) {
  return `
  <tr>
    <td style="padding:9px 0;border-bottom:1px solid #0E1E30;color:#5A7A96;font-size:13px;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:9px 0;border-bottom:1px solid #0E1E30;color:${highlight ? '#A8D62E' : '#FFFFFF'};font-size:${highlight ? '20px' : '14px'};font-weight:${highlight ? '900' : '600'};font-family:${highlight ? 'Courier New,monospace' : 'Arial'};vertical-align:top;">${value}</td>
  </tr>`;
}

// ── Captain confirmation ───────────────────────────────────────────────────────
export async function sendCaptainConfirmation(regData) {
  const transporter = getTransporter();
  const players     = Array.isArray(regData.players_data) ? regData.players_data : [];

  // Build players table rows
  const playerRowsHtml = players.map((p, i) => `
    <tr style="border-bottom:1px solid #0E1E30;">
      <td style="padding:10px 14px;color:#5A7A96;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Player ${i + 1}</td>
      <td style="padding:10px 14px;color:#FFFFFF;font-size:13px;font-weight:600;">${p.first_name || ''} ${p.last_name || ''}</td>
      <td style="padding:10px 14px;color:#5A7A96;font-size:12px;">${p.email || '&mdash;'}</td>
    </tr>`).join('');

  const body = `

    <!-- GREETING -->
    <p style="margin:0 0 6px;font-size:17px;color:#FFFFFF;font-weight:700;">
      Hey ${regData.full_name || 'there'}! &#127881;
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6B8BAE;line-height:1.7;">
      You're officially registered for the <strong style="color:#FFFFFF;">HCC Pickleball Tournament</strong>.
      Your payment is confirmed and your spot is locked in!
    </p>

    <!-- CONFIRMATION BADGE -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#0A1F14" style="border:1px solid #1A4225;border-left:4px solid #A8D62E;border-radius:10px;padding:18px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <p style="margin:0 0 4px;font-size:11px;color:#A8D62E;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Registration Number</p>
                <p style="margin:0;font-size:32px;font-weight:900;color:#A8D62E;font-family:Courier New,monospace;letter-spacing:3px;">${regData.registration_number}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#5A7A96;">Save this — present at check-in on game day</p>
              </td>
              <td align="right" style="vertical-align:middle;padding-left:16px;">
                <p style="margin:0;font-size:11px;color:#A8D62E;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Amount Paid</p>
                <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:#FFFFFF;">$${((regData.amount_paid || 0)).toFixed(2)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- REGISTRATION DETAILS -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#071020" style="border:1px solid #122238;border-radius:10px;padding:20px 24px;">
          ${sectionLabel('Registration Details', '#0E9E8A')}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${infoRow('Team Name', regData.team_name || '&mdash;')}
            ${infoRow('Category', regData.player_type === 'middle_high_school' ? '&#127891; Middle / High School' : '&#128100; Adult')}
            ${infoRow('Type', regData.registration_type === 'doubles' ? '&#129309; Doubles (2 Players)' : '&#127934; Singles (1 Player)')}
            ${infoRow('Players', String(regData.player_count || 1))}
            ${infoRow('Payment Ref', `<span style="font-size:10px;color:#2A4060;font-family:Courier New,monospace;">${(regData.stripe_payment_ref || '').substring(0, 30)}...</span>`)}
          </table>
        </td>
      </tr>
    </table>

    ${playerRowsHtml ? `
    <!-- REGISTERED PLAYERS -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#071020" style="border:1px solid #122238;border-radius:10px;padding:20px 24px;">
          ${sectionLabel('Registered Players', '#0E9E8A')}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr bgcolor="#0A1828">
              <th style="padding:8px 14px;text-align:left;color:#5A7A96;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-radius:6px 0 0 0;">#</th>
              <th style="padding:8px 14px;text-align:left;color:#5A7A96;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Name</th>
              <th style="padding:8px 14px;text-align:left;color:#5A7A96;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-radius:0 6px 0 0;">Email</th>
            </tr>
            ${playerRowsHtml}
          </table>
        </td>
      </tr>
    </table>` : ''}

    <!-- EVENT DETAILS -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#071020" style="border:1px solid #122238;border-radius:10px;padding:20px 24px;">
          ${sectionLabel('Event Details', '#0E9E8A')}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:8px 0;width:50%;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:10px;color:#5A7A96;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Date &amp; Time</p>
                <p style="margin:0;font-size:14px;color:#FFFFFF;font-weight:700;">Saturday, July 11, 2026</p>
                <p style="margin:2px 0 0;font-size:13px;color:#A8D62E;font-weight:600;">12:00 PM</p>
              </td>
              <td style="padding:8px 0;width:50%;vertical-align:top;padding-left:20px;">
                <p style="margin:0 0 4px;font-size:10px;color:#5A7A96;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Location</p>
                <p style="margin:0;font-size:14px;color:#FFFFFF;font-weight:700;">8580 Hickory Creek Rd</p>
                <p style="margin:2px 0 0;font-size:13px;color:#6B8BAE;">Lenoir City, TN 37771</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- GAME DAY CHECKLIST -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td bgcolor="#071020" style="border:1px solid #122238;border-left:4px solid #0E9E8A;border-radius:10px;padding:20px 24px;">
          ${sectionLabel('Game Day Checklist', '#0E9E8A')}
          <p style="margin:0 0 8px;font-size:13px;color:#AABFCC;line-height:2.0;">
            &#9989;&nbsp; Bring your reg number <strong style="color:#A8D62E;">${regData.registration_number}</strong> for check-in<br/>
            &#9989;&nbsp; Arrive <strong style="color:#FFFFFF;">before 12:00 PM</strong> — doors open early<br/>
            &#9989;&nbsp; Bring your own paddle (rental $5 on-site)<br/>
            &#9989;&nbsp; All skill levels welcome — just have fun!<br/>
            &#9989;&nbsp; Bring your partner and your game!
          </p>
        </td>
      </tr>
    </table>

    <!-- CLOSING -->
    <p style="margin:0;font-size:15px;color:#6B8BAE;line-height:1.7;">
      Thank you for being part of the HCC community. <strong style="color:#FFFFFF;">See you on the court!</strong> &#127934;
    </p>
  `;

  await transporter.sendMail({
    from:    `"HCC Pickleball" <${process.env.GMAIL_USER}>`,
    to:      regData.email,
    subject: `✅ You're Registered! Reg #${regData.registration_number} | HCC Pickleball Tournament`,
    html:    buildEmail(body),
  });
}

// ── Player partner notification ────────────────────────────────────────────────
export async function sendPlayerNotification(player, regData) {
  if (!player?.email) return;
  const transporter = getTransporter();

  const body = `

    <!-- GREETING -->
    <p style="margin:0 0 6px;font-size:17px;color:#FFFFFF;font-weight:700;">
      Hey ${player.first_name || 'there'}! &#127881;
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6B8BAE;line-height:1.7;">
      <strong style="color:#FFFFFF;">${regData.full_name}</strong> has registered you as their doubles partner for the
      <strong style="color:#FFFFFF;">HCC Pickleball Tournament</strong>. Your spot is confirmed!
    </p>

    <!-- CONFIRMATION BADGE -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#0A1F14" style="border:1px solid #1A4225;border-left:4px solid #A8D62E;border-radius:10px;padding:18px 20px;">
          <p style="margin:0 0 4px;font-size:11px;color:#A8D62E;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Registration Number</p>
          <p style="margin:0;font-size:32px;font-weight:900;color:#A8D62E;font-family:Courier New,monospace;letter-spacing:3px;">${regData.registration_number}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#5A7A96;">Save this — present at check-in on game day</p>
        </td>
      </tr>
    </table>

    <!-- REGISTRATION DETAILS -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#071020" style="border:1px solid #122238;border-radius:10px;padding:20px 24px;">
          ${sectionLabel('Your Registration Info', '#0E9E8A')}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${infoRow('Team Name', regData.team_name || '&mdash;')}
            ${infoRow('Registered By', `${regData.full_name} (${regData.email})`)}
            ${infoRow('Category', regData.player_type === 'middle_high_school' ? '&#127891; Middle / High School' : '&#128100; Adult')}
          </table>
        </td>
      </tr>
    </table>

    <!-- EVENT DETAILS -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td bgcolor="#071020" style="border:1px solid #122238;border-radius:10px;padding:20px 24px;">
          ${sectionLabel('Event Details', '#0E9E8A')}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:8px 0;width:50%;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:10px;color:#5A7A96;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Date &amp; Time</p>
                <p style="margin:0;font-size:14px;color:#FFFFFF;font-weight:700;">Saturday, July 11, 2026</p>
                <p style="margin:2px 0 0;font-size:13px;color:#A8D62E;font-weight:600;">12:00 PM</p>
              </td>
              <td style="padding:8px 0;width:50%;vertical-align:top;padding-left:20px;">
                <p style="margin:0 0 4px;font-size:10px;color:#5A7A96;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Location</p>
                <p style="margin:0;font-size:14px;color:#FFFFFF;font-weight:700;">8580 Hickory Creek Rd</p>
                <p style="margin:2px 0 0;font-size:13px;color:#6B8BAE;">Lenoir City, TN 37771</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- GAME DAY CHECKLIST -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td bgcolor="#071020" style="border:1px solid #122238;border-left:4px solid #0E9E8A;border-radius:10px;padding:20px 24px;">
          ${sectionLabel('Game Day', '#0E9E8A')}
          <p style="margin:0 0 8px;font-size:13px;color:#AABFCC;line-height:2.0;">
            &#9989;&nbsp; Save reg number <strong style="color:#A8D62E;">${regData.registration_number}</strong> for check-in<br/>
            &#9989;&nbsp; Arrive before <strong style="color:#FFFFFF;">12:00 PM</strong><br/>
            &#9989;&nbsp; Bring your paddle (rental $5 on-site)<br/>
            &#9989;&nbsp; All skill levels welcome!
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:15px;color:#6B8BAE;line-height:1.7;">
      <strong style="color:#FFFFFF;">See you on the court!</strong> &#127934;
    </p>
  `;

  await transporter.sendMail({
    from:    `"HCC Pickleball" <${process.env.GMAIL_USER}>`,
    to:      player.email,
    subject: `🏓 You're In! HCC Pickleball Tournament — Reg #${regData.registration_number}`,
    html:    buildEmail(body),
  });
}

// ── Send all emails after payment ──────────────────────────────────────────────
export async function sendAllConfirmationEmails(regData) {
  const errors = [];
  const sentTo = new Set();

  // 1. Captain confirmation
  try {
    await sendCaptainConfirmation(regData);
    sentTo.add(regData.email);
    console.log(`[Email] ✅ Captain confirmation → ${regData.email}`);
  } catch (err) {
    console.error(`[Email] ❌ Captain email failed: ${err.message}`);
    errors.push(`captain(${regData.email}): ${err.message}`);
  }

  // 2. Player notifications (from players_data array)
  const players = Array.isArray(regData.players_data) ? regData.players_data : [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (!player?.email) {
      console.log(`[Email] ⚠️  Player ${i + 1} has no email — skipping`);
      continue;
    }
    const key = `player-${player.email}`;
    if (sentTo.has(key)) continue;
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
