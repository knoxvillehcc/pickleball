'use client';

import React, { useState } from 'react';

// Crisp SVG Icons (Strictly NO cartoon emojis per HCC specifications)
function BookOpenIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function ShoppingCartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function DollarSignIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function PieChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function HelpCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function UserGuideTab({ setTopTab, card, btnPrimary, btnSecondary }) {
  const [openFaq, setOpenFaq] = useState({});

  const toggleFaq = (idx) => {
    setOpenFaq(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const reportModules = [
    {
      id: 'statement',
      title: 'Bank Statement (Overview)',
      tagline: 'Raw Stripe transaction ledger & daily credit card intake',
      color: '#0284C7',
      icon: <BankIcon />,
      purpose: 'Gives the auditor or treasurer the exact timeline of every credit card charge, processing fee, refund, and net credit created in Stripe.',
      whatItShows: [
        'Gross credit card volume, processing fees, total refunds, and net deposit amount.',
        'Toggle between "Daily Summary" (one line per day) and "All Transactions" (every customer card swipe/online payment).',
        'Customer name, email, card brand & last 4 digits, charge date and timestamp.',
        'Inline red refund rows showing the exact refund date, refund reason, and product name.'
      ],
      bestFor: 'Daily verification of credit card collections, reviewing effective processing fee rates, and auditing specific customer receipts.'
    },
    {
      id: 'deposits',
      title: 'Deposit Breakdown',
      tagline: 'Categorized financial summary of each bank deposit',
      color: '#F59E0B',
      icon: <LayersIcon />,
      purpose: 'Categorizes bank payouts into financial revenue streams (Temple Puja, Snacks, Hall Rental, IndiaFest, Navratri, Memberships) so bookkeepers know where money should be credited.',
      whatItShows: [
        'Every Stripe Payout (arrival date at HCC bank account) with gross, refunds, fees, and net.',
        'Breakdown of revenue by category per payout and across the entire selected date range.',
        'Negative refund categories (e.g. IndiaFest Vendor: -$351.00) deducted directly from the deposit.',
        'Unmatched transactions that require manual Odoo tagging.'
      ],
      bestFor: 'Posting monthly revenue journal entries to Odoo and preparing quarterly P&L category reports.'
    },
    {
      id: 'stripedeposit',
      title: 'Stripe Deposit (POS Match)',
      tagline: 'Direct reconciliation between bank deposits & POS register items',
      color: '#10B981',
      icon: <ShoppingCartIcon />,
      purpose: 'Solves the mystery of "Which products sold on iPad 1 and iPad 2 are inside this bank deposit?". Matches each Stripe deposit to the exact in-person register orders and products.',
      whatItShows: [
        'Deposit-first hierarchy: Click any deposit to expand its contents.',
        'POS Product Summary table: Exact count and dollar value of products sold (Navratri Daily Passes, Aarti collections, Snacks, Puja items).',
        'Receipt-level drilldown: Order #, timestamp, register name (IPAD-1, IPAD-2), customer, card last 4.',
        'Online vs. In-person separation: Distinguishes register swipes from online donations and web passes in the same payout.',
        'Odoo Account 101401 Clearance Badges: Confirms whether the bank feed matches the payout.'
      ],
      bestFor: 'Festival reconciliations (Navratri, Diwali, IndiaFest), checking register session accuracy, and resolving returned items.'
    },
    {
      id: 'cashcheck',
      title: 'Cash / Check Receipts',
      tagline: 'Offline donations, checks, and cash register logs',
      color: '#8B5CF6',
      icon: <DollarSignIcon />,
      purpose: 'Tracks all non-Stripe revenue collected at the temple or mailed in — including check numbers, donor names, cash register collections, and deposit slips.',
      whatItShows: [
        'Check numbers, check dates, donor names, purpose/category, and amounts.',
        'Cash collections grouped by date, POS register session, and category.',
        'Deposit status indicating whether the funds were banked and cleared.'
      ],
      bestFor: 'Weekly cash counting team reconciliation, check deposit preparation, and offline donor tax receipts.'
    },
    {
      id: 'invoices',
      title: 'Invoices (Non-POS)',
      tagline: 'Billed memberships, sponsorships, and pledged contributions',
      color: '#EC4899',
      icon: <FileTextIcon />,
      purpose: 'Displays invoices issued directly in Odoo for corporate sponsorships, annual pioneer donors, hall rentals, and festival LED ads that were billed outside the POS register.',
      whatItShows: [
        'Invoice number, issue date, due date, customer, total amount, and unpaid balance.',
        'Payment status: Paid, Partial, or Unpaid.',
        'Originating order references (e.g. S00288, LED Sponsorships).'
      ],
      bestFor: 'Tracking outstanding receivables, following up on unpaid sponsor pledges, and hall rental security deposits.'
    },
    {
      id: 'fullreport',
      title: 'Full Report (Master P&L)',
      tagline: 'Consolidated executive view across all channels',
      color: '#6366F1',
      icon: <PieChartIcon />,
      purpose: 'Consolidates all revenue channels (Stripe Credit Cards, Cash, Checks, and Invoices) into a single unified financial report.',
      whatItShows: [
        'Total income across all payment methods.',
        'Side-by-side comparison of Cash vs Check vs Credit Card intake.',
        'Master PDF export ready for presentation to the Board of Trustees.'
      ],
      bestFor: 'Monthly Board of Trustees meetings, annual general meetings (AGM), and annual CPA tax preparation.'
    }
  ];

  const faqs = [
    {
      q: 'Why does the Gross Amount differ from the Net Deposited in our bank account?',
      a: 'Credit card processors (Stripe) deduct their processing fees (typically 2.2% to 2.9% + 30¢) and any returns before transferring money to HCC’s bank account. The fundamental accounting formula used across this dashboard is: Gross Card Volume - Returns/Refunds - Stripe Processing Fees = Net Amount Deposited.'
    },
    {
      q: 'Why are refunds placed on the date they were refunded instead of the original sale date?',
      a: 'To guarantee that your bank statement balances to the exact cent. If someone bought an IndiaFest pass on August 10 and was refunded on August 22, Stripe deducts the $351.00 from the August 22 bank deposit. Posting the refund on August 22 ensures the August 22 bank payout ties out to the exact penny in Odoo and your bank statement.'
    },
    {
      q: 'How do I see what products were sold on iPad 1 vs iPad 2 for a festival?',
      a: 'Go to the "Stripe Deposit" tab. Click on the bank deposit date you want to inspect to expand it. Under "POS Register Product Sales", click "Show Individual Receipts". You will see each receipt with its register name (e.g. IPAD-1, IPAD-2), customer name, timestamp, and purchased products.'
    },
    {
      q: 'What does the green "Cleared in Odoo Bank Feed" badge mean?',
      a: 'It means the Stripe payout has been matched and reconciled against HCC’s primary checking account (Account 101401) in Odoo. A yellow "Pending" badge means the bank feed line has arrived in Stripe but is awaiting bank clearance in Odoo.'
    },
    {
      q: 'Which report should I use when preparing our monthly board report?',
      a: 'Use the "Full Report" tab for the master multi-channel summary, or the "Stripe Deposit" tab to show product-level breakdowns for specific major events like Navratri or IndiaFest.'
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ── HEADER BANNER ─────────────────────────────────────────────── */}
      <div style={{
        ...card,
        padding: '30px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(2, 132, 199, 0.05) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            padding: '12px',
            borderRadius: '12px',
            background: 'var(--accent)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpenIcon />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              Payment &amp; Bank Statement Reports Guide
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, lineHeight: '1.5', maxWidth: '850px' }}>
              Welcome to the HCC Financial Reconciliation Hub. This guide explains what each report displays, when to use it, how refund attribution works, and how to balance figures to the exact penny with Odoo General Ledger.
            </p>
          </div>
        </div>

        {/* Accounting Balancing Formula Bar */}
        <div style={{
          marginTop: '22px',
          padding: '12px 18px',
          borderRadius: '10px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Standard Reconciliation Rule
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-primary)', flexWrap: 'wrap' }}>
            <span style={{ color: '#0284C7' }}>Gross Volume</span>
            <span style={{ color: 'var(--text-muted)' }}>&minus;</span>
            <span style={{ color: '#EF4444' }}>Refunds / Returns</span>
            <span style={{ color: 'var(--text-muted)' }}>&minus;</span>
            <span style={{ color: '#F59E0B' }}>Stripe Fees</span>
            <span style={{ color: 'var(--text-muted)' }}>=</span>
            <span style={{ color: '#10B981', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)' }}>Net Bank Deposit</span>
          </div>
        </div>
      </div>

      {/* ── REPORT CARDS GRID ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>
          Report Modules Overview
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {reportModules.map(mod => (
            <div
              key={mod.id}
              style={{
                ...card,
                padding: '22px',
                borderTop: `4px solid ${mod.color}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ color: mod.color }}>{mod.icon}</div>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                    {mod.title}
                  </h4>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: mod.color, marginBottom: '12px' }}>
                  {mod.tagline}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
                  {mod.purpose}
                </p>

                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  What You Can Expect:
                </div>
                <ul style={{ margin: '0 0 16px 0', paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {mod.whatItShows.map((pt, pIdx) => (
                    <li key={pIdx} style={{ marginBottom: '4px' }}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: 'auto' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  <strong>Best For:</strong> {mod.bestFor}
                </div>
                <button
                  onClick={() => setTopTab(mod.id)}
                  style={{
                    ...btnSecondary,
                    width: '100%',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: mod.color,
                    borderColor: 'var(--border)'
                  }}
                >
                  <span>Open {mod.title}</span>
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SPECIAL SECTION: HOW REFUND TRACKING WORKS ─────────────────── */}
      <div style={{ ...card, padding: '24px', marginBottom: '32px', borderLeft: '4px solid #EF4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ color: '#EF4444' }}><RotateCcwIcon /></span>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            How Refunds &amp; Returns Work Across All Reports
          </h3>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>
          Whenever a payment is refunded in Stripe or through the admin portal, it is tracked with full product resolution:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              1. Exact Refund Date
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Refunds appear on the date the refund occurred so that the daily bank balance and monthly deposit tie out to the penny. The original sale date is also referenced.
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              2. Product / Service Identification
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Refunds automatically resolve to their item name (e.g. <em>India Fest Vendor</em>, <em>Navratri Pass</em>, <em>Pioneer Donor</em>) via Stripe Checkout sessions and Odoo order lines.
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              3. Visual Highlighting &amp; Exports
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Refund rows are clearly badged in red with negative amounts (<code>-$XX.XX</code>) and exported in dedicated CSV/PDF columns with the reason (e.g. <em>Duplicate</em>, <em>Customer Request</em>).
            </div>
          </div>
        </div>
      </div>

      {/* ── FAQ SECTION ───────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--accent)' }}><HelpCircleIcon /></span>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Frequently Asked Questions
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {faqs.map((f, idx) => {
            const isOpen = !!openFaq[idx];
            return (
              <div
                key={idx}
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  background: isOpen ? 'var(--bg-input)' : 'var(--bg-card)'
                }}
              >
                <div
                  onClick={() => toggleFaq(idx)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '600',
                    fontSize: '13.5px',
                    color: 'var(--text-primary)'
                  }}
                >
                  <span>{f.q}</span>
                  <div style={{ color: 'var(--text-muted)' }}>
                    <ChevronDownIcon open={isOpen} />
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RotateCcwIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}
