# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import logging

_logger = logging.getLogger(__name__)


class HccPickleballRegistration(models.Model):
    _name = 'hcc.pickleball.registration'
    _description = 'HCC Pickleball Registration'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'registration_date desc'
    _rec_name = 'registration_number'

    # ── Registration Identity ─────────────────────────────────────────────────
    registration_number = fields.Char(
        string='Registration Number',
        readonly=True,
        copy=False,
        index=True,
        default='New',
        tracking=True,
    )

    # ── Personal Information ──────────────────────────────────────────────────
    first_name = fields.Char(string='First Name', required=True, tracking=True)
    last_name = fields.Char(string='Last Name', required=True, tracking=True)
    full_name = fields.Char(
        string='Full Name',
        compute='_compute_full_name',
        store=True,
    )
    email = fields.Char(string='Email Address', required=True, tracking=True)
    phone = fields.Char(string='Phone Number', required=True, tracking=True)
    date_of_birth = fields.Date(string='Date of Birth', required=True)
    gender = fields.Selection(
        [('male', 'Male'), ('female', 'Female'), ('other', 'Other / Prefer not to say')],
        string='Gender',
        required=True,
    )

    # ── Address ───────────────────────────────────────────────────────────────
    street = fields.Char(string='Address', required=True)
    city = fields.Char(string='City', required=True)
    state_id = fields.Many2one(
        'res.country.state',
        string='State',
        required=True,
        domain="[('country_id.code', '=', 'US')]",
    )
    zip_code = fields.Char(string='Zip Code', required=True)

    # ── Emergency Contact ─────────────────────────────────────────────────────
    emergency_contact_name = fields.Char(
        string='Emergency Contact Name', required=True
    )
    emergency_contact_phone = fields.Char(
        string='Emergency Contact Phone', required=True
    )

    # ── Pickleball Specifics ──────────────────────────────────────────────────
    skill_level = fields.Selection(
        [
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced'),
        ],
        string='Skill Level',
        required=True,
        tracking=True,
    )
    partner_name = fields.Char(string='Partner Name (Optional)')
    special_notes = fields.Text(string='Special Notes / Requests')

    # ── Waiver ────────────────────────────────────────────────────────────────
    liability_accepted = fields.Boolean(
        string='Liability Waiver Accepted',
        required=True,
        tracking=True,
    )
    liability_accepted_date = fields.Datetime(
        string='Waiver Accepted Date',
        readonly=True,
    )

    # ── Event Snapshot ────────────────────────────────────────────────────────
    event_name = fields.Char(
        string='Event Name',
        default=lambda self: self.env['ir.config_parameter'].sudo().get_param(
            'hcc_pickleball.event_name', 'HCC Pickleball Tournament 2026'
        ),
    )
    event_date = fields.Date(
        string='Event Date',
    )
    event_time = fields.Char(string='Event Time')
    event_location = fields.Char(string='Event Location')

    # ── Payment ───────────────────────────────────────────────────────────────
    payment_status = fields.Selection(
        [
            ('pending', 'Pending Payment'),
            ('paid', 'Paid'),
            ('failed', 'Payment Failed'),
            ('refunded', 'Refunded'),
        ],
        string='Payment Status',
        default='pending',
        required=True,
        tracking=True,
        index=True,
    )
    amount_paid = fields.Float(
        string='Registration Fee',
        default=25.00,
        digits=(10, 2),
    )
    stripe_payment_ref = fields.Char(
        string='Stripe Payment Reference',
        readonly=True,
    )
    invoice_id = fields.Many2one(
        'account.move',
        string='Invoice',
        readonly=True,
    )
    payment_date = fields.Datetime(
        string='Payment Date',
        readonly=True,
        tracking=True,
    )

    # ── System Fields ─────────────────────────────────────────────────────────
    partner_id = fields.Many2one(
        'res.partner',
        string='Odoo Contact',
        ondelete='set null',
    )
    registration_date = fields.Datetime(
        string='Registration Date',
        default=fields.Datetime.now,
        readonly=True,
        index=True,
    )
    access_token = fields.Char(
        string='Access Token',
        copy=False,
        readonly=True,
    )

    # ── Computed ──────────────────────────────────────────────────────────────
    @api.depends('first_name', 'last_name')
    def _compute_full_name(self):
        for rec in self:
            parts = [rec.first_name or '', rec.last_name or '']
            rec.full_name = ' '.join(p for p in parts if p).strip()

    # ── ORM ───────────────────────────────────────────────────────────────────
    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('registration_number', 'New') == 'New':
                vals['registration_number'] = self.env['ir.sequence'].next_by_code(
                    'hcc.pickleball.registration'
                ) or 'New'
            if vals.get('liability_accepted') and not vals.get('liability_accepted_date'):
                vals['liability_accepted_date'] = fields.Datetime.now()

            # Generate a secure access token for portal links
            import secrets
            vals.setdefault('access_token', secrets.token_urlsafe(32))
        return super().create(vals_list)

    @api.constrains('liability_accepted')
    def _check_liability_accepted(self):
        for rec in self:
            if not rec.liability_accepted:
                raise ValidationError(
                    _('You must accept the liability waiver to complete registration.')
                )

    # ── Actions ───────────────────────────────────────────────────────────────
    def action_mark_paid(self):
        """Manually mark a registration as paid (admin override)."""
        for rec in self:
            rec.write({
                'payment_status': 'paid',
                'payment_date': fields.Datetime.now(),
            })
            rec._send_confirmation_email()
            rec._send_admin_notification()

    def action_send_confirmation_email(self):
        """Re-send confirmation email to participant."""
        self.ensure_one()
        self._send_confirmation_email()

    # ── Email Helpers ─────────────────────────────────────────────────────────
    def _send_confirmation_email(self):
        """Send confirmation email to the registrant."""
        template = self.env.ref(
            'hcc_pickleball.email_template_pickleball_confirmation',
            raise_if_not_found=False,
        )
        if template:
            for rec in self:
                try:
                    template.send_mail(rec.id, force_send=True)
                    _logger.info(
                        'Pickleball confirmation email sent to %s for %s',
                        rec.email,
                        rec.registration_number,
                    )
                except Exception as e:
                    _logger.error(
                        'Failed to send confirmation email for %s: %s',
                        rec.registration_number,
                        str(e),
                    )

    def _send_admin_notification(self):
        """Send admin notification to HCC admin email."""
        template = self.env.ref(
            'hcc_pickleball.email_template_pickleball_admin',
            raise_if_not_found=False,
        )
        if template:
            for rec in self:
                try:
                    template.send_mail(rec.id, force_send=True)
                    _logger.info(
                        'Admin notification sent for registration %s',
                        rec.registration_number,
                    )
                except Exception as e:
                    _logger.error(
                        'Failed to send admin notification for %s: %s',
                        rec.registration_number,
                        str(e),
                    )

    # ── Invoice Creation ──────────────────────────────────────────────────────
    def _create_invoice(self):
        """Create an Odoo invoice for the registration fee."""
        self.ensure_one()

        # Find or create partner
        partner = self._get_or_create_partner()
        self.write({'partner_id': partner.id})

        # Find the pickleball product
        product = self.env.ref(
            'hcc_pickleball.product_pickleball_registration',
            raise_if_not_found=False,
        )
        if not product:
            product = self.env['product.product'].sudo().search(
                [('default_code', '=', 'HCC-PB-REG')], limit=1
            )

        # Build invoice
        move_vals = {
            'move_type': 'out_invoice',
            'partner_id': partner.id,
            'invoice_origin': self.registration_number,
            'narration': f'Pickleball Registration: {self.registration_number} – {self.full_name}',
            'invoice_line_ids': [(0, 0, {
                'name': f'Pickleball Registration Fee – {self.event_name or "HCC Pickleball Tournament"}',
                'quantity': 1.0,
                'price_unit': self.amount_paid,
                'product_id': product.id if product else False,
            })],
        }
        invoice = self.env['account.move'].sudo().create(move_vals)
        invoice.action_post()  # Confirm the invoice

        self.write({'invoice_id': invoice.id})
        return invoice

    def _get_or_create_partner(self):
        """Find existing partner by email or create a new one."""
        self.ensure_one()
        Partner = self.env['res.partner'].sudo()
        partner = Partner.search([('email', '=ilike', self.email)], limit=1)
        if not partner:
            partner = Partner.create({
                'name': self.full_name,
                'email': self.email,
                'phone': self.phone,
                'street': self.street,
                'city': self.city,
                'state_id': self.state_id.id,
                'zip': self.zip_code,
                'country_id': self.env.ref('base.us').id,
                'customer_rank': 1,
                'comment': f'HCC Pickleball Registrant – {self.registration_number}',
            })
        return partner

    # ── Display Name ──────────────────────────────────────────────────────────
    def name_get(self):
        return [
            (rec.id, f'{rec.registration_number} – {rec.full_name}')
            for rec in self
        ]
