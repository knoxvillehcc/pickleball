<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HCC Standard Form & Registration Architecture Specifications

Every new registration form, admin portal, or event management tool created in this repository MUST strictly follow these standard rules without needing the user to repeat them:

## 1. Date & Time Standards
- **Strict Format**: Every user-facing date (public forms, date selector cards, admin tables, CSV/PDF/Excel exports, email receipts, and reports) MUST use `MM-DD-YYYY` format (e.g., `10-11-2026`).
- **Storage**: ISO strings or standard date types (`YYYY-MM-DD` or UTC timestamps) internally in Supabase/PostgreSQL, but always formatted as `MM-DD-YYYY` when displayed or exported.

## 2. Visual Aesthetics & Icons
- **No AI / Cartoon Emojis**: Never use generic or childish emojis (such as 🎪, 🪔, 🏆, 📺, 🏦, 🔴, 🟢, ❌, ⚠️, ⚙️, etc.) in titles, cards, tables, buttons, or error banners.
- **Crisp SVG Icons**: Strictly use clean inline SVG icons (Lucide / Heroicons style) with consistent stroke widths (typically `2` or `2.5`).
- **Professional Executive Styling**: Use modern typography (Inter), curated color palettes (saffron, slate, emerald, amber, sky), accessible contrast, subtle glassmorphism/card elevation, and clean pill badges (`Paid`, `Pending`, `Confirmed`).

## 3. Public Landing Page Integration (`src/app/page.js`)
- **Module Tile**: Every active registration form must have a corresponding card tile in `PublicLanding()` on `src/app/page.js` (`dashboard.knoxvillemandir.org` / `dashboard.knoxvillehcc.org`).
- **Automatic Expiration & Unpublish**: Each event must define its final day cutoff timestamp (`YYYY-MM-DDT23:59:59-04:00`). At 11:59 PM EST on the last day, the tile must automatically disappear from the public landing page, and the public registration endpoint must automatically return `is_published: false` and reject new registrations with a closed notice.

## 4. Admin Management Dashboard Features
Every admin portal for a form MUST include:
- **KPI Summary Cards**: Total Registrations, Paid Count, Pending Count, Total Revenue, and relevant event metrics.
- **Search & Filtering**: Real-time debounced search (matching business, contact, email, phone, and registration number) and status filter pills.
- **Public Link Management**: 1-click "Public Link" copy button with visual feedback and preview link.
- **Publish / Unpublish Toggle**: Live toggle to manually control registration availability.
- **Export Tools**: CSV export, Master Festival / Event Roster Report, and printable PDF export with `MM-DD-YYYY` dates.
- **Row-Level Actions**: Resend confirmation email, delete registration (with confirmation), and full/partial refund processing.

## 5. End-of-Event Odoo General Entry Sync
Every event form MUST include an option at the end of the event to post a balanced General Journal Entry to Odoo:
- **Journal**: Post to Odoo `MISC` journal (or general operations journal) using `account.move` with `move_type: 'entry'`.
- **Analytic Account**: Every line MUST be tagged with the event's Analytic Account (e.g., `Navratri 2026`) via `analytic_distribution: { [analyticId]: 100 }`.
- **Accounts**:
  - **Credit Revenue**: Account `2007` (Booth/Vendor Income) for vendor booths, or Account `2005` (Sponsorship/Ads Income) for LED screen ads and sponsorships.
  - **Debit Bank**: Account `101401` (HCC Bank / Outstanding Receipts) for net funds.
  - **Debit CC Processing Fees**: Account `950` (CC Processing Fees) for Stripe fees.
- **Strict Duplicate Prevention**:
  - Before creating any entry in Odoo, check if an `account.move` with the event's unique reference (e.g. `ref: NAVRATRI-2026-VENDORS-FINAL` or `ref: NAVRATRI-2026-LED-ADS-FINAL`) and `state != 'cancel'` already exists.
  - Block duplicate submissions with an explicit warning showing the existing entry name and date.
  - Persist sync status in Supabase settings so the admin dashboard permanently displays a verified badge: `✓ Posted to Odoo: MISC/2026/XXXXX ($XX,XXX.00)`.

## 6. Event Expenses & Settlement Integration
Whenever a new event or form is created in this repository:
- **Auto-Registration in Event Expenses**: The event MUST be automatically discoverable in the Universal Expense Hub (`/accounting/expenses`) so volunteers and coordinators can record event expenses without manual code configuration.
- **Dedicated Permissions**: Access control for `expenses` MUST remain independent from Bank Statements (`stripe`), Membership (`reports`), and Executive P&L (`pnl`), ensuring expense clerks only see receipt entry and cannot access sensitive bank accounts.
- **Editable with Audit**: All expenses must be editable at any time. If edited after posting to Odoo, they must be flagged with `adjustment_pending` for treasurer review.
- **Bank Reconciliation Support**: Payment method fields MUST capture Check # (for checks) or Last 4 (for card swipes) credited to Account `101401` so Odoo bank feed reconciliation matches lines automatically.

