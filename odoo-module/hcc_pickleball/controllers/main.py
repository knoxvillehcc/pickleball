# -*- coding: utf-8 -*-
import logging
from odoo import http, fields
from odoo.http import request

_logger = logging.getLogger(__name__)


class PickleballRegistrationController(http.Controller):
    """
    Website controller for HCC Pickleball Registration.

    Routes:
        GET  /pickleball-registration               → registration form page
        POST /pickleball-registration/submit        → process form submission
        GET  /pickleball-registration/success/<reg> → payment success page
        GET  /pickleball-registration/pending/<reg> → payment pending page
    """

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _get_event_config(self):
        """Return event config dict from ir.config_parameter."""
        get = lambda key, default='': request.env['ir.config_parameter'].sudo().get_param(
            f'hcc_pickleball.{key}', default
        )
        return {
            'event_name': get('event_name', 'HCC Pickleball Tournament 2026'),
            'event_date': get('event_date', ''),
            'event_time': get('event_time', '9:00 AM – 5:00 PM'),
            'event_location': get('event_location', 'HCC Sports Complex, Knoxville, TN'),
            'registration_fee': float(get('registration_fee', '25.00')),
            'registration_deadline': get('registration_deadline', ''),
            'max_participants': int(get('max_participants', '64')),
            'registration_open': get('registration_open', 'True') == 'True',
        }

    def _get_us_states(self):
        """Return US state records for dropdown."""
        us = request.env.ref('base.us', raise_if_not_found=False)
        if us:
            return request.env['res.country.state'].sudo().search(
                [('country_id', '=', us.id)], order='name'
            )
        return request.env['res.country.state'].sudo().search([], order='name')

    def _get_current_count(self):
        """Return current number of confirmed (paid) registrations."""
        return request.env['hcc.pickleball.registration'].sudo().search_count(
            [('payment_status', '=', 'paid')]
        )

    def _validate_form(self, post):
        """Validate submitted form fields. Returns list of error messages."""
        errors = []
        required = [
            ('first_name', 'First Name'),
            ('last_name', 'Last Name'),
            ('email', 'Email Address'),
            ('phone', 'Phone Number'),
            ('date_of_birth', 'Date of Birth'),
            ('gender', 'Gender'),
            ('street', 'Address'),
            ('city', 'City'),
            ('state_id', 'State'),
            ('zip_code', 'Zip Code'),
            ('emergency_contact_name', 'Emergency Contact Name'),
            ('emergency_contact_phone', 'Emergency Contact Phone'),
            ('skill_level', 'Skill Level'),
        ]
        for field, label in required:
            if not post.get(field, '').strip():
                errors.append(f'{label} is required.')

        # Email format basic check
        email = post.get('email', '')
        if email and '@' not in email:
            errors.append('Please enter a valid email address.')

        # Waiver
        if not post.get('liability_accepted'):
            errors.append('You must accept the liability waiver to continue.')

        return errors

    # ── Routes ────────────────────────────────────────────────────────────────

    @http.route('/pickleball-registration', type='http', auth='public', website=True, sitemap=True)
    def pickleball_registration_form(self, **kw):
        """Display the public pickleball registration form."""
        config = self._get_event_config()
        us_states = self._get_us_states()
        current_count = self._get_current_count()
        spots_left = max(0, config['max_participants'] - current_count)

        return request.render('hcc_pickleball.pickleball_registration_page', {
            'config': config,
            'us_states': us_states,
            'spots_left': spots_left,
            'current_count': current_count,
            'error_messages': [],
            'form_data': {},
        })

    @http.route('/pickleball-registration/submit', type='http', auth='public', website=True, methods=['POST'], csrf=True)
    def pickleball_submit(self, **post):
        """Process the registration form submission."""
        config = self._get_event_config()
        us_states = self._get_us_states()
        current_count = self._get_current_count()
        spots_left = max(0, config['max_participants'] - current_count)

        # Check if registration is open
        if not config.get('registration_open'):
            return request.render('hcc_pickleball.pickleball_closed_page', {'config': config})

        # Check capacity
        if spots_left <= 0:
            return request.render('hcc_pickleball.pickleball_full_page', {'config': config})

        # Validate form
        errors = self._validate_form(post)
        if errors:
            return request.render('hcc_pickleball.pickleball_registration_page', {
                'config': config,
                'us_states': us_states,
                'spots_left': spots_left,
                'current_count': current_count,
                'error_messages': errors,
                'form_data': post,
            })

        # Find state record
        try:
            state_id = int(post.get('state_id', 0))
        except (ValueError, TypeError):
            state_id = 0

        # Get event date from config
        from datetime import datetime
        event_date = None
        if config.get('event_date'):
            try:
                event_date = datetime.strptime(config['event_date'], '%Y-%m-%d').date()
            except Exception:
                pass

        # Create registration record
        try:
            reg_vals = {
                'first_name': post.get('first_name', '').strip(),
                'last_name': post.get('last_name', '').strip(),
                'email': post.get('email', '').strip().lower(),
                'phone': post.get('phone', '').strip(),
                'date_of_birth': post.get('date_of_birth') or False,
                'gender': post.get('gender'),
                'street': post.get('street', '').strip(),
                'city': post.get('city', '').strip(),
                'state_id': state_id or False,
                'zip_code': post.get('zip_code', '').strip(),
                'emergency_contact_name': post.get('emergency_contact_name', '').strip(),
                'emergency_contact_phone': post.get('emergency_contact_phone', '').strip(),
                'skill_level': post.get('skill_level'),
                'partner_name': post.get('partner_name', '').strip() or False,
                'special_notes': post.get('special_notes', '').strip() or False,
                'liability_accepted': bool(post.get('liability_accepted')),
                'event_name': config['event_name'],
                'event_date': event_date,
                'event_time': config['event_time'],
                'event_location': config['event_location'],
                'amount_paid': config['registration_fee'],
                'payment_status': 'pending',
            }

            registration = request.env['hcc.pickleball.registration'].sudo().create(reg_vals)
            _logger.info('Pickleball registration created: %s', registration.registration_number)

        except Exception as e:
            _logger.error('Failed to create pickleball registration: %s', str(e))
            errors = [f'An error occurred: {str(e)}. Please try again or contact us.']
            return request.render('hcc_pickleball.pickleball_registration_page', {
                'config': config,
                'us_states': us_states,
                'spots_left': spots_left,
                'current_count': current_count,
                'error_messages': errors,
                'form_data': post,
            })

        # Create invoice
        try:
            invoice = registration._create_invoice()
            _logger.info('Invoice created: %s for reg %s', invoice.name, registration.registration_number)
        except Exception as e:
            _logger.error('Failed to create invoice for %s: %s', registration.registration_number, str(e))
            invoice = None

        # Build payment link
        payment_url = None
        if invoice:
            try:
                # Use Odoo's payment.link.wizard to generate a Stripe payment link
                wizard = request.env['payment.link.wizard'].sudo().with_context(
                    active_model='account.move',
                    active_id=invoice.id,
                ).create({
                    'res_id': invoice.id,
                    'res_model': 'account.move',
                    'amount': config['registration_fee'],
                    'currency_id': invoice.currency_id.id,
                    'partner_id': registration.partner_id.id,
                    'description': f'Pickleball Registration – {registration.registration_number}',
                })
                payment_url = wizard.link
                # Append return URL so Stripe brings user back to our success page
                success_url = f'/pickleball-registration/success/{registration.registration_number}?token={registration.access_token}'
                if '?' in payment_url:
                    payment_url += f'&return_url={success_url}'
                else:
                    payment_url += f'?return_url={success_url}'
            except Exception as e:
                _logger.error('Payment link creation failed for %s: %s', registration.registration_number, str(e))
                payment_url = None

        # Redirect to payment or show pending page
        if payment_url:
            return request.redirect(payment_url)
        else:
            # Fallback: show a pending page with manual payment instructions
            return request.render('hcc_pickleball.pickleball_pending_page', {
                'registration': registration,
                'config': config,
            })

    @http.route(
        '/pickleball-registration/success/<string:reg_number>',
        type='http',
        auth='public',
        website=True,
    )
    def pickleball_success(self, reg_number, token=None, **kw):
        """Display the payment success confirmation page."""
        registration = request.env['hcc.pickleball.registration'].sudo().search([
            ('registration_number', '=', reg_number)
        ], limit=1)

        if not registration:
            return request.not_found()

        # Validate access token for security
        if token and registration.access_token and token != registration.access_token:
            return request.not_found()

        # If this is a new success (payment just completed), verify and update
        if registration.payment_status == 'pending':
            # Check if the invoice is now paid
            if registration.invoice_id and registration.invoice_id.payment_state in ('paid', 'in_payment'):
                registration.write({
                    'payment_status': 'paid',
                    'payment_date': fields.Datetime.now(),
                    'stripe_payment_ref': registration.invoice_id.payment_reference or '',
                })
                registration._send_confirmation_email()
                registration._send_admin_notification()

        config = self._get_event_config()
        return request.render('hcc_pickleball.pickleball_success_page', {
            'registration': registration,
            'config': config,
        })

    @http.route(
        '/pickleball-registration/pending/<string:reg_number>',
        type='http',
        auth='public',
        website=True,
    )
    def pickleball_pending(self, reg_number, **kw):
        """Display a pending payment page."""
        registration = request.env['hcc.pickleball.registration'].sudo().search([
            ('registration_number', '=', reg_number)
        ], limit=1)

        if not registration:
            return request.not_found()

        config = self._get_event_config()
        return request.render('hcc_pickleball.pickleball_pending_page', {
            'registration': registration,
            'config': config,
        })

    # ── Webhook / Payment Callback ────────────────────────────────────────────

    @http.route(
        '/pickleball-registration/payment-return',
        type='http',
        auth='public',
        website=True,
        methods=['GET', 'POST'],
    )
    def pickleball_payment_return(self, **kw):
        """Handle return from Stripe payment (via Odoo's payment system)."""
        reg_number = kw.get('reference', '')
        if reg_number:
            registration = request.env['hcc.pickleball.registration'].sudo().search([
                ('registration_number', '=', reg_number)
            ], limit=1)
            if registration:
                return request.redirect(
                    f'/pickleball-registration/success/{reg_number}'
                )
        return request.redirect('/pickleball-registration')
