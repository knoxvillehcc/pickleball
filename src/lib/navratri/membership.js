/**
 * ═══════════════════════════════════════════════════════════════════
 * Navratri Membership — Odoo member sync & verification
 * ═══════════════════════════════════════════════════════════════════
 *
 * Syncs General and Pioneer members from Odoo into a local cache
 * for fast lookup during OTP verification and checkout.
 *
 * Membership detection:
 *   - Queries Odoo `sale.subscription` (or equivalent membership model)
 *   - Filters by membership year and active status
 *   - Categorizes as 'general' or 'pioneer' based on product/plan
 *
 * Reuses: odooClient.js (getCredentials, odooAuth, odooCall)
 */

import { getCredentials, odooAuth, odooCall } from '@/lib/odooClient';
import * as db from './db.js';

// ── Odoo Member Sync ─────────────────────────────────────────────────────────

/**
 * Sync active members from Odoo for a specific event/year.
 *
 * Strategy:
 *   1. Fetch all partners with an active membership tag or subscription
 *   2. Determine General vs Pioneer from the membership product/tag
 *   3. Upsert into navratri_members_cache
 *
 * @param {number} eventId       - The navratri_events.id
 * @param {number} membershipYear - e.g. 2026
 * @returns {{ synced: number, generals: number, pioneers: number }}
 */
export async function syncMembersFromOdoo(eventId, membershipYear) {
  const creds = await getCredentials();
  const uid   = await odooAuth(creds);

  let synced = 0;
  let generals = 0;
  let pioneers = 0;

  // Strategy 1: Search by membership subscription/invoices
  // Look for partners who have paid membership invoices for the year
  try {
    // Find membership products (adjust these names to match your Odoo config)
    const memberProducts = await odooCall(creds, uid, 'product.product', 'search_read', [
      [['name', 'ilike', 'member']]
    ], { fields: ['id', 'name'], limit: 50 });

    console.log('[navratri/membership] Found products:', memberProducts.map(p => `${p.id}: ${p.name}`));

    const generalProductIds = [];
    const pioneerProductIds = [];

    for (const prod of memberProducts) {
      const nameLower = prod.name.toLowerCase();
      if (nameLower.includes('pioneer')) {
        pioneerProductIds.push(prod.id);
      } else if (nameLower.includes('general') || nameLower.includes('member')) {
        generalProductIds.push(prod.id);
      }
    }

    console.log('[navratri/membership] General product IDs:', generalProductIds, 'Pioneer product IDs:', pioneerProductIds);

    // Widen date range: catch memberships invoiced up to 6 months before the year
    const yearStart = `${membershipYear - 1}-07-01`;
    const yearEnd   = `${membershipYear}-12-31`;

    console.log('[navratri/membership] Searching invoices from', yearStart, 'to', yearEnd);

    const invoiceLines = await odooCall(creds, uid, 'account.move.line', 'search_read', [
      [
        ['move_id.move_type', '=', 'out_invoice'],
        ['move_id.state', '=', 'posted'],
        ['move_id.payment_state', 'in', ['paid', 'in_payment']],
        ['product_id', 'in', [...generalProductIds, ...pioneerProductIds]],
        ['move_id.invoice_date', '>=', yearStart],
        ['move_id.invoice_date', '<=', yearEnd],
      ]
    ], {
      fields: ['partner_id', 'product_id'],
      limit: 2000,
    });

    console.log('[navratri/membership] Found', invoiceLines.length, 'invoice lines');

    // Deduplicate by partner and determine membership type
    // Pioneer takes precedence over General
    const memberMap = new Map();

    for (const line of invoiceLines) {
      if (!line.partner_id) continue;
      const partnerId = line.partner_id[0];
      const productId = line.product_id?.[0];

      const isPioneer = pioneerProductIds.includes(productId);
      const existing = memberMap.get(partnerId);

      if (!existing || isPioneer) {
        memberMap.set(partnerId, {
          odoo_partner_id: partnerId,
          name: line.partner_id[1],
          membership_type: isPioneer ? 'pioneer' : 'general',
        });
      }
    }

    // Fetch full partner details for all members
    const partnerIds = Array.from(memberMap.keys());
    if (partnerIds.length > 0) {
      const partners = await odooCall(creds, uid, 'res.partner', 'read', [partnerIds], {
        fields: ['id', 'name', 'phone', 'email'],
      });

      for (const partner of partners) {
        const member = memberMap.get(partner.id);
        if (!member) continue;

        const phone = partner.phone || '';
        const email = partner.email || '';

        await db.upsertMember({
          event_id: eventId,
          odoo_partner_id: partner.id,
          membership_type: member.membership_type,
          name: partner.name,
          phone: phone.replace(/\D/g, ''), // Store digits only
          email,
          synced_at: new Date().toISOString(),
        });

        synced++;
        if (member.membership_type === 'pioneer') pioneers++;
        else generals++;
      }
    }
  } catch (err) {
    console.error('[navratri/membership] Sync failed:', err.message);
    throw err;
  }

  return { synced, generals, pioneers };
}


// ── Membership Verification ──────────────────────────────────────────────────

/**
 * Verify a person's membership by phone number.
 *
 * Priority:
 *   1. Check local cache first (fast)
 *   2. Fall back to live Odoo search (slow, but catches recent additions)
 *
 * @param {number} eventId
 * @param {string} phone     - Phone number (will be cleaned to digits)
 * @returns {{ found: boolean, member: object|null, source: string }}
 */
export async function verifyMembership(eventId, phone) {
  const cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 7) {
    return { found: false, member: null, source: 'invalid_phone' };
  }

  // 1. Check local cache
  const cached = await db.getMemberByPhone(eventId, cleanPhone);
  if (cached && cached.length > 0) {
    return {
      found: true,
      member: cached[0],
      allMatches: cached,
      source: 'cache',
    };
  }

  // 2. Fall back to live Odoo search
  try {
    const creds = await getCredentials();
    const uid   = await odooAuth(creds);

    const partners = await odooCall(creds, uid, 'res.partner', 'search_read', [
      [['phone', 'ilike', cleanPhone]]
    ], {
      fields: ['id', 'name', 'phone', 'email'],
      limit: 5,
    });

    if (partners.length === 0) {
      return { found: false, member: null, source: 'odoo_not_found' };
    }

    // Check if any of these partners have an active membership
    const event = await db.getEventById(eventId);
    const membershipYear = event?.membership_year || new Date().getFullYear();

    for (const partner of partners) {
      const memberType = await checkOdooMembershipType(creds, uid, partner.id, membershipYear);
      if (memberType) {
        // Cache for next time
        const member = await db.upsertMember({
          event_id: eventId,
          odoo_partner_id: partner.id,
          membership_type: memberType,
          name: partner.name,
          phone: (partner.phone || '').replace(/\D/g, ''),
          email: partner.email || '',
          synced_at: new Date().toISOString(),
        });

        return { found: true, member, source: 'odoo_live' };
      }
    }

    return { found: false, member: null, source: 'odoo_no_membership' };

  } catch (err) {
    console.error('[navratri/membership] Live Odoo verify failed:', err.message);
    return { found: false, member: null, source: 'odoo_error', error: err.message };
  }
}

/**
 * Check a partner's membership type for a specific year in Odoo.
 * Returns 'general', 'pioneer', or null.
 */
async function checkOdooMembershipType(creds, uid, partnerId, membershipYear) {
  const yearStart = `${membershipYear}-01-01`;
  const yearEnd   = `${membershipYear}-12-31`;

  try {
    const invoiceLines = await odooCall(creds, uid, 'account.move.line', 'search_read', [
      [
        ['partner_id', '=', partnerId],
        ['move_id.move_type', '=', 'out_invoice'],
        ['move_id.state', '=', 'posted'],
        ['move_id.payment_state', 'in', ['paid', 'in_payment']],
        ['move_id.invoice_date', '>=', yearStart],
        ['move_id.invoice_date', '<=', yearEnd],
      ]
    ], {
      fields: ['product_id'],
      limit: 20,
    });

    for (const line of invoiceLines) {
      if (!line.product_id) continue;
      const productName = line.product_id[1]?.toLowerCase() || '';
      if (productName.includes('pioneer')) return 'pioneer';
      if (productName.includes('general') || productName.includes('member')) return 'general';
    }

    return null;
  } catch (err) {
    console.warn(`[navratri/membership] checkOdooMembershipType failed for partner ${partnerId}:`, err.message);
    return null;
  }
}


// ── Member Search ────────────────────────────────────────────────────────────

/**
 * Search members by name, phone, or email (from local cache).
 */
export async function searchMembers(eventId, searchTerm) {
  return db.searchMembers(eventId, searchTerm);
}


// ── Duplicate Linking ────────────────────────────────────────────────────────

/**
 * Link two Odoo partner IDs as the same person (duplicate resolution).
 * The primary_odoo_id is the "canonical" identity.
 * Entitlement checks will merge linked members.
 */
export async function linkMembers(eventId, primaryOdooId, linkedOdooId, reason, linkedBy) {
  return db.insert('navratri_member_links', {
    event_id:       eventId,
    primary_odoo_id: primaryOdooId,
    linked_odoo_id:  linkedOdooId,
    reason,
    linked_by:      linkedBy,
  });
}

/**
 * Unlink previously linked members.
 */
export async function unlinkMembers(eventId, primaryOdooId, linkedOdooId, reason, unlinkedBy) {
  return db.update('navratri_member_links',
    `event_id=eq.${eventId}&primary_odoo_id=eq.${primaryOdooId}&linked_odoo_id=eq.${linkedOdooId}`,
    {
      unlinked_at: new Date().toISOString(),
      unlinked_by: unlinkedBy,
      unlink_reason: reason,
    }
  );
}

/**
 * Get all linked partner IDs for a given member (including self).
 * Used to merge entitlements across linked identities.
 */
export async function getLinkedPartnerIds(eventId, odooPartnerId) {
  const ids = new Set([odooPartnerId]);

  // Find links where this partner is primary or linked
  const links = await db.query('navratri_member_links',
    `event_id=eq.${eventId}&unlinked_at=is.null&or=(primary_odoo_id.eq.${odooPartnerId},linked_odoo_id.eq.${odooPartnerId})`
  );

  for (const link of links) {
    ids.add(link.primary_odoo_id);
    ids.add(link.linked_odoo_id);
  }

  return Array.from(ids);
}
