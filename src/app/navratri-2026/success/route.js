/**
 * Success page after Stripe checkout or Pioneer claim
 * URL: /navratri-2026/success?order=NV-2026-000001
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderNum = searchParams.get('order') || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Navratri 2026 — Order Confirmed!</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; background: #0f0d13; color: #F8FAFC; font-family: 'Inter', sans-serif;
      display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { max-width: 440px; width: 100%; background: #1a1625; border-radius: 24px;
      border: 1px solid rgba(139,30,63,0.25); overflow: hidden; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #FF6B35, #8B1E3F); padding: 40px 24px; }
    .check { width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 40px; }
    h1 { font-size: 28px; font-weight: 900; }
    .sub { font-size: 15px; opacity: 0.85; margin-top: 8px; }
    .body { padding: 32px 24px; }
    .order { font-size: 20px; font-weight: 800; color: #FFD700; margin-bottom: 8px; }
    .info { color: #94A3B8; font-size: 14px; line-height: 1.8; margin-bottom: 24px; }
    .btn { display: inline-block; padding: 16px 40px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #FF6B35, #FF9933); color: white;
      font-weight: 800; font-size: 16px; text-decoration: none; cursor: pointer; }
    .note { padding: 20px 24px; border-top: 1px solid rgba(139,30,63,0.2); }
    .note p { color: #64748B; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="check">✅</div>
      <h1>Order Confirmed!</h1>
      <p class="sub">Your Navratri 2026 tickets are ready</p>
    </div>
    <div class="body">
      <div class="order">${orderNum}</div>
      <p class="info">
        Your tickets and QR codes have been sent to your<br>
        <strong style="color:#F8FAFC">email</strong> and <strong style="color:#F8FAFC">phone (SMS)</strong>.<br><br>
        Open the ticket link on your phone at the gate.<br>
        The QR code refreshes every 30 seconds for security.
      </p>
      <a href="/navratri-2026" class="btn">Back to Event Page</a>
    </div>
    <div class="note">
      <p>Hindu Community Center Knoxville • 8580 Hickory Creek Rd, Lenoir City, TN</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
