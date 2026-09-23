'use client';
import { useState, useEffect } from 'react';

// ── Theme Hook ───────────────────────────────────────────────────────────────
function usePreferredTheme() {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    setTheme(mq.matches ? 'light' : 'dark');
    const handler = (e) => setTheme(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return theme;
}

// ── Colors ───────────────────────────────────────────────────────────────────
const palette = (theme) => {
  const dark = theme === 'dark';
  return {
    bg:       dark ? '#0a0a0a' : '#FAFAFA',
    surface:  dark ? '#141414' : '#FFFFFF',
    card:     dark ? '#1a1a1a' : '#F5F5F5',
    border:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text:     dark ? '#F5F5F5' : '#171717',
    heading:  dark ? '#FFFFFF' : '#0a0a0a',
    muted:    dark ? '#A3A3A3' : '#525252',
    accent:   '#FF6B35',
    accentBg: dark ? 'rgba(255,107,53,0.08)' : 'rgba(255,107,53,0.06)',
    gold:     '#FFD700',
    link:     dark ? '#60A5FA' : '#2563EB',
  };
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PrivacyPolicyPage() {
  const theme = usePreferredTheme();
  const c = palette(theme);
  const lastUpdated = 'September 23, 2026';

  const containerStyle = {
    minHeight: '100vh',
    background: c.bg,
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: c.text,
    WebkitFontSmoothing: 'antialiased',
  };

  const innerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '48px 24px 80px',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '48px',
    paddingBottom: '32px',
    borderBottom: `1px solid ${c.border}`,
  };

  const h1Style = {
    fontSize: '32px',
    fontWeight: 800,
    color: c.heading,
    margin: '0 0 8px',
    letterSpacing: '-0.02em',
  };

  const subtitleStyle = {
    fontSize: '15px',
    color: c.muted,
    margin: '0 0 4px',
  };

  const sectionStyle = {
    marginBottom: '40px',
  };

  const h2Style = {
    fontSize: '20px',
    fontWeight: 700,
    color: c.heading,
    margin: '0 0 16px',
    letterSpacing: '-0.01em',
  };

  const pStyle = {
    fontSize: '15px',
    lineHeight: 1.8,
    color: c.text,
    margin: '0 0 12px',
  };

  const ulStyle = {
    margin: '8px 0 16px',
    paddingLeft: '24px',
  };

  const liStyle = {
    fontSize: '15px',
    lineHeight: 1.8,
    color: c.text,
    marginBottom: '4px',
  };

  const calloutStyle = {
    background: c.accentBg,
    border: `1px solid rgba(255,107,53,0.15)`,
    borderRadius: '12px',
    padding: '20px 24px',
    margin: '16px 0',
  };

  const contactCardStyle = {
    background: c.card,
    borderRadius: '16px',
    padding: '24px',
    border: `1px solid ${c.border}`,
  };

  const linkStyle = {
    color: c.link,
    textDecoration: 'none',
    fontWeight: 500,
  };

  const dividerStyle = {
    border: 'none',
    borderTop: `1px solid ${c.border}`,
    margin: '40px 0',
  };

  const strongStyle = {
    color: c.heading,
    fontWeight: 600,
  };

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <header style={headerStyle}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🪔</div>
          <h1 style={h1Style}>Privacy Policy</h1>
          <p style={subtitleStyle}>Hindu Community Center Knoxville</p>
          <p style={{ ...subtitleStyle, fontSize: '13px' }}>Last updated: {lastUpdated}</p>
        </header>

        {/* ── 1. Introduction ──────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Introduction</h2>
          <p style={pStyle}>
            Hindu Community Center Knoxville ("HCC," "we," "our," or "us") operates the website
            and application located at <span style={strongStyle}>monkfish-app-otsj3.ondigitalocean.app</span> (the "Service").
            This Privacy Policy explains how we collect, use, disclose, and safeguard your personal
            information when you use our Service, including when you purchase event tickets,
            register for memberships, or interact with us via SMS text messages.
          </p>
          <p style={pStyle}>
            By using our Service, you consent to the data practices described in this policy.
            If you do not agree with the terms of this Privacy Policy, please do not use the Service.
          </p>
        </section>

        {/* ── 2. Information We Collect ─────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Information We Collect</h2>
          <p style={pStyle}>We may collect the following categories of personal information:</p>
          <ul style={ulStyle}>
            <li style={liStyle}><span style={strongStyle}>Contact Information:</span> Name, email address, and phone number</li>
            <li style={liStyle}><span style={strongStyle}>Transaction Information:</span> Ticket purchase details, order numbers, payment amounts, and membership status</li>
            <li style={liStyle}><span style={strongStyle}>Verification Data:</span> One-time passcodes (OTPs) sent via SMS for phone number verification (stored as secure hashes, never in plaintext)</li>
            <li style={liStyle}><span style={strongStyle}>Usage Data:</span> IP address, browser type, and interaction logs for security and fraud prevention</li>
          </ul>
        </section>

        {/* ── 3. SMS / Text Messaging ──────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>3. SMS / Text Messaging Policy</h2>
          <div style={calloutStyle}>
            <p style={{ ...pStyle, margin: 0 }}>
              <span style={strongStyle}>Important:</span> By providing your phone number during ticket purchase or registration,
              you expressly consent to receive transactional SMS messages from Hindu Community Center Knoxville
              related to your event participation.
            </p>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, color: c.heading, margin: '24px 0 12px' }}>
            Types of SMS Messages We Send
          </h3>
          <p style={pStyle}>We send the following categories of transactional text messages:</p>
          <ul style={ulStyle}>
            <li style={liStyle}>
              <span style={strongStyle}>Phone Verification (OTP):</span> A one-time passcode to verify your phone number during the ticket purchase process.
              These codes expire after 30 minutes.
            </li>
            <li style={liStyle}>
              <span style={strongStyle}>Ticket Confirmation:</span> Order confirmation with a secure link to view and access your digital tickets (including QR codes for gate entry).
            </li>
            <li style={liStyle}>
              <span style={strongStyle}>Event Reminders:</span> Reminders sent before event dates with date, time, and venue details.
            </li>
            <li style={liStyle}>
              <span style={strongStyle}>Event Announcements:</span> Important updates such as schedule changes, weather alerts, or other critical event information.
            </li>
          </ul>

          <h3 style={{ fontSize: '16px', fontWeight: 600, color: c.heading, margin: '24px 0 12px' }}>
            Message Frequency
          </h3>
          <p style={pStyle}>
            Message frequency varies based on your event participation. You will typically receive:
          </p>
          <ul style={ulStyle}>
            <li style={liStyle}>1 OTP verification message per ticket purchase</li>
            <li style={liStyle}>1 ticket confirmation message per order</li>
            <li style={liStyle}>1 reminder message per event date you have tickets for</li>
            <li style={liStyle}>Occasional event update messages (only when critical information needs to be communicated)</li>
          </ul>

          <h3 style={{ fontSize: '16px', fontWeight: 600, color: c.heading, margin: '24px 0 12px' }}>
            Opting Out of SMS Messages
          </h3>
          <div style={calloutStyle}>
            <p style={{ ...pStyle, margin: 0 }}>
              You can opt out of receiving SMS messages at any time by replying <span style={{ ...strongStyle, color: c.accent }}>STOP</span> to
              any message you receive from us. After opting out, you will receive one final confirmation
              message and no further SMS messages will be sent.
            </p>
          </div>
          <p style={pStyle}>
            You may also opt out by contacting us at the email address listed in the Contact section below.
            Please note that opting out of SMS may affect your ability to receive important
            event-related notifications, including ticket access links and schedule changes.
          </p>

          <h3 style={{ fontSize: '16px', fontWeight: 600, color: c.heading, margin: '24px 0 12px' }}>
            SMS Costs
          </h3>
          <p style={pStyle}>
            Message and data rates may apply depending on your mobile carrier and plan.
            Hindu Community Center Knoxville does not charge any fees for sending SMS messages,
            but standard carrier charges may apply to messages you receive.
          </p>
        </section>

        <hr style={dividerStyle} />

        {/* ── 4. How We Use Your Information ───────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>4. How We Use Your Information</h2>
          <p style={pStyle}>We use the information we collect to:</p>
          <ul style={ulStyle}>
            <li style={liStyle}>Process and fulfill event ticket purchases</li>
            <li style={liStyle}>Verify your identity via phone number verification (OTP)</li>
            <li style={liStyle}>Send transactional SMS messages related to your ticket orders</li>
            <li style={liStyle}>Send event reminders and critical updates</li>
            <li style={liStyle}>Process payments and refunds</li>
            <li style={liStyle}>Manage membership records</li>
            <li style={liStyle}>Detect fraud and protect against unauthorized access</li>
            <li style={liStyle}>Comply with legal obligations</li>
          </ul>
          <p style={pStyle}>
            We do <span style={strongStyle}>not</span> sell, rent, or share your phone number or personal information
            with third parties for marketing purposes. Your phone number is used exclusively for
            transactional communications related to your event participation with Hindu Community Center Knoxville.
          </p>
        </section>

        {/* ── 5. Third-Party Services ──────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Third-Party Service Providers</h2>
          <p style={pStyle}>
            We use the following third-party services to operate our Service. These providers
            have their own privacy policies governing their use of your data:
          </p>
          <ul style={ulStyle}>
            <li style={liStyle}>
              <span style={strongStyle}>Twilio</span> — SMS delivery and phone number verification.{' '}
              <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>Twilio Privacy Policy</a>
            </li>
            <li style={liStyle}>
              <span style={strongStyle}>Stripe</span> — Payment processing.{' '}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>Stripe Privacy Policy</a>
            </li>
            <li style={liStyle}>
              <span style={strongStyle}>Supabase</span> — Database hosting and authentication.{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>Supabase Privacy Policy</a>
            </li>
          </ul>
          <p style={pStyle}>
            We share only the minimum necessary information with these providers
            to deliver the services described in this policy.
          </p>
        </section>

        {/* ── 6. Data Security ─────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Data Security</h2>
          <p style={pStyle}>
            We implement industry-standard security measures to protect your personal information:
          </p>
          <ul style={ulStyle}>
            <li style={liStyle}>OTP verification codes are stored as bcrypt-hashed values and are never retained in plaintext</li>
            <li style={liStyle}>OTP sessions automatically expire after 30 minutes</li>
            <li style={liStyle}>Rate limiting is enforced to prevent abuse (maximum 3 OTP requests per phone number per 10-minute window)</li>
            <li style={liStyle}>All communications between your browser and our servers are encrypted using HTTPS/TLS</li>
            <li style={liStyle}>Payment information is handled entirely by Stripe and is never stored on our servers</li>
            <li style={liStyle}>Audit logging tracks all verification and administrative actions</li>
          </ul>
        </section>

        {/* ── 7. Data Retention ────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Data Retention</h2>
          <p style={pStyle}>
            We retain your personal information only for as long as necessary to provide our services
            and fulfill the purposes outlined in this policy:
          </p>
          <ul style={ulStyle}>
            <li style={liStyle}><span style={strongStyle}>OTP verification data:</span> Automatically deleted after session expiration (30 minutes)</li>
            <li style={liStyle}><span style={strongStyle}>Transaction records:</span> Retained for the duration required by applicable tax and accounting regulations</li>
            <li style={liStyle}><span style={strongStyle}>Contact information:</span> Retained as long as you have an active ticket order or membership with us</li>
          </ul>
          <p style={pStyle}>
            You may request deletion of your personal data at any time by contacting us using the information below.
          </p>
        </section>

        {/* ── 8. Your Rights ──────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>8. Your Rights</h2>
          <p style={pStyle}>You have the right to:</p>
          <ul style={ulStyle}>
            <li style={liStyle}>Access the personal information we hold about you</li>
            <li style={liStyle}>Request correction of inaccurate information</li>
            <li style={liStyle}>Request deletion of your personal data</li>
            <li style={liStyle}>Opt out of SMS communications at any time by replying STOP</li>
            <li style={liStyle}>Withdraw consent for data processing (which may limit your ability to use the Service)</li>
          </ul>
          <p style={pStyle}>
            To exercise any of these rights, please contact us using the information provided below.
          </p>
        </section>

        {/* ── 9. Children's Privacy ───────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>9. Children's Privacy</h2>
          <p style={pStyle}>
            Our Service is not directed to individuals under the age of 13. We do not knowingly
            collect personal information from children under 13. If we learn that we have collected
            personal information from a child under 13, we will take steps to delete such information promptly.
          </p>
        </section>

        {/* ── 10. Changes to This Policy ──────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>10. Changes to This Policy</h2>
          <p style={pStyle}>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page
            with an updated "Last updated" date. Your continued use of the Service after any changes
            constitutes acceptance of the revised policy.
          </p>
        </section>

        <hr style={dividerStyle} />

        {/* ── Contact ─────────────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>11. Contact Us</h2>
          <p style={pStyle}>
            If you have questions about this Privacy Policy, your personal data, or wish to opt out of
            SMS communications, please contact us:
          </p>
          <div style={contactCardStyle}>
            <p style={{ ...pStyle, margin: '0 0 8px' }}>
              <span style={strongStyle}>Hindu Community Center Knoxville</span>
            </p>
            <p style={{ ...pStyle, margin: '0 0 4px', fontSize: '14px', color: c.muted }}>
              📍 8580 Hickory Creek Rd, Lenoir City, TN 37772
            </p>
            <p style={{ ...pStyle, margin: '0 0 4px', fontSize: '14px', color: c.muted }}>
              ✉️ Email: <a href="mailto:knoxvillehcc@gmail.com" style={linkStyle}>knoxvillehcc@gmail.com</a>
            </p>
          </div>
        </section>

        {/* ── Back Link ───────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <a href="/navratri-2026" style={{
            ...linkStyle,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            padding: '10px 20px',
            borderRadius: '10px',
            background: c.card,
            border: `1px solid ${c.border}`,
            transition: 'all 0.2s',
          }}>
            ← Back to Navratri 2026
          </a>
        </div>
      </div>
    </div>
  );
}
